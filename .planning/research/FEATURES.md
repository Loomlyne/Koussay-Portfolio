# Feature Research

**Domain:** Freelance web developer portfolio (Dubai/GCC prospects): WebGL ring, then case study, then booked call
**Researched:** 2026-10-03
**Confidence:** MEDIUM overall. Accessibility, LCP and autoplay rules are HIGH (W3C, web.dev). Case-study structure is MEDIUM (many practitioner sources agree, no hard data). GCC trust signals and pricing posture are LOW to MEDIUM.

Scope: this milestone only. The ring interaction is not re-researched. "Existing" means the code in `components/project/*` and `components/book/*` as read on 2026-10-03.

---

## What the current case-study page already has, and what is missing

Read from `components/project/ProjectDetail.jsx`, `ProjectHero.jsx`, `ProjectSections.jsx`, `ProjectGallery.jsx`, `ProjectMedia.jsx` and `lib/notion/projects.js`.

| Element | State today | Gap |
|---|---|---|
| Hero | Still image (`next/image`), name, type, year, index, breadcrumbs | No `<video>` anywhere in the project page. The launch-video requirement needs a new hero media component. |
| CTAs | "View live project" (only if `liveUrl`) and "Start a project", both in the hero only | **No CTA after the content.** The pager at the bottom sends readers to another project, not to the booking. |
| Narrative | Summary, then Overview / Challenge / Outcome | No **Approach** (decisions). No **My role** field. PROJECT.md lists "role" as validated, but the data model has no project-level role field. The only `role` is the testimonial author's role. |
| Facts strip | Type and year only | No client or industry, location, services, status, or "client project vs own product". |
| Gallery | One uncaptioned stack. PDF pages are expanded. | No captions. UI screenshots are not separated from branding. Generated art is not told apart from real screenshots. |
| Testimonial | Rendered only when real (the regex drops placeholder text) | Keep. This is the right guard. |
| Tools | List | Fine. Put it near the end. |
| Pre-launch | No status field. A missing `liveUrl` only hides the button. | Payme would read as "the link is missing", not "pre-launch". |
| Media failure | Shows "Artwork unavailable" **plus the raw `project.file` path** | Shows an internal path to a prospect. It looks broken. |
| Booking | 11 steps: fit gate (both boxes required), name, email, day, time, company, website, services, budget bands (USD/EUR/AED), deadline, details. Says "1-hour call". | Longer than the norm. See the booking notes below. |

---

## Feature Landscape

### Table Stakes (prospects leave or lose trust without these)

