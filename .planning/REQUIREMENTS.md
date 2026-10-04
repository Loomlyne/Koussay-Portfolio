# Requirements: Koussay Portfolio

**Defined:** 2026-10-03
**Core Value:** A prospect can go from the ring to a true case study to a booked call without meeting one fake thing.

## v1 Requirements

Requirements for this milestone. Each maps to a roadmap phase.

### Content (CONT)

- [ ] **CONT-01**: The eight live Notion projects are snapshotted into repo content modules under their exact slugs (`fido-homes`, `elysee-home-design`, `clickit-story`, `artemis-luxe`, `vamos-taxi` kept verbatim; `invios`, `payme` and `numai-trading` added), with the three retired projects (Pixenhouse, Looma Kitchen, ALMAR) removed
- [x] **CONT-02**: The content schema carries `kind` (client | own), `client`, `industry`, `location`, `year`, `role`, `services[]`, `status` (live | pre-launch), `liveUrl`, `summary`, `challenge`, `approach`, `outcome`, `tools[]`, `identity` (logos, fonts, colours, author credit), gallery items with `kind` (screenshot | generated | identity | video) and `caption`
- [ ] **CONT-03**: Each of the eight projects has a case study written by Claude from an interview with Koussay and approved by him before it is committed; summaries are answer-first; outcomes are checkable facts, never invented metrics
- [ ] **CONT-04**: Payme is a complete pre-launch case study: status chip, no live link, full story written as pre-launch, with wording Koussay approved
- [ ] **CONT-05**: Branding shown in any Identity section is credited to its author; where Khadija made it, the credit names her
- [x] **CONT-06**: `getProjects()` resolves synchronously from the content modules and media manifest; a broken media reference fails `npm run build`
- [ ] **CONT-07**: Unknown project slugs return a real 404 (`dynamicParams = false`); the three retired slugs 404
- [ ] **CONT-08**: The eighteen placeholder projects, their Behance images and `public/404.webp` are removed from the tree, and no fallback can render them

### Case-study page (PAGE)

- [ ] **PAGE-01**: A facts strip under the hero title shows kind, client or "Own product", industry, location, year, role, services, status and live link
- [ ] **PAGE-02**: The narrative reads Summary, Challenge, Approach, Outcome, with no section repeating another
- [ ] **PAGE-03**: A closing call to action sits after the content and before the pager: one line, one primary "Book a call" button, one secondary contact
- [ ] **PAGE-04**: A `pre-launch` status shows a non-interactive status chip in place of the live button; no disabled controls anywhere
- [ ] **PAGE-05**: Each gallery image shows a small consistent tag: Screenshot, Generated art or Identity; one sentence on the site says covers are generated art
- [ ] **PAGE-06**: Each live site has captioned desktop and mobile screenshots captured from the live URL; Payme's come from its local build; generated art is never shown as UI
- [ ] **PAGE-07**: Projects with branding show an Identity section rendering logos as SVG and type specimens and colour swatches as live HTML with hex labels
- [ ] **PAGE-08**: Media failure never shows an internal path; it falls back to the poster or brand colour

### Launch video (VID)

- [ ] **VID-01**: Each project has a launch video of 10 to 20 seconds, muted with no audio track, H.264 MP4, at most about 4 MB, in a fixed 3:2 frame
- [ ] **VID-02**: One still serves as the ring cover, the video poster and the video's first frame, so the shared-element transition is seamless
- [ ] **VID-03**: The project hero autoplays the video muted, inline and looping, with a visible pause control
- [ ] **VID-04**: With `prefers-reduced-motion`, or when the browser refuses autoplay (iOS Low Power Mode), the hero shows the poster and a play button
- [ ] **VID-05**: Videos for Framer sites are built from the live URL, for coded sites from the repo, and for Payme from its local build; real customer data in Invios and Vamos is replaced by fictional stand-ins on screen

### Media hosting and pipeline (MEDIA)

