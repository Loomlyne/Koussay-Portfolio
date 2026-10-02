# Coding Conventions

**Analysis Date:** 2026-10-02

Plain JavaScript (no TypeScript). `jsconfig.json` defines one alias, `@/*` -> `./*`. The repo's own rules live in `AGENTS.md` ("Conventions" and "Non-obvious things that will bite you"); this file records what the code actually does and where it diverges.

## Naming Patterns

**Files:**
- React components: PascalCase `.jsx` (`components/Carousel.jsx`, `components/book/BookFlow.jsx`, `components/project/ProjectHero.jsx`).
- Non-component modules: camelCase `.js` (`components/ring/splitText.js`, `components/homeRingContext.js`, `lib/og-image.js` is the one kebab-case exception, as are `lib/notion/gallery-pdf.js` and `scripts/lib/load-env.mjs`).
- Next.js route files use framework names: `page.js`, `route.js`, `loading.js`, `not-found.js`, `opengraph-image.js` under `app/`. Note `app/` pages and `route.js` use `.js`, not `.jsx`, even when they return JSX.
- CSS Modules sit beside the route and are named `page.module.css` (`app/booking/page.module.css`, `app/project/[slug]/page.module.css`) and are imported by components via `@/app/...`.
- Scripts: `.mjs`, kebab-case (`scripts/seed-notion-projects.mjs`, `scripts/generate-project-media.mjs`); shared helpers in `scripts/lib/*.mjs`.

**Functions:**
- camelCase. Predicates start `is`/`has` (`isNotionProjectsConfigured`, `isSlotOpen`, `hasAllFitChecks`, `hasCredentials`).
- Env accessors in `lib/env.js` are one tiny named function per variable, each trimming through the local `trim()` helper (`notionToken()`, `resendFrom()`). Read env through these, never `process.env` inline in `lib/` or `app/` code.
- Factories that own DOM/GL state are `createX` (`createMeta`, `createTag`, `createSplitText`) and return an object with `build`/`dispose`-style methods. The dev panel is `mountGui`.
- React hooks-style refs are suffixed `Ref` (`activeRef`, `routerRef`, `stageApiRef`) in `components/Carousel.jsx`.

**Variables:**
- camelCase locals; SCREAMING_SNAKE for module constants (`FAN_START`, `MAX_PLANES`, `IMAGE_ENDPOINT`, `MAX_ATTACHMENT_BYTES`, `NO_STORE`).
- Math constants live in `components/ring/utils.js`: `TAU`, `HALF_PI`, `DEG`. Import them; do not recompute `Math.PI * 2`.
- Shader uniforms are `uPascalCase` (`uAtlas`, `uResolution`, `uTagTex`).
- `PROJECTS` is imported as `FALLBACK_PROJECTS` wherever the Notion list is the primary source (`lib/cms/projects.js`, `components/Carousel.jsx`).

**Types:**
- Not applicable (no TypeScript, no JSDoc type annotations). Shapes are documented in prose comments only.

## Code Style

**Formatting:**
- Prettier with defaults and **no config file** (no `.prettierrc*`, no `prettier` entry in `package.json`). Prettier is not a dependency; run it through `npx`:
  ```bash
  npx prettier --check "components/**/*.{js,jsx}" "app/**/*.{js,jsx}"
  npx prettier --write .
  ```
- Defaults in effect: double quotes, semicolons, 2-space indent, trailing commas, 80 columns.
- Opt-out marker used where a long call must stay on one line: `// prettier-ignore` at end of line (`components/ring/gui.js`, e.g. the `textWeight`, `nameWeight` and `nameEdge` lines).
- Current drift: `npx prettier --check` reports 17 files not formatted (`components/Carousel.jsx`, `components/book/BookFlow.jsx`, `components/SmoothScroll.jsx`, `app/layout.js`, `lib/book/validate.js`, `lib/book/time.js`, `lib/notion/bookings.js`, and others). New and edited files must be formatted; do not reformat unrelated files in a feature commit.

