# Project Research Summary

**Project:** Koussay Portfolio (koussay.online)
**Domain:** Freelance web developer portfolio (Dubai/GCC prospects): WebGL ring, then case study, then booked call. Brownfield Next.js 16 on Vercel.
**Researched:** 2026-10-03
**Confidence:** MEDIUM-HIGH

## Executive Summary

This milestone is a cut-over, not a build. The live site already shows eight real projects from Notion, and five of them are the target set under slugs that are indexed in the sitemap. The work is to move that content into the repo, move media to Cloudflare R2, delete the Notion projects path (media proxy, PDF renderer, CMS cache, revalidate webhook), replace the 18 placeholder fallbacks, and then raise the quality of what each project page says and shows: real copy, real screenshots, labelled generated covers, and a launch video hero. Bookings stay on Notion and are not to be touched. Experts build this kind of site with static, validated content modules, content-addressed immutable media on a CDN, a single authoring-time pipeline that is the only writer to storage, and a hero video that is a progressive enhancement over a still.

The recommended approach is to ship in small, individually shippable steps that each leave the site visibly unchanged until content actually changes: a green smoke-test baseline first, then repo content with the schema extended before any UI, then proxy removal one deploy later, then R2. The one thing that can stall the plan is not code. `koussay.online` DNS sits at Namecheap, an R2 custom domain needs the zone on Cloudflare, and `r2.dev` is not production-grade. That human step gates every R2 URL in the app, so it must be started on day one and run in parallel with everything that does not need R2.

The main risks are all places where a green build hides a broken or dishonest site. R2-hosted covers taint the ring's atlas canvas and blank the ring unless `crossOrigin`, preload links and bucket CORS change together. Satoshi's ITF licence forbids redistribution through a public repo, so the "free face" choice is Geist, not "Satoshi or Geist". Generated art must never read as a screenshot of a real product. Paid Higgsfield calls can be lost or doubled by the stale endpoints and the SDK's retry behaviour. The video hero needs a pause control, reduced-motion handling, a Low Power Mode fallback and one shared 3:2 still, none of which the `brag` skill produces by default.

## Cross-Cutting Findings

Raised independently by two or more researchers. These shape the roadmap.

