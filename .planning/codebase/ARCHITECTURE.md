<!-- refreshed: 2026-10-02 -->
# Architecture

**Analysis Date:** 2026-10-02

The WebGL ring itself (coordinate systems, ring slot vs plane index, the `g` stage scale, responsive bands, packed `uScale`, context release) is documented authoritatively in `AGENTS.md`. This file does not repeat it. It covers everything around the ring: persistent shell, content resolution, routes, share images, and the authoring-time generation path.

Two corrections to `AGENTS.md`:
- "Known gaps" item 1 (clicking a card opens nothing) is stale. Navigation exists: `openForPlane()` in `components/Carousel.jsx` (~line 791) runs the shared-element flyer, then `router.push('/project/<slug>')`.
- `Carousel.jsx` is ~2160 lines, not ~1400.

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Root layout (server)  `app/layout.js`  -> `app/providers.js` (client)  │
│ SharedTransition > SmoothScroll(Lenis) > ProjectPager > HomeRing       │
│   `components/HomeRing.jsx`  (persistent <Carousel/>, parked off-home) │
└───────────────┬───────────────────┬──────────────────┬───────────────┘
                │ children          │                   │
                ▼                   ▼                   ▼
   `app/page.js` (ring)   `app/project/[slug]/page.js`   `app/booking/page.js`
   static                 SSG, dynamicParams = false     BookFlow (client)
                                                         `/api/book/*`
                │                   │
                └─────────┬─────────┘
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Content resolution  `lib/content.js` getProjects()                    │
│  content/projects + content/media.json, resolved at build, no fallback │
│  images and share cards: https://media.koussay.online (R2, static)    │
└──────────────────────────────────────────────────────────────────────┘