| # | Feature | Why expected | Complexity | Notes |
|---|---|---|---|---|
| T1 | **Facts strip under the hero title**: client (or "Own product"), industry, location, year, **my role**, services, status, live link | Readers scan before they read. NN/g and hiring-manager surveys say reviewers look first for what *you* did, as distinct from the team. Most converting case-study guides open with a summary panel. | LOW | Needs new fields: `role`, `services[]`, `client`, `industry`, `location`, `status`, `kind: client\|own`. Content lives in the repo, so this is a schema change in `components/ring/projects.js` (or its successor) plus one component. |
| T2 | **Answer-first summary** (2 to 3 sentences: what it is, who it is for, what you built) | Reviewers spend about a minute per case study and decide in the first screen. | LOW | Already exists (`summary`). Write it answer-first. |
| T3 | **Challenge, then Approach, then Outcome** | This order is the standard converting structure in every source that was checked. "Approach" (key decisions and trade-offs) is what separates a case study from a gallery. | LOW | Add an `approach` key to `NARRATIVE` in `ProjectSections.jsx`. Rename "Overview" or merge it into the summary so no section repeats another. |
| T4 | **Closing CTA block after the content, before the pager** | Today a reader who finishes the story meets "Next project". The end of the case study is the point of highest intent. | LOW | One section: a single line ("Have something like this in mind?"), one primary button to `/booking`, and one secondary contact. Book a call is the primary action. |
| T5 | **Live link that works, or an honest status in its place** | "View live" is the strongest proof a web developer has. If the link is missing with no explanation, it looks hidden. | LOW | A `status` field drives the hero. `live` shows the button. `pre-launch` shows a non-clickable status chip, not a disabled button, because a shown control must work. |
| T6 | **Real UI screenshots of the shipped site**, captioned | Prospects hire a web developer from the web work. Generated covers alone read as a mood board. | MEDIUM | Capture from the live sites (Playwright, desktop and mobile). Caption each one ("Home, desktop", "Booking, mobile"). The gallery item gets `caption` and `source: screenshot\|generated\|brand`. |
| T7 | **Launch video: muted, `playsinline`, poster = the ring still, visible pause control** | Expected on studio-grade portfolios. **WCAG 2.2.2 (Level A)**: motion that starts by itself, lasts more than 5 s and sits next to other content needs a pause, stop or hide control. | MEDIUM | A new `ProjectVideo` client component. Handle the rejected `play()` promise (iOS Low Power Mode blocks muted autoplay) by keeping the poster and showing a play button. Using the same still as the poster keeps the shared-element flyer seamless. See the video spec below. |
| T8 | **`prefers-reduced-motion` respected site-wide** | A heavily animated site with no way out is the most common accessibility complaint about creative portfolios. WCAG 2.3.3 (AAA) names parallax, zoom and spin. 2.2.2 (A) covers autoplay. | MEDIUM | Already partly there: `globals.css`, `SharedTransitionProvider` and `ProjectPagerTransition` check it. Still missing: the ring entry timeline and spin blur (already Active in PROJECT.md), and the video (with reduced motion, no autoplay: poster plus play button). |
| T9 | **A keyboard and screen-reader route to every project** | The ring is a canvas, so assistive tech sees nothing in it. The APG carousel pattern expects Tab-reachable controls and a polite live region when nothing auto-rotates. | MEDIUM | (a) Arrow keys, Home and End on a focusable ring wrapper (already Active). (b) Enter opens the front card. (c) `aria-live="polite"` announces "3 of 8, Fido Homes". (d) **A real DOM list of project links.** The project column is `pointer-events-none` today; make it links. Note: the APG does not specify arrow keys for a basic carousel. The arrow keys are a project choice on top of Tab-able links, not a replacement for them. |
| T10 | **Focus management on open and return** | Keyboard users lose their place after the shared-element transition. | LOW | On project open, move focus to `#project-title` (the `h1` already has an id). On "Back to works", restore the ring to that project, already the behaviour, and focus the ring wrapper. |
| T11 | **No broken-looking states** | The core value: "without meeting one fake thing". A broken thing reads as a fake thing. | LOW | Remove the file path from the `mediaFallback` in `ProjectMedia.jsx`. Fall back to the poster or the brand colour instead. If WebGL fails (context-creation error), show the DOM project list (T9d) instead of a blank page. |
| T12 | **Location, timezone and languages stated once, near the CTA** | A GCC prospect wants to know quickly whether you are local, awake in their hours and able to talk to their team. | LOW | "Dubai, UAE · GST (UTC+4) · English, Français, العربية". Booking already defaults to `Dubai/GST`. A statement of the languages spoken, not a translated site. |
| T13 | **Real testimonials only, with name, role and company, or none** | Fake or anonymous quotes are the fastest way to lose a sceptical B2B buyer. | LOW (code) / HIGH (getting them) | The guard already exists. Ask the five client-site owners for one or two sentences each, with permission to name them. |

### Differentiators (where this site can win)