1. **DNS gate on R2.** `koussay.online` is at Namecheap (`dns1/dns2.registrar-servers.com`). An R2 custom domain needs the zone in the same Cloudflare account as the bucket; partial CNAME setup is a paid-plan feature; `r2.dev` is rate-limited, uncached, and gets no Transform Rules. Practical path: move nameservers to Cloudflare (free plan), copy the Vercel apex (`216.198.79.1`, DNS-only) and every Resend MX/SPF/DKIM record first, then attach `media.koussay.online`. This is a gated step for Koussay. The bucket must live in the portfolio's own Cloudflare account, never under the default Vamos login.
2. **Atlas CORS.** `components/ring/atlas.js` never sets `crossOrigin`, so R2 covers taint the canvas and `texImage2D` throws; the ring goes blank while build and lint stay green. One phase must change together: `img.crossOrigin = "anonymous"` in the atlas, `crossorigin` on the preload `<link>`s in `app/page.js` and in `SharedTransitionProvider.preloadImage()`, and bucket CORS plus a static `Access-Control-Allow-Origin: *` response-header Transform Rule (R2 sends no `Vary: Origin`, so a cached no-CORS copy breaks later CORS requests, and only on warm caches). Purge the cache after any CORS change. Raise atlas load failures to `console.error`, because `removeConsole` hides warnings in production.
3. **Satoshi licence.** The ITF Free Font License v2.0 (read from the download) forbids repository distribution and format conversion; self-hosting for your own site is allowed. A public GitHub repo holding `Satoshi-*.otf` is a breach, and so is a self-made WOFF2. Geist is SIL OFL with official WOFF2 and no tooling. **This challenges PROJECT.md ("Satoshi or Geist"): recommend Geist for every face.** Also: `public/ppneuemontreal-book.otf` is tracked in git, contradicting AGENTS.md's "gitignored", and the README and AGENTS.md claims that Satoshi is free to redistribute are wrong.
4. **Live set already exists.** Production serves eight real Notion rows. Five slugs must be kept exactly: `fido-homes`, `elysee-home-design`, `clickit-story`, `artemis-luxe`, `vamos-taxi`. Three leave (`pixenhouse`, `looma-kitchen`, `almar-private-journey`) and three join (Numai Trading, Invios, Payme). Set `dynamicParams = false` so removed and placeholder slugs return a real 404. Do not redirect them to `/` (soft 404), and do not derive slugs from names (`clickit-story` must not become `clickitstory`).
5. **Higgsfield stale and unsafe.** The endpoints in `scripts/lib/higgsfield.mjs` are gone from current docs (`/v1/text2image/soul`, `/v1/image2video/dop`). Current text-to-image is `higgsfield-ai/soul/v2/standard` with `aspect_ratio: "3:2"` and `resolution`. The SDK retries the paid POST up to three times with no idempotency key and orphans the job on a 5-minute poll timeout. `--probe` also crashes with a `ReferenceError` once credentials exist. Recommend plain `fetch` with a stored `Idempotency-Key`, or the in-session Higgsfield tools, and write the manifest entry (request id, raw bytes on disk) before any upload.
6. **Video hero contract.** The hero needs a visible pause control (WCAG 2.2.2), no autoplay under `prefers-reduced-motion` or save-data, a caught `play()` rejection that leaves a designed poster state (iOS Low Power Mode refuses muted autoplay), a fixed 3:2 frame, and one still shared by the ring cell, the shared-element flyer, the hero poster and the video's first frame. The `brag` skill defaults to 16:9, bakes a text-heavy title frame as frame 0 and encodes at CRF 18 with audio. None of that is acceptable for the hero.
7. **Schema before UI.** The current data model has no project-level `role`, `services`, `client`, `kind` (client or own product), `status` (live or prelaunch), `approach`, `identity`, or per-media `kind` and `caption`. Every case-study feature depends on these fields, and the build must fail on a missing one.
8. **Hygiene order.** 17 files fail Prettier. Do one formatting-only commit first, record it in `.git-blame-ignore-revs`, and do it before any worktree branches. Get the smoke test green on the current tree early so every later step is checked by a gate that already passed once.

## Challenges to PROJECT.md decisions

| PROJECT.md says | Research says | Recommendation |
|---|---|---|
| Heading uses "Satoshi or Geist" | Satoshi's FFL bars public-repo distribution and conversion | Geist for every face; delete all ITF and Pangram files |
| Each project has Higgsfield "cover and gallery art" | Generated gallery images that look like UI are fake product shots (fails Core Value) and read as machine art credited to Koussay | Generated art for covers and texture only, each image labelled by `kind`; gallery is real screenshots plus branding |
| Ring "holds exactly eight" as new work | Production has run eight since about 2026-09-04 | Treat as a cut-over; the new work is real art, which changes the geometry check |
| Hero autoplays muted with still as poster | Needs pause control, reduced-motion branch, rejected-play fallback, 3:2 | Keep the decision, add the contract above |
| "`sharp` on a patched major, or removed" | Removable from runtime once proxy and OG routes go | `sharp@^0.35.5` as a devDependency for scripts only |
| "`/api/revalidate` fails closed, or removed" | Nothing left to revalidate | Remove it with the Notion projects path |
| "Stay on Vercel" | Hobby is non-commercial personal use; image optimisation overage returns 402 | Keep Vercel; flag the plan to Koussay as a decision outside this milestone |

## Key Findings

### Recommended Stack

Keep the existing stack (Next 16.3.8, React 19.2.8, three r185, GSAP, Tailwind v4, Vercel, Notion and Resend for bookings). Additions are small and mostly authoring-time. Full detail in `.planning/research/STACK.md`.

