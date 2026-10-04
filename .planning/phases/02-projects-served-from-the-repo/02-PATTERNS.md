# Phase 2: Projects served from the repo, media on R2 - Pattern Map

**Mapped:** 2026-10-04
**Files analyzed:** 36 (new, modified, deleted)
**Analogs found:** 31 / 36 (5 have no analog; use RESEARCH.md)

All line numbers are from the tree at commit `2d235df`. JavaScript only; Prettier defaults (double quotes, semicolons, 2-space, trailing commas, 80 cols). Scripts and `content/` import no `@/` alias.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `content/projects/<slug>.mjs` x8 (new) | content module | static data | `components/ring/projects.js` (shape) + `lib/notion/projects.js` `mapPage` L27-58 (target record) | role-match |
| `content/projects/index.mjs` (new) | content index | static data | `components/ring/projects.js` `PROJECTS_DATA` order | role-match |
| `content/media.json` (new, machine-written) | manifest | batch | `scripts/generate-project-media.mjs` `readManifest`/`writeManifest` L44-54 | role-match |
| `lib/content-schema.mjs` (new) | utility (pure validator) | transform | none (closest style: `lib/projects.js` pure helpers) | no analog |
| `lib/content.js` (new) | service | request-response (sync) | `lib/cms/projects.js` (replaces it) | exact (role) |
| `scripts/check-content.mjs` (new) | script | batch | `scripts/lib/load-env.mjs` (root/fs) + `generate-project-media.mjs` header | partial |
| `scripts/media.mjs` (new, replaces `generate-project-media.mjs`) | script | file-I/O + batch | `scripts/generate-project-media.mjs` | exact |
| `lib/projects.js` (modify) | utility | transform | itself | n/a |
| `lib/cms/projects.js` (delete) | service | request-response | n/a | n/a |
| `components/ring/projects.js` (delete) | data | static | n/a | n/a |
| `components/ring/atlas.js` (modify) | component helper | event-driven (image load) | itself L6-29 | n/a |
| `components/Carousel.jsx` (modify) | component | event-driven | itself L23, L53, L57 | n/a |
| `components/ring/meta.js` (modify) | component helper | transform | itself L2, L142 | n/a |
| `app/page.js` (modify) | route (server page) | request-response | itself L8, L32-55 | n/a |
| `app/project/[slug]/page.js` (modify) | route (SSG) | request-response | itself L18-28, L66-75 | n/a |
| `app/sitemap.js` (modify) | route | request-response | itself | n/a |
| `app/llms.txt/route.js` (modify) | route handler | request-response | itself | n/a |
| `app/opengraph-image.js`, `app/project/[slug]/opengraph-image.js`, `twitter-image.js` x2 (modify) | route | request-response | `app/project/[slug]/opengraph-image.js` L1-25 | n/a |
| `lib/og-image.js` (modify) | utility | transform / file-I/O | itself L19-48 | n/a |
| `components/project/ProjectMedia.jsx` (modify) | component | request-response | itself L70-79 | n/a |
| `components/project/ProjectGallery.jsx` (modify) | component | request-response | itself L110-129 (the `next/image` branch) | n/a |
| `components/SharedTransitionProvider.jsx` (modify) | provider | event-driven | itself L46-54, L244 | n/a |
| `lib/project/warm.js`, `components/project/ProjectWarm.jsx` (modify) | utility | event-driven | itself L20-60 | n/a |
| `components/project/ProjectNotFound.jsx` (modify) | component | request-response | itself L7-19 | n/a |
| `app/providers.js` (modify, drop CmsLive) | provider | event-driven | itself L9-22 | n/a |
| `app/api/cms-stamp/route.js` (modify, constant body) | route handler | request-response | itself L1-20 | n/a |
| `next.config.mjs` (modify) | config | config | itself L35-50 | n/a |
| `tests/smoke.spec.mjs` (modify) | test | request-response | itself | n/a |
| `tests/screens.spec.mjs` (check only) | test | request-response | itself | n/a |
| `README.md`, `LICENSE`, `AGENTS.md`, `.gitignore` (modify) | docs/config | n/a | in-place | n/a |
| `public/1..18.webp`, `public/404.webp` (delete) | asset | n/a | n/a | n/a |
| Cloudflare zone rule JSON (applied via `cf`, not committed unless kept as `scripts/` note) | config | config | RESEARCH.md "Zone header rule" | no analog |
| `.planning/.../snapshot/live-2026-10-04.json` (new evidence) | evidence | batch | RESEARCH.md Pattern 1 extractor | no analog |
| Snapshot extractor script (one-off, may live in `scripts/media.mjs import-live`) | script | file-I/O | RESEARCH.md "Snapshot extractor" | no analog |
| `scripts/lib/r2.mjs`, `scripts/lib/load-env.mjs` | reused unchanged | | | |

