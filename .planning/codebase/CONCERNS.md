# Codebase Concerns

**Analysis Date:** 2026-10-02

Scope: full repo. Next.js 16.3.8 WebGL portfolio, live at `https://koussay.online` on Vercel. Projects are read from `content/projects` and images and share cards from media.koussay.online; the Notion projects path, PDF renderer and request-time image library were removed in Phase 3.

`AGENTS.md` describes the original single-page carousel. The repo has since grown project detail pages, a booking flow and API routes (`lib/`, `app/api/`, `app/project/`, `app/booking/`, `components/project/`, `components/book/`). `AGENTS.md` does not cover any of this. See "AGENTS.md Staleness".

## Licensing and Provenance (highest priority)

**Unlicensed third-party artwork in a public repo:**
- Resolved in Phase 2: the placeholder art, `404.webp` and the fallback data are removed and remain in git history. LICENSE now states who owns the media served from media.koussay.online.

**Commercial font bundled and served in production:**
- Resolved in Phase 1: every face is now Geist or Geist Mono under OFL 1.1. The commercial face and the Satoshi files were removed, and removed files remain in git history.

**Invented project metadata:**
- Resolved in Phase 2: the invented `type` and `year` rows are removed with the placeholder list and remain in git history.

**MIT licence copyright holder and remote are not the site owner:**
- Issue: `LICENSE` names "Yousuf Soomro" as copyright holder. The first commits are authored by `Yousuf-developer`. `origin` is `https://github.com/Loomlyne/Koussay-Portfolio`. The code is a fork or adaptation of another developer's carousel, now deployed as Koussay's commercial portfolio.
- Files: `LICENSE`, `README.md`, git history
- Impact: MIT requires the notice to stay with the code, so it must not be removed. Also `README.md` presents the work as the repo owner's with no upstream credit line. The shader in `components/shaders/planeShaders.js` carries a separate MIT simplex-noise notice that must travel with it.
- Fix approach: Confirm the provenance, keep the upstream notice, and add an explicit attribution line to the README if the code is derived.

**Pasted third-party docs file at repo root:**
- Issue: `shader` (13,315 bytes, no extension) is a paste of a component-library documentation page (nav text such as "Components / Blocks / Templates ... 45.4K"). It is not code and is not referenced.
- Files: `shader`
- Impact: Possible copyright issue and repo noise. `AGENTS.md` lists it as safe to delete.
- Fix approach: `git rm shader`.

**Vendored Higgsfield skills committed:**
- Issue: `.agents/skills/` holds 8 third-party skill folders (102 tracked files, 1.2 MB, pinned by hashes in `skills-lock.json`). They are tooling for the authoring agent and have no runtime role. Their licence is unreviewed.
- Files: `.agents/skills/**`, `skills-lock.json`
- Impact: Bloats a public repo. Any licence terms on that content are unreviewed.
- Fix approach: Gitignore `.agents/` and keep `skills-lock.json` for reinstall, or remove them if the Higgsfield pipeline is abandoned.

## Security Considerations

**Dependency advisories (resolved in Phase 3):**
- `next` is 16.3.8 and `sharp` is ^0.35.5, which clear the advisories reported on 2026-10-02. `next/og` is no longer used and `sharp` is a devDependency used only by scripts. Re-run `npm audit` before each ship.

**Open booking and draft endpoints with no rate limiting or bot control:**
- Risk: `POST /api/book/draft` (`app/api/book/draft/route.js`) is unauthenticated. Each call with a name or email upserts a Notion page, and a first call (no `draft.id`) emails the owner through Resend with `replyTo` set to the attacker-supplied address. A script can flood the inbox, burn Resend quota and fill the bookings database. `POST /api/book` likewise accepts attachments up to 4 MB and emails the supplied address a "You're booked" message (`lib/mail/booking.js` `sendBookingEmails`), which allows using the site to send mail to arbitrary third parties. The optional research step (`lib/book/research.js`, Firecrawl plus Gemini or OpenAI) also spends paid API credit per submission.
- Files: `app/api/book/draft/route.js`, `app/api/book/route.js`, `lib/mail/booking.js`, `lib/book/research.js`, `lib/notion/bookings.js`
- Current mitigation: Field validation in `lib/book/validate.js` (email regex, slot checks, length caps in `lib/book/draft.js`). No captcha, no throttle, no origin check.
- Recommendations: Add a rate limit (Vercel firewall or an edge KV counter), a honeypot or Turnstile, and cap draft emails per address.