**Core technologies:**
- Plain ESM content modules plus a machine-written `content/media.json`: eight short structured case studies; MDX buys nothing. Prose and manifest stay in separate files so a regeneration never rewrites approved copy.
- Cloudflare R2 behind a custom domain (`media.koussay.online`): immutable content-addressed keys (`projects/<slug>/<role>-<sha8>.<ext>`, `Cache-Control: public, max-age=31536000, immutable`), no proxy, no signed-URL expiry.
- `aws4fetch` 1.0.20 for R2 uploads: replaces the never-run hand-rolled SigV4, about 2.5 KB, covers PUT/HEAD/LIST/DELETE.
- Higgsfield REST via plain `fetch`, or the in-session tools: idempotency key and request id persisted before the wait, `/estimate` called in `--dry-run`.
- HyperFrames via `npx hyperframes@0.8.114` (not in `package.json`), FFmpeg for the web re-encode and poster extraction.
- `@playwright/test` 1.63.0 with Chromium only: the only way to catch GLSL errors, which show up only in the browser console.
- `sharp@^0.35.5` moved to devDependencies; Geist WOFF2 (OFL) with plain `@font-face`, not `next/font/local`, because the ring looks fonts up by literal name on canvas.
- Remove: `@napi-rs/canvas`, `pdfjs-dist`, `unpdf`, runtime `sharp`, `@higgsfield/client`; and `serverExternalPackages`, `outputFileTracingIncludes`, the `/api/media/**` local pattern.

### Expected Features

Full detail in `.planning/research/FEATURES.md`.

**Must have (table stakes):**
- Facts strip under the hero title (client or "Own product", industry, location, year, my role, services, status, live link)
- Challenge, then Approach, then Outcome, with a short answer-first summary; 300 to 600 words per project
- Closing CTA block after the content and before the pager (today the end of a case study leads to another project, not to booking)
- Honest live-link state: a non-interactive status chip for Payme, never a disabled button
- Real captioned screenshots of the shipped sites, not only generated covers
- Launch video with visible pause, reduced-motion and rejected-play fallbacks, poster equal to the ring still
- `prefers-reduced-motion` site-wide, keyboard route to every project (arrow keys, Home/End, Enter, a real DOM project list, live region), focus management, no broken-looking states (remove the raw file path from "Artwork unavailable"; DOM fallback if WebGL fails)
- Location, timezone and languages stated once near the CTA

**Should have (competitive):**
- Identity section (logos, type specimen, swatches as live HTML), credited by person; Khadija does branding and must be credited where it was hers
- `/booking?from=<slug>` pre-fill (the one booking-side change this milestone needs; validate against known slugs)
- Label every image as Screenshot, Generated art or Identity, plus one plain site line: "Covers are generated art. Screenshots are labelled."
- "Client project" vs "Own product" chip; outcome as verifiable facts, never invented metrics
- Video that shows the real product working; generated imagery only for brand open or close

**Defer (v2+ or needs Koussay first):**
- WhatsApp channel (publishes his number), response-time promise (must be true), real testimonials (needs the clients), licence/AED-invoice line
- Booking-flow trim (11 steps, "1-hour call", both-boxes fit gate): observations only, his call
- Arabic/RTL, client logo row (needs consent), video textures inside the ring, sticky CTA, any "from" pricing

**Anti-features:** invented metrics, AI images posing as client UI, placeholder testimonials, "coming soon" cards that open empty pages, scroll-jacked case pages, a second contact form beside booking.

### Architecture Approach

Everything visitors see is static at build. Authoring is separate and local: Claude drafts `content/projects/<slug>.mjs` from interviews, Koussay approves; skills and MCP tools produce files on disk in a gitignored `media-work/`; `scripts/media.mjs` (`check | ingest | verify`) is the only writer to R2 and the manifest. Content refers to media by slot name, never URL. A server-only `lib/content.js` joins content and manifest, validates (a broken reference fails `next build`), and returns the existing Project record shape plus `cell` and `media`, so most components change only an import line. Detail in `.planning/research/ARCHITECTURE.md`.

**Major components:**
1. Content modules plus ordered index: approved prose and facts; ring order is one array (the AGENTS.md rule)
2. `content/media.json`: machine-only manifest with absolute URLs, sizes, source hash as the skip gate; provenance (prompt, request id) stays in gitignored `media-work/`
3. `lib/content.js` (server-only): join, validate, serve; replaces `lib/cms/*`, `unstable_cache`, `CmsLive` and every fallback list
4. Ring atlas: loads `project.cell` directly from R2 with `crossOrigin`, bypassing `next/image`; `ringRefCount` (18) and `ringRadius` (340) are not touched, because `radiusForCount` already yields a radius of about 154 at eight cards with identical neighbour spacing
5. `ProjectMedia` plus new `HeroVideo` client component: poster `<Image>` is the LCP and flyer landing target; video sets no `src` until the flyer finishes, crossfades in on `playing`, pauses off-screen and when the tab is hidden
6. Media ingest script and smoke test (`next build && next start` on a fixed free port, Chromium with `--enable-unsafe-swiftshader`)