| # | Feature | Value | Complexity | Notes |
|---|---|---|---|---|
| D1 | **Branding as its own "Identity" section**: logo (light and dark), typeface specimen, colour swatches, logo in use | Most freelance developers show only screens. Showing the system behind the screens says "I can carry a brand", which is rare in a solo developer. | MEDIUM | Render swatches and type specimens as **live HTML/CSS** (hex labels, the actual font), not as screenshots. They are sharp, accessible and cheap. Show logos as SVG. Data: `identity: { logos[], fonts[{name, sampleText}], colours[{name, hex}] }`. **Credit check:** Koussay's own note says "Khadija does branding; he does web". For each project, confirm who made the identity and credit Khadija where it was hers ("Identity: Khadija …"). A client's existing brand is not shown as made by him. |
| D2 | **Context-carrying CTA**: `/booking?from=<slug>` pre-fills "I'm interested in something like <Project>" and records the source | It lowers friction and tells Koussay which case study converted, with no analytics added. | LOW | Add `from` to the draft model in `lib/book/draft.js`. It reaches the Notion row and the owner email. Validate it against known slugs. |
| D3 | **"Client project" vs "Own product" label** (Vamos, Invios, Payme are his own products) | Owning products signals product thinking and long-term maintenance. GCC buyers who want recurring work value that. Labelling it also keeps him from looking like he invented clients. | LOW | `kind` field shown as a chip in the facts strip. |
| D4 | **Honest generated-art labelling** done with craft: a small consistent tag on generated images ("Generated art") and on real captures ("Screenshot") | Turns a liability into a trust signal: "this person tells you what is real". | LOW | See the disclosure section below. |
| D5 | **Second contact channel next to Book: WhatsApp** | 85% of UAE residents said they prefer WhatsApp for talking to companies (Zbooni/YouGov, 2024). An 11-step form is a big ask for a first touch. | LOW | `wa.me/<number>?text=` with the slug pre-filled. **This is his decision: it publishes his number.** If he declines, use email instead. Never a fake button. |
| D6 | **Response-time promise near the CTA** ("Replies within one working day") | Cuts uncertainty for buyers who are used to agencies going silent. | LOW | **Only if Koussay commits to it.** It must be true. The booking confirmation email already exists to back it up. |
| D7 | **Video that shows the real product working**: a short scroll and interaction capture of the live site, brand-led open and close | Proves craft in motion (transitions, responsiveness), which a still cannot do. | MEDIUM | The `brag`/Hyperframes pipeline built from the real site or code. Higgsfield only for the brand open or close, never to fake UI. |
| D8 | **Outcome as verifiable facts, not vanity metrics** ("Launched March 2025 · 4 languages · booking live · 38 pages") | The site cannot honestly claim conversion uplifts it never measured. Concrete, checkable facts beat inflated percentages. | LOW | Metrics are added only when Koussay has a source (Analytics, Search Console, client statement). Otherwise use counts and capabilities. |

### Anti-Features (do not build)

| Anti-feature | Why requested | Why it is a problem | Instead |
|---|---|---|---|
| **Invented metrics** ("+240% conversions") | Every guide says "show results" | Unverifiable, a prospect may ask the client, and it breaks the core value | D8: facts that can be checked. Say "No analytics access" rather than guess. |
| **AI images that look like screenshots of a real client site** | Fills a thin gallery fast | Presents fabricated UI as delivered work. Under the EU AI Act it fits the Art. 3(60) "deep fake" definition: content resembling existing objects or entities that "would falsely appear… authentic". Ethically it is a fake portfolio. | Generated art only as clearly artistic covers or texture. Every UI image is a real capture. |
| **Placeholder or "anonymous client" testimonials** | Social proof | The fastest trust-killer. The code already filters placeholders. | Real quotes or no section (the current behaviour). |
| **"Coming soon" card that opens an empty page** | Shows that eight projects exist | Practitioner consensus: unfinished case studies add friction and look broken | Payme gets a *complete* pre-launch case study (see below), or it leaves the ring. |
| **Disabled "View live" button for Payme** | Visual symmetry | A shown control that does nothing breaks Koussay's standing rule | A non-interactive status chip. |
| **Invented pricing, "from AED X"** | Some guides say prices qualify leads | Koussay's rule: pricing is discussed first. It is not table stakes (below). | Leave it out. The booking's budget-band step already qualifies. |
| **Client-logo wall made of logos not cleared with the clients** | A standard trust row | Implies an endorsement. Some clients are tiny or personal brands. | Name clients in case studies, where they already appear. Add a logo row only for clients who say yes. |
| **Sound on, or autoplay with no pause** | Impact | Browsers block it, and it fails WCAG 2.2.2 | T7 |
| **Scroll-jacked case-study pages** (pinned or horizontal sections) | Awwwards look | Hurts reading, conflicts with Lenis and reduced motion, and the ring already carries the "wow" | Plain vertical reading with gentle reveals. Motion stays in the ring and the transitions. |
| **Full Arabic/RTL site in this milestone** | Bilingual is the norm for GCC *businesses* | PROJECT.md puts multi-language out of scope. A half-translated site is worse than none. | T12: state the languages spoken. Reconsider in a later milestone. |
| **Generic "Let's talk" contact form beside the booking** | Redundant safety | Two competing CTAs split intent | One primary (Book), one lightweight secondary (WhatsApp or email). |

---

## Topic Findings

### 1. Case-study structure that converts

