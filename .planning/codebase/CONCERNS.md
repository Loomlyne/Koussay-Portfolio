# Codebase Concerns

**Analysis Date:** 2026-10-02

Scope: full repo. Next.js 16.3.0 WebGL portfolio, live at `https://koussay.online` on Vercel. Content comes from a Notion CMS; the 18 local placeholder projects are the fallback.

`AGENTS.md` describes the original single-page carousel. The repo has since grown a Notion CMS, project detail pages, a booking flow and API routes (`lib/`, `app/api/`, `app/project/`, `app/booking/`, `components/project/`, `components/book/`). `AGENTS.md` does not cover any of this. See "AGENTS.md Staleness".

## Licensing and Provenance (highest priority)

**Unlicensed third-party artwork in a public repo:**
- Issue: The 18 images `public/1.webp` to `public/18.webp` (plus `public/404.webp`) are other people's work, collected from Behance, with no licence and no credit. `README.md` (section "About the artwork", ~line 244) and `LICENSE` disclose this and invite takedown requests. The disclosure does not grant any rights.
- Files: `public/1.webp` to `public/18.webp`, `public/404.webp`, `components/ring/projects.js`, `README.md`, `LICENSE`
- Impact: Copyright exposure on a public GitHub repo and on a live commercial site. These files are served by Vercel from `public/` and are the ring content whenever Notion is unconfigured or fails. `lib/cms/projects.js` returns `FALLBACK` on a cold Notion failure with no `lastGood`, so the live ring can show the Behance art. Every image is also in git history (first added in commit `a438cfb`) and is not removable by deleting the files.
- Fix approach: Replace the images with owned work, or with generated media once the Higgsfield to R2 pipeline works (`scripts/generate-project-media.mjs`). Remove `public/*.webp` from the tree and, if takedown risk matters, rewrite history. Make the production fallback an owned neutral set, or fail closed (empty ring and error state) instead of showing the placeholders. Keep the `README.md` and `LICENSE` notices until the files are gone, per `AGENTS.md`.

**Commercial font bundled and served in production:**
- Resolved in Phase 1: every face is now Geist or Geist Mono under OFL 1.1. The commercial face and the Satoshi files were removed, and removed files remain in git history.

**Invented project metadata:**
- Issue: Every `type` and `year` in `components/ring/projects.js` is invented. Names marked `// *` are guesses. `detail` copy is built by `prototypeDetail(...)` and is "placeholder copy only". `TODO` at `components/ring/projects.js:6` records this.
- Files: `components/ring/projects.js` (469 lines), consumed by `lib/projects.js` (`PROJECTS`, `IMAGE_FILES`) and `lib/cms/projects.js` (`FALLBACK`)
- Impact: If the fallback ever renders in production, invented dates and disciplines are attributed to someone else's art, next to the author's name and JSON-LD (`lib/seo.js` `projectListSchema`). `shareImageAlt` in `lib/projects.js` writes "X cover. Type (Year) by Koussay Zayani." for these rows, so placeholder art is credited to Koussay in alt text, OG tags and structured data.
- Fix approach: Remove the fallback data. See the first item above.

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

**Known critical and high advisories in pinned dependencies:**
- Risk: `npm audit --omit=dev` (run 2026-10-02) reports `next` 16.0.0 to 16.3.5 as critical: RCE in `next/og` ImageResponse (GHSA-vcvr-r3jv-pc5j), RCE in the Image Optimization API with AVIF (GHSA-2xp9-vwfh-vxw4), and a Windows-host RCE advisory. It also reports `sharp` <= 0.35.4-rc.0 as high (libvips and libheif CVEs).
- Files: `package.json` (`"next": "16.3.0"` pinned exactly, `"sharp": "^0.34.4"`), `app/opengraph-image.js`, `app/project/[slug]/opengraph-image.js`, `app/booking/opengraph-image.js`, `lib/og-image.js` (these use `next/og`), `app/api/media/[...parts]/route.js` (runs `sharp` on bytes fetched from Notion)
- Current mitigation: Vercel hosts the site, so the Windows advisory is not applicable. The other two are applicable to this app's own routes.
- Recommendations: Upgrade `next` and `eslint-config-next` together to 16.3.8 or later (outside the pinned version, so a deliberate bump). Upgrade `sharp` to 0.35.5 or later, which is a breaking change, and re-test `optimize()` and `scripts/generate-project-media.mjs`. Re-run `npm audit` afterwards.

