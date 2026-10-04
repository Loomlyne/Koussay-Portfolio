# Codebase Structure

**Analysis Date:** 2026-10-02

## Directory Layout

```
Koussay-Portfolio/
├── app/                          # Next.js 16 App Router (routes, API, metadata files)
│   ├── layout.js                 # Root layout, site JSON-LD, <Providers>
│   ├── providers.js              # Client provider stack + CmsLive
│   ├── page.js                   # "/" ring (revalidate 60)
│   ├── loading.js                # ChargingMark fallback for "/" until ring ready
│   ├── not-found.js              # Global 404
│   ├── globals.css               # Tailwind v4 import, @font-face, page background
│   ├── opengraph-image.js        # Home OG image
│   ├── twitter-image.js          # Re-exports opengraph-image
│   ├── sitemap.js                # /sitemap.xml
│   ├── robots.js                 # /robots.txt
│   ├── llms.txt/route.js         # /llms.txt
│   ├── project/[slug]/           # Detail pages (SSG + ISR + dynamicParams)
│   │   ├── page.js, loading.js, not-found.js, page.module.css
│   │   └── opengraph-image.js, twitter-image.js
│   ├── booking/                  # "Start a project" flow
│   │   ├── page.js, page.module.css
│   │   └── opengraph-image.js, twitter-image.js
│   └── api/
│       ├── media/[...parts]/route.js   # Notion media proxy
│       ├── cms-stamp/route.js          # Cheap "did Notion change" probe
│       ├── revalidate/route.js         # Notion webhook receiver
│       └── book/ (route.js, availability/route.js, draft/route.js)
├── components/                   # Client components and the WebGL machine
│   ├── Carousel.jsx              # The ring (~2160 lines, deliberately one file)
│   ├── HomeRing.jsx              # Persistent ring host + RegisterHome bridge
│   ├── homeRingContext.js        # HomeRingContext + useHomeRing
│   ├── SharedTransitionProvider.jsx  # Card -> hero flyer
│   ├── SmoothScroll.jsx          # Lenis
│   ├── CmsLive.jsx               # Stamp poll -> router.refresh
│   ├── BackToWorks.jsx, BrandMark.jsx, Breadcrumbs.jsx, ChargingMark.jsx, JsonLd.jsx
│   ├── TwoPlaneMorph.jsx         # Dead experiment, imports nothing live (see AGENTS.md)
│   ├── ring/                     # Ring modules: params, atlas, meta, splitText, tag, gui, utils
│   ├── shaders/                  # planeShaders.js (ring SDF + MAX_PLANES), textShaders.js
│   ├── project/                  # Detail page UI: Detail, Hero, Gallery, Media, Sections, Pager(+Transition), Tools, Testimonial, Warm, ScrollTop, NotFound
│   └── book/                     # Booking UI: BookFlow, BookCalendar, BookTimePicker, BookSelect, BookProgress
├── lib/                          # Server-and-shared logic (no React components)
│   ├── content.js, content-schema.mjs  # getProjects() (sync), schema join; throws at build on bad content
│   ├── cms/                      # bust.js (legacy, removed in Phase 3)
│   ├── notion/                   # client.js, projects.js, props.js, gallery-pdf.js, bookings.js
│   ├── project/warm.js           # Client-side prefetch + image decode retention
│   ├── book/                     # config, confirmation, draft, research, steps, time, validate
│   ├── mail/booking.js           # Resend emails
│   ├── env.js                    # All env accessors and is*Configured()
│   ├── media.js                  # Media slot grammar
│   ├── pdf.js                    # PDF page render + byte cache
│   ├── projects.js               # Project helpers (slug, neighbours, alt text, indexProjects)
│   ├── seo.js, site.js, og-image.js
├── scripts/                      # Authoring-time CLIs (never imported by app/)
│   ├── media.mjs                 # check | import-live | verify | generate; only writer of content/media.json and R2 projects/
│   ├── check-content.mjs         # sub-second content gate
│   └── lib/ (art-direction.mjs, higgsfield.mjs, load-env.mjs, r2.mjs)
├── content/                      # projects/<slug>.mjs + index.mjs (ORDER = ring order), media.json (machine-written)
├── public/                       # fonts, logo.png, favicon.ico, svg (placeholder art and 404.webp removed; 404 mark is live Geist text)
├── docs/                         # Screenshots (carousel/entry/hover.png), NEXT-SESSION-PROMPT.md (historical)
├── .agents/skills/               # Higgsfield agent skills (tooling, not app code)
├── .planning/codebase/           # These map documents
├── AGENTS.md                     # Authoritative ring notes (read first)
├── README.md, BREAKDOWN.md, LICENSE
├── shader                        # Dead paste of library docs, not code (see AGENTS.md)
├── next.config.mjs, jsconfig.json, eslint.config.mjs, postcss.config.mjs
├── package.json, package-lock.json, skills-lock.json
├── Dockerfile, compose.yaml      # Standalone container build (non-Vercel)
├── .env.example                  # Documented env surface (real values in gitignored .env.local)
└── .gitignore                    # Ignores .env*, .next, .vercel, next-env.d.ts, .media-probe/
```

