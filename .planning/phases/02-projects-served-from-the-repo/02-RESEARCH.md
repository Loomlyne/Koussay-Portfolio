# Phase 2: Projects served from the repo, media on R2 - Research

**Researched:** 2026-10-04
**Domain:** Next.js 16.3.8 App Router static content cut-over, Cloudflare R2 public media + zone Transform Rules, cross-origin WebGL textures, Playwright gates
**Confidence:** HIGH for the live snapshot, code paths, Cloudflare API shape and Vercel protection (all checked live on 2026-10-04). MEDIUM for edge-cache behaviour of the header rule (checked against docs and an API validation, not yet against a served object).

## Summary

The live site already ships everything the snapshot needs in one place: the RSC flight payload of `https://koussay.online/` (request header `RSC: 1`) carries the complete `projects` prop handed to `RegisterHome`, all eight rows, with every rendered field (`slug, name, type, year, liveUrl, updatedAt, file, order, detail{summary, overview, challenge, outcome, gallery, testimonial, tools}`) and no RSC back-references inside the array. Pixenhouse's single gallery item is a PDF that the live page expands to **29 pages** at `/api/media/<id>/g0p1..g0p29`, each a 1600×900 WebP. All eight covers are WebP at 1600 px wide (26–208 KB). Keep those bytes exactly; do not re-encode. Sitemap `lastmod` per project equals the row's `updatedAt`, so it is the `lastModified` source.

Two facts change the plan. First, **`overview` is rendered** (section "01 Overview" on every live page) but is absent from CONT-02 and from the D-09 list. "No visible change" (D-01) requires keeping it as a live-valued key. Second, **the hero image will load the same raw R2 URL as the atlas** once it goes `unoptimized` (D-06). The persistent ring builds its atlas even while parked on a project page, so a deep link fetches the same cover twice, in two request modes. The static `Access-Control-Allow-Origin: *` edge rule (D-05) makes that safe. In addition, set `crossOrigin="anonymous"` on every element that loads a raw cover URL (atlas, preload links, hero `<Image unoptimized>`, flyer, warm cache). Then there is one cache entry per URL and no double download.

The Cloudflare side is one API call. The zone has no `http_response_headers_transform` entrypoint yet. The `cf` CLI under profile `koussay` reaches the zone. A rule body was validated against the live API with `--validate-only` (accepted; a deliberately bad body was rejected with error 20087). r2.dev is disabled, the custom domain is active, and Vercel Deployment Protection is already **Standard Protection** (`ssoProtection.deploymentType = all_except_custom_domains`). Old deployment URLs return `302` to Vercel SSO for `/1.webp` and `/ppneuemontreal-book.otf`, so HYG-08 is a confirmation step.

