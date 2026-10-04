<!-- refreshed: 2026-10-02 -->
# Architecture

**Analysis Date:** 2026-10-02

The WebGL ring itself (coordinate systems, ring slot vs plane index, the `g` stage scale, responsive bands, packed `uScale`, context release) is documented authoritatively in `AGENTS.md`. This file does not repeat it. It covers everything around the ring: persistent shell, content resolution, routes, the media proxy, and the authoring-time generation path.

Two corrections to `AGENTS.md`:
- "Known gaps" item 1 (clicking a card opens nothing) is stale. Navigation exists: `openForPlane()` in `components/Carousel.jsx` (~line 791) runs the shared-element flyer, then `router.push('/project/<slug>')`.
- `Carousel.jsx` is ~2160 lines, not ~1400.

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Root layout (server)  `app/layout.js`  -> `app/providers.js` (client)  │
│ SharedTransition > SmoothScroll(Lenis) > ProjectPager > HomeRing       │
│   `components/HomeRing.jsx`  (persistent <Carousel/>, parked off-home) │
│   `components/CmsLive.jsx`   (20s poll of /api/cms-stamp)              │
└───────────────┬───────────────────┬──────────────────┬───────────────┘
                │ children          │                   │
                ▼                   ▼                   ▼
   `app/page.js` (ring)   `app/project/[slug]/page.js`   `app/booking/page.js`
   revalidate 60          SSG + revalidate 60            BookFlow (client)
                          + dynamicParams                `/api/book/*`
                │                   │
                └─────────┬─────────┘
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Content resolution  `lib/content.js` getProjects()                    │
│  content/projects + content/media.json, resolved at build, no fallback │
└───────────────┬──────────────────────────────────────────────────────┘
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Notion adapter  `lib/notion/projects.js`  unstable_cache tag "projects"│
│ `lib/notion/client.js`  `lib/notion/props.js`  `lib/notion/gallery-pdf.js`│
└───────────────┬──────────────────────────────────────────────────────┘
                ▼ project.file = /api/media/<pageId>[/<slot>]?v=<version>
┌──────────────────────────────────────────────────────────────────────┐
│ Media proxy `app/api/media/[...parts]/route.js`                       │
│  Notion signed URL -> fetch -> PDF? `lib/pdf.js` -> sharp -> immutable │
└──────────────────────────────────────────────────────────────────────┘