## Directory Purposes

**`app/`:**
- Purpose: Routing, metadata, API handlers. Server components by default.
- Contains: `page.js`, `layout.js`, route handlers, `opengraph-image.js`/`twitter-image.js` metadata files, co-located `page.module.css`.
- Key files: `app/page.js`, `app/project/[slug]/page.js`, `app/api/media/[...parts]/route.js`.

**`components/`:**
- Purpose: Everything rendered in the browser, including the WebGL ring.
- Contains: `.jsx` components, `.js` helpers/contexts, GLSL in `.js` template strings.
- Key files: `components/Carousel.jsx`, `components/HomeRing.jsx`, `components/ring/params.js`, `components/shaders/planeShaders.js`.

**`lib/`:**
- Purpose: Data access, caching, SEO, media, booking logic.
- Contains: plain `.js` modules. Server-only by convention (uses `node:crypto`, `sharp`, Notion client). Exceptions that run in the browser: `lib/projects.js`, `lib/project/warm.js`, `lib/media.js`.
- Key files: `lib/content.js`, `lib/content-schema.mjs`, `lib/env.js`. `lib/notion/projects.js`, `lib/notion/gallery-pdf.js`, `lib/pdf.js`, `lib/media.js` and `lib/cms/bust.js` are unreferenced by pages and removed in Phase 3.

**`scripts/`:**
- Purpose: Manual authoring-time tooling run with `node`.
- Contains: ESM `.mjs`. Own env loader, own R2 SigV4 signer. Uses `@higgsfield/client` (a devDependency).
- Generated: `content/media.json` (committed, written only by `scripts/media.mjs`) and `.media-probe/` (gitignored).

**`public/`:**
- Purpose: Static assets. Fonts are Geist woff2 under `public/fonts` with `OFL.txt`. The old placeholder art is removed and remains in git history.

## Key File Locations

**Entry Points:**
- `app/layout.js`: Root shell.
- `app/page.js`: Ring route.
- `app/project/[slug]/page.js`: Detail route.
- `components/Carousel.jsx`: Ring component.
- `scripts/media.mjs`: Media CLI.

**Configuration:**
- `next.config.mjs`: Redirects (`/work/:slug`, `/book`), `images.localPatterns`, `serverExternalPackages`, `outputFileTracingIncludes`, conditional standalone output, `staleTimes`.
- `lib/env.js`: Every env var read; add new vars here.
- `.env.example`: Documentation of env surface.
- `jsconfig.json`: `@/*` -> repo root.
- `lib/site.js`: Site name, URL (`https://koussay.online`), description, booking path.

**Core Logic:**
- `lib/content.js`: Synchronous project resolver, no fallback.
- `lib/notion/projects.js`: Notion query, mapping, caches, media URL resolution.
- `app/api/media/[...parts]/route.js`: Media proxy.
- `components/ring/params.js`: All ring tunables.
- `content/projects/index.mjs`: `ORDER`, the ring order.

