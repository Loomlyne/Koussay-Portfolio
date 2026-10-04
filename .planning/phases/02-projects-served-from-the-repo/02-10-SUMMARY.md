---
phase: 02-projects-served-from-the-repo
plan: 10
subsystem: docs
tags: [license, readme, agents, codebase-docs]
requires: [02-09]
provides: [D-15 LICENSE media wording, content and media model in README, true instruction sources]
affects: [LICENSE, README.md, AGENTS.md, CLAUDE.md, .planning/codebase/*.md]
key-files:
  modified: [LICENSE, README.md, AGENTS.md, CLAUDE.md, ".planning/codebase/ARCHITECTURE.md", ".planning/codebase/CONVENTIONS.md", ".planning/codebase/STACK.md", ".planning/codebase/STRUCTURE.md", ".planning/codebase/TESTING.md", ".planning/codebase/INTEGRATIONS.md", ".planning/codebase/CONCERNS.md"]
decisions:
  - "Same replacement wording applied to CLAUDE.md and the codebase docs so GSD regeneration agrees"
metrics:
  completed: 2026-10-04
---

# Phase 2 Plan 10: Licence, README and instruction docs Summary

LICENSE carries the D-15 media sentence verbatim; README, AGENTS.md, CLAUDE.md and the seven codebase docs now describe repo content modules and R2 media on media.koussay.online.

## Commit

- b9a9703 docs(02-10): licence media wording, content model in readme, agents and codebase docs (11 files, not pushed)

## What changed

- LICENSE: Behance imagery paragraphs replaced by the D-15 sentence. Lines 1-22 and the last 5 lines match HEAD (diffed).
- README: content model, a Content section (D-11, scripts/media.mjs commands, check-content), Project media paragraph pointing at LICENSE, git-history sentence kept, no em-dashes.
- AGENTS.md: card count, layout tree, ring order (`ORDER` in content/projects/index.mjs), oversize and placeholder known gaps replaced or removed and renumbered. nextjs-agent-rules block untouched.
- CLAUDE.md and codebase docs: placeholder fallback, lib/cms/projects.js, components/ring/projects.js, generate-project-media.mjs, media-manifest.json and public/1-18.webp no longer described as present. Legacy Notion files marked unreferenced and removed in Phase 3. CONCERNS items marked resolved in Phase 2 with "removed files remain in git history". 404 mark described as live Geist text with 404.webp removed.

## Verification

- D-15 whitespace-normalised grep: pass. `grep -ci behance LICENSE`: 0.
- Stale-fact grep (CLAUDE.md, codebase docs): clean.
- `npm run format:check`: exit 0. `npm run lint`: exit 0. `node scripts/check-content.mjs`: exit 0 (8 projects, 37 media).
- Task 1 automated check used `npx prettier --check` via format:check; both files pass.

## Deviations from Plan

- AGENTS.md known gap 1 (clicking a card opens nothing) is stale but was left as is; the plan limits edits to the listed facts. Worth a later pass.
- Commit was made before this SUMMARY (sequencing note only; no content effect).

## Known Stubs

None.

## Self-Check: PASSED

b9a9703 exists; all 11 files modified.
