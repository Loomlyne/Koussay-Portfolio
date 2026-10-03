# Roadmap: Koussay Portfolio

## Overview

This milestone is a cut-over, then a quality raise. The site already serves eight real projects from Notion. First the repo gets a formatting baseline, a smoke test that has passed once, and licence-clean fonts. Then project content moves into the repo with the full case-study schema, and the Notion projects path, PDF renderer and runtime `sharp` are deleted while bookings keep working. Media moves to Cloudflare R2 behind `media.koussay.online` once Koussay's DNS move lands; that DNS move starts on day one as a parallel human track. In parallel, the case-study page gains its facts strip, honest labels and closing call to action, and the ring gains keyboard, screen-reader and reduced-motion support. The content release then swaps in the real eight with interview-written copy, real screenshots and labelled generated covers, and tunes the ring for eight. Last, each project page gets a silent launch video that continues from the ring card, and AGENTS.md is rewritten from the finished tree.

Every phase leaves the live site deployable and no worse than before. Koussay signs discuss, plan, UAT and ship for every phase. Only the control session commits on `main`, pushes and deploys; work sessions build in worktrees and hand over.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Baseline and licence hygiene** - Prettier-only commit first, a green smoke test, Geist for every face, licence notices correct, dead files gone (completed 2026-10-03)
- [ ] **Phase 2: Projects served from the repo** - The live eight read from content modules with the full schema and build-time validation; placeholders gone; no visible change
- [ ] **Phase 3: Notion projects path removed** - Proxy, PDF renderer, CMS cache and runtime `sharp` deleted; OG images static; bookings proven still working
- [ ] **Phase 3.1: Hosting on Cloudflare Workers** (INSERTED) - The site runs on Workers in Koussay's Cloudflare account; Vercel serves nothing
- [ ] **Phase 4: R2 media delivery** - Media on `media.koussay.online` with immutable URLs and CORS; one script writes R2 and the manifest; ring proven safe on a warm cache
- [ ] **Phase 5: Case-study page that closes** - Facts strip, ordered narrative, honest image labels, Identity section, status chip, closing call to action with WhatsApp and `?from=` booking
- [ ] **Phase 6: Ring accessibility and reduced motion** - Keyboard stepping, live region, real project list, focus handling, reduced motion, WebGL-failure fallback
- [ ] **Phase 7: The eight: real content, art and ring at eight** - Interview-written copy, real screenshots, generated covers through the paid-run gate, slug swap, ring tuned at eight
- [ ] **Phase 8: Launch video hero and closeout** - Silent 3:2 launch video per project continuing from the ring still; AGENTS.md rewritten from the final tree

## Cross-Phase Rules

- **Phase-end gate (HYG-05):** every phase ends with `prettier --check`, `npm run lint`, `npm run build` and (from Phase 1 on) `npm test` green on the tree that ships.
- **Ring internals are preserved:** packed `uScale`, fan-order indices, one-frame-stale focus, snap-only-decelerates, `forceContextLoss`, the load-counter gate (see `AGENTS.md`). No phase changes them.
- **Bookings code is off-limits** except the one validated `from` field in Phase 5. Any phase that touches `lib/notion/client.js` or `lib/book/*` re-runs a preview booking.
- **Secrets stay in Koussay's terminal.** Every human step below is one numbered action, then wait.
- **Parallelism:** Phases 5 and 6 need only Phase 2 and can be built in worktrees while Phases 3 and 4 run and DNS propagates. Phase 7 can ship per project because the count stays eight.

## Phase Details

### Phase 1: Baseline and licence hygiene