**Unauthenticated cache-bust when no webhook secret is set:**
- Risk: In `app/api/revalidate/route.js` POST, if `NOTION_WEBHOOK_SECRET` is unset the only check is `!body?.type`. Any caller sending JSON with a `type` field passes and triggers `bustProjectsCache()`, which calls `revalidateTag`, `revalidatePath("/")`, `revalidatePath("/project", "layout")` and `revalidatePath("/api/media", "layout")`. Each bust forces Notion re-queries and re-renders, so repeated calls can exhaust the Notion rate limit. A 429 from Notion has already blanked the ring before (see `lib/notion/client.js` comments).
- Files: `app/api/revalidate/route.js`
- Current mitigation: Signature verification applies once the secret is set.
- Recommendations: Fail closed when the secret is missing (401 for every request except the one-time verification handshake). Stop accepting the secret in the GET query string (`?secret=`): URLs end up in access logs and referrers. The handshake branch also writes the posted `verification_token` to the log with `console.info`; after setup, disable it.

**Open booking and draft endpoints with no rate limiting or bot control:**
- Risk: `POST /api/book/draft` (`app/api/book/draft/route.js`) is unauthenticated. Each call with a name or email upserts a Notion page, and a first call (no `draft.id`) emails the owner through Resend with `replyTo` set to the attacker-supplied address. A script can flood the inbox, burn Resend quota and fill the bookings database. `POST /api/book` likewise accepts attachments up to 4 MB and emails the supplied address a "You're booked" message (`lib/mail/booking.js` `sendBookingEmails`), which allows using the site to send mail to arbitrary third parties. The optional research step (`lib/book/research.js`, Firecrawl plus Gemini or OpenAI) also spends paid API credit per submission.
- Files: `app/api/book/draft/route.js`, `app/api/book/route.js`, `lib/mail/booking.js`, `lib/book/research.js`, `lib/notion/bookings.js`
- Current mitigation: Field validation in `lib/book/validate.js` (email regex, slot checks, length caps in `lib/book/draft.js`). No captcha, no throttle, no origin check.
- Recommendations: Add a rate limit (Vercel firewall or an edge KV counter), a honeypot or Turnstile, and cap draft emails per address.

**Slot locking is per-instance memory only:**
- Risk: `pendingStarts` in `lib/book/time.js` is a module-level `Set`. On Vercel each lambda instance has its own copy, so two concurrent requests landing on different instances can both claim the same slot. The Notion re-check in `app/api/book/route.js` narrows but does not close the window, because the Notion page is created later in the same request. Double bookings are possible under load.
- Files: `lib/book/time.js`, `app/api/book/route.js`
- Recommendations: Treat Notion as the single source of truth, or add a shared lock (KV).

**Media proxy is open to any page id the integration can read:**
- Risk: `app/api/media/[...parts]/route.js` accepts any 32-hex page id, and `cachedNotionMediaUrl` (`lib/notion/projects.js`) falls back to a live `pages.retrieve` when the id is not in the cached bundle. This spends Notion API budget on arbitrary ids and lets anyone probe pages shared with the integration, including the bookings database. The response sets `Access-Control-Allow-Origin: *`. The PDF branch (`pdfjs-dist`, `@napi-rs/canvas`) renders attacker-chosen pages with up to 48 pages at 1600px width, within a 30s `maxDuration`.
- Files: `app/api/media/[...parts]/route.js`, `lib/notion/projects.js`, `lib/pdf.js`
- Current mitigation: Only the `Cover`, `Image`, `Thumbnail` and `Gallery` properties or page cover are read (`fileUrlFor`). Unknown ids 404.
- Recommendations: Resolve only ids that appear in the cached bundle. Drop the live `pages.retrieve` fallback or rate limit it. Restrict CORS to the site origin.