**Linting:**
- ESLint 9 flat config in `eslint.config.mjs`: `eslint-config-next/core-web-vitals` only, with `.next/**`, `out/**`, `build/**`, `next-env.d.ts` ignored. `npm run lint` currently exits clean.
- Rule suppressions are rare and always local and justified in an adjacent comment:
  - `// eslint-disable-next-line react-hooks/exhaustive-deps` at the end of the main effect in `components/Carousel.jsx` (deps are `[ringKey]` on purpose, explained in the comment above it).
  - `/* eslint-disable react-hooks/set-state-in-effect */` in `components/book/BookFlow.jsx`.
  - `@next/next/no-img-element` in `components/SharedTransitionProvider.jsx` and `components/project/ProjectGallery.jsx`.
- Next.js 16 and React 19 are not the versions most training data covers. `AGENTS.md` instructs reading `node_modules/next/dist/docs/` before writing Next-specific code.

## Import Organization

**Order (observed, not enforced by a rule):**
1. React and Next (`react`, `next/link`, `next/navigation`, `next/cache`)
2. Third-party (`three`, `gsap`, `@notionhq/client`, `sharp`)
3. Local relative or `@/` imports, usually with a blank line before the group

`components/Carousel.jsx` imports siblings relatively (`./BrandMark`, `./ring/atlas`, `./shaders/planeShaders`) and cross-tree code through the alias (`@/lib/projects`, `@/lib/project/warm`). `lib/` and `app/` code uses `@/` throughout. Node built-ins in scripts use the `node:` prefix (`node:fs`, `node:path`, `node:url`, `node:crypto`).

**Path Aliases:**
- `@/*` -> repo root (`jsconfig.json`). Use `@/lib/...`, `@/components/...`, `@/app/...`.
- `components/ring/*` and `components/shaders/*` import each other relatively.

## Tuning Parameters (repo-specific rule)

**All tuning lives in `components/ring/params.js`.** `defaultParams()` returns a fresh object per mount so dev-panel edits cannot leak between mounts. A new hardcoded number in the layout loop in `components/Carousel.jsx` is a bug: add a param instead.

**Every new param needs a matching control in `components/ring/gui.js`**, in the right folder, with the right `onChange` wiring:
- `refit` for anything the window bands (`narrowAt`, `tightAt`) or scale depend on. Helper: `onFit(k, lo, hi, step, label)`.
- `styleMeta` for anything the DOM labels are sized from. Helper: `onMetaFit` / `onMeta`.
- `replay` for anything baked into the entry GSAP timeline at build time. Helper: `onStage`.
- `rebuildText` / `rebuildTag` for heading and cursor tag rasterisation; `setThreshold` for the meta morph threshold.
- No `onChange` when the layout loop re-reads the value every frame (most pointer, honey, glass and scroll params).

Pattern:
```js
// params.js
tagGap: 6,
// gui.js
tag.add(params, "tagGap", 0, 30, 1).name("gap").onChange(rebuildTag);
```

Param comments carry units and the reason for the number (`// px`, `// vw of box`, `// 0.38 left a postage-stamp card on a 390-wide phone`). px figures are quoted at `refWidth: 1512` and scaled by `g`; decide per measurement whether it passes through `g`.

**Dev panel is development-only.** In `components/Carousel.jsx` the panel mounts only inside `if (process.env.NODE_ENV === "development")` and both `lil-gui` and `./ring/gui` are loaded by dynamic `import()` inside `Promise.all`, with a `disposed` guard after the await and `gui?.destroy()` in cleanup. Never import `lil-gui` or `ring/gui.js` statically.

**Font families are matched by name in three places** and a mismatch silently falls back to system sans:
1. Strings in `components/ring/params.js` (`textFont: "PP Neue Montreal"`, `nameFont: "Satoshi"`, `idxFont: "Geist"`).
2. A matching `@font-face { font-family: ... }` block in `app/globals.css` (Satoshi 400 and 500, Geist 400, PP Neue Montreal 400).
3. The dropdown list in `components/ring/gui.js` (`["PP Neue Montreal", "Satoshi", "Geist"]`).
Add a family to all three together. `WEIGHTS` in `params.js` lists Light/Regular/Medium/Semibold, but only the weights with a real `@font-face` file render distinctly.

## Error Handling