- [x] **MEDIA-01**: `koussay.online` is served through Cloudflare DNS in a Cloudflare account dedicated to Koussay, with every Vercel and Resend record carried over and verified before the nameserver switch
- [x] **MEDIA-02**: An R2 bucket behind a custom domain on `koussay.online` serves all covers, stills, screenshots, identity assets, posters and videos with content-addressed names and `Cache-Control: public, max-age=31536000, immutable`
- [x] **MEDIA-03**: The media host returns `Access-Control-Allow-Origin` on every response; the atlas loader and the home-page preload links request images cross-origin, so the ring renders R2 covers
- [x] **MEDIA-04**: One script is the only writer to R2 and to `content/media.json`; it records the Higgsfield request id and raw output before upload, verifies each object after upload, and never regenerates a recorded entry without `--force`
- [ ] **MEDIA-05**: Higgsfield generation runs through the repo script against the current API with the key from `HF_CREDENTIALS` in `.env.local`, uses an idempotency key per submit, and prints a cost estimate in `--dry-run` that Koussay approves before any paid run
- [x] **MEDIA-06**: `next.config.mjs` allows the R2 host in `images.remotePatterns`; ring stills and hero posters bypass the Vercel optimiser, gallery screenshots use `next/image`
- [ ] **MEDIA-07**: Open Graph and Twitter images are pre-rendered by the script and served as static files; no `sharp` runs at request time
- [ ] **MEDIA-08**: The Notion projects path is deleted: `/api/media/*`, `/api/cms-stamp`, `/api/revalidate`, `CmsLive`, `lib/pdf.js`, `lib/notion/gallery-pdf.js`, `lib/notion/projects.js`, the `unstable_cache` layer, `pdfjs-dist`, `unpdf`, `@napi-rs/canvas`, the canvas `outputFileTracingIncludes`; `sharp` leaves `dependencies`
- [ ] **MEDIA-09**: Bookings and blocked time keep working through Notion and Resend after the removal; `lib/notion/client.js` and `lib/notion/bookings.js` stay; Koussay removes the dead Vercel env vars and the Notion webhook in one numbered step

### Ring (RING)

- [ ] **RING-01**: The ring composition is checked and tuned at eight cards on 1512, 1024, 640 and 390 px widths with `ringRefCount` left at 18
- [ ] **RING-02**: Atlas cell size is decided from a Retina screenshot of the front card (768×512 recommended) and the pipeline produces stills at that size

### Accessibility (A11Y)

- [ ] **A11Y-01**: With `prefers-reduced-motion`, the ring entry timeline jumps to its end state and the spin blur is off; the preference is read at mount and on change
- [ ] **A11Y-02**: ArrowUp, ArrowDown, Home and End step the ring from a focusable wrapper; Enter opens the front card
- [ ] **A11Y-03**: A polite live region announces the front card as "N of 8, Name"
- [ ] **A11Y-04**: The project column is a real list of links to every project, reachable by Tab and by screen readers
- [ ] **A11Y-05**: On open, focus moves to the project title; on return, the ring is at that project and the wrapper has focus
- [ ] **A11Y-06**: If WebGL context creation fails, the page shows the project list instead of a blank canvas

### Trust and contact (TRUST)

- [ ] **TRUST-01**: One line near the closing call to action states "Dubai, UAE · GST (UTC+4) · English, Français, العربية"
- [ ] **TRUST-02**: "Book a call" from a case study passes `?from=<slug>`; the booking draft, the Notion row and the owner email carry the project; the value is validated against known slugs
- [ ] **TRUST-03**: A WhatsApp button next to Book opens `wa.me` with the project pre-filled, using the number Koussay provides
- [ ] **TRUST-04**: A response-time line "Replies within one working day" is shown near the call to action
- [ ] **TRUST-05**: A testimonial renders only when it is real and named; no placeholder or anonymous quotes

### Licensing and hygiene (HYG)

- [x] **HYG-01**: Geist replaces PP Neue Montreal and Satoshi for every face; the `.otf` and `.ttf` files leave the tree; Geist is served as woff2 with its OFL licence file
- [x] **HYG-02**: Every font-family string in `params.js`, `gui.js` and `globals.css` matches a `@font-face` block; the heading, card names, index and meta morph are re-checked for metric shifts
- [x] **HYG-03**: LICENSE keeps the upstream MIT notice (Yousuf Soomro) and the simplex-noise notice word for word; README gains an upstream attribution line and states that removed assets remain in git history
- [x] **HYG-04**: README, LICENSE and AGENTS.md no longer claim Satoshi or PP Neue Montreal are bundled; README Quick start documents the env vars that remain
- [x] **HYG-05**: One formatting-only Prettier commit lands before any functional change; the tree then passes `prettier --check`, `npm run lint` and `npm run build` at every phase end
- [x] **HYG-06**: `components/TwoPlaneMorph.jsx`, the root `shader` file, `scripts/seed-notion-projects.mjs` and the dead `lib/env.js` accessors are removed; `.agents/skills/` is gitignored with `skills-lock.json` kept
- [ ] **HYG-07**: AGENTS.md matches the tree: layout, line counts, known gaps, the content and media model, and the smoke test
- [x] **HYG-08**: Vercel Deployment Protection is set so retired deployment URLs no longer serve removed files; Koussay checks it in one numbered step

### Platform (PLAT)

- [ ] **PLAT-01**: The site is served by Cloudflare Workers in Koussay's Cloudflare account, every page and the booking flow work there, and the Vercel project is removed after a week of clean running

### Tests (TEST)

- [x] **TEST-01**: `npm test` runs a Playwright smoke test against `next build` output that loads `/` and one `/project/<slug>`, fails on any console error except the Speed Insights 404, and fails when the canvas is missing
- [ ] **TEST-02**: The smoke test is proven to fail when `crossOrigin` is removed from the atlas and when a shader typo is introduced, then restored green

## v2 Requirements

