---
phase: 02-projects-served-from-the-repo
plan: 08
subsystem: cleanup
tags: [placeholders, cms-stamp, d-11, cont-08]
requires: ["02-07"]
provides:
  - "No placeholder data, Behance image or fallback path in the tree"
  - "/api/cms-stamp is a constant { stamp: \"\" }; CmsLive no longer mounted"
affects: [02-09]
key-files:
  modified: [lib/projects.js, components/Carousel.jsx, components/ring/meta.js, components/ring/atlas.js, components/ring/params.js, app/providers.js, app/api/cms-stamp/route.js, tests/smoke.spec.mjs]
  deleted: [components/ring/projects.js, lib/cms/projects.js, "public/1.webp ... public/18.webp"]
key-decisions:
  - "params.js count default is MAX_PLANES; Carousel overwrites it with the project count before use"
requirements-completed: [CONT-08]
completed: 2026-10-04
---

# Phase 2 Plan 08: Placeholders and Notion polling removed Summary

The 18 placeholders, their Behance art and the old resolver are deleted, every list argument is now required, and nothing polls Notion for projects.

Commit (not pushed): `d002f04`.

## Results (exit codes)

- `node scripts/check-content.mjs`: exit 0 (8 projects, 37 media). `npm run lint`: exit 0. `npx prettier --check .`: clean. `npm run build`: exit 0.
- `npm test`: 17 passed, 1 flaky (desktop "project share images are real and not the logo" timed out on `page.goto` at load average 10 to 15, passed on the automatic retry). Includes the new "removed files are gone" test (`/1.webp`, `/18.webp` 404, cms-stamp `{ stamp: "" }`). Port 3100 held by Playwright's own server, free afterwards.
- `git diff --stat 124cfc6 -- lib/notion/client.js lib/notion/bookings.js lib/book app/api/book`: empty.
- grep for `ring/projects|lib/cms/projects|IMAGE_FILES|FALLBACK_PROJECTS` in app, components, lib, scripts, tests: empty. `public/404.webp` left for Plan 09.

## Deviations from Plan

**1. [Rule 3 - Blocking] `components/ring/params.js` also imported `PROJECTS` from the deleted file** (not in the plan's importer list). `count` now defaults to `MAX_PLANES` (Carousel sets `params.count` from the list right after `defaultParams()`); a comment mentioning `PROJECTS[0]` reworded. Value-neutral for the ring.

**2. Task 1 and Task 2 share one commit**, as the plan specifies.

## Known Stubs

None.

## Self-Check: PASSED

Commit d002f04 exists; deleted files absent from `git ls-files`; SUMMARY present.