## Pattern Assignments

### `content/projects/<slug>.mjs` and `content/projects/index.mjs` (content module, static data)

**Analog (target record shape):** `lib/notion/projects.js` `mapPage` L27-58. The resolved record must keep this shape so the UI barely changes:
```js
project: {
  id, updatedAt: edited, file: mediaPath(...), slug, name,
  type, year, liveUrl: ... || null, order,
  detail: {
    summary, overview, challenge, outcome,
    gallery: [{ file, alt, kind }],
    testimonial: quote ? { quote, author, role } : { quote: "", author: "", role: "" },
    tools,
  },
}
```
**Analog (authoring style):** `components/ring/projects.js` L1-10 opening comment (ring order = list order, `slug` is identity "keep it explicit so a URL survives a later reorder"). Carry that comment into `index.mjs` as the `ORDER` note. Module shape and full key list: RESEARCH.md "Content module (shape)" and Pattern 2 (required keys incl. `overview`, D-12; Pixenhouse gallery `kind: "identity"`, D-13).

**Rules:** no imports in the 8 modules, no `@/` alias (Node scripts import them). `index.mjs` imports the 8 relatively and exports `ORDER` / `PROJECTS_IN_ORDER`. Store rendered alt strings literally. Keep exact live values (RESEARCH "Values to keep exactly").

---

### `lib/content.js` (service, sync request-response)

**Analog:** `lib/cms/projects.js` (what it replaces; callers keep `getProjects`).

**Imports/shape to mirror** (L1-8):
```js
import { cache } from "react";
...
import { indexProjects } from "@/lib/projects";

const FALLBACK = indexProjects(FALLBACK_PROJECTS);
```
Replace with RESEARCH.md "Resolver": `import "server-only"`, module-level `const PROJECTS = indexProjects(resolveContent(PROJECTS_IN_ORDER, manifest))` (throws at evaluation, so `next build` fails), `export function getProjects()` (synchronous, no `cache`, no `await` needed; callers that `await` it still work), plus `getProject(slug)`.

**Error format** follows the logging convention (CLAUDE.md "Logging"): bracketed tag, `[content] pixenhouse.approach: key missing`.

`indexProjects` (`lib/projects.js` L76-82) already caps at `MAX_PLANES` and adds `index`, `liveUrl ?? null`; reuse it, do not rewrite.

---

### `lib/content-schema.mjs` (pure validator) and `scripts/check-content.mjs`

**No analog.** Use RESEARCH.md Pattern 2 (key list, `Object.hasOwn`, enums, manifest checks). Copy only conventions:
- Named exports, `.mjs`, no `@/`, no `server-only`, no env reads.
- `check-content.mjs` header doc block and `process.exit(1)` fail-fast, copied from `scripts/lib/load-env.mjs` `requireEnv` L37-44:
```js
console.error(`Missing ${missing.join(", ")}`);
if (hint) console.error(hint);
process.exit(1);
```
- Read `content/media.json` with `fs`, using `root` from `scripts/lib/load-env.mjs` L5; import `content/projects/index.mjs` by file URL as scripts already do (`generate-project-media.mjs` L186: `pathToFileURL(join(root, "components/ring/projects.js")).href`).

---

### `scripts/media.mjs` (script, file-I/O + batch)

**Analog:** `scripts/generate-project-media.mjs` (move its generation path in, delete the old file; one writer).

**Header doc block** (L1-19): prose "runs at authoring time and never from the app", manifest is the gate, usage lines. Copy the style; update usage to `check | import-live | verify | generate`.

**Imports** (L20-47): `node:crypto`, `node:fs`, `node:path`, `node:url`, `sharp`, then `./lib/load-env.mjs` (`loadEnv, root, sleep`), `./lib/r2.mjs` (`headObject, isR2Configured, publicUrl, putObject, r2Config`). Keep `./lib/higgsfield.mjs` and `./lib/art-direction.mjs` imports only for the ported `generate`.

