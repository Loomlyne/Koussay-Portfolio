---
phase: 2
slug: projects-served-from-the-repo
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-04
---

# Phase 2 — Validation Strategy

> Per-phase validation contract. Source of truth for commands: 02-RESEARCH.md § Validation Architecture (copied below). The planner fills task IDs; each task's acceptance criteria cite the command for its requirement.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.63.0 (`tests/smoke.spec.mjs`) plus Node check scripts |
| **Config file** | `playwright.config.mjs` |
| **Quick run command** | `node scripts/check-content.mjs && npm run lint && npm run format:check` |
| **Full suite command** | `npm run format:check && npm run lint && npm run build && npm test` |
| **Estimated runtime** | ~480 seconds (build plus two Playwright projects; slower under Mac load) |

## Sampling Rate

- **After every task commit:** quick run command
- **After every plan wave:** `npm run build && npm test`
- **Before `/gsd-verify-work`:** full suite green, `node scripts/media.mjs verify` exit 0, curl header block passes, Koussay's HYG-08 confirmation
- **Max feedback latency:** 480 seconds

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

## Wave 0 Requirements
- [ ] `lib/content-schema.mjs` + `scripts/check-content.mjs`: CONT-02/06 fast gate
- [ ] `scripts/compare-snapshot.mjs` + `.planning/phases/02-…/snapshot/` (live JSON, rendered strings, `llms.txt`): SC1
- [ ] `scripts/media.mjs` with `check | import-live | verify | generate`: MEDIA-02/04
- [ ] Smoke additions: R2 loads + ACAO, zero `/api/media`, warm-cache round trip, placeholder 404, sitemap lastmod, hero/gallery sources, OG not logo
- [ ] `.gitignore`: `/media-work/`

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Old Vercel deployment URLs blocked | HYG-08 | Dashboard setting is Koussay's | Vercel → Project Settings → Deployment Protection shows Standard; one old deployment URL in a private window asks for login |
| 404 page looks the same in Geist | D-14 | Visual judgement | Before/after screenshot of `/project/does-not-exist`, signed at UAT |
| Ring, project and gallery look unchanged | SC1 | Visual judgement | UAT on the local production build |

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 480s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
