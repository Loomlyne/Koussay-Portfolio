# External Integrations

**Analysis Date:** 2026-10-02

All env var names below are read through accessors in `lib/env.js` (app) or `scripts/lib/load-env.mjs` (scripts). `.env.example` documents every key. No `.env.local` is committed.

## APIs & External Services

**CMS (projects) - Notion:**
- Notion database is the source of truth for project text and (currently) media. Row = one carousel card / `/project/[slug]` page.
  - SDK/Client: `@notionhq/client` 5.26.0, singleton in `lib/notion/client.js` (`timeoutMs: 4000`, `retry: false` on purpose: a 429 with ~59s Retry-After once parked the loader).
  - Auth: `NOTION_TOKEN` (internal integration; needs Read content + Insert content).
  - DB: `NOTION_PROJECTS_DATABASE_ID`. `cachedDataSourceId()` resolves database -> data source id (cached 1h, tag `projects`), then `notion().dataSources.query` in `lib/notion/projects.js`.
  - Column names are matched case-insensitively by `findProp` (`lib/notion/props.js`): Name/title, Cover|Image|Thumbnail (files), Gallery (files), Published|Live on site (checkbox; unchecked hides), Slug, Type|Discipline, Year, Live|Live URL|URL, Order|Ring, Summary, Overview, Challenge, Outcome, Quote|Testimonial, Author, Role, Tools (multi-select). Rows without a title or cover are dropped; capped at `MAX_PLANES` (from `components/shaders/planeShaders.js`).
  - Read path: `lib/cms/projects.js` `getProjects()` (React `cache`) -> `getCachedProjectBundle()` (`unstable_cache`, key `cms-projects-v2`, `revalidate: 60`, tag `projects`) in `lib/notion/projects.js`. Returns `{ projects, media, stamp }`. Falls back to per-instance `lastGood`, then to the 18 placeholders in `components/ring/projects.js`. Never cache the fallback inside `unstable_cache`.
- Staleness signal: `app/api/cms-stamp/route.js` (GET, `force-dynamic`, `no-store`). Returns newest `last_edited_time` via `cachedProjectsStamp` (`unstable_cache`, 20s). If the stamp is newer than the bundle's, it calls `bustProjectsCache()`. Polled every 20s by `components/CmsLive.jsx`, which calls `router.refresh()` on change.

**Media delivery (Notion-backed, current):**
- `app/api/media/[...parts]/route.js` (`runtime nodejs`, `maxDuration 30`). URL shape `/api/media/<pageId>[/<slot>]?v=<version>`; slots are `cover`, `gN` (gallery file N), `gNpM` (PDF page M of gallery file N), parsed by `lib/media.js` (`parseMediaSlot`, `slotFromMediaPath`). `?pages=1` returns `{ pages }` JSON for a PDF.
  - Resolves a signed Notion file URL (`cachedNotionMediaUrl` from the cached bundle, else live `pages.retrieve` via `notionMediaUrl`), fetches it (20s timeout, `cache: "no-store"`; refetches the URL on 403/404 because Notion signed URLs expire in about an hour).
  - Images: `sharp` -> max 1600x1600, WebP q80, GIF passthrough. Response is `public, max-age=31536000, immutable` only when `?v=` is present, else `no-store`. `Access-Control-Allow-Origin: *`.
  - PDFs: `lib/pdf.js` (`unpdf` + `pdfjs-dist` legacy build + `@napi-rs/canvas`) renders one page to PNG at 1600px wide, max `MAX_PDF_PAGES = 48`, with a 6-entry in-memory byte cache. A PDF is never returned as-is (route refuses it).
  - `lib/notion/gallery-pdf.js` `withExpandedPdfGallery()` expands a PDF gallery item into one item per page (`file` ends `gNpM`) for the project page.
  - `lib/og-image.js` builds 1200x630 PNG OG images with `sharp` from the Notion cover (via `cachedNotionMediaUrl`), local `public/` cover, or `public/logo.png`. Used by `app/opengraph-image.js`, `app/twitter-image.js`, `app/project/[slug]/{opengraph,twitter}-image.js`, `app/booking/{opengraph,twitter}-image.js`.
- Decision recorded in auto memory (`media-host-is-r2.md`): Notion is not the media host going forward; when R2 is wired in, most of the media route and `lib/pdf.js` should be deleted. As of this analysis the app does not read from R2 anywhere.

