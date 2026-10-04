---
phase: 3
slug: notion-projects-path-removed
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-04
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `03-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.63 (`npm test`) plus Node scripts (`scripts/check-content.mjs`, `scripts/content-schema.test.mjs`) |
| **Config file** | `playwright.config.mjs` (port 3100, desktop 1512 and phone 390, booking keys blanked) |
| **Quick run command** | `node scripts/check-content.mjs && node --test scripts/content-schema.test.mjs` |
| **Full suite command** | `npx prettier --check . && npm run lint && npm run build && npm test` |
| **Estimated runtime** | quick ~1 s; full ~5 min (load-dependent) |

---

## Sampling Rate

- **After every task commit:** quick run command, plus prettier and eslint on touched files
- **After every plan wave:** `npx prettier --check . && npm run lint && npm run build`
- **Before `/gsd-verify-work`:** full suite green on the tree that ships, then the D-08 booking proof
- **Max feedback latency:** 300 seconds

---

## Per-Task Verification Map

Per task (quick command after each task; the plan-end gate is `npx prettier --check . && npm run lint && npm run build`, and the full suite `... && npm test` runs at the end of 03-01, 03-05 and 03-06). Every plan runs in the main checkout, one plan at a time (waves 1-7 are sequential).

| Task ID | Plan | Wave | Requirement | Type | Automated Command (quick) | Status |
|---------|------|------|-------------|------|---------------------------|--------|
| 03-01-T1 | 01 | 1 | MEDIA-08, MEDIA-09 | grep + diff + lint | removed-name `git grep` on app components lib next.config.mjs empty && `git diff ca24456 -- lib/book lib/notion/bookings.js lib/mail app/api/book components/book` empty && `npm run lint && node scripts/check-content.mjs` | ⬜ pending |
| 03-01-T2 | 01 | 1 | MEDIA-08 | grep + build + e2e | `git grep -n -E 'NOTION_PROJECTS\|NOTION_WEBHOOK' -- . ':!.planning' ':!CLAUDE.md'` empty && `npx prettier --check . && npm run build` && `npx playwright test -g "removed files are gone\|placeholder slug" --project=desktop` | ⬜ pending |
| 03-02-T1 | 02 | 2 | MEDIA-07 | cmd | `test ! -e /tmp/slopcheck-03 && test -z "$(git status --porcelain package.json package-lock.json)"` | ⬜ pending |
| 03-02-T2 | 02 | 2 | MEDIA-07 | checkpoint (blocking-human) | n/a: Koussay confirms geist and fontkit; T1 verify covers state | ⬜ pending |
| 03-02-T3 | 02 | 2 | MEDIA-07, MEDIA-08 | unit (tdd) | `node --test scripts/share.test.mjs` && package.json sharp/fontkit/geist assert && no `<text` in scripts/lib/share.mjs && `npm run lint` | ⬜ pending |
| 03-03-T1 | 03 | 3 | MEDIA-07 | cmd | `.media-probe/share/` files exist && `git status --porcelain content app` empty && `share --labels` without --preview exits non-zero && `npm run lint` | ⬜ pending |
| 03-03-T2 | 03 | 3 | MEDIA-07 | checkpoint (human-verify) | n/a: Koussay signs Q1-Q4; `git status --porcelain content` empty | ⬜ pending |
| 03-04-T1 | 04 | 4 | MEDIA-07 | cmd + unit | manifest `og`/`site.home` `node -e` assert && `grep -c api/media content/media.json` = 0 && `node scripts/media.mjs verify && node --test scripts/share.test.mjs` | ⬜ pending |
| 03-04-T2 | 04 | 4 | MEDIA-07 | unit (tdd) + build | `node --test scripts/content-schema.test.mjs && node scripts/check-content.mjs \| grep -q "9 share" && npm run build` | ⬜ pending |
| 03-05-T1 | 05 | 5 | MEDIA-07, MEDIA-08 | grep + cmd + build | no `lib/og-image.js`, no opengraph/twitter-image.js, no sharp import in app components lib, package.json assert, `npm run build` | ⬜ pending |
| 03-05-T2 | 05 | 5 | MEDIA-07, MEDIA-08 | e2e | `npx prettier --check tests && npm test` | ⬜ pending |
| 03-06-T1 | 06 | 6 | MEDIA-08, MEDIA-09 | grep | stale-fact `git grep` on CLAUDE.md README.md AGENTS.md empty && `npx prettier --check README.md AGENTS.md` | ⬜ pending |
| 03-06-T2 | 06 | 6 | MEDIA-08, MEDIA-09 | full gate | removed-name grep (only the named tests/smoke.spec.mjs exception) && full suite command; writes `Gated SHA:` | ⬜ pending |
| 03-07-T1 | 07 | 7 | MEDIA-09 | script (read-only) | `git diff --quiet <Gated SHA> HEAD -- . ':!.planning'` && localhost:3100/booking 200 && availability `busy` array; jiti throwaway script proves a calendar block closes its slots | ⬜ pending |
| 03-07-T2 | 07 | 7 | MEDIA-09 | checkpoint (human-verify) | n/a: Koussay books "TEST — Phase 3" and confirms four items | ⬜ pending |
| 03-07-T3 | 07 | 7 | MEDIA-09 | cmd | `test -z "$(lsof -nP -iTCP:3100 -sTCP:LISTEN -t)"` | ⬜ pending |
| 03-07-T4 | 07 | 7 | MEDIA-09 | checkpoint (human-action) | n/a: Koussay deletes the TEST row | ⬜ pending |

Requirement-level map:

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| MEDIA-07 | Missing or stale `og` / `site.home` fails the build | unit | `node --test scripts/content-schema.test.mjs` (new cases) | extend | ⬜ pending |
| MEDIA-07 | Project/home `og:image` on R2, 1200×630, `twitter:image` equal; booking PNG 200 | e2e | `npm test` (rewritten share-image test) | rewrite | ⬜ pending |
| MEDIA-07 | Share text renders in Geist (no notdef glyphs) | unit | glyph test in the script tests | ❌ W0 | ⬜ pending |
| MEDIA-07 | No `sharp` import in `app/ components/ lib/` | grep | `git grep -n -E "from \"sharp\"" -- app components lib` empty | n/a | ⬜ pending |
| MEDIA-08 | Removed names absent | grep | `git grep -n -E "lib/cms\|notion/projects\|api/media\|gallery-pdf\|lib/pdf\|cms-stamp\|api/revalidate\|CmsLive\|unstable_cache" -- . ':!.planning' ':!package-lock.json'` empty | n/a | ⬜ pending |
| MEDIA-08 | Packages gone; `sharp` dev-only; config keys gone | cmd | `node -e` package.json assert; `git grep serverExternalPackages\|outputFileTracingIncludes -- next.config.mjs` empty | n/a | ⬜ pending |
| MEDIA-08 | Deleted routes 404; no page requests `/api/media`; gallery `next/image` still works | e2e | `npm test` | rewrite | ⬜ pending |
| MEDIA-09 | Booking code unchanged except dead `cachedDataSourceId` | diff | `git diff <base> -- lib/book lib/notion/bookings.js lib/mail app/api/book components/book` empty | n/a | ⬜ pending |
| MEDIA-09 | A Notion calendar-database block hides its slots | script | read-only `GET /api/book/availability` + real `isSlotOpen`/`fetchBusyRanges` via jiti on the real-key server | throwaway | ⬜ pending |
| MEDIA-09 | Dead env vars gone | cmd | repo: `git grep NOTION_PROJECTS\|NOTION_WEBHOOK -- . ':!.planning'` empty; Vercel: `vercel env ls` lacks both (pending post-ship, 03-07 step a) | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `lib/share.mjs` (pure inputs/hash) and `scripts/lib/share.mjs` (render) before tests can run (covered: 03-02 T3, tdd)
- [x] New `og` / `site.home` cases in `scripts/content-schema.test.mjs` (covered: 03-04 T2, tdd)
- [x] Geist glyph test (covered: 03-02 T3, scripts/share.test.mjs)
- [x] `--preview` mode in `scripts/media.mjs` for the D-07 pictures (covered: 03-03 T1)

Each Wave 0 item is created by the plan whose task first needs it; no task verifies against a file that an earlier task has not created.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Share image design signed | MEDIA-07 | D-07: Koussay signs pictures before code ships | Render the set with `share --preview`; Koussay answers Q1 (sign) then Q2-Q4 (one label each, share-only) |
| Booking end to end | MEDIA-09 | Needs real Notion, Notion Calendar and Resend (D-08) | Real-key build on `localhost:3100`; Koussay books "TEST — Phase 3"; confirms row, calendar entry, both emails |
| Webhook subscription deleted | MEDIA-09 | Notion has no API for it (D-12) | One numbered step for Koussay after ship; success criterion 4 reported as `pending post-ship` until then |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (checkpoints are human gates between automated tasks)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 300s (quick commands; full suite only at plan/phase end)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