OG images become pre-rendered 1200x630 JPEGs on R2 referenced from `generateMetadata`; root and booking get static PNGs; `lib/og-image.js` and every `*-image.js` route are deleted.

### Critical Pitfalls

Full list of twelve in `.planning/research/PITFALLS.md`. The five that most affect sequencing:

1. **R2 covers blank the ring** — `crossOrigin` in atlas and preload links, bucket CORS, static ACAO `*` Transform Rule, cache purge; verify with a warm-cache round trip home, project, home, and prove the smoke test fails when `crossOrigin` is removed.
2. **DNS and Cloudflare account** — move the zone (carry every record), pin `account_id` on every command, never use `r2.dev` in production; `--check` must print `public ok` on the final host before any credit is spent.
3. **Notion removal leaves live importers** — `getProjects()` is read by the page, sitemap, llms.txt, OG routes and the project page; deleting `lib/notion/projects.js` alone breaks the build, and careless deletion of `lib/notion/client.js` breaks bookings. Keep the same export name, delete in two deploys, grep clean, and book a slot on a preview before shipping.
4. **Credit burn and fake-looking art** — order is new list, R2 `--check` green, `--dry-run` with costs, `--limit=1`, full run; never bare `--force`; prompts forbid screens, UI, text, logos, people; alt text never credits generated art "by Koussay Zayani".
5. **Licence cleanup done wrong** — keep the Yousuf Soomro MIT block and the Ashima/Gustavson notice verbatim; delete files and notices in one commit; old Vercel deployments may still serve `/1..18.webp` and the PP Neue file, so Koussay checks Deployment Protection.

Also material: ring feel at eight changes wheel velocity by 2.25x and one slot is 45 degrees (retune `scrollSpeed`, `scrollSlot`, `snapFrom`, `stagger`, `posX` per band at 1512, 1024, 640, 390 and a tall phone); the 512 px atlas cell is soft on Retina for the front card; hero MP4 weight and pager warm-up must never prefetch video.

## Implications for Roadmap

Seven phases. Phases 1 and 2 can overlap; the DNS move is a human track that starts on day one and gates Phase 4 only.

### Phase 1: Baseline and licence hygiene
**Rationale:** A formatting-only commit must land before any worktree branches, and every later step needs a gate that has already passed. The licence fixes are independent, cheap and remove public-repo risk early.
**Delivers:** One Prettier-only commit (SHA in `.git-blame-ignore-revs`); Playwright smoke test green on the current tree (`/` loads, one canvas, live WebGL context, no console or page errors; allowlist only `/_vercel/speed-insights/script.js`); `test` script; Geist replaces Satoshi and PP Neue Montreal in `params.js`, `gui.js` dropdown and `@font-face` in one commit with `OFL.txt`, official WOFF2, `document.fonts.load` before `splitText.build()`; all ITF and Pangram files removed from the tree; LICENSE keeps upstream blocks, README credits the carousel, webgl-noise and Geist; dead files (`TwoPlaneMorph.jsx`, `shader`) removed, `.agents/skills/` gitignored; `brag-output*/` and `media-work/` gitignored.
**Addresses:** Hygiene requirements, smoke test requirement.
**Avoids:** Formatting noise in functional diffs; Satoshi FFL breach; stripped MIT notice; canvas fonts silently falling back.
**Human steps:** Koussay answers the font question (Geist recommended); later checks Vercel Deployment Protection.

