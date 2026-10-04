---
phase: 03-notion-projects-path-removed
plan: 05
subsystem: seo
tags: [og-image, twitter-image, r2, static, sharp-removed, smoke-test]
requires: [03-01, 03-04]
provides:
  - "Every page's og:image and twitter:image is a static file: R2 card for home and projects, committed PNG for booking"
  - "No request-time sharp: lib/og-image.js and six opengraph/twitter image routes deleted"
  - "@napi-rs/canvas, pdfjs-dist, unpdf uninstalled"
  - "Smoke test 'share images are static files'"
affects: [03-06]
key-files:
  created:
    - app/booking/opengraph-image.png
    - app/booking/opengraph-image.alt.txt
  modified:
    - app/page.js
    - app/layout.js
    - app/project/[slug]/page.js
    - lib/seo.js
    - package.json
    - package-lock.json
    - tests/smoke.spec.mjs
  deleted:
    - lib/og-image.js
    - app/opengraph-image.js
    - app/twitter-image.js
    - app/booking/opengraph-image.js
    - app/booking/twitter-image.js
    - app/project/[slug]/opengraph-image.js
    - app/project/[slug]/twitter-image.js
decisions:
  - "twitter.images is not set anywhere; Next fills it from openGraph.images (confirmed in built HTML)"
  - "Layout openGraph also carries the home card so the 404 route is never imageless; getHomeShare() stays server-side"
requirements-completed: [MEDIA-07]
duration: one session (test run slow under machine load)
completed: 2026-10-04
---

# Phase 3 Plan 05: Static share images, sharp and PDF packages out Summary

Page metadata now points at the published R2 cards (and a committed 1200x630 PNG for booking), the request-time image routes are gone, and the PDF packages are uninstalled.

## Commits

- 5a056db feat(03-05): metadata from project.og and getHomeShare(), booking PNG, routes and lib/og-image.js deleted, three packages uninstalled
- 9ad31cf test(03-05): "share images are static files"

## Verified

- Build route table has no `/opengraph-image` or `/twitter-image` function route. Booking appears as `○ /booking/opengraph-image.png` (static).
- Built HTML: home og:image `.../projects/_site/og-home-839a1a24.jpg`; project og:image `.../projects/vamos-taxi/og-21263e7e.jpg`; both with width 1200, height 630, and twitter:image equal to og:image. Booking og:image and twitter:image are `/booking/opengraph-image.png?opengraph-image.<hash>.png`, type image/png, 1200x630.
- A2 twitter-image fallback for booking was NOT needed (twitter:image present from the single PNG).
- `grep -rl og-home- .next/static` empty. `git grep` for sharp imports in app, components, lib empty. dependencies hold no sharp, canvas, pdfjs-dist or unpdf; sharp is a devDependency.
- Prettier, lint, build clean.
- `npm test`: 17 passed, 1 failed on the first full run (desktop "every project page renders", `page.goto` timeout; machine load average 40 from other products' Playwright runs). Re-run of that test plus the new one on desktop and phone: 4 passed.
- Mutation proof: pointing project openGraph.images at the logo makes "share images are static files" fail on desktop; page.js restored (`git diff --quiet` clean).

## Not verified

- Live scraper previews (LinkedIn, WhatsApp, X); nothing is pushed or deployed.

## Deviations from Plan

None. Booking files other than the image routes were not touched.

## Requirements

MEDIA-07 ticked: cards pre-rendered by `scripts/media.mjs`, served static, no sharp at request time. MEDIA-08 left open for plan 06 (CLAUDE.md stale lines and final criterion-1 grep).

## Self-Check: PASSED
