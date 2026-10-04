# Technology Stack

**Analysis Date:** 2026-10-02

## Languages

**Primary:**
- JavaScript (ES modules, no TypeScript) - the whole app: `app/**/*.js`, `components/**/*.{js,jsx}`, `lib/**/*.js`. Path alias `@/*` -> repo root via `jsconfig.json`.
- GLSL ES (WebGL) - the ring renderer, compiled at runtime in the browser, not at build: `components/shaders/planeShaders.js`, `components/shaders/textShaders.js`. See `AGENTS.md`.

**Secondary:**
- CSS - Tailwind v4 via `@import "tailwindcss"` in `app/globals.css`, plus CSS Modules (`app/booking/page.module.css`, `app/project/[slug]/page.module.css`).
- Node `.mjs` scripts - authoring-time tooling only: `scripts/media.mjs` (the only writer of `content/media.json` and R2 objects under `projects/`), `scripts/check-content.mjs`, `scripts/lib/*.mjs`.

## Runtime

**Environment:**
- Node.js. Next 16.3.8 requires `>=20.9.0` (`node_modules/next/package.json`); README states Node 20+. Docker image pins `node:22-alpine` (`Dockerfile`). Local machine runs Node 26.
- Route handlers declare `export const runtime = "nodejs"` (`app/api/book/**`, the only API routes). Nothing runs on the Edge runtime.

**Package Manager:**
- npm (lockfile `package-lock.json` present, ~270 KB). Docker build uses `npm ci`.

## Frameworks

**Core:**
- Next.js 16.3.8 (App Router, `app/`) - pinned exact in `package.json`. AGENTS.md warns this Next has breaking changes; read `node_modules/next/dist/docs/` before changing framework-level code.
- React 19.2.8 / react-dom 19.2.8 - pinned exact.
- three 0.185.1 (`three`) - WebGL renderer for the carousel; one full-screen fragment shader (see `AGENTS.md`).
- gsap 3.15 - entry timeline and tweens in `components/Carousel.jsx`.
- lenis 1.3 - smooth scroll (`components/SmoothScroll.jsx`).
- lil-gui 0.21 - dev tuning panel, dynamically imported and `NODE_ENV === "development"` only (`components/ring/gui.js`).
- Tailwind CSS 4 + `@tailwindcss/postcss` (`postcss.config.mjs`).

**Testing:**
- Playwright smoke test via `npm test` (`tests/smoke.spec.mjs`, port 3100, desktop 1512 and phone 390). A control-session gate with `format:check`, `lint` and `build` before every ship. No git hook, no CI (per `AGENTS.md`).

**Build/Dev:**
- ESLint 9 with `eslint-config-next/core-web-vitals` (`eslint.config.mjs`, flat config).
- Prettier defaults, no config file, not in `package.json` (run via `npx prettier`).

## Key Dependencies

**Critical:**
- `@notionhq/client` 5.26.0 - Notion for bookings and blocked time only. Uses the data-sources API (`dataSources.query`) and `fileUploads` (`lib/notion/client.js`, `lib/notion/bookings.js`).
- `resend` 6.26.0 - transactional email (`lib/mail/booking.js`).
- `@vercel/speed-insights` 2.0 - `<SpeedInsights />` in `app/layout.js`.

**Authoring-time image tooling (devDependencies, scripts only):**
- `sharp` ^0.35.5 - libvips resize/WebP and share-card compositing in `scripts/media.mjs` and `scripts/lib/share.mjs`. No runtime code imports it; `next/image` uses Next's own sharp.
- `fontkit` ^2.0.4 and `geist` 1.7.2 - Geist glyph paths for the share cards (`scripts/lib/share.mjs`).

The runtime has no native addon of its own, so nothing in the app blocks a move to Cloudflare Workers on those grounds (Phase 3.1 decides the rest).

**Infrastructure / authoring-time:**
- `@higgsfield/client` ^0.2.6 (devDependency) - Higgsfield SDK imported from `@higgsfield/client/v2` in `scripts/lib/higgsfield.mjs`. Never imported by the app.

## Configuration

**Environment:**
- All app env var accessors live in `lib/env.js` (each trims and returns a string or default; `isXConfigured()` helpers gate features). Read env through these functions, never `process.env` directly in app code.
- `.env.example` documents every key. There is no `.env.local` in git (`.gitignore` ignores `.env*` except `.env.example`). A local `.env.local` exists on developer machines only; never read or quote it.
- Scripts do not use `lib/env.js`. They use `loadEnv()` in `scripts/lib/load-env.mjs` (hand-rolled `.env.local` then `.env` parser, real env wins).
- Content: projects are read from `content/projects/<slug>.mjs` (one module per project, full schema) and `content/projects/index.mjs` (`ORDER` is ring order; slug is identity) through `lib/content.js` `getProjects()`, which is synchronous and needs no keys. Images are on Cloudflare R2 at https://media.koussay.online and listed in `content/media.json`. No fallback list exists. With no booking keys `/api/book` returns 503. `npm test` needs network because covers load from media.koussay.online.
- `lib/env.js` holds booking accessors only. R2 and Higgsfield keys are read by scripts through `scripts/lib/load-env.mjs`; `.env.example` documents `HF_CREDENTIALS` for them.

**Build:**
- `next.config.mjs` - `output: "standalone"` only when `VERCEL !== "1"` (Docker path); `removeConsole` in production except `error`; `experimental.staleTimes` (dynamic 180s, static 300s); `optimizePackageImports: ["gsap","three"]`; permanent redirects `/work/:slug` -> `/project/:slug`, `/book` -> `/booking`; `images.remotePatterns` allows `https://media.koussay.online/projects/**`, `images.localPatterns` allows `/**` without a query string.
- `postcss.config.mjs`, `eslint.config.mjs`, `jsconfig.json`.
- `Dockerfile` (3-stage `node:22-alpine`, runs `node server.js` from standalone output, port 3000) and `compose.yaml` (single `web` service).
- No `vercel.json`; `.vercel/` is gitignored and not present, so project linking is not recorded in the repo.

## Platform Requirements

**Development:**
- Node >= 20.9, npm. `npm run dev` (localhost:3000), `npm run build`, `npm run lint`.
- Browser with WebGL for the carousel; GLSL errors surface only in the browser console.

**Production:**
- Vercel (per project context; `@vercel/speed-insights`, `VERCEL` env check in `next.config.mjs`). Site URL is `https://koussay.online` (`lib/site.js`).
- Alternative self-host path exists via `Dockerfile` / `compose.yaml` (standalone output). Cloudflare Workers is the Phase 3.1 target.
- Serverless limits in use: booking route `maxDuration = 60`.
- Pages are static or prerendered per slug; there are no ISR windows.

---

*Stack analysis: 2026-10-02*