**Secrets handling:**
- `.env.local` exists locally (gitignored via `.env*`, with `!.env.example`). `.env.example` lists variable names only. No secrets were read or found in tracked files.

## Never-Executed New Code

**Hand-rolled SigV4 for R2:**
- Issue: `scripts/lib/r2.mjs` (140 lines) implements AWS Signature V4 by hand (`signedRequest`, `putObject`, `headObject`). It has never made a successful request against real R2 credentials. Risks: canonical-header and path-encoding edge cases, `x-amz-content-sha256` over a streamed body, `cache-control` being a signed header, region `auto` scope, and a `Buffer` body on `fetch` PUT.
- Files: `scripts/lib/r2.mjs`, `scripts/generate-project-media.mjs`
- Impact: The first real run may fail with `SignatureDoesNotMatch`, or silently store wrong content types and cache headers.
- Fix approach: Run `--probe` and one real upload against a scratch bucket, and read the object back (`headObject` then a public GET). Prefer `@aws-sdk/client-s3` or Cloudflare's S3 client rather than maintaining signing code. Add a known-answer test against AWS's published SigV4 vectors.

**Higgsfield generation pipeline:**
- Issue: `scripts/generate-project-media.mjs` (376 lines), `scripts/lib/higgsfield.mjs` and `scripts/lib/art-direction.mjs` were added in the latest commits (`b427f41`, `3449e2f`, `e385e65`). The free Higgsfield plan cannot generate (see memory note), so generation has not been run end to end. The earlier Notion seed script was removed in Phase 1 and remains in git history.
- Files: `scripts/generate-project-media.mjs`, `scripts/lib/higgsfield.mjs`, `scripts/lib/art-direction.mjs`
- Impact: Credit spend and writes to the live CMS with no safety net. The manifest gate is the only protection against repeat spend.
- Fix approach: Keep `--dry-run` and `--probe` as the default workflow.

**`@higgsfield/client` is a devDependency but scripts import `sharp`:**
- `scripts/generate-project-media.mjs` imports `sharp`, which is a runtime dependency. This works only because both are installed. Dockerfile and Vercel builds do not use the scripts.

## Tech Debt

**Native Node binaries block Cloudflare Workers and add build coupling:**
- Issue: `sharp`, `@napi-rs/canvas`, `pdfjs-dist` and `unpdf` are native or Node-only. `serverExternalPackages` and a manual `outputFileTracingIncludes` block in `next.config.mjs` ship the `@napi-rs/canvas-linux-{x64,arm64}-{gnu,musl}` builds for `/api/media/**` and `/project/**`. The same list is duplicated for both globs.
- Files: `next.config.mjs`, `lib/pdf.js`, `lib/notion/gallery-pdf.js`, `app/api/media/[...parts]/route.js`, `package.json`
- Impact: The default stack for other products is Cloudflare, and this app cannot run on Workers as built. A Vercel trace regression drops the binaries and PDF pages 404 only in production (see commit `dc18b8b`). Memory cost: `byteCache` in `lib/pdf.js` holds up to 6 PDFs in each instance.
- Fix approach: Move PDF rasterising and image optimisation to authoring time (convert PDFs to page images in R2 at publish), then serve static R2 URLs. That removes all four packages from the runtime and the tracing block. Until then, factor the shared glob list in `next.config.mjs` into one constant.