**CLI flag parsing** (L50-60, hand-rolled, no arg library):
```js
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback = "") => {
  const hit = args.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
```

**Constants + manifest I/O** (L9-10, L44-57). Replace `MANIFEST` path with `join(root, "content", "media.json")`; make the write atomic (tmp + rename, sorted keys) per RESEARCH Pattern 5:
```js
const IMMUTABLE = "public, max-age=31536000, immutable";
const sha8 = (buffer) =>
  createHash("sha256").update(buffer).digest("hex").slice(0, 8);
function writeManifest(manifest) {
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}
```

**`check` command** (L99-128): put, head, then public GET; keep verbatim and add the two ACAO prints (with and without `Origin`). Failure branch uses `console.error` + `process.exit(1)` when `!isR2Configured(r2)` (L100-105).

**Upload + verify pattern** (L124-155 `uploadImage`/`uploadVideo`): key `projects/${slug}/${name}-${sha8(buffer)}.webp`; `dryRun` returns `{ key, url: publicUrl(r2, key), bytes }` without writing; otherwise `putObject(r2, key, buffer, "image/webp", { cacheControl: IMMUTABLE })`. For `import-live`, do NOT re-encode through `sharp` (RESEARCH anti-pattern); use `sharp(buf).metadata()` only for width/height. Add `headObject` size match and public GET sha match before writing the manifest entry.

**Idempotence gate:** "anything already recorded there is skipped unless `--force`" (header L7-8; flag `force` L70, `dryRun` L71). Keep `--dry-run` first rule.

**Per-item failure handling** (CLAUDE.md "Error Handling" scripts): per-project try/catch, non-zero exit if any failed, manifest written after each success.

**Timeouts:** `AbortSignal.timeout(...)` on downloads, as in `scripts/lib/r2.mjs` L120, L135.

**r2.mjs:** reused unchanged: `putObject(config, key, body, contentType, { cacheControl })` L106-128, `headObject` L130-140 (returns `{ size }` or `null`), `publicUrl` L37-40.

---

### `components/ring/atlas.js` (the only ring change)

**Insertion point** (L6-29), add one line before `img.src` and keep the existing "set before src" comment convention:
```js
const img = new Image();
// Must be set before src or the request is already away.
if (priority) img.fetchPriority = priority;
img.decoding = "async";
```
becomes (RESEARCH "Atlas"): add `img.crossOrigin = "anonymous";` here, with a why-comment ("R2 is another origin; must precede src or the canvas is tainted").

**Other edits in this file:**
- L2 `import { IMAGE_FILES } from "./projects";` delete; L49 `buildAtlas(files = IMAGE_FILES, ...)` make `files` required.
- L136 `.catch((err) => console.warn("[atlas]", err.message))` change to `console.error` (`removeConsole` strips `warn` in production; RESEARCH Pitfall 7).
- Do not touch fan order (L144-148), load-counter (`settled`/`tick`), or `forceContextLoss` (AGENTS.md).

---

### `components/Carousel.jsx` and `components/ring/meta.js` (remove placeholder defaults)

- `Carousel.jsx` L23 `import { PROJECTS as FALLBACK_PROJECTS } from "./ring/projects";` delete. L53 `projects = FALLBACK_PROJECTS,` make required. L57 `const ring = projects.length > 0 ? projects : FALLBACK_PROJECTS;` becomes `const ring = projects;`. Confirm `HomeRingProvider` (`components/HomeRing.jsx`) only mounts `<Carousel>` with a non-empty list (RESEARCH Pattern 8).
- `meta.js` L2 import delete; L142 `createMeta(refs, params, projects = FALLBACK_PROJECTS)` make `projects` required.
- Caution: `AGENTS.md` says non-obvious ring internals stay; these are signature-only edits.

---

### `lib/projects.js` (remove placeholder defaults)

Delete L1 import, L84 `export const PROJECTS = indexProjects(FALLBACK_PROJECTS);`, L86 `export const IMAGE_FILES = ...`. Remove defaults `list = PROJECTS` at L93, L100, L108, L123, L133, L143 (list becomes required). Keep `projectImageSrc` (L26-38): absolute `https://` URLs already pass through untouched, which is what R2 URLs need. `galleryImageAlt` L57-74: with literal stored alts it falls through the `looksLikeFile` check and returns the stored alt (L64-71); the `kind === "pdf"` branch L58-62 becomes dead once gallery `kind` is the new enum, so remove it with the PDF code. Note the Pixenhouse alt for stored items must equal the live string `PIXENHOUSE — page N of 29. Brand & Web by Koussay Zayani.`

