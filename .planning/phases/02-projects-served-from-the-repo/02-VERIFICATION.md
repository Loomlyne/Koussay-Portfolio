---
phase: 02-projects-served-from-the-repo
verified: 2026-10-04T18:24:00+04:00
status: passed
score: 9/9 success criteria verified by code and command; SC1 visual side-by-side awaits Koussay's UAT
overrides_applied: 0
human_verification:
  - test: "Visual side-by-side: snapshot/screens/*.png (live, before) against fresh after-screenshots of the final tree, home plus 8 project pages at 1512 and 390"
    expected: "Ring cards, project heroes, copy, the 01..08 hero index and the Pixenhouse gallery look the same as the live site before the cut-over"
    why_human: "Visual judgement; 02-VALIDATION.md lists it as manual-only for SC1. The committed uat/after/*.png were captured at 17:50 (9960de4), before the CR-02 fix at 17:57 (3aae6b3) that restored letter-spacing on .heroIndex, .mediaFallbackLabel and .loadingNumber, so they show the wrong hero index spacing and must be regenerated (npx playwright test -c playwright.screens.config.mjs on the final tree) before Koussay compares"
---

# Phase 2: Projects served from the repo, media on R2 — Verification Report

**Phase Goal:** The live eight projects are read from repo content modules carrying the full case-study schema, their images are served from Cloudflare R2 on `media.koussay.online`, and no placeholder can render anywhere, with no visible change to visitors.
**Verified:** 2026-10-04 18:24 +04 (final tree, HEAD 3ac670d)
**Status:** human_needed
**Re-verification:** No, initial verification

Note on mode: ROADMAP marks Phase 2 `Mode: mvp`, but the goal is not in user-story form (`gsd-sdk query user-story.validate` → valid false). The orchestrator asked for verification against this goal, so the standard goal-backward method was applied; no User Flow Coverage table is given.

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Ring and every `/project/<slug>` show the same cards and copy, served from `content/projects/*` and a manifest; no page, build step or current client code calls Notion for projects (`/api/media` stays for stale clients until Phase 3) | VERIFIED (copy) / human (visual) | All five `getProjects()` callers import `@/lib/content` (`lib/content.js` → `content/projects/index.mjs` + `content/media.json`). Only `app/api/media/[...parts]/route.js` imports `lib/notion/projects`; `CmsLive` is no longer imported by `app/providers.js`; `/api/cms-stamp` returns `{stamp:""}` without Notion. Rendered home and pixenhouse HTML contain 0 `/api/media` refs. `compare-snapshot` → `snapshot ok 8/8`; `compare-rendered` against a fresh local prod build → `rendered ok 9/9`; `/llms.txt` byte-identical to snapshot. Smoke asserts `apiMedia == []` on every page. Visual check is Koussay's UAT (see Human Verification) |
| 2 | Every module carries the full schema; a missing field or a media reference absent from the manifest fails `npm run build` naming project and field | VERIFIED | `lib/content-schema.mjs` SCHEMA_KEYS includes kind, client, industry, location, year, role, services, status, liveUrl, summary, overview, challenge, approach, outcome, tools, testimonial, identity, gallery; GALLERY_KEYS media/alt/kind/caption. `lib/content.js` resolves at module evaluation, so a defect throws during build with `[content] <slug>.<field>`. `check-content` → `content ok: 8 projects, 37 media`; schema tests 16/16 pass. Executor mutation log M1/M2 shows the build failing with `fido-homes.approach: key missing` and `pixenhouse.gallery[3].media "brand-guideline-p99": not in content/media.json` |
| 3 | 18 placeholders, `public/1..18.webp`, `public/404.webp` absent from `git ls-files`; placeholder slug is a real 404; no fallback path | VERIFIED | `git ls-files public` → favicon, two Geist woff2, OFL.txt, logo.png only. `components/ring/projects.js` gone; no `FALLBACK`/`ring/projects` import anywhere. `dynamicParams = false` on `/project/[slug]`. Live probe of local build: `/project/1`, `/project/aurora`, `/project/placeholder-1`, `/1.webp`, `/404.webp` → 404; smoke `/project/matchday` → 404 |
| 4 | Sitemap lists exactly the live set with per-project `lastModified`; `/project/[slug]` is SSG | VERIFIED | `/sitemap.xml` from the build: home, booking, then the 8 slugs in ring order, lastmods equal to each module's `updated` (e.g. pixenhouse 2026-09-14T11:45:00.000Z). Build route table: `● /project/[slug]` with pixenhouse, vamos-taxi, looma-kitchen, +5 more |
| 5 | Old Vercel deployment URL no longer serves `/1.webp` or the PP Neue Montreal file | VERIFIED | Re-probed now: `koussay-portfolio-fikr17s69-koussays.vercel.app/1.webp`, `/ppneuemontreal-book.otf`, `/` → 302 to `vercel.com/sso-api`. Koussay's dashboard step replaced by CLI proof on his instruction ("no Vercel steps"), recorded in 02-03-SUMMARY; counted as signed |
| 6 | `curl -I` on a cover: image type, immutable Cache-Control, ACAO `*`, with and without Origin, cold and warm; no production `r2.dev` | VERIFIED | `vamos-taxi/cover-8fa9c769.webp`: warm (HIT) x2 without Origin, x2 with `Origin: https://koussay.online`, cold (MISS, cache-busting query) without and with Origin: every response `image/webp`, `public, max-age=31536000, immutable`, `access-control-allow-origin: *`. A missing key 404 also carries ACAO `*`. `git grep r2.dev` outside `.planning` matches only the negative test fixture in `scripts/content-schema.test.mjs:135` |
| 7 | Home → project → home on a warm cache renders R2 covers with no SecurityError; gallery via `next/image` from R2; ring stills and hero direct; share images show each cover | VERIFIED | `npm test` on the final tree: 18 passed (desktop + phone), including both warm round trips (console errors asserted empty, R2 ACAO `*`), gallery test (src/srcset contain `/_next/image?url=https%3A%2F%2Fmedia.koussay.online`), share-image test. `atlas.js` sets `img.crossOrigin` before src; home preloads carry `crossorigin="anonymous"` with R2 hrefs; hero `<img>` is unoptimized with R2 src. `/project/vamos-taxi/opengraph-image/cover` → 200 image/png; `lib/og-image.js` throws rather than falling back to the logo; unknown slug OG → 404. `next.config.mjs` remotePatterns restricts to `media.koussay.online/projects/**`; optimizer rejects another host (400) |
| 8 | One script is the only writer of R2 and the manifest; check prints `public ok`; skips recorded entries unless `--force`; verify confirms every object | VERIFIED | Only `scripts/media.mjs` calls `putObject`/`deleteObject` and writes `content/media.json` (`generate-project-media.mjs` removed). Ran now: `media.mjs check` → `public ok`, acao `*` both ways, `cleanup ok`, exit 0; `import-live --dry-run` → 37 `skip`; `verify` → `verify ok 37/37`. `git status` clean afterwards |
| 9 | Smoke test fails without `crossOrigin` in the atlas and with a shader typo, green once restored | VERIFIED | Mechanism read in code: `watch()` records every `console.error` and `pageerror`; home and round-trip tests assert `errors == []`. three 0.185 routes texture upload failures through `error('WebGLState:', e)` and program link failures through `error('WebGLProgram: Shader Error …')`, both `console.error`. Executor log M3 (`SecurityError … Tainted canvases`) exit 1 and M4 (`Shader Error 0 - VALIDATE_STATUS false`) exit 1; restored tree green, re-confirmed by my own 18/18 run. Mutations themselves not re-run here (verifier does not modify the tree) |