**Media latency is slow by construction:**
- Issue: Notion signed file URLs expire in about an hour. `app/api/media/[...parts]/route.js` runs with `cache: "no-store"` upstream, so each cache miss does: resolve the URL (`cachedNotionMediaUrl`, falling back to `pages.retrieve` on 403/404), fetch the file (20s timeout), render a PDF page if needed (`renderPdfPage`, 1600px), and `sharp` re-encode to WebP q80 at max 1600px. Only a versioned URL (`?v=`) gets `Cache-Control: public, max-age=31536000, immutable`. An unversioned request is `no-store`, and `HEAD` runs the whole pipeline too. `app/project/[slug]/page.js` additionally expands PDF galleries during render (`withExpandedPdfGallery`), downloading the PDF at page-build time.
- Files: `app/api/media/[...parts]/route.js`, `lib/notion/projects.js`, `lib/pdf.js`, `lib/notion/gallery-pdf.js`, `lib/media.js`
- Impact: Cold ring load depends on up to 18 sequential-ish media renders. The prior incident ("CHARGING 001" for 16 to 20 seconds, `docs/NEXT-SESSION-PROMPT.md`) came from this chain and from Notion 429s. `retry: false` and `timeoutMs: 4000` on the Notion client mean a blip becomes a hard failure instead of a retry.
- Fix approach: Mirror media to R2 once (the pipeline in `scripts/` is the start) and use stable public URLs. Remove the proxy from the hot path.

**Cache and polling layering is complex:**
- `unstable_cache` in `lib/notion/projects.js` (`cms-stamp` revalidate 20, `cms-projects-v2` revalidate 60), `lib/notion/client.js` (`cachedDataSourceId`, 3600), page-level `revalidate = 60` in `app/page.js` and `app/project/[slug]/page.js`, `experimental.staleTimes` in `next.config.mjs`, a webhook bust (`app/api/revalidate/route.js`), and a 20s client poll (`components/CmsLive.jsx` calling `/api/cms-stamp`, which in turn queries Notion). Every open tab polls every 20s and each poll can hit Notion on a cold cache. `getProjects` in `lib/cms/projects.js` keeps a per-instance `lastGood`, so instances can disagree during an outage.
- Fix approach: Remove the poll once the webhook is verified, or move to a push channel. Keep the cache key version comment in `lib/notion/projects.js` current when the payload shape changes.

**`Carousel.jsx` size:**
- `components/Carousel.jsx` is 2,161 lines (`AGENTS.md` says ~1,400). The single-file shape is deliberate (about twenty shared closure variables), but it has grown by roughly 50% with project open, shared transitions and `homeRingContext`. See Fragile Areas.

**`components/TwoPlaneMorph.jsx` is dead:**
- 236 lines, imported nowhere (confirmed by grep across tracked files; only `AGENTS.md` mentions it). Safe to delete. It still pulls `three` and `gsap` into lint scope.

**Fonts and images are unoptimised:**
- Fonts: resolved in Phase 1. Geist and Geist Mono ship as variable woff2 under `public/fonts/`; removed files remain in git history.
- Images: `public/` is 3.6 MB (3,699,985 bytes tracked). `public/1.webp` is 688,026 bytes and `public/10.webp` is 559,944. `components/ring/atlas.js` draws each into a 512 x 341 cell (`cellW = 512`, `cellH = cellW / 1.5`), so resolution beyond that is never shown. The ring is served from `public/` only in the fallback case; in the Notion case, covers pass through `/api/media/` and are capped at 1600px, which is still about 3x larger than the atlas needs.
- Fix approach: Resize sources (or the proxy output for ring covers) to about 1024 x 683, convert fonts to `woff2`. `public/favicon.ico` and `public/logo.png` are byte-identical 512x512 PNGs (170,906 bytes each); the `.ico` is mislabelled. Replace with a real multi-size ico and a smaller logo.