---

### Callers of `getProjects` (switch import to `@/lib/content`)

Exact list: `app/sitemap.js:1`, `app/page.js:3`, `app/opengraph-image.js:1`, `app/project/[slug]/page.js:6`, `app/llms.txt/route.js:1`, `app/project/[slug]/opengraph-image.js:1` (and the two `twitter-image.js` re-exports if they import it).

**`app/page.js`:**
- Delete `export const revalidate = 60;` (L8).
- Preload links (L41-49): add `crossOrigin="anonymous"` (RESEARCH "Home preload"):
```jsx
<link key={file} rel="preload" href={projectImageSrc(file)} as="image"
      fetchPriority={index === 0 ? "high" : "low"} />
```
- `await getProjects()` may stay (awaiting a sync value is fine) or drop `async`; keep consistent across callers.

**`app/project/[slug]/page.js`:**
- L18-25 `generateStaticParams`: remove the `try/catch` (a failure must fail the build): `return getProjectStaticParams(getProjects());`
- L27-28: `export const dynamicParams = false;` and delete `revalidate`.
- L7 and L73 delete `withExpandedPdfGallery`; use `project` directly (L74, L89-90).
- L71 `if (!project) notFound();` stays (with `dynamicParams = false` Next 404s earlier; `generateMetadata` L35-41 not-found branch can stay).

**`app/sitemap.js`:** drop `try/catch` L9-13 and `now` fallback at L30: `lastModified: new Date(project.updatedAt)`. Keep home and booking entries at `now` (L16-27).

**`app/llms.txt/route.js`:** delete `export const revalidate = 60;` (L10); drop `try/catch` L13-19. Text template L21-57 unchanged (it already uses `project.detail?.summary`, `project.liveUrl`).

**`app/project/[slug]/opengraph-image.js`:** delete `export const revalidate = 60;` (L5). Keep `generateImageMetadata` L10-22 shape; `getProjectBySlug` still used.

---

### `lib/og-image.js` (utility, file-I/O, D-07)

**Analog:** itself. Remove L6-7 `@/lib/notion/*` imports and `fetchNotionCover` (L33-48). Copy its fetch shape for the replacement `fetchCover(project)`:
```js
const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
if (!response.ok) return null;
return Buffer.from(await response.arrayBuffer());
```
Change the failure contract: when `project` is passed and the cover cannot be fetched, throw (no silent logo). `readLogo` L15-17 stays for `ogImageResponse()` with no project (booking). `readLocalCover` L19-31 is no longer needed (delete). `ogImageResponse` L50-71: `const source = cover || (await readLogo())` becomes "project present => cover required". Keep the `sharp` resize and the `Cache-Control` header.

---

### `components/project/ProjectMedia.jsx` (hero)

**Edit** at L70-79 (`<Image src=... fill preload={preload} sizes=... />`): add `unoptimized` and `crossOrigin="anonymous"`, keep `onLoad`/`onError`. D-06 and RESEARCH Pattern 3. `imageSrc` L12 stays `projectImageSrc(project)`.

---

### `components/project/ProjectGallery.jsx` (gallery, one renderer)

**Analog:** the existing non-paper `next/image` branch, L110-129:
```jsx
<li key={`${src}-${itemIndex}`} className={styles.galleryItem}>
  <div className={`${styles.galleryFrame} ${paper ? styles.galleryFramePaper : ""}`}>
    ...
      <Image src={src} alt={alt} fill loading="lazy" sizes={GALLERY_IMAGE_SIZES}
             className={styles.galleryImage} />
```
Delete `isPaperItem`, `pagedSrc`, `PdfPageImage`, `PdfStack`, the `isPdfName` import (L6) and the `useEffect/useState` import. New single renderer per RESEARCH Pattern 8: `next/image` with `width`/`height` from the manifest (no `fill`), `sizes={GALLERY_IMAGE_SIZES}`, paper frame classes for every item (`galleryFrame` + `galleryFramePaper`, image class `galleryImagePaper`: intrinsic ratio, width 100%, height auto), first two `loading="eager"` (the old `eager={index < 2}` at L72/L116), the rest `lazy`. The section wrapper L85-92 (header, `sectionNumber`, `galleryStack`) stays. Items filter L81 `gallery.filter((item) => projectImageSrc(item.file ?? item))` stays.