### Phase 2: Content schema and repo cut-over
**Rationale:** Removes Notion from the read path with no visible change, and the schema must exist before any UI. A `public/` snapshot of the live eight unblocks this today without waiting for R2.
**Delivers:** Extended schema (`role`, `services`, `client`, `industry`, `location`, `kind`, `status`, `approach`, `identity`, per-media `kind` and `caption`, `updated`); `content/projects/*.mjs` snapshotted from the live payload under the exact five slugs; `lib/content.js` with build-time validation (unique slugs, count at most `MAX_PLANES`, every slot in the manifest, `liveUrl` null exactly when `prelaunch`); manifest with relative URLs; static `/project/[slug]` with `generateStaticParams`, `dynamicParams = false`, no `revalidate`; per-project `lastModified` in the sitemap; the 18 placeholders, `public/1..18.webp` and the placeholder defaults in `Carousel`, `params`, `atlas`, `meta` deleted; `lib/cms/*`, `CmsLive`, `/api/cms-stamp`, `/api/revalidate`, `seed-notion-projects.mjs` deleted.
**Addresses:** Content in repo; revalidate defect closed by removal.
**Avoids:** Slug churn; the fail-closed fallback incident (a stale placeholder list replacing the live set).
**Exit check:** the five slugs return 200; sitemap lists exactly the live set; no visible change.

### Phase 3: Notion proxy and PDF removal
**Rationale:** One deploy after Phase 2, so cached HTML still pointing at `/api/media` keeps resolving while it expires.
**Delivers:** Deletion of `/api/media`, `lib/pdf.js`, `lib/media.js`, `lib/notion/{projects,gallery-pdf}.js`, the PDF branch in `ProjectGallery`, `cachedDataSourceId`, `@napi-rs/canvas`, `pdfjs-dist`, `unpdf`, `serverExternalPackages`, `outputFileTracingIncludes`; `lib/env.js` and `.env.example` cleaned.
**Avoids:** Breaking bookings (keep `lib/notion/client.js` and `props.js`); stale-tab 404s on `/api/cms-stamp` misread as a regression.
**Exit check:** grep for `lib/cms|notion/projects|api/media|gallery-pdf|lib/pdf|cms-stamp` is clean outside `.planning/`; route table shows `/project/[slug]` as SSG; one booking completes on a preview and lands in Notion.
**Human steps:** remove `NOTION_PROJECTS_DATABASE_ID` and `NOTION_WEBHOOK_SECRET` from Vercel and delete the Notion webhook subscription.

### Phase 4: R2 media delivery
**Rationale:** Real art and videos should go straight to their final immutable home, not through `public/` and git history. This phase is gated on the DNS move.
**Delivers:** Zone on Cloudflare with all records carried; bucket in the portfolio's own account; bucket CORS plus ACAO `*` Transform Rule; `media.koussay.online`; `scripts/media.mjs` (`check | ingest | verify`) on `aws4fetch`, the only writer of `content/media.json`; snapshot images ingested; atlas `crossOrigin`, preload `crossorigin`, `cell` split in `Carousel`; `remotePatterns` for the media host; pre-rendered OG JPEGs, `lib/og-image.js` and OG routes deleted; `sharp` to devDependencies; `public/projects/` deleted; atlas failures raised to `console.error`; the old `generate-project-media.mjs` generation path retired.
**Uses:** R2, `aws4fetch`, Cloudflare Transform Rule, `cf` CLI with pinned `account_id`.
**Avoids:** Tainted atlas, `r2.dev` in production, wrong Cloudflare account, manifest drift, silent 400s from `next/image`.
**Exit check:** `curl -I` shows `image/webp`, `immutable`, ACAO `*` on the custom domain (with and without `Origin`, cold and warm); 206 on a `Range` request for MP4; warm-cache round trip leaves the ring intact; the smoke test is shown to fail when `crossOrigin` is removed.

### Phase 5: Case-study page, accessibility and honesty labels
**Rationale:** Needs only the Phase 2 schema, so it can be built while DNS propagates. Makes every page worth landing on before the real content arrives.
**Delivers:** Facts strip; Approach section; closing CTA block with location, timezone and languages; status-aware hero (chip for prelaunch, "Where it is now" for Payme); captioned gallery with Screenshot / Generated art / Identity labels and the one-line site disclosure; Identity section with live HTML swatches and type; `?from=<slug>` in `lib/book/draft.js` (validated, the only booking-side change); reduced motion for the ring entry and spin blur; arrow keys, Home, End, Enter, DOM project list, live region, focus management; no broken states (remove the file path from the fallback, DOM list if WebGL fails).
**Addresses:** T1 to T5, T8 to T12, D1, D2, D4.
**Avoids:** A broken-looking Payme, fake controls, unlabelled generated art, motion with no escape.