**Patterns:**
- API routes (`app/api/**/route.js`) export `runtime = "nodejs"` (and `dynamic = "force-dynamic"` where the response must not cache), parse input in a `try/catch` that returns a 400 JSON body, and wrap the work in a `try/catch` that logs with a bracketed tag and returns a plain-language JSON error with a 502 or 500. Example: `app/api/book/draft/route.js` uses a local `json(data, status)` helper and `console.error("[book/draft]", error)`.
- Degrade, do not throw, when an integration is absent: check `isXConfigured()` from `lib/env.js` first and return the local fallback (`lib/cms/projects.js` returns `FALLBACK` when Notion is unset).
- Fallback precedence in `lib/cms/projects.js`: Notion bundle -> per-instance `lastGood` -> local `PROJECTS` placeholder. The comment there records why the placeholder list must never be returned from inside `unstable_cache`. Preserve that ordering.
- Best-effort side effects chain `.catch()` with a log (`sendDraftNotice(...).catch(error => console.error(...))`) so a mail failure cannot fail the request.
- Intentionally swallowed errors use a bare `catch {}` with a comment saying what happens instead (`// Stay on the last good frame if Notion blips.` in `components/CmsLive.jsx`; `// The env var may already be a data source id.` in `lib/notion/client.js`).
- External calls carry timeouts: `withTimeout(promise, ms, label)` in `lib/notion/client.js`, `AbortSignal.timeout(...)` in `scripts/lib/r2.mjs`, Notion client `timeoutMs: 4000, retry: false`.
- WebGL context creation failure is caught, logged `console.error("[ring] could not create a WebGL context:", err)`, `ring-lock` is removed from `<html>`, and the effect returns (`components/Carousel.jsx`).
- Scripts fail fast: `console.error(...)` then `process.exit(1)` on missing env or bad flags (`scripts/lib/load-env.mjs` `requireEnv`).

## Logging

**Framework:** `console` only, in server code and the browser.

**Patterns:**
- Prefix every message with a bracketed area tag: `[book/draft]`, `[media]`, `[projects]`, `[cms-stamp]`, `[ring]`, `[atlas]`, `[revalidate]`.
- `console.error` for failures that matter, `console.warn` for degraded-but-served, `console.info` for operator instructions (`app/api/revalidate/route.js` prints the Notion verification token).
- Never log secrets or env values.
- No `console.log` in app code.

## Comments

**When to Comment:**
- Comments explain **why**, not what. Short. They record constraints, the failure that motivated a number, or a trap (`// 0.38 left a postage-stamp card...`, the `forceContextLoss` block in `components/Carousel.jsx`, the rate-limit story in `lib/notion/client.js`).
- The one long doc block is the top of `components/ring/meta.js` (the alpha-threshold morph and the third "plain" row), because that technique does not read off the code. Do not add similar essays elsewhere; extend that block if the technique changes.
- Section dividers inside long closures use `/* --- name --- */` rules (`/* ------ dev controls */` in `components/Carousel.jsx`) and `// -- group ---` in `components/ring/params.js` and `components/ring/gui.js`.
- `// TODO:` appears once, in `components/ring/projects.js`, flagging placeholder `type`/`year` data.
- Third-party code keeps its licence notice (the MIT simplex noise in `components/shaders/planeShaders.js`); add a LICENSE and README Credits line for any new snippet.

**JSDoc/TSDoc:**
- `/** ... */` blocks are used as prose doc headers on exported factories and scripts (`mountGui`, `defaultParams`, `loadEnv`, `scripts/generate-project-media.mjs` header with usage lines). No `@param`/`@returns` tags.

## Function Design

**Size:** Pure helpers are small and single-purpose (`lib/book/validate.js`, `lib/notion/props.js`, `components/ring/utils.js`). The exception is deliberate: `components/Carousel.jsx` (~2160 lines) keeps the renderer, fit, input, spin physics, layout loop and entry timeline in one component body sharing ~20 closure variables. Do not split it into a context object; `AGENTS.md` explains why.

**Parameters:** Positional for 1 to 3 simple args; an options object for anything wider (`mountGui(GUI, { params, state, info, actions })`, `putObject(config, key, body, contentType, options = {})`). Defaults go in the signature (`projects = FALLBACK_PROJECTS`).