Authoring time only (not imported by app/):
 `scripts/media.mjs` + `scripts/lib/*`
   content/projects/*.mjs -> Higgsfield
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Root layout | Metadata, site-wide JSON-LD, `<Providers>`, SpeedInsights | `app/layout.js` |
| Providers | Nests the four client providers and `CmsLive` | `app/providers.js` |
| HomeRingProvider | Owns the one persistent `<Carousel/>`; parks/covers it by pathname | `components/HomeRing.jsx` |
| RegisterHome | Server pages hand their `projects` list to the ring via context | `components/HomeRing.jsx` |
| Carousel | WebGL ring, input, spin physics, entry timeline, card click -> navigation | `components/Carousel.jsx` |
| Ring modules | params, atlas, meta lockups, intro text, cursor tag, dev GUI | `components/ring/*.js` |
| Shaders | Ring SDF fragment shader, glyph reveal | `components/shaders/planeShaders.js`, `components/shaders/textShaders.js` |
| SharedTransitionProvider | Card-to-hero flyer animation between ring and project page | `components/SharedTransitionProvider.jsx` |
| ProjectPagerProvider | Prev/next slide transition between project pages | `components/project/ProjectPagerTransition.jsx` |
| SmoothScroll | Lenis smooth scroll wrapper | `components/SmoothScroll.jsx` |
| CmsLive | Polls stamp; `router.refresh()` when Notion changed | `components/CmsLive.jsx` |
| getProjects | Single content entry point, synchronous, throws at build on bad content | `lib/content.js`, `lib/content-schema.mjs` |
| Notion project adapter | Query DB, map pages, slug/version/media map, caches | `lib/notion/projects.js` |
| bustProjectsCache | Tag + path invalidation | `lib/cms/bust.js` |
| Project helpers | Pure list/slug/neighbour/alt-text helpers, `indexProjects` | `lib/projects.js` |
| Media slot grammar | `cover`, `g<n>`, `g<n>p<n>` parsing | `lib/media.js` |
| Media proxy | Fetch, PDF render, compress, cache headers | `app/api/media/[...parts]/route.js` |
| PDF rendering | unpdf + pdfjs legacy + @napi-rs/canvas, per-instance byte cache | `lib/pdf.js` |
| PDF gallery expansion | Expands a PDF gallery item to one item per page at SSR | `lib/notion/gallery-pdf.js` |
| SEO | JSON-LD graph builders, share-image helpers | `lib/seo.js`, `lib/site.js` |
| OG image | sharp-composited 1200x630 from cover | `lib/og-image.js` |
| Booking | Notion calendar booking, Resend email, optional AI research | `lib/book/*`, `lib/notion/bookings.js`, `lib/mail/booking.js`, `app/api/book/*` |
| Env accessors | Trimmed env getters and `is*Configured()` predicates | `lib/env.js` |
| Media | Authoring CLI: check, import-live, verify, generate; only writer of `content/media.json` | `scripts/media.mjs`, `scripts/lib/*` |

## Pattern Overview

**Overall:** Next.js 16 App Router single-page experience. A client-side WebGL shell that never unmounts, with server components feeding it data, backed by Notion as a headless CMS and a proxy route that turns Notion's expiring file URLs into stable, immutable-cached image URLs.

**Key Characteristics:**
- The ring is mounted once in the root layout tree (`HomeRingProvider`) and survives navigation. On `/project/*` it is parked (`home-ring--parked`) rather than unmounted, so returning to `/` does not re-run the entry or rebuild the atlas.
- Server pages are thin: they call `getProjects()` and pass data down. `RegisterHome` is the bridge that lets a server page feed the persistent client ring (`setProjects`, deduped by `ringKey`).
- All Notion access is time-boxed and rate-limit-aware (4s timeout, `retry: false`, cached data source id, cached stamp).
- Project content is repo modules resolved at build; there is no placeholder fallback and no content cache.
- Plain JavaScript (JSX), no TypeScript, one Playwright smoke test. Import alias `@/*` -> repo root (`jsconfig.json`).

## Layers

**Shell / providers (client):**
- Purpose: Persistent ring, transitions, smooth scroll, CMS polling.
- Location: `app/providers.js`, `components/HomeRing.jsx`, `components/SharedTransitionProvider.jsx`, `components/project/ProjectPagerTransition.jsx`, `components/SmoothScroll.jsx`, `components/CmsLive.jsx`, `components/homeRingContext.js`
- Depends on: `lib/projects.js`, `lib/project/warm.js`
- Used by: every route (via `app/layout.js`)

**Routes (server):**
- Purpose: Data fetching, metadata, JSON-LD, then render client components.
- Location: `app/page.js`, `app/project/[slug]/page.js`, `app/booking/page.js`, `app/sitemap.js`, `app/robots.js`, `app/llms.txt/route.js`, `app/**/opengraph-image.js`, `app/**/twitter-image.js`
- Depends on: `lib/content.js`, `lib/seo.js`

**Content (server):**
- Purpose: Resolve "the list of projects" from `content/projects` joined with `content/media.json`. The Notion project files listed here are unreferenced by pages and removed in Phase 3.
- Location: `lib/content.js`, `lib/content-schema.mjs`, `content/projects/`, `content/media.json`, `lib/cms/bust.js` (legacy), `lib/notion/projects.js` (legacy)
- Depends on: `content/projects/index.mjs`, `content/media.json`, `lib/projects.js`, `components/shaders/planeShaders.js` (`MAX_PLANES`)

**Media (server):**
- Purpose: Turn a Notion file reference into a deliverable image.
- Location: `app/api/media/[...parts]/route.js`, `lib/media.js`, `lib/pdf.js`, `lib/og-image.js`
- Depends on: `sharp`, `unpdf`, `pdfjs-dist`, `@napi-rs/canvas`

**Ring (client, WebGL):**
- Purpose: See `AGENTS.md`.
- Location: `components/Carousel.jsx`, `components/ring/`, `components/shaders/`

**Authoring (Node scripts):**
- Purpose: Generate art, upload to R2. Standalone ESM `.mjs`, own env loader.
- Location: `scripts/`

## Data Flow

### Content resolution (`getProjects`, `lib/content.js`)

`lib/content.js` joins the project modules in `content/projects/` (ordered by `ORDER` in `content/projects/index.mjs`) with `content/media.json` through `lib/content-schema.mjs`, runs `indexProjects` (caps at `MAX_PLANES`, stamps `index`) and exposes a synchronous `getProjects()` and `getProject(slug)`. Resolution happens at module evaluation, so a missing key or unknown media throws at build and names the slug and field. `node scripts/check-content.mjs` is the sub-second gate. No fallback list exists. The Notion path below is unreferenced by pages and removed in Phase 3; `/api/cms-stamp` answers a constant empty stamp.

Legacy Notion mapping (`mapPage` in `lib/notion/projects.js`, unreferenced by pages, removed in Phase 3):
- Rows without a title, with `Published` unchecked, or with no cover are dropped.
- Sorted by `Order`/`Ring` number then name, sliced to `MAX_PLANES`.
- Slug: `Slug` property or title, slugified, deduped with `-2`, `-3` suffixes (`uniqueSlug`).
- `project.file` and each `detail.gallery[].file` are `/api/media/<pageIdNoDashes>[/<slot>]?v=<last_edited_time>-<sha1(url sans query)[:8]>`. The `v` token busts browser/CDN caches on edit.
- The bundle also carries `media`: a map `"<pageId>:<slot>" -> signed Notion URL`, used by the proxy to avoid one `pages.retrieve` per cover.

### Freshness / invalidation

1. Notion webhook `POST /api/revalidate` (`app/api/revalidate/route.js`) verifies `x-notion-signature` with `NOTION_WEBHOOK_SECRET`, then `bustProjectsCache()`. `GET ?secret=` does the same by hand.
2. `bustProjectsCache()` (`lib/cms/bust.js`): `revalidateTag("projects", { expire: 0 })`, `revalidatePath("/")`, `revalidatePath("/project", "layout")`, `revalidatePath("/api/media", "layout")`.
3. Fallback when webhooks do not fire: `components/CmsLive.jsx` polls `/api/cms-stamp` every 20s. The route (`app/api/cms-stamp/route.js`) reads `cachedProjectsStamp` (`unstable_cache`, 20s) and compares to `bundle.stamp`; a newer stamp triggers `bustProjectsCache()`. The client calls `router.refresh()` when the stamp string changes.
4. Pages also use time-based ISR: `revalidate = 60` on `app/page.js`, `app/project/[slug]/page.js`, `app/llms.txt/route.js`, OG image routes.

### Primary request path: ring (`/`)

1. `app/page.js` awaits `getProjects()`, emits `<link rel="preload">` for the first three covers, JSON-LD `projectListSchema`, and `<RegisterHome projects>`.
2. `RegisterHome` calls `home.setProjects(projects)` in a layout effect (`components/HomeRing.jsx`). `HomeRingProvider` stores them and renders `<Carousel projects active resumeSlug/>`. Until then `app/loading.js` shows `ChargingMark` (only on `/` and only while `home.ready` is false).
3. `Carousel` builds the atlas (`components/ring/atlas.js`) by loading each `project.file` via `new Image()` (12s timeout per image, fan order from the seed outward), then runs the entry timeline.
4. Card click -> `openForPlane` -> `warmProject` (prefetch route + decode images, `lib/project/warm.js`) for the project and its neighbours -> `SharedTransitionProvider.start` flyer -> `router.push`.

### Project page (`/project/[slug]`)

1. `generateStaticParams` returns a slug per project from `getProjects()` (empty array on error). `dynamicParams = true`, `revalidate = 60`: unknown slugs render on demand, new Notion projects work without a redeploy.
2. `generateMetadata` and the page both call `getProjects()` (React-cached, one fetch per request), then `getProjectBySlug`; no match -> `notFound()` (`app/project/[slug]/not-found.js`).
3. `withExpandedPdfGallery(project)` (`lib/notion/gallery-pdf.js`): for gallery items that are PDFs, fetch bytes (cached signed URL from the bundle, else live `notionMediaUrl`), count pages, and replace the item with one entry per page whose slot is rewritten `g<n>` -> `g<n>p<page>`.
4. Renders `<RegisterHome projects>` (so the parked ring has data on direct entry) and `ProjectDetail` (`components/project/ProjectDetail.jsx`) with previous/next from `getProjectNavigation`.
5. `/work/:slug` and `/book*` redirect permanently (`next.config.mjs`).

### Media request path (`/api/media/<id>[/<slot>]?v=...`)

Route: `app/api/media/[...parts]/route.js` (`runtime = "nodejs"`, `maxDuration = 30`).

1. Parse: first part is the page id (non-hex stripped, must be >= 32 hex chars, re-dashed); second is the slot (default `cover`). `lib/media.js` `parseMediaSlot` grammar: `cover` | `g<n>` (gallery file n, page 1) | `g<n>p<m>` (page m of PDF gallery file n). `lookup` is the `cover`/`g<n>` key into the bundle media map.
2. Resolve URL: `cachedNotionMediaUrl(pageId, slot, version)` first reads `bundle.media`; uses it unless the `v` fingerprint disagrees with the cached URL's sha1 (a replaced file), then falls back to live `notionMediaUrl` (`pages.retrieve`). Notion signed URLs expire in about an hour.
3. Fetch with `cache: "no-store"` and 20s timeout. Never let the fetch cache: a cached 403 left the ring on black cells. On 403/404, re-resolve live once and retry.
4. PDF detection: `isPdfBytes` (content-type or `%PDF-` magic). `?pages=1` returns `{ pages }` JSON (`pdfPageCount`, capped at `MAX_PDF_PAGES = 48`). Otherwise `renderPdfPage` renders page `m` to a PNG at 1600px wide. Raw PDF bytes are kept in a per-instance 6-entry `Map` (`rememberPdfBytes`/`peekPdfBytes`) keyed by URL sans query.
5. Compress: `sharp(...).rotate().resize(1600,1600,inside,withoutEnlargement).webp({quality:80})`; GIFs pass through; sharp failure returns the original bytes. A PDF that survives to this point is refused (404).
6. Respond: `Cache-Control: public, max-age=31536000, immutable` only if `?v=` is present, else `no-store`. `Access-Control-Allow-Origin: *`. `HEAD` delegates to `GET`.

The function-running cost is paid once per version; the versioned `Cache-Control` is what stops repeat invocations. `next.config.mjs` `images.localPatterns` allows `/api/media/**` with query strings (needed for `?v=`), and `outputFileTracingIncludes` force-includes `@napi-rs/canvas` platform binaries, `pdfjs-dist` and `unpdf` for `/api/media/**` and `/project/**` (Vercel trace would otherwise drop them).

### Generated routes

- `app/sitemap.js`: home, booking, one entry per project (`lastModified` from `project.updatedAt`).
- `app/robots.js`: allows `/`, disallows `/api/book`, `/api/revalidate`, `/api/cms-stamp`.
- `app/llms.txt/route.js`: plain-text project index, `revalidate = 60`.
- `app/opengraph-image.js`, `app/project/[slug]/opengraph-image.js`, `app/booking/opengraph-image.js` (+ `twitter-image.js` re-exports): `lib/og-image.js` `ogImageResponse(project)` prefers the Notion cover (`cachedNotionMediaUrl` then fetch), falls back to a local `public/` file, then `public/logo.png`.

### Booking

`app/booking/page.js` renders client `BookFlow`. `POST /api/book` (`app/api/book/route.js`, `maxDuration = 60`) validates (`lib/book/validate.js`), claims a slot (`lib/book/time.js`), writes a Notion calendar page (`lib/notion/bookings.js`), emails via Resend (`lib/mail/booking.js`), and runs optional Firecrawl/Gemini/OpenAI research after the response via `after()` (`lib/book/research.js`). `GET /api/book/availability` and `/api/book/draft` support the flow. Independent of the project/ring pipeline except for sharing `lib/notion/client.js` and `lib/env.js`.

### Authoring-time side path: media (`scripts/media.mjs`)

`scripts/media.mjs` is run by hand (`node scripts/media.mjs check | import-live | verify | generate`). It is the only writer of `content/media.json` and of R2 objects under `projects/`.

1. Loads env itself (`scripts/lib/load-env.mjs`), not through `lib/env.js`.
2. Dynamically imports the project list from `content/projects/index.mjs`.
3. For each slot not already in `content/media.json` (or with `--force`): build a prompt (`scripts/lib/art-direction.mjs`), call Higgsfield through `@higgsfield/client/v2` (`scripts/lib/higgsfield.mjs`), download the result.
4. `sharp` produces two WebP renditions: `cell` (512x341, the atlas cell ratio) and `cover` (1536x1024).
5. Upload to Cloudflare R2 with content-addressed keys `projects/<slug>/cell-<sha8>.webp`, `cover-<sha8>.webp`, `loop-<sha8>.mp4` and `Cache-Control: public, max-age=31536000, immutable` via a hand-rolled SigV4 signer (`scripts/lib/r2.mjs`, no AWS SDK).
6. Record request id, prompt, keys and URLs in the manifest and write it after every project.

Modes: `--probe` (one 720p image to `.media-probe/`, no R2, no manifest), `--check` (PUT/HEAD/public GET of `_healthcheck/<ts>.txt`), `--dry-run` (prompts and keys only), `--only=<slug,...>`, `--limit=N`, `--direction=`, `--video`, `--force`.

Deliberate isolation: nothing under `app/`, `components/` or `lib/` imports `scripts/`. A visitor cannot trigger a generation (money, tens of seconds). `lib/env.js` defines `r2PublicBase()`, `isR2Configured()`, `higgsfieldKeyId()`, `isHiggsfieldConfigured()` but no app code calls them yet, and nothing connects R2 URLs to the Notion Cover column or `project.file`. If R2 URLs are later served through `next/image`, `next.config.mjs` needs `images.remotePatterns` (only `localPatterns` exist). The earlier Notion seed script was removed in Phase 1 and remains in git history.

**State Management:**
- Server: none for projects (resolved once at module evaluation). Legacy Notion path, removed in Phase 3: `unstable_cache` (tag `projects`) and a PDF byte map per instance.
- Client: ring state is closure variables inside the `Carousel` effect (see `AGENTS.md`); app-level state is React context (`HomeRingContext`, shared transition, pager).

## Key Abstractions

**Project record:**
- Purpose: Shape shared by the ring, detail pages and SEO.
- Fields: `slug`, `name`, `type`, `year`, `liveUrl`, `order`, `file`, `index` (added by `indexProjects`), `detail { summary, overview, challenge, outcome, gallery[], testimonial{quote,author,role}, tools[] }`. Media URLs are https://media.koussay.online/projects/<slug>/<slot>-<sha8>.webp.
- Examples: `content/projects/<slug>.mjs`, resolved by `lib/content-schema.mjs`.
- Pattern: slug is identity; ring order is `index`. Slugs survive reorders.

**Media slot:**
- Purpose: Address a file inside a Notion page: `cover`, `g<n>`, `g<n>p<m>`.
- Examples: `lib/media.js`, `lib/notion/gallery-pdf.js` (legacy, unreferenced by pages, removed in Phase 3).

**Home ring context:**
- Purpose: `{ setProjects, prepareHome, ready }` between server pages, `Carousel` and back-navigation.
- Examples: `components/homeRingContext.js`, `components/HomeRing.jsx`.

## Entry Points

**`app/layout.js`:**
- Triggers: every request. Mounts `Providers` and global JSON-LD.

**`app/page.js`:**
- Triggers: `/`. Reads projects from `lib/content.js`, preloads covers, registers with the ring.

**`app/project/[slug]/page.js`:**
- Triggers: `/project/*`. ISR + on-demand params.

**`app/api/media/[...parts]/route.js`:**
- Triggers: `<img>`/`next/image`/atlas loads of any `project.file` or gallery file.

**`app/api/revalidate/route.js`, `app/api/cms-stamp/route.js`:**
- Triggers: Notion webhook; `CmsLive` poll.

**`scripts/media.mjs`:**
- Triggers: manual CLI runs only.

## Architectural Constraints

- **Threading:** Single-threaded browser main thread; the ring runs one `requestAnimationFrame` layout loop (see `AGENTS.md`). Server routes are stateless lambdas; per-instance module state (PDF byte cache and Notion client in the legacy path, removed in Phase 3) is best-effort.
- **Global state:** `lib/pdf.js` `byteCache` and `pdfjsReady` and `lib/notion/client.js` `client` (legacy, removed in Phase 3); `lib/project/warm.js` `retained` and `warmedRoutes` (client). In the ring, closure state inside `Carousel.jsx` (see `AGENTS.md`).
- **Circular imports:** None detected. Note the unusual direction `lib/projects.js` and `lib/content.js` import `MAX_PLANES` from `components/shaders/planeShaders.js`, so server code depends on a shader module (the GLSL string is bundled with it).
- **Project count:** capped at `MAX_PLANES` (packed uniform budget, `AGENTS.md`). Ring radius follows count (`radiusForCount` in `components/ring/utils.js`).
- **Notion rate limits:** `retry: false`, 4s timeout; avoid per-cover `pages.retrieve` fan-out and sub-20s polling.
- **Vercel vs Docker:** `output: "standalone"` is set only when `VERCEL !== "1"` (`next.config.mjs`, `Dockerfile`, `compose.yaml`).
- **Runtime:** Media, OG, booking, revalidate and cms-stamp routes pin `runtime = "nodejs"` (sharp, canvas, Notion client).

## Anti-Patterns

### Reintroducing a fallback list (resolved in Phase 2, removed files remain in git history)

**What happens:** The old `lib/cms/projects.js` fallback returned 18 placeholders from inside `unstable_cache`. Resolved in Phase 2: that module and the placeholder list are removed and remain in git history.
**Why it's wrong:** It replaced the live set until the cache expired.
**Do this instead:** Keep projects in `content/projects`; `lib/content.js` throws at build on a defect, so no partial or placeholder list can ship.

### Caching the upstream media fetch

**What happens:** Letting `fetch` cache the signed Notion URL response.
**Why it's wrong:** URLs expire in about an hour; a cached 403 leaves blank cells.
**Do this instead:** Keep `cache: "no-store"` in `fetchFile` (`app/api/media/[...parts]/route.js`) and rely on the `?v=` immutable response header.

### Exposing generation to the app

**What happens:** Importing `scripts/lib/higgsfield.mjs` or wiring a generate action into a route/server action.
**Why it's wrong:** Each call costs credits and runs for tens of seconds; any visitor could trigger it.
**Do this instead:** Keep generation a manual CLI gated by `content/media.json`; consume results only as already-uploaded R2 URLs.

### Remounting the ring per route

**What happens:** Rendering `<Carousel/>` from a page.
**Why it's wrong:** WebGL context churn and a replayed entry (see context-release note in `AGENTS.md`).
**Do this instead:** Feed it through `RegisterHome` and the single `HomeRingProvider`.

## Error Handling

**Strategy:** Degrade to the last good data, never throw to the user; log with a bracketed prefix.

**Patterns:**
- Content: `lib/content.js` throws at build on a missing key or unknown media; pages call `getProjects()` directly. `sitemap` and `llms.txt` read the same list.
- Media: any failure returns `404` with `Cache-Control: no-store`; logs `[media]`.
- Client: atlas image failure leaves a blank cell and still counts toward load (`components/ring/atlas.js`); `CmsLive` swallows poll errors.
- Cost control in scripts: per-project try/catch, non-zero exit if any failed, manifest written after each success.

## Cross-Cutting Concerns

**Logging:** `console.warn`/`console.error` with `[area]` prefixes (`[projects]`, `[media]`, `[cms-stamp]`); `removeConsole` strips all but `error` in production (`next.config.mjs`).
**Validation:** Booking in `lib/book/validate.js`; media ids sanitized in the proxy; webhook signature in `app/api/revalidate/route.js`.
**Authentication:** None for visitors. Notion integration token and webhook secret via `lib/env.js`; R2/Higgsfield keys live in `.env.local` (present, not read) and are used by `scripts/` only.

---

*Architecture analysis: 2026-10-02*
