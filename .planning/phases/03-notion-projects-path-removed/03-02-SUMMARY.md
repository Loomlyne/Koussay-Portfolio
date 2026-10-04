---
phase: 03-notion-projects-path-removed
plan: 02
subsystem: media
tags: [share-card, geist, fontkit, sharp, devDependencies]
requires: [03-01]
provides:
  - lib/share.mjs (projectLines, homeLines, inputsHash, LAYOUT_VERSION, OWNER)
  - scripts/lib/share.mjs (layoutLine, renderCard, renderBooking, SHARE_SIZE, loadFonts)
affects: [03-03, 03-04, 03-05]
tech-stack:
  added: [geist@1.7.2 (dev), fontkit@^2.0.4 (dev), sharp@^0.35.5 (moved to dev)]
  patterns: [glyph-outline text via fontkit, one SVG composite over cover]
key-files:
  created:
    - lib/share.mjs
    - scripts/lib/share.mjs
    - scripts/share.test.mjs
  modified:
    - package.json
    - package-lock.json
decisions:
  - "Text drawn from Geist glyph paths; missing glyph or over-wide line throws and writes nothing"
  - "loadFonts() exported so tests share the cached font handles"
requirements-completed: []
duration: 25min
completed: 2026-10-04
---

# Phase 3 Plan 02: Share-card renderer Summary

A share card renders locally as a 1200x630 JPEG with Geist glyph-path text over a cropped cover and three-stop gradient, and the booking card renders as a PNG on #F4F5F6; nothing is uploaded or written to the manifest.

MEDIA-07 stays open until plan 05 (not ticked here).

## Package gate (T-03-SC)

- slopcheck (CLI scans dependency files, so a temp package.json listing geist@1.7.2, fontkit@^2.0.4, sharp@^0.35.5 was scanned): 3 scanned, 3 OK, 0 SLOP.
- Registry: geist@1.7.2 vercel/geist-font, vercel-release-bot, OFL, 3,055,520 weekly, no install scripts. fontkit@2.0.4 foliojs/fontkit, devongovett, MIT, 19,659,698 weekly, no install scripts. sharp@0.35.5 lovell/sharp, Apache-2.0, no install scripts.
- Koussay's reply at the checkpoint: "Approved" (geist@1.7.2, fontkit@^2.0.4, sharp@^0.35.5 as devDependencies), 2026-10-04 20:08 +04.
- `npm audit --omit=dev`: found 0 vulnerabilities.
- `git ls-files '*.ttf' '*.otf'`: empty. Fonts are read from node_modules only.

## Tasks

| Task | Commit |
|------|--------|
| 1 slopcheck and registry | none (no repo change) |
| 2 Koussay approval | n/a (checkpoint) |
| 3 RED tests | 21d8530 |
| 3 GREEN renderer and install | d7899a1 |

Verified: `node --test scripts/share.test.mjs` 8/8 pass; prettier check and `npm run lint` clean; widths match the UI-SPEC probe (716 and 564 within 3 px).

## Deviations from Plan

**1. [Rule 1 - Bug] Test used `sharp().extract().stats()`**
- Issue: sharp `stats()` ignores `extract`, so both regions returned the same mean and the glyph-band test failed although the render was correct (checked by viewing a crop).
- Fix: extract to a PNG buffer first, then `stats()`.
- Files: scripts/share.test.mjs. Included in d7899a1 (the RED commit held the original test).

**2. [Rule 3 - Blocking] `npm install -D geist@1.7.2` wrote `^1.7.2`**
- Fix: re-ran with `--save-exact` so package.json pins `1.7.2` as the plan requires.

## Known Stubs

None.

## Not done here

No R2 write, no manifest write, no pictures rendered for real projects (plans 03 and 04). npm printed an install-scripts warning for `unrs-resolver` (a pre-existing transitive dependency, not one of the three approved packages); not acted on.

## Self-Check: PASSED

Files lib/share.mjs, scripts/lib/share.mjs, scripts/share.test.mjs exist; commits 21d8530 and d7899a1 exist; nothing pushed.