**Booking - Notion + Resend:**
- `app/booking/page.js` renders an 11-step form (`lib/book/steps.js`, `lib/book/config.js` `BOOK_STEP_COUNT = 11`; UI under `components/book/`). Draft is mirrored in `localStorage` key `koussay-book-draft` (`lib/book/draft.js`).
- `POST /api/book` (`app/api/book/route.js`, `maxDuration 60`): multipart form (`payload` JSON + optional `attachment`, max `MAX_ATTACHMENT_BYTES` = 4 MB, `lib/book/validate.js`). Validates, claims an in-memory slot (`claimSlot`/`releaseSlot`/`pendingBusy`, `lib/book/time.js`; per-instance only, not shared across serverless instances), re-checks Notion busy ranges, then creates the Notion booking page (`createNotionBooking`), sends Resend emails, and runs research in `after()`. Returns 503 if neither Notion bookings nor Resend are configured.
- `GET /api/book/availability` (`force-dynamic`): busy ranges from Notion bookings DB (+ optional calendar DB), 20s in-process cache (`busyCache` in `lib/notion/bookings.js`), plus pending in-memory slots.
- `POST /api/book/draft`: upserts a partial booking page (`upsertNotionDraft`) and, on first draft with an email, emails the owner (`sendDraftNotice`).
- Notion bookings: `NOTION_BOOKINGS_DATABASE_ID` (each submit becomes a timed Notion Calendar event); optional `NOTION_CALENDAR_DATABASE_ID` for blocked time (all-day events allowed). Column mapping is by schema type via `setProp`/`schemaKey` in `lib/notion/bookings.js`. Attachments upload via `notion().fileUploads.create/send` (single part) and attach as a file block. Statuses `cancelled|canceled|declined|archived|draft|incomplete` are not busy (`CLOSED_STATUSES`).
- Email: Resend in `lib/mail/booking.js` (`sendBookingEmails`: visitor confirmation + owner notification with attachment; `sendDraftNotice`). Inline HTML templates, no React Email. Auth `RESEND_API_KEY`; `RESEND_FROM` must be a verified Resend domain; alerts go to `BOOKING_NOTIFY_EMAIL`. `isResendConfigured()` needs all three.

**Booking research (optional, AI briefing):**
- `lib/book/research.js` runs after a booking when any of the keys exists; writes the result into the Notion page via `fillBookingResearch` (placeholder text `RESEARCH_PLACEHOLDER` first). Consumer-mail domains (gmail, proton, etc.) are skipped for site discovery.
  - Firecrawl: `https://api.firecrawl.dev/v2` via `fetch`, auth `FIRECRAWL_API_KEY`. Reads company site / search.
  - Google Gemini: `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`, auth `GEMINI_API_KEY` (alias `GOOGLE_GENERATIVE_AI_API_KEY`), model `GEMINI_MODEL` default `gemini-2.5-flash`. API key is passed in the query string.
  - OpenAI: `https://api.openai.com/v1/chat/completions` via `fetch`, auth `OPENAI_API_KEY`, model `OPENAI_MODEL` default `gpt-4o-mini`.
  - Order: Gemini, then OpenAI, then Firecrawl extract, then raw site summary. No SDKs; plain `fetch`.

**Authoring-time media generation (NEW, committed but never executed live):**
- `scripts/generate-project-media.mjs` with `scripts/lib/{higgsfield,r2,art-direction,load-env}.mjs`. Never runs inside the app; a visitor cannot trigger it. Flags: `--probe` (one image to `.media-probe/`, no R2, gitignored), `--check` (PUT/HEAD/GET a `_healthcheck/` object), `--dry-run`, `--only=<slug,...>`, `--direction=concrete|chrome|flatbed`, `--limit=N`, `--video`, `--force`.
- Higgsfield: SDK `@higgsfield/client/v2` (`config`, `higgsfield.subscribe(endpoint, { input, withPolling: true })`). Auth `HF_CREDENTIALS` as `id:secret` (or `HIGGSFIELD_API_KEY_ID` + `HIGGSFIELD_API_KEY_SECRET`). Defaults: image `/v1/text2image/soul` at `2016x1344` (exact 3:2), quality `1080p`; video `/v1/image2video/dop` model `dop-standard`. Overridable via `HIGGSFIELD_IMAGE_ENDPOINT`, `HIGGSFIELD_VIDEO_ENDPOINT`, `HIGGSFIELD_IMAGE_PARAMS`, `HIGGSFIELD_VIDEO_PARAMS` (read in `scripts/generate-project-media.mjs`, documented in `.env.example`). Output normalised by `outputUrls()` (images array vs single `video` object). Per auto memory `higgsfield-free-plan-cannot-generate.md`, the free plan gates generation regardless of credit balance.
- Prompts: `scripts/lib/art-direction.mjs` (three directions, 18-colour accent wheel, no-text/no-people negative prompt). Reads the project list from `components/ring/projects.js`.
- Cloudflare R2: hand-rolled AWS SigV4 (`scripts/lib/r2.mjs`: `putObject`, `headObject`) against `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com/<bucket>/<key>`, region `auto`, service `s3`, no AWS SDK. Public reads go through the custom domain `R2_PUBLIC_BASE`. Keys are content-addressed: `projects/<slug>/<name>-<sha8>.webp` (cell 512x341 and cover 1536x1024, WebP q82) and `projects/<slug>/loop-<sha8>.mp4`, uploaded with `Cache-Control: public, max-age=31536000, immutable`. Never add `?v=` to these URLs.
- Manifest: `scripts/media-manifest.json` is the skip gate (recorded entries are not regenerated without `--force`). It does not exist yet and is not gitignored, so it is expected to be committed after the first run.
- Env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (write credentials, scripts only), `R2_PUBLIC_BASE` (the only R2 value the app side is meant to read, `r2PublicBase()` in `lib/env.js`).
- Status: nothing in the app consumes R2 URLs or the manifest yet. Treat the pipeline as unverified until `--probe` and `--check` have run against real credentials.

