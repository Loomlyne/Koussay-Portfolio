---
phase: 02-projects-served-from-the-repo
plan: 09
subsystem: ui
tags: [404, geist, cont-08]
requires: [02-08]
provides:
  - "404 mark as live Geist text; public/404.webp removed"
affects: [02-10, 02-11]
key-files:
  modified: [components/project/ProjectNotFound.jsx, "app/project/[slug]/page.module.css", tests/smoke.spec.mjs]
  deleted: [public/404.webp]
key-decisions:
  - "Koussay signed the 404 before/after: \"Approved\", 2026-10-04 17:26 +04"
requirements-completed: [CONT-08]
completed: 2026-10-04
---

# Phase 2 Plan 09: 404 in Geist Summary

The 404 page's mark is now live Geist text, signed by Koussay before the old image was deleted; no `.webp` remains in `public/`.

## Commits

- `ebaf6c1` feat(02-09): 404 mark in Geist text, 404.webp removed
- `baad40d` test(02): share-image check reads og:image from HTML, longer timeout (deviation, below)

## Verification (exit codes)

- Ink box vs old image: 1512 wide +0.7% width, +0.5% height; 390 wide +1.0% both (target ≤5%).
- `git ls-files public | grep -c webp` → 0.
- `npm run lint` 0, `npx prettier --check .` 0, `npm run build` 0.
- `npm test` 0: 17 passed, 1 flaky (desktop share-image test timed out on first try, passed on retry). Load average 8 to 14.
- After the test fix: `share images` and `removed files are gone` pass against a fresh server on 3100 (2/2).

## Sign-off

- Question "Sign the new 404?" in the control session; Koussay's own answer: **"Approved"**, 2026-10-04 17:26 +04. Screenshots committed in `uat/404-*.png`.

## Deviations

- The executor stopped at the checkpoint as designed; the orchestrator, where Koussay answered, ran Task 3.
- The share-image smoke test was flaky twice (desktop, 2 min timeout, passed on retry). It opened each project page in a full browser only to read `og:image`; it now reads the tag from the HTML with a 5 min limit. Test-only change, separate commit.