**Deprecated config assumption in Dockerfile:**
- `Dockerfile` builds `output: "standalone"` only when `VERCEL !== "1"` (`next.config.mjs`). The Docker path is not exercised in CI (no CI exists) and `compose.yaml` has no env wiring, so the container has no Notion or Resend keys. README says Node 20+, Dockerfile uses `node:22-alpine`, and `package.json` has no `engines` field.

## Known Bugs and Gaps (AGENTS.md verified)

**Unverified production state:**
- `docs/NEXT-SESSION-PROMPT.md` records a user report (4 Sep 2026) of a 16 to 20s load on CHARGING 001, with fixes "local until deployed" and a to-do list of checks. Nothing in the repo shows these were confirmed in production. Verify on the live URL.

**`prefers-reduced-motion` is not handled by the ring (AGENTS.md gap 4 is accurate for the ring):**
- `components/Carousel.jsx` has no `prefers-reduced-motion` check (only `(pointer: coarse)` at line 120). The ~6s animated entry, goo and blur run for everyone. Reduced-motion is handled only for page transitions (`components/SharedTransitionProvider.jsx:43`, `components/project/ProjectPagerTransition.jsx:26`) and in CSS (`app/globals.css:366`, `:508`, `app/project/[slug]/page.module.css:926`, `app/booking/page.module.css:1058`). `components/SmoothScroll.jsx` has no reduced-motion branch either.
- Fix approach: Read the media query once at mount, skip the entry timeline (jump to the end state), disable the spin physics blur, and subscribe to changes.

**No keyboard control of the ring (AGENTS.md gap 5, partly stale):**
- There is no `keydown` handler in `components/Carousel.jsx` (grep confirms), so arrow keys do not step the ring. Partly addressed, though: the project index at `components/Carousel.jsx` ~line 1980 now holds real `<button>` elements with `aria-label="Show {name}"` calling `pickProjectRef`, and a sr-only `<nav aria-label="Project navigation">` (line ~2013) exposes every project as a link that appears on focus. The list is `pointer-events-auto`, so the claim that the column cannot be clicked is stale (the comment above it still says "Never takes the pointer", which now contradicts the class).
- Fix approach: Add ArrowUp/ArrowDown/Home/End on the canvas wrapper. Fix the stale comment.

**Everything else in "Known gaps" re-checked:**
- Gap 1 (click opens nothing): STALE. `openForPlane` at `components/Carousel.jsx:~776-830` pushes `/project/${project.slug}` through `routerRef.current.push` after the shared transition. Detail routes exist at `app/project/[slug]/page.js`.
- Gap 2 (fonts ~340 KB): accurate, 341,656 bytes.
- Gap 3 (art oversized): accurate. 3.3 MB across the 18 `public/N.webp` files plus 404.webp; `public/` total is 3.6 MB.
- Gap 6 (placeholder data): partly stale. Live content is Notion (the note in `docs/NEXT-SESSION-PROMPT.md` says 11 published covers). The placeholders are now only the fallback in `lib/cms/projects.js`, but that fallback is reachable in production. See Licensing.
- Gap 7 (phone widths approximate): not re-verified; needs a device check.

## AGENTS.md Staleness

- Layout section lists only `app/page.js`, `layout.js`, `globals.css` and `components/Carousel.jsx`, `ring/`, `shaders/`. Missing: `lib/` (book, cms, notion, mail, project), `app/api/*`, `app/booking`, `app/project/[slug]`, `components/project/`, `components/book/`, `components/SharedTransitionProvider.jsx`, `components/HomeRing.jsx`, `components/homeRingContext.js`, `components/CmsLive.jsx`, `scripts/`, `.agents/`.
- "`app/page.js` renders `<Carousel />`, nothing else" is stale: it fetches `getProjects()`, preloads covers, and renders `RegisterHome` and JSON-LD.
- "`Carousel.jsx` is ~1400 lines" is stale (2,161).
- "Commands" remains true.
- "Project column is `pointer-events-none`" is stale (see keyboard item).
- `docs/NEXT-SESSION-PROMPT.md` is a dated session handoff (September 2026) that duplicates and partly contradicts `AGENTS.md` ("Live Notion currently has 11 published covers"). Treat it as a log, not a spec.
- `README.md` Quick start tells readers to run with no env, which works only through the placeholder fallback. It does not mention the Notion, Resend or R2 variables listed in `.env.example`.