Deferred. Tracked but not in this roadmap.

### Trust
- **TRUST-06**: Real named testimonials from the five client-site owners, gathered by Koussay in parallel; shown as soon as they arrive, no code change needed
- **TRUST-07**: A client logo row, only for clients who consent
- **TRUST-08**: A trade-licence or AED-invoice line, if one is true and worth showing

### Booking
- **BOOK-01**: Revisit the 11-step length, the "1-hour call" wording and the two-box fit gate
- **BOOK-02**: Rate limiting and bot control on `/api/book` and `/api/book/draft`
- **BOOK-03**: A shared slot lock or a move to Supabase if double bookings occur

### Ring
- **RING-03**: Video textures inside the ring shader

### Platform
- **PLAT-02**: Arabic/RTL version of the site
- **PLAT-03**: CI running build, lint, prettier and the smoke test on every push

## Out of Scope

| Feature | Reason |
|---------|--------|
| Invented metrics or "from" pricing | Breaks the core value; pricing is discussed first (Koussay's rule) |
| AI images presented as UI screenshots | Fabricated work; generated art is covers and texture only, labelled |
| Disabled "View live" button for Payme | A shown control must work; a status chip replaces it |
| Scroll-jacked case-study sections | Hurts reading, fights Lenis and reduced motion; the ring carries the motion |
| Second general contact form | Splits intent; one primary (Book), one secondary (WhatsApp) |
| Sound on the hero video | Browsers block it; no fake unmute control; social cuts with audio are a separate deliverable |
| Obox MENA and ZARA cards | Koussay chose client sites and own products only |
| Rewriting git history to purge Behance art and PP Neue Montreal | Decided separately from this milestone; README states the files remain in history |
| Full Arabic site in this milestone | Multi-language out of scope; languages are stated, not translated |

## Traceability

Every v1 requirement maps to exactly one phase in `.planning/ROADMAP.md`.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONT-01 | Phase 7 | Pending |
| CONT-02 | Phase 2 | Complete |
| CONT-03 | Phase 7 | Pending |
| CONT-04 | Phase 7 | Pending |
| CONT-05 | Phase 7 | Pending |
| CONT-06 | Phase 2 | Complete |
| CONT-07 | Phase 7 | Pending |
| CONT-08 | Phase 2 | Pending |
| PAGE-01 | Phase 5 | Pending |
| PAGE-02 | Phase 5 | Pending |
| PAGE-03 | Phase 5 | Pending |
| PAGE-04 | Phase 5 | Pending |
| PAGE-05 | Phase 5 | Pending |
| PAGE-06 | Phase 7 | Pending |
| PAGE-07 | Phase 5 | Pending |
| PAGE-08 | Phase 5 | Pending |
| VID-01 | Phase 8 | Pending |
| VID-02 | Phase 8 | Pending |
| VID-03 | Phase 8 | Pending |
| VID-04 | Phase 8 | Pending |
| VID-05 | Phase 8 | Pending |
| MEDIA-01 | Phase 4 (done outside phase, 2026-10-03) | Complete |
| MEDIA-02 | Phase 2 | Complete |
| MEDIA-03 | Phase 2 | Complete |
| MEDIA-04 | Phase 2 | Complete |
| MEDIA-05 | Phase 7 | Pending |
| MEDIA-06 | Phase 2 | Complete |
| MEDIA-07 | Phase 3 | Pending |
| MEDIA-08 | Phase 3 | Pending |
| MEDIA-09 | Phase 3 | Pending |
| RING-01 | Phase 7 | Pending |
| RING-02 | Phase 7 | Pending |
| A11Y-01 | Phase 6 | Pending |
| A11Y-02 | Phase 6 | Pending |
| A11Y-03 | Phase 6 | Pending |
| A11Y-04 | Phase 6 | Pending |
| A11Y-05 | Phase 6 | Pending |
| A11Y-06 | Phase 6 | Pending |
| TRUST-01 | Phase 5 | Pending |
| TRUST-02 | Phase 5 | Pending |
| TRUST-03 | Phase 5 | Pending |
| TRUST-04 | Phase 5 | Pending |
| TRUST-05 | Phase 5 | Pending |
| HYG-01 | Phase 1 | Complete |
| HYG-02 | Phase 1 | Complete |
| HYG-03 | Phase 1 | Complete |
| HYG-04 | Phase 1 | Complete |
| HYG-05 | Phase 1 | Complete |
| HYG-06 | Phase 1 | Complete |
| HYG-07 | Phase 8 | Pending |
| HYG-08 | Phase 2 | Complete |
| TEST-01 | Phase 1 | Complete |
| TEST-02 | Phase 2 | Pending |
| PLAT-01 | Phase 3.1 | Pending |

**Coverage:**
- v1 requirements: 54 total
- Mapped to phases: 54
- Unmapped: 0

---
*Requirements defined: 2026-10-03*
*Last updated: 2026-10-03 after roadmap creation*
