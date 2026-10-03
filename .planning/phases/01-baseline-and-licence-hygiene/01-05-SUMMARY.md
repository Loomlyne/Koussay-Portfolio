---
phase: 01-baseline-and-licence-hygiene
plan: 05
subsystem: hygiene
tags: [cleanup, licence, gitignore]
requires: [01-04]
provides:
  - "Dead files and dead env accessors removed"
  - ".agents/skills untracked and gitignored; skills-lock.json tracked"
affects: [01-06]
key-files:
  modified: [lib/env.js, .gitignore]
  deleted: [components/TwoPlaneMorph.jsx, shader, scripts/seed-notion-projects.mjs]
key-decisions:
  - "Left scripts/lib/r2.mjs isR2Configured(config) untouched; it is the script's own helper"
requirements-completed: [HYG-06]
completed: 2026-10-03
---

# Phase 1 Plan 05: Dead files and untracked skills Summary

Removed TwoPlaneMorph.jsx, the root `shader` file and scripts/seed-notion-projects.mjs; dropped the five unused env accessors from lib/env.js (17 exports remain); untracked 102 files under .agents/skills (8 entries still on disk) and added `/.agents/skills/` to .gitignore.

## Commit

- 418ea09: `chore: remove dead files and untrack agent skills`. Not pushed.

## Verification (exit codes)

- Reference grep before deletion: only definitions (and the script's own isR2Configured). No imports of the targets.
- `npm run format:check` 0, `npm run lint` 0, `npm run build` 0, `npm test` 0 (6 passed, 8.3 min).
- `git ls-files .agents/skills` 0 files; `git ls-files skills-lock.json` tracked; `git check-ignore skills-lock.json` exit 1 (not ignored); `.agents/skills` still on disk.
- Port 3100 free after the run.

## Not verified

- Fresh-clone restore of skills from skills-lock.json.

## Deviations

None - plan executed as written.