## Test Coverage Gaps

**No tests at all:**
- Resolved in part in Phase 1: `npm test` runs a Playwright smoke test (`tests/smoke.spec.mjs`, port 3100, desktop 1512 and phone 390). It is a control-session gate with `format:check`, `lint` and `build`. No git hook, no CI. Unit logic is still untested.
- Files with the highest risk and best testability: `lib/book/time.js` (timezone maths, `slotStartMs` loops 4 iterations around DST edges, `wallDateTime` midnight roll-over), `lib/book/validate.js`, `lib/media.js` (`parseMediaSlot`), `lib/notion/projects.js` (`mapPage`, slug uniqueness, ordering, `MAX_PLANES` cap of 32), `lib/book/draft.js`, `scripts/lib/r2.mjs` (signing), `components/ring/utils.js` (`signedOffset`, `chase`).
- Risk: Booking logic (money-adjacent, customer-facing) can regress silently. A shader typo is invisible to `next build` because GLSL compiles at runtime (`components/shaders/planeShaders.js`, `textShaders.js`), so it ships clean and fails in the browser console.
- Priority: High for `lib/book/*` and `scripts/lib/r2.mjs`. Medium for the Notion mapping. A single Playwright smoke test that loads `/` and fails on any `console.error` or a missing `canvas` would catch shader and context regressions.

## Fragile Areas

These are deliberate designs from `AGENTS.md`, not defects. Any change must preserve them.

**Packed `uScale` vec4:**
- Files: `components/shaders/planeShaders.js`, `components/Carousel.jsx`
- Why: `xy` is birth scale, `z` brightness, `w` atlas cell. GLSL ES charges a full vec4 row per array element, and the budget is 224 rows, so a separate `float[32]` would cost 32 more. `MAX_PLANES = 32` (`planeShaders.js:5`) is imported by `lib/notion/projects.js` and `lib/projects.js`, so the uniform budget caps CMS project count too.

**One-frame-stale side-card focus:**
- Files: `components/Carousel.jsx` (`focusPos`)
- Why: The hit test runs inside the layout loop but every plane needs its answer first. `focusPos` is latched at end of frame and eased over ~10 frames. Do not "fix" it by running the hit test earlier.

**Snap can only decelerate; click-to-centre tweens `state.spin` with momentum suspended (`picking`):**
- Files: `components/Carousel.jsx`
- Why: The snap is a run-in for a nearly spent throw. A pick starts from rest, so it must accelerate. Do not route `pick` through the snap.

**Art dealt by negated ring slot (`cellOf(slot)`), fan-order plane indices:**
- Files: `components/Carousel.jsx`, `components/ring/utils.js` (`signedOffset`)
- Why: Consecutive plane indices sit on opposite sides of the ring. Dealing by index makes the project column step two names per slot. The negation is because forward turns walk the front slot backwards. The same ordering feeds `openForPlane` (`ring[cellOf(signedOffset(plane))]`), so a click opens the project the card shows.

**`PROJECTS` order is ring order:**
- Files: `components/ring/projects.js`, and for CMS data the `Order` / `Ring` number property read in `lib/notion/projects.js` (`order`). Reordering is the only way to change sequence; do not use `imageOffset`.

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
- Why: The entry fires when the counter reads 100 (min of load and birth progress). The atlas never rejects: a missing file leaves a blank cell and counts as settled, so one bad path cannot strand the entry. A failsafe opens the ring if the facing cell is late (see `docs/NEXT-SESSION-PROMPT.md`).