**Slot locking is per-instance memory only:**
- Risk: `pendingStarts` in `lib/book/time.js` is a module-level `Set`. On Vercel each lambda instance has its own copy, so two concurrent requests landing on different instances can both claim the same slot. The Notion re-check in `app/api/book/route.js` narrows but does not close the window, because the Notion page is created later in the same request. Double bookings are possible under load.
- Files: `lib/book/time.js`, `app/api/book/route.js`
- Recommendations: Treat Notion as the single source of truth, or add a shared lock (KV).

**Secrets handling:**
- `.env.local` exists locally (gitignored via `.env*`, with `!.env.example`). `.env.example` lists variable names only. No secrets were read or found in tracked files.

## Never-Executed New Code

**Hand-rolled SigV4 for R2:**
- Issue: `scripts/lib/r2.mjs` (140 lines) implements AWS Signature V4 by hand (`signedRequest`, `putObject`, `headObject`). It has uploaded the media and share cards but has no known-answer test. Risks: canonical-header and path-encoding edge cases, `x-amz-content-sha256` over a streamed body, `cache-control` being a signed header, region `auto` scope, and a `Buffer` body on `fetch` PUT.
- Files: `scripts/lib/r2.mjs`, `scripts/media.mjs`
- Impact: A regression may fail with `SignatureDoesNotMatch`, or silently store wrong content types and cache headers.
- Fix approach: Run `--probe` and one real upload against a scratch bucket, and read the object back (`headObject` then a public GET). Prefer `@aws-sdk/client-s3` or Cloudflare's S3 client rather than maintaining signing code. Add a known-answer test against AWS's published SigV4 vectors.

**Higgsfield generation pipeline:**
- Issue: `scripts/media.mjs`, `scripts/lib/higgsfield.mjs` and `scripts/lib/art-direction.mjs` generate paid media. The free Higgsfield plan cannot generate (see memory note), so generation has not been run end to end. The earlier Notion seed script was removed in Phase 1 and remains in git history.
- Files: `scripts/media.mjs`, `scripts/lib/higgsfield.mjs`, `scripts/lib/art-direction.mjs`
- Impact: Credit spend and writes to the R2 bucket and manifest with no safety net. The manifest gate is the only protection against repeat spend.
- Fix approach: Keep `--dry-run` and `--probe` as the default workflow.

**Scripts depend on devDependencies:**
- `scripts/media.mjs` imports `sharp`, and the share renderer imports `fontkit` and reads `geist`. All are devDependencies, which is correct: no runtime code imports them. Dockerfile and Vercel builds do not use the scripts.

## Tech Debt

**`Carousel.jsx` size:**
- `components/Carousel.jsx` is 2,161 lines (`AGENTS.md` says ~1,400). The single-file shape is deliberate (about twenty shared closure variables), but it has grown by roughly 50% with project open, shared transitions and `homeRingContext`. See Fragile Areas.

**Fonts and images are unoptimised:**
- Fonts: resolved in Phase 1. Geist and Geist Mono ship as variable woff2 under `public/fonts/`; removed files remain in git history.
- Images: resolved in Phase 2. Covers are 1600 px WebP on R2 (26-208 KB each); the old `public/*.webp` art is removed and remains in git history.
- Fix approach: `public/favicon.ico` and `public/logo.png` are byte-identical 512x512 PNGs (170,906 bytes each); the `.ico` is mislabelled. Replace with a real multi-size ico and a smaller logo.

**Deprecated config assumption in Dockerfile:**
- `Dockerfile` builds `output: "standalone"` only when `VERCEL !== "1"` (`next.config.mjs`). The Docker path is not exercised in CI (no CI exists) and `compose.yaml` has no env wiring, so the container has no Notion or Resend keys. README says Node 20+, Dockerfile uses `node:22-alpine`, and `package.json` has no `engines` field.

## Known Bugs and Gaps (AGENTS.md verified)

**Unverified production state:**
- A user report (4 Sep 2026) of a 16 to 20s cold load on CHARGING 001 came from the Notion media proxy, now removed. Verify the cold load on the live URL after the next ship.

**`prefers-reduced-motion` is not handled by the ring (AGENTS.md gap 4 is accurate for the ring):**
- `components/Carousel.jsx` has no `prefers-reduced-motion` check (only `(pointer: coarse)` at line 120). The ~6s animated entry, goo and blur run for everyone. Reduced-motion is handled only for page transitions (`components/SharedTransitionProvider.jsx:43`, `components/project/ProjectPagerTransition.jsx:26`) and in CSS (`app/globals.css:366`, `:508`, `app/project/[slug]/page.module.css:926`, `app/booking/page.module.css:1058`). `components/SmoothScroll.jsx` has no reduced-motion branch either.
- Fix approach: Read the media query once at mount, skip the entry timeline (jump to the end state), disable the spin physics blur, and subscribe to changes.

