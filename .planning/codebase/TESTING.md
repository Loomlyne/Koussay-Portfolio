# Testing Patterns

**Analysis Date:** 2026-10-02

## Test Framework

**Runner:** None. There are no tests anywhere in this repo.

- No `*.test.*` or `*.spec.*` files outside `node_modules`.
- No `jest`, `vitest`, `playwright`, `cypress` or `testing-library` in `package.json` or `node_modules/.bin`.
- No `test` script. `package.json` scripts are `dev`, `build`, `start`, `lint` only.
- `.gitignore` reserves `/coverage` (create-next-app default) but nothing produces it.
- `README.md` and `AGENTS.md` both state this plainly: "No tests. `npm run build` and `npm run lint` are the whole safety net."

**Assertion Library:** Not applicable.

**Run Commands:**
```bash
npm run build                                   # next build; the fastest correctness check
npm run lint                                    # eslint (eslint-config-next/core-web-vitals); currently clean
npx prettier --check "components/**/*.{js,jsx}" "app/**/*.{js,jsx}"   # formatting only; currently reports 17 files
npm run dev                                     # localhost:3000, then look at the browser console
```

## The Safety Net, Stated Plainly

What `npm run build` and `npm run lint` catch:
- Syntax errors and bad imports in JS/JSX, including broken `@/` paths.
- Next.js build-time failures (route config, server/client boundary errors, static generation errors).
- ESLint rules from `eslint-config-next/core-web-vitals`: hooks rules, `@next/next/*` rules.

What they do **not** catch:
- **GLSL errors.** The shaders in `components/shaders/planeShaders.js` and `components/shaders/textShaders.js` are template strings compiled by the GPU driver at runtime. A shader typo builds and lints clean and fails only in the browser console (blank or black canvas). Every shader edit must be verified by loading the page.
- Any behavioural regression: layout maths, snap/spin physics, pointer and touch handling, entry timeline, atlas packing.
- Data-shape drift against Notion, or Notion/R2/Resend/Higgsfield API changes.
- `MAX_PLANES` / `MAX_LINKS` uniform budget overruns (224 uniform rows guaranteed); these surface only as a shader link failure on some GPUs.
- Visual correctness at other widths (the `narrowAt` 1024 and `tightAt` 640 bands) and on real touch hardware.
- Runtime failures on code paths that only run with real credentials (`lib/notion/*`, `lib/mail/booking.js`, `scripts/*`).

Manual verification protocol that substitutes for tests:
1. `npm run lint` and `npm run build` both exit 0.
2. `npm run dev`, load `/`, open the console: no shader compile or link errors, no `[ring]` or `[atlas]` warnings.
3. For ring changes, use the lil-gui panel (development only, `components/ring/gui.js`) and the "use this window as ref" button to tune at the correct `refWidth`; check widths above 1024, between 640 and 1024, and below 640.
4. For touch, test on a real phone or device emulation with coarse pointer; swipe, press-and-hold, tap. Safari reports `movementX` as 0 for touch, so desktop Chrome alone is not evidence.
5. For booking and project pages, click through `/booking` and `/project/<slug>` with and without Notion env set.
6. After a long dev session, a blank page that is fine after hard reload signals the WebGL context-leak regression (`forceContextLoss()` removed from cleanup in `components/Carousel.jsx`).

## Test File Organization

**Location:** No convention exists because no tests exist. If tests are introduced, co-locate pure-logic tests beside the module (`lib/book/time.test.js`) and do not mix them with `app/` route files, where `*.test.js` would not be treated specially but clutters the routing tree.

**Naming:** Not established.

**Structure:** Not established.

## Test Structure

Not applicable. There is no suite organisation, setup, teardown or assertion pattern in the repo to copy.

## Mocking

**Framework:** None.

**Patterns:** None. Code that would need mocking has no injection seams today:
- `lib/notion/client.js` holds a module-level singleton `client` and reads `process.env` through `lib/env.js`.
- `lib/cms/projects.js` holds module-level `lastGood` state and wraps its function in React `cache()`.
- `components/Carousel.jsx` constructs `THREE.WebGLRenderer`, GSAP timelines and DOM listeners inside one `useEffect`.

**What to Mock (if tests are added):**
- `@notionhq/client`, `fetch`, and the `lib/env.js` accessors.
- `next/cache` (`unstable_cache`, `revalidateTag`, `revalidatePath`).

**What NOT to Mock:**
- Pure modules: `components/ring/utils.js`, `lib/book/validate.js`, `lib/book/time.js`, `lib/notion/props.js`, `lib/media.js`, `lib/projects.js`.

## Fixtures and Factories

**Test Data:** None. The nearest thing is the eighteen-project placeholder dataset `PROJECTS` in `components/ring/projects.js`, which doubles as the production fallback when Notion is unconfigured or failing (`lib/cms/projects.js`). It makes the app runnable with no credentials, which is the closest this repo has to a fixture-based smoke test: run `npm run dev` with no `.env.local` and the site should still render.

**Location:** `.env.example` documents the variables; `.env.local` exists locally and is gitignored (never read or quote it).

## Coverage

**Requirements:** None enforced. No coverage tooling, no thresholds, no CI config in the repo (no `.github/`, no pipeline files; deploys go through Vercel per `.vercel` ignore entry and a `Dockerfile`/`compose.yaml` for container use).

**View Coverage:** Not available.

## Test Types

**Unit Tests:** None.

**Integration Tests:** None.

**E2E Tests:** Not used.