### Phase 6: The eight: content, art and ring at eight
**Rationale:** The content release. Depends on R2 so media goes straight to its final home. Mostly human-in-the-loop.
**Delivers:** Interview-drafted, Koussay-approved copy for all eight; slug swap (three out, three in; removed slugs 404); Payme as a complete prelaunch case study; real captioned screenshots (client sites from the live URLs, Payme from the local build); Higgsfield covers through the corrected pipeline (`--dry-run` with `/estimate` costs, then `--limit=1`, then the rest; raw bytes and request id on disk before upload; one probe each for output size at 3:2, accepted i2v input format, video model and cost); art-direction rule forbidding screens, UI, text, logos, people; branding rasterised at authoring time; ring checked at eight in every band with real art, atlas cell size decided once and changed in `atlas.js` and the script together.
**Avoids:** Credit burn on the wrong list, lost uploads, art that reads as a screenshot, a jumpy or soft ring.
**Exit check:** manifest slugs equal content slugs; `media.mjs verify` green; screenshot set at 1512, 1024, 640, 390 and 390x844 signed by Koussay; one notch moves one card.

### Phase 7: Launch video hero and closeout
**Rationale:** The component ships before the videos because it is inert without a manifest `video`; after that every video is data only.
**Delivers:** `HeroVideo` client component to the Features contract (pause control, reduced-motion and save-data poster with Play button, caught `play()` rejection, off-screen and hidden-tab pause, no `src` until the flyer lands, no pager prefetch of video); fixed 3:2 hero frame; per-project video via brag run from this repo with the other product read-only, or from the live URL, pinned duration and tone, 3:2-safe subject in the centre 84%; separate web encode (H.264 High, yuv420p, faststart, `-an`, 1080p or narrower, target 2 to 4 MB, 10 MB hard cap) and no baked title frame; poster frame extracted once and fed to ring cell, flyer, hero poster and OG; `ffprobe` check of all eight; AGENTS.md rewritten last from the final tree (layout, line counts, known gaps, font licence paragraph, test line).
**Avoids:** Three different pictures at the landing, layout shift, loop flash, 8 to 15 MB heroes, brag output committed, real customer data on screen, unverified music.

### Phase Ordering Rationale

- Content before R2: the DNS move is the long pole and a gated human step with real email risk; a `public/` snapshot lets Notion come out today. The cost is about 1 to 2 MB of Koussay's own work in git history.
- Proxy removal one deploy after the cut-over, so cached HTML does not 404.
- R2 before real media: generated art and videos go to their final immutable home and never through git.
- Schema before UI, and UI before content, so copy is written into a template that already exists and validates.
- Video component before videos; the smoke test first so every step is checked.
- Phase 1 hygiene and Phase 5 can run in parallel worktrees alongside the DNS wait; Phases 6 and 7 can ship per project because the count stays eight.

### Research Flags

Phases likely needing deeper research during planning (`/gsd:plan-phase --research-phase <N>`):
- **Phase 4:** DNS migration with email records, CORS and caching behaviour at the Cloudflare edge (R2 `Vary` gap is community-sourced), Range support through the custom domain, which Cloudflare account.
- **Phase 6:** Higgsfield live behaviour (real 3:2 output size, i2v input formats, model choice and cost), art direction review, atlas cell size, ring tuning per band with real art.
- **Phase 7:** brag input path for Framer sites and for Payme, 3:2 render, iOS autoplay behaviour on a real device, music licence if a social cut is made.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Prettier, Geist OFL, Playwright smoke test. Only watch the SwiftShader flags.
- **Phase 2:** Static content modules and `dynamicParams` are documented in the bundled Next 16 docs.
- **Phase 3:** Deletion with a grep exit check; the order is already worked out.
- **Phase 5:** Standard accessibility and case-study patterns (WCAG 2.2.2, APG carousel).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Next APIs checked against the bundled 16.3.8 docs; Higgsfield checked against current docs and SDK source; R2 against Cloudflare docs. Lower: R2 `Vary` gap (community source), Higgsfield output size and i2v input formats (unprobed), SwiftShader flag (Chromium group posts). |
| Features | MEDIUM | Accessibility, LCP and autoplay rules are HIGH (W3C, web.dev). Case-study structure is practitioner consensus. GCC trust signals and pricing posture are LOW to MEDIUM. |
| Architecture | HIGH | Read from the tree and the live site (RSC payload, `dig`). R2 range and edge CORS behaviour are MEDIUM until `verify` runs. |
| Pitfalls | MEDIUM-HIGH | Repo-specific findings are HIGH and the Satoshi FFL was read from the licence file. Platform behaviour (iOS Low Power Mode, Vercel protection scope, Cloudflare plan gates) is MEDIUM; Hobby-plan interpretation is LOW. |

