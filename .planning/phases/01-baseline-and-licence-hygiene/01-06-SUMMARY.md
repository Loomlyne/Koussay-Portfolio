---
phase: 01-baseline-and-licence-hygiene
plan: 06
subsystem: docs
tags: [licence, readme, credits, agents, codebase-docs]
requires: ["01-05"]
provides: ["Public-repo-true LICENSE, README, BREAKDOWN header, AGENTS.md, CLAUDE.md and codebase docs", "Phase-end gate green"]
affects: []
key-files:
  modified: [LICENSE, BREAKDOWN.md, README.md, AGENTS.md, CLAUDE.md, .planning/codebase/STACK.md, .planning/codebase/CONVENTIONS.md, .planning/codebase/INTEGRATIONS.md, .planning/codebase/STRUCTURE.md, .planning/codebase/ARCHITECTURE.md, .planning/codebase/CONCERNS.md, .planning/codebase/TESTING.md]
decisions:
  - "Old fonts and the seed script appear in instruction sources only as removed and kept in git history"
metrics:
  completed: 2026-10-04
requirements: [HYG-03, HYG-04, HYG-05]
---

# Phase 1 Plan 06: Licence, README, credits and docs Summary

LICENSE carries Koussay's line above Yousuf's with the upstream notices intact; README, BREAKDOWN, AGENTS.md, CLAUDE.md and the codebase docs now describe the Geist-only, tested tree.

## Commit

- `cf00c2f` docs: licence, readme, credits, font facts in agents and codebase docs (not pushed)

## Proofs

- LICENSE reference BASE: `41a27ce9b6009f1dcd5b72945eff0b5b0132dd95 docs(01-02): complete playwright smoke test plan` (parent of the Geist font commit).
- MIT block diff (lines 1-21, Koussay line removed) against BASE: empty. Simplex block (last 5 lines) diff against BASE: empty. Yousuf line count 1, directly below Koussay's.
- No Satoshi, PP Neue Montreal or SVG Repo in LICENSE, AGENTS.md or .gitignore. README has none either. CLAUDE.md and codebase docs mention the old fonts only on one CONCERNS line that says "git history".
- BREAKDOWN.md: 5 lines added, 0 deleted. README lists every uncommented `.env.example` key, links Viscose-carousel and BREAKDOWN.md, embeds no docs/*.png.
- AGENTS.md: Dead files section and "no tests" paragraph removed, Known gap 2 removed and renumbered, nextjs-agent-rules block untouched.

## Phase-end gate (final tree)

- `npm run format:check` exit 0
- `npm run lint` exit 0
- `npm run build` exit 0
- `npm test` exit 0, 6 passed (5.7 min). Port 3100 empty afterwards.

## Deviations from Plan

**1. [Rule 3 - Blocking] Gate flake under load.** The first `npm test` run failed desktop "home renders the ring" (loader counter reached 94 of 100 in 45 s, load average about 50 on this Mac) and one project-page retry. Docs-only change, no code touched. Re-run at lower load passed 6/6. No test or config edited.

**2. [Scope] CONCERNS.md and TESTING.md** also had stale "no tests" and Prettier-drift lines beyond the plan's line list. Updated to match.

A mid-task usage-limit cut-off left partial edits; they were checked against the plan and completed.

## Known Stubs

None.

## Self-Check: PASSED

cf00c2f exists; all 12 files modified and committed; SUMMARY present.