**Ring depends on project count:**
- Files: `components/ring/utils.js` (`radiusForCount`), `components/ring/params.js` (`ringRefCount: 18`), `frontTarget` in `components/Carousel.jsx`
- Why: Radius scales with project count and the hub is moved so the front card stays centred. Adding or removing CMS rows changes the composition. Re-check at 11 and at 32.

**Font family names looked up by string:**
- Files: `components/ring/params.js`, `components/ring/gui.js`, `app/globals.css`. A mismatch falls back to system sans with no error.

**Refit on resize only:**
- Files: `components/Carousel.jsx` (`refit()`). Band flags are stored, not resolved values.

**Shared transition and warm-up choreography:**
- Files: `components/SharedTransitionProvider.jsx`, `components/project/ProjectPagerTransition.jsx`, `components/project/ProjectWarm.jsx`, `lib/project/warm.js`, `components/HomeRing.jsx`, `components/homeRingContext.js`
- Why: Click to detail depends on a generation counter (`openGen`), refs mirrored from router state, and a persisted home ring (`RegisterHome` in `app/page.js` and `app/project/[slug]/page.js`). Navigation race conditions are easy to introduce. No tests cover any of it.

**Notion-driven rendering with strict timeouts:**
- Files: `lib/notion/client.js` (`timeoutMs: 4000`, `retry: false`), `lib/notion/projects.js` (`withTimeout` 4000 and 2500), `lib/cms/projects.js`
- Why: The timeouts exist because Notion 429 with `Retry-After` ~59s once parked the loader. Raising them or re-enabling retries brings that back. `getProjects` must not cache the fallback list (comment in `lib/cms/projects.js`).

## Scaling Limits

**Project count:**
- Limit: `MAX_PLANES = 32` (uniform array size in `components/shaders/planeShaders.js`). `queryProjectPages` stops near `MAX_PLANES * 2` rows, and `fetchNotionProjectBundle` slices to 32. Atlas texture size grows with `ceil(sqrt(n))` cells of 512 px, so 32 projects makes a 3072 x 1364 canvas (6 x 6 grid of 512 x 341).

**Booking throughput:** Single-owner calendar with one-hour slots. Concurrency is in-memory (see Security). `maxDuration = 60` on `/api/book` with research running in `after()`.

## Dependencies at Risk

**`next` pinned exactly at 16.3.0 with `experimental` flags:**
- Risk: Critical advisories above. `experimental.staleTimes` and `optimizePackageImports` are experimental. `AGENTS.md` warns the Next.js version differs from training data; read `node_modules/next/dist/docs/` before changing routing, caching or `next/og` code.

**`unstable_cache` (Notion layer):**
- Risk: Name signals an unstable API. Used in `lib/notion/projects.js` and `lib/notion/client.js`. Plan a move to `use cache` when the project upgrades.

**`sharp`, `@napi-rs/canvas`, `pdfjs-dist`, `unpdf`:** see Tech Debt (portability) and Security (advisories).

**`@notionhq/client` ^5.26.0 with `dataSources` API:** the code supports both database id and data source id in `lib/notion/client.js` (`dataSourceId`). A Notion API shape change breaks the whole CMS path, with only the 18 placeholder fallback behind it.

**`three` ^0.185.1 and `gsap`:** `three` is imported as `import * as THREE` in `components/ring/atlas.js`; verify tree-shaking if bundle size matters.

## Missing Critical Features

**Fail-closed CMS fallback:** Production should not render placeholders on a Notion outage. Today it can.

**CI:** No workflow runs `npm run build`, `npm run lint` or `npm audit`. The only gate is Vercel's build.

**Monitoring:** `@vercel/speed-insights` is the only telemetry. `compiler.removeConsole` strips all console output except `error` in production (`next.config.mjs`), so `console.warn` and `console.info` calls in `lib/cms/projects.js` and `app/api/revalidate/route.js` never reach Vercel logs. The Notion-failure warning in `getProjects` is therefore invisible in production.

---

*Concerns audit: 2026-10-02*
