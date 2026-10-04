---
phase: 03-notion-projects-path-removed
plan: 06
subsystem: docs
tags: [docs, claude-md, codebase-map, phase-gate, readme]
requires: [03-05]
provides:
  - "CLAUDE.md, README.md and .planning/codebase/*.md describe the tree as it is: static R2 media, share cards from scripts/media.mjs share, sharp ^0.35 as a script-only devDependency, Notion for bookings only"
  - "Phase 3 end gate green on one recorded commit"
affects: [03-07]
key-files:
  modified:
    - CLAUDE.md
    - README.md
    - scripts/media.mjs
    - .planning/codebase/ARCHITECTURE.md
    - .planning/codebase/CONCERNS.md
    - .planning/codebase/CONVENTIONS.md
    - .planning/codebase/INTEGRATIONS.md
    - .planning/codebase/STACK.md
    - .planning/codebase/STRUCTURE.md
    - .planning/codebase/TESTING.md
decisions:
  - "CLAUDE.md carries no removed-name line at all (no 'removed in Phase 3' notes); the codebase docs keep only a short Phase 3 note where history helps"
  - "Stale next version (16.3.0) corrected to 16.3.8 in CLAUDE.md and the codebase docs while rewriting those lines"
requirements-completed: [MEDIA-08]
duration: one session (npm test slow under machine load 12 to 120)
completed: 2026-10-04
---

# Phase 3 Plan 06: Docs match the tree, phase-end gate Summary

Instruction and codebase docs rewritten to the tree without the Notion projects path, then the full phase gate run and recorded on one commit.

Gated SHA: 65aacf6b9a57d19e838e867f8b6a55e7766913f8

## What changed

- `.planning/codebase/*.md` (7 files) edited first, then the same wording copied into the GSD-generated sections of `CLAUDE.md`: removed the media proxy, PDF renderer, Notion project adapter, cache-bust, CmsLive, webhook and ISR facts; added the static share-card flow (`share`, `share --preview`, `share --booking`), `images.remotePatterns` for media.koussay.online, dev-only `sharp ^0.35.5`, `fontkit`, `geist`, the booking-only API surface, `robots` disallowing `/api/book` only, `dynamicParams = false`.
- `README.md`: `import-live` line replaced by `share --preview`, `share`, `share --booking` and the skip-unless-`--force` rule. Prettier clean.
- `AGENTS.md`: no hit, not touched. `CLAUDE.md` user header, `GSD:skills`, `GSD:workflow` and `GSD:profile` sections not touched.
- `scripts/media.mjs`: one stale comment ("once app/booking/opengraph-image.js is deleted") replaced; no code change.

## Gate results (all on HEAD 65aacf6, tree clean)

| Step | Check | Result | Time (+04) |
|------|-------|--------|------------|
| 1 | removed-name grep outside `.planning` | only `tests/smoke.spec.mjs:53,245,250` (see exception) | 21:01:07 |
| 2 | `NOTION_PROJECTS` / `NOTION_WEBHOOK` grep outside `.planning` | empty | 21:01:07 |
| 3 | no `from "sharp"` in app/components/lib; no `serverExternalPackages` / `outputFileTracingIncludes` in next.config.mjs; `@napi-rs/canvas`, `pdfjs-dist`, `unpdf`, `sharp` not in `dependencies` | all hold | 21:01:07 |
| 4 | `git diff ca24456 -- lib/book lib/notion/bookings.js lib/mail app/api/book components/book` | empty (byte-identical) | 21:01:07 |
| 5 | `prettier --check .` | clean | 21:01:12 |
| 5 | `npm run lint` | clean | 21:01:12 |
| 5 | `npm run build` | passed; routes: `/`, `/_not-found`, `/api/book`, `/api/book/availability`, `/api/book/draft`, `/booking`, `/booking/opengraph-image.png`, `/llms.txt`, `/project/[slug]` (8 SSG), `/robots.txt`, `/sitemap.xml`. No `/api/media`, `/api/cms-stamp`, `/api/revalidate`, no opengraph-image or twitter-image function route | 21:01:12 to 21:02:03 |
| 5 | `node scripts/check-content.mjs` | `content ok: 8 projects, 37 media, 9 share` | 21:02:03 |
| 5 | `node --test scripts/content-schema.test.mjs scripts/share.test.mjs` | 27 tests, 27 pass, 0 fail | 21:02:11 |
| 6 | `npm test`, run 1 (load average 38 rising to 121) | 17 passed, 1 flaky (desktop `warm round trip: ring, project, back`: first attempt saw `[atlas] failed to load` for four media.koussay.online covers under load; passed on Playwright's retry), 13.6 min | 21:02:17 to 21:15:59 |
| 6 | `npm test`, run 2 (load average 23, falling to 13), re-run once as the repo rule says | 18 passed, 0 flaky, exit 0, 4.7 min | 21:16:13 to 21:20:54 |
| 6 | port 3100 after both runs | no listener | 21:16 and 21:20 |

Run 2 printed one `[WebServer] Error: Internal: NoFallbackError` line during the placeholder-slug 404 check; that test passed (an unknown slug 404s because `dynamicParams = false`).

No server of mine was killed by pattern; both Playwright runs stopped their own webServer on port 3100.

## Criterion 1 exception (for the UAT note to Koussay)

ROADMAP success criterion 1 greps the repo outside `.planning/` for the removed names. It still hits `tests/smoke.spec.mjs` on purpose, at three lines: the `apiMedia` watcher (line 53, checks that no page requests `/api/media`) and the 404 assertions that name `/api/cms-stamp`, `/api/revalidate` and `/api/media/abc` (lines 245 and 250). A test that proves a route is gone has to name it. `content/media.json` was scrubbed in Plan 04 and nothing else matches. MEDIA-08 is ticked on that basis; every package and config clause also holds.

## Deviations from Plan

**1. [Rule 1 - Stale fact] Corrected next version and stale comment**
- **Found during:** Task 1
- **Issue:** the docs said Next 16.3.0 (package.json is 16.3.8) and `scripts/media.mjs` carried a comment naming a deleted file.
- **Fix:** version corrected in the lines being rewritten; comment replaced. No behaviour change.
- **Files:** CLAUDE.md, .planning/codebase/*.md, scripts/media.mjs
- **Commit:** 65aacf6

**2. [Rule 1 - Stale fact] Dropped other dead facts while rewriting the same sections**
- The codebase docs also named files that are already gone (`components/TwoPlaneMorph.jsx`, `shader`, `docs/NEXT-SESSION-PROMPT.md`, `lib/media.js`); those lines were removed with the rest. No file touched outside the plan list except `scripts/media.mjs` (comment).

## Task commits

| Task | Commit | What |
|------|--------|------|
| 1 | 65aacf6 | docs(03-06): instructions and codebase docs match the tree without the Notion projects path |
| 2 | none | read-only gate; results above |

## Known Stubs

None.

## Threat Flags

None. T-03-18 and T-03-19 mitigations hold: the stale-fact grep over CLAUDE.md, README.md and AGENTS.md is empty and the `NOTION_PROJECTS` / `NOTION_WEBHOOK` grep outside `.planning` is empty.

## Requirements

MEDIA-08 ticked. MEDIA-09 stays open until plan 07.

## Self-Check: PASSED

- 03-06-SUMMARY.md exists; commit 65aacf6 exists; `Gated SHA` line present and equals `git rev-parse HEAD` at gate time; working tree clean at gate.
