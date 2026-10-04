---
phase: 01-baseline-and-licence-hygiene
verified: 2026-10-03T20:51:25Z
status: passed
score: 5/5 roadmap success criteria verified (26/26 plan truths, 7/7 requirements, 25/25 decisions)
overrides_applied: 0
---

# Phase 1: Baseline and licence hygiene Verification Report

**Phase Goal:** The repo has a formatting baseline and a smoke test that has already passed once, and nothing in the tree or served to visitors breaches a font or code licence.
**Verified:** 2026-10-03T20:51:25Z (2026-10-04 00:51 +04)
**Status:** passed
**Re-verification:** No, initial verification

Mode note: ROADMAP marks this phase `mode: mvp`, but the goal is not a User Story (`user-story.validate` returns `valid: false`). Verified with the standard goal-backward method against the five roadmap success criteria, as the orchestrator asked. The roadmap mode tag should be corrected or the goal rewritten; it does not change the result below.

## Goal Achievement

### Observable Truths (roadmap success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | First commit of the phase is formatting-only, its SHA in `.git-blame-ignore-revs`, before any functional change or worktree branch; tree passes `prettier --check`, lint, build | VERIFIED | `a663b2c` is the first commit after the phase-start docs commits (`14ba38b`). Independent espree re-run: 17 changed JS files, 17 AST-equal, 0 diff. Non-JS changes are `.prettierignore`, `package.json` (format scripts, `prettier` 3.9.9 exact), lockfile. Full SHA `a663b2c8ed11cb18ca26f636553032df86e65402` in `.git-blame-ignore-revs` (added by `6cc57bf`). Remote branches (`cursor/*`, `vercel/*`) date from 2026-09-04/05, before the phase; `git worktree list` shows only main. Run now: `format:check` 0, `lint` 0, `build` 0. |
| 2 | `npm test` runs Playwright against `next build` output, loads `/` and project pages, passes, fails on console error other than Speed Insights 404, fails when canvas missing; green before the font swap | VERIFIED | `playwright.config.mjs`: webServer `npm run build && npx next start -p 3100`, `reuseExistingServer: false`, SwiftShader flag, desktop 1512 + phone 390 touch. `tests/smoke.spec.mjs`: console errors collected with one exemption (`Failed to load resource` at `/_vercel/speed-insights/script.js`), `pageerror` collected, `.ring-stage canvas` `toHaveCount(1)` plus live WebGL2 context, every sitemap `/project/*`, `/booking` first step. Run now on HEAD: 6 passed (5.6 min). Run now on the pre-swap tree `41a27ce` (exported to a temp dir, old .otf/.ttf present): 6 passed (6.5 min). Commit order: `f00dc93` test before `bb4a094` font swap. Fault-injection proofs are from 01-02-SUMMARY (not re-run; code reading confirms the assertions would fail). |
| 3 | Cold load renders heading, card names, index, meta morph in Geist (woff2 + OFL); no `.otf`/`.ttf` in `git ls-files`; every family string in `params.js`, `gui.js`, `globals.css` matches a `@font-face`; Koussay signs before/after screenshots | VERIFIED | `git ls-files` has no `.otf`/`.ttf`. `public/fonts/` has both woff2 (SHA-256 match the plan's v1.7.2 hashes) and `OFL.txt` (Geist copyright line present). `globals.css` has exactly two `@font-face` blocks, `"Geist"` and `"Geist Mono"`, weight 100 900. Every family string in `params.js` (textFont/nameFont `"Geist"`, idxFont `"Geist Mono"`), `gui.js` dropdown, `globals.css`, both CSS modules and `Carousel.jsx` is Geist or Geist Mono. No `next/font`. Smoke test asserts the preload link, both woff2 200, both FontFace entries `loaded`, no Satoshi/PP Neue Montreal face, no .otf/.ttf request; it passed now. `.screens/before` and `.screens/after` hold 12 PNG + fonts.json each; after fonts.json lists only Geist and Geist Mono `loaded`. Koussay's "Approved" at 2026-10-03 22:38 +04 in the control session's question form (01-04-SUMMARY) is the sign-off. |
| 4 | LICENSE keeps the Yousuf Soomro MIT block and simplex notice word for word; README credits upstream, says removed assets remain in git history, no Satoshi/PP Neue Montreal bundle claim, Quick start lists env vars in use | VERIFIED | `diff` against the pre-GSD LICENSE (`50ce3c4`) and pre-swap (`41a27ce`): only change in the MIT block is the added `Copyright (c) 2026 Koussay Zayani` line above Yousuf's; simplex block unchanged; `public/` notes now describe Geist/OFL only. README: Credits links `github.com/Yousuf-developer/Viscose-carousel` and BREAKDOWN.md; "Files removed from the tree, including earlier fonts and placeholder art, remain in this repository's git history"; no Satoshi or Montreal string; env table covers every `.env.example` key (commented ones included) and every `process.env` name read in app code. |
| 5 | `TwoPlaneMorph.jsx`, root `shader`, `scripts/seed-notion-projects.mjs`, dead `lib/env.js` accessors gone; `.agents/skills/` gitignored, `skills-lock.json` kept | VERIFIED | All three files absent. `lib/env.js` has no `higgsfieldKeyId`, `higgsfieldKeySecret`, `r2PublicBase`, `isHiggsfieldConfigured`, `isR2Configured`; no references remain in app/lib/components/scripts. `git ls-files .agents` = 0; `.gitignore:57 /.agents/skills/` (confirmed by `git check-ignore -v`); skills still on disk; `skills-lock.json` tracked. |

**Score:** 5/5 roadmap truths verified. All 26 plan-frontmatter truths across 01-01..01-06 were checked against the same evidence and hold.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.prettierignore` | excludes `.planning/` etc. | VERIFIED | contains `.planning/`, `CLAUDE.md`, `.agents/`, test output |
| `.git-blame-ignore-revs` | baseline SHA | VERIFIED | full 40-char SHA of `style: prettier baseline` |
| `package.json` | format, format:check, test, screens; prettier 3.9.9, @playwright/test 1.63.0 exact | VERIFIED | all present |
| `playwright.config.mjs` | two projects, port 3100, SwiftShader | VERIFIED | plus blank booking/mail env and a production-host refusal (review fix WR-04) |
| `playwright.screens.config.mjs` | separate screenshot config | VERIFIED | screens spec ignored by `npm test` (`testIgnore`) |
| `tests/guards.mjs` | booking abort guard | VERIFIED | context-wide route on pathname `/api/book` or `/api/book/*`, awaited |
| `tests/smoke.spec.mjs` | home, every project, booking + font assertions | VERIFIED | passed now |
| `tests/screens.spec.mjs` | before/after series | VERIFIED | outputs present under `.screens/` (gitignored) |
| `public/fonts/Geist-Variable.woff2`, `GeistMono-Variable.woff2`, `OFL.txt` | official OFL files | VERIFIED | hashes match plan |
| `app/globals.css` | two @font-face blocks | VERIFIED | |
| `components/ring/params.js` | Geist 300 heading, Geist 500 names, Geist Mono index, nameTracking | VERIFIED | textTracking -0.02, nameTracking -0.02 |
| `components/ring/tag.js` | arrow drawn in code | VERIFIED | three strokes from the SVG geometry; no Image/load |
| `LICENSE`, `README.md`, `BREAKDOWN.md`, `AGENTS.md` | honest authorship and font facts | VERIFIED | BREAKDOWN: +5 lines header, 0 deletions |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `params.js` textFont/nameFont/idxFont | `globals.css` @font-face | literal family names | WIRED |
| `Carousel.jsx` startEntry | `document.fonts.load` | Promise.all of 4 cuts from live params, 3 s fallback, tag redraw if fallback won | WIRED (lines ~1656-1679) |
| `gui.js` nameTracking | `styleMeta` | `onMeta("nameTracking", ...)` | WIRED; `meta.js` applies it as letterSpacing on the name span |
| `gui.js` textTracking | `rebuildText` | `.onChange(rebuildText)`; `splitText.js:41` reads it | WIRED |
| `app/layout.js` | `/fonts/Geist-Variable.woff2` | React `preload` | WIRED; asserted by smoke test |
| `package.json test` | `playwright.config.mjs` | `playwright test` | WIRED |
| smoke spec | `/sitemap.xml` | `<loc>` filter `/project/` | WIRED (18 slugs on this checkout) |
| `.git-blame-ignore-revs` | baseline commit | full SHA | WIRED (local git config needed per clone; noted in 01-01-SUMMARY) |
| README Credits | Viscose-carousel, BREAKDOWN.md | markdown links | WIRED |

### Data-Flow Trace (Level 4)

Not applicable beyond the font path: the font data flow (woff2 -> @font-face -> FontFace status loaded -> canvas/DOM) is proven at runtime by the smoke test's FontFace and response assertions, which passed.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Formatting gate | `npm run format:check` | "All matched files use Prettier code style!", exit 0 | PASS |
| Lint gate | `npm run lint` | exit 0 | PASS |
| Build gate | `npm run build` | exit 0, route table printed | PASS |
| Smoke test on HEAD (88ed1a9) | `npm test` | 6 passed (5.6 min), no retries shown; port 3100 empty after | PASS |
| Smoke test on pre-swap tree (41a27ce) | `npm test` in a temp export, no `.env.local` | 6 passed (6.5 min); port 3100 empty after; temp dir removed | PASS |
| Baseline is formatting-only | espree AST compare of `a663b2c^` vs `a663b2c` | `{changed: 17, eq: 17, diff: []}` | PASS |

### Probe Execution

No probes declared; no `scripts/*/tests/probe-*.sh` in the repo. SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| HYG-05 | 01-01, 01-06 | Formatting-only commit first; tree passes prettier, lint, build at phase end | SATISFIED | Truth 1 |
| TEST-01 | 01-02, 01-04 | `npm test` Playwright smoke test against build output with error and canvas rules | SATISFIED | Truth 2 |
| HYG-01 | 01-03, 01-04 | Geist for every face, .otf/.ttf gone, woff2 with OFL | SATISFIED | Truth 3 |
| HYG-02 | 01-03, 01-04 | Family strings match @font-face; heading, names, index, meta morph re-checked | SATISFIED | Truth 3, Koussay's sign-off |
| HYG-03 | 01-06 | LICENSE notices word for word; README upstream line and git-history statement | SATISFIED | Truth 4 |
| HYG-04 | 01-06 | README, LICENSE, AGENTS.md make no Satoshi/Montreal bundle claim; Quick start env vars | SATISFIED | Truth 4; AGENTS.md "Every face is Geist or Geist Mono" |
| HYG-06 | 01-05 | Dead files and accessors removed; `.agents/skills/` ignored, lock kept | SATISFIED | Truth 5 |

All seven IDs are claimed by a plan. REQUIREMENTS.md maps no other ID to Phase 1. No orphans.

### CONTEXT decisions D-01..D-25

| Decision | Honoured | Evidence |
|----------|----------|----------|
| D-01 Geist from `public/`, official OFL woff2 + licence | Yes | `public/fonts/*`, hashes, OFL.txt |
| D-02 variable woff2 | Yes | `*-Variable.woff2`, `font-weight: 100 900` |
| D-03 heading Geist Light 300 | Yes | `textFont "Geist"`, `textWeight 300` |
| D-04 digits in Geist Mono | Yes | `idxFont "Geist Mono"`, `.ring-loader-count`, hero year, booking weekday/progress labels use Mono |
| D-05 names Geist 500, body Geist 400 | Yes | `nameWeight 500`; page roots `"Geist"` |
| D-06 tracking as params with controls, signed | Yes | textTracking (rebuildText), nameTracking (styleMeta); "Approved" 22:38 +04 |
| D-07 literal names, dropdown lists only real faces, no next/font | Yes | dropdown `["Geist", "Geist Mono"]`; no `next/font` import |
| D-08 old files leave in the same change as woff2 | Yes | `bb4a094` deletes 4 font files and adds 2 woff2 + OFL |
| D-09 Koussay line above Yousuf's, rest word for word | Yes | LICENSE diff |
| D-10 public/ notes match tree, Behance note kept | Yes | LICENSE |
| D-11 BREAKDOWN kept, credit header, body unchanged | Yes | +5/-0 |
| D-12 repo stays public | Yes | `gh repo view` visibility PUBLIC |
| D-13 README rewritten as portfolio README | Yes | live link, stack, local run, env, credits, licence |
| D-14 one upstream credit line | Yes | README Credits |
| D-15 honest Behance line + git-history statement | Yes | README Licence section (three short sentences rather than one line; intent met) |
| D-16 no bundle claim, shortened dev-panel docs | Yes | |
| D-17 build + start on free fixed port 3100 | Yes | config; port empty before and after runs |
| D-18 `/`, every project, `/booking` first step, no submit | Yes | spec + guard |
| D-19 desktop 1512 and phone 390 touch | Yes | config projects |
| D-20 error rule, Speed Insights exemption, canvas rule, SwiftShader | Yes | spec + config |
| D-21 control-session gate, no hook, no CI | Yes | AGENTS.md lines 28-33; no `.husky`, no `.github` |
| D-22 smoke test green before swap | Yes | commit order and re-run on `41a27ce` passed |
| D-23 arrow drawn in code, SVG deleted | Yes | `tag.js`; svg absent |
| D-24 AST proof instead of preview booking | Yes | reproduced astDiff 0 |
| D-25 explicit `document.fonts.load` before canvas measures | Yes | `Carousel.jsx` startEntry gate |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (phase-modified files) | - | TBD / FIXME / XXX | none found | - |
| `.planning/codebase/CONCERNS.md` | 116 | Still says `components/TwoPlaneMorph.jsx` is dead (file is gone) | Info | Stale planning doc; GSD regenerates codebase docs. HYG-07 (Phase 8) owns doc/tree match. |
| `.planning/codebase/STRUCTURE.md` | 40, 65 | Still lists `TwoPlaneMorph.jsx` and root `shader` | Info | Same as above |
| `docs/NEXT-SESSION-PROMPT.md` | 104 | "Do not ... widen PP Neue Montreal usage" | Info | Stale instruction; makes no bundle claim, not a licence breach |
| `tests/screens.spec.mjs` | 55 | Still warms `"PP Neue Montreal"` (review IN-01) | Info | Harmless `.catch`; leftover from the before series |

### Human Verification Required

None that is a success criterion. Koussay's font sign-off is recorded (01-04-SUMMARY, 2026-10-03 22:38 +04).

### Notes (not success criteria)

1. **Live site still serves the old fonts until this phase ships.** Read-only check now: `https://koussay.online/ppneuemontreal-book.otf` 200, `/Satoshi-Regular.otf` 200, `/fonts/Geist-Variable.woff2` 404. `origin/main` is `c557904`; nothing in Phase 1 is pushed. The "served to visitors" part of the goal becomes true at ship. After ship, check: the two old font URLs 404 and `/fonts/Geist-Variable.woff2` 200. Old Vercel deployment URLs are Phase 2 SC5 / HYG-08.
2. Behance placeholder art (`public/1..18.webp`, `404.webp`) is still tracked and served. It is image licensing, not font or code, it is disclosed in LICENSE and README, and Phase 2 SC3 removes it.
3. Not verified: Safari canvas weight selection for the variable font (screenshots are headless Chromium only); WR-01's slow-font path (tag redraw after the 3 s fallback) is not exercised by the smoke test; fresh-clone restore of skills from `skills-lock.json`.
4. Review info items IN-01..IN-06 remain open by design (01-REVIEW-FIX.md).

### Gaps Summary

No gaps. Every roadmap success criterion, plan truth, requirement and context decision is backed by code, git history or a run made during this verification: format, lint and build gates exit 0, and the smoke test passed 6/6 on both HEAD and the pre-swap tree.

---

_Verified: 2026-10-03T20:51:25Z_
_Verifier: Claude (gsd-verifier)_
