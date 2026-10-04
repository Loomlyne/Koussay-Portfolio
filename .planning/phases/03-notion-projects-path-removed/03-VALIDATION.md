---
phase: 3
slug: notion-projects-path-removed
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| **Quick run command** | `node scripts/check-content.mjs && node scripts/content-schema.test.mjs` |
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

Filled by the planner per task. Requirement-level map:

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| MEDIA-07 | Missing or stale `og` / `site.home` fails the build | unit | `node scripts/content-schema.test.mjs` (new cases) | extend | ⬜ pending |
| MEDIA-07 | Project/home `og:image` on R2, 1200×630, `twitter:image` equal; booking PNG 200 | e2e | `npm test` (rewritten share-image test) | rewrite | ⬜ pending |
| MEDIA-07 | Share text renders in Geist (no notdef glyphs) | unit | glyph test in the script tests | ❌ W0 | ⬜ pending |
| MEDIA-07 | No `sharp` import in `app/ components/ lib/` | grep | `git grep -n -E "from \"sharp\"" -- app components lib` empty | n/a | ⬜ pending |
| MEDIA-08 | Removed names absent | grep | `git grep -n -E "lib/cms\|notion/projects\|api/media\|gallery-pdf\|lib/pdf\|cms-stamp\|api/revalidate\|CmsLive\|unstable_cache" -- . ':!.planning' ':!package-lock.json'` empty | n/a | ⬜ pending |
| MEDIA-08 | Packages gone; `sharp` dev-only; config keys gone | cmd | `node -e` package.json assert; `git grep serverExternalPackages\|outputFileTracingIncludes -- next.config.mjs` empty | n/a | ⬜ pending |
| MEDIA-08 | Deleted routes 404; no page requests `/api/media`; gallery `next/image` still works | e2e | `npm test` | rewrite | ⬜ pending |
| MEDIA-09 | Booking code unchanged except dead `cachedDataSourceId` | diff | `git diff <base> -- lib/book lib/notion/bookings.js lib/mail app/api/book components/book` empty | n/a | ⬜ pending |
| MEDIA-09 | Blocked time hides its slots | script | read-only `GET /api/book/availability` + `isSlotOpen` on the real-key server | throwaway | ⬜ pending |
| MEDIA-09 | Dead env vars gone | cmd | `vercel env ls` lacks both; `git grep NOTION_PROJECTS\|NOTION_WEBHOOK -- . ':!.planning'` empty | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/share.mjs` (pure inputs/hash) and `scripts/lib/share.mjs` (render) before tests can run
- [ ] New `og` / `site.home` cases in `scripts/content-schema.test.mjs`
- [ ] Geist glyph test
- [ ] `--preview` mode in `scripts/media.mjs` for the D-07 pictures

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Share image design signed | MEDIA-07 | D-07: Koussay signs pictures before code ships | Render 2 projects + home with `--preview`; Koussay signs |
| Booking end to end | MEDIA-09 | Needs real Notion, Notion Calendar and Resend (D-08) | Real-key build on `localhost:3100`; Koussay books "TEST — Phase 3"; confirms row, calendar entry, both emails |
| Webhook subscription deleted | MEDIA-09 | Notion has no API for it (D-12) | One numbered step for Koussay after ship |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 300s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
