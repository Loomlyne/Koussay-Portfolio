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
- Node.js. Next 16.3.0 requires `>=20.9.0` (`node_modules/next/package.json`); README states Node 20+. Docker image pins `node:22-alpine` (`Dockerfile`). Local machine runs Node 26.
- Route handlers declare `export const runtime = "nodejs"` (`app/api/revalidate/route.js`, `app/api/cms-stamp/route.js`, `app/api/media/[...parts]/route.js`, `app/api/book/**`). Nothing runs on the Edge runtime.

**Package Manager:**
- npm (lockfile `package-lock.json` present, ~270 KB). Docker build uses `npm ci`.

## Frameworks

**Core:**
- Next.js 16.3.0 (App Router, `app/`) - pinned exact in `package.json`. AGENTS.md warns this Next has breaking changes; read `node_modules/next/dist/docs/` before changing framework-level code.
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
- `@notionhq/client` 5.26.0 - Notion as CMS and bookings store; also supplies `verifyWebhookSignature` (`app/api/revalidate/route.js`). Uses the data-sources API (`dataSources.query`) and `fileUploads` (`lib/notion/client.js`, `lib/notion/bookings.js`).
- `resend` 6.26.0 - transactional email (`lib/mail/booking.js`).
- `@vercel/speed-insights` 2.0 - `<SpeedInsights />` in `app/layout.js`.

**Native Node binaries - cannot run on Cloudflare Workers:**
- `sharp` ^0.34.4 (installed 0.34.5) - libvips image resize/WebP in `lib/og-image.js` and `scripts/media.mjs`, plus the legacy `app/api/media/[...parts]/route.js` (unreferenced by pages, removed in Phase 3).
- `@napi-rs/canvas` ^1.0.9 - Skia canvas used as the PDF rasteriser backend (`lib/pdf.js`, `canvasImport: () => import("@napi-rs/canvas")`).
- `pdfjs-dist` ^6.3.289 - PDF parsing, loaded from `pdfjs-dist/legacy/build/pdf.mjs` (`lib/pdf.js`).
- `unpdf` ^1.8.1 - wrapper over pdfjs (`getDocumentProxy`, `renderPageAsImage`) in `lib/pdf.js`.

These four are load-bearing for any hosting decision. They need a real Node runtime with native `.node` addons for linux x64/arm64 (glibc and musl). Cloudflare Workers cannot load them, so the app cannot be moved to Workers as-is. `next.config.mjs` handles this on Vercel:
- `serverExternalPackages: ["unpdf", "pdfjs-dist", "@napi-rs/canvas"]` keeps them out of the bundler.
- `outputFileTracingIncludes` for routes `"/api/media/**"` and `"/project/**"` force-ships `./node_modules/@napi-rs/canvas/**`, `canvas-linux-x64-gnu`, `canvas-linux-x64-musl`, `canvas-linux-arm64-gnu`, `canvas-linux-arm64-musl`, `pdfjs-dist/**` and `unpdf/**` into the serverless function trace, because the optional per-platform canvas binary is not discovered by static tracing.
- `sharp` is not listed there; Next/Vercel trace it automatically.
- Moving media to R2 (see `.planning/codebase/INTEGRATIONS.md`) would remove the runtime need for `pdfjs-dist`, `unpdf`, `@napi-rs/canvas` and most of `sharp` (media route + `lib/pdf.js`), but `lib/og-image.js` still uses `sharp`, and the scripts use it at authoring time.

**Infrastructure / authoring-time:**
- `@higgsfield/client` ^0.2.6 (devDependency) - Higgsfield SDK imported from `@higgsfield/client/v2` in `scripts/lib/higgsfield.mjs`. Never imported by the app.

## Configuration

**Environment:**
- All app env var accessors live in `lib/env.js` (each trims and returns a string or default; `isXConfigured()` helpers gate features). Read env through these functions, never `process.env` directly in app code.
- `.env.example` documents every key. There is no `.env.local` in git (`.gitignore` ignores `.env*` except `.env.example`). A local `.env.local` exists on developer machines only; never read or quote it.
- Scripts do not use `lib/env.js`. They use `loadEnv()` in `scripts/lib/load-env.mjs` (hand-rolled `.env.local` then `.env` parser, real env wins).
- Content: projects are read from `content/projects/<slug>.mjs` (one module per project, full schema) and `content/projects/index.mjs` (`ORDER` is ring order; slug is identity) through `lib/content.js` `getProjects()`, which is synchronous and needs no keys. Images are on Cloudflare R2 at https://media.koussay.online and listed in `content/media.json`. No fallback list exists. With no booking keys `/api/book` returns 503. `npm test` needs network because covers load from media.koussay.online.
- Mismatch to know: `lib/env.js` exposes `higgsfieldKeyId()` / `higgsfieldKeySecret()` reading `HIGGSFIELD_API_KEY_ID` / `HIGGSFIELD_API_KEY_SECRET`, but `.env.example` documents `HF_CREDENTIALS` (the script-side convention in `scripts/lib/higgsfield.mjs`, which accepts either form). The `lib/env.js` Higgsfield and R2 accessors (`isHiggsfieldConfigured`, `r2PublicBase`, `isR2Configured`) are not called anywhere in `app/`, `lib/` or `components/` yet.

**Build:**
- `next.config.mjs` - `output: "standalone"` only when `VERCEL !== "1"` (Docker path); `removeConsole` in production except `error`; `experimental.staleTimes` (dynamic 180s, static 300s); `optimizePackageImports: ["gsap","three"]`; permanent redirects `/work/:slug` -> `/project/:slug`, `/book` -> `/booking`; `images.localPatterns` allows `/api/media/**` with query strings (Next 16 blocks query strings on local images otherwise) and `/**` without; no `remotePatterns`.
- `postcss.config.mjs`, `eslint.config.mjs`, `jsconfig.json`.
- `Dockerfile` (3-stage `node:22-alpine`, runs `node server.js` from standalone output, port 3000) and `compose.yaml` (single `web` service).
- No `vercel.json`; `.vercel/` is gitignored and not present, so project linking is not recorded in the repo.

## Platform Requirements

**Development:**
- Node >= 20.9, npm. `npm run dev` (localhost:3000), `npm run build`, `npm run lint`.
- Browser with WebGL for the carousel; GLSL errors surface only in the browser console.

**Production:**
- Vercel (per project context; `@vercel/speed-insights`, `VERCEL` env check in `next.config.mjs`). Site URL is `https://koussay.online` (`lib/site.js`).
- Alternative self-host path exists via `Dockerfile` / `compose.yaml` (standalone output). Not Cloudflare Workers-compatible, see native binaries above.
- Serverless limits in use: media route `maxDuration = 30`, booking route `maxDuration = 60`.
- ISR windows: `revalidate = 60` on `app/page.js`, `app/project/[slug]/page.js` and OG/Twitter image routes; `3600` on booking OG images.

---

*Stack analysis: 2026-10-02*
