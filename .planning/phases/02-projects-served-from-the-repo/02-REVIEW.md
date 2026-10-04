---
phase: 02-projects-served-from-the-repo
reviewed: 2026-10-04T13:55:34Z
depth: standard
files_reviewed: 39
files_reviewed_list:
  - .gitignore
  - .prettierignore
  - LICENSE
  - app/api/cms-stamp/route.js
  - app/llms.txt/route.js
  - app/opengraph-image.js
  - app/page.js
  - app/project/[slug]/opengraph-image.js
  - app/project/[slug]/page.js
  - app/project/[slug]/page.module.css
  - app/project/[slug]/twitter-image.js
  - app/providers.js
  - app/sitemap.js
  - app/twitter-image.js
  - components/Carousel.jsx
  - components/SharedTransitionProvider.jsx
  - components/project/ProjectGallery.jsx
  - components/project/ProjectMedia.jsx
  - components/project/ProjectNotFound.jsx
  - components/project/ProjectWarm.jsx
  - components/ring/atlas.js
  - components/ring/meta.js
  - components/ring/params.js
  - content/media.json
  - content/projects/index.mjs
  - eslint.config.mjs
  - lib/content-schema.mjs
  - lib/content.js
  - lib/og-image.js
  - lib/project/warm.js
  - lib/projects.js
  - next.config.mjs
  - playwright.config.mjs
  - scripts/check-content.mjs
  - scripts/compare-rendered.mjs
  - scripts/compare-snapshot.mjs
  - scripts/content-schema.test.mjs
  - scripts/lib/r2.mjs
  - scripts/media.mjs
  - tests/smoke.spec.mjs
findings:
  critical: 3
  warning: 9
  info: 5
  total: 17
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-10-04T13:55:34Z
**Depth:** standard
**Files Reviewed:** 39 changed source files (the 8 `content/projects/<slug>.mjs` data bodies were checked only for shape; `content/media.json` was checked by script for url/key/slug/width/height consistency, and all 37 entries are consistent)
**Status:** issues_found

## Summary

The core cut-over is sound. `lib/content.js` resolves at module load, so a broken content module fails the build. Placeholders are gone from every render path, and `Carousel` mounts only after `setProjects`. The atlas, the preload links, the hero (Next passes `crossOrigin` into its preload), the flyer and the warm cache all request R2 the same way (CORS). `check-content` and `node --test` pass on the current tree, and AGENTS.md ring designs are untouched.

Problems found:
- A public route still calls Notion for projects (D-11).
- One commit changed CSS that visitors see, against D-01 "no visible change".
- `scripts/media.mjs` can wipe recorded entries when it cannot read the manifest (D-04).
- The validator lets several defects through that later break rendering.
- The `_healthcheck/` delete guard does not protect anything.
- `compare-rendered` would silently skip React segments with ids of 10 or more.

## Critical Issues

### CR-01: `/api/media/*` is still live and calls Notion for project media

**File:** `app/api/media/[...parts]/route.js:4,65,84` (with `lib/notion/projects.js:237-252`, `next.config.mjs:46-51`)
**Issue:** D-11 and the phase's discretion note allow the route to stay only "as long as nothing calls Notion for projects after this phase". The route is still deployed and public. Any GET with a 32-hex id runs `cachedNotionMediaUrl`, which calls `getCachedProjectBundle` (a Notion `dataSources.query`), and then `notionMediaUrl`, which calls `pages.retrieve`.

The old `/api/media/<id>?v=` URLs are already in the wild: crawler indexes, old social cards, open tabs on the previous bundle. Every one of those requests keeps querying Notion with the server token, and keeps using the PDF and canvas stack this phase meant to retire. `next.config.mjs` still allow-lists `/api/media/**` in `localPatterns`. The smoke test only proves that the new pages do not request it.
**Fix:** Turn the route off in this phase. Phase 3 still deletes the file.
```js
// app/api/media/[...parts]/route.js
export const runtime = "nodejs";
export async function GET() {
  return new Response("Gone", { status: 410, headers: { "Cache-Control": "public, max-age=86400" } });
}
```
Also drop the `/api/media/**` `localPatterns` entry and its stale "Notion covers" comment.

### CR-02: A find-and-replace in the 404 commit changed letter-spacing on every project page (breaks D-01 "no visible change")

