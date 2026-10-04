# Phase 3: Notion projects path removed - Pattern Map

**Mapped:** 2026-10-04
**Files analyzed:** 22 new or modified (plus the pure deletions, listed in one table)
**Analogs found:** 21 / 22 (one with no in-repo analog: glyph-path text rendering)

All line numbers are from the tree at commit `ca24456`.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/media.mjs` (add `share`, drop `import-live`, extend `verify`/`needsR2`) | script (CLI) | batch + file-I/O | itself: `generateMedia()` lines 385-582, `verify()` 346-382 | exact |
| `scripts/lib/share.mjs` (NEW, sharp + fontkit render) | utility | transform | `scripts/lib/art-direction.mjs`, `scripts/lib/r2.mjs` (module shape); render body from `lib/og-image.js` + RESEARCH Pattern 1 | role-match |
| `lib/share.mjs` (NEW, pure hash and line builders) | utility | transform | `lib/content-schema.mjs` (pure, no app imports, `.mjs`) | role-match |
| `lib/content-schema.mjs` (validate `og`, `site.home`, staleness) | model/validator | transform | itself: `entryProblem()` 61-70, cover check 161-167, manifest-slug check 216-225 | exact |
| `lib/content.js` (expose `project.og`, `getHomeShare()`) | service | request-response (build-time) | itself, lines 1-21 | exact |
| `lib/seo.js` (`projectOgImage` -> `project.og.url`; delete `shareImages`) | utility | transform | itself, lines 14-30, 102-117 | exact |
| `lib/projects.js` (delete `projectShareImage`; keep `shareImageAlt`) | utility | transform | itself, lines 39-54 | exact |
| `app/project/[slug]/page.js` (`openGraph.images`) | route (server page) | request-response | itself, `generateMetadata` 23-57 | exact |
| `app/page.js` (`openGraph.images` from home share) | route (server page) | request-response | `app/project/[slug]/page.js` `generateMetadata` | exact |
| `app/layout.js` (default `openGraph.images` for 404) | config | n/a | itself, `metadata` 20-64 | exact |
| `app/booking/opengraph-image.png` + `.alt.txt` (NEW static) | static asset | file-I/O | `lib/og-image.js` logo branch (lines 30-45) for parameters | role-match |
| `app/booking/page.js` | route | request-response | unchanged (verify only) | n/a |
| `lib/notion/client.js` (remove `unstable_cache`, `cachedDataSourceId`, comment) | service | request-response | itself, lines 1-60 | exact |
| `lib/env.js` (remove 3 accessors) | config | n/a | itself, lines 9-11, 21-23, 60-62 | exact |
| `lib/notion/props.js` (prune unused helpers) | utility | transform | itself (grep before pruning) | exact |
| `next.config.mjs` (remove 3 blocks) | config | n/a | itself, lines 46-80 | exact |
| `app/robots.js` | config | request-response | itself, line 9 | exact |
| `scripts/content-schema.test.mjs` (add og/site cases) | test | unit | itself, fixture 10-58, `msg()` 61-68, cases 86-250 | exact |
| `scripts/check-content.mjs` | script | batch | itself, lines 18-37 | exact |
| `tests/smoke.spec.mjs` (rewrite share test, removed-routes test) | test | e2e | itself, lines 194-228 | exact |
| `package.json`, `package-lock.json` | config | n/a | RESEARCH "Installation" | n/a |
| `.env.example`, `README.md`, `CLAUDE.md`, `docs/NEXT-SESSION-PROMPT.md` | docs | n/a | RESEARCH "Removal Inventory" | n/a |
| Glyph-path text layout (inside `scripts/lib/share.mjs`) | utility | transform | none in repo | no analog |

### Pure deletions (no pattern needed)

`app/api/media/[...parts]/route.js`, `app/api/cms-stamp/route.js`, `app/api/revalidate/route.js`, `components/CmsLive.jsx`, `lib/cms/bust.js`, `lib/pdf.js`, `lib/media.js`, `lib/notion/gallery-pdf.js`, `lib/notion/projects.js`, `lib/og-image.js`, `app/opengraph-image.js`, `app/twitter-image.js`, `app/booking/opengraph-image.js`, `app/booking/twitter-image.js`, `app/project/[slug]/opengraph-image.js`, `app/project/[slug]/twitter-image.js`, `docs/NEXT-SESSION-PROMPT.md`. Delete the emptied folders `app/api/media`, `app/api/cms-stamp`, `app/api/revalidate`, `lib/cms`.

---

## Pattern Assignments

### `scripts/media.mjs` (script, batch + file-I/O)

**Analog:** itself. The new `share` command copies the per-target loop, the put/head/public-read verification chain and the sole-writer manifest rule from `generateMedia()`.

**Header usage block and USAGE** (lines 8-13, 72-83): add a `share` line to both, delete `import-live` from both and from the allowed list.
```js
 *   node scripts/media.mjs check
 *   node scripts/media.mjs import-live [--force] [--only=slug,...] [--dry-run]
 *   node scripts/media.mjs verify