**Recommended order on `/project/[slug]`:**

1. Hero: video (poster = ring still), title, one-line descriptor, **facts strip** (T1), `View live ↗` or status chip, `Start a project →`.
2. Summary: 2 to 3 sentences, answer-first.
3. Challenge: the client's problem in business terms, 60 to 120 words.
4. Approach: 3 to 5 key decisions, each with its reason. This is where competence shows.
5. Gallery: real screenshots (desktop, then mobile), captioned.
6. Identity (D1), only if branding was made for the project, credited to whoever made it.
7. Outcome: verifiable facts (D8) and, where real, a metric with its source.
8. Testimonial: only if real.
9. Tools: one line of chips.
10. **Closing CTA block** (T4), with location, languages and response time (T12, D6).
11. Pager to the previous and next projects.

**Length:** about 300 to 600 words of copy per project, readable in 2 minutes, scannable in 30 seconds through the headings and facts strip. Visual-led studio sites run shorter. Conversion-led freelance guides run longer. For a WebGL-hook site, lean short with strong facts. (MEDIUM: no hard data, but sources agree.)

**What prospects read:** the title, the first visual, the facts strip, and whether there is a live link. Then they skim headings for the problem and the outcome. Reviewers reward specificity about *your* contribution and penalise overclaiming (NN/g survey, via secondary sources: MEDIUM).

**Hero video vs still:** the still is the LCP and transition anchor. The video is a progressive enhancement on top of it. Never make the hero depend on the video.

**CTA placement:** in the hero (exists), after the content (missing, T4), and optionally as a small persistent button once the hero has scrolled out of view (P2). Not between narrative sections.

### 2. Launch video spec

| Property | Recommendation | Confidence |
|---|---|---|
| Length | **10 to 20 s**, loop. Practitioner advice ranges from 5 to 30 s. Shorter keeps file size down. | MEDIUM |
| Loop vs once | **Loop** in the hero, with a seamless loop point. Play-once leaves a frozen last frame that looks like a stall. | MEDIUM |
| Attributes | `autoplay muted loop playsinline preload="metadata"` plus `poster` | HIGH |
| Encoding | H.264 MP4, 720p to 1080p, **2 to 5 MB** target, 10 MB hard cap. A WebM/AV1 source first if it is smaller. Served from R2 with an immutable URL. | MEDIUM |
| Content | 1 to 2 s brand open (logo or wordmark), then the real site: hero, one signature interaction, mobile view, then the close. No generated UI. | MEDIUM (practice) / HIGH (honesty rule) |
| Pause | Visible pause/play button, keyboard-reachable, labelled. Required: it runs more than 5 s, starts by itself and sits next to text (WCAG 2.2.2 A). | HIGH |
| Reduced motion | No autoplay. Show the poster plus a play button. | HIGH (2.2.2 / 2.3.3 intent) |
| Autoplay refused | Catch the `play()` rejection (iOS Low Power Mode, data saver). Keep the poster and show the play button. No broken frame. | HIGH |
| Off-screen | Pause when it leaves the viewport (`IntersectionObserver`), for battery and CPU, because the parked ring still exists. | MEDIUM |
| Captions | Not needed if the video is silent and decorative. Give it an `aria-label` describing what it shows. | MEDIUM |

### 3. Branding next to UI

Studios present a web client's identity as a short system sheet, not a gallery dump: primary logo and variants, then type (named and set), then a colour palette (named swatches with hex), then the logo and colours in use on the site. Order it **after** the UI gallery on a web case study: the buyer is hiring web work, and branding is the proof of range. Render swatches and type as live HTML (D1). **Who made what must be credited by person.**

### 4. Pre-launch product (Payme)

A pre-launch case study is acceptable when it is *complete* about what exists and *explicit* about what does not:
- Facts strip: `Own product · Status: In development` (no launch date unless one is real).
- Hero action: a status chip in place of "View live". No disabled button.
- Video and screens from the **local build**, captioned "Pre-launch build, <month year>". A generated *concept* is captioned "Concept art", never "screenshot".
- "Outcome" is renamed for this project to **"Where it is now"**: what is built, what is next. No users, revenue or metrics.
- Do not name Stripe, a payment-licence status or any partner unless Koussay confirms it publicly.

### 5. Disclosing generated imagery