**File:** `app/project/[slug]/page.module.css:122,254,671` (commit `ebaf6c1`)
**Issue:** Before the 404 change the file held exactly three `letter-spacing: -0.04em` declarations. After the change all three read `-0.12em`:
- `.heroIndex`: the "01".."08" number in the hero of every project page.
- `.mediaFallbackLabel`: "Artwork unavailable".
- `.loadingNumber`: the "00" in `loading.js`.

None of these is part of the 404 mark. The hero index is visibly tighter on all 8 live pages, which breaks D-01 ("visitors see no change"). `compare-rendered.mjs` compares text only, so it cannot catch CSS drift, and the UAT screenshots covered the 404 page.
**Fix:** Restore the three original values. Keep `-0.12em` only on `.notFoundText`.
```css
.heroIndex        { letter-spacing: -0.04em; }
.mediaFallbackLabel { letter-spacing: -0.04em; }
.loadingNumber    { letter-spacing: -0.04em; }
```

### CR-03: `scripts/media.mjs` treats an unreadable manifest as empty and overwrites it, breaking D-04

**File:** `scripts/media.mjs:116-122` (used by `importLive` at 222/295 and `generateMedia` at 408/470)
**Issue:** `readManifest()` swallows every error, including a JSON parse error from a merge conflict or a half-edited file, and returns `{ host, projects: {} }`. The next successful upload then calls `writeManifest()`, which atomically replaces `content/media.json` with only the entries from that run.

- With `--only=<slug>`, the manifest of every other project disappears.
- Under `generate`, recorded Higgsfield entries (paid generations) are lost. The next run then sees `!record.cover` and generates again, spending credits.

This breaks D-04: "never rewrites a recorded entry without `--force`". Git can recover the file, but the script reports success and nothing stops the bad file from being committed.
**Fix:** Start empty only when the file does not exist (ENOENT). Fail on any other error.
```js
function readManifest() {
  if (!existsSync(MANIFEST)) return { host: HOST, projects: {} };
  try {
    return JSON.parse(readFileSync(MANIFEST, "utf8"));
  } catch (error) {
    console.error(`[media] content/media.json unreadable: ${error.message}`);
    process.exit(1);
  }
}
```

## Warnings

### WR-01: The validator accepts gallery manifest entries without `width`/`height`, which `next/image` needs

**File:** `lib/content-schema.mjs:58-59,170-178,232-233`; consumed at `components/project/ProjectGallery.jsx:30-38`
**Issue:** `goodEntry` checks only `url`. `resolveContent` copies `e.width` and `e.height` into the gallery item, and `ProjectGallery` now renders `<Image width={item.width} height={item.height}>` without `fill`. An entry that lacks either value passes `check-content` and the build. In development `next/image` throws. In production it renders an `<img>` with no intrinsic size, so the page shifts (CLS) and the result looks broken. D-10 asks for a build failure that names the slug and field, and that does not happen here. Probing confirmed that `{ url: ".../projects/../../x" }` with no size resolves cleanly.
**Fix:** In `collect`, require positive integer `width` and `height` on every gallery entry that is referenced (and on the cover). Report `slug.gallery[n].media "<key>": width/height missing` when they are absent.

### WR-02: The validator lets `name: null`, loose dates, non-string list items and covers from another slug through

**File:** `lib/content-schema.mjs:36-49,95-104,110-114,143-148`
**Issue:** Probing `resolveContent` showed it accepts all of the following:
- `name: null`. `name` is in `TEXT_KEYS`, so null is allowed. Result: an empty `<h1>`, a ring label that reads blank or "null", and a share alt that falls back to the site mark.
- `updated: "1"`. `Date.parse("1")` returns 2001-01-01, so the sitemap `lastmod` would be wrong.
- `services: [null, 5]` and `tools: [{}]`.
- A cover URL under `projects/<other-slug>/`, which a copy-paste would produce.

The rule that empty values are allowed (D-09) is for unpublished fields. It should not cover a project's identity fields.
**Fix:**
- Require `name` to be a non-empty string.
- Require `updated` to match `^\d{4}-\d{2}-\d{2}T` before calling `Date.parse`.
- Require every element of `services` and `tools` to be a non-empty string.
- Require `m.cover.url` and each gallery url to start with `${MEDIA_PREFIX}${slug}/`.