...
if (!["check", "import-live", "verify", "generate"].includes(command)) {
```

**Flags and `only` filter** (lines 58-70): reuse `flag()`, `value()`, `only`, `force`, `dryRun`. Add `const preview = flag("preview")` and `flag("booking")` the same way.

**R2 gate** (lines 88-100): `share --preview` must need no R2, exactly as `--dry-run` does today. Change the predicate:
```js
const needsR2 = !(["generate", "import-live"].includes(command) && dryRun);
```
to a form that also skips R2 for `command === "share" && (preview || dryRun)`. `share --booking` writes only a local PNG and needs no R2 either.

**Manifest writer rule** (lines 116-143): `readManifest()` and `writeManifest()` (tmp file then `renameSync`, `sortDeep`) are the only writer. `readManifest()` checks only `manifest.projects`; `site.home` lives under a new top-level `site` key, so create it with `manifest.site ||= {}`. Never write to the manifest in `--preview`.

**Core pattern to copy: render, upload, read back, record** (lines 483-516, cover branch of `generateMedia`):
```js
const hash = sha256(buffer);
const key = `projects/${project.slug}/cover-${hash.slice(0, 8)}.webp`;
await putObject(r2, key, buffer, "image/webp", {
  cacheControl: IMMUTABLE,
});
if ((await headObject(r2, key))?.size !== buffer.length) {
  throw new Error("head size mismatch");
}
const coverUrl = publicUrl(r2, key);
const coverProblems = checkPublic(await getPublic(coverUrl), hash);
if (coverProblems.length) throw new Error(coverProblems.join(", "));
record.cover = { key, url: coverUrl, type: "image/webp", width, height,
  bytes: buffer.length, sha256: hash, origin: { ... } };
writeManifest(manifest);
console.log(`ok ${label} -> ${key}`);
```
For `og`: key `projects/<slug>/og-<sha8>.jpg`, content type `image/jpeg` (passed to both `putObject` and `checkPublic(..., "image/jpeg")`), entry gains `inputs: inputsHash(...)`. Home key is `projects/_site/og-home-<sha8>.jpg`.

**Idempotence gate**: today's gate is "slot recorded" (`const needImage = force || !record.cover`, line 456). For `share` replace with `force || entry?.inputs !== computedInputs` (RESEARCH Pattern 2), so a stale card re-renders.

**Per-target error handling** (lines 576-581): per-target try/catch, `failed += 1`, `console.error("[media] ${label}: ${error.message || error}")`, `if (failed) process.exit(1)` at the end. UI-SPEC wants `[share] <slug>: <problem>` for render errors; keep `[media]` for the loop wrapper and let `scripts/lib/share.mjs` throw `[share] ...` messages (the wrapper already prints `error.message`).

**Preview output path** (lines 442-445, the `--probe` branch): write previews the same way.
```js
const dir = join(root, ".media-probe");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, `${slug}-${direction}.png`), bytes);
console.log(`request ${requestId}; nothing uploaded, manifest untouched`);
```
Use `.media-probe/share/` (already gitignored, `.gitignore` line 47) and print "nothing uploaded, manifest untouched".

**Cover fetch with host and sha check**: copy the host refusal from `importLive` (lines 276-279) rather than writing a new guard.
```js
const source = new URL(from, SITE);
if (source.host !== "koussay.online") {
  throw new Error(`refusing host ${source.host}`);
}
```
For `share` the check is `new URL(cover.url).host === "media.koussay.online"`, then `sha256(body) === cover.sha256`, else `[share] <slug>: cover sha mismatch`. Use `getPublic(url)` (lines 168-175) for the fetch.

**Loading content**: import project list the same way as lines 419-424.
```js
const indexFile = join(root, "content", "projects", "index.mjs");
const { PROJECTS_IN_ORDER } = await import(pathToFileURL(indexFile).href);
```

**`verify()` extension** (lines 346-355): push `og` and `site.home` into the same `entries` array, with labels like `${slug}/og` and `site/home`, but note the URL check at line 358 requires `${HOST}/projects/`; `projects/_site/...` still satisfies it. `checkPublic` defaults to `image/webp` (line 181): pass `entry.type` as the third argument for og entries.

**Delete `importLive()`** (lines 253-344), its dispatch (line 585) and its snapshot default path. Also the one-shot rewrite of `origin.from` provenance strings (RESEARCH Open Question 1) must go through `readManifest`/`writeManifest`, then be removed.

---

### `scripts/lib/share.mjs` (NEW; utility, transform)

**Analog for module shape:** `scripts/lib/r2.mjs` (named exports, node built-ins only, no app alias). Imports in scripts never use `@/`.

**Analog for the cover crop and encode:** `lib/og-image.js` lines 33-45 (about to be deleted; copy the parameters first).
```js
const buffer = await sharp(source)
  .rotate()
  .resize(OG_SIZE.width, OG_SIZE.height, {
    fit: cover ? "cover" : "contain",
    position: "centre",
    background: BACKGROUND,   // { r: 244, g: 245, b: 246, alpha: 1 }
  })
  .png({ compressionLevel: 8 })
  .toBuffer();