**Score:** 9/9 criteria verified by code and command. SC1's "no visible change" additionally needs Koussay's visual side-by-side.

### CONTEXT decisions D-01..D-16

| D | Decision | Status | Evidence |
|---|----------|--------|----------|
| D-01 | Snapshot from the live render, no Notion API; no visible change | VERIFIED (copy) | `snapshot/` (data, rendered.json, html, llms.txt, sitemap, screens); compare-snapshot 8/8, compare-rendered 9/9 |
| D-02 | Slugs and ring order as live | VERIFIED | `index.mjs` order = sitemap order = smoke `ORDER` assertion |
| D-03 | All images on R2 `koussay-media`, content-addressed, immutable; Pixenhouse PDF as page images | VERIFIED | 37 objects (8 covers + 29 `brand-guideline-pNN`), keys `projects/<slug>/<slot>-<sha8>.webp`, verify 37/37 |
| D-04 | One writer, verify after upload, no rewrite without `--force` | VERIFIED | SC8 above; `import-live` head-size check plus public read-back before recording |
| D-05 | Atlas `crossOrigin`, preload `crossorigin`, zone rule ACAO `*` | VERIFIED | atlas.js line 9, app/page.js line 45, curl results; rule approved by Koussay 16:25 (02-02) |
| D-06 | remotePatterns; stills/hero direct; gallery via next/image | VERIFIED | next.config.mjs; ProjectMedia `unoptimized`; ProjectGallery `<Image>` without `unoptimized` |
| D-07 | Share images show the cover, never silent logo fallback | VERIFIED | og-image.js throws on non-R2 or failed fetch; WR-08 unknown slug 404; smoke share test |
| D-08 | TEST-02 mutation proof | VERIFIED | SC9 |
| D-09 | Full schema keys, empty until Phase 7, nothing invented | VERIFIED | kind/client/industry/location/role/status null, services [], approach null, identity null in all 8 modules |
| D-10 | Missing key or manifest ref fails the build; empty allowed | VERIFIED | content-schema test "D-10: Phase 7 fields may stay empty"; SC2 |
| D-11 | Edits only through the repo; Notion rows no longer affect the site | VERIFIED | No project read from Notion on any page; `/api/revalidate` only busts caches; `/api/cms-stamp` static empty stamp |
| D-12 | `overview` required, live text kept | VERIFIED | in SCHEMA_KEYS; overview non-empty in all 8 |
| D-13 | Pixenhouse 29 pages `kind: "identity"` | VERIFIED | 29 items, kinds = {identity} |
| D-14 | 404 as Geist text, signed | VERIFIED | `ProjectNotFound.jsx` renders "404" text, `.notFoundText` in CSS; `public/404.webp` removed; Koussay "Approved" 17:26 (02-09) |
| D-15 | LICENSE media wording | VERIFIED | LICENSE lines 35-37 carry the approved text verbatim; Behance note gone |
| D-16 | HYG-08 satisfied | VERIFIED | SC5 |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `content/projects/*.mjs` (8 + index) | Full-schema modules, ring order | VERIFIED | Substantive live copy; imported by `lib/content.js`, smoke, scripts |
| `content/media.json` | Manifest of 37 R2 objects | VERIFIED | url, key, sha256, width, height, origin per entry |
| `lib/content-schema.mjs` | Validator + resolver | VERIFIED | Used by `lib/content.js` and `scripts/check-content.mjs` |
| `lib/content.js` | Synchronous `getProjects()` | VERIFIED | Wired into all pages, sitemap, llms.txt, OG routes |
| `scripts/media.mjs` | Single R2 writer | VERIFIED | check/import-live/verify/generate |
| `scripts/check-content.mjs`, `compare-snapshot.mjs`, `compare-rendered.mjs` | Gates | VERIFIED | All exit 0 on final tree |
| `tests/smoke.spec.mjs` | Cut-over smoke | VERIFIED | 18/18 |
| `components/ring/atlas.js` | crossOrigin loader | VERIFIED | |
| `next.config.mjs` | remotePatterns for R2 | VERIFIED | |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| app pages, sitemap, llms.txt, OG routes | `lib/content.js` | `import { getProjects } from "@/lib/content"` | WIRED |
| `lib/content.js` | content modules + manifest | `resolveContent(PROJECTS_IN_ORDER, manifest)` at module eval | WIRED |
| project `file` / gallery `file` | R2 | manifest `url` | WIRED (HTML shows media.koussay.online srcs) |
| atlas loader | R2 with CORS | `crossOrigin = "anonymous"` + zone ACAO rule | WIRED |
| gallery | Next optimizer | `<Image>` + remotePatterns | WIRED (`/_next/image?url=…media.koussay.online` 31 refs on pixenhouse) |
| OG image | R2 cover | `fetch(project.file)` in `lib/og-image.js` | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| Ring (`Carousel` via `RegisterHome`) | `projects` | `getProjects()` → content modules | 8 projects, R2 covers preloaded | FLOWING |
| `ProjectDetail` | `project` | `getProjectBySlug(slug, getProjects())` | live copy, verified by compare-rendered | FLOWING |
| `ProjectGallery` | `detail.gallery` | manifest width/height + url | 29 Pixenhouse pages | FLOWING |
| sitemap | `updatedAt` | module `updated` | per-project dates | FLOWING |