**Script smoke checks (manual, not tests):** `scripts/generate-project-media.mjs` has operator flags that act as ad hoc verification of external credentials: `--check` (PUT a throwaway object and read it back to prove R2 credentials and bucket), `--probe` (one image to `.media-probe/`, no R2), `--dry-run` (plan only). These exercise real services and are not repeatable assertions.

## Areas Most Exposed By Having No Tests

Ordered by blast radius if broken silently.

**1. The layout loop and spin physics (`components/Carousel.jsx`, ~2160 lines)**
- What is not tested: per-frame layout (`tick` at ~line 1718), `refit()` band maths, `signedOffset` / ring-slot vs plane-index conversion, snap (decelerate-only) vs `pick` (accelerating tween), click-to-centre, the one-frame-stale `focusPos` latch, art dealt by negated ring slot, the load counter gate (`min(load progress, birth progress)`).
- Risk: an off-by-one in fan order or a sign flip between page Y (down) and world Y (up) produces a subtly wrong ring that still builds and lints. Pure maths that could be unit tested without a GPU is already isolated in `components/ring/utils.js` (`signedOffset`, `chase`, `radiusForCount`, `smoothstep`, `clamp01`) and is the cheapest first target.
- Priority: High.

**2. Pointer and touch handling (`components/Carousel.jsx` input section)**
- What is not tested: `pointer.inside` vs `engaged()`, press-and-hold gating on touch (`touchHold`, `touchSlop`), tap vs drag (`tapSlop`), drag distance from `clientX`/`clientY` (Safari `movementX` is 0 for touch), `touch-action: none` dependence.
- Risk: regressions show up only on real devices; desktop mouse testing will pass while swipes read as taps.
- Priority: High.

**3. Notion fallback precedence (`lib/cms/projects.js`, `lib/notion/projects.js`)**
- What is not tested: order Notion bundle -> per-instance `lastGood` -> local `PROJECTS` fallback; that the 18 placeholders are never stored inside `unstable_cache`; React `cache()` wrapping; `getCachedProjectBundle` error behaviour; slug generation and uniqueness (`slugify`, `uniqueSlug`) and media path/version building (`mediaPath`).
- Risk: a regression silently replaces the live project set with placeholder content in production, which is exactly the bug the in-code comment describes. Also `app/api/cms-stamp/route.js` and `components/CmsLive.jsx` polling logic (20s interval, stamp compare, `router.refresh()`), where rate-limit behaviour against Notion has already caused an incident.
- Priority: High.

**4. R2 SigV4 signing (`scripts/lib/r2.mjs`)**
- What is not tested: canonical request construction, header sorting and lower-casing, `uriEncode` handling of `!'()*`, scope/date derivation, signing-key chain, `Authorization` header format. This file has never been executed against a real bucket in the repo's history to prove it; `scripts/generate-project-media.mjs --check` is the only intended verification and needs live credentials.
- Risk: a signing bug returns 403 from R2 on every upload and is indistinguishable from bad credentials. The function is deterministic given a fixed date, so it is a good unit-test candidate against AWS's published SigV4 test vectors (inject the clock into `signedRequest`, which currently calls `new Date()` directly).
- Priority: High for the script's purpose; low for the live site, which reads R2 through a public base URL only.

**5. Booking flow (`lib/book/*`, `app/api/book/*`, `components/book/*`)**
- What is not tested: `issueForStep` validation per step, `isWebsiteValid` / `normalizeWebsite`, `parseClock` (12h/24h parsing), `slotStartMs` timezone conversion (DST-sensitive, uses `Intl.DateTimeFormat`), `isSlotOpen` against busy slots, `sanitizeDraft` truncation limits, attachment size cap (`MAX_ATTACHMENT_BYTES`).
- Risk: wrong slot offered or accepted in the wrong timezone; customer-facing. These are pure functions and the best value-for-effort unit tests in the repo after `ring/utils.js`.
- Priority: Medium to High.

**6. Webhook and cache-bust route (`app/api/revalidate/route.js`)**
- What is not tested: signature verification branch, the `verification_token` handshake, the no-secret fallback that accepts any body with a `type` field, GET secret check.
- Risk: auth bypass or failure to revalidate goes unnoticed. Priority: Medium.

**7. Shaders (`components/shaders/*.js`)**
- Covered by nothing before runtime. Priority: High, but not unit-testable in practice; mitigate with the manual protocol above, or a Playwright smoke test that loads `/` and fails on any `console.error`.

**8. Media pipeline (`app/api/media/[...parts]/route.js`, `lib/notion/gallery-pdf.js`, `lib/pdf.js`)**
- What is not tested: Notion signed-URL expiry handling (403/404 retry through `notionMediaUrl`), PDF page expansion and the `g\d+p\d+` slot format, refusal of non-PDF types.
- Priority: Medium.

## Common Patterns

There are none in the repo to copy. Guidance if a first test is added:

- Start with a Node built-in runner (`node --test`) on pure ESM modules so no dependency is added; these files use `@/` imports, so tests for them need either a loader that resolves the alias or relative imports. `components/ring/utils.js` and `scripts/lib/r2.mjs` have no alias imports and run under plain Node today.
- Add a `test` script to `package.json` at the same time, and add it to the pre-commit checklist next to `npm run lint` and `npm run build`.
- Do not mock Three.js to test the render loop; extract pure maths out of `components/Carousel.jsx` into `components/ring/` instead, which matches the existing direction of `utils.js`.

**Async Testing:** Not established.

**Error Testing:** Not established.

---

*Testing analysis: 2026-10-02*