**Primary recommendation:** Snapshot from the home RSC payload plus the Pixenhouse page into `content/projects/<slug>.mjs` (live order in `content/projects/index.mjs`). Ingest the exact live bytes to R2 with one script, `scripts/media.mjs` (`check | import-live | verify | generate`), which is the only writer of `content/media.json`. Resolve both in a synchronous, validating, `server-only` `lib/content.js`. Make `/project/[slug]` fully static (`dynamicParams = false`). Add the zone header rule. Set `crossOrigin="anonymous"` on every raw-cover loader. Prove TEST-02 by mutation.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Project copy and order | Repo content modules (build-time) | — | D-11: the repo is the only editor; no runtime source |
| Media bytes | CDN / Static (R2 at `media.koussay.online`) | — | Immutable content-addressed objects; no app server in the path |
| CORS on media | CDN edge (zone Transform Rule) | R2 bucket CORS | Bucket CORS only answers requests with `Origin`; the edge rule makes every response carry ACAO |
| Join, validate and fail the build | Frontend Server (build, `lib/content.js`) | Node script (`scripts/check-content.mjs`) | The build is the safety net; the same pure validator also runs fast outside Next |
| Ring atlas from covers | Browser (WebGL canvas) | — | Cross-origin image into a 2D canvas, then `texImage2D`; needs CORS-mode loads |
| Hero and ring stills | Browser direct from R2 (`unoptimized`) | — | D-06 |
| Gallery images | Vercel Image Optimizer (`/_next/image`) fetching R2 server-side | — | D-06; server-side fetch, so no CORS is involved |
| Share (OG/Twitter) images | Frontend Server (route handler, `sharp`) | R2 (source cover) | D-07: read the R2 cover; Phase 3 makes them static |
| Writing R2 and the manifest | Authoring script on Koussay's Mac | — | D-04 / MEDIA-04 single writer; never reachable from the app |
| Bookings | API / Backend (Notion) | — | Untouched |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Copy source
- **D-01:** The snapshot is taken from what koussay.online renders today (project pages, the ring's data, `llms.txt`, sitemap), not from the Notion API. No Notion key is needed. Fields that never render are dropped. The success test is "no visible change": ring cards, project pages and their copy match the live site before the cut-over.
- **D-02:** Slugs are kept exactly as live. Ring order is the live order.

#### Images
- **D-03:** All project images (ring covers, hero images, gallery items) are downloaded from what the live site serves and uploaded to the R2 bucket `koussay-media` in account `4afee478…` (cf profile `koussay`), served from `https://media.koussay.online` with content-addressed keys and `Cache-Control: public, max-age=31536000, immutable`. Pixenhouse's PDF gallery is captured as page images, so no PDF rendering is needed for it.
- **D-04:** One script is the only writer to R2 and to the media manifest; it verifies each object after upload and never rewrites a recorded entry without `--force`. The existing upload code in `scripts/lib/r2.mjs` (verified against the bucket on 2026-10-03) is reused.
- **D-05:** The ring loads R2 covers cross-origin: the atlas image loader sets `crossOrigin = "anonymous"`, the home page preload links carry `crossorigin`, and `media.koussay.online` always returns `Access-Control-Allow-Origin: *` (a Cloudflare rule on the zone, not only the bucket CORS, because R2 does not send `Vary: Origin`).
- **D-06:** `next.config.mjs` allows `media.koussay.online` in `images.remotePatterns`. Ring stills and hero images load direct (unoptimized); gallery images go through `next/image`.
- **D-07:** Share (Open Graph / Twitter) images keep showing each project's cover by reading it from R2; no share image may silently fall back to the logo.
- **D-08:** The smoke test is proven to fail when `crossOrigin` is removed from the atlas and when a shader typo is introduced, then restored green (TEST-02).

#### New schema fields
- **D-09:** Every content module carries the full schema keys (`kind`, `client`, `industry`, `location`, `year`, `role`, `services[]`, `status`, `liveUrl`, `summary`, `challenge`, `approach`, `outcome`, `tools[]`, `identity`, gallery `kind` and `caption`), but fields with no published data stay empty (null or empty array) until Koussay's Phase 7 interviews. Nothing is inferred or invented. Fields that exist today (name, type, year, liveUrl, summary, challenge, outcome, tools, gallery, testimonial) carry their live values.
- **D-10:** The build fails, naming project and field, when a key is missing or a media reference is not in the manifest. An empty value is allowed; a missing key is not. The UI renders nothing for empty fields.

#### Editing after cut-over
- **D-11:** After this phase, project text and media change only through the repo: Koussay says what to change, the control session edits the content module and ships it. Notion project rows no longer affect the site and are left untouched (Phase 3 removes the code path).

### Claude's Discretion
- Content module format (JS modules per slug vs JSON) and the manifest's file and shape, following `.planning/research/ARCHITECTURE.md`.
- Image formats and sizes, keeping today's visual output.
- Whether `/api/media`, `CmsLive`, `/api/cms-stamp` and `/api/revalidate` are disconnected here or only in Phase 3, as long as nothing calls Notion for projects after this phase and Phase 3 still deletes them.

### Deferred Ideas (OUT OF SCOPE)
- Filling role, services, client, industry, location, approach and identity — Phase 7 interviews.
- Deleting the Notion projects database or its rows — not planned; it simply stops being read.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONT-02 | Schema carries `kind, client, industry, location, year, role, services[], status, liveUrl, summary, challenge, approach, outcome, tools[], identity`, gallery `kind` + `caption` | §Content schema: full key list, plus live-rendered keys `slug, name, type, overview, testimonial, updated` |
| CONT-06 | `getProjects()` resolves synchronously from modules + manifest; a broken media reference fails `npm run build` | §Pattern 2 (`lib/content.js` + pure validator), §Code Examples |
| CONT-08 | 18 placeholders, their Behance images and `public/404.webp` removed; no fallback can render them | §Placeholder removal map (every importer listed), 404 replacement |
| HYG-08 | Vercel Deployment Protection stops old deployment URLs serving removed files; Koussay checks | §HYG-08: already `all_except_custom_domains`; old URLs 302 to SSO |
| MEDIA-02 | R2 behind custom domain, content-addressed, immutable Cache-Control | §Media ingest; custom domain active, r2.dev disabled (verified) |
| MEDIA-03 | ACAO on every response; atlas + preload request cross-origin | §Pattern 4 (edge rule, validated body), §Pattern 3 (every raw-cover loader) |
| MEDIA-04 | One script is the only writer; records provenance before upload; verifies; `--force` gate | §Pattern 5 (`scripts/media.mjs`) |
| MEDIA-06 | `remotePatterns` for R2; stills/hero unoptimized; gallery via `next/image` | §next.config, §Pattern 3 |
| TEST-02 | Smoke test fails without `crossOrigin` and with a shader typo, then green | §TEST-02 mutation proof: three logs `THREE.WebGLState:` SecurityError and shader errors via `console.error` |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- JavaScript only (no TypeScript). `@/*` alias works in app code. **Content modules and anything scripts import use no `@/` alias** (Node cannot resolve it).
- Read env through `lib/env.js` in app code. Scripts use `loadEnv()` from `scripts/lib/load-env.mjs`. **Never read or print `.env.local`.**
- Prettier defaults, `npm run format:check` is a gate. ESLint flat config. Phase-end gate (HYG-05): `format:check`, `lint`, `build`, `npm test` all green.
- Logging: bracketed tags (`[content]`, `[media]`, `[atlas]`, `[og]`). `console.error` for failures. No `console.log` in app code. Note that `removeConsole` strips `console.warn` in production builds.
- API routes: `runtime = "nodejs"`, JSON error bodies, timeouts on external calls (`AbortSignal.timeout`).
- Ring internals are preserved (packed `uScale`, fan order, one-frame-stale focus, snap-only-decelerates, `forceContextLoss`, load-counter gate). Only `atlas.js` `load()` gains one `crossOrigin` line.
- Bookings code (`lib/notion/client.js`, `lib/notion/bookings.js`, `lib/book/*`) is off-limits.
- Paid or destructive operations sit behind a manifest or an explicit flag. `--dry-run` comes first.
- Control session ships. Koussay signs plan, UAT and ship. Secrets stay in his terminal. Human steps are one numbered action, then wait.
- Port 3100 only for tests. Kill only by port (`lsof -nP -iTCP:3100 -sTCP:LISTEN -t | xargs kill`), never by pattern.
- Cloudflare: always `cf` from the repo dir (profile `koussay` bound). Never the default wrangler login.
- Design before code for anything a visitor sees (applies to the 404 page replacement).
- Pricing and legal copy: do not invent. The LICENSE wording for media must be approved by Koussay.

## Standard Stack

No new packages. Everything needed is installed or built in.

### Core (already present)
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| next | 16.3.8 [VERIFIED: node_modules] | Static params, `next/image` `remotePatterns`/`unoptimized`, metadata image routes | Existing framework |
| three | 0.185.1 [VERIFIED: node_modules] | Atlas texture. `WebGLState.texImage2D` wraps the call in try/catch and logs `THREE.WebGLState:` via `console.error` | Makes the taint visible to the smoke test |
| sharp | 0.34.5 [VERIFIED: node_modules] | OG at request time (kept until Phase 3); `metadata()` for w/h in the media script | Already a dependency |
| @playwright/test | 1.63.0 [VERIFIED: npx] | Smoke test, mutation proofs | Existing gate |
| `server-only` | built into Next [CITED: node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md "installing server-only … is optional"] | Keep `lib/content.js` out of client bundles | No install |

### Tools
| Tool | Version | Purpose |
|------|---------|---------|
| `cf` CLI | 1.0.0-beta.12, profile `koussay` [VERIFIED] | Zone response-header rule, cache purge, R2 domain/CORS reads |
| `vercel` CLI | 59.5.0, logged in to scope `koussays` [VERIFIED] | Read `ssoProtection`, list old deployments (read-only) |

**Installation:** none.

## Package Legitimacy Audit

No external packages are installed in this phase. `server-only` is resolved internally by Next and is not installed. slopcheck was not run because there is nothing to check.

| Package | Registry | Disposition |
|---------|----------|-------------|
| (none) | — | — |

## Live snapshot facts (verified 2026-10-04)

| Item | Finding |
|------|---------|
| Source of truth | `curl -H 'RSC: 1' https://koussay.online/` → flight row with `"projects":[…]` (the `RegisterHome` prop). 8 rows. No `"$…"` reference strings inside the array (checked) |
| Order | pixenhouse, vamos-taxi, looma-kitchen, almar-private-journey, fido-homes, elysee-home-design, clickit-story, artemis-luxe (`index` 0..7, `order` 1..8) |
| Fields per row | `id` (Notion page id, drop), `updatedAt`, `file`, `slug`, `name`, `type`, `year`, `liveUrl`, `order` (drop: order = array position), `index`, `detail{summary, overview, challenge, outcome, gallery, testimonial{quote,author,role}, tools[]}` |
| Rendered on the project page | `name` (h1), `type`, `year`, display index, live link (`liveUrl`), summary, **Overview**, Challenge, Outcome sections, Gallery, Tools. Testimonial is empty for all 8 (renders nothing). `ProjectSections` renders `overview`, `challenge`, `outcome` |
| Galleries | Only Pixenhouse has one: one PDF expanded live to 29 items `g0p1..g0p29`, each `kind:"pdf", page, pages:29` |
| Rendered gallery alt | `PIXENHOUSE — page N of 29. Brand & Web by Koussay Zayani.` (from HTML; RSC alt is the filename `Brand Guideline Pixenhouse.pdf`). **Store the rendered string literally** |
| Cover bytes | All `image/webp`, 1600 wide: pixenhouse 1600×1200 (32,988 B), vamos 1600×881, looma 1600×1069, almar 1600×900, fido 1600×900, elysee 1600×1125, clickit 1600×901 (207,778 B), artemis 1600×897 |
| PDF page bytes | 1600×900 WebP, ~14–31 KB each |
| Sitemap `lastmod` | Equals each row's `updatedAt` (e.g. pixenhouse `2026-09-14T11:45:00.000Z`, artemis `2026-09-04T19:32:00.000Z`) |
| llms.txt | Generated from the same rows: `name — type · year · summary · live: liveUrl` |
| OG | `og:image` = `/project/<slug>/opengraph-image/cover?<hash>`, 1200×630 PNG; home uses the first project's cover |
| Values to keep exactly | `PIXENHOUSE` uppercase; `Élysée Home Design`; curly `’` in Artemis copy; Clickit `https://www.clickitstory.ae`; Almar `https://almarprod.framer.website/` (trailing slash); tool `Hermes_Agent`; `Adobe illustrator` lowercase i |

## Architecture Patterns

### System Architecture Diagram

```
SNAPSHOT (once, on Koussay's Mac, before cut-over)
 koussay.online ──RSC: 1──▶ extract "projects":[…] ─┐
 koussay.online/project/pixenhouse ──RSC + HTML──▶ 29 page URLs + rendered alts ─┤
                                                     ▼
              .planning/phases/02-…/snapshot/live-2026-10-04.json  (evidence, committed)
                    │                                   │
     Claude writes  ▼                                   ▼  scripts/media.mjs import-live
 content/projects/<slug>.mjs                media-work/<slug>/<slot>.webp (gitignored, raw bytes)
 content/projects/index.mjs (ORDER)                     │ sha256 → key projects/<slug>/<slot>-<sha8>.webp
                    │                                   │ PUT (immutable) → HEAD (S3) → GET public, sha match
                    │                                   ▼
                    │                        content/media.json  (only writer: media.mjs)
                    ▼                                   ▼
 BUILD (next build): lib/content.js (server-only)  = ORDER ⨝ manifest → validate() → throws → build fails
        │            │                 │                │                     │
        ▼            ▼                 ▼                ▼                     ▼
   app/page.js  /project/[slug]   sitemap.js      llms.txt          OG routes (fetch R2 cover → sharp)
   (static,     (●SSG, 8 paths,   (lastModified   (same text)       (project: throw on fetch failure,
   preload      dynamicParams     = updated)                         never logo)
   crossorigin) =false)
        │            │
        ▼            ▼
 BROWSER: RegisterHome → HomeRing → Carousel → atlas load(img.crossOrigin="anonymous") ─┐
          ProjectMedia <Image unoptimized crossOrigin="anonymous"> ─────────────────────┤ same URL, same mode
          flyer preloadImage / warm retain (crossOrigin="anonymous") ───────────────────┘
          ProjectGallery <Image width height> → /_next/image?url=https://media… (server fetch)
                                   │
                                   ▼
 https://media.koussay.online/projects/<slug>/<slot>-<sha8>.webp
   R2 custom domain → Cloudflare cache → http_response_headers_transform: set ACAO "*" on every response
```

### Recommended Project Structure
```
content/
  projects/
    index.mjs            # ORDER (live ring order) + PROJECTS_IN_ORDER; imports the 8 modules relatively
    pixenhouse.mjs       # export default {…} — no imports, no @/ alias
    … (7 more)
  media.json             # machine-written by scripts/media.mjs only
lib/
  content.js             # import "server-only"; join + validate + indexProjects; getProjects(), getProject()
  content-schema.mjs     # pure: SCHEMA_KEYS, validateContent(projects, manifest) → throws "[content] <slug>.<field>: …"
scripts/
  media.mjs              # check | import-live | verify | generate (single writer of R2 + content/media.json)
  check-content.mjs      # node: imports content + schema, reads media.json via fs, exits 1 with the same message
  lib/r2.mjs             # reused unchanged (putObject, headObject, publicUrl)
media-work/              # gitignored: raw bytes + provenance.json before upload
```

### Pattern 1: Snapshot extraction (D-01)
**What:** Read the `projects` prop from the RSC flight response. Do not scrape HTML.
**Recipe (verified working 2026-10-04):**
1. `fetch("https://koussay.online/", { headers: { RSC: "1" } })`. Find `"projects":[` and slice with a string-aware bracket matcher (see Code Examples), then `JSON.parse`. Assert 8 rows and no string starting with `$` (RSC escapes and references).
2. `fetch("https://koussay.online/project/pixenhouse", { headers: { RSC: "1" } })`. Match the expanded items `"file":"/api/media/<id>/g0p<n>?v=…","alt":…,"kind":"pdf","page":n,"pages":29` (29 hits).
3. Fetch the HTML of each `/project/<slug>`. Record the rendered strings for alt text (gallery `<img alt>`), h1, summary and section bodies. They are the comparison target for "no visible change".
4. Cross-check against `/llms.txt` and `/sitemap.xml` (`lastmod` = `updatedAt`).
5. Save the raw extraction as `.planning/phases/02-projects-served-from-the-repo/snapshot/live-2026-10-04.json` before the cut-over. Once the cut-over deploys, the live site can no longer be the reference.

### Pattern 2: Content modules + synchronous validating resolver (CONT-02, CONT-06, D-09, D-10)
- `.mjs` per project, `export default {…}`, no imports. `index.mjs` imports them relatively and exports `ORDER`/`PROJECTS_IN_ORDER`. This follows `.planning/research/ARCHITECTURE.md` §2.
- **Required keys** (the presence check is `Object.hasOwn`; an empty value is allowed, a missing key is not): `slug, name, updated, type, kind, client, industry, location, year, role, services, status, liveUrl, summary, overview, challenge, approach, outcome, tools, testimonial, identity, gallery`. Gallery items need `media, alt, kind, caption`.
- **Type checks:** strings or `null`; `services`/`tools`/`gallery` are arrays; `kind ∈ {null,"client","own"}`; `status ∈ {null,"live","pre-launch"}`; gallery `kind ∈ {null,"screenshot","generated","identity","video"}`; `updated` is a non-empty ISO date (the sitemap needs it).
- **Media checks:** `manifest.projects[slug].cover` exists with an `https://media.koussay.online/projects/` URL. Every `gallery[i].media` exists in `manifest.projects[slug].gallery`. Slugs are unique, count ≤ `MAX_PLANES`, every manifest slug is in ORDER and the reverse.
- **Error format:** `[content] pixenhouse.approach: key missing` / `[content] pixenhouse.gallery[3].media "brand-guideline-p04": not in content/media.json`. Throw at module evaluation of `lib/content.js` so `next build` fails. `scripts/check-content.mjs` runs the same validator in under a second.
- **Resolved record keeps today's shape** so the UI barely changes: `{ slug, name, type, year, liveUrl, updatedAt: updated, file: cover.url, index, kind, client, industry, location, role, services, status, detail: { summary, overview, challenge, approach, outcome, tools, testimonial, identity, gallery: [{ file, alt, kind, caption, width, height }] } }`.
- Live values per D-09: `name, type, year, liveUrl, summary, overview, challenge, outcome, tools, testimonial` (empty quote/author/role; store `null` or the empty object; `ProjectTestimonial` renders nothing either way), and gallery `alt`. Everything else is `null` / `[]`. Gallery `kind` is `null`: the live value `"pdf"` is not in the new enum, and mapping it to `"identity"` would be an inference (see Open Questions).

### Pattern 3: One request mode per raw cover URL (MEDIA-03, D-05, D-06)
Every element that loads a raw R2 cover URL uses `crossOrigin="anonymous"`:

| Loader | File | Change |
|--------|------|--------|
| Atlas `load()` | `components/ring/atlas.js` | `img.crossOrigin = "anonymous"` **before** `img.src`, next to `fetchPriority`. Raise the load-failure log to `console.error("[atlas]", …)`, because `removeConsole` strips `warn` in production |
| Home preload | `app/page.js` | `<link rel="preload" as="image" crossOrigin="anonymous" …>`. Without it Chrome does not use the preload (credentials-mode mismatch, a console *warning*) and downloads the image twice |
| Hero | `components/project/ProjectMedia.jsx` | `<Image unoptimized crossOrigin="anonymous" preload …>`. `next/image` forwards `crossOrigin` to the `<img>` and to `ReactDOM.preload` [VERIFIED: next/dist/client/image-component.js `ImagePreload` passes `crossOrigin`] |
| Flyer | `components/SharedTransitionProvider.jsx` | `preloadImage`: `img.crossOrigin = "anonymous"` before `src`; flyer `<img crossOrigin="anonymous">` |
| Warm cache | `lib/project/warm.js`, `components/project/ProjectWarm.jsx` | Hero warming must target the raw URL (unoptimized) with `crossOrigin="anonymous"`. Skip `getImageProps` for the hero. Gallery warming keeps `getImageProps` (same-origin `/_next/image`) |
| Pager thumb | `ProjectPager.jsx` | Leave optimized (`/_next/image`, same-origin, no CORS). Covered by `remotePatterns` |

Why this matters here: `HomeRingProvider` mounts `<Carousel>` as soon as any page registers projects, **including a project page** (parked), and the atlas starts fetching immediately. A deep link to `/project/x` therefore loads the hero cover and the atlas cover, which are the same URL, at the same time.

### Pattern 4: Zone response-header rule (MEDIA-03, D-05)
- Phase `http_response_headers_transform`, zone `d98c6ae2d8f14c329dafe0fa530a9d98`. No entrypoint exists yet (404, code 10003, checked 2026-10-04). `phases update` (HTTP `PUT …/rulesets/phases/http_response_headers_transform/entrypoint`) creates it.
- Use operation **`set`**, not `add`. `add` appends a second ACAO when R2 also sends one, and duplicate ACAO values fail CORS. `set` replaces. [CITED: developers.cloudflare.com/rules/transform/response-header-modification "later rules can overwrite"; operation enum `set|remove|add` from API error 20087]
- Body validated against the live API with `--validate-only true` (exit 0, nothing persisted; re-read still 404). See Code Examples.
- **`Vary: Origin`:** R2 adds `Vary: Origin` only when the request had an `Origin` (observed: a 404 with Origin had `vary: Origin`; without Origin there was no ACAO and no Vary). Once ACAO is static `*`, Vary has no correctness impact. At worst it makes a browser refetch between a no-cors and a cors request for the same URL. Pattern 3 removes that case. Do not remove Vary (no need, and it would also drop any `Accept-Encoding` variant).
- Zone `browser_cache_ttl` is 14400. Cloudflare only overrides origin Cache-Control when the origin value is **lower** than this [CITED: developers.cloudflare.com/cache/how-to/edge-browser-cache-ttl]. The 1-year immutable header should pass unchanged. Verify with curl (MEDIUM until checked).
- After the rule lands, purge the media host once (`cf cache purge -z <zone> --body '{"files":[…]}' -f`, or purge everything for the host if objects were already requested), because cached objects keep their old headers [CITED: developers.cloudflare.com/r2/buckets/cors].

### Pattern 5: The single media writer (MEDIA-04, D-04)
`scripts/media.mjs` replaces `scripts/generate-project-media.mjs`. Move the generation path in and delete the old file, so exactly one file writes R2 and the manifest.
- `check`: the existing put/head/public health check, printing `public ok` (success criterion 8). Add: GET the public URL with and without `Origin` and print the ACAO for each.
- `import-live`: for each slot in the snapshot JSON, if the slot is recorded and `--force` is absent, skip. Otherwise download the exact bytes, write them to `media-work/<slug>/<slot>.webp` and record provenance there **before upload**. Then compute sha256, key `projects/<slug>/<slot>-<sha8>.webp`, `putObject(…, "image/webp", { cacheControl: "public, max-age=31536000, immutable" })`, `headObject` (size match), GET the public URL (sha match, `content-type`, `cache-control`). Only then write the manifest entry, atomically (tmp + rename, sorted keys, 2-space, trailing newline), after each success.
- `verify`: for every manifest object, check 200, type, immutable, ACAO `*` without Origin and with Origin, sha256 matches, S3 HEAD size matches. Exit 1 on any miss.
- `generate` (ported, not run this phase): reads `content/projects/index.mjs` instead of the deleted `components/ring/projects.js` and writes `content/media.json`. Per MEDIA-04, record `requestId`, endpoint, prompt and the raw-output path in `media-work/<slug>/provenance.json` **after download and before upload**. Exercise it only with `--dry-run`.
- Keep the bytes as served: no re-encode. They are already WebP ≤1600 px, re-encoding would only lose quality, and the hash is over the output bytes.
- Slot names: `cover`; gallery `brand-guideline-p01` … `brand-guideline-p29` (zero-padded so sorted keys keep page order).
- Manifest entry: `{ key, url, type: "image/webp", width, height, bytes, sha256, origin: { kind: "snapshot", from: "<live /api/media URL>", at } }`. Store absolute `url` so the app needs no env.

### Pattern 6: Static routes (CONT-06, success criteria 3 and 4)
- `app/project/[slug]/page.js`: `generateStaticParams` returns `getProjects().map(({slug}) => ({slug}))` with no try/catch; `export const dynamicParams = false`; delete `revalidate`. Unknown slugs (`/project/matchday`) return a real 404 [CITED: node_modules/next/dist/docs/…/dynamicParams.md "false: … will return a 404"; valid because `cacheComponents` is not enabled]. Remove `withExpandedPdfGallery`.
- Delete `revalidate = 60` from `app/page.js`, `app/llms.txt/route.js` and the project OG/Twitter routes. Content changes only by deploy.
- `app/sitemap.js`: `lastModified: new Date(project.updatedAt)` from `updated`. No `now` fallback for projects (the validator guarantees the field).
- Build route table check: `/project/[slug]` shows `●` (SSG) with 8 paths.

### Pattern 7: OG images (D-07, minimal)
- `lib/og-image.js`: drop the `@/lib/notion/*` imports and `fetchNotionCover`. Add `fetchCover(project)`: `fetch(project.file, { signal: AbortSignal.timeout(8000) })`. **If a project is passed and its cover cannot be fetched, throw.** That gives a 500 or a failed prerender instead of a silent logo. The logo stays only for `ogImageResponse()` with no project (booking).
- The home OG keeps "first project's cover". Keep `sharp` at request time; Phase 3 makes these static.
- Metadata image routes are static by default unless they use request-time APIs [CITED: node_modules/next/dist/docs/…/opengraph-image.md L91–93]. Whether `/project/[slug]/opengraph-image/[__metadata_id__]` prerenders the 8 slugs at build is MEDIUM; read the build route table. Either outcome satisfies D-07.

### Pattern 8: Placeholder removal map (CONT-08)
Delete `components/ring/projects.js`, `public/1.webp`…`public/18.webp` and `public/404.webp`, and fix every importer in the same commit:

| File | Today | Change |
|------|-------|--------|
| `lib/cms/projects.js` | FALLBACK, `lastGood`, Notion bundle | Delete; callers import `getProjects` from `@/lib/content` |
| `lib/projects.js` | imports placeholders; `PROJECTS`, `IMAGE_FILES`, `list = PROJECTS` defaults | Remove the import, both exports and every default (list becomes required) |
| `components/Carousel.jsx` | `projects = FALLBACK_PROJECTS`, `ring = … : FALLBACK_PROJECTS` | Require `projects`; `HomeRingProvider` only mounts it with a non-empty list |
| `components/ring/meta.js` | `projects = FALLBACK_PROJECTS` | Require the argument |
| `components/ring/atlas.js` | `files = IMAGE_FILES` | Require the argument |
| `scripts/generate-project-media.mjs` | imports `components/ring/projects.js` twice | Replaced by `scripts/media.mjs` |
| `components/project/ProjectNotFound.jsx` | `<Image src="/404.webp">` | Replace with live HTML "404" set in Geist inside the same home link (design sign-off: before/after screenshot) |
| README L44, L121–126; LICENSE L34–47 | describe placeholder art in `public/` | Update in the same commit. LICENSE wording about project media on `media.koussay.online` needs Koussay's approval |
| AGENTS.md | "Eighteen project cards", `ring/projects.js` in Layout, "PROJECTS order is ring order" | Point to `content/projects/index.mjs` (`ORDER`); keep the rule text |

The gallery PDF branch (`PdfStack`, `isPaperItem`, `pagedSrc`, `isPdfName` import) depends on the `/api/media` URL grammar. Replace it with one renderer: `next/image` with `width`/`height` from the manifest, `sizes={GALLERY_IMAGE_SIZES}`, the paper frame classes (`galleryFramePaper` + `galleryImagePaper`: intrinsic ratio, width 100%, height auto) for **every** item, and the first two `loading="eager"`. That reproduces today's only live gallery exactly; Phase 5 redesigns galleries. Note that `lib/project/warm.js` `collectSrcs` skips PDF pages after the first today. Keep that by warming only the first gallery item, or it will decode 29 pages on a ring hover.

### Pattern 9: Disconnect the Notion projects path now, delete in Phase 3
| Piece | This phase | Why |
|-------|-----------|-----|
| `CmsLive` | Remove from `app/providers.js` (file deleted in Phase 3, or now) | It polls `/api/cms-stamp` every 20 s, which queries Notion projects |
| `/api/cms-stamp` | Body becomes a constant `Response.json({ stamp: "" }, no-store)` with no Notion imports | Stale tabs keep polling. An empty stamp makes old `CmsLive` do nothing (`if (!next) return`) |
| `/api/revalidate` | Leave | `verifyWebhookSignature` is a local HMAC [VERIFIED: @notionhq/client/build/src/webhooks.js]. `bustProjectsCache` makes no Notion call |
| `/api/media` | Leave for one deploy | Stale open tabs and HTML may request old `?v=` URLs. Those are `immutable` and mostly served from the Vercel edge cache. Phase 3 deletes it |
| `next.config.mjs` `localPatterns /api/media/**`, `serverExternalPackages`, `outputFileTracingIncludes` | Leave | Phase 3 |
| `lib/notion/client.js`, `lib/notion/bookings.js` | Untouched | Bookings |

### next.config.mjs (MEDIA-06)
```js
images: {
  remotePatterns: [
    { protocol: "https", hostname: "media.koussay.online", port: "", pathname: "/projects/**", search: "" },
  ],
  localPatterns: [ { pathname: "/api/media/**" }, { pathname: "/**", search: "" } ], // unchanged until Phase 3
},
```
[CITED: node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md §remotePatterns]. The optimizer cache TTL follows the larger of `minimumCacheTTL` (4 h) and the upstream `max-age` (1 year) [CITED: same file §minimumCacheTTL].

### Anti-Patterns to Avoid
- **Re-encoding the snapshot images.** It causes generation loss and a visible change. Upload the bytes as served.
- **Deriving alt text or slugs at runtime from new fields.** Store the rendered strings literally.
- **`operation: "add"` in the header rule.** Use `set`.
- **Any `?v=` on R2 URLs.** Keys are content-addressed.
- **Importing `lib/content.js` from scripts.** `server-only` throws outside Next. Scripts import `content/projects/index.mjs` and `lib/content-schema.mjs`, and read `content/media.json` with `fs`.
- **Mapping `overview` to `approach`.** That would invent a narrative structure. Keep `overview` (rendered today); `approach` stays `null`.
- **Silent logo fallback in OG for a project.** Throw.
- **Deleting `/api/media` in this phase.** Stale clients still request it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| S3 signing | A new signer or the AWS SDK | `scripts/lib/r2.mjs` (verified 2026-10-03) | Already proven against this bucket |
| CORS on media | Per-origin ACAO logic, a Worker | Zone Transform Rule `set ACAO *` | One rule; covers cached responses |
| Image sizes for the gallery | Custom srcset | `next/image` with `width`/`height`/`sizes` | D-06; optimizer + remotePatterns |
| Preload with CORS | Hand-built `<link>` for the hero | `<Image preload crossOrigin>` (emits `ReactDOM.preload` with `crossOrigin`) | Exactly matches the `<img>` request |
| Image dimensions | Parsing WebP headers | `sharp(buf).metadata()` (scripts) | Already installed |
| Static 404 for unknown slugs | Middleware or a redirect map | `dynamicParams = false` | Real 404 at the edge |

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Notion projects DB (8 rows) stays untouched and stops being read (D-11). R2 bucket `koussay-media` holds `_healthcheck/*.txt` objects from `--check` runs | None. Optionally leave the healthcheck objects (no cost concern) |
| Live service config | Zone `koussay.online`: no response-header ruleset yet. R2 bucket CORS: `*`, GET/HEAD, max-age 86400 (in place). Custom domain active, r2.dev disabled (verified). Notion webhook still posts to `/api/revalidate` | Add the header rule (API). Webhook: Phase 3 |
| OS-registered state | None. Verified: no launchd/cron for this repo is referenced in the repo or planning | None |
| Secrets/env vars | `.env.local` `R2_*` (scripts only). Vercel env still has `NOTION_PROJECTS_DATABASE_ID`, `NOTION_WEBHOOK_SECRET` (unused after cut-over, except by `/api/media`) | None this phase. Phase 3 removes them |
| Build artifacts | `.next/` from earlier builds; `scripts/media-manifest.json` never existed; Vercel keeps old deployments (protected) | None; `npm run build` regenerates |

## Common Pitfalls

### Pitfall 1: Atlas canvas taint is invisible until runtime
**What goes wrong:** Build and lint pass. Then the ring shows blank cells or throws `SecurityError` on `texImage2D`.
**Why:** Cross-origin image into a 2D canvas without CORS mode.
**How to avoid:** `crossOrigin` before `src` in `atlas.js` `load()`, plus the edge rule.
**Warning signs:** Console `THREE.WebGLState: SecurityError: Failed to execute 'texImage2D'…` or `Access to image at 'https://media…' … blocked by CORS policy`.

### Pitfall 2: Warm-cache mode mixing
**What goes wrong:** The ring renders on a cold load but breaks after visiting a project page.
**Why:** The hero or flyer cached a no-cors response without ACAO. The atlas's later CORS request reuses it and fails.
**How to avoid:** Static ACAO on every response (Pattern 4) **and** the same `crossOrigin` on every raw-cover loader (Pattern 3).
**Warning signs:** It fails only on the second navigation. The smoke test needs a project→home path.

### Pitfall 3: `overview` dropped because it is not in CONT-02
**What goes wrong:** Every project page loses its "01 Overview" section, a visible change.
**How to avoid:** Keep `overview` as a required key with its live value.

### Pitfall 4: Gallery frame crops PDF pages
**What goes wrong:** The default `galleryFrame` is `aspect-ratio: 3/2; object-fit: cover`, which crops 16:9 pages.
**How to avoid:** Use paper framing (intrinsic ratio) for all items this phase.

### Pitfall 5: Build depends on the network
**What goes wrong:** OG prerender and the `/_next/image` server fetch need `media.koussay.online` reachable from the build and the test machine. A local `npm test` offline now fails, which it did not before (the 18 placeholders were local).
**How to avoid:** Accept and document it. `npm test` requires network. `retries: 1` stays.

### Pitfall 6: Validator runs only inside `next build`
**What goes wrong:** Each check costs about a minute.
**How to avoid:** A shared pure `lib/content-schema.mjs` and `node scripts/check-content.mjs` as a sub-second gate. `lib/content.js` calls the same function.

### Pitfall 7: `console.warn` stripped in production
**What goes wrong:** `removeConsole` drops `[atlas]` warnings in `next start`. A failed cover load shows only the browser's own message.
**How to avoid:** Use `console.error` for atlas load failures.

### Pitfall 8: Stale clients
**What goes wrong:** Open tabs on the old bundle keep polling `/api/cms-stamp` and requesting `/api/media?v=`.
**How to avoid:** cms-stamp returns a constant empty stamp; `/api/media` stays one deploy. Do not read the resulting log lines as regressions.

### Pitfall 9: Second writer to the manifest
**What goes wrong:** Leaving `generate-project-media.mjs` beside `media.mjs` creates two writers (it writes `scripts/media-manifest.json`).
**How to avoid:** Move generation into `media.mjs`, delete the old file, and grep for `media-manifest.json` (no hits).

### Pitfall 10: 404 page visual change
**What goes wrong:** Removing `public/404.webp` (a "404" in a non-Geist face, CONCERNS lists it as third-party) changes the 404 page.
**How to avoid:** Design first: a screenshot of the HTML "404" in Geist for Koussay's signature.

## Code Examples

### Snapshot extractor (tested against live, 2026-10-04)
```js
// Pull the `projects` prop out of a Next 16 RSC flight response.
function sliceJson(text, marker) {
  const at = text.indexOf(marker);
  if (at === -1) throw new Error(`marker not found: ${marker}`);
  let i = at + marker.length - 1, depth = 0, inStr = false, esc = false;
  for (let k = i; k < text.length; k++) {
    const c = text[k];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === "[" || c === "{") depth++;
    else if (c === "]" || c === "}") { depth--; if (depth === 0) return text.slice(i, k + 1); }
  }
  throw new Error("unbalanced");
}
const res = await fetch("https://koussay.online/", { headers: { RSC: "1" } });
const projects = JSON.parse(sliceJson(await res.text(), '"projects":['));
if (JSON.stringify(projects).match(/"\$[^"]*"/)) throw new Error("RSC references inside projects");
// → 8 rows in live order. Pixenhouse pages:
const pix = await (await fetch("https://koussay.online/project/pixenhouse", { headers: { RSC: "1" } })).text();
const pages = [...pix.matchAll(/"file":"(\/api\/media\/[0-9a-f]+\/g0p(\d+)\?[^"]+)","alt":"([^"]*)","kind":"pdf","page":(\d+),"pages":(\d+)/g)];
// → 29
```

### Content module (shape)
```js
// content/projects/pixenhouse.mjs — snapshot of koussay.online, 2026-10-04. No imports.
export default {
  slug: "pixenhouse",
  name: "PIXENHOUSE",
  updated: "2026-09-14T11:45:00.000Z",
  type: "Brand & Web",
  kind: null, client: null, industry: null, location: null,
  year: "2026",
  role: null, services: [], status: null,
  liveUrl: "https://www.pixenhouse.ae",
  summary: `Brand and website for a Dubai production studio. …`,
  overview: `PIXENHOUSE makes commercials, …`,
  challenge: `The old brand was basic …`,
  approach: null,
  outcome: `The studio can explain itself in one scroll. …`,
  tools: ["Framer", "Adobe illustrator", "Adobe Photoshop"],
  testimonial: null,
  identity: null,
  gallery: [
    { media: "brand-guideline-p01", alt: "PIXENHOUSE — page 1 of 29. Brand & Web by Koussay Zayani.", kind: null, caption: null },
    // … p02..p29
  ],
};
```

### Resolver
```js
// lib/content.js
import "server-only";
import { PROJECTS_IN_ORDER } from "@/content/projects/index.mjs";
import manifest from "@/content/media.json";
import { resolveContent } from "@/lib/content-schema.mjs"; // validates, throws "[content] slug.field: …"
import { indexProjects } from "@/lib/projects";

const PROJECTS = indexProjects(resolveContent(PROJECTS_IN_ORDER, manifest));
export function getProjects() { return PROJECTS; }
export function getProject(slug) { return PROJECTS.find((p) => p.slug === slug); }
```

### Atlas (the only ring change)
```js
const img = new Image();
img.crossOrigin = "anonymous"; // R2 is another origin; must precede src or the canvas is tainted
if (priority) img.fetchPriority = priority;
```

### Home preload
```jsx
<link key={file} rel="preload" as="image" href={projectImageSrc(file)}
      crossOrigin="anonymous" fetchPriority={index === 0 ? "high" : "low"} />
```

### Zone header rule (body validated with `--validate-only`, 2026-10-04)
```bash
# rules.json
[{"description":"media.koussay.online: CORS on every response",
  "expression":"(http.host eq \"media.koussay.online\")",
  "action":"rewrite",
  "action_parameters":{"headers":{"Access-Control-Allow-Origin":{"operation":"set","value":"*"}}},
  "enabled":true}]

cf rulesets account-rulesets phases update http_response_headers_transform \
  -z d98c6ae2d8f14c329dafe0fa530a9d98 --rules @rules.json --validate-only true   # dry
cf rulesets account-rulesets phases update http_response_headers_transform \
  -z d98c6ae2d8f14c329dafe0fa530a9d98 --rules @rules.json                        # apply
cf rulesets account-rulesets phases get http_response_headers_transform -z d98c6ae2d8f14c329dafe0fa530a9d98  # read back
```

### Header verification (cold, warm, with and without Origin)
```bash
U="https://media.koussay.online/projects/pixenhouse/cover-<sha8>.webp"
cf cache purge -z d98c6ae2d8f14c329dafe0fa530a9d98 --body "{\"files\":[\"${U}\"]}" -f   # make it cold
show() { grep -iE '^(HTTP|content-type|cache-control|access-control-allow-origin|cf-cache-status|vary)'; }
curl -s -o /dev/null -D - "$U" | show                                     # cold, no Origin  → MISS, ACAO *
curl -s -o /dev/null -D - "$U" | show                                     # warm, no Origin  → HIT,  ACAO *
curl -s -o /dev/null -D - -H 'Origin: https://koussay.online' "$U" | show # warm, Origin     → HIT,  ACAO *
# Expect: content-type: image/webp; cache-control: public, max-age=31536000, immutable
grep -rn "r2\.dev" app components lib content scripts && echo FAIL || echo "no r2.dev"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `priority` on `next/image` | `preload` (or `loading="eager"`/`fetchPriority`) | Next 16 | Use `preload` on the hero only [CITED: image.md §priority] |
| `unstable_cache` | `use cache` | Next 16 | Not needed: content is a module |
| Legacy Pre-Production protection | Standard Protection (`all_except_custom_domains`) | Vercel 2025 | Already set on this project |

## HYG-08: Vercel Deployment Protection

- **Current state (verified 2026-10-04):** `vercel api /v9/projects/koussay-portfolio --scope koussays` → `ssoProtection.deploymentType = "all_except_custom_domains"`, which is **Standard Protection** [CITED: vercel.com/docs/deployment-protection "Protects all deployments except production domains"]. Old production deployment URLs (`koussay-portfolio-fikr17s69-koussays.vercel.app`, 29 days old) return `302 → vercel.com/sso-api` for `/1.webp`, `/ppneuemontreal-book.otf` and `/`. The production-branch URLs `koussay-portfolio-koussays.vercel.app` and `…-git-main-…` also return 302.
- **Koussay's one numbered step:** Vercel → project koussay-portfolio → Settings → Deployment Protection. Confirm "Vercel Authentication" is on with scope **Standard Protection**, not a "(Legacy)" option. Then open `https://koussay-portfolio-fikr17s69-koussays.vercel.app/1.webp` in a private window; it must show the Vercel login, not the image.
- **Automated check for the verifier:** the `vercel api` command above and `curl -s -o /dev/null -w '%{http_code}' <old-url>/1.webp` (expect 302 or 401).
- After this phase's deploy, `https://koussay.online/1.webp` must return 404 (it is 200 today, because the file is still in `public/`).

## TEST-02 mutation proof
- **crossOrigin removed:** the image loads in no-cors mode and taints the canvas. The next `texture.needsUpdate` makes three call `gl.texImage2D` inside `WebGLState.texImage2D`'s try/catch, which calls `error('WebGLState:', e)` → `console.error("THREE.WebGLState:", SecurityError)` [VERIFIED: node_modules/three/build/three.module.js L10730–10741, three.core.js `error()` → `console.error`]. The smoke test's console listener records it, and the home test fails.
- **Shader typo:** three's program check logs `THREE.WebGLProgram: Shader Error …` via `console.error` (`debug.checkShaderErrors` defaults to true) [ASSUMED: default verified only by reading the code path, not by running], and the ring never reaches a valid draw. The home test fails.
- **Precondition:** after this phase, a local build serves R2 URLs (absolute in `content/media.json`), so localhost → `media.koussay.online` is cross-origin and the mutation is meaningful. The home test should also assert that ≥ 8 image responses from `https://media.koussay.online/projects/` returned 200 with `access-control-allow-origin: *`, and that **zero** requests hit `/api/media`.
- **Fast loop:** `npm run build && npx next start -p 3100` in one shell; `BASE_URL=http://localhost:3100 npx playwright test -g "home renders the ring" --project=desktop`; then free the port by PID: `lsof -nP -iTCP:3100 -sTCP:LISTEN -t | xargs kill`. Each mutation needs a rebuild. With `retries: 1`, a failing run takes about twice as long.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Response-header Transform Rules apply to responses served from Cloudflare cache | Pattern 4 | Warm responses lack ACAO; caught by the curl warm check and `media.mjs verify` |
| A2 | Origin `max-age=31536000` passes unchanged despite zone Browser Cache TTL 14400 | Pattern 4 | Criterion 6 header mismatch; fix by setting `browser_cache_ttl` to 0 (respect existing) after asking Koussay (zone-wide setting) |
| A3 | `/project/[slug]/opengraph-image` prerenders per static param at build | Pattern 7 | Only changes when the R2 fetch happens; D-07 still holds |
| A4 | three's shader errors log via `console.error` by default | TEST-02 | Shader mutation might not fail; then assert on canvas pixels or `[ring]` errors |
| A5 | Free plan allows at least one response-header rule (validate-only accepted it) | Pattern 4 | Apply fails with a plan error; dashboard fallback |
| A6 | Pixenhouse brand-guideline pages are Koussay's to publish (they are on the live site today) | Snapshot | Licensing; same exposure as today |

## Open Questions (RESOLVED)

All resolved by Koussay on 2026-10-04: overview kept with live text (D-12); Pixenhouse PDF pages tagged identity (D-13); 404 becomes live Geist text, signed at UAT (D-14); LICENSE media wording approved (D-15). See 02-CONTEXT.md addendum.

1. **`overview` is rendered but not in CONT-02/D-09.**
   - Known: every live page shows an "Overview" section from `detail.overview`.
   - Recommendation: keep `overview` as a required key with live values. Phase 5 and 7 decide whether it becomes `approach`. Mapping it now would be inference.
   - RESOLVED: keep `overview` verbatim; planner adds it to the schema key list.
2. **Gallery `kind` for Pixenhouse pages.** The live value is `"pdf"`, which is not in the enum.
   - Recommendation: `null` (D-09: nothing inferred). Rendering does not depend on `kind` this phase.
   - RESOLVED: `null`; Koussay can set `"identity"` in Phase 7.
3. **Criterion 1 vs `/api/media` for stale clients.**
   - Known: no current page references `/api/media` after the cut-over. Stale tabs might, and those responses are immutable and mostly edge-cached.
   - RESOLVED: keep `/api/media` one deploy (Phase 3 deletes it). Criterion 1 is verified as "no page, build step or current client code calls Notion for projects": grep, plus the smoke test asserting zero `/api/media` requests.
4. **404 page replacement visual.**
   - RESOLVED: HTML "404" in Geist in the same link and size box. Koussay signs the before/after screenshot (design gate) before the commit that deletes `404.webp`.
5. **LICENSE wording for media on R2.**
   - RESOLVED: the planner drafts minimal factual wording ("`public/` holds fonts and the logo; project media is served from media.koussay.online and is not covered by this licence"). Koussay approves it at plan sign-off; no invented legal terms.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build, scripts | ✓ | 26.7.0 (Next needs ≥20.9) | — |
| npm | build | ✓ | 11.19.0 | — |
| Playwright + Chromium | smoke test | ✓ | 1.63.0 | — |
| `cf` CLI, profile `koussay` | header rule, purge, R2 reads | ✓ (API calls succeeded) | 1.0.0-beta.12 | Dashboard (one numbered step) |
| `vercel` CLI | HYG-08 read | ✓ (scope `koussays`) | 59.5.0 | Dashboard |
| sharp | OG, script metadata | ✓ | 0.34.5 | — |
| R2 credentials | `media.mjs` | ✓ in `.env.local` (not read; proven 2026-10-03 via `--check`) | — | — |
| Network to koussay.online, media.koussay.online | snapshot, build, tests | ✓ | — | none; snapshot must run before the cut-over deploys |

**Missing dependencies with no fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.63.0 (`tests/smoke.spec.mjs`, `playwright.config.mjs`, port 3100, desktop 1512 + phone 390) plus Node check scripts |
| Config file | `playwright.config.mjs` |
| Quick run command | `node scripts/check-content.mjs` (<1 s); `BASE_URL=http://localhost:3100 npx playwright test -g "<name>" --project=desktop` against a hand-started `next start -p 3100` |
| Full suite command | `npm run format:check && npm run lint && npm run build && npm test` (~6–8 min) |

### Phase Requirements → Test Map
| Req / SC | Behavior | Type | Automated Command | File Exists? |
|----------|----------|------|-------------------|-------------|
| SC1 / D-01 | Content modules equal the live snapshot field for field | unit | `node scripts/compare-snapshot.mjs` (content vs `.planning/…/snapshot/live-2026-10-04.json`) | ❌ Wave 0 |
| SC1 | Each project page renders h1, type, year, summary, Overview/Challenge/Outcome, tools, live link, gallery alts from the content module | e2e | `npm test` (extend "every project page renders" to read `content/projects/index.mjs`) | partial ✅ |
| SC1 | No Notion for projects in the app path | static | `grep -rnE "lib/cms\|notion/projects\|gallery-pdf" app components lib \| grep -v "app/api/media\|lib/notion/"` → empty; smoke test asserts zero `/api/media` requests | ❌ Wave 0 |
| SC1 | `llms.txt` unchanged | e2e | `curl -s localhost:3100/llms.txt \| diff - .planning/…/snapshot/llms.txt` | ❌ Wave 0 |
| CONT-02, SC2 | Every module has every key | unit | `node scripts/check-content.mjs` | ❌ Wave 0 |
| CONT-06, SC2 | Missing key or media ref fails the build naming slug.field | mutation | delete `approach` from one module → `node scripts/check-content.mjs` exits 1 with `[content] <slug>.approach`; same for a bad `media`; once with `npm run build`; restore | ❌ Wave 0 |
| CONT-08, SC3 | Placeholders gone | static | `git ls-files \| grep -E '^public/([0-9]+\|404)\.webp$\|components/ring/projects\.js'` → empty | ✅ (command) |
| SC3 | Placeholder slug is a real 404 | e2e | smoke: `request.get("/project/matchday")` → 404 | ❌ Wave 0 |
| SC4 | Sitemap = 8 live slugs, per-project lastmod = snapshot `updatedAt` | e2e | smoke: parse `/sitemap.xml`, compare with content | ❌ Wave 0 |
| SC4 | `/project/[slug]` is SSG | build | `npm run build \| tee build.log; grep -E "● /project/\[slug\]" build.log` | ✅ (command) |
| HYG-08, SC5 | Old deployments blocked | manual + cli | `vercel api /v9/projects/koussay-portfolio --scope koussays` → `all_except_custom_domains`; `curl -o /dev/null -w '%{http_code}' https://koussay-portfolio-fikr17s69-koussays.vercel.app/1.webp` → 302; Koussay's step | ✅ |
| MEDIA-02, SC6 | Type, immutable, ACAO with and without Origin, cold and warm; no r2.dev | cli | curl block in Code Examples; `node scripts/media.mjs verify` | ❌ Wave 0 |
| MEDIA-03, SC7 | Ring renders R2 covers; project→home on a warm cache, no SecurityError | e2e | smoke: home asserts ≥8 R2 200s with ACAO; new test: goto `/project/<slug>` → goto `/` → loader 100 → errors `[]`; and goto `/` → `/project/x` → back | ❌ Wave 0 |
| MEDIA-06, SC7 | Gallery via `/_next/image?url=https%3A%2F%2Fmedia…`; hero `currentSrc` starts with `https://media.koussay.online/`; `naturalWidth > 0` | e2e | smoke on `/project/pixenhouse` | ❌ Wave 0 |
| D-07, SC7 | Each project's og:image is 200 `image/png` and not the logo image | e2e | smoke: read `meta[property="og:image"]`, fetch it, compare sha with `/booking/opengraph-image` → differ | ❌ Wave 0 |
| MEDIA-04, SC8 | Single writer; `check` prints `public ok`; skip unless `--force`; verify all | cli | `node scripts/media.mjs check \| grep "public ok"`; second `import-live` run prints all skipped; `node scripts/media.mjs verify` exit 0; `grep -rln "media.json\|media-manifest" scripts` → only `media.mjs` writes | ❌ Wave 0 |
| TEST-02, SC9 | Fails without crossOrigin; fails with shader typo; green after restore | mutation | fast loop in §TEST-02; record the three runs (fail, fail, pass) in SUMMARY | ✅ test exists |

### Sampling Rate
- **Per task commit:** `node scripts/check-content.mjs`, `npm run lint`, `npm run format:check`
- **Per wave merge:** `npm run build` and `npm test`
- **Phase gate:** full suite green, `node scripts/media.mjs verify` exit 0, curl header block pass, Koussay's HYG-08 step, before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `lib/content-schema.mjs` + `scripts/check-content.mjs`: CONT-02/06 fast gate
- [ ] `scripts/compare-snapshot.mjs` + `.planning/phases/02-…/snapshot/` (live JSON, rendered strings, `llms.txt`): SC1
- [ ] `scripts/media.mjs` with `check | import-live | verify | generate`: MEDIA-02/04
- [ ] Smoke additions: R2 loads + ACAO, zero `/api/media`, warm-cache round trip, placeholder 404, sitemap lastmod, hero/gallery sources, OG not logo
- [ ] `.gitignore`: `/media-work/`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (HYG-08 uses Vercel SSO, configured not coded) | Vercel Standard Protection |
| V3 Session Management | no | — |
| V4 Access Control | yes (old deployments, R2 write access) | Vercel Standard Protection; R2 keys only in `.env.local`, scripts only; app holds no R2 credentials |
| V5 Input Validation | yes | Build-time `validateContent` (closed enums, required keys, host-restricted media URLs); `remotePatterns` limited to host + `/projects/**` + no query |
| V6 Cryptography | yes (SigV4) | Existing `scripts/lib/r2.mjs`; do not modify |
| V14 Configuration | yes | ACAO `*` only on the public, credential-less media host; no cookies there; r2.dev disabled |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Open image-optimizer proxy | Tampering / DoS | `remotePatterns` with exact host, path prefix and `search: ""` |
| SSRF via OG fetch | Tampering | OG fetches only `project.file` from the validated manifest (`https://media.koussay.online/projects/` prefix enforced by the validator) |
| Secret leakage via manifest or logs | Information disclosure | Manifest holds public URLs and hashes only; scripts never print env; `.env.local` never read by agents |
| Removed third-party art still served | Information disclosure / legal | `git rm` + Standard Protection on old deployments (HYG-08) |
| Fail-open `/api/revalidate` | DoS | Untouched this phase (regenerates static pages from the repo; no Notion read); deleted in Phase 3 |

## Sources

### Primary (HIGH confidence)
- Live site, 2026-10-04: `https://koussay.online/` and `/project/pixenhouse` RSC (`RSC: 1`) and HTML, `/llms.txt`, `/sitemap.xml`, all 8 cover downloads and 3 PDF pages (headers + `file` dimensions)
- `cf` API, 2026-10-04: zone ruleset GET (404/10003), `phases update --validate-only` (good body accepted, bad body rejected 20087), `zones settings get browser_cache_ttl` (14400), R2 managed domain (disabled), custom domain (active)
- `vercel api /v9/projects/koussay-portfolio` (`ssoProtection`), `vercel ls`, curl on old deployment URLs
- `node_modules/next/dist/docs` 16.3.8: image.md (remotePatterns, unoptimized, preload, Other Props, minimumCacheTTL), dynamicParams.md, opengraph-image.md, server-and-client-components.md
- `node_modules/next/dist/client/image-component.js` (`ImagePreload` passes `crossOrigin`)
- `node_modules/three/build/three.module.js` r185 (`WebGLState.texImage2D` try/catch → `error()` → `console.error`)
- `node_modules/@notionhq/client/build/src/webhooks.js` (local HMAC)
- Repo code read: `lib/cms/projects.js`, `lib/projects.js`, `components/ring/atlas.js`, `components/Carousel.jsx`, `components/HomeRing.jsx`, `components/SharedTransitionProvider.jsx`, `lib/project/warm.js`, `components/project/*`, `lib/og-image.js`, `app/**`, `scripts/**`, `tests/**`

### Secondary (MEDIUM confidence)
- developers.cloudflare.com/rules/transform/response-header-modification (ordering, set/add, cache-control caveat)
- developers.cloudflare.com/r2/buckets/cors (Origin-only CORS, purge after change)
- developers.cloudflare.com/cache/how-to/edge-browser-cache-ttl (override only when origin is lower)
- vercel.com/docs/deployment-protection (scopes, last updated 2026-09-15)

### Tertiary (LOW confidence)
- None relied on.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. No new packages; versions read from node_modules.
- Snapshot and content model: HIGH. Extracted and re-parsed from the live payload in this session.
- Edge header rule: MEDIUM-HIGH. API body validated; behaviour on cached objects confirmed only after apply (curl block).
- Cross-origin loaders and TEST-02: HIGH for the code paths; the shader-error logging default is an assumption (A4).
- OG prerender timing: MEDIUM (A3).

**Research date:** 2026-10-04
**Valid until:** 2026-10-11 for live-site facts (the snapshot must be captured before any deploy that changes the live set); 2026-11-03 for framework and Cloudflare facts.