### Behavioral Spot-Checks (run by the verifier)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Schema tests | `node --test scripts/content-schema.test.mjs` | 16 pass, 0 fail | PASS |
| Content gate | `node scripts/check-content.mjs` | `content ok: 8 projects, 37 media` | PASS |
| Snapshot equality | `node scripts/compare-snapshot.mjs` | `snapshot ok 8/8` | PASS |
| Manifest objects | `node scripts/media.mjs verify` | `verify ok 37/37` | PASS |
| Media host health | `node scripts/media.mjs check` | `public ok`, acao `*` x2, `cleanup ok` | PASS |
| Skip unless --force | `node scripts/media.mjs import-live --dry-run` | 37 `skip` | PASS |
| Format / lint | `npm run format:check`, `npm run lint` | clean, exit 0 | PASS |
| Build | `npm run build` | exit 0, `● /project/[slug]` SSG | PASS |
| Smoke | `npm test` | 18 passed (8.7 m) | PASS |
| Rendered equality | `node scripts/compare-rendered.mjs` on local prod build | `rendered ok 9/9`; llms.txt identical | PASS |
| Cover headers | `curl -I` cold/warm, ±Origin | all correct | PASS |
| Old Vercel URL | `curl` old deployment `/1.webp`, `.otf` | 302 to SSO | PASS |

