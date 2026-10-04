# Phase 2: Projects served from the repo (with R2 media) - Context

**Gathered:** 2026-10-04
**Status:** Ready for planning

<domain>
## Phase Boundary

The eight projects live today (pixenhouse, vamos-taxi, looma-kitchen, almar-private-journey, fido-homes, elysee-home-design, clickit-story, artemis-luxe) are snapshotted from the live site into repo content modules carrying the full case-study schema, their images move to Cloudflare R2 behind `media.koussay.online`, Notion is no longer called for projects, the eighteen placeholder projects and their Behance images are deleted, and visitors see no change. Phase 4 (R2 media delivery) is folded into this phase by Koussay's decision.

Requirements: CONT-02, CONT-06, CONT-08, HYG-08, plus (moved from Phase 4) MEDIA-02, MEDIA-03, MEDIA-04, MEDIA-06, TEST-02. MEDIA-01 (DNS on Cloudflare) is already complete (2026-10-03).

</domain>

<decisions>
## Implementation Decisions

### Copy source
- **D-01:** The snapshot is taken from what koussay.online renders today (project pages, the ring's data, `llms.txt`, sitemap), not from the Notion API. No Notion key is needed. Fields that never render are dropped. The success test is "no visible change": ring cards, project pages and their copy match the live site before the cut-over.
- **D-02:** Slugs are kept exactly as live. Ring order is the live order.

### Images
- **D-03:** All project images (ring covers, hero images, gallery items) are downloaded from what the live site serves and uploaded to the R2 bucket `koussay-media` in account `4afee478…` (cf profile `koussay`), served from `https://media.koussay.online` with content-addressed keys and `Cache-Control: public, max-age=31536000, immutable`. Pixenhouse's PDF gallery is captured as page images, so no PDF rendering is needed for it.
- **D-04:** One script is the only writer to R2 and to the media manifest; it verifies each object after upload and never rewrites a recorded entry without `--force`. The existing upload code in `scripts/lib/r2.mjs` (verified against the bucket on 2026-10-03) is reused.
- **D-05:** The ring loads R2 covers cross-origin: the atlas image loader sets `crossOrigin = "anonymous"`, the home page preload links carry `crossorigin`, and `media.koussay.online` always returns `Access-Control-Allow-Origin: *` (a Cloudflare rule on the zone, not only the bucket CORS, because R2 does not send `Vary: Origin`).
- **D-06:** `next.config.mjs` allows `media.koussay.online` in `images.remotePatterns`. Ring stills and hero images load direct (unoptimized); gallery images go through `next/image`.
- **D-07:** Share (Open Graph / Twitter) images keep showing each project's cover by reading it from R2; no share image may silently fall back to the logo.
- **D-08:** The smoke test is proven to fail when `crossOrigin` is removed from the atlas and when a shader typo is introduced, then restored green (TEST-02).

### New schema fields
- **D-09:** Every content module carries the full schema keys (`kind`, `client`, `industry`, `location`, `year`, `role`, `services[]`, `status`, `liveUrl`, `summary`, `challenge`, `approach`, `outcome`, `tools[]`, `identity`, gallery `kind` and `caption`), but fields with no published data stay empty (null or empty array) until Koussay's Phase 7 interviews. Nothing is inferred or invented. Fields that exist today (name, type, year, liveUrl, summary, challenge, outcome, tools, gallery, testimonial) carry their live values.
- **D-10:** The build fails, naming project and field, when a key is missing or a media reference is not in the manifest. An empty value is allowed; a missing key is not. The UI renders nothing for empty fields.

### Editing after cut-over
- **D-11:** After this phase, project text and media change only through the repo: Koussay says what to change, the control session edits the content module and ships it. Notion project rows no longer affect the site and are left untouched (Phase 3 removes the code path).

### Claude's Discretion
- Content module format (JS modules per slug vs JSON) and the manifest's file and shape, following `.planning/research/ARCHITECTURE.md`.
- Image formats and sizes, keeping today's visual output.
- Whether `/api/media`, `CmsLive`, `/api/cms-stamp` and `/api/revalidate` are disconnected here or only in Phase 3, as long as nothing calls Notion for projects after this phase and Phase 3 still deletes them.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture and pitfalls
- `.planning/research/ARCHITECTURE.md` — content/manifest split, removal order, ring at eight
- `.planning/research/PITFALLS.md` — atlas CORS taint, `Vary: Origin`, slug preservation, OG fallback trap
- `.planning/research/STACK.md` — `remotePatterns`, R2 upload options, Next 16 static params
- `AGENTS.md` — ring internals that must not change; atlas and load-counter behaviour

### Code
- `lib/cms/projects.js`, `lib/notion/projects.js`, `lib/projects.js`, `lib/media.js` — current content path
- `components/ring/atlas.js` — image loader (add `crossOrigin`)
- `app/page.js` (preload links), `app/project/[slug]/page.js`, `app/sitemap.js`, `app/llms.txt/route.js`, `lib/og-image.js`
- `components/ring/projects.js` — the eighteen placeholders to delete
- `scripts/lib/r2.mjs`, `scripts/generate-project-media.mjs`, `scripts/lib/load-env.mjs`
- `next.config.mjs`
- `tests/smoke.spec.mjs`, `tests/guards.mjs`, `playwright.config.mjs`

### Planning
- `.planning/REQUIREMENTS.md` — CONT-02, CONT-06, CONT-08, HYG-08, MEDIA-02/03/04/06, TEST-02
- `.planning/ROADMAP.md` — Phase 2 (merged with former Phase 4)
- Memory: Cloudflare account `4afee478…`, zone `d98c6ae2d8f14c329dafe0fa530a9d98`, bucket `koussay-media`, `R2_*` vars in `.env.local` (never read; script loads them)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/lib/r2.mjs` `putObject`, `headObject`, `publicUrl` — proven against the bucket 2026-10-03.
- `scripts/generate-project-media.mjs --check` — upload/read-back health check.
- The live site's `/api/media/*` serves the exact current image bytes; `llms.txt` lists every project's summary, type, year and live URL.

### Established Patterns
- Live slugs: pixenhouse, vamos-taxi, looma-kitchen, almar-private-journey, fido-homes, elysee-home-design, clickit-story, artemis-luxe.
- Local `.env.local` has no Notion project keys; local builds show placeholders today, so the snapshot cannot come from a local Notion read (D-01 avoids it).
- Smoke test must keep passing; it reads the project list from the running server's sitemap.

### Integration Points
- `getProjects()` callers: `app/page.js`, `app/project/[slug]/page.js`, `app/sitemap.js`, `app/llms.txt/route.js`, OG routes.
- Cloudflare zone rule for `media.koussay.online` response header (cf CLI, profile `koussay`).

</code_context>

<specifics>
## Specific Ideas

- Koussay wants the images on R2 now rather than a temporary copy in the repo.
- Content edits from now on go through him telling the control session.

</specifics>

<deferred>
## Deferred Ideas

- Filling role, services, client, industry, location, approach and identity — Phase 7 interviews.
- Deleting the Notion projects database or its rows — not planned; it simply stops being read.

</deferred>

---

*Phase: 02-projects-served-from-the-repo*
*Context gathered: 2026-10-04*