- **Rule:** generated art is never presented as a screenshot, and every image on a case study is visibly one of `Screenshot`, `Generated art` or `Identity`.
- **Ring covers:** these are atlas cells in a shader, so they cannot carry per-image captions. Put one plain line on the site (the home footer or about line, and the project page's hero caption): "Covers are generated art. Screenshots are labelled."
- **Alt text** states it too ("Generated cover art for Fido Homes").
- **Legal context (MEDIUM, not legal advice):** the EU AI Act Art. 50 transparency duties applied from 2 Aug 2026. Art. 50(4) requires deployers to disclose deep fakes. For evidently artistic or creative work, disclosure is limited to "disclosure of the existence of such generated… content in an appropriate manner that does not hamper the display". Whether the Act reaches a Dubai-based freelancer's site depends on EU exposure (unclear). The labelling above satisfies the stricter reading at near-zero cost. No UAE-specific rule was found that requires labelling on a personal portfolio (LOW: "didn't find" is not "doesn't exist").
- The Higgsfield output may carry C2PA or metadata. Do not strip it when re-encoding to WebP (check the `sharp` pipeline's metadata handling).

### 6. Accessibility and motion

- Reduced motion: skip the entry timeline and the spin blur, swap fades for instant changes, no video autoplay, keep the shared-element transition as a short cross-fade (already reduced in two providers).
- Keyboard: Left and Right step one card, Home and End jump to the first and last, Enter opens the front card, Tab reaches the DOM project list and the CTAs. Visible focus ring on the canvas wrapper.
- Screen reader: wrapper `role="region"` with `aria-roledescription="carousel"` and `aria-label="Projects"`. Polite live region for the front card. DOM list of links as the real navigation.
- Focus: to the `h1` on project open. Back to the ring wrapper on return. Booking steps move focus to each step's heading (check `BookFlow`).

### 7. GCC trust signals

| Signal | Status | Confidence |
|---|---|---|
| Real named clients and live links | Table stakes | HIGH (honesty) / MEDIUM (market) |
| Location and timezone, Dubai GST | Table stakes, cheap | MEDIUM |
| Languages spoken (EN/FR/AR) | Table stakes, cheap. A full Arabic site is not required for a freelancer portfolio in this milestone. | MEDIUM |
| WhatsApp as a secondary channel | Strong differentiator, near table stakes in the UAE | MEDIUM (survey) |
| Response-time promise | Differentiator, only if true | LOW |
| Client logo row | Optional, only with consent | MEDIUM |
| Licence / "invoices in AED" line | **Open question for Koussay.** Some UAE B2B buyers need a licensed supplier for invoicing. Show it only if true. | LOW |
| **"From" pricing** | **Not table stakes.** The freelance community is split on it. Most developer and studio portfolios show none and qualify through a form or call. The booking already asks for a budget band in USD, EUR and AED. Do not add prices. Do not change the existing bands without Koussay. | MEDIUM |

### 8. Performance and loading

- **LCP:** good is ≤2.5 s at the 75th percentile, poor is >4 s (web.dev, HIGH). `<canvas>` is **not** an LCP candidate. On `/` the reported LCP will be a DOM text label or image, so LCP can look "good" while the visitor watches the counter. Add a custom `performance.mark('ring-first-frame')` and treat that as the real home metric.
- **Project page:** for `<video>`, LCP uses whichever comes first of the poster load or the first frame (web.dev, HIGH). So the poster (the ring still, already decoded by `warmProject`) is the LCP: keep `preload` and high fetch priority on it, and load the video after.
- **Loader tolerance:** creative-portfolio visitors accept a branded counter of about 2 to 3 s. Past that, bounce rises sharply (LOW: no source specific to portfolios). Keep content (name, project list, CTA) in the DOM and readable before the counter ends. The counter gates only the entry animation.
- **Video weight:** 8 projects × about 4 MB, loaded only on the page that shows it, and paused off-screen.

### Booking-flow notes (observations, not changes for this milestone)

- 11 steps against the common advice of 4 to 6 questions for a discovery booking (MEDIUM: practitioner sources). Mitigating factors: day and time come early (steps 3 and 4), there is a progress bar, and drafts persist.
- "1-hour call": discovery calls are typically 15 to 30 minutes in freelance practice (MEDIUM). Raise it with Koussay. Do not change it unilaterally.
- The fit gate makes **both** "decision-maker" and "ready to start" required. That filters out marketing managers who brief on behalf of a founder, a common GCC buying path (LOW). Koussay decides.
- D2 (`?from=slug`) is the one booking change that this milestone's case-study work directly needs.

---

## Feature Dependencies

```
Content schema (role, services, client, kind, status, approach, identity, gallery.source/caption)
    ├──requires──> T1 facts strip
    ├──requires──> T3 Approach section
    ├──requires──> T5 live link / status chip ──requires──> Payme pre-launch page
    ├──requires──> D1 Identity section ──requires──> per-project authorship check (Khadija credit)
    └──requires──> D4 image labels ──requires──> T6 real screenshots captured

R2 media pipeline (Active in PROJECT.md)
    ├──requires──> T6 screenshots hosted
    └──requires──> T7 launch video hosted ──requires──> poster = ring still (atlas cover)

T7 video ──requires──> pause control + reduced-motion branch (T8)
T9 DOM project list ──enables──> T11 WebGL-failure fallback
T9 DOM project list ──enhances──> T10 focus management
T4 closing CTA ──enhanced by──> D2 ?from=slug ──requires──> lib/book/draft.js field
T4 closing CTA ──enhanced by──> T12 location/languages, D5 WhatsApp, D6 response time

D8 honest outcomes ──conflicts──> "results/metrics" guides (no invented numbers)
Generated covers ──conflicts──> any unlabelled image in the gallery
Scroll-jacked case pages ──conflicts──> Lenis + reduced motion + T7 pause
```

---

## MVP Definition (this milestone)

### Launch with
- [ ] Content schema extended (role, services, client, industry, location, kind, status, approach, gallery source and caption, identity). It unblocks everything else.
- [ ] T1 facts strip, T3 Approach, T4 closing CTA, T5 status-aware hero actions
- [ ] T6 real screenshots for the five client sites, plus Vamos and Invios. Payme's come from the local build.
- [ ] T7 launch video with pause, poster, rejection fallback and reduced-motion branch
- [ ] D4 labels: Screenshot / Generated art / Identity, plus the one-line site disclosure
- [ ] D1 Identity section where branding exists, with authorship credited
- [ ] T8 to T11: reduced motion, keyboard, DOM project list, focus, no broken states
- [ ] T12 location, timezone and languages near the CTA
- [ ] D2 `?from=slug` into booking

### Add after (needs Koussay's decisions first)
- [ ] D5 WhatsApp: needs his number published
- [ ] D6 response-time promise: needs his commitment
- [ ] T13 real testimonials: needs clients to reply
- [ ] Licence / AED-invoice line: needs facts
- [ ] Booking-flow trim, call length, fit gate: his call

### Future
- [ ] Arabic/RTL version: out of scope per PROJECT.md
- [ ] Client logo row: needs consent
- [ ] Video textures inside the ring: out of scope per PROJECT.md

---

## Feature Prioritization Matrix

| Feature | User value | Cost | Priority |
|---|---|---|---|
| Schema extension | HIGH (enabler) | LOW | P1 |
| T4 closing CTA | HIGH | LOW | P1 |
| T1 facts strip with role | HIGH | LOW | P1 |
| T5 / Payme pre-launch state | HIGH | LOW | P1 |
| T6 real screenshots | HIGH | MEDIUM | P1 |
| D4 generated-art labels | HIGH (core value) | LOW | P1 |
| T7 video with a11y | HIGH | MEDIUM | P1 |
| T8 to T11 a11y and fallbacks | MEDIUM to HIGH | MEDIUM | P1 |
| T3 Approach | MEDIUM | LOW | P1 |
| D1 Identity section | MEDIUM | MEDIUM | P1 where branding exists |
| D2 `?from=slug` | MEDIUM | LOW | P1 |
| T12 location and languages | MEDIUM | LOW | P1 |
| D5 WhatsApp | MEDIUM to HIGH (UAE) | LOW | P2 (decision) |
| D6 response time | MEDIUM | LOW | P2 (decision) |
| T13 testimonials | HIGH | HIGH (external) | P2 |
| Sticky CTA after hero | LOW to MEDIUM | LOW | P3 |

---

## Competitor Feature Analysis (by archetype; no specific competitor audited)

| Feature | Awwwards-style dev portfolio | Studio site (agency) | Conversion-led freelancer | Our approach |
|---|---|---|---|---|
| Hero | Big motion, little text | Hero video plus client and services | Headline plus result | Video with still poster, plus facts strip |
| Narrative | Minimal, credits list | Challenge, approach, result | Problem, solution, metrics | Challenge, Approach, Outcome as verifiable facts |
| Branding | Rarely | Identity system sheet | Rarely | Identity section, credited |
| Proof | Live link | Logos, awards | Testimonials, metrics | Live link, real quotes only, no invented numbers |
| CTA | Footer email | "Start a project" | CTA after every case | Hero plus closing CTA, carrying the slug |
| Pricing | None | None | Sometimes "from" | None (the budget band sits in the booking) |
| Motion a11y | Often ignored | Mixed | N/A | Reduced motion, pause, keyboard, DOM fallback |

---

## Sources

- W3C WAI-ARIA APG, Carousel pattern: https://www.w3.org/WAI/ARIA/apg/patterns/carousel/ (HIGH)
- WCAG 2.2.2 Pause, Stop, Hide (explainers): https://www.thewcag.com/criteria/2.2.2 , https://motionspec.dev/blog/wcag-2-2-2-pause-stop-hide (HIGH, consistent with W3C)
- WCAG 2.3.3 Animation from Interactions: https://dequeuniversity.com/resources/wcag2.1/2.3.3-animations-from-interactions (HIGH)
- web.dev, LCP (element types, video poster or first frame, thresholds): https://web.dev/articles/lcp (HIGH)
- W3C LCP spec: https://www.w3.org/TR/largest-contentful-paint/ (HIGH)
- iOS Low Power Mode blocks autoplay: https://milkmidi.medium.com/html-autoplay-video-and-ios-low-power-mode-818dbdc982a0 , https://www.ignite.video/en/articles/basics/autoplay-videos (MEDIUM)
- Hero video length and size: https://designtlc.com/how-to-optimize-a-silent-background-video-for-your-websites-hero-area/ , https://www.gomasuga.com/articles/best-practices-for-html-background-videos (MEDIUM)
- EU AI Act Art. 50 and Art. 3(60): https://artificialintelligenceact.eu/article/50/ (HIGH for the text), https://www.jonesday.com/en/insights/2026/01/european-commission-publishes-draft-code-of-practice-on-ai-labelling-and-transparency (MEDIUM)
- UAE AI ad labelling is platform-led: https://digital.rothian.com/ai-ad-disclosure-labels-uae-brands/ (LOW)
- Case-study structure: https://madebyevoke.com/blog/website-case-study-design-guide , https://www.verlua.com/blog/website-case-study-examples , https://www.danbeeshin.com/blog/case-study (MEDIUM, practitioner)
- What reviewers read and individual contribution (NN/g survey, secondary): https://www.nngroup.com/videos/ux-portfolios/ , https://designcase.app/blog/what-hiring-managers-look-for-ux-case-studies/ (MEDIUM)
- "Coming soon" case studies add friction: https://designerup.co/blog/10-exceptional-product-design-portfolios-with-case-study-breakdowns/ (LOW to MEDIUM)
- WhatsApp preference in the UAE (Zbooni/YouGov 2024): https://www.arabianbusiness.com/business/technology/over-80-of-uae-residents-want-companies-to-shift-customer-service-to-whatsapp (MEDIUM)
- Bilingual expectation for GCC businesses: https://www.hubsol.ae/blog/arabic-english-bilingual-websites-why-dubai-businesses-need-them.html (LOW, vendor)
- Pricing on freelance sites (split opinion): https://invoiceninja.com/display-prices-freelance-website/ , https://wpmudev.com/blog/pricing-pages-should-you-add-to-your-freelance-website/ (MEDIUM)
- Form length and discovery-call length: https://www.sierralindesign.com/blog/coaching-site-discovery-call-booking-setup-guide , https://www.zuko.io/blog/single-page-or-multi-step-form , https://youcanbook.me/blog/discovery-calls (MEDIUM)
- Codebase: `components/project/*`, `components/book/BookFlow.jsx`, `lib/book/config.js`, `lib/book/steps.js`, `lib/notion/projects.js` (HIGH, read directly)

---
*Feature research for: freelance web developer portfolio, case study to booked call*
*Researched: 2026-10-03*