**Goal**: The repo has a formatting baseline and a smoke test that has already passed once, and nothing in the tree or served to visitors breaches a font or code licence.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: HYG-05, TEST-01, HYG-01, HYG-02, HYG-03, HYG-04, HYG-06
**Success Criteria** (what must be TRUE):

  1. The first commit of the phase is formatting-only (its SHA is in `.git-blame-ignore-revs`), it lands before any functional change or worktree branch, and the tree then passes `prettier --check`, `npm run lint` and `npm run build`.
  2. `npm test` runs a Playwright smoke test against `next build` output that loads `/` and one `/project/<slug>`; it passes on the current tree, fails on any console error other than the Speed Insights 404, and fails when the canvas is missing. It is green before the font swap lands.
  3. On a cold load the heading, card names, index and meta morph render in Geist (served as woff2 with its OFL file); `git ls-files` lists no `.otf` or `.ttf`; every font-family string in `params.js`, `gui.js` and `globals.css` matches a `@font-face` block; Koussay signs before/after screenshots of the heading and meta morph.
  4. LICENSE still carries the Yousuf Soomro MIT block and the simplex-noise notice word for word; README credits the upstream carousel, states that removed assets remain in git history, makes no claim that Satoshi or PP Neue Montreal is bundled, and its Quick start lists the env vars in use.
  5. `components/TwoPlaneMorph.jsx`, the root `shader` file, `scripts/seed-notion-projects.mjs` and the dead `lib/env.js` accessors are gone; `.agents/skills/` is gitignored with `skills-lock.json` kept.

**Koussay's steps**:

  1. Confirm Geist for every face (recommended over Satoshi, whose licence bars public-repo distribution).
  2. Sign the before/after font screenshots.

