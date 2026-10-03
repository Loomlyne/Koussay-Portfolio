# Architecture Research

**Domain:** Next.js 16 WebGL portfolio. This milestone moves project content and media off Notion into the repo and Cloudflare R2, adds a launch-video hero, and keeps Notion only for bookings.
**Researched:** 2026-10-03
**Confidence:** HIGH for code boundaries (read from the tree). MEDIUM for R2 and video delivery (official docs plus one live check). LOW where marked.

This file covers integration only. Ring internals are documented in `AGENTS.md` and are not repeated here. Nothing below changes the packed `uScale`, fan-order indexing, the one-frame-stale focus, the snap that only decelerates, or `forceContextLoss`.

---

## 0. Facts found during research that change the plan

Each of these was checked directly, not inferred.

1. **Production already shows eight real projects from Notion.** The RSC payload of https://koussay.online (fetched 2026-10-03) carries eight rows with real written copy: `pixenhouse`, `vamos-taxi`, `looma-kitchen`, `almar-private-journey`, `fido-homes`, `elysee-home-design`, `clickit-story`, `artemis-luxe`. So:
   - The ring has run at 8 cards in production since about 2026-09-04 (the rows' `updatedAt`). The geometry at 8 has had live exposure. It has not been tuned for 8.
   - Five target projects already have approved-looking copy and stable public URLs: `fido-homes`, `elysee-home-design`, `clickit-story`, `artemis-luxe`, `vamos-taxi`. **Keep these slugs.** They are indexed through the sitemap.
   - Three live slugs leave the set: `pixenhouse`, `looma-kitchen`, `almar-private-journey`. Three join: Numai Trading, Invios, Payme.
   - The live Clickit `liveUrl` is `https://www.clickitstory.ae`. PROJECT.md says `clickitstory.com`. Koussay needs to confirm which is right.
2. **The only gallery item in production is a PDF** (Pixenhouse brand guideline, `kind: "pdf"`), and Pixenhouse is leaving. No target project needs PDF rendering at runtime. Branding PDFs for the new set get rasterised when they are authored.
3. **`koussay.online` DNS is at Namecheap** (`dns1/dns2.registrar-servers.com`), not Cloudflare. An R2 custom domain needs the domain to be a Cloudflare zone in the same account as the bucket. Cloudflare says `r2.dev` URLs are rate-limited and for development only. **R2 in production is blocked until the nameservers move to Cloudflare** (or a different Cloudflare-hosted domain is used). Moving the zone also has to carry the existing records: the Vercel apex `216.198.79.1` and any MX, SPF or DKIM records, including the Resend sending domain.
4. **Nothing in the app sets `crossOrigin`.** `components/ring/atlas.js` loads each image with `new Image()`, draws it into a 2D canvas, and uploads that canvas as a `CanvasTexture`. Today every image is same-origin (`/api/media`, `public/`). Once the images are R2 URLs on another origin, the canvas is tainted and the WebGL upload throws a SecurityError. The cells go blank and the console logs an error. Fixing this needs three things together: `img.crossOrigin = "anonymous"` in the atlas loader, `crossOrigin="anonymous"` on the `<link rel="preload">` tags in `app/page.js` (or the preload is wasted and the image downloads twice), and a CORS policy on the R2 bucket.
5. **When the ring is parked it stops rendering.** `renderer.setAnimationLoop(on ? tick : null)` runs in `applyStage`, so a hero video on `/project/*` does not compete with the WebGL loop for the GPU.
6. **Next 16.3.8 brings its own `sharp`** as an optional dependency (`^0.35.4`). The direct `sharp ^0.34.4` dependency, which has the advisory, is only needed by the media proxy, `lib/og-image.js` and the scripts. Once the first two are gone, `sharp` moves to `devDependencies` at `^0.35`.
7. **`unstable_cache` was replaced by `use cache` in Next 16** (`node_modules/next/dist/docs/.../unstable_cache.md`). Content from the repo needs neither, and all uses get deleted.

---

## 1. Target architecture

### System overview (after the milestone)

```text
AUTHORING (Koussay's Mac, never reachable by a visitor)
┌───────────────────────────────────────────────────────────────────────────┐
│ Agent + skills                       Repo scripts (only writers to R2)    │
│ ┌──────────────┐ ┌─────────────────┐  ┌─────────────────────────────────┐ │
│ │ Interview -> │ │ Higgsfield MCP  │  │ scripts/media.mjs               │ │
│ │ content/     │ │ brag/brag-slim  │  │  check | ingest | verify        │ │
│ │ projects/*.mjs│ │ HyperFrames CLI │─▶│  sharp / ffmpeg / pdftoppm      │ │
│ │ (Koussay     │ │ -> media-work/  │  │  -> R2 PUT (content-addressed)  │ │
│ │  approves)   │ │   (gitignored)  │  │  -> content/media.json          │ │
│ └──────┬───────┘ └─────────────────┘  └───────────────┬─────────────────┘ │
└────────┼──────────────────────────────────────────────┼───────────────────┘
         │ committed                                     │ committed
         ▼                                               ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ BUILD (next build on Vercel). Everything static.                          │
│  lib/content.js (server-only)                                              │
│   content/projects/index.mjs  ⨝ (by slug)  content/media.json              │
│   -> validate (throws, so the build fails) -> indexProjects -> PROJECTS    │
│        │                    │                     │                       │
│        ▼                    ▼                     ▼                       │
│  app/page.js        app/project/[slug]/page.js   sitemap, llms.txt, JSON-LD│
│  (static)           generateStaticParams, dynamicParams=false, static      │
└────────┬───────────────────┬──────────────────────────────────────────────┘
         │ RegisterHome      │ ProjectDetail(project)
         ▼                   ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ BROWSER                                                                    │
│  HomeRingProvider -> Carousel -> buildAtlas(cell URLs, crossOrigin)        │
│  SharedTransition flyer (poster URL) -> ProjectMedia frame                 │
│    ├─ next/image poster (LCP, landing target)                              │
│    └─ HeroVideo (client): plays after the flyer lands; respects reduced    │
│       motion, viewport and play() rejection                                │
│  ProjectGallery -> next/image (R2 via remotePatterns)                      │
└────────┬──────────────────────────────────────────────────────────────────┘
         │ GET https://media.koussay.online/projects/<slug>/<role>-<sha8>.<ext>
         ▼   (immutable, CORS *, Range)            /_next/image?url=<R2>
┌──────────────────────────────┐   ┌────────────────────────────────────────┐
│ Cloudflare R2 + custom domain│   │ Vercel Image Optimization (gallery/hero)│
└──────────────────────────────┘   └────────────────────────────────────────┘

BOOKINGS (unchanged): /booking -> /api/book/* -> lib/notion/{client,props,bookings}.js
                      -> Notion bookings and calendar DBs; lib/mail/booking.js -> Resend
```

### Component responsibilities after the change

| Component | Owns | Talks to | File |
|---|---|---|---|
| Content modules | Approved prose and facts per project: slug, name, type, year, status, live URL, summary, overview, challenge, outcome, role, tools, gallery order with alt text | Imported only by `lib/content.js` and `scripts/` | `content/projects/<slug>.mjs`, `content/projects/index.mjs` |
| Media manifest | Every published media URL, with key, size, bytes and source hash | Written only by `scripts/media.mjs`. Read by `lib/content.js` | `content/media.json` |
| Content resolver | Joins content and manifest by slug, validates, returns the existing Project record shape | Pages, sitemap, llms.txt, metadata | `lib/content.js` (new, `import "server-only"`) |
| Project helpers | Pure list, slug, neighbour and alt-text helpers. **No data import.** | Client and server | `lib/projects.js` (trimmed) |
| Ring | Unchanged internals. Its atlas reads `project.cell` | HomeRingProvider | `components/Carousel.jsx`, `components/ring/*` |
| Hero media | Poster image as the landing target, plus an optional video layer | SharedTransition context | `components/project/ProjectMedia.jsx` plus new `components/project/HeroVideo.jsx` |
| Media ingest | Renditions, R2 upload and the manifest write. The single writer | R2 S3 API, local ffmpeg, pdftoppm, sharp | `scripts/media.mjs`, `scripts/lib/{r2,ingest,load-env}.mjs` |
| Bookings | Unchanged | Notion, Resend | `lib/book/*`, `lib/notion/{client,props,bookings}.js`, `lib/mail/booking.js`, `app/api/book/*` |
| Smoke test | Loads `/` and every `/project/<slug>`. Fails on a console error, a page error, a bad response, or a missing or lost canvas | `next start` on a fixed port | `tests/smoke.spec.js`, `playwright.config.js` |

---

## 2. Content in the repo

### Where it lives: one ESM module per project plus an order file (recommended)

```
content/
  projects/
    index.mjs              # ORDER = ["fido-homes", "vamos-taxi", ...] and the list in ring order
    fido-homes.mjs         # export default { ...one project... }
    vamos-taxi.mjs
    ...
  media.json               # machine-written manifest (section 3)
```

Why `.mjs` modules rather than JSON or MDX:
- **Prose stays readable in a diff.** Template literals allow line breaks and quotes without escaping, and a comment can carry `// approved by Koussay 2026-10-xx`. In JSON every paragraph is one escaped line.
- **MDX is overkill.** There are five short plain-text fields and no inline components. MDX would add a compile step and a dependency for nothing.
- **`.mjs` is unambiguous ESM**, so the Node scripts can import it directly with `import()`, the way they already import `components/ring/projects.js` today. Plain `.js` in a package without `"type": "module"` relies on Node's syntax detection. Rule: **content modules use no `@/` aliases and no imports**, so Node and Next both load them unchanged.
- **Ring order is one array** (`ORDER` in `index.mjs`). This keeps the AGENTS.md rule that one place moves the ring, the column and the numbering together.

### Content shape (authored)

```js
// content/projects/fido-homes.mjs
export default {
  slug: "fido-homes",            // identity, never derived from name
  name: "Fido Homes",
  type: "Brand & Web",
  year: "2026",
  status: "live",                // "live" | "prelaunch"
  liveUrl: "https://www.fidohomes.ae", // null when prelaunch (Payme)
  updated: "2026-10-03",         // drives sitemap lastModified
  summary: `...`,
  overview: `...`,
  challenge: `...`,
  outcome: `...`,
  role: `...`,                   // new field: needs a design before any UI (see note)
  tools: ["Framer", "Figma"],
  testimonial: null,             // or { quote, author, role }
  gallery: [                     // curation and order live here; URLs do not
    { media: "brand-01", alt: "Fido Homes logo lockup on stone." },
    { media: "site-home", alt: "Fido Homes homepage, desktop." },
  ],
};
```

Content refers to media by **slot name** (`media: "brand-01"`) and never by URL. URLs live only in the manifest. That way the pipeline never edits a file Koussay approved, and re-generating an image never touches the prose.

### Resolved shape (unchanged for the UI)

`lib/content.js` produces exactly the Project record the components already consume (`.planning/codebase/ARCHITECTURE.md`, "Project record"), plus a `cell` field and a `media` block:

```js
{
  slug, name, type, year, liveUrl, status, order, index, updatedAt,
  file:  manifest.poster.url,   // flyer, hero poster, pager thumb, JSON-LD, share image
  cell:  manifest.cell.url,     // atlas only (512x341)
  media: { poster, cell, og, video /* or null */ },
  detail: { summary, overview, challenge, outcome, role, tools, testimonial,
            gallery: [{ file, alt, kind: "image", w, h }] },
}
```

Keeping `file` means `ProjectMedia`, `ProjectPager`, `ProjectGallery`, `lib/project/warm.js`, `lib/seo.js` and `SharedTransitionProvider` need no change in the cut-over step.

### How `getProjects()` collapses

```js
// lib/content.js
import "server-only";
import { PROJECTS_IN_ORDER } from "@/content/projects/index.mjs";
import manifest from "@/content/media.json";
import { indexProjects } from "@/lib/projects";

const PROJECTS = indexProjects(PROJECTS_IN_ORDER.map((p) => resolve(p, manifest)));
validate(PROJECTS); // throws, so `next build` fails with the slug and slot named

export function getProjects() { return PROJECTS; }
export function getProject(slug) { return PROJECTS.find((p) => p.slug === slug); }
```

- Synchronous. The existing `await getProjects()` calls still work because awaiting a plain value is fine, so callers only change their import path from `@/lib/cms/projects` to `@/lib/content`.
- **Validation replaces the runtime fallback chain.** The checks: unique slugs, `count ≤ MAX_PLANES`, every project has `poster` and `cell`, every gallery `media` slot exists in the manifest, `liveUrl === null` exactly when `status === "prelaunch"`, and every URL is either `https://<media host>/projects/...` or `/`-relative. The build is the only safety net (AGENTS.md), so a broken reference has to fail it.
- `lib/content.js` is `server-only`, so case-study prose never lands in a client chunk. `server-only` is built into Next and needs no install (Next docs, "server-and-client-components").

### What happens to the caching and freshness machinery

| Piece | Fate | Why |
|---|---|---|
| `export const revalidate = 60` on `app/page.js`, `app/project/[slug]/page.js`, `app/llms.txt/route.js`, the OG routes | **Delete** | Content changes only through commit and deploy. Pages become fully static |
| `dynamicParams = true` on the project page | **Change to `false`** | Unknown slugs return a real 404 at the CDN. Removed slugs (`pixenhouse`, `looma-kitchen`, `almar-private-journey`) 404 honestly. Do not redirect them to `/`, which reads as a soft 404 |
| `generateStaticParams` | Keep, without the try/catch | `getProjects()` cannot fail at runtime any more |
| `unstable_cache`, React `cache()`, `lastGood`, FALLBACK | **Delete** | No I/O left to cache or fall back from |
| `lib/cms/projects.js`, `lib/cms/bust.js` | **Delete** | Replaced by `lib/content.js`. Nothing left to bust |
| `components/CmsLive.jsx` and its line in `app/providers.js` | **Delete** | It polled for Notion edits |
| `app/api/cms-stamp/route.js` | **Delete** | Notion stamp probe |
| `app/api/revalidate/route.js` | **Delete** | Notion webhook. Deleting it also closes the fail-open cache-bust defect |
| `app/robots.js` disallows for `/api/revalidate`, `/api/cms-stamp` | Remove those two entries | The routes are gone |
| `experimental.staleTimes` | Keep | Client router cache. Unrelated to Notion |

Human steps after this ships (Koussay, numbered when the time comes): remove `NOTION_PROJECTS_DATABASE_ID` and `NOTION_WEBHOOK_SECRET` from the Vercel env, and delete the webhook subscription in the Notion integration settings so Notion stops posting to a 404.

### OG images and `generateStaticParams`

- **After the R2 step (recommended end state):** the ingest script renders an `og` rendition (1200x630 JPEG, cover-crop of the poster) for each project. `generateMetadata` on the project page sets `openGraph.images` and `twitter.images` to that R2 URL with its width and height. `lib/seo.js` `projectOgImage()` returns `project.media.og.url`. **Delete** `app/project/[slug]/opengraph-image.js`, `app/project/[slug]/twitter-image.js` and `lib/og-image.js`. The home page uses the first project's `og` URL. `/booking` uses a static `app/booking/opengraph-image.png` made once from the logo (a Next file convention, so no code).
- Why not `next/og` `ImageResponse`: Satori does not decode WebP sources, and the runtime would only re-crop an image the pipeline can crop once. The current OG is a plain crop with no text, so the pipeline rendition reproduces it exactly.
- **In the interim cut-over step**, `lib/og-image.js` keeps working through its existing `readLocalCover()` path, because the snapshot images sit in `public/` (see build order). Only `fetchNotionCover()` is removed.

---

## 3. The media manifest

### One file or two? Two.

| | `content/projects/*.mjs` | `content/media.json` |
|---|---|---|
| Writer | Claude drafts, Koussay approves | `scripts/media.mjs` only |
| Review | Prose, read on the rendered page at UAT | Machine diff of keys and sizes |
| Changes when | Copy is edited | Art or video is re-made |
| Format | ESM with template literals | Stable JSON: sorted keys, 2-space indent, trailing newline, atomic write (tmp then rename) |

If both lived in one file, every ingest would re-serialise a hand-approved file and turn each regeneration into a prose diff. They are joined by slug in one place, `lib/content.js`.

**Move the file:** `scripts/media-manifest.json` becomes `content/media.json`. It has never been written (it does not exist), so the schema can be redefined freely. The app must not import from `scripts/`; that isolation is deliberate (ARCHITECTURE.md, "Exposing generation to the app").

### Schema (version 2)

```json
{
  "version": 2,
  "host": "https://media.koussay.online",
  "projects": {
    "fido-homes": {
      "poster": { "key": "projects/fido-homes/poster-1a2b3c4d.webp", "url": "https://media.koussay.online/projects/fido-homes/poster-1a2b3c4d.webp", "w": 1600, "h": 900, "bytes": 142311, "source": "sha256:…", "from": "video@6.20s" },
      "cell":   { "key": "projects/fido-homes/cell-…webp",  "url": "…", "w": 512,  "h": 341, "bytes": 31022, "source": "sha256:…" },
      "og":     { "key": "projects/fido-homes/og-…jpg",     "url": "…", "w": 1200, "h": 630, "bytes": 88120, "source": "sha256:…" },
      "video":  { "key": "projects/fido-homes/launch-…mp4", "url": "…", "w": 1920, "h": 1080, "duration": 18.4, "bytes": 4810233, "source": "sha256:…" },
      "gallery": {
        "brand-01": { "key": "projects/fido-homes/g-brand-01-…webp", "url": "…", "w": 1600, "h": 1067, "bytes": 120044, "source": "sha256:…" }
      }
    }
  }
}
```

- **Store absolute `url`s**, not just keys. The app then needs no env var to build a URL: `r2PublicBase()` and `isR2Configured()` leave `lib/env.js`, and a local build without `.env.local` renders exactly what production renders. During the interim step, `url` may be `/`-relative (`/projects/fido-homes/poster.webp` in `public/`). The resolver treats both the same.
- **Keys stay content-addressed** (`<role>-<sha8>.<ext>`, sha of the *output* bytes) and are uploaded with `Cache-Control: public, max-age=31536000, immutable`. Never add `?v=`. This matches the existing script.
- **`source` (sha256 of the input file) is the skip gate.** Re-ingesting the same source does nothing. A changed source produces new bytes, a new key and a new URL, and the old object is orphaned harmlessly. `--force` re-renders even when the source is unchanged (for example after a rendition setting changes). This replaces the "slug already in manifest" gate, which could not tell a new image from an old one.
- The prompt, request id and Higgsfield source URL are provenance, not delivery. Keep them in a gitignored `media-work/<slug>/provenance.json` rather than in a file the app imports. That keeps the manifest small and free of anything that looks like an internal URL.

### How the app reads it

`import manifest from "@/content/media.json"` inside `lib/content.js`. It is resolved at build and becomes part of the static output. There is no runtime file read and no fetch.

### How a regeneration is forced

`node scripts/media.mjs ingest --slug=fido-homes --role=poster --file=media-work/fido-homes/launch.mp4 --at=6.2 [--force]`, then commit `content/media.json` and deploy. There is no cache to bust anywhere, because the new URL is a new object.

---

## 4. Deleting the media proxy and PDF renderer

### What depends on `/api/media/*` today (from grep)

| Consumer | How | After the cut-over |
|---|---|---|
| Ring atlas | `project.file` = `/api/media/<id>?v=` → `buildAtlas` | `project.cell` (local, then R2) |
| Hero, pager, flyer, warm | `projectImageSrc(project)` → `file` | `file` = poster URL |
| Gallery | `detail.gallery[].file` = `/api/media/<id>/g<n>` and the `PdfStack` `?pages=1` fetch | Plain image items. The PDF branch is deleted |
| `withExpandedPdfGallery` (`lib/notion/gallery-pdf.js`) | Called by the project page | Deleted. The page passes `project` straight through |
| `lib/og-image.js` | `cachedNotionMediaUrl` (Notion bundle) | `readLocalCover` (interim), then the R2 `og` rendition |
| `lib/seo.js` `shareImages` | Skips `/api/media/` URLs | That check becomes dead code. Simplify it |
| `next.config.mjs` | `localPatterns /api/media/**`, `serverExternalPackages`, `outputFileTracingIncludes` | Removed (below) |

### Safe removal order

1. The content cut-over (section 2) stops emitting `/api/media` URLs. The proxy is still deployed but has no callers. **Ship.** Old HTML in CDN or browser caches can still request `/api/media/...?v=` for a short while; the route still answers.
2. One deploy later: delete `app/api/media/[...parts]/route.js`, `lib/pdf.js`, `lib/notion/gallery-pdf.js`, `lib/media.js`, the PDF branch in `components/project/ProjectGallery.jsx` (`PdfStack`, `PdfPageImage`, `isPaperItem`, `pagedSrc`), and the `kind === "pdf"` branches in `lib/projects.js` `galleryImageAlt` and `lib/project/warm.js` `collectSrcs`. Then delete `lib/notion/projects.js`, plus `notionPageId`, `withTimeout` and `cachedDataSourceId` (with its `unstable_cache` import) from `lib/notion/client.js`. Bookings import only `notion` and `dataSourceId`. Uninstall `@napi-rs/canvas`, `pdfjs-dist` and `unpdf`. **Ship.**
3. With the R2 step: delete `lib/og-image.js` and the OG route files, and move `sharp` to `devDependencies` at `^0.35` (it is still needed by the scripts). **Ship.**

### `next.config.mjs` end state

```js
images: {
  remotePatterns: [
    { protocol: "https", hostname: "media.koussay.online", port: "", pathname: "/projects/**", search: "" },
  ],
  localPatterns: [{ pathname: "/**", search: "" }], // logo, 404.webp, interim public/projects
  // qualities defaults to [75] in Next 16; minimumCacheTTL is not needed because the
  // upstream immutable max-age (1 year) wins over the 4h default.
},
// serverExternalPackages, outputFileTracingIncludes: DELETE
```

- **Keep `localPatterns`**, but only the `"/**", search: ""` entry. Drop the `/api/media/**` entry, which allowed any query string.
- **Keep Vercel image optimisation for the hero and gallery** rather than `unoptimized`. `lib/project/warm.js` pre-decodes exactly the URLs `getImageProps` produces. Turning optimisation off for R2 images would need the same flag threaded through `warm.js`, `ProjectMedia`, `ProjectGallery` and `ProjectPager`, or warming would fetch URLs that are never shown. The volume is small (8 projects × about 8 images × a few widths, well under 5K transformations a month), and each transform is cached for a year because of the upstream `max-age`. (Vercel Image Optimization limits page, updated 2026-08-11.)
- The **atlas and the flyer bypass `next/image`** on purpose. They load the raw R2 URL. That is why the atlas needs `crossOrigin` (fact 4).

### R2 bucket settings that the architecture depends on

- A CORS policy is set **before the first object is requested**: `[{ "AllowedOrigins": ["*"], "AllowedMethods": ["GET", "HEAD"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 86400 }]`. Cloudflare documents that objects already in the edge cache will not show new CORS headers until they are purged, and that requests without an `Origin` header get no CORS headers. A wildcard origin avoids most `Vary` trouble. Confidence on edge-cache CORS behaviour is LOW, so it is checked by `media.mjs verify` (below).
- `media.mjs verify` checks, for every manifest URL: a 200 on HEAD, the right `Content-Type`, `immutable` in `Cache-Control`, `Access-Control-Allow-Origin` present when an `Origin` header is sent (once a MISS warms the cache, then again on the HIT), and for MP4s a `206` to `Range: bytes=0-1`. Safari will not play a video without Range support. R2 range support through the custom domain is MEDIUM confidence until this check passes.

---

## 5. The ring at eight cards

### Keep `ringRefCount: 18` and `ringRadius: 340`

Those two numbers are one authored spec: "a 340 px circle holds 18 slots". `radiusForCount` keeps neighbour spacing constant:

- R(8) = 340 · sin(π/18) / sin(π/8) = 340 · 0.17365 / 0.38268 ≈ **154.3 px**
- Resting gap at 18: 2·340·sin(10°) − 60 ≈ 58.1 px. At 8: 2·154.3·sin(22.5°) − 60 ≈ **58.1 px**. Identical by construction.

Changing `ringRefCount` to 8 would break three things that read the reference values:
1. `radiusForCount` would return 340 at count 8, so the gap would jump to about 200 px and the goo between neighbours would disappear.
2. `frontTarget = params.ringRadius * radiusK * gLand + hubX` uses the **base** radius to place the facing card. Rewriting the spec as (154.3, 8) would move the facing card about 830 world px left at the reference window.
3. `scrollSpeed` is "rad/s per px at ringRefCount" (`onWheel`: `slot / refSlot`). At ref 8 the wheel would feel 2.25× slower per notch unless `scrollSpeed` were re-tuned.

So the machinery built for count ≠ ref is doing its job. **Do not touch `ringRefCount`, `ringRadius`, `radiusForCount` or `frontTarget`.**

### What must be re-checked at 8, with real art, in each band

Computed at the reference window (1512, wide band, `posX −2`, `endScale 4.46`). Confidence MEDIUM: computed, not yet observed on a screen.

| Check | Why it differs at 8 | Where |
|---|---|---|
| Ring centre on screen | At 18 the hub sits about −1512 world px (off-screen left). At 8 it sits about −684, inside the viewport. Cards at ±1 sit at about (−198, ±486) instead of (−87, ±519). The arc is tighter and the neighbours lean further left | Wide, narrow (`narrowRadius ×1.3`, `posX −2.5`) and tight (`×1.066` stacked, `posX −3.8`) bands |
| Edge clamp | `maxX` clamping still pins the facing card. Confirm nothing walks off at `minScale` below 500 px (known gap 7) | Tight band, 390 and 430 px widths |
| Entry fan | `maxN = signedOffset(7) = 4`, against 9 at 18. Each generation peels over a longer share of `stagger`, so the unfurl reads slower and chunkier | Entry timeline |
| Wheel and pick | One slot is 45° against 20°. `scrollSpeed · slot/refSlot` keeps one notch ≈ one card. `pickTime` is root-scaled per slot | Feel test on trackpad and mouse |
| Threads | Closed ring when `spread > 0.995 && count > 2`, so 8 links (`MAX_LINKS 32`) | Visual |
| Atlas | `cols = ceil(√8) = 3`, 3×3 grid, one empty cell, a 1536×1023 canvas | No change needed |
| Placeholder defaults | `params.count: PROJECTS.length` (from the 18 placeholders), `buildAtlas(files = IMAGE_FILES)`, `createMeta(..., projects = FALLBACK_PROJECTS)`, `Carousel({ projects = FALLBACK_PROJECTS })` all import `components/ring/projects.js` | Remove the defaults when the placeholder module is deleted. `Carousel` already overwrites `params.count`. `HomeRingProvider` mounts `Carousel` only once projects exist |

The only Carousel code changes this milestone needs are outside the deliberate designs: `imageFiles = ring.map((p) => p.cell ?? p.file)`, `ringKey` including `cell`, and `crossOrigin` in `atlas.js` `load()`.

---

## 6. Launch video on the project hero

### Component boundary

```
app/project/[slug]/page.js (server)
  └─ ProjectDetail (server/client as today)
       └─ ProjectHero (server)
            └─ ProjectMedia (client, existing: flyer landing target)
                 ├─ <Image src={project.file} preload />   ← poster, LCP, always rendered
                 └─ {project.media.video && <HeroVideo video={…} posterRatio={…} slug={…} />}
```

The server passes plain URLs and sizes only. `HeroVideo` is a small client component with these rules:

1. **It does not compete with the flyer.** `ProjectMedia` already knows `isTransitionTarget` from `useSharedTransition()`. `HeroVideo` sets no `src` while the flyer is holding or animating. When `active` clears (the flyer has faded, `finish()`), it sets `src` and calls `play()`. The flyer lands on the poster `<Image>`, which looks the same as before.
2. **Poster first, video crossfades in.** The `<video>` sits absolutely over the poster with `opacity: 0` and fades in on the `playing` event (about 250 ms). It has no `poster` attribute, because the `<Image>` underneath is the poster; setting one would download it twice.
3. **Frame 0 equals the poster.** The ingest trims the hero cut to start at the poster timestamp (`--at`), so there is no jump from the still to a black intro frame. Deciding this at authoring time keeps the client free of `currentTime` logic.
4. **Attributes:** `muted playsInline loop preload="none"`, plus `autoPlay` only when allowed. `disablePictureInPicture`. No audio track (the ingest strips it with `-an`). Muted autoplay with no unmute control means no fake control. If Koussay wants sound, keep AAC and ship a real toggle. That is a design decision for him.
5. **When it does not autoplay:**
   - `prefers-reduced-motion: reduce`: no autoplay. Show the poster with a real Play button.
   - `navigator.connection?.saveData`: same as reduced motion.
   - `play()` rejects (iOS Low Power Mode, autoplay policy): `.catch(() => setBlocked(true))`, then show the Play button. **An uncaught rejection is a console error and would fail the smoke test.**
   - `error` on the video element: keep the poster and log nothing.
6. **Pausing:** an IntersectionObserver pauses the video off-screen. `visibilitychange` pauses it in a hidden tab. A visible pause/play button covers WCAG 2.2.2 (auto-playing content longer than 5 s needs a pause).
7. **Ratio:** brag and HyperFrames render 16:9 by default. The poster is 16:9, so the hero frame takes 16:9 through the existing `--media-ratio` (set from the poster's natural size, or from the flyer's `ratio`). The video fills the same frame with `object-fit: cover`.

### How the ring still comes from the poster

One frame feeds every still, so the ring card, the flyer, the hero poster and the share card show the same picture:

```
launch.mp4 ──ffmpeg -ss <at> -frames:v 1──▶ frame.png
frame.png ──sharp──▶ poster  1600×900 webp  → project.file (flyer, hero, pager, JSON-LD)
          ──sharp──▶ cell     512×341 webp  → project.cell (atlas; 3:2 centre crop of 16:9)
          ──sharp──▶ og      1200×630 jpg   → metadata openGraph/twitter
launch.mp4 ──ffmpeg -ss <at> -an libx264 crf≈23 yuv420p +faststart──▶ launch-<sha8>.mp4
```

A 3:2 crop of a 16:9 frame keeps 84% of the width (about 8% off each side), so the poster frame needs its subject inside the centre 84%. That goes into the brag storyboard brief.

Before a project has a video, `poster` comes from its Higgsfield cover, and `cell` and `og` derive from that. When the video lands, only the manifest changes. Content and components do not.

---

## 7. Authoring pipeline boundaries

| Step | Run by | Where output lands | Deterministic how |
|---|---|---|---|
| Interview → case-study draft | Claude in session; Koussay approves | `content/projects/<slug>.mjs` | Committed after his sign-off |
| Snapshot of live content and media (one-off, first step) | Claude, read-only against the public site | `content/projects/*.mjs`, `public/projects/<slug>/*` (interim), manifest with relative URLs | Copied from what visitors see today. No Notion token needed |
| Generated art | Claude via **Higgsfield MCP** (`generate_image`); Koussay picks | `media-work/<slug>/art-*.png` (gitignored) plus `provenance.json` | Source file hash |
| Branding (PDF or images) | Koussay drops files in | `media-work/<slug>/branding/` | `pdftoppm -r 150 -png` inside ingest (installed at `/opt/homebrew/bin`) |
| Launch video | Claude via **`brag` / `brag-slim` skill** → local HyperFrames CLI render. The HyperFrames MCP `render_video` is disabled for CLI clients | `media-work/<slug>/launch.mp4` | Source file hash |
| Ingest (the only R2 and manifest writer) | `node scripts/media.mjs ingest ...` | R2 objects plus `content/media.json` | sha8 of output keys, sha256 of source gate, sorted atomic JSON write |
| Verify | `node scripts/media.mjs verify` | stdout and exit code | HEAD, CORS, Range on every manifest URL |
| R2 health | `node scripts/media.mjs check` | `_healthcheck/` object | Existing `--check` logic, moved |

Rules:
- **Skills and MCP produce files on disk. Only the script publishes.** The agent never PUTs to R2 by hand and never hand-edits `content/media.json`.
- **Run `brag` from this repo and point it at the other product's code read-only.** Write its output to `media-work/<slug>/brag/`. Running `/brag` inside `VamosTaxi.eu`, `Invios.online` or `payme` would drop `brag-output/` into another product's tree, which breaks the one-product-per-session and keep-lean rules. Framer sites (Fido, Élysée, Artemis) have no code, so brag works from the live URL and screenshots there. Confidence MEDIUM; confirm the brag input path when that phase starts.
- `scripts/generate-project-media.mjs` (Higgsfield SDK, needs `HF_CREDENTIALS`) is a second route to the same source files. Recommendation: **retire its generation and its manifest writing.** Keep the SigV4 helper (`scripts/lib/r2.mjs`) and fold `--check` into `media.mjs`. The MCP flow lets Koussay see and pick every image before credits are spent on variants, and one writer keeps the manifest consistent. If he wants batch generation later, it should call the same `ingest` library rather than write the manifest itself.
- `media-work/` is gitignored. Its sources are not public, and some of the art is not his to publish until picked.
- `scripts/seed-notion-projects.mjs` is deleted (it seeded the Notion projects DB).

---

## 8. Bookings stay on Notion: what is kept and what goes

Verified by grep: the booking code imports `notion` and `dataSourceId` from `lib/notion/client.js`, `findProp`, `plainText`, `rich`, `textOf` and `dateRangeOf` from `lib/notion/props.js`, and booking env accessors. It imports nothing from `lib/notion/projects.js`, `lib/cms/*`, `lib/media.js`, `lib/pdf.js` or `lib/og-image.js`.

**Keep (bookings):**
- `app/booking/*` (page, CSS, and the OG route, which becomes a static PNG at the R2 step), `app/api/book/{route,availability/route,draft/route}.js`
- `components/book/*`, `lib/book/*`, `lib/mail/booking.js`
- `lib/notion/bookings.js`, `lib/notion/props.js` (prune the project-only helpers `titleOf`, `numberOf`, `checkboxOf`, `selectOf`, `multiSelectOf`, `filesOf`, `coverOf` if lint shows them unused)
- `lib/notion/client.js`: `notion()` and `dataSourceId()` only
- `lib/env.js`: `notionToken`, `notionBookingsDatabaseId`, `notionCalendarDatabaseId`, `resendApiKey`, `resendFrom`, `bookingNotifyEmail`, `openaiApiKey/Model`, `geminiApiKey/Model`, `firecrawlApiKey`, `isNotionBookingsConfigured`, `isResendConfigured`, `isBookingConfigured`
- Dependencies: `@notionhq/client`, `resend`

**Remove from `lib/env.js`:** `notionProjectsDatabaseId`, `notionWebhookSecret`, `isNotionProjectsConfigured`, `higgsfieldKeyId`, `higgsfieldKeySecret`, `isHiggsfieldConfigured`, `r2PublicBase`, `isR2Configured`. Scripts read env through `scripts/lib/load-env.mjs`, and the app needs no R2 env because the manifest holds absolute URLs.

**`.env.example`:** remove `NOTION_PROJECTS_DATABASE_ID` and `NOTION_WEBHOOK_SECRET`. Move `HF_*`, `HIGGSFIELD_*` and `R2_*` under a "scripts only, never set on Vercel" heading. `NOTION_TOKEN` stays (bookings).

---

## 9. Smoke test

**Placement:** `playwright.config.js` and `tests/smoke.spec.js` at the repo root, `@playwright/test` as a devDependency, `"test": "playwright test"` in `package.json`. Ignore `test-results/` and `playwright-report/` in git. There is no CI, so it runs locally before every hand-over and before every ship, as a third gate next to `build` and `lint`. Update the AGENTS.md "There are no tests" line in the same change.

**Server:** `webServer: { command: "npm run build && npm run start -- -p 3417", url: "http://localhost:3417", reuseExistingServer: false, timeout: 240_000 }`. Production server, not `next dev`: dev adds StrictMode double mounts, HMR noise and a different WebGL context lifecycle. Port 3417 is fixed and unused, because this Mac runs several products' dev servers at once. The test only stops the server Playwright started.

**WebGL in headless Chromium:** since Chrome 139, Chrome no longer falls back to SwiftShader automatically, so headless WebGL context creation can fail. Launch with `args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"]`. (Chromium intent-to-remove and Chrome Enterprise policy docs. MEDIUM.)

**Assertions:**
- On every page: collect `console` messages of type `error`, `pageerror`, `requestfailed`, and any response ≥ 400 from the site's origin or the media host. Fail if any are present. This also catches the CORS-tainted atlas (a console error) and an uncaught `play()` rejection.
- `/`: a `canvas` is attached; `canvas.getContext("webgl2")` is non-null and `!isContextLost()`; the loader count reaches 100 and the loader leaves within 20 s.
- Each slug in `getProjects()`, read in the spec from `content/projects/index.mjs`: status 200; the `h1` equals `name`; the hero poster has `naturalWidth > 0`; if the manifest has a video, a `<video>` element exists. **Do not assert playback.** On arm64, Playwright's managed browser may lack H.264 (LOW confidence; the Playwright download paths differ by platform), and the poster contract is what matters.
- Each removed slug (`pixenhouse`, `looma-kitchen`, `almar-private-journey`): status 404.
- One run with `page.emulateMedia({ reducedMotion: "reduce" })` on one project: the video is not playing and the Play button is visible.

**When:** first, against the current tree (Notion unset locally, so the 18 placeholders render). That gives a green baseline, so the cut-over is checked by a test that already passed once.

---

## 10. Build order (the site stays shippable after each step)

| # | Step | Depends on | Ships with no visible change? | Deletes |
|---|---|---|---|---|
| 1 | **Smoke test harness** (section 9) on the current tree | none | Yes (test only) | none |
| 2 | **Content cut-over.** Snapshot the live 8 (copy from the public payload, covers downloaded from the live `/api/media` URLs, Pixenhouse PDF pages taken from the live `g0p<n>` URLs) into `content/projects/*.mjs` and `public/projects/<slug>/*`, with a manifest of relative URLs. Add `lib/content.js`; switch every `getProjects` import; static pages with `dynamicParams=false`; `lib/og-image.js` drops `fetchNotionCover`. Delete the 18 placeholders, `public/1..18.webp` and the placeholder defaults in `Carousel`, `params`, `atlas`, `meta`, `lib/projects.js` | 1 | **Yes.** The same 8 cards and copy, served from the repo | `lib/cms/*`, `CmsLive`, `api/cms-stamp`, `api/revalidate`, `seed-notion-projects.mjs`, `components/ring/projects.js`, `public/1–18.webp`, Notion-projects env accessors |
| 3 | **Proxy and PDF removal** (section 4, step 2). Then Koussay's numbered steps: remove the two Vercel env vars and the Notion webhook | 2 deployed | Yes | `api/media`, `lib/pdf.js`, `lib/media.js`, `lib/notion/{projects,gallery-pdf}.js`, the PDF gallery branch, canvas/pdfjs/unpdf, `serverExternalPackages`, `outputFileTracingIncludes`, the `/api/media/**` local pattern |
| 4 | **R2 live.** (a) Gated human path: move `koussay.online` nameservers to Cloudflare, copying the Vercel apex and every mail/Resend record; create the bucket, CORS policy and custom domain `media.koussay.online`. (b) `scripts/media.mjs` `check`/`ingest`/`verify` writing `content/media.json`. (c) Ingest the snapshot images into R2. (d) App: `remotePatterns`, atlas `crossOrigin`, `crossOrigin` on the preload links, `cell` split in `Carousel`, OG from the `og` rendition, delete the OG routes and `lib/og-image.js`, `sharp` → devDep `^0.35`, delete `public/projects/` | 3; DNS is the long pole | Yes (same pictures, new host) | `public/projects/*`, `lib/og-image.js`, `app/**/opengraph-image.js`, `twitter-image.js`, runtime `sharp`, `generate-project-media.mjs` generation path |
| 5 | **Real content and the 8-card set.** Interviews, approved copy for all 8, `prelaunch` state for Payme, Higgsfield art and branding through ingest, slug changes (3 out, 3 in), ring check at 8 in every band (section 5) | 4 (media must go to R2, not `public/`) | No. This is the content release. Can ship per project because the count stays 8 | The three old projects' content and manifest entries (R2 objects can stay) |
| 6 | **Launch-video hero.** `HeroVideo` lands first. It renders nothing extra for projects without a manifest `video`, so it ships with one video. Then brag → ingest per project; the poster replaces the Higgsfield ring still | 4 for hosting; 5 for final copy (not strictly needed) | The component ships invisibly; each video is a visible change | none |
| 7 | **Hygiene** (in parallel worktrees from step 3 onward): free-face heading and delete PP Neue Montreal, README/LICENSE credit, reduced-motion entry, arrow/Home/End keys, prettier on the whole tree, AGENTS.md layout and gaps, dead files (`TwoPlaneMorph.jsx`, `shader`) | 2 (AGENTS.md must describe the new tree) | Mostly yes | the listed files |

**Why this order:**
- **Content before R2.** The R2 custom domain is blocked on a nameserver move that also carries email DNS. That is a gated human step with real risk, and it should not hold up removing Notion. A `public/` snapshot unblocks the cut-over today, and the git cost is modest (8 covers plus a few PDF pages of Koussay's own work, about 1–2 MB in history).
- **The proxy goes one deploy after the cut-over**, so cached HTML that still points at `/api/media` keeps resolving while it expires.
- **R2 before real media.** Generated art and videos should go straight to their final immutable home, not pass through `public/` and git history.
- **The video component before the videos.** It is inert without a manifest entry, so it can be reviewed and shipped on its own. Every later video is then data only.
- **The smoke test first**, so every later step has a gate that has already passed once.

**Suggested phase grouping for the roadmap:** Phase A = steps 1–3 (Notion projects out, repo content, no visible change). Phase B = step 4 (R2 and delivery; needs a research flag for DNS migration and CORS at the edge). Phase C = step 5 (content and art; mostly human-in-the-loop). Phase D = step 6 (video). Phase E = step 7 (hygiene, can run in parallel).

---

## Anti-patterns to avoid

1. **Content holding R2 URLs.** The pipeline would end up rewriting files Koussay approved. Reference slots by name and resolve them through the manifest.
2. **Importing `content/` from client code or from `lib/projects.js`.** Case-study prose for all 8 projects would ship in the client JS. Only the server-only `lib/content.js` imports `content/`.
3. **Keeping a runtime fallback list "just in case".** The 18-placeholder fallback caused the worst incident in this codebase (a cached placeholder list replaced the live set). With static content there is nothing to fall back from. A broken reference fails the build.
4. **R2 URLs in the atlas without `crossOrigin`.** The canvas is tainted, the texture upload throws, and the ring shows black cells.
5. **Changing `ringRefCount` to "match" 8.** See section 5. It changes spacing, the facing-card position and the wheel feel all at once.
6. **Autoplaying the video under the flyer.** The first decoded frame pops through mid-flight and fights the landing. Wait for `finish()`.
7. **Running `/brag` inside another product's repo.** It leaves output in that tree. Run it here with the other repo as read-only input.
8. **A second manifest writer** (an SDK script and a hand edit). Two writers drift. `scripts/media.mjs` is the only one.

## Scaling considerations

| Concern | Now (8 projects) | Up to `MAX_PLANES` (32) | Beyond |
|---|---|---|---|
| Content | Static modules, rebuild on edit | Same. The build validates everything | Out of scope (uniform budget caps it) |
| Media bandwidth | R2 egress is free; immutable edge cache | Same | Same |
| Image optimisation | A few hundred transforms a month | About 1K a month | Consider pre-sized `srcset` renditions with `unoptimized` |
| Video | One 1080p MP4 per project, `preload="none"` | Same | Add a 720p `<source media>` rendition if mobile data matters |

## Sources

- Codebase: `.planning/codebase/{ARCHITECTURE,STRUCTURE,INTEGRATIONS}.md`, `AGENTS.md`, and the files read for this note (`lib/cms/projects.js`, `lib/projects.js`, `lib/media.js`, `lib/og-image.js`, `lib/project/warm.js`, `lib/notion/client.js`, `lib/env.js`, `app/page.js`, `app/project/[slug]/page.js`, `components/{HomeRing,SharedTransitionProvider,Carousel}.jsx`, `components/ring/{utils,params,atlas}.js`, `components/project/{ProjectMedia,ProjectGallery}.jsx`, `scripts/generate-project-media.mjs`, `next.config.mjs`). HIGH.
- Live check: https://koussay.online RSC payload and `dig NS koussay.online`, 2026-10-03. HIGH.
- Next.js 16.3.8 bundled docs: `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md` (remotePatterns, localPatterns, minimumCacheTTL, qualities), `.../04-functions/unstable_cache.md` (replaced by `use cache`), `.../02-route-segment-config/dynamicParams.md`, `.../03-file-conventions/01-metadata/opengraph-image.md`, `.../04-functions/image-response.md`, `01-getting-started/05-server-and-client-components.md` (server-only). HIGH.
- [Cloudflare R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/): the custom domain must be a Cloudflare zone in the same account; r2.dev is for development only. HIGH.
- [Cloudflare R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/): policy shape; cached objects need a purge after a CORS change; no CORS headers without `Origin`. HIGH for those points; edge `Vary` behaviour LOW.
- [Vercel Image Optimization limits and pricing](https://vercel.com/docs/image-optimization/limits-and-pricing) (updated 2026-08-11): Hobby includes 5K transformations a month; a transform is billed on MISS or STALE. HIGH.
- [Satori WebP workaround](https://hy2k.dev/en/blog/2025/10-22-satori-webp-workaround/), [Next.js ImageResponse](https://nextjs.org/docs/app/api-reference/functions/image-response): Satori does not decode WebP. MEDIUM.
- [Chromium: remove SwiftShader WebGL fallback](https://issues.chromium.org/issues/40277080), [Intent to Remove](https://groups.google.com/a/chromium.org/g/blink-dev/c/yhFguWS_3pM), [EnableUnsafeSwiftShader policy](https://chromeenterprise.google/policies/enable-unsafe-swift-shader/): `--enable-unsafe-swiftshader` is needed for headless WebGL. MEDIUM.
- [Chrome for Testing vs Chromium in Playwright](https://qaskills.sh/blog/chrome-for-testing-vs-chromium-playwright), [chromium is not chrome](https://github.com/feder-cr/invisible_playwright/wiki/chromium-is-not-chrome): codec support differs by platform. LOW.
- `~/.claude/skills/brag/SKILL.md`: output in `brag-output/` of the current project, 16:9 landscape by default, HyperFrames render to `<output-dir>/brag.mp4`. HIGH for the skill's behaviour.
