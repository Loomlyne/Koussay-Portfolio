---
phase: 01-baseline-and-licence-hygiene
plan: 03
subsystem: fonts
tags: [geist, geist-mono, woff2, ofl, licence, canvas-fonts]
requires: [01-02]
provides:
  - "Geist and Geist Mono variable woff2 in public/fonts with OFL.txt"
  - "nameTracking param and dev-panel control"
  - "Tag arrow drawn in code; explicit document.fonts.load gate before ring entry"
affects: [01-04, 01-06]
key-files:
  created: [public/fonts/Geist-Variable.woff2, public/fonts/GeistMono-Variable.woff2, public/fonts/OFL.txt]
  modified: [app/globals.css, app/layout.js, app/booking/page.module.css, "app/project/[slug]/page.module.css", LICENSE, .gitignore, components/Carousel.jsx, components/ring/params.js, components/ring/gui.js, components/ring/meta.js, components/ring/tag.js]
  deleted: [public/ppneuemontreal-book.otf, public/Satoshi-Regular.otf, public/Satoshi-Medium.otf, public/Geist-Regular.ttf, public/arrow-top-right-svgrepo-com.svg]
key-decisions:
  - "Starting tracking values -0.02 em for heading and names are proposals for Koussay's sign-off in Plan 04"
  - "calendarWeekdays moved to Geist Mono so booking small data labels share one face (flagged for sign-off)"
requirements-completed: [HYG-01, HYG-02]
completed: 2026-10-03
---

# Phase 1 Plan 03: Geist for every face Summary

Every face on the site is now Geist or Geist Mono, served as the official v1.7.2 variable woff2 files with their OFL text, and the four unlicensed or unconfirmed font binaries and the arrow SVG are gone in one commit.

## Commit

- bb4a094: `feat(fonts): Geist for every face` (both tasks, one commit per D-08). Not pushed.

## Verification (exit codes)

- SHA-256 of both woff2 files equal the plan hashes; OFL.txt has the Geist copyright line (count 1).
- `npm run format:check` exit 0; `npm run lint` exit 0.
- Family grep over `app` and `components` prints only `"Geist Mono"` and `"Geist"`; no Satoshi, Neue Montreal or svgrepo string remains in app, components, lib.
- `grep -c geist package.json` prints 0 (geist was packed in a temp dir, never installed).
- `npm test` exit 0, 6 passed (7.8 min). Port 3100 empty afterwards.
- Not verified: how it looks. Visual sign-off is Plan 04.

## What changed

- globals.css: two @font-face blocks (font-weight 100 900). Loader label, crumbs, credit, glass button, both page roots use Geist; loader count and time, hero year, fallback file name, fit index, calendar weekdays and progress meta use Geist Mono.
- layout.js: React `preload` of Geist-Variable.woff2 only; no next/font.
- params.js: textFont Geist, textWeight 300, textTracking -0.02, nameFont Geist, nameTracking -0.02 (new), idxFont Geist Mono.
- gui.js: family dropdown is Geist and Geist Mono; `onMeta("nameTracking", ...)` added. meta.js applies the tracking to the big (name) span only.
- tag.js: arrow stroked from the SVG geometry; Image and load() removed.
- Carousel.jsx: `tag.load` removed; entry waits on `document.fonts.load` for the four exact cuts, 3 s fallback and cleanup unchanged; list font is Geist. No protected ring internals touched.
- LICENSE and .gitignore describe the fonts actually in the tree.

## Deviations from Plan

None. Minor note: the plan's heroIndex/loadingNumber/sectionNumber/pagerIndex classes carry no font-family of their own in the project module, so only the two rules that did (heroYear, mediaFallbackFile) changed to Mono.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

Three files in public/fonts found; commit bb4a094 exists; five deletions staged and committed.