```
Project and home cards use `fit: "cover"` and `.jpeg({ quality: 86, mozjpeg: true })`. The booking card uses `fit: "contain"` with the background above and `.png({ compressionLevel: 8 })` (UI-SPEC "Booking Card").

**Core text pattern:** no in-repo analog. Use RESEARCH 03-RESEARCH.md "Pattern 1: Glyph-path text" verbatim as the base (fontkit `layout()`, `g.path.scale(s, -s).translate(pen, y).toSVG()`, one SVG composited by sharp), with the UI-SPEC numbers instead of the research probe numbers:
- Fonts: `Geist-Medium.ttf` line 1, `Geist-Regular.ttf` line 2, from `node_modules/geist/dist/fonts/geist-sans/`.
- Name 72 px, tracking -0.02 em, baseline y 506. Line 2 32 px, `fill-opacity` 0.85, baseline y 566. Left x 64, max width 1072.
- Gradient stops 0.40 / 0.70 / 0.80 opacity at offsets 0.40 / 0.70 / 1.00.
- Shrink rule in 4 px steps, floors 56 and 24, throw `[share] <slug>: line 1 too long at 56 px`; throw `[share] <slug>: missing glyph in "<text>"` on `glyph.id === 0`; throw on bytes over 300 KB.

**Logging convention** (CLAUDE.md): bracketed tags `[share]`, `[media]`; scripts may `console.log`.

---

### `lib/share.mjs` (NEW; utility, transform, PURE)

**Analog:** `lib/content-schema.mjs` header (lines 1-5): pure, no app imports, no env, shared by the fast gate and the build.
```js
/**
 * Content schema, validator and resolver. Pure: no app imports, no env, so the
 * fast gate (scripts/check-content.mjs) and the build run the same code.
 */