## Data Storage

**Databases:**
- Notion databases (projects, bookings, optional calendar) via `@notionhq/client`. No SQL database, no ORM.
  - Connection: `NOTION_TOKEN` + `NOTION_PROJECTS_DATABASE_ID` / `NOTION_BOOKINGS_DATABASE_ID` / `NOTION_CALENDAR_DATABASE_ID`.

**File Storage:**
- Notion file properties (current media source, signed expiring URLs) proxied through `/api/media`.
- Cloudflare R2 (planned media host; scripts write, app does not yet read).
- Local `public/` for fonts, logo, placeholder art. Fonts are Geist and Geist Mono woff2 under `public/fonts/` with `OFL.txt`.

**Caching:**
- Next data cache via `unstable_cache` with tag `projects` (`lib/notion/projects.js`, `lib/notion/client.js`); ISR `revalidate = 60` on pages; HTTP immutable caching on versioned media URLs.
- Per-instance memory: `lastGood` project list (`lib/cms/projects.js`), PDF byte cache (`lib/pdf.js`), booking busy cache and pending slots (`lib/notion/bookings.js`, `lib/book/time.js`). None are shared across serverless instances.
- Invalidation: `bustProjectsCache()` in `lib/cms/bust.js` calls `revalidateTag("projects", { expire: 0 })` and `revalidatePath` for `/`, `/project` (layout) and `/api/media` (layout).

## Authentication & Identity

**Auth Provider:**
- None for visitors; there are no user accounts. Server-to-server only: Notion bearer token, Resend key, AI/Firecrawl keys, Notion webhook signature (below).

## Monitoring & Observability

**Error Tracking:**
- None.

**Analytics / Performance:**
- Vercel Speed Insights (`@vercel/speed-insights/next`, `app/layout.js`).

**Logs:**
- `console.error` / `console.warn` with bracketed prefixes (`[book]`, `[media]`, `[projects]`, `[cms-stamp]`, `[revalidate]`). Production build strips `console.*` except `error` (`removeConsole` in `next.config.mjs`), so `console.warn`/`console.info` output (including the Notion verification token log) does not appear in production logs.

## CI/CD & Deployment

**Hosting:**
- Vercel (primary). Docker standalone image as an alternative (`Dockerfile`, `compose.yaml`).

**CI Pipeline:**
- None detected (no `.github/workflows`, no `vercel.json`).

## Environment Configuration

**Required env vars (app):**
- Projects CMS: `NOTION_TOKEN`, `NOTION_PROJECTS_DATABASE_ID`. Without them the 18 placeholders are served.
- Booking: `NOTION_BOOKINGS_DATABASE_ID` and/or (`RESEND_API_KEY`, `RESEND_FROM`, `BOOKING_NOTIFY_EMAIL`).
- Webhook: `NOTION_WEBHOOK_SECRET`.

**Optional:** `NOTION_CALENDAR_DATABASE_ID`, `FIRECRAWL_API_KEY`, `GEMINI_API_KEY` (+ `GEMINI_MODEL`), `OPENAI_API_KEY` (+ `OPENAI_MODEL`).

**Scripts only:** `HF_CREDENTIALS`, `HIGGSFIELD_*`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE`.

**Secrets location:**
- Vercel project environment variables for production; `.env.local` (gitignored) for local dev and scripts. `.env.example` is the only committed env file and holds no values.

## Webhooks & Callbacks

**Incoming:**
- `POST /api/revalidate` (`app/api/revalidate/route.js`, `nodejs`, `force-dynamic`): Notion webhook, production URL `https://koussay.online/api/revalidate`.
  - Subscription handshake: a body containing `verification_token` is logged (`console.info`, which is stripped in production builds) and echoed back in the JSON response. Paste it into Notion's Verify step, then set `NOTION_WEBHOOK_SECRET` to it.
  - Normal events: `verifyWebhookSignature({ body, signature, verificationToken })` from `@notionhq/client` against header `x-notion-signature`; invalid -> 401. If `NOTION_WEBHOOK_SECRET` is unset, any body with a `type` field is accepted unauthenticated and busts the cache (open until the secret is set).
  - On success calls `bustProjectsCache()`.
- `GET /api/revalidate?secret=<NOTION_WEBHOOK_SECRET>`: manual cache bust; requires the secret in the query string.
- `app/robots.js` disallows `/api/book`, `/api/revalidate`, `/api/cms-stamp` for crawlers.

**Outgoing:**
- Resend emails (booking confirmation, owner alert, draft notice). No outgoing webhooks.

## SEO surface (no external service)

- `app/sitemap.js`, `app/robots.js`, `app/llms.txt/route.js`, JSON-LD via `components/JsonLd.jsx` and `lib/seo.js`, canonical site constants in `lib/site.js` (`SITE_URL = https://koussay.online`).

---

*Integration audit: 2026-10-02*
