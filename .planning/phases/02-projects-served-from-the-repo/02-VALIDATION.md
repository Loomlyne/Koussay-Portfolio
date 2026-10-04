---
phase: 2
slug: projects-served-from-the-repo
status: planned
nyquist_compliant: true
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
| Req / SC | Behavior | Type | Automated Command | Task ID | File Exists? |
|----------|----------|------|-------------------|---------|-------------|
| SC1 / D-01 | Live reference captured before any change (home + 8 pages, HTML, rendered strings, screenshots) | evidence | `node .planning/…/snapshot/capture.mjs` | 02-01 T1, T2 | ❌ created by 02-01 |
| SC1 / D-01 | Content modules equal the live snapshot field for field | unit | `node scripts/compare-snapshot.mjs` | 02-05 T2; 02-11 T3 | ❌ created by 02-05 |
| SC1 / D-01 | Rendered home and project pages equal the snapshot (title, description, h1, type, year, summary, Overview/Challenge/Outcome, tools, live link, gallery alts, normalised main text) | e2e | `node scripts/compare-rendered.mjs` → `rendered ok 9/9` (run inside the automated verify: next start on 3100, booking env blanked, kill by PID) | 02-06 T3 (create); 02-07 T1, 02-11 T3 (run) | ❌ created by 02-06 |
| SC1 | Page content, sitemap order and lastmod from the content modules | e2e | `npm test` | 02-06 T1 (red), 02-07 T1 (green) | partial ✅ |
| SC1 (narrowed) | No page, build step or current client code calls Notion for projects; /api/media remains for stale clients until Phase 3 | static + e2e | grep in 02-11 T3 step 6; smoke asserts zero `/api/media` requests | 02-07 T1; 02-08 T2; 02-11 T3 | ❌ |
| SC1 | `llms.txt` unchanged | e2e | `curl -s localhost:3100/llms.txt \| diff - .planning/…/snapshot/llms.txt` | 02-07 T1; 02-11 T3 | ❌ |
| CONT-02, SC2 | Every module has every key | unit | `node --test scripts/content-schema.test.mjs`; `node scripts/check-content.mjs` | 02-05 T1, T2 | ❌ created by 02-05 |
| CONT-06, SC2 | Missing key or media ref fails naming slug.field | mutation | check-content mutations (02-05 T2); build mutations with exit code + log line (02-11 T1 m1, m2) | 02-05 T2; 02-11 T1 | ❌ |
| CONT-08, SC3 | Placeholders gone | static | `git ls-files \| grep -E '^public/([0-9]+\|404)\.webp$\|components/ring/projects\.js'` → empty | 02-08 T1; 02-09 T3; 02-11 T3 | ✅ (command) |
| SC3 | Placeholder slug and removed files are real 404s | e2e | smoke: `/project/matchday`, `/1.webp`, `/18.webp`, `/404.webp` → 404 | 02-06 T1; 02-08 T2; 02-09 T3 | ❌ |
| D-14 | 404 in Geist text, signed before commit | manual + e2e | before/after screenshots, checkpoint, then commit | 02-09 T1, T2, T3 | ❌ |
| SC4 | `/project/[slug]` is SSG | build | `grep -E "● /project/\[slug\]" build.log` | 02-07 T1; 02-11 T3 | ✅ (command) |
| HYG-08, SC5 | Old deployments blocked | manual + cli | `vercel api …` → `all_except_custom_domains`; old `/1.webp` → 302/401; Koussay's step | 02-03 T1, T2 | ✅ |
| MEDIA-03, D-05 | ACAO * on every media-host response | cli | curl with and without Origin on the probe URL | 02-02 T1–T3 | ✅ (command) |
| MEDIA-02, SC6 | Type, immutable, ACAO with and without Origin, cold and warm; no r2.dev | cli | curl block; `node scripts/media.mjs verify` | 02-04 T2; 02-11 T3 | ❌ created by 02-04 |
| MEDIA-04, SC8 | Single writer; `check` prints `public ok` and cleans up; skip unless `--force`; verify all | cli | `node scripts/media.mjs check`; repeat `import-live` → 37 skips; `verify` → 37/37 | 02-04 T1, T2 | ❌ created by 02-04 |
| MEDIA-03, SC7 | Ring renders R2 covers; warm-cache round trips, no SecurityError | e2e | smoke home + round trips A and B | 02-06 T1 (red), 02-07 T1 (green) | ❌ |
| MEDIA-06, SC7 | Gallery src/srcset via `/_next/image?url=https%3A%2F%2Fmedia…`; hero currentSrc on media host | e2e | smoke on `/project/pixenhouse` | 02-06 T1, T2; 02-07 T1 | ❌ |
| D-07, SC7 | og:image is the cover, not the logo | e2e | smoke og check | 02-06 T1; 02-07 T1 | ❌ |
| TEST-02, SC9 | Fails without crossOrigin; fails with shader typo; green after restore | mutation | exit code + log line (m3, m4), restore runs (p1, p2) | 02-11 T1, T2 | ✅ test exists |

## Wave 0 Requirements
- [ ] `lib/content-schema.mjs` + `scripts/check-content.mjs`: CONT-02/06 fast gate (02-05)
- [ ] `scripts/compare-snapshot.mjs` + `.planning/phases/02-…/snapshot/` (live JSON, rendered strings, `llms.txt`): SC1 (02-01, 02-05)
- [ ] `scripts/compare-rendered.mjs`: SC1 rendered output (02-06)
- [ ] `scripts/media.mjs` with `check | import-live | verify | generate`: MEDIA-02/04 (02-04)
- [ ] Smoke additions: R2 loads + ACAO, zero `/api/media`, warm-cache round trip, placeholder 404, sitemap lastmod, hero/gallery sources, OG not logo (02-06)
- [ ] `.gitignore`: `/media-work/` (02-04)

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Old Vercel deployment URLs blocked | HYG-08 | Dashboard setting is Koussay's | Vercel → Project Settings → Deployment Protection shows Standard; one old deployment URL in a private window asks for login |
| 404 page looks the same in Geist | D-14 | Visual judgement | Before/after screenshots of `/project/does-not-exist`, signed at the 02-09 Task 2 checkpoint before the commit that removes 404.webp |
| Ring, project and gallery look unchanged | SC1 | Visual judgement | Side by side: `snapshot/screens/*.png` (live, before) vs `uat/after/*.png` (local build, 02-11 T3), plus UAT on the local production build |

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 480s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planner sign-off 2026-10-04 (Wave 0 items are created by the plans named above, so `wave_0_complete` stays false until they run); Koussay signs the plan
