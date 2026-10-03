---
phase: 01-baseline-and-licence-hygiene
reviewed: 2026-10-04T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - .gitignore
  - app/booking/page.module.css
  - app/globals.css
  - app/layout.js
  - app/project/[slug]/page.module.css
  - components/Carousel.jsx
  - components/ring/gui.js
  - components/ring/meta.js
  - components/ring/params.js
  - components/ring/tag.js
  - eslint.config.mjs
  - lib/env.js
  - package.json
  - playwright.config.mjs
  - playwright.screens.config.mjs
  - tests/guards.mjs
  - tests/screens.spec.mjs
  - tests/smoke.spec.mjs
findings:
  critical: 0
  warning: 4
  info: 6
  total: 10
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-10-04
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Reviewed `git diff 6222afd..HEAD` for the listed files, reading the full files for context. The deliberate ring designs in AGENTS.md are not reported.

What was checked and holds up:
- **The font gate cannot hang the entry.** `startEntry` returns early on `disposed || tl`. The 3 s `setTimeout` is cleared on dispose. `document.fonts.load` rejects on a failed face or a bad descriptor, and that rejection reaches `.catch(startEntry)`. The gate list `[textWeight,textFont] [tagWeight,textFont] [nameWeight,nameFont] [idxWeight,idxFont]` matches what `tag.js`, `splitText` and `meta.js` use.
- **The gate cannot stall the load counter for longer than the fallback.** The counter's target is `min(loadProg, state.progress)`, so it stays at 001 until `startEntry`, which runs at most 3 s later.
- **The arrow geometry matches the old SVG.** The old path was `M4.343 15.657L15.657 4.343m0 0v9.9m0-9.9h-9.9`, which gives the same points as the new code. With round caps it stays inside the 20-unit box at every DPR: the texture uses `min(dpr,2)*2`, so 2 or 4, and `Math.ceil` handles fractional sizes.
- **The `nameTracking` lead and trail swap is correct.** Letter spacing follows whichever element carries the big face.
- **The removed `lib/env.js` accessors have no callers left.** `scripts/` has its own `isR2Configured(config)`.
- **No env values or secrets are logged or committed.**
- **`isBookingUrl` covers all three client call sites** (`/api/book`, `/api/book/availability`, `/api/book/draft` in `components/book/BookFlow.jsx`).

There are no blockers. The main items:
1. A regression in the tag: it now keeps the fallback font for good when the fallback timer fires first.
2. The likely root cause of the flaky counter assertion under load.
3. The booking guard is weaker than it looks: the route is not awaited, it only covers the page, and the server keeps live booking credentials.

## Warnings

### WR-01: The cursor tag keeps the fallback font for good when the 3 s fallback wins

**File:** `components/Carousel.jsx:1632-1673` (and the removed `tag.load` block, previously at about line 1633)
**Issue:** Before this phase, `tag.load(() => tag.build())` rebuilt the tag texture when the arrow SVG arrived. That rebuild often happened after the fonts had loaded, so it hid any early rasterisation. That second build is gone. Now the tag is built only:
- at line 1632, before any font is requested, and
- inside `startEntry`.

When the fonts take longer than 3 s (cold cache, slow network, throttled phone), `fontFallback` calls `startEntry` first. That sets `tl`, and the later font promise then does nothing (`if (disposed || tl) return`). The "View" tag stays drawn in `ui-sans-serif` for the life of the ring.

The heading has the same problem, and the comment explains why: a timeline rebuild would restart the entry. That reason does not apply to the tag. `tag.build()` only swaps `uniforms.uTagTex.value` and touches no timeline.

**Fix:** Rebuild the tag whenever the faces actually land, independent of the entry:
```js
Promise.all(cuts.map(/* ... */))
  .then(() => {
    if (disposed) return;
    if (tl) tag.build(); // fallback already started the entry; re-rasterise the tag only
    startEntry();
  })
  .catch(startEntry);
```
The line-1632 `tag.build()` and `styleMeta()` calls can also go, because `startEntry` repeats both.

### WR-02: The smoke test's "100" assertion depends on GSAP time, which lag smoothing throttles under load (likely cause of the 94/100 failure)

**File:** `tests/smoke.spec.mjs:49-51`, `components/Carousel.jsx:891-893, 1524-1528`
**Issue:** The counter shows `min(loadProg, state.progress)`. `state.progress` is a 1.2 s `power2.out` tween on the entry timeline. GSAP's default `lagSmoothing(500, 33)` is active (nothing in the repo changes it). When a frame takes more than 500 ms, which happens with SwiftShader at a load average of about 50, GSAP advances the timeline by only 33 ms for that frame.

The numbers fit the failure:
- With `power2.out`, a reading of 94 means the tween is about 0.75 of the way through (about 0.9 s of timeline time).
- Reaching a displayed 100 needs `shown >= 0.995`, which is about 1.12 s of timeline time.
- That is dozens more frames that each take more than 500 ms.
- Add the up-to-3 s font fallback before the timeline starts at all.

A 45 s wall-clock budget is therefore not a sound bound. `retries: 1` hides the problem rather than fixing it. This is a test-reliability problem, not a product bug: on real hardware the frames are short.

**Fix:** Do not change `lagSmoothing` in the app; it is what stops big jumps after a tab switch. In the test, do one of these:
- Raise the timeout to match the screens config, for example `timeout: 150_000`, and raise the test timeout to match.
- Wait for a signal that does not depend on GSAP time per frame. For example, wait for `[data-loader-count]` to reach "100" *or* for the loader's opacity to reach 0 (`whenReady` → fade), with a generous timeout.

Also add a comment in the test that records the lag-smoothing cause, so nobody "fixes" it by shortening the budget.

