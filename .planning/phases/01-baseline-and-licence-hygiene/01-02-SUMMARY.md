---
phase: 01-baseline-and-licence-hygiene
plan: 02
subsystem: testing
tags: [playwright, smoke-test, screenshots, booking-guard]
requires: [01-01]
provides:
  - "npm test: Playwright smoke test against next build + next start on port 3100"
  - "npm run screens: before/after screenshot series for the font sign-off"
  - "tests/guards.mjs booking guard shared by both specs"
affects: [01-03, 01-04, all later phases]
tech-stack:
  added: ["@playwright/test 1.63.0 (exact pin)"]
  patterns: ["two Chromium projects (desktop 1512, phone 390 touch)", "slugs read from /sitemap.xml", "DOM-signal timing for entry screenshots"]
key-files:
  created: [playwright.config.mjs, playwright.screens.config.mjs, tests/guards.mjs, tests/smoke.spec.mjs, tests/screens.spec.mjs]
  modified: [package.json, package-lock.json, .gitignore, eslint.config.mjs]
key-decisions:
  - "Screenshot moments are timed from DOM signals (project column opacity, sr-only live region), not wall clock: the entry runs several times slower when the Mac is loaded"
  - "Project-page test uses one shared page and clears error lists per slug; a per-slug fresh context hung on 'hidden' title under load"
requirements-completed: [TEST-01]
duration: ~3h wall (most of it waiting on a Mac at load average 14-30)
completed: 2026-10-03
---

# Phase 1 Plan 02: Playwright smoke test Summary

`npm test` builds the app, serves it on port 3100, loads `/`, every `/project/<slug>` from the sitemap and `/booking` at 1512 and 390 wide, and goes red on any console error (bar the Speed Insights 404), a missing canvas, a dead WebGL2 context, or any request to `/api/book` or `/api/book/*`.

## Commits

- f00dc93: `test: playwright smoke test` (Tasks 1 and 2)
- 0380ba8: `test: font sign-off screenshot series` (Task 3)

Nothing pushed.

## Verification

- `npm test` exit 0, 6 passed (desktop 3, phone 3), no retries used. The sitemap on this checkout lists 18 project slugs (placeholder set); the project test sets its own timeout from the slug count.
- Guard predicate check exit 0: true for `/api/book`, `/api/book?x=1`, `/api/book/draft`, `/api/book/availability`; false for `/booking`, `/api/booking`, `/api/media/x`.
- Fault proof A: `ring-stage` renamed to `ring-stage-x` -> home test FAILED (`toHaveCount` expected 1, received 0). Restored with `git checkout`.
- Fault proof B: `console.error("smoke-probe")` in the Carousel effect -> home test FAILED with `smoke-probe` in the error list. Restored.
- Guard proof C: bare `fetch("/api/book", { method: "POST" })` injected into the booking test -> request aborted in the browser, booking test FAILED with recorded `http://localhost:3100/api/book`. Probe removed (`grep -c 'method: "POST"' tests/smoke.spec.mjs` prints 0). Nothing reached the server, Notion or Resend.
- `git diff --stat HEAD -- components app lib` empty after restores. Port 3100 empty after every run.
- `npm run format:check` and `npm run lint` exit 0.
- Interaction grep clean on smoke spec and guards; screens spec uses only `mouse.move` and `mouse.wheel` (the meta-morph moment on `/`). Only env key read: `SCREENS_LABEL`. `npx playwright test --list` shows no screens spec. `git ls-files .screens` is 0.
- `npm run screens` exit 0, 12 passed, 12 PNG plus `desktop-fonts.json` and `phone-fonts.json` under `.screens/before/`.

## Font record (before the swap)

Both `desktop-fonts.json` and `phone-fonts.json` are identical, every entry status `loaded`:

```json
[
  { "family": "Satoshi", "weight": "400", "status": "loaded" },
  { "family": "Satoshi", "weight": "500", "status": "loaded" },
  { "family": "Geist", "weight": "400", "status": "loaded" },
  { "family": "PP Neue Montreal", "weight": "400", "status": "loaded" }
]
```

I read `desktop-heading.png` and `phone-heading.png`: "Works '26" is drawn in a neo-grotesque with the ring around it, with PP Neue Montreal warmed and at status `loaded` before the canvas heading was rasterised (warm-up, then reload). I cannot tell PP Neue Montreal from a Helvetica-style system fallback by eye alone; the proof it is not a cold-load fallback is the `loaded` status plus the warm-up and reload, not the glyph shapes.

## Heading timing

Plan asked for a wall-clock delay. I replaced it: wall-clock waits drifted badly (desktop heading was missed or still at the loader at +5 s when the Mac load average was 14-30). Final moments:

- heading: project column (`ul[aria-label="Projects"]`) inline opacity >= 0.6, screenshot at once (the column fades in with the heading, `textStart` in `components/Carousel.jsx`). The screenshot itself takes long enough under load that it lands on the fully drawn heading.
- meta-rest and meta-morph: the sr-only live region is filled by `meta.show()`, which only runs once the ring is interactive; then 1000 ms rest. Morph adds `mouse.move` to centre, `mouse.wheel(0, 120)`, 150 ms.
- Same code runs for the "after" label in Plan 04.

## Deviations from Plan

**1. [Rule 1 - Bug] Project-page test with a fresh context per slug hung on a hidden title**
- Found during: Task 2. Fix: one shared page, error and booking lists cleared per slug, test timeout `60 s + 30 s x slugs`, title wait 25 s.
- Files: tests/smoke.spec.mjs. Commit f00dc93.

**2. [Rule 1 - Bug] Booking guard recorded the same URL twice (route handler plus request listener)**
- Fix: dedupe in the route handler. Files: tests/guards.mjs. Commit f00dc93.

**3. [Rule 1 - Bug] Screenshot heading and rest timing replaced by DOM signals** (see Heading timing). Commit 0380ba8.

**4. [Rule 3 - Blocking] Screenshot order and timeouts**
- A full-page capture made the next page's screenshot fail ("Unable to capture screenshot"), so `booking` runs before `project` in the screens spec. Screens config timeout raised to 300 s and signal waits to 200 s because the entry is several times slower at load average 28.
- Files: tests/screens.spec.mjs, playwright.screens.config.mjs. Commit 0380ba8.

## Notes

- Full `npm test` takes about 7-8 minutes on this Mac when other dev servers are busy (project loop is about 14 s per slug at load 14-30; about 1 s per slug when idle).
- `npx playwright install --only-shell chromium` removed an older unused Chromium build from the Playwright cache; the 1.63.0 build is installed.
- `.planning/` STATE and ROADMAP were updated by the final docs commit.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

Files found: playwright.config.mjs, playwright.screens.config.mjs, tests/guards.mjs, tests/smoke.spec.mjs, tests/screens.spec.mjs, 12 PNGs and 2 fonts.json under `.screens/before/`. Commits f00dc93 and 0380ba8 exist.