**Return Values:** Notion property readers in `lib/notion/props.js` return `""`, `null` or `[]` for missing data rather than throwing. Route handlers return `Response.json(...)`.

**Performance rules in the render loop:**
- `refit()` runs on resize only; the layout loop must not recompute `fit`/`planeK`/`radiusK`/`textK`.
- Band flags are stored, not resolved values.
- Per-frame smoothing uses `chase(dt, rate)` from `components/ring/utils.js` with rates authored per 60fps frame.
- Keep `uScale` packed as a vec4 (`xy` birth scale, `z` brightness, `w` atlas cell); do not add a separate `float[]` uniform array.
- Planes are numbered in fan order; convert with `signedOffset(i)` and derive anything positional from the ring slot, not the index.

## Module Design

**Exports:**
- Components: `export default function Name`. Everything else: named exports (`export function`, `export const`). Route files export HTTP method functions (`GET`, `POST`) and config constants.
- `"use client"` is the first line of every file that uses hooks, refs, browser APIs or event handlers (24 files, listed by `grep -rl '"use client"' app components lib`); `lib/project/warm.js` is the lone `lib/` client module. Server components and `lib/` modules omit it.

**Barrel Files:** Not used. Import from the defining file.

**Styling:**
- The ring page (`components/Carousel.jsx`) uses Tailwind v4 utilities inline (arbitrary values such as `left-[max(12px,env(safe-area-inset-left))]`, `max-sm:hidden`). `app/globals.css` holds `@import "tailwindcss"`, `@font-face`, and global page rules.
- Booking and project pages use CSS Modules with design tokens as custom properties on `.page` in `app/booking/page.module.css` (`--space-*`, `--radius-*`, `--text-*`). Use the tokens instead of literals there.
- `touch-action: none` on the canvas is load-bearing; keep it set in `components/Carousel.jsx`.

## Scripts (`scripts/`)

Plain ESM `.mjs` run directly with `node`, no dotenv dependency, top-level `await`.

- **Env loading:** `loadEnv()` reads `.env.local` then `.env`, a real process env var wins over the file, comment and blank lines skipped. The older `scripts/seed-notion-projects.mjs` has its own inline copy of `loadEnv`, `rich`, `textOf`, `sleep` and `withRetry`; newer scripts import the shared `loadEnv`, `root`, `sleep`, `requireEnv` from `scripts/lib/load-env.mjs`. Prefer the shared module for new scripts.
- **Retry idiom** (`scripts/seed-notion-projects.mjs`): `withRetry(label, fn)`, up to 6 attempts, retries only status 429/409/502, exponential backoff `Math.min(8000, 600 * 2 ** attempt)`, rethrows as `` `${label}: ${error.message}` ``.
- **CLI flags:** hand-parsed from `process.argv.slice(2)` with `flag(name)` / `value(name, fallback)` helpers (`--only=a,b`, `--limit=3`, `--dry-run`, `--force`, `--probe`, `--check`); no argument library. Usage lines are in the file's header doc block.
- **Idempotence:** `scripts/generate-project-media.mjs` skips anything already in `scripts/media-manifest.json` unless `--force`, because generations cost credits. Keep paid or destructive operations gated behind a manifest or an explicit flag.
- **Importing app code:** scripts load app data via `await import(pathToFileURL(join(root, "components/ring/projects.js")).href)`; they do not use the `@/` alias.
- **R2 access:** hand-rolled SigV4 in `scripts/lib/r2.mjs` using `node:crypto`, no AWS SDK. Config is read through `r2Config(env)` and checked with `isR2Configured(config)`.
- **Output paths:** probe output goes to `.media-probe/` (gitignored).

## Public-repo obligations

- `public/ppneuemontreal-book.otf` is a commercial face kept for development only; keep the README and LICENSE notices, and delete the file if the heading moves to a free face.
- Sample project art is third-party Behance work and is flagged as such; do not present it as the author's.
- `.env*` is gitignored except `.env.example`. Never commit or quote env values.

---

*Convention analysis: 2026-10-02*