### WR-03: The `_healthcheck/` delete guard protects nothing

**File:** `scripts/media.mjs:181,204`; `scripts/lib/r2.mjs:142-152`
**Issue:** The key is built on line 181 as `` `_healthcheck/${Date.now()}.txt` ``, so the `key.startsWith("_healthcheck/")` check on line 204 is always true. `deleteObject` is exported from `scripts/lib/r2.mjs` with no restriction. The next caller that imports it can delete `projects/...` objects, and those immutable, content-addressed objects are exactly what the live site serves. The guard has to sit where the delete happens.

There is also a second problem in the same `finally`. If `putObject` fails, `deleteObject` or `headObject` can throw too, and that replaces the original error.
**Fix:**
```js
export async function deleteObject(config, key) {
  if (!/^_healthcheck\/[\w.-]+$/.test(key)) {
    throw new Error(`r2 delete refused for ${key}: only _healthcheck/ objects may be deleted`);
  }
  ...
}
```
Wrap the cleanup in `check()` in its own `try/catch` so it logs instead of replacing the original error.

### WR-04: `media.mjs check` exits 0 when the public read or the CORS header fails

**File:** `scripts/media.mjs:190-202`
**Issue:** `check` prints `public FAILED <status>` and the raw ACAO values, but never sets a non-zero exit. The cleanup line also only prints `cleanup FAILED`. Anyone who uses `check` as a gate gets green on a broken host or a missing `Access-Control-Allow-Origin: *`, and D-05 depends on that header.
**Fix:** Collect failures: public status not 200, body not `ok\n`, ACAO not `*` with or without Origin, object still present after cleanup. Then `process.exit(1)` if any failed.

### WR-05: `import-live --dry-run` still writes raw bytes and appends provenance

**File:** `scripts/media.mjs:253-269`
**Issue:** `media-work/<slug>/<slot>.webp` is written and `appendProvenance` is called before the `if (dryRun)` check. Every dry run appends a duplicate provenance record for an upload that never happened. That defeats the point of a provenance log. Dry run also still requires R2 credentials (`needsR2` exempts only `generate --dry-run`).
**Fix:** Move the `dryRun` short-circuit above the disk writes, or record `dryRun: true` in the provenance entry. Exempt `import-live --dry-run` in `needsR2`.

### WR-06: `generate` skips the public read-back, and the video path skips verification entirely (D-04)

**File:** `scripts/media.mjs:448-453,499-501`
**Issue:** D-04 says the single writer "verifies each object after upload". `import-live` does that through `checkPublic` (status, content-type, immutable cache-control, ACAO, sha256). The generated cover path only compares HEAD size. The loop video path does no check at all before `record.loop` is written to the manifest.
**Fix:** After each `putObject` in `generateMedia`, run the same `getPublic` + `checkPublic(got, hash)` that `importLive` uses, with an expected content-type parameter for mp4. Throw before the manifest is written if any problem is found.

### WR-07: `compare-rendered` matches only decimal segment ids, but React writes them in hex

**File:** `scripts/compare-rendered.mjs:82,98,105`
**Issue:** React Fizz writes segment and boundary ids with `id.toString(16)` (`react-dom-server.node.production.js:2357`). The regex `/<div hidden id="S:(\d+)">/` skips `S:a` through `S:f`, `S:1a`, and so on. Skipped segments are never collected, so the "segments without a boundary" check cannot report them. The fallback HTML stays in place and the hidden div stays in `<main>`. Both sides can then be measured equally wrong, and the script passes. Pixenhouse already streams ids 0 to 5. A few more Suspense boundaries, or a longer gallery split into chunks, crosses into hex.
**Fix:** Use `([0-9a-f]+)` in the segment regex. Build the `P:`/`B:` lookups from the same captured id (they already do). Add a final assertion that `/<div hidden id="S:/` no longer matches the resolved HTML.

### WR-08: An OG request for an unknown slug serves the site logo with 200 (D-07)