```
Contents are in RESEARCH "Pure inputs hash". Keep `homeLines(name, description)` reading the opening words from `SITE_DESCRIPTION` passed in by the caller (the file must not import `@/lib/site`, because `scripts/` cannot use the alias; `lib/site.js` has no imports and is importable by relative path from scripts via `../lib/site.js`). Export the function names the validator and script both use: `LAYOUT_VERSION`, `projectLines`, `homeLines`, `inputsHash`.

---

### `lib/content-schema.mjs` (validator, transform)

**Analog:** itself. Add `og` next to `cover`.

**Entry check to reuse unchanged** (lines 61-70):
```js
function entryProblem(e, slug) {
  if (!isObj(e) || !isStr(e.url)) return "missing";
  if (!e.url.startsWith(`${MEDIA_PREFIX}${slug}/`)) {
    return `url not under ${MEDIA_PREFIX}${slug}/`;
  }
  if (!isPosInt(e.width) || !isPosInt(e.height)) {
    return "width/height missing";
  }
  return "";
}
```
**Insertion point** (lines 161-167):
```js
const m = mp[p.slug];
if (!m) {
  add(slug, "cover", "slug not in content/media.json");
} else {
  const why = entryProblem(m.cover, p.slug);
  if (why) add(slug, "cover", why);
}
```
Add, in the `else` branch: `entryProblem(m.og, p.slug)` -> `add(slug, "og", why)` ("missing" is the message the research specifies), then a staleness check `m.og.inputs !== inputsHash(m.cover.sha256, projectLines(p))` -> `add(slug, "og", "stale, run: node scripts/media.mjs share --only=<slug>")`. Errors use `add(slug, field, reason)` giving `[content] <slug>.<field>: <reason>` (lines 74-75).

**Home**: `site.home` lives outside `manifest.projects`, so the manifest-slug loop (lines 216-225) is untouched. Validate it with the same `entryProblem` against the slug prefix `_site`; the existing `MEDIA_PREFIX${slug}/` check works with `slug = "_site"`. Pass site text in through the options argument, as `{ maxPlanes }` is passed today (lines 229-234):
```js
export function validateContent(projects, manifest, { maxPlanes = 32 } = {}) {
export function resolveContent(projects, manifest, { maxPlanes = 32 } = {}) {
```
`resolveContent` output object (lines 238-274) gains `og: m.og` (url, width, height). Callers: `lib/content.js` line 12 and `scripts/check-content.mjs` line 26 must pass the same options so the gate and build agree.

---

### `lib/content.js` (service, build-time resolve)

**Analog:** itself (whole file, 21 lines).
```js
const PROJECTS = indexProjects(
  resolveContent(PROJECTS_IN_ORDER, manifest, { maxPlanes: MAX_PLANES }),
);
export function getProjects() { return PROJECTS; }
export function getProject(slug) { ... }
```
Add `getHomeShare()` beside `getProject` returning `manifest.site.home` (already validated at module evaluation, so a missing home fails the build). Keep `import "server-only"` first.

---

### `lib/seo.js` and `lib/projects.js` (utility, transform)

**Analog:** itself. Replace lines 14-19 and delete lines 21-30 of `lib/seo.js`:
```js
export function projectOgImage(project) {
  if (project?.slug) {
    return `${SITE_URL}/project/${project.slug}/opengraph-image/cover`;
  }
  return SITE_SHARE_IMAGE;
}
```
becomes `project.og.url` (no logo fallback, D-06). `projectSchema` (line 104) keeps calling `projectOgImage(project)`; drop `projectShareImage` from the import on line 1. `shareImages()` and `projectShareImage()` (`lib/projects.js` lines 39-44) have no callers; delete both. Keep `shareImageAlt` (lines 46-54), now used by metadata. `SITE_SHARE_IMAGE` stays for the JSON-LD `image` fields (lines 44, 69).

---

### `app/project/[slug]/page.js` and `app/page.js` (route, request-response)

**Analog:** `app/project/[slug]/page.js` `generateMetadata` (lines 39-56) is the pattern for both pages.
```js
openGraph: {
  title: project.name,
  description,
  url,
  type: "article",
},
twitter: {
  card: "summary_large_image",
  title: project.name,
  description,
},
```
Add to `openGraph` only:
```js
images: [{ url: project.og.url, width: 1200, height: 630, alt: shareImageAlt(project) }],
```
Do not set `twitter.images`; Next inherits it (RESEARCH Pattern 3; verify `twitter:image` in built HTML). Add `shareImageAlt` to the `@/lib/projects` import (lines 8-14). `app/page.js` (openGraph at lines 17-21) gets the same `images` entry from `getHomeShare()`, with alt from UI-SPEC "Home `og:image:alt`". Import pattern there: `import { getProjects } from "@/lib/content";` (line 3).

---

### `app/layout.js` (config)

**Analog:** itself. Add `images: [...]` to the `openGraph` object (lines 51-58) using the home share so the not-found route never ships imageless. `app/layout.js` is not a `server-only` file but runs on the server, and may import `getHomeShare` from `@/lib/content`; confirm with the build that this does not pull content into a client bundle.

---

### `app/booking/opengraph-image.png` (static asset)

**Analog:** Next static file convention, no code. Produce once with the `share --booking` command using the parameters in `lib/og-image.js` (see above) from `public/logo.png`. Add `app/booking/opengraph-image.alt.txt` containing `SITE_MARK_ALT` text from `lib/site.js` line 7-8. `app/booking/page.js` `metadata` (lines 10-26) already has `openGraph` and `twitter` without `images`; leave it.

---

### `lib/notion/client.js` (service)

**Analog:** itself. Remove line 2 `import { unstable_cache } from "next/cache";`, the `cachedDataSourceId` export (lines 54-60), and the `CmsLive` mention in the comment (lines 15-17). Keep `notion()` with `timeoutMs: 4000, retry: false` and `dataSourceId()` (lines 41-52), which bookings import. `withTimeout` (lines 27-36) and `notionPageId` (38-40): run `git grep -w` after the deletions and drop whichever has no importer.

---

### `lib/env.js`, `next.config.mjs`, `app/robots.js` (config)

**Analog:** themselves.
- `lib/env.js`: delete `notionProjectsDatabaseId` (9-11), `notionWebhookSecret` (21-23), `isNotionProjectsConfigured` (60-62). Keep the one-tiny-function-per-variable, `trim()` style for the rest.
- `next.config.mjs`: delete lines 52-54 comment plus `{ pathname: "/api/media/**" }` (lines 49-55 region), `serverExternalPackages` (line 64), `outputFileTracingIncludes` (lines 65-80). Keep `{ pathname: "/**", search: "" }`, `remotePatterns`, `staleTimes`, redirects, standalone gating.
- `app/robots.js` line 9: `disallow: ["/api/book"]`.

---

### `scripts/content-schema.test.mjs` (test, unit)

**Analog:** itself. Add `og` to the `entry()`/`fixture()` helpers and new cases using `msg()`.

**Fixture to extend** (lines 10-14, 49-57):
```js
const entry = (slug, slot) => ({
  url: `${HOST}/${slug}/${slot}-abcd1234.webp`,
  width: 1600,
  height: 900,
});
...
alpha: { cover: entry("alpha", "cover"), gallery: { p01: entry("alpha", "p01") } },
```
Fixture `og` needs `sha256` on the cover and an `inputs` value produced by `inputsHash` from `lib/share.mjs`, so tests do not hard-code hashes.

**Case shape to copy** (lines 86-93 and 120-128):
```js
test("missing key names slug and field", () => {
  const { projects, manifest } = fixture();
  delete projects[0].approach;
  assert.match(
    msg(() => validateContent(projects, manifest, opts)),
    /^\[content\] alpha\.approach: key missing$/m,
  );
});
```
New cases: `og` missing, `og` stale, `og` under the wrong slug, `site.home` stale. Update "schema has 22 keys" only if `SCHEMA_KEYS` changes (it should not; `og` is manifest-side). Also add the glyph test (font is Geist, no `glyph.id === 0`, path count equals glyph count). Runner is `node:test` (line 1).

---

### `tests/smoke.spec.mjs` (test, e2e)

**Analog:** itself. Replace the test at lines 194-215 with RESEARCH "Smoke assertions". Keep its HTML-tag extraction idiom (lines 207-209):
```js
const content = html.match(
  /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/,
)?.[1];
```
(the research regex handles both `property` and `name`). Drop `test.setTimeout(300_000)` and the cold-render comment. Add home and booking assertions: booking `og:image` is the static route and returns `image/png` 200. Imports at lines 1-4 already provide `ORDER`, `PROJECTS_IN_ORDER`. Update "removed files are gone" (lines 222-228): replace the cms-stamp JSON assertion with
```js
for (const path of ["/api/cms-stamp", "/api/revalidate", "/api/media/abc"]) {
  expect((await request.get(path)).status(), path).toBe(404);
}
```
following the existing loop style at lines 223-225. Keep the `apiMedia` watcher (line 53).

---

### `scripts/check-content.mjs` (script)

**Analog:** itself. Mirror whatever options `lib/content.js` passes to `resolveContent` (line 26), and extend the success line (lines 27-33) to count og entries if desired. It reads the manifest with `readFileSync(join(root, "content/media.json"))`.

---

## Shared Patterns

### Manifest is written only by `scripts/media.mjs`
**Source:** `scripts/media.mjs` lines 138-143 (`writeManifest`, tmp file plus rename, `sortDeep`).
**Apply to:** `share`, the `origin.from` rewrite step, any preview or booking command (preview and booking never write it).

### Build is the safety net, errors name `slug.field`
**Source:** `lib/content-schema.mjs` lines 72-75 and 229-232 (`collect` -> `validateContent` throws joined lines); `lib/content.js` lines 9-13 evaluates at module load.
**Apply to:** `og` and `site.home` validation. A missing or stale entry throws at build, never falls back to the logo.

### Immutable content-addressed R2 objects, verified by read-back
**Source:** `scripts/media.mjs` lines 51, 183-198 (`IMMUTABLE`, `checkPublic`) and 488-497.
**Apply to:** every uploaded share JPEG. Pass the JPEG content type to `checkPublic`.

### Env access
**Source:** scripts use `loadEnv()` from `scripts/lib/load-env.mjs` (lines 12-20); app code uses `lib/env.js` accessors only. Never read or print `.env.local`; check key presence as booleans by name.

### Logging
**Source:** CLAUDE.md "Logging". Bracketed tags `[media]`, `[share]`, `[content]`; no `console.log` in `app/` or `lib/`; scripts may log.

### Formatting gate
New files (`lib/share.mjs`, `scripts/lib/share.mjs`, tests) must pass `npx prettier --check .`; ESLint flat config applies to `.mjs` under `lib/`.

### Booking surface stays untouched
**Source:** `lib/notion/bookings.js`, `lib/book/*`, `app/api/book/*`, `lib/mail/booking.js`, `components/book/*`. Only edit near it: `lib/notion/client.js` (remove `cachedDataSourceId`) and `lib/env.js` (remove projects/webhook accessors). `git diff main -- lib/book lib/notion/bookings.js lib/mail app/api/book components/book` must be empty.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Glyph-path text rendering inside `scripts/lib/share.mjs` | utility | transform | No repo code lays out text with fontkit or builds SVG overlays. Use 03-RESEARCH.md Pattern 1 (probe-verified) with the 03-UI-SPEC.md numbers. sharp `text`/SVG `<text>` render Helvetica here and must not be used |
| Availability proof helper (D-10) | script | request-response | Throwaway `node -e`, not committed; reuse `busyFromResponse` and `isSlotOpen` from `lib/book/time.js` |

## Metadata

**Analog search scope:** `scripts/`, `scripts/lib/`, `lib/`, `lib/notion/`, `app/`, `app/project/[slug]/`, `app/booking/`, `tests/`, `content/`, `next.config.mjs`.
**Files scanned:** 22 read in full or in targeted ranges.
**Pattern extraction date:** 2026-10-04