**Parallel human track (starts here, consumed by Phase 4, maps to MEDIA-01)**:

  1. Koussay creates a Cloudflare account dedicated to him (not the default Vamos login, not ALMAR's).
  2. Claude prepares the record inventory of the current Namecheap zone (Vercel apex `216.198.79.1` DNS-only, every Resend MX/SPF/DKIM record, anything else found).
  3. Koussay adds the zone in his account and checks every record against the inventory.
  4. Koussay switches the nameservers at Namecheap only after step 3 is verified; Claude confirms the site and Resend domain verification afterwards.

**Plans**: 6 plans

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Prettier baseline commit (AST-proved) and .git-blame-ignore-revs

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Playwright smoke test on port 3100, green before the swap, plus "before" screenshots

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Geist and Geist Mono for every face, old fonts and arrow SVG removed, fonts.load gate

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-04-PLAN.md — Font assertions in the smoke test, "after" screenshots, Koussay signs

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 01-05-PLAN.md — Dead files and dead env accessors removed, .agents/skills untracked

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 01-06-PLAN.md — LICENSE, README, BREAKDOWN credit, AGENTS font facts, phase-end gate

### Phase 2: Projects served from the repo

**Goal**: The live eight projects are read from repo content modules carrying the full case-study schema, and no placeholder can render anywhere, with no visible change to visitors.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: CONT-02, CONT-06, CONT-08, HYG-08
**Success Criteria** (what must be TRUE):

  1. The ring and every live `/project/<slug>` show the same cards and copy as before the cut-over, now served from `content/projects/*` and a manifest; Notion is not called for projects at build or request time.
  2. Every content module carries the full schema (`kind`, `client`, `industry`, `location`, `year`, `role`, `services[]`, `status`, `liveUrl`, `summary`, `challenge`, `approach`, `outcome`, `tools[]`, `identity`, gallery `kind` and `caption`), and a module with a missing field or a media reference absent from the manifest fails `npm run build` naming the project and field.
  3. The eighteen placeholder projects, `public/1..18.webp` and `public/404.webp` are absent from `git ls-files`; a placeholder slug returns a real 404 and no code path can fall back to a placeholder list.
  4. The sitemap lists exactly the live set with a per-project `lastModified`; `/project/[slug]` shows as statically generated in the build route table.
  5. An old Vercel deployment URL no longer serves `/1.webp` or the PP Neue Montreal file, checked by Koussay.

**Koussay's steps**:

  1. Check Vercel Deployment Protection (Standard, covering old deployment URLs) and open one old deployment's `/1.webp` to confirm it is blocked.

**Plans**: TBD

### Phase 3: Notion projects path removed

**Goal**: The running site carries no Notion projects code, PDF renderer or request-time image library, and bookings still work end to end.
**Mode:** mvp
**Depends on**: Phase 2 deployed (one deploy later, so cached HTML that still points at `/api/media` expires first)
**Requirements**: MEDIA-07, MEDIA-08, MEDIA-09
**Success Criteria** (what must be TRUE):

  1. A grep for `lib/cms`, `notion/projects`, `api/media`, `gallery-pdf`, `lib/pdf`, `cms-stamp`, `api/revalidate`, `CmsLive` and `unstable_cache` is clean outside `.planning/`; `pdfjs-dist`, `unpdf` and `@napi-rs/canvas` are uninstalled; `sharp` is not in `dependencies`; `serverExternalPackages` and `outputFileTracingIncludes` are gone from `next.config.mjs`.
  2. Each project's Open Graph and Twitter image is a pre-rendered static file showing that project's cover, the home and booking pages keep a working image, and no request runs `sharp`.
  3. A booking made on the preview deployment creates the Notion row, shows in Notion Calendar, and sends both the visitor and owner Resend emails; a blocked-time entry still hides its slots. `lib/notion/client.js` and `lib/notion/bookings.js` are intact.
  4. `NOTION_PROJECTS_DATABASE_ID` and `NOTION_WEBHOOK_SECRET` are gone from Vercel, `.env.example` and the README Quick start, and the Notion webhook subscription no longer exists.

**Koussay's steps**:

  1. Make one test booking on the preview URL and confirm the Notion row and both emails.
  2. Remove the two dead Vercel env vars and delete the Notion webhook subscription (one numbered step).

**Plans**: TBD

### Phase 3.1: Hosting on Cloudflare Workers (INSERTED)

**Goal**: koussay.online is served by Cloudflare Workers in Koussay's own Cloudflare account, every page and the booking flow work there, and Vercel serves nothing.
**Mode:** mvp
**Depends on**: Phase 3 (no Notion proxy, PDF renderer or request-time `sharp` left in the runtime)
**Requirements**: PLAT-01
**Research**: yes (Next.js 16 on Workers: OpenNext vs vinext, Speed Insights replacement, image optimisation without Vercel, env and secrets on Workers, preview deployments)
**Success Criteria** (what must be TRUE):

  1. `koussay.online` and `www` resolve to a Worker in Koussay's account (`4afee478…`, `cf` profile `koussay`); a response header or `cf-ray` proves Cloudflare served the HTML, not Vercel.
  2. Every route the smoke test covers (home, every project, booking, desktop and phone) passes against the Workers build and against production after the switch.
  3. A booking made on the Workers preview creates the Notion row, shows in Notion Calendar, and sends both Resend emails; blocked time still hides its slots.
  4. Secrets live as Worker secrets set by Koussay in his terminal; no secret is in the repo, the Worker config or a log.
  5. After a week of clean running on Workers, the Vercel project is removed and no Vercel deployment URL serves the site.

**Koussay's steps**:

  1. Set each Worker secret in his terminal (one numbered step per secret batch).
  2. Approve the DNS switch from the Vercel records to the Worker route.
  3. Remove the Vercel project after the week of clean running.

**Plans**: TBD

### Phase 4: R2 media delivery

**Goal**: Every project image is served from Cloudflare R2 on `media.koussay.online` with immutable, content-addressed URLs, and the ring renders those covers from a cold and a warm cache.
**Mode:** mvp
**Depends on**: Phase 3; the DNS track started in Phase 1 (MEDIA-01) must be complete
**Requirements**: MEDIA-01, MEDIA-02, MEDIA-03, MEDIA-04, MEDIA-06, TEST-02
**Research**: yes (DNS migration with email records, R2 CORS and the missing `Vary: Origin` at the edge, Range through the custom domain, account pinning)
**Success Criteria** (what must be TRUE):

  1. `koussay.online` resolves through Cloudflare nameservers in Koussay's own account; the site loads and Resend still shows the domain verified and delivers booking emails after the switch.
  2. `curl -I` on a cover at `media.koussay.online` returns `image/webp`, `Cache-Control: public, max-age=31536000, immutable` and `Access-Control-Allow-Origin: *`, with and without an `Origin` header, cold and warm; a `Range` request on an MP4 returns 206. No production URL uses `r2.dev`.
  3. Going home, then a project, then home on a warm cache leaves the ring rendering R2 covers with no `SecurityError`; gallery images load through `next/image` from the R2 host and ring stills and hero posters load direct; `public/projects/` is gone.
  4. `scripts/media.mjs` is the only writer of R2 and `content/media.json`: `check` prints `public ok` on the custom domain, `ingest` records provenance (request id, raw file) before upload and skips recorded entries unless `--force` is given, and `verify` confirms every manifest object.
  5. The smoke test fails when `crossOrigin` is removed from the atlas and when a shader typo is introduced, and passes again once each is restored.

**Koussay's steps**:

  1. Complete the nameserver switch if the Phase 1 track has not finished.
  2. Create the R2 bucket in his own account and an R2 API token scoped to it; paste the token into `.env.local` in his terminal.
  3. Attach `media.koussay.online` to the bucket (or approve Claude doing it with the `cf` CLI under his login, `account_id` pinned).

**Plans**: TBD

### Phase 5: Case-study page that closes

**Goal**: Every case-study page states the facts, tells the story in order, labels each image honestly and ends at a way to book or message Koussay, ready before the new copy arrives.
**Mode:** mvp
**Depends on**: Phase 2 (schema). Can be built in parallel with Phases 3, 4 and 6.
**Requirements**: PAGE-01, PAGE-02, PAGE-03, PAGE-04, PAGE-05, PAGE-07, PAGE-08, TRUST-01, TRUST-02, TRUST-03, TRUST-04, TRUST-05
**Success Criteria** (what must be TRUE):

  1. A project page shows a facts strip under the hero title (kind, client or "Own product", industry, location, year, role, services, status, live link) and the narrative in the order Summary, Challenge, Approach, Outcome with no section repeating another.
  2. A `pre-launch` project shows a non-interactive status chip where the live button would be; no disabled control appears on any page; a failed media load shows the poster or brand colour, never an internal path.
  3. Each gallery image carries a small Screenshot, Generated art or Identity tag, and one sentence on the site (wording Koussay approved) says covers are generated art; a project with identity data shows logos as SVG and type specimens and colour swatches as live HTML with hex labels.
  4. After the content and before the pager, a closing block shows one primary "Book a call" button, a WhatsApp button that opens `wa.me` with the project pre-filled, "Dubai, UAE · GST (UTC+4) · English, Français, العربية" and "Replies within one working day"; no testimonial appears unless it is real and named.
  5. "Book a call" from a case study opens `/booking?from=<slug>`; the booking draft, the Notion row and the owner email name that project; an unknown `from` value is dropped.

**Koussay's steps**:

  1. Sign the UI design (`/gsd-ui-phase`) before code.
  2. Provide the WhatsApp number.
  3. Confirm the response-time line is true.
  4. Approve the generated-art disclosure wording and placement.
  5. Confirm the branding author for the project used to prove the Identity section.
  6. Make one preview booking from a case study and confirm the project shows in the Notion row and owner email.

**Plans**: TBD
**UI hint**: yes

### Phase 6: Ring accessibility and reduced motion

**Goal**: A visitor using a keyboard, a screen reader or reduced motion, or whose browser cannot create a WebGL context, can reach and open every project.
**Mode:** mvp
**Depends on**: Phase 2 (project list from content). Can be built in parallel with Phase 5.
**Requirements**: A11Y-01, A11Y-02, A11Y-03, A11Y-04, A11Y-05, A11Y-06
**Success Criteria** (what must be TRUE):

  1. With reduced motion set at load or switched on live, the ring appears at its end state without the entry timeline and spins with no blur; the smoke test has a reduced-motion run that passes.
  2. With the ring wrapper focused, ArrowUp and ArrowDown step one card, Home and End go to the first and last, and Enter opens the front card; a screen reader announces "N of 8, Name" as the front card changes.
  3. Tab reaches a real list of links to every project; opening a project puts focus on its title; returning puts the ring at that project with focus on the wrapper.
  4. When WebGL context creation fails, the home page shows the project list instead of a blank canvas.

**Koussay's steps**:

  1. Sign the UI design for the visible project list and the WebGL fallback.
  2. Keyboard and reduced-motion UAT on his Mac.

**Plans**: TBD
**UI hint**: yes

### Phase 7: The eight: real content, art and ring at eight

**Goal**: The ring holds the eight real projects, each with an approved case study, real screenshots and labelled generated covers, and the ring is tuned for eight cards.
**Mode:** mvp
**Depends on**: Phase 4 (media goes straight to R2), Phase 5 (copy is written into the finished template)
**Requirements**: CONT-01, CONT-03, CONT-04, CONT-05, CONT-07, PAGE-06, MEDIA-05, RING-01, RING-02
**Research**: yes (Higgsfield 3:2 output size, accepted image-to-video input, model and cost; atlas cell size; ring tuning per band with real art)
**Success Criteria** (what must be TRUE):

  1. The ring and project column show exactly `fido-homes`, `elysee-home-design`, `clickit-story`, `artemis-luxe`, `vamos-taxi`, `numai-trading`, `invios` and `payme`; `pixenhouse`, `looma-kitchen`, `almar-private-journey` and any unknown slug return a real 404; the sitemap lists exactly these eight.
  2. Each case study is the copy Koussay approved after his interview, answer-first, with outcomes that are checkable facts; Payme reads as a complete pre-launch case study in his approved wording with no live link; every Identity section names its author, Khadija where it was hers.
  3. Each live site has captioned desktop and mobile screenshots captured from its live URL, Payme's come from its local build, and no generated image is shown as UI.
  4. Generated covers come through the repo script with the key from `HF_CREDENTIALS`: `--dry-run` prints a cost estimate Koussay approves before any paid run, each submit carries an idempotency key, and every asset's request id and raw file exist before upload.
  5. The atlas cell size is set from a Retina screenshot of the front card and the pipeline produces stills at that size; Koussay signs ring screenshots at 1512, 1024, 640 and 390 px with `ringRefCount` still 18, and one wheel notch moves one card.

**Koussay's steps**:

  1. One interview per project (eight), then approve each case study's copy before it is committed.
  2. Approve Payme's public wording.
  3. Confirm the branding author per project.
  4. Confirm the Clickit live URL (`clickitstory.ae` vs `clickitstory.com`) and that the three retired slugs 404 rather than redirect.
  5. Paste `HF_CREDENTIALS` into `.env.local` in his terminal.
  6. Approve the `--dry-run` cost estimate before any paid Higgsfield run, then pick each cover.
  7. Approve the atlas cell size from the Retina screenshot, and sign the ring screenshot set.

**Plans**: TBD
**UI hint**: yes

### Phase 8: Launch video hero and closeout

**Goal**: Each project page opens on a short, silent launch video that continues seamlessly from the ring card, and AGENTS.md describes the finished tree.
**Mode:** mvp
**Depends on**: Phase 4 (hosting), Phase 7 (final stills and copy)
**Requirements**: VID-01, VID-02, VID-03, VID-04, VID-05, HYG-07
**Research**: yes (brag input path for Framer sites and for Payme, 3:2 render, iOS autoplay and Low Power Mode on a real device)
**Success Criteria** (what must be TRUE):

  1. Opening any project from the ring lands on a hero that starts on the exact still the ring card showed, with no jump through the shared-element transition, then plays muted, inline and looping with a visible pause control.
  2. With reduced motion, or when the browser refuses autoplay (iPhone Low Power Mode, checked on Koussay's device), the hero shows the poster and a play button.
  3. `ffprobe` on all eight videos shows 10 to 20 seconds, H.264, no audio track, a 3:2 frame and at most about 4 MB each.
  4. Each video shows the real product: Framer sites built from the live URL, coded sites from the repo, Payme from its local build; Invios and Vamos show only fictional stand-in data.
  5. AGENTS.md layout, line counts, known gaps, the content and media model and the smoke test line match `git ls-files` and the tree.

**Koussay's steps**:

  1. Sign the hero video UI design before code.
  2. Approve the video model and the per-video cost before any paid run.
  3. Confirm fictional stand-in data for Invios and Vamos, and the source of Payme's video.
  4. Test the hero on his iPhone with Low Power Mode on and off.

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 3.1 → 4 → 5 → 6 → 7 → 8. Phases 5 and 6 can be built in worktrees once Phase 2 ships; the DNS track runs from Phase 1 until Phase 4.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Baseline and licence hygiene | 6/6 | Complete   | 2026-10-03 |
| 2. Projects served from the repo | 0/TBD | Not started | - |
| 3. Notion projects path removed | 0/TBD | Not started | - |
| 3.1. Hosting on Cloudflare Workers | 0/TBD | Not started | - |
| 4. R2 media delivery | 0/TBD | Not started | - |
| 5. Case-study page that closes | 0/TBD | Not started | - |
| 6. Ring accessibility and reduced motion | 0/TBD | Not started | - |
| 7. The eight: real content, art and ring at eight | 0/TBD | Not started | - |
| 8. Launch video hero and closeout | 0/TBD | Not started | - |
