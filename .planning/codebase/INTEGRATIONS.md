# External Integrations

**Analysis Date:** 2026-10-02

All env var names below are read through accessors in `lib/env.js` (app) or `scripts/lib/load-env.mjs` (scripts). `.env.example` documents every key. No `.env.local` is committed.

## APIs & External Services

**Projects: repo content:**
- Project text lives in `content/projects/*.mjs` and changes only through this repo. Notion no longer holds projects (that path was removed in Phase 3).
  - Notion is used only for bookings and blocked time: client singleton in `lib/notion/client.js` (`notion()`, `dataSourceId()`; `timeoutMs: 4000`, `retry: false` on purpose), property helpers in `lib/notion/props.js`, bookings in `lib/notion/bookings.js`.
  - Auth: `NOTION_TOKEN` (internal integration; needs Read content + Insert content).

**Media delivery (static, R2):**
- Every image, gallery file and share card is a static file at `https://media.koussay.online/projects/<slug>/<name>-<sha8>.<ext>`, listed in `content/media.json`. No API route serves media and nothing resizes at request time; `next/image` loads them through `images.remotePatterns`.
- Share cards: `node scripts/media.mjs share` renders 1200x630 JPEGs and uploads `projects/<slug>/og-<sha8>.jpg` and `projects/_site/og-home-<sha8>.jpg`, recorded as `og` and `site.home` with an inputs hash. The build fails on a missing or stale card. `/booking` uses the committed `app/booking/opengraph-image.png` (`share --booking`). Page metadata sets `openGraph.images`; `twitter:image` is inherited.
- Decision recorded in auto memory (`media-host-is-r2.md`): Notion is not the media host.

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

**Authoring-time media generation:**
- `scripts/media.mjs` (check, verify, generate, share) with `scripts/lib/{higgsfield,r2,art-direction,load-env}.mjs`. Never runs inside the app; a visitor cannot trigger it. Flags: `--dry-run`, `--force`, `--only=<slug,...>`, `--limit=N`, `--direction=`, `--video`, `--probe`.
- Higgsfield: SDK `@higgsfield/client/v2` (`config`, `higgsfield.subscribe(endpoint, { input, withPolling: true })`). Auth `HF_CREDENTIALS` as `id:secret` (or `HIGGSFIELD_API_KEY_ID` + `HIGGSFIELD_API_KEY_SECRET`). Defaults: image `/v1/text2image/soul` at `2016x1344` (exact 3:2), quality `1080p`; video `/v1/image2video/dop` model `dop-standard`. Overridable via `HIGGSFIELD_IMAGE_ENDPOINT`, `HIGGSFIELD_VIDEO_ENDPOINT`, `HIGGSFIELD_IMAGE_PARAMS`, `HIGGSFIELD_VIDEO_PARAMS` (read in `scripts/media.mjs`, documented in `.env.example`). Output normalised by `outputUrls()` (images array vs single `video` object). Per auto memory `higgsfield-free-plan-cannot-generate.md`, the free plan gates generation regardless of credit balance.
- Prompts: `scripts/lib/art-direction.mjs` (three directions, no-text/no-people negative prompt). Reads the project list from `content/projects/index.mjs`.
- Cloudflare R2: hand-rolled AWS SigV4 (`scripts/lib/r2.mjs`: `putObject`, `headObject`) against `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com/<bucket>/<key>`, region `auto`, service `s3`, no AWS SDK. Public reads go through the custom domain `R2_PUBLIC_BASE`. Keys are content-addressed: `projects/<slug>/<name>-<sha8>.webp` (cell 512x341 and cover 1536x1024, WebP q82) and `projects/<slug>/loop-<sha8>.mp4`, uploaded with `Cache-Control: public, max-age=31536000, immutable`. Never add `?v=` to these URLs.
- Manifest: `content/media.json` is the skip gate and is machine-written by `scripts/media.mjs`, its only writer. Images are served from https://media.koussay.online.
- Env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (write credentials, scripts only), `R2_PUBLIC_BASE` (the only R2 value the app side is meant to read, `r2PublicBase()` in `lib/env.js`).
- Status: the app consumes R2 URLs and the manifest through `lib/content.js`; `share` has published the cards.

## Data Storage

**Databases:**
- Notion databases (bookings, optional calendar) via `@notionhq/client`. No SQL database, no ORM.
  - Connection: `NOTION_TOKEN` + `NOTION_BOOKINGS_DATABASE_ID` / `NOTION_CALENDAR_DATABASE_ID`.

**File Storage:**
- Cloudflare R2 (media host; scripts write, the public domain serves).
- Local `public/` for fonts and logo. Fonts are Geist and Geist Mono woff2 under `public/fonts/` with `OFL.txt`. The old placeholder art and `404.webp` are removed and remain in git history.

**Caching:**
- Pages are static or prerendered; no Next data cache tags are used. HTTP immutable caching on the content-addressed R2 URLs.
- Per-instance memory: booking busy cache and pending slots (`lib/notion/bookings.js`, `lib/book/time.js`). None are shared across serverless instances.

## Authentication & Identity

**Auth Provider:**
- None for visitors; there are no user accounts. Server-to-server only: Notion bearer token, Resend key, AI/Firecrawl keys.

## Monitoring & Observability

**Error Tracking:**
- None.

**Analytics / Performance:**
- Vercel Speed Insights (`@vercel/speed-insights/next`, `app/layout.js`).

**Logs:**
- `console.error` / `console.warn` with bracketed prefixes (`[book]`, `[book/draft]`, `[ring]`, `[atlas]`). Production build strips `console.*` except `error` (`removeConsole` in `next.config.mjs`), so `console.warn`/`console.info` output does not appear in production logs.

## CI/CD & Deployment

**Hosting:**
- Vercel (primary). Docker standalone image as an alternative (`Dockerfile`, `compose.yaml`).

**CI Pipeline:**
- None detected (no `.github/workflows`, no `vercel.json`).

## Environment Configuration

**Required env vars (app):**
- Projects: no keys needed, content is in the repo.
- Booking: `NOTION_BOOKINGS_DATABASE_ID` and/or (`RESEND_API_KEY`, `RESEND_FROM`, `BOOKING_NOTIFY_EMAIL`).

**Optional:** `NOTION_CALENDAR_DATABASE_ID`, `FIRECRAWL_API_KEY`, `GEMINI_API_KEY` (+ `GEMINI_MODEL`), `OPENAI_API_KEY` (+ `OPENAI_MODEL`).

**Scripts only:** `HF_CREDENTIALS`, `HIGGSFIELD_*`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE`.

**Secrets location:**
- Vercel project environment variables for production; `.env.local` (gitignored) for local dev and scripts. `.env.example` is the only committed env file and holds no values.

## Webhooks & Callbacks

**Incoming:**
- None. `app/robots.js` disallows `/api/book` for crawlers.

**Outgoing:**
- Resend emails (booking confirmation, owner alert, draft notice). No outgoing webhooks.

## SEO surface (no external service)

- `app/sitemap.js`, `app/robots.js`, `app/llms.txt/route.js`, JSON-LD via `components/JsonLd.jsx` and `lib/seo.js`, canonical site constants in `lib/site.js` (`SITE_URL = https://koussay.online`).

---

*Integration audit: 2026-10-02*