**Overall confidence:** MEDIUM-HIGH

### Gaps and Disagreements to Resolve in Planning

The researchers differ in a few places. Recommendations:

- **Atlas cell size.** Architecture and Stack keep 512x341; Pitfalls says the front card is about 800 device px from a 512 px cell and recommends 768 to 1024. Recommend 768x512 (3x3 grid, 2304 px canvas), decided in Phase 6 on a Retina screenshot, changed in `atlas.js` and the script constant together.
- **Optimiser or not for R2 images.** Stack and Architecture keep `next/image` for hero and gallery; Pitfalls says `unoptimized` so flyer, poster and hero share one URL and the Hobby 5K cap never returns 402. Recommend: `unoptimized` for the poster, hero and pager images (pre-sized, shared with the flyer), `next/image` for below-the-fold gallery, `remotePatterns` kept either way.
- **Upload client.** Stack recommends `aws4fetch`; Pitfalls suggests `@aws-sdk/client-s3`. Recommend `aws4fetch` (one-file, covers PUT/HEAD/LIST), with a known-answer `check` before any paid run.
- **Generation route.** Architecture prefers the in-session Higgsfield tools so Koussay picks each image; Stack and Pitfalls prefer a corrected script. Recommend the tools for covers (he picks), plain `fetch` for anything batch, both writing to `media-work/` and publishing only through `media.mjs ingest`. Whether the API key pair exists is open (auto memory says the free plan gated generation).
- **Hero encode size.** Features says 2 to 5 MB, Pitfalls 2.5 MB at CRF 26 to 28, Stack CRF 23. Recommend measuring: CRF 23 to 26, 1080p cap, target 4 MB or less per clip, no audio.
- **Test port.** Stack suggests 3100, Architecture 3417. Either is fine; choose one not used by the Mac's other servers and kill only that port.
- **Playwright and H.264.** Do not assert video playback in the smoke test (Playwright's arm64 browser may lack H.264); assert the poster, the element, and the reduced-motion state.
- **Booking changes.** Pitfalls says no phase should touch `lib/book/*`; Features needs `?from=<slug>`. Allow only that one validated field and re-run a preview booking.
- **Unverified items to settle on first contact:** Higgsfield real 3:2/1080p size; accepted i2v formats (seed from JPEG or PNG, not WebP); React 19 `muted` SSR attribute (Stack verified it emits `muted=""`; Pitfalls was unsure, so check once); Cloudflare partial-setup plan gate (moot if nameservers move).

## Open Questions for Koussay

Deduplicated across all four files. Items marked (gate) block a phase.

1. **DNS and account (gate, Phase 4).** Move `koussay.online` nameservers to Cloudflare (free plan, with every Vercel and Resend record copied first), or use a different domain already on Cloudflare? Which Cloudflare account owns the zone and bucket (not the default Vamos login)?
2. **Font (Phase 1).** Geist for every face, as recommended? Or keep Satoshi, which would need it out of git and Fontshare's own WOFF2 only.
3. **Clickit URL.** Live data says `https://www.clickitstory.ae`; PROJECT.md says `clickitstory.com`. Which is right?
4. **Higgsfield access and spend (gate, Phase 6).** Is the API key pair created at console.higgsfield.ai, or do we use the in-session tools? Approve the per-image and per-video cost after `--dry-run`, and the video model.
5. **Retired projects.** Confirm Pixenhouse, Looma Kitchen and ALMAR 404 (recommended) rather than redirect. ALMAR is his own product but not on the ring.
6. **Branding authorship.** For each project, who made the identity? Khadija must be credited where it was hers. Which projects have branding made by Koussay?
7. **Client permissions.** Written OK (a message is enough) to show each client site in a video and screenshots? Can he get one or two real testimonial sentences per client, with names? Until then no testimonial section appears.
8. **Payme.** What may be said publicly about it (status wording, Stripe, payment licence)? Is its video built from the local build or a clearly labelled concept?
9. **Real data in videos.** Invios and Vamos contain real data: confirm fictional stand-in data on screen, and that the case study says so.
10. **Sound.** Hero stays silent with no sound control (recommended: no fake controls)? Is a separate social cut with audio wanted? If so, who verifies the bundled music licence, or use `--no-music`.
11. **Generated-art disclosure.** Approve the wording of the site line ("Covers are generated art. Screenshots are labelled.") and its placement.
12. **Atlas cell size.** Approve 768x512 (recommended) over 512x341, once judged on a Retina screenshot.
13. **Contact additions.** Publish a WhatsApp number? Commit to a response time ("within one working day")? Is there a licence or AED-invoice line that is true and worth showing?
14. **Booking flow.** 11 steps, "1-hour call" and the both-boxes fit gate are observations only this milestone. Does he want them revisited later?
15. **Vercel plan.** Hobby is non-commercial personal use and caps image transformations. Is the plan Pro? Not a code change, but it decides whether overages bill or return 402.
16. **Old deployments.** Check Vercel Deployment Protection is Standard and that an old deployment URL no longer serves `/1.webp` or the PP Neue file (one numbered step).
17. **Git history.** The Behance art and PP Neue Montreal remain in history after deletion; the README will say so. Rewrite history as a separate decision, outside this milestone?
18. **Fallback if CORS proves flaky.** Accept committing eight hashed ~30 KB cell WebPs to `public/` for the ring only, at the cost of "all media on R2"?

## Sources

### Primary (HIGH confidence)
- Bundled Next 16.3.8 docs in `node_modules/next/dist/docs` (image, generate-static-params, dynamicParams, opengraph-image, font, playwright testing, server-only)
- Higgsfield docs (docs.higgsfield.ai llms.txt, soul-2, requests, idempotency, rate-limits, openapi.json) and `@higgsfield/client` source
- Cloudflare docs: R2 public buckets, R2 CORS, partial DNS setup, default cache behaviour, aws4fetch example
- Live checks 2026-10-03: koussay.online RSC payload, sitemap and status codes, `dig NS koussay.online`
- ITF Free Font License v2.0 text from the Satoshi download; Geist OFL
- Repo code read directly (atlas, ring params and utils, carousel, project components, scripts, `lib/*`, `next.config.mjs`, LICENSE, README, AGENTS.md)
- W3C WAI-ARIA APG carousel, WCAG 2.2.2 and 2.3.3, web.dev LCP
- `~/.claude/skills/brag` references (frame-0 poster bake, CRF 18, 16:9 default, asset paths, music licence)

### Secondary (MEDIUM confidence)
- Vercel Image Optimization limits and Deployment Protection docs
- Chromium SwiftShader deprecation threads (headless WebGL needs `--enable-unsafe-swiftshader`)
- WebKit inline video policies; iOS Low Power Mode autoplay reports
- Case-study structure and hero-video practitioner guides; NN/g reviewer behaviour via secondary sources
- Zbooni/YouGov 2024 on WhatsApp preference in the UAE
- EU AI Act Art. 50 and Art. 3(60) text (applicability to a Dubai freelancer is unclear)

### Tertiary (LOW confidence, needs validation)
- Cloudflare community reports on R2 missing `Vary: Origin` (verify with `curl -I` with and without `Origin`, cold and warm)
- Higgsfield output size at 3:2/1080p, accepted i2v input formats, output URL lifetime
- Playwright arm64 H.264 support; Vercel Skew Protection on the current plan
- GCC trust signals, response-time promise, licence/AED-invoice line

---
*Research completed: 2026-10-03*
*Ready for roadmap: yes*