Port 3100 servers were started with booking/mail keys blanked and stopped by PID; `git status` clean at the end.

### Probe Execution

No `scripts/*/tests/probe-*.sh` declared or present. Step 7c: not applicable.

### Requirements Coverage

| Requirement | Description (short) | Status | Evidence |
|-------------|--------------------|--------|----------|
| CONT-02 | Full content schema | SATISFIED | SC2, D-09 |
| CONT-06 | Synchronous `getProjects()`; broken media ref fails build | SATISFIED | `lib/content.js`; SC2 |
| CONT-08 | Placeholders, Behance images, 404.webp removed; no fallback | SATISFIED | SC3 |
| HYG-08 | Deployment Protection blocks retired URLs | SATISFIED | SC5 (CLI proof per Koussay) |
| MEDIA-02 | R2 custom domain, content-addressed, immutable | SATISFIED for current media (covers, gallery pages). Stills, posters and videos do not exist yet; they arrive with later generation phases through the same writer |
| MEDIA-03 | ACAO on every response; atlas + preloads cross-origin | SATISFIED | SC6, D-05, 404 response also ACAO `*` |
| MEDIA-04 | Single writer; records Higgsfield request id and raw output before upload; verify; `--force` | SATISFIED in code | `generate` writes raw to `media-work/` and records `requestId`/`raw` before `putObject`; not exercised this phase (no paid run), which is correct |
| MEDIA-06 | remotePatterns; stills/hero bypass optimizer; gallery via next/image | SATISFIED | SC7, D-06 |
| TEST-02 | Smoke fails without crossOrigin and with shader typo | SATISFIED | SC9 |

No orphaned requirements: REQUIREMENTS.md maps exactly these nine IDs to Phase 2.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (phase files) | - | TBD / FIXME / XXX | none found | - |
| `components/CmsLive.jsx`, `lib/notion/gallery-pdf.js` | - | Orphaned (no importer) | Info | Dead code; Phase 3 removes the Notion project path (IN-01) |
| `app/api/media/[...parts]/route.js`, `lib/notion/projects.js`, `lib/pdf.js`, `lib/cms/bust.js` | - | Notion project media proxy still live | Info | Documented decision (CR-01 skipped by decision; SC1 narrowed); no page or client calls it; Phase 3 deletes |
| `next.config.mjs` | 48-80 | `/api/media/**` localPattern and canvas/pdfjs tracing for `/project/**` remain | Info | `/project/**` no longer needs the PDF tracing; harmless, Phase 3 cleanup |
| `components/project/ProjectGallery.jsx` | 27 | Every gallery item gets the paper frame | Info | Correct today (only Pixenhouse identity pages); a future screenshot gallery would need a kind switch |
| server log | - | `Error: Internal: NoFallbackError` on unknown slugs | Info | 404 still served correctly; pre-existing Next 16 log noise |
| `package.json` | - | Content gates not wired as npm scripts (IN-03) | Info | Build still enforces them via `lib/content.js` |

### Human Verification Required

#### 1. Visual side-by-side, before vs after (SC1, "no visible change")

**Test:** First regenerate the after-screenshots on the final tree (the committed `uat/after/*.png` predate the CR-02 letter-spacing fix). Then compare `snapshot/screens/<page>-<1512|390>.png` against the new `uat/after/` for home and the 8 project pages.
**Expected:** Same cards, hero, copy, `01..08` hero index spacing and Pixenhouse gallery as the live site before the cut-over.
**Why human:** Visual judgement; listed as manual-only in 02-VALIDATION.md. Text equality is already proven (compare-rendered 9/9, compare-snapshot 8/8).

Already signed, not re-asked: Cloudflare ACAO rule (16:25), 404 before/after (17:26), HYG-08 CLI proof in place of a dashboard step.

### Gaps Summary

No blocking gaps. Every success criterion, requirement and decision is met in the final tree, and the full gate (format, lint, schema tests, content check, snapshot and rendered comparisons, build, 18/18 smoke, media check/verify, R2 header curls, old Vercel URL probe) passed when the verifier ran it. Two things stay open for Koussay: the visual UAT, and before it, re-capturing `uat/after/` because the committed set was taken before the CR-02 fix and shows the wrong hero index spacing. Phase 2 is not live on koussay.online; that is the ship step, not part of this verification.

---

_Verified: 2026-10-04 18:24 +04_
_Verifier: Claude (gsd-verifier)_

## UAT

Koussay ran the six UAT steps on the final local build (port 3100) and answered "All pass" in the control session, 2026-10-04 18:35 +0400. The SC1 visual check is closed.