Authoring time only (not imported by app/):
 `scripts/media.mjs` + `scripts/lib/*`
   content/projects/*.mjs -> Higgsfield; share -> sharp + fontkit -> R2

Notion is used only by bookings: `lib/notion/{client,bookings,props}.js`.
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Root layout | Metadata, site-wide JSON-LD, `<Providers>`, SpeedInsights | `app/layout.js` |
| Providers | Nests the four client providers | `app/providers.js` |
| HomeRingProvider | Owns the one persistent `<Carousel/>`; parks/covers it by pathname | `components/HomeRing.jsx` |
| RegisterHome | Server pages hand their `projects` list to the ring via context | `components/HomeRing.jsx` |
| Carousel | WebGL ring, input, spin physics, entry timeline, card click -> navigation | `components/Carousel.jsx` |
| Ring modules | params, atlas, meta lockups, intro text, cursor tag, dev GUI | `components/ring/*.js` |
| Shaders | Ring SDF fragment shader, glyph reveal | `components/shaders/planeShaders.js`, `components/shaders/textShaders.js` |
| SharedTransitionProvider | Card-to-hero flyer animation between ring and project page | `components/SharedTransitionProvider.jsx` |
| ProjectPagerProvider | Prev/next slide transition between project pages | `components/project/ProjectPagerTransition.jsx` |
| SmoothScroll | Lenis smooth scroll wrapper | `components/SmoothScroll.jsx` |
| getProjects | Single content entry point, synchronous, throws at build on bad content | `lib/content.js`, `lib/content-schema.mjs` |
| Project helpers | Pure list/slug/neighbour/alt-text helpers, `indexProjects` | `lib/projects.js` |
| SEO | JSON-LD graph builders, share-image helpers | `lib/seo.js`, `lib/site.js` |
| Share cards | 1200x630 JPEG text and inputs hash (pure, shared by script and build check) | `lib/share.mjs`, `scripts/lib/share.mjs` |
| Booking | Notion calendar booking, Resend email, optional AI research | `lib/book/*`, `lib/notion/{client,bookings,props}.js`, `lib/mail/booking.js`, `app/api/book/*` |
| Env accessors | Trimmed env getters and `is*Configured()` predicates | `lib/env.js` |
| Media | Authoring CLI: check, verify, generate, share; only writer of `content/media.json` | `scripts/media.mjs`, `scripts/lib/*` |

## Pattern Overview

**Overall:** Next.js 16 App Router single-page experience. A client-side WebGL shell that never unmounts, with server components feeding it data, with project content in the repo and every image and share card a static, content-addressed file on Cloudflare R2. Notion is used only for bookings and blocked time.

**Key Characteristics:**
- The ring is mounted once in the root layout tree (`HomeRingProvider`) and survives navigation. On `/project/*` it is parked (`home-ring--parked`) rather than unmounted, so returning to `/` does not re-run the entry or rebuild the atlas.
- Server pages are thin: they call `getProjects()` and pass data down. `RegisterHome` is the bridge that lets a server page feed the persistent client ring (`setProjects`, deduped by `ringKey`).
- All Notion access (bookings only) is time-boxed (4s timeout, `retry: false`, cached data source id).
- Project content is repo modules resolved at build; there is no placeholder fallback and no content cache.
- Plain JavaScript (JSX), no TypeScript, one Playwright smoke test. Import alias `@/*` -> repo root (`jsconfig.json`).

## Layers

**Shell / providers (client):**
- Purpose: Persistent ring, transitions, smooth scroll.
- Location: `app/providers.js`, `components/HomeRing.jsx`, `components/SharedTransitionProvider.jsx`, `components/project/ProjectPagerTransition.jsx`, `components/SmoothScroll.jsx`, `components/homeRingContext.js`
- Depends on: `lib/projects.js`, `lib/project/warm.js`
- Used by: every route (via `app/layout.js`)

**Routes (server):**
- Purpose: Data fetching, metadata, JSON-LD, then render client components.
- Location: `app/page.js`, `app/project/[slug]/page.js`, `app/booking/page.js`, `app/sitemap.js`, `app/robots.js`, `app/llms.txt/route.js`, `app/booking/opengraph-image.png`
- Depends on: `lib/content.js`, `lib/seo.js`

**Content (server):**
- Purpose: Resolve "the list of projects" from `content/projects` joined with `content/media.json`.
- Location: `lib/content.js`, `lib/content-schema.mjs`, `content/projects/`, `content/media.json`
- Depends on: `content/projects/index.mjs`, `content/media.json`, `lib/projects.js`, `components/shaders/planeShaders.js` (`MAX_PLANES`)

**Share images (static):**
- Purpose: Every share image is a file rendered at authoring time and served from R2 (or, for `/booking`, a committed PNG). No image library runs at request time.
- Location: `scripts/media.mjs share`, `scripts/lib/share.mjs`, `lib/share.mjs`, `lib/content-schema.mjs` (build check), `app/booking/opengraph-image.png`
- Depends on: `sharp`, `fontkit`, `geist` (devDependencies, scripts only)

**Ring (client, WebGL):**
- Purpose: See `AGENTS.md`.
- Location: `components/Carousel.jsx`, `components/ring/`, `components/shaders/`

**Authoring (Node scripts):**
- Purpose: Generate art, upload to R2. Standalone ESM `.mjs`, own env loader.
- Location: `scripts/`

## Data Flow

### Content resolution (`getProjects`, `lib/content.js`)

`lib/content.js` joins the project modules in `content/projects/` (ordered by `ORDER` in `content/projects/index.mjs`) with `content/media.json` through `lib/content-schema.mjs`, runs `indexProjects` (caps at `MAX_PLANES`, stamps `index`) and exposes a synchronous `getProjects()` and `getProject(slug)`. Resolution happens at module evaluation, so a missing key or unknown media throws at build and names the slug and field. `node scripts/check-content.mjs` is the sub-second gate. No fallback list exists.

Content changes only through a commit and a deploy: there is no webhook, poll or cache to invalidate. Pages are static (`app/page.js`, `app/llms.txt/route.js`) or prerendered per slug.

### Primary request path: ring (`/`)

1. `app/page.js` awaits `getProjects()`, emits `<link rel="preload">` for the first three covers, JSON-LD `projectListSchema`, and `<RegisterHome projects>`.
2. `RegisterHome` calls `home.setProjects(projects)` in a layout effect (`components/HomeRing.jsx`). `HomeRingProvider` stores them and renders `<Carousel projects active resumeSlug/>`. Until then `app/loading.js` shows `ChargingMark` (only on `/` and only while `home.ready` is false).
3. `Carousel` builds the atlas (`components/ring/atlas.js`) by loading each `project.file` via `new Image()` (12s timeout per image, fan order from the seed outward), then runs the entry timeline.
4. Card click -> `openForPlane` -> `warmProject` (prefetch route + decode images, `lib/project/warm.js`) for the project and its neighbours -> `SharedTransitionProvider.start` flyer -> `router.push`.

### Project page (`/project/[slug]`)

1. `generateStaticParams` returns a slug per project from `getProjects()` (empty array on error). `dynamicParams = false`: unknown slugs 404.
2. `generateMetadata` and the page both call `getProjects()` (React-cached, one fetch per request), then `getProjectBySlug`; no match -> `notFound()` (`app/project/[slug]/not-found.js`).
3. Sets `openGraph.images` from the project's `og` card; `twitter:image` is inherited.
4. Renders `<RegisterHome projects>` (so the parked ring has data on direct entry) and `ProjectDetail` (`components/project/ProjectDetail.jsx`) with previous/next from `getProjectNavigation`.
5. `/work/:slug` and `/book*` redirect permanently (`next.config.mjs`).

### Generated routes

- `app/sitemap.js`: home, booking, one entry per project (`lastModified` from `project.updatedAt`).
- `app/robots.js`: allows `/`, disallows `/api/book` only.
- `app/llms.txt/route.js`: plain-text project index, static.
- Share images: `app/layout.js` and `app/page.js` use the `site.home` card, project pages use `project.og`, both from `content/media.json` (R2 URLs `projects/<slug>/og-<sha8>.jpg`, `projects/_site/og-home-<sha8>.jpg`). `/booking` uses the committed `app/booking/opengraph-image.png`. No `opengraph-image` or `twitter-image` function route exists.

### Booking

`app/booking/page.js` renders client `BookFlow`. `POST /api/book` (`app/api/book/route.js`, `maxDuration = 60`) validates (`lib/book/validate.js`), claims a slot (`lib/book/time.js`), writes a Notion calendar page (`lib/notion/bookings.js`), emails via Resend (`lib/mail/booking.js`), and runs optional Firecrawl/Gemini/OpenAI research after the response via `after()` (`lib/book/research.js`). `GET /api/book/availability` and `/api/book/draft` support the flow. Independent of the project/ring pipeline. It is the only code that reads Notion.

### Authoring-time side path: media (`scripts/media.mjs`)

`scripts/media.mjs` is run by hand (`node scripts/media.mjs check | verify | generate | share`). It is the only writer of `content/media.json` and of R2 objects under `projects/`.

1. Loads env itself (`scripts/lib/load-env.mjs`), not through `lib/env.js`.
2. Dynamically imports the project list from `content/projects/index.mjs`.
3. For each slot not already in `content/media.json` (or with `--force`): build a prompt (`scripts/lib/art-direction.mjs`), call Higgsfield through `@higgsfield/client/v2` (`scripts/lib/higgsfield.mjs`), download the result.
4. `sharp` (devDependency) produces two WebP renditions: `cell` (512x341, the atlas cell ratio) and `cover` (1536x1024).
5. Upload to Cloudflare R2 with content-addressed keys `projects/<slug>/cell-<sha8>.webp`, `cover-<sha8>.webp`, `loop-<sha8>.mp4` and `Cache-Control: public, max-age=31536000, immutable` via a hand-rolled SigV4 signer (`scripts/lib/r2.mjs`, no AWS SDK).
6. Record request id, prompt, keys and URLs in the manifest and write it after every project.

`share` renders 1200x630 JPEG cards (cover, gradient, Geist glyph paths via fontkit from the `geist` devDependency), uploads them to R2 as `projects/<slug>/og-<sha8>.jpg` and `projects/_site/og-home-<sha8>.jpg`, and records them in `content/media.json` (`og`, `site.home`) with an inputs hash. The build fails on a missing or stale card. `--preview` writes to `.media-probe/share/` only; `--booking` writes `app/booking/opengraph-image.png`.

Modes: `--probe` (one 720p image to `.media-probe/`, no R2, no manifest), `--check` (PUT/HEAD/public GET of `_healthcheck/<ts>.txt`), `--dry-run` (prompts and keys only), `--only=<slug,...>`, `--limit=N`, `--direction=`, `--video`, `--force`.

Deliberate isolation: nothing under `app/`, `components/` or `lib/` imports `scripts/`. A visitor cannot trigger a generation (money, tens of seconds). `lib/env.js` holds booking accessors only; scripts read R2 and Higgsfield keys through `scripts/lib/load-env.mjs`. `next/image` loads R2 URLs through `images.remotePatterns` for `media.koussay.online/projects/**`. The earlier Notion seed script was removed in Phase 1 and remains in git history.

**State Management:**
- Server: none for projects (resolved once at module evaluation).
- Client: ring state is closure variables inside the `Carousel` effect (see `AGENTS.md`); app-level state is React context (`HomeRingContext`, shared transition, pager).

## Key Abstractions

**Project record:**
- Purpose: Shape shared by the ring, detail pages and SEO.
- Fields: `slug`, `name`, `type`, `year`, `liveUrl`, `order`, `file`, `index` (added by `indexProjects`), `detail { summary, overview, challenge, outcome, gallery[], testimonial{quote,author,role}, tools[] }`. Media URLs are https://media.koussay.online/projects/<slug>/<slot>-<sha8>.webp.
- Examples: `content/projects/<slug>.mjs`, resolved by `lib/content-schema.mjs`.
- Pattern: slug is identity; ring order is `index`. Slugs survive reorders.

**Home ring context:**
- Purpose: `{ setProjects, prepareHome, ready }` between server pages, `Carousel` and back-navigation.
- Examples: `components/homeRingContext.js`, `components/HomeRing.jsx`.

## Entry Points

**`app/layout.js`:**
- Triggers: every request. Mounts `Providers` and global JSON-LD.

**`app/page.js`:**
- Triggers: `/`. Reads projects from `lib/content.js`, preloads covers, registers with the ring.

**`app/project/[slug]/page.js`:**
- Triggers: `/project/*`. Prerendered per slug.

**`app/api/book/*`:**
- Triggers: the booking form (`route.js`, `availability/route.js`, `draft/route.js`). The only API routes.

**`scripts/media.mjs`:**
- Triggers: manual CLI runs only.

## Architectural Constraints

- **Threading:** Single-threaded browser main thread; the ring runs one `requestAnimationFrame` layout loop (see `AGENTS.md`). Server routes are stateless lambdas; per-instance module state (Notion client, booking busy cache, pending slots) is best-effort.
- **Global state:** `lib/notion/client.js` `client`; `lib/project/warm.js` `retained` and `warmedRoutes` (client). In the ring, closure state inside `Carousel.jsx` (see `AGENTS.md`).
- **Circular imports:** None detected. Note the unusual direction `lib/projects.js` and `lib/content.js` import `MAX_PLANES` from `components/shaders/planeShaders.js`, so server code depends on a shader module (the GLSL string is bundled with it).
- **Project count:** capped at `MAX_PLANES` (packed uniform budget, `AGENTS.md`). Ring radius follows count (`radiusForCount` in `components/ring/utils.js`).
- **Notion rate limits:** `retry: false`, 4s timeout on the booking path.
- **Vercel vs Docker:** `output: "standalone"` is set only when `VERCEL !== "1"` (`next.config.mjs`, `Dockerfile`, `compose.yaml`).
- **Runtime:** booking routes pin `runtime = "nodejs"` (Notion client). No runtime code imports `sharp`; `next/image` uses Next's own copy.

## Anti-Patterns

### Reintroducing a fallback list

**What happens:** An old placeholder list returned 18 invented projects when content failed. Removed in Phase 2; it remains in git history.
**Why it's wrong:** It replaced the real set silently.
**Do this instead:** Keep projects in `content/projects`; `lib/content.js` throws at build on a defect, so no partial or placeholder list can ship.

### Request-time image work

**What happens:** Resizing, converting or compositing images inside a route or page.
**Why it's wrong:** It needs native binaries, blocks the Workers move and slows cold loads.
**Do this instead:** Render at authoring time (`scripts/media.mjs`), upload to R2 with a content-addressed key and serve the static file.

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
- Client: atlas image failure leaves a blank cell and still counts toward load (`components/ring/atlas.js`).
- Cost control in scripts: per-project try/catch, non-zero exit if any failed, manifest written after each success.

## Cross-Cutting Concerns

**Logging:** `console.warn`/`console.error` with `[area]` prefixes (`[book/draft]`, `[ring]`, `[atlas]`); `removeConsole` strips all but `error` in production (`next.config.mjs`).
**Validation:** Booking in `lib/book/validate.js`; share cards checked at build by `lib/content-schema.mjs`.
**Authentication:** None for visitors. Notion integration token via `lib/env.js`; R2/Higgsfield keys live in `.env.local` (present, not read) and are used by `scripts/` only.

---

*Architecture analysis: 2026-10-02*