**No keyboard control of the ring (AGENTS.md gap 5, partly stale):**
- There is no `keydown` handler in `components/Carousel.jsx` (grep confirms), so arrow keys do not step the ring. Partly addressed, though: the project index at `components/Carousel.jsx` ~line 1980 now holds real `<button>` elements with `aria-label="Show {name}"` calling `pickProjectRef`, and a sr-only `<nav aria-label="Project navigation">` (line ~2013) exposes every project as a link that appears on focus. The list is `pointer-events-auto`, so the claim that the column cannot be clicked is stale (the comment above it still says "Never takes the pointer", which now contradicts the class).
- Fix approach: Add ArrowUp/ArrowDown/Home/End on the canvas wrapper. Fix the stale comment.

**Everything else in "Known gaps" re-checked:**
- Gap 1 (click opens nothing): STALE. `openForPlane` at `components/Carousel.jsx:~776-830` pushes `/project/${project.slug}` through `routerRef.current.push` after the shared transition. Detail routes exist at `app/project/[slug]/page.js`.
- Gap 2 (fonts ~340 KB): accurate, 341,656 bytes.
- Gap 3 (art oversized): resolved in Phase 2; covers are 1600 px WebP on R2 and the old files remain in git history.
- Gap 6 (placeholder data): resolved in Phase 2; the fallback and its data are removed and remain in git history.
- Gap 7 (phone widths approximate): not re-verified; needs a device check.

## AGENTS.md Staleness

- Layout section lists only `app/page.js`, `layout.js`, `globals.css` and `components/Carousel.jsx`, `ring/`, `shaders/`. Missing: `lib/` (book, notion, mail, project), `app/api/*`, `app/booking`, `app/project/[slug]`, `components/project/`, `components/book/`, `components/SharedTransitionProvider.jsx`, `components/HomeRing.jsx`, `components/homeRingContext.js`, `scripts/`, `.agents/`.
- "`app/page.js` renders `<Carousel />`, nothing else" is stale: it fetches `getProjects()`, preloads covers, and renders `RegisterHome` and JSON-LD.
- "`Carousel.jsx` is ~1400 lines" is stale (2,161).
- "Commands" remains true.
- "Project column is `pointer-events-none`" is stale (see keyboard item).
- `README.md` Quick start now says projects need no keys because content is in the repo; the Notion, Resend and R2 variables are listed in `.env.example`.

## Test Coverage Gaps

**No tests at all:**
- Resolved in part in Phase 1: `npm test` runs a Playwright smoke test (`tests/smoke.spec.mjs`, port 3100, desktop 1512 and phone 390). It is a control-session gate with `format:check`, `lint` and `build`. No git hook, no CI. Unit logic is still untested.
- Files with the highest risk and best testability: `lib/book/time.js` (timezone maths, `slotStartMs` loops 4 iterations around DST edges, `wallDateTime` midnight roll-over), `lib/book/validate.js`, `lib/book/draft.js`, `scripts/lib/r2.mjs` (signing), `components/ring/utils.js` (`signedOffset`, `chase`).
- Risk: Booking logic (money-adjacent, customer-facing) can regress silently. A shader typo is invisible to `next build` because GLSL compiles at runtime (`components/shaders/planeShaders.js`, `textShaders.js`), so it ships clean and fails in the browser console.
- Priority: High for `lib/book/*` and `scripts/lib/r2.mjs`. A single Playwright smoke test that loads `/` and fails on any `console.error` or a missing `canvas` would catch shader and context regressions.

## Fragile Areas

These are deliberate designs from `AGENTS.md`, not defects. Any change must preserve them.

**Packed `uScale` vec4:**
- Files: `components/shaders/planeShaders.js`, `components/Carousel.jsx`
- Why: `xy` is birth scale, `z` brightness, `w` atlas cell. GLSL ES charges a full vec4 row per array element, and the budget is 224 rows, so a separate `float[32]` would cost 32 more. `MAX_PLANES = 32` (`planeShaders.js:5`) is imported by `lib/content.js` and `lib/projects.js`, so the uniform budget caps project count too.

**One-frame-stale side-card focus:**
- Files: `components/Carousel.jsx` (`focusPos`)
- Why: The hit test runs inside the layout loop but every plane needs its answer first. `focusPos` is latched at end of frame and eased over ~10 frames. Do not "fix" it by running the hit test earlier.

**Snap can only decelerate; click-to-centre tweens `state.spin` with momentum suspended (`picking`):**
- Files: `components/Carousel.jsx`
- Why: The snap is a run-in for a nearly spent throw. A pick starts from rest, so it must accelerate. Do not route `pick` through the snap.

