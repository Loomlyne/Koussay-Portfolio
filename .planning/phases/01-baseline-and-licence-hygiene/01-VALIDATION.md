---
phase: 1
slug: baseline-and-licence-hygiene
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-03
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: 01-RESEARCH.md § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `@playwright/test` 1.63.0 (exact pin, new this phase) |
| **Config file** | `playwright.config.mjs` (Wave 0) |
| **Quick run command** | `npm run format:check && npm run lint` |
| **Full suite command** | `npm run format:check && npm run lint && npm run build && npm test` |
| **Estimated runtime** | ~180 seconds (build plus two Playwright projects) |

---

## Sampling Rate

- **After every task commit:** `npm run format:check && npm run lint`; plus the relevant `npx playwright test -g …` when the task touches pages or fonts
- **After every plan wave:** full suite
- **Before `/gsd-verify-work`:** full suite green, then Koussay's before/after screenshot sign-off
- **Max feedback latency:** 180 seconds

---

## Per-Requirement Verification Map

Task IDs are filled in by the planner; each task's `<acceptance_criteria>` must cite the command below for its requirement.

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| HYG-05 | Baseline commit is formatting-only | static | espree AST comparison over the baseline commit's changed files → `astDiff: 0` (D-24) | ❌ one-off | ⬜ pending |
| HYG-05 | Tree formatted, lints, builds | static | `npm run format:check && npm run lint && npm run build` | ❌ W0 scripts | ⬜ pending |
| HYG-05 | Baseline SHA recorded | static | `.git-blame-ignore-revs` contains the baseline commit SHA | ❌ W0 | ⬜ pending |
| TEST-01 | Home: canvas present, WebGL created, no console errors | e2e | `npx playwright test -g home` | ❌ W0 | ⬜ pending |
| TEST-01 | Every sitemap project page clean, desktop and phone | e2e | `npx playwright test -g "every project"` | ❌ W0 | ⬜ pending |
| TEST-01 | Booking first step renders, no `/api/book` request | e2e | `npx playwright test -g booking` | ❌ W0 | ⬜ pending |
| TEST-01 | Test fails when it should | manual-once | inject `console.error` / remove canvas → `npm test` fails → revert | — | ⬜ pending |
| HYG-01 | No `.otf`/`.ttf` tracked; woff2 + OFL present | static | `test -z "$(git ls-files '*.otf' '*.ttf')" && test -f public/fonts/OFL.txt` | — | ⬜ pending |
| HYG-01 | Geist and Geist Mono loaded on cold load | e2e | home test asserts `document.fonts.check` for both families and no `.otf`/`.ttf` response | ❌ swap task | ⬜ pending |
| HYG-02 | Every family string has a `@font-face` | static | only `"Geist"` and `"Geist Mono"` found in `app` and `components`; two `@font-face` blocks | — | ⬜ pending |
| HYG-03 | Upstream notices intact, credit present | static | LICENSE diff removes no line of the MIT or simplex blocks; Yousuf line count = 1; README and BREAKDOWN.md link Viscose-carousel | — | ⬜ pending |
| HYG-04 | No Satoshi / PP Neue Montreal bundling claims | static | grep README, LICENSE, AGENTS.md for satoshi / neue montreal → history mention only | — | ⬜ pending |
| HYG-06 | Dead files gone, skills untracked | static | files absent; dead accessors absent from `lib/env.js`; `.agents/skills` untracked; `skills-lock.json` tracked | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `playwright.config.mjs`, `tests/smoke.spec.mjs` cover TEST-01
- [ ] `package.json` scripts `test`, `format`, `format:check`; devDependencies `prettier@3.9.9`, `@playwright/test@1.63.0` exact
- [ ] `.prettierignore`, `.git-blame-ignore-revs`
- [ ] `.gitignore` and `eslint.config.mjs` ignore `playwright-report/`, `test-results/`
- [ ] Browser available: `npx playwright install --only-shell chromium` (cached on this Mac)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Heading, names, index and meta morph look right in Geist | HYG-02 | Visual judgement of type | Before/after screenshots at 1512 and 390 wide, signed by Koussay |
| Smoke test fails on a real fault | TEST-01 | Proves the test is not vacuous | Inject a fault once, confirm red, revert |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
