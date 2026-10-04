---
phase: 02-projects-served-from-the-repo
plan: 06
subsystem: media-loaders
tags: [smoke-test, crossOrigin, remotePatterns, compare-rendered]
requires: ["02-05"]
provides:
  - "tests/smoke.spec.mjs: R2, cut-over and warm-cache assertions (red until Plan 07)"
  - "Cross-origin loads on atlas, flyer, hero and home preload; remotePatterns for media.koussay.online"
  - "scripts/compare-rendered.mjs: rendered output vs live snapshot, refuses production"
affects: [02-07]
key-files:
  modified: [tests/smoke.spec.mjs, playwright.config.mjs, components/ring/atlas.js, components/SharedTransitionProvider.jsx, components/project/ProjectMedia.jsx, app/page.js, next.config.mjs]
  created: [scripts/compare-rendered.mjs]
key-decisions:
  - "Hero selector is `main header img`; gallery selector is `section[aria-label=Gallery] img`"
requirements-completed: [MEDIA-03, MEDIA-06]
completed: 2026-10-04
---

# Phase 2 Plan 06: Cut-over test, cross-origin loaders, compare script Summary

The R2 cut-over is specified as a failing smoke test, every raw-cover loader now requests cross-origin and the media host is allowed in `remotePatterns`. Nothing visible changes; the app still serves today's URLs.

Commits (not pushed): `bb83f51` (RED smoke), `39618d6` (cross-origin + remotePatterns), `6be16ee` (compare-rendered).

## Results (exit codes)

- RED `npm test`: exit 1, 4 passed, 12 failed (6 tests x desktop and phone, each retried once). Load average 5 to 14 during the run; failures are assertion failures, not timeouts of load.
  - Failed, all cut-over assertions: home (zero R2 responses with ACAO, expected >= 8), every project page (sitemap paths/lastmod differ from content modules), gallery (0 gallery imgs vs 29 expected), og images, `/project/matchday` (200, expected 404), warm round trip A (hero naturalWidth never > 0).
  - Passed: booking first step (booking calls zero), warm round trip B, and the two other tests.
- After Task 2: `npm run lint` exit 0, `npm run build` exit 0, prettier unchanged/clean.
- `node scripts/compare-rendered.mjs --base=https://koussay.online`: exit 1, refusal message, no request. Prettier and ESLint exit 0; no env reads.
- `atlas.js` diff: crossOrigin line plus comment before `img.src`, and warn to error only.

## Deviations from Plan

None. The compare script cannot print `rendered ok` until Plan 07 switches the source (not run against a server here).

## Known Stubs

None.

## Self-Check: PASSED

Commits bb83f51, 39618d6, 6be16ee exist; scripts/compare-rendered.mjs present.
