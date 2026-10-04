---
phase: 02-projects-served-from-the-repo
plan: 07
subsystem: cut-over
tags: [content-switch, r2, static-params, og-image, compare-rendered]
requires: ["02-06"]
provides:
  - "lib/content.js: server-only getProjects(), getProject(slug), resolved at module evaluation"
  - "Every page, sitemap, llms.txt and share image reads the content modules; /project/[slug] static for 8 slugs, dynamicParams = false"
  - "Hero direct from R2 (unoptimized, crossOrigin), gallery through next/image, warm cache in the hero's request mode"
  - "Share images fetch the R2 cover and throw rather than show the logo"
affects: [02-08]
key-files:
  created: [lib/content.js]
  modified: [app/page.js, "app/project/[slug]/page.js", app/sitemap.js, app/llms.txt/route.js, app/opengraph-image.js, app/twitter-image.js, "app/project/[slug]/opengraph-image.js", "app/project/[slug]/twitter-image.js", lib/og-image.js, components/project/ProjectMedia.jsx, components/project/ProjectGallery.jsx, lib/project/warm.js, components/project/ProjectWarm.jsx, tests/smoke.spec.mjs, scripts/compare-rendered.mjs]
key-decisions:
  - "compare-rendered measures pages as the browser renders them: streamed segments swapped into their boundaries, the aria-busy loading skeleton skipped"
requirements-completed: [CONT-06, MEDIA-03, MEDIA-06]
completed: 2026-10-04
---

# Phase 2 Plan 07: The switch Summary

The site now builds from the repo content modules and loads covers from R2. The rendered pages equal the live snapshot for home and all 8 projects, and the smoke test is green.

Commits (not pushed): `7d7a140` (compare-rendered fix), `b4f5858` (the switch).

## Results (exit codes)

- `node scripts/check-content.mjs`: exit 0. `npm run lint`: exit 0. `npx prettier --check .`: clean. `npm run build`: exit 0; route table shows `● /project/[slug]` with pixenhouse, vamos-taxi, looma-kitchen and 5 more.
- `/project/matchday`: 404.
- Smoke (`playwright test` against a hand-started server on 3100, booking env blanked): 16 passed, desktop and phone, exit 0.
- `node scripts/compare-rendered.mjs`: `rendered ok 9/9`, exit 0.
- `llms.txt` diff against the snapshot: empty.
- Port 3100 freed by PID only. Load average was 20 to 27 during the runs (the first full `npm test` run was slow and was stopped after the selector bug showed).

## Deviations from Plan

**1. [Rule 1 - Bug] Smoke hero selector matched the logo.** `main header img` also matches the site logo in the breadcrumb header, so the project-page test waited 5 minutes and failed. Changed both uses to `main header img[src^="${R2}"]` in tests/smoke.spec.mjs (a Plan 06 test bug). Included in the switch commit.

**2. [Rule 1 - Bug] compare-rendered read the wrong DOM (orchestrator decision).** Its first `<main>` is the `loading.js` skeleton, and the real page arrives as streamed hidden segments, so the first run failed 1/9 with `(missing)` text. Fixed in its own commit: extraction swaps each `<div hidden id="S:n">` segment into its `$RC` boundary (`<!--$?--><template id="B:n">`) or its `$RS` placeholder (`<template id="P:n">`) on both the snapshot and local HTML, then selects the `<main>` without `aria-busy`. Every check is as strict as before; there is no allow-list. The Pixenhouse snapshot nests segments (S:1 holds P:2 and B:3), so the swap repeats until none are left and throws on an orphan segment.

**3. `import "server-only"`** resolves under Next 16.3.8; no deviation needed.

## Notes

- `next start` logs `Error: Internal: NoFallbackError` for unknown slugs, the expected result of `dynamicParams = false`; the response is a 404.
- `/llms.txt` shows as dynamic in the route table (no `revalidate`); its bytes equal the snapshot.
- `lib/cms/projects.js`, `lib/notion/gallery-pdf.js` and the media route are untouched; Plan 08 removes them.

## Known Stubs

None.

## Self-Check: PASSED

Commits 7d7a140 and b4f5858 exist; lib/content.js present; `git status` clean.