**Testing:**
- `tests/smoke.spec.mjs` and `tests/screens.spec.mjs` (Playwright, `npm test`, port 3100). Gate: `format:check`, `lint`, `build`, `test` (see `AGENTS.md`).

## Naming Conventions

**Files:**
- React components: PascalCase `.jsx` (`components/HomeRing.jsx`, `components/project/ProjectHero.jsx`).
- Non-component modules: lowercase or camelCase `.js` (`lib/pdf.js`, `components/ring/splitText.js`, `components/homeRingContext.js`).
- Next special files lowercase (`page.js`, `route.js`, `loading.js`, `not-found.js`, `opengraph-image.js`).
- Scripts: kebab-case `.mjs` (`scripts/media.mjs`).
- CSS modules named `page.module.css` next to the route.

**Directories:**
- Lowercase, singular domain nouns under `lib/` (`lib/cms`, `lib/notion`, `lib/book`).
- Route segments follow URL (`app/project/[slug]`, `app/api/media/[...parts]`).

**Identifiers:**
- Media slots: `cover`, `g<n>`, `g<n>p<m>` (`lib/media.js`).
- R2 keys: `projects/<slug>/{cell|cover|loop}-<sha8>.{webp|mp4}`.
- Cache tag: `projects`; cache keys `cms-projects-v2`, `cms-stamp`, `notion-datasource`.

## Where to Add New Code

**New project/content field from Notion:**
- Map it in `mapPage` in `lib/notion/projects.js` (property helpers in `lib/notion/props.js`), consume in `components/project/*`. If the shape of the cached bundle changes, bump the key `cms-projects-v2` in `getCachedProjectBundle`.
- Add the same field to the schema in `lib/content-schema.mjs` and to every module in `content/projects/`; `node scripts/check-content.mjs` fails until all eight carry it.

**New route/page:**
- `app/<segment>/page.js` as a server component; metadata via `generateMetadata`; JSON-LD via `lib/seo.js`; add to `app/sitemap.js` and `app/llms.txt/route.js` if public.

**New API handler:**
- `app/api/<name>/route.js` with `export const runtime = "nodejs"`. Add to `robots.js` disallow if internal.

**New env variable:**
- Accessor and `is*Configured()` in `lib/env.js`; document in `.env.example`. Scripts read env through `scripts/lib/load-env.mjs`, not `lib/env.js`.

**New ring tunable:**
- `components/ring/params.js` plus a control in `components/ring/gui.js` (see Conventions in `AGENTS.md`).

**New ring/shader behaviour:**
- Inside `components/Carousel.jsx` and `components/shaders/planeShaders.js`. Do not extract a context object (see `AGENTS.md`).

**New project-page UI:**
- `components/project/<Name>.jsx`, composed in `components/project/ProjectDetail.jsx`; styles in `app/project/[slug]/page.module.css`.

**New authoring script:**
- `scripts/<name>.mjs`, helpers in `scripts/lib/`. Do not import it from `app/`, `components/` or `lib/`. Any step that costs money must be gated (manifest or explicit flag) and default to dry or skip.

**New art direction:**
- Add an entry to `DIRECTIONS` in `scripts/lib/art-direction.mjs` (image function + video string). `DIRECTION_KEYS` updates itself.

**Utilities:**
- Shared pure helpers: `lib/`. Ring-only math: `components/ring/utils.js`.

## Special Directories

**`.next/`:**
- Purpose: Build output. Generated: Yes. Committed: No.

**`.agents/skills/`:**
- Purpose: Higgsfield agent skills and references. Generated: installed (`skills-lock.json`). Committed: Yes. Not application code; ignore when mapping the app.

**`.planning/codebase/`:**
- Purpose: Codebase map documents. Committed: per orchestrator.

**`.media-probe/`:**
- Purpose: Output of `--probe`. Generated: Yes. Committed: No (gitignored).

**`public/`:**
- Purpose: Static files served at `/`. Committed: Yes. Contents are not MIT-licensed (see `LICENSE`).

---

*Structure analysis: 2026-10-02*