---

### `components/SharedTransitionProvider.jsx`, `lib/project/warm.js`, `components/project/ProjectWarm.jsx`

- `SharedTransitionProvider.jsx` L46-54 `preloadImage`: add `img.crossOrigin = "anonymous";` before `img.src = src;` (same ordering rule as atlas). L244 `<img src={active.src} alt="" draggable={false} decoding="sync" />`: add `crossOrigin="anonymous"` (an `eslint-disable @next/next/no-img-element` comment may already be adjacent; keep it).
- `lib/project/warm.js` L20-30 `collectSrcs` skips PDF pages after the first via `item?.kind === "pdf" && Number(item.page) > 1`; with the new enum that condition is dead, so replace with "warm only the first gallery item" (RESEARCH: else it decodes 29 pages on ring hover). `urlsFor` L31-52 uses `getImageProps` (gallery path, same-origin `/_next/image`): keep for gallery; the hero must use the raw URL with `crossOrigin="anonymous"`, skipping `getImageProps` (`unoptimized`).
- Pager thumb (`ProjectPager.jsx`) stays optimized; covered by `remotePatterns`.

---

### `components/project/ProjectNotFound.jsx` (404, D-14)

**Analog:** itself L7-19. Keep the structure (`PagerAbort`, sr-only `h1` "404", `styles.notFoundState`, `Link` with `styles.notFoundMark` and `aria-label="Home"`). Replace the `<Image src="/404.webp" alt="404" width={908} height={636} priority />` (L14) with live text "404" in Geist at the same size and position, and drop the `next/image` import. Styling goes in `app/project/[slug]/page.module.css` `.notFoundMark` using the existing tokens (CLAUDE.md "use the tokens instead of literals"). Design gate: before/after screenshot signed by Koussay before `public/404.webp` is deleted.

---

### `app/providers.js` and `app/api/cms-stamp/route.js` (disconnect Notion projects)

- `providers.js` L3 and L15: remove the `CmsLive` import and element. `CmsLive.jsx` file itself may remain until Phase 3.
- `cms-stamp/route.js`: keep L8-11 (`runtime`, `dynamic`, `NO_STORE`) and the existing branch that already does the right thing:
```js
const NO_STORE = { "Cache-Control": "no-store" };
export async function GET() {
  return Response.json({ stamp: "" }, { headers: NO_STORE });
}
```
Delete the Notion imports (L1-6) and the try body. `/api/revalidate` and `/api/media` untouched this phase.

---

### `next.config.mjs` (config)

**Analog:** `images` block L35-50. Add `remotePatterns` beside `localPatterns` (leave `localPatterns`, `serverExternalPackages`, `outputFileTracingIncludes` for Phase 3):
```js
remotePatterns: [
  { protocol: "https", hostname: "media.koussay.online", port: "", pathname: "/projects/**", search: "" },
],
```

---

### `tests/smoke.spec.mjs` (test, TEST-02)

**Analog:** itself. Reuse `watch(page)` L10-37 (console error collector that records `msg.type() === "error"` and `pageerror`; booking guard; font tracking). The `THREE.WebGLState:` SecurityError and shader errors both arrive via `console.error`, so the existing `expect(errors).toEqual([])` (L80) already catches the mutations once covers are cross-origin.

Additions to the "home renders the ring" test (L39-81), following the existing `page.on("response", ...)` style at L29-34:
- record responses whose URL starts with `https://media.koussay.online/projects/`; assert at least 8 with status 200 and `access-control-allow-origin: *`;
- record any `/api/media` request; assert `[]`.
- Keep `test.setTimeout(240_000)` and the generous 150 s loader budget (L53-56 comment says not to shorten).

"every project page renders" (L83-110): reads paths from `/sitemap.xml` (L84-88) so it follows the 8 projects automatically; update the comment L89-90 ("live Notion set and the 18 placeholders"). Add a project-to-home navigation (RESEARCH Pitfall 2: failure appears only on second navigation). Guard helpers in `tests/guards.mjs` L4-26 (`isBookingUrl`, `guardBooking`) are the model for any new route guard: match on pathname, record in the browser context, return the live list.

