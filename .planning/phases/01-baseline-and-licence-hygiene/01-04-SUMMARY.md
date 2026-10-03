---
phase: 01-baseline-and-licence-hygiene
plan: 04
subsystem: tests
tags: [playwright, fonts, sign-off]
requires: [01-03]
provides:
  - "Smoke test asserts Geist and Geist Mono FontFace entries load, both woff2 return 200, and no .otf/.ttf is requested"
  - "Koussay's signed before/after type review"
affects: [01-06]
key-files:
  modified: [tests/smoke.spec.mjs]
key-decisions:
  - "Tracking kept at textTracking -0.02 em and nameTracking -0.02 em (signed)"
  - "Booking weekday letters in Geist Mono accepted as part of the sign-off"
requirements-completed: [HYG-01, HYG-02, TEST-01]
completed: 2026-10-03
---

# Phase 1 Plan 04: Font assertions and sign-off Summary

The smoke test now proves the new faces actually load, and Koussay signed the Geist type from before/after screenshots.

## Commit

- 6a3ae47: `test: assert Geist faces load and no otf/ttf is requested`. Not pushed.

## Verification (exit codes)

- `npm run format:check` exit 0, `npm run lint` exit 0.
- `npm test` exit 0, 6 passed (desktop 3, phone 3), 7.2 min.
- Fault proof: Geist Mono `src` pointed at a missing file made `npx playwright test -g home --project=desktop` fail (`woff2[GeistMono]` not 200); file restored, `git diff HEAD -- app components` empty.
- `.screens/after/*-fonts.json`: Geist (100 900) and Geist Mono (100 900) `loaded`; no Satoshi or PP Neue Montreal entry.
- `tests/guards.mjs` unchanged; no interaction calls added.

## Sign-off (checkpoint T-01-12)

- Asked in the control session's chat through the question form "Sign the Geist type?" with options Approved / Tighter tracking / Looser tracking.
- Koussay's own reply: **"Approved"** — recorded 2026-10-03 22:38 +04 (clock).
- Final values: `textFont` Geist 300, `textTracking` -0.02 em; `nameFont` Geist 500, `nameTracking` -0.02 em; `idxFont` Geist Mono 400; booking `.calendarWeekdays` Geist Mono.

## Not verified

- Safari canvas weight selection for the variable font (screenshots are headless Chromium only).
- Desktop meta-rest and meta-morph "after" frames needed one re-run with `-g meta` under Mac load average ~29; both passed on re-run.

## Deviations

- The executor declined to accept the approval relayed by the orchestrator (correct per T-01-12); the orchestrator, which is the session where Koussay answered, closed the plan with his verbatim answer.
