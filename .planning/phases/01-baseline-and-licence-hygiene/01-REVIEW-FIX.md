---
phase: 01-baseline-and-licence-hygiene
fixed_at: 2026-10-04T00:40:00Z
review_path: .planning/phases/01-baseline-and-licence-hygiene/01-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 01: Code Review Fix Report

**Source review:** .planning/phases/01-baseline-and-licence-hygiene/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (WR-01..WR-04; IN-01..IN-06 left unfixed by instruction)
- Fixed: 4
- Skipped: 0

Fixes were made on `main` in the main checkout (per the task's hard rules), not in a worktree.

## Fixed Issues

### WR-01: The cursor tag keeps the fallback font for good when the 3 s fallback wins

**Files modified:** `components/Carousel.jsx`
**Commit:** 534c207
**Applied fix:** The font promise now redraws the tag alone (`tag.build()`) when the entry already started, then calls `startEntry()`. The 3 s fallback and the timeline are untouched. The early `tag.build()`/`styleMeta()` calls were kept. Fixed: requires human verification (timing logic; slow-font path not exercised by the smoke test).

### WR-02: Smoke test "100" assertion depends on GSAP time under lag smoothing

**Files modified:** `tests/smoke.spec.mjs`
**Commit:** 6b5eb78
**Applied fix:** Test-only. Counter wait raised from 45 s to 150 s, test timeout set to 240 s, with a comment recording the lag-smoothing cause. App unchanged.

### WR-03: Booking guard does not await `page.route` and only covers the page

**Files modified:** `tests/guards.mjs`, `tests/smoke.spec.mjs`, `tests/screens.spec.mjs`
**Commit:** f924e76
**Applied fix:** `guardBooking` is async, routes on the browser context, awaits registration, and records every request (no URL de-dup). `watch` in smoke is async; all call sites await.

### WR-04: Test server is built with live booking and mail credentials

**Files modified:** `playwright.config.mjs`
**Commit:** d752240
**Applied fix:** The webServer env blanks `NOTION_BOOKINGS_DATABASE_ID`, `NOTION_CALENDAR_DATABASE_ID`, `RESEND_API_KEY`, `RESEND_FROM`, `BOOKING_NOTIFY_EMAIL`. Verified in `node_modules/@next/env/dist/index.js`: file values apply only when `typeof initialEnv[key] === "undefined"`, so an empty string (defined) wins over `.env.local`; `replaceProcessEnv` re-sets empties after deleting them. `.env.local` was not read. The config now throws when `BASE_URL` host is `koussay.online` or a subdomain (confirmed: it throws on load). `playwright.screens.config.mjs` inherits both. Not verified at runtime: a 503 from `/api/book` against the started server.

## Gates (after all fixes)

- `npm run format:check`: exit 0
- `npm run lint`: exit 0
- `npm run build`: exit 0
- `npm test`: exit 0, 6 passed (5.8 min). Load average at finish: 11.02 11.62 20.60. Port 3100 free afterwards.

---

_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