`tests/screens.spec.mjs`: not edited; check that nothing reads placeholder names (grep `Matchday|Nightshift`).

---

## Shared Patterns

### Absolute media URLs, one request mode
**Source:** `lib/projects.js` `projectImageSrc` L26-38 (https passthrough). **Apply to:** every loader of a raw R2 cover (atlas, preload link, hero, flyer, warm cache) with `crossOrigin="anonymous"` set before `src`.

### Scripts: env, flags, fail fast, manifest gate
**Source:** `scripts/lib/load-env.mjs` L11-31 (`loadEnv`, real env wins), L37-44 (`requireEnv`); `scripts/generate-project-media.mjs` L50-60 (flags). **Apply to:** `scripts/media.mjs`, `scripts/check-content.mjs`. Never read or print `.env.local`; paid or destructive operations stay behind the manifest or an explicit flag; `--dry-run` first.

### Env access in app code
**Source:** `lib/env.js` accessors. **Apply to:** nothing new reads env in this phase: R2 URLs are absolute in `content/media.json`, so the app needs no env. Do not call `process.env` inline.

### Logging and error handling
**Source:** CLAUDE.md "Logging"/"Error Handling". **Apply to:** all new code. Bracketed tags (`[content]`, `[media]`, `[atlas]`, `[og]`), `console.error` for failures (not `warn`, stripped in production), no `console.log` in app code. Intentionally swallowed errors use bare `catch {}` plus a why-comment. Content failure must throw, never be swallowed (the old `try/catch ... return []` in `generateStaticParams`, sitemap and llms.txt is removed).

### Module conventions
**Source:** CLAUDE.md "Module Design". Components `export default function Name`; everything else named exports; `"use client"` first line only for hooks/browser APIs; `lib/content.js` is server-only (`import "server-only"`), so scripts must never import it.

### Comments
**Source:** CLAUDE.md "Comments". Explain why, short (for example, "must precede src or the canvas is tainted").

### Formatting gates
Phase-end gate: `npm run format:check`, `npm run lint`, `npm run build`, `npm test` (port 3100 only; kill by port, never by pattern). `npm test` now needs network (R2).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `lib/content-schema.mjs` | validator | transform | No schema validation exists; use RESEARCH Pattern 2 |
| Zone `http_response_headers_transform` rule | config | config | Cloudflare-side; use RESEARCH "Zone header rule" (`set`, not `add`) |
| Snapshot extractor and `snapshot/live-2026-10-04.json` | script/evidence | file-I/O | One-off; use RESEARCH Pattern 1 and "Snapshot extractor" |
| `media.mjs import-live` / `verify` subcommands | script | batch | Download-and-verify has no precedent; structure from `uploadImage` (L124-155) plus RESEARCH Pattern 5 |
| Gallery-with-intrinsic-size renderer | component | request-response | Closest is `ProjectGallery.jsx` L110-129; new `width`/`height` usage from RESEARCH Pattern 8 |

## Delete list (importers fixed in the same commit)

`components/ring/projects.js`, `lib/cms/projects.js`, `scripts/generate-project-media.mjs` (after porting), `public/1.webp`..`public/18.webp`, `public/404.webp`. Importers found by grep: `components/Carousel.jsx:23,53,57`, `components/ring/meta.js:2,142`, `components/ring/atlas.js:2,49`, `lib/projects.js:1,84,86`, `lib/cms/projects.js:3`, `scripts/generate-project-media.mjs:186,271`, `app/project/[slug]/page.js:7` (`notion/gallery-pdf`). After deletion, `grep -rn "media-manifest.json"` and `grep -rn "r2\.dev"` must return nothing. `lib/notion/gallery-pdf.js`, `lib/pdf.js`, `lib/media.js` become unreferenced by pages but stay for the `/api/media` route until Phase 3. Docs to edit: README L44, L121-126; LICENSE L34-47 (D-15 wording); AGENTS.md ("Eighteen project cards", "ring/projects.js" layout line, "PROJECTS order is ring order" now `content/projects/index.mjs` `ORDER`).

## Metadata

**Analog search scope:** `app/`, `components/`, `lib/`, `scripts/`, `tests/`, `next.config.mjs`
**Files scanned:** about 30 read in full or in part (RESEARCH.md lines 546-648, validation strategy, not read; patterns here do not depend on it)
**Pattern extraction date:** 2026-10-04