**Art dealt by negated ring slot (`cellOf(slot)`), fan-order plane indices:**
- Files: `components/Carousel.jsx`, `components/ring/utils.js` (`signedOffset`)
- Why: Consecutive plane indices sit on opposite sides of the ring. Dealing by index makes the project column step two names per slot. The negation is because forward turns walk the front slot backwards. The same ordering feeds `openForPlane` (`ring[cellOf(signedOffset(plane))]`), so a click opens the project the card shows.

**`ORDER` in `content/projects/index.mjs` is ring order:**
- Files: `content/projects/index.mjs`. Reordering `ORDER` is the only way to change sequence; do not use `imageOffset`.

**Three-row meta morph:**
- Files: `components/ring/meta.js`, labels rendered in `components/Carousel.jsx` (~line 2030 on)
- Why: Two stacked copies fuse under an alpha threshold, which also thickens unchanged words during the morph. The third row sits outside the filtered subtree. All three rows always carry all words.

**Touch is not a mouse:**
- Files: `components/Carousel.jsx`
- Why: `pointer.inside` is separate from `engaged()`. Safari gives `movementX` of 0 on touch, so drag distance uses `clientX/clientY`. `touch-action: none` on the canvas is load-bearing.

**`forceContextLoss()` on cleanup:**
- Files: `components/Carousel.jsx:1957`
- Why: `renderer.dispose()` leaves the GL context alive. StrictMode double mounts and HMR pile contexts up past the ~16 limit and the page goes blank with no canvas in the DOM. Do not remove.

**Load counter is the gate:**
- Files: `components/Carousel.jsx`, `components/ring/atlas.js`
- Why: The entry fires when the counter reads 100 (min of load and birth progress). The atlas never rejects: a missing file leaves a blank cell and counts as settled, so one bad path cannot strand the entry. A failsafe opens the ring if the facing cell is late.

**Ring depends on project count:**
- Files: `components/ring/utils.js` (`radiusForCount`), `components/ring/params.js` (`ringRefCount: 18`), `frontTarget` in `components/Carousel.jsx`
- Why: Radius scales with project count and the hub is moved so the front card stays centred. Adding or removing projects changes the composition. Re-check at 11 and at 32.

**Font family names looked up by string:**
- Files: `components/ring/params.js`, `components/ring/gui.js`, `app/globals.css`. A mismatch falls back to system sans with no error.

**Refit on resize only:**
- Files: `components/Carousel.jsx` (`refit()`). Band flags are stored, not resolved values.

**Shared transition and warm-up choreography:**
- Files: `components/SharedTransitionProvider.jsx`, `components/project/ProjectPagerTransition.jsx`, `components/project/ProjectWarm.jsx`, `lib/project/warm.js`, `components/HomeRing.jsx`, `components/homeRingContext.js`
- Why: Click to detail depends on a generation counter (`openGen`), refs mirrored from router state, and a persisted home ring (`RegisterHome` in `app/page.js` and `app/project/[slug]/page.js`). Navigation race conditions are easy to introduce. No tests cover any of it.

## Scaling Limits

**Project count:**
- Limit: `MAX_PLANES = 32` (uniform array size in `components/shaders/planeShaders.js`). `indexProjects` caps the list at 32. Atlas texture size grows with `ceil(sqrt(n))` cells of 512 px, so 32 projects makes a 3072 x 1364 canvas (6 x 6 grid of 512 x 341).

**Booking throughput:** Single-owner calendar with one-hour slots. Concurrency is in-memory (see Security). `maxDuration = 60` on `/api/book` with research running in `after()`.

## Dependencies at Risk

**`next` pinned exactly at 16.3.8 with `experimental` flags:**
- Risk: `experimental.staleTimes` and `optimizePackageImports` are experimental. `AGENTS.md` warns the Next.js version differs from training data; read `node_modules/next/dist/docs/` before changing routing, caching or `next/og` code.

**`@notionhq/client` ^5.26.0 with `dataSources` API:** the code supports both database id and data source id in `lib/notion/client.js` (`dataSourceId`). A Notion API shape change now affects bookings only; projects are in the repo.

**`three` ^0.185.1 and `gsap`:** `three` is imported as `import * as THREE` in `components/ring/atlas.js`; verify tree-shaking if bundle size matters.

## Missing Critical Features

**Fail-closed project content:** resolved in Phase 2. `lib/content.js` throws at build on bad content and no placeholder list exists; the removed files remain in git history.

**CI:** No workflow runs `npm run build`, `npm run lint` or `npm audit`. The only gate is Vercel's build.

**Monitoring:** `@vercel/speed-insights` is the only telemetry. `compiler.removeConsole` strips all console output except `error` in production (`next.config.mjs`), so `console.warn` and `console.info` calls never reach Vercel logs.

---

*Concerns audit: 2026-10-02*