**File:** `app/project/[slug]/opengraph-image.js:9-28`; `lib/og-image.js:33-34`
**Issue:** The project OG and Twitter image routes are not prerendered (`fallback: null` in `prerender-manifest.json`). `dynamicParams = false` on the page does not cover them. For `/project/matchday/opengraph-image/cover`, `getProjectBySlug` returns `undefined`. `ogImageResponse(undefined)` then takes the `project ? … : null` branch and returns the logo with `200` and `public, max-age=3600`. D-07 says share images must not silently fall back to the logo. A typo in a slug, or an old placeholder slug, gets a cached logo card instead of a 404. The public route also costs sharp work on every request.
**Fix:**
```js
import { notFound } from "next/navigation";
export default async function Image({ params }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug, getProjects());
  if (!project) notFound();
  return ogImageResponse(project);
}
```
Optionally add `generateStaticParams` so the 8 are built ahead of time.

### WR-09: Smoke assertions break on content the schema allows

**File:** `tests/smoke.spec.mjs` ("every project page renders" summary step; "gallery items come from R2 through the optimizer")
**Issue:**
- `page.getByText(project.summary, { exact: true })` throws when `summary` is `null`, and the validator explicitly allows that (D-09, D-10).
- The gallery test hard-codes `PROJECTS_IN_ORDER[0]`. If the first project in ring order has `gallery: []`, which is the case for 7 of 8 today, `toHaveCount(0)` passes and `imgs.first()…naturalWidth` then polls for 30 s and fails.

Either way, a valid content edit or a reorder turns the gate red with a misleading error.
**Fix:** Guard the summary step with `if (project.summary)`. Pick the gallery fixture with `PROJECTS_IN_ORDER.find((p) => p.gallery.length > 0)`, and `test.skip` when none exists.

## Info

### IN-01: Notion-era dead code is still shipped

**File:** `components/CmsLive.jsx`, `lib/cms/bust.js`, `app/api/revalidate/route.js`, `lib/media.js`, `lib/notion/gallery-pdf.js`, `lib/pdf.js`, `lib/seo.js:26`
**Issue:** These have no live callers left, except `/api/revalidate`, which busts a `projects` tag that nothing reads. Phase 3 is meant to delete them, but they still ship in the bundle and the trace, including the `outputFileTracingIncludes` canvas binaries.
**Fix:** Track the deletion in Phase 3. Remove the `/api/media/` special case in `shareImages` when the route is removed.

### IN-02: The gallery warm cache does not request the URL the browser will pick

**File:** `lib/project/warm.js:26-62,96-100`
**Issue:** The comment says "warm that exact url". In fact `pickBest` chooses the first srcset width at or above `innerWidth * dpr`. The gallery uses `sizes="70vw"`, so the browser picks about `0.7 * innerWidth * dpr`. On most viewports the warmed width is the next width up, a different `/_next/image?w=` URL, so the warm is missed.
**Fix:** Parse the vw factor from `sizes`, or pass a `fraction` into `pickBest`, before selecting.

### IN-03: The content gates are not wired into `package.json`

**File:** `package.json` scripts; `scripts/check-content.mjs`; `scripts/content-schema.test.mjs`
**Issue:** No script runs `node scripts/check-content.mjs` or `node --test scripts/content-schema.test.mjs`. The build still validates, but the unit tests can rot unnoticed. On Node 22+ `check-content` also prints `MODULE_TYPELESS_PACKAGE_JSON` for `planeShaders.js`. On Node 20.9, the stated minimum, it fails to parse that file.
**Fix:** Add `"check:content": "node scripts/check-content.mjs && node --test scripts/content-schema.test.mjs"` and list it with the control-session gates.

### IN-04: `getProjectDisplayIndex(project)` is called without a list

**File:** `components/project/ProjectPager.jsx:77`; `lib/projects.js:97-107`
**Issue:** The default list (`PROJECTS`) was removed. The call works today only because every resolved project has `index`. Without `index`, `indexOfProject(undefined, …)` throws a TypeError.
**Fix:** Pass the list, or make `indexOfProject` return -1 when `list` is not an array.

### IN-05: `compare-rendered` crashes on a page missing from `rendered.json`

**File:** `scripts/compare-rendered.mjs:212-221`
**Issue:** `rendered[name]` can be `undefined` (a slug added to `live.order` without a capture). `r[field]` then throws a TypeError, and the script never reaches its summary.
**Fix:** Use `const r = rendered[name] ?? {};` or report a missing capture as a problem.

---

_Reviewed: 2026-10-04T13:55:34Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