### WR-03: The booking guard does not await `page.route` and only covers the page

**File:** `tests/guards.mjs:9-23`
**Issue:**
1. `page.route(...)` returns a promise that is never awaited. Callers then call `page.goto` straight away. In Playwright, route registration is an async round trip (`setNetworkInterceptionPatterns` → CDP `Fetch.enable`), so in principle a very early request can be sent before interception is on. The `request` listener only *records* such a request; it does not block it. If registration rejects (for example, the page closed), the result is an unhandled rejection rather than a test failure.
2. The route is scoped to the page. A booking request from a popup, a second page in the context, or a service worker would bypass it.
3. Calls are de-duplicated by URL, so two POSTs to `/api/book` record as one.

Today no booking request fires on any of the pages under test (availability polling starts only at step 3/4). That keeps this at warning rather than blocker, but the guard exists precisely for the day that changes.

**Fix:**
```js
export async function guardBooking(page) {
  const calls = [];
  await page.context().route(isBookingUrl, (route) => {
    calls.push(route.request().url());
    return route.abort();
  });
  page.context().on("request", (req) => {
    if (isBookingUrl(new URL(req.url()))) calls.push(`seen:${req.url()}`);
  });
  return calls;
}
```
Then `await guardBooking(page)` at every call site (`smoke.spec.mjs:24` via `watch`, and `screens.spec.mjs:89,97,118,127,140,152`).

### WR-04: The test server is built with live booking and mail credentials; the browser guard is the only protection

**File:** `playwright.config.mjs:40-50`
**Issue:** `npm run build && npx next start` loads `.env.local`, so the server under test has real `NOTION_BOOKINGS_DATABASE_ID`, `RESEND_API_KEY` and so on. Only the client-side route abort (WR-03) stops a test from writing a Notion booking and sending two Resend emails. With `BASE_URL` set, the tests run against whatever host it names, including production, and the same single guard applies. Separately, these smoke tests also depend on live Notion: one media timeout adds a "Failed to load resource" console error, and the test fails.

**Fix:** Add defence in depth on the server side, so `/api/book*` returns 503 by its own `isBookingConfigured()` check:
```js
webServer: {
  command: `npm run build && npx next start -p ${PORT}`,
  env: { NOTION_BOOKINGS_DATABASE_ID: "", RESEND_API_KEY: "" },
  // ...
}
```
Check that an empty process env value wins over `.env.local` in `@next/env`. If it does not, use a dedicated `.env.test`, or a sentinel value that `isBookingConfigured()` rejects. Also add a hard refusal of production when `BASE_URL` is set, for example: throw if the host is `koussay.online`.

## Info

### IN-01: The screens spec still loads the removed "PP Neue Montreal" face and pre-warms every face

**File:** `tests/screens.spec.mjs:51-75`
**Issue:**
- `loadAllFaces` requests `'400 1em "PP Neue Montreal"'`. That family no longer exists, so the line is dead after the swap.
- `settledHome` force-loads every `FontFace` at DOMContentLoaded and then reloads. That means the screenshots never show the real cold-load path, including the fallback-font case in WR-01.

**Fix:** Drop the PP Neue Montreal line now that the "before" baseline is captured. Consider one shot with no pre-warm, so the shipped gate itself is what gets checked.

### IN-02: Geist Mono is not preloaded, but the first thing painted (the loader counter) uses it

**File:** `app/layout.js:73-77`, `app/globals.css:124-136`
**Issue:** Only `Geist-Variable.woff2` is preloaded. `.ring-loader-count` and `.ring-loader-time` are set in Geist Mono and are visible from the first paint. With `font-display: swap` the counter visibly changes face partway through. The font gate requests Geist Mono anyway (`idxFont`), so a preload costs nothing extra.

**Fix:** Add a second `preload("/fonts/GeistMono-Variable.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" })`, and update the smoke test's preload count.

### IN-03: Fallback stacks for the mono family fall back to a sans face

**File:** `app/globals.css:125,133`, `app/booking/page.module.css:549,770,955`, `app/project/[slug]/page.module.css:115,273`, `components/ring/meta.js:167`
**Issue:** `"Geist Mono", ui-sans-serif, system-ui, sans-serif`: if the woff2 fails to load, the numbers render in a proportional sans.
**Fix:** Use `"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace`.

### IN-04: The dev panel's family switch bypasses the font gate

**File:** `components/ring/gui.js:142`
**Issue:** "Geist Mono" is offered as `textFont`. The gate only loaded the cuts the defaults asked for, at mount, so the first `rebuildText` after switching draws in the fallback font. This is dev only.
**Fix:** In `rebuildText`, `await document.fonts.load(\`${params.textWeight} 1em "${params.textFont}"\`)` before `splitText.build()`.

### IN-05: The per-slug error lists can pick up late events from the previous page

**File:** `tests/smoke.spec.mjs:88-103`
**Issue:** `errors.length = 0` runs before `goto`. A console error or `pageerror` from the previous slug that is delivered during navigation is then blamed on the next slug. The fixed `waitForTimeout(500)` and `waitForTimeout(1_000)` sleeps are also timing guesses.
**Fix:** Clear the lists after `page.goto` resolves, or tag each entry with `page.url()` at capture time and filter by slug.

### IN-06: `npm test` needs a Chromium download that is not documented

**File:** `package.json:12-13`, `README.md:83`
**Issue:** `@playwright/test` 1.63.0 is pinned, but a fresh clone fails until `npx playwright install chromium` has been run.
**Fix:** Add that step to the README test row or AGENTS.md, or add a `pretest` script.

---

_Reviewed: 2026-10-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
