# Phase 1: Baseline and licence hygiene - Research

**Researched:** 2026-10-03
**Domain:** Repo hygiene: Prettier baseline, Playwright smoke test on a WebGL page, self-hosted variable webfonts read by canvas, licence and README text
**Confidence:** HIGH. Most claims were checked in this session with real commands: registry, GitHub API, a headless Chromium run on this Mac, fontTools, and a Prettier dry run plus an AST comparison.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Typefaces
- **D-01:** Every face is Geist, served from the site itself (`public/`), not from R2. Source files are the official OFL releases from the Geist project (`vercel/geist-font`), committed as woff2 with the OFL licence text alongside.
- **D-02:** Use the Geist **variable** woff2 so any weight costs no extra file.
- **D-03:** Intro heading ("Works '26", `textFont`) is **Geist Light 300**, replacing PP Neue Montreal 400.
- **D-04:** Index numbers, years and the load counter (`idxFont` and every place Geist is used for digits today) move to **Geist Mono**, so digits never shift sideways.
- **D-05:** Card names (`nameFont`, today Satoshi 500) become Geist Medium 500; body text on booking and project pages (today Satoshi 400) becomes Geist Regular 400.
- **D-06:** Hierarchy comes from **weight plus tighter letter-spacing** on the heading and card names. Tracking values are params in `components/ring/params.js` with dev-panel controls in `components/ring/gui.js` (repo rule: every new tunable is a param with a control, wired to the right `onChange`). Koussay approves the result through the before/after screenshots already required by the phase's success criteria.
- **D-07:** Font-family names stay literal strings that match `@font-face` blocks (`"Geist"`, `"Geist Mono"`); the `textFont` dropdown in `gui.js` lists only faces that exist. No `next/font` (it renames families and the ring looks fonts up by name).
- **D-08:** `public/ppneuemontreal-book.otf`, `public/Satoshi-Regular.otf`, `public/Satoshi-Medium.otf` and `public/Geist-Regular.ttf` leave the tree in the same change that adds the woff2 files.

#### Authorship and licence
- **D-09:** LICENSE gains `Copyright (c) 2026 Koussay Zayani` on the line **above** the existing `Copyright (c) 2026 Yousuf Soomro`; the MIT text and Yousuf's line stay word for word. The simplex-noise notice (Ashima Arts, Stefan Gustavson) stays word for word.
- **D-10:** LICENSE's `public/` notes are rewritten to match the tree: Geist under OFL 1.1; no Satoshi or PP Neue Montreal claims; the Behance imagery note stays until Phase 2 deletes the files, then goes.
- **D-11:** BREAKDOWN.md is **kept**. It gets a short header crediting Yousuf Soomro as the original author of the ring animation and idea, open-sourced under MIT, on which Koussay built. Body text unchanged.
- **D-12:** The repo stays public.

#### README
- **D-13:** README is rewritten as Koussay's portfolio README: what the site is, live link https://koussay.online, stack, how to run it locally with the env vars actually in use (from `.env.example`), credits, licence notes. Short.
- **D-14:** Credits carry one line: the WebGL ring started from Yousuf Soomro's open-source MIT carousel; he is the original idea and animation author, with a link to BREAKDOWN.md and the upstream repo if one is public.
- **D-15:** The Behance section shrinks to one honest line (placeholder art from other designers, being replaced, still in git history) until Phase 2 removes the files. README states that removed assets remain in git history.
- **D-16:** The dev-panel and interaction docs that remain true can stay in shortened form; nothing in the README may claim Satoshi or PP Neue Montreal is bundled.

#### Smoke test
- **D-17:** `npm test` runs Playwright against `next build` + `next start` on a fixed port that no other local product uses (research suggested 3100; check it is free).
- **D-18:** Pages covered: `/`, **every** `/project/<slug>` in the current live set, and `/booking` (first step renders; no form submit, so nothing reaches Notion or Resend).
- **D-19:** Two runs: desktop (1512 wide, the reference window) and phone (390 wide, touch).
- **D-20:** Fails on any `console.error` or page error except the known Speed Insights 404 off Vercel; fails when the ring `<canvas>` is missing on `/`. Headless Chromium needs SwiftShader for WebGL.
- **D-21:** Runs as one of the control session's gates before every ship, with lint and build. No git hook, no CI in this phase.
- **D-22:** The smoke test lands and passes on the current tree **before** the font swap.

### Claude's Discretion
- Prettier is pinned as a devDependency with a `format` script so the baseline is reproducible; the formatting-only commit's SHA goes into `.git-blame-ignore-revs`.
- How the project slug list for the test is obtained (from the live content source today; it becomes the repo content module in Phase 2).
- Exact tracking values to propose before Koussay's screenshot sign-off.
- Removing `components/TwoPlaneMorph.jsx`, the root `shader` file, `scripts/seed-notion-projects.mjs`, the dead `lib/env.js` Higgsfield accessors; gitignoring `.agents/skills/` while keeping `skills-lock.json` (HYG-06 as written).

### Deferred Ideas (OUT OF SCOPE)
- **Hosting move to Cloudflare Workers**: added to the roadmap as Phase 3.1 on 2026-10-03 with Koussay's sign-off (PLAT-01 promoted to v1). Not Phase 1 work.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HYG-05 | One formatting-only Prettier commit before any functional change; the tree then passes `prettier --check`, lint and build at every phase end | Prettier 3.9.9 pin, `.prettierignore` contents, the measured list of 17 code files, an AST-equivalence proof script (Code Examples §1–2) |
| TEST-01 | `npm test` runs a Playwright smoke test against `next build` output, fails on any console error except the Speed Insights 404, and fails when the canvas is missing | Playwright 1.63.0 config and spec (Code Examples §3–4); the exact Speed Insights console message was verified; the slug list comes from `/sitemap.xml` |
| HYG-01 | Geist replaces PP Neue Montreal and Satoshi for every face; `.otf`/`.ttf` leave the tree; woff2 plus OFL | Exact files, SHA-256 hashes, axis ranges, OFL file (Standard Stack, Code Examples §5) |
| HYG-02 | Every font-family string matches a `@font-face`; heading, card names, index and meta morph re-checked for metric shifts | Full font-string inventory (Pattern 2), the canvas font-load race (Pitfall 1), tracking params (Code Examples §6–7) |
| HYG-03 | LICENSE keeps the upstream MIT and simplex notices word for word; README gains upstream attribution and states that removed assets remain in history | Upstream repo identified: `github.com/Yousuf-developer/Viscose-carousel`, MIT, shared history (Pattern 5) |
| HYG-04 | README, LICENSE and AGENTS.md drop the Satoshi and PP Neue Montreal claims; Quick start lists the env vars that remain | List of stale lines and env-var inventory (Pattern 5) |
| HYG-06 | Dead files removed; `.agents/skills/` gitignored, `skills-lock.json` kept | Import checks done; `.agents/skills/` is **tracked** (102 files) so it needs `git rm -r --cached` (Pitfall 6) |
</phase_requirements>

## Summary

The phase is mostly mechanical, with three non-obvious traps. **First**, the Prettier baseline rewrites four booking files (`lib/book/confirmation.js`, `lib/book/time.js`, `lib/book/validate.js`, `lib/notion/bookings.js`). The cross-phase rule says any change there triggers a preview booking. I ran Prettier 3.9.9 on a copy of the tree and compared each changed file's AST with `espree`. All 17 changed code files are AST-identical. That comparison is the proof that the commit is formatting-only, and the planner can cite it rather than add a booking run. **Second**, `document.fonts.ready` does **not** wait for a face that only canvas uses. I reproduced this in headless Chromium: a canvas-only face measured in the fallback font after `ready` resolved. Today PP Neue Montreal is canvas-only, so this is a live cold-load bug. After the swap Geist is also used by the DOM, which mostly hides the race. The planner should still add explicit `document.fonts.load()` calls before `splitText.build()` and `tag.build()`. **Third**, `.agents/skills/` is tracked in git (102 files). A `.gitignore` line alone does nothing, so `git rm -r --cached` is needed.

Geist: the npm package `geist@1.7.2` and the GitHub release `v1.7.2` (2026-06-01) ship **byte-identical** variable woff2 files. `Geist-Variable.woff2` (69,652 B) is the same file as the release's `Geist[wght].woff2`, and `GeistMono-Variable.woff2` (71,368 B) the same as `GeistMono[wght].woff2`. Both have a `wght` axis of 100–900. I measured canvas text at five weights in headless Chromium, and `ctx.font = "300 41px \"Geist\""` picks the correct instance. Canvas `letterSpacing` exists in Chromium, but it is not needed: the heading already applies tracking by hand (`textTracking`, in em, wired to `rebuildText`), and the card names are DOM spans where CSS `letter-spacing` works. Only one new param is needed (`nameTracking`).

Playwright 1.63.0 (2026-09-04) is current. Its headless shell (Chrome for Testing 153, revision 1243) is already cached on this Mac. On macOS arm64 it gets WebGL2 through SwiftShader even without a flag. Keep `--enable-unsafe-swiftshader` anyway for GPU-less runners. Port 3100 is free and no other repo under `~/Developer` uses it. The Speed Insights miss shows up as exactly one console error: text `Failed to load resource: the server responded with a status of 404 (Not Found)`, with `location().url` ending `/_vercel/speed-insights/script.js`. Allowlist that pair and nothing else. Read the slugs from the server's own `/sitemap.xml` at test time, so the test follows whatever the build serves: 8 live projects in the main checkout, where `.env.local` exists, and 18 placeholders in a worktree without it.

**Primary recommendation:** Order the work as six commits:
1. Prettier baseline with its tooling, AST-checked.
2. `.git-blame-ignore-revs`.
3. Playwright smoke test, green on the current tree, plus "before" screenshots.
4. Geist swap: files, `@font-face`, every string, `fonts.load`, tracking params.
5. LICENSE, README, BREAKDOWN and AGENTS.md text.
6. Dead files and `.agents/skills/` untracked.

Run `npm test` again after commits 4 and 6.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Font files (woff2 + OFL) | CDN / Static (`public/fonts/`) | — | Served as static assets by Vercel; D-01 says not R2 |
| `@font-face` declarations, DOM font-family | Browser / Client (`app/globals.css`, CSS Modules) | — | Pure CSS |
| Canvas text (heading, tag) font loading | Browser / Client (`components/Carousel.jsx` `startEntry`, `ring/splitText.js`, `ring/tag.js`) | — | Canvas rasterises after the face is loaded; needs explicit `document.fonts.load` |
| Meta lockup font and tracking | Browser / Client (`ring/meta.js` `style()`) | — | Inline styles on DOM spans, driven by params |
| Font preload hint | Frontend Server (SSR) (`app/layout.js`) | — | `<link rel=preload>` emitted in server HTML |
| Smoke test | Test tooling (Playwright, Node) against `next start` | — | Runs outside the app; reads `/sitemap.xml` |
| Formatting baseline | Tooling (Prettier) | — | No runtime effect; proven by AST equality |
| Licence and README text | Repo docs | — | No runtime effect |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `prettier` | **3.9.9** (exact pin, published 2026-09-23) | Formatting baseline and `format:check` gate | Already the de facto formatter here (CONVENTIONS: Prettier defaults, no config). `[VERIFIED: npm registry]` |
| `@playwright/test` | **1.63.0** (published 2026-09-04; `latest` dist-tag) | Smoke test | Next 16's bundled testing guide covers it (`node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md`). `[VERIFIED: npm registry]` |
| Geist + Geist Mono variable woff2 | font 1.800 (Sans) / 1.700 (Mono), from npm `geist@1.7.2` = GitHub release `v1.7.2` | Every face on the site | OFL 1.1, official woff2, one file per family. `[VERIFIED: npm pack + gh release download, SHA-256 identical]` |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Chromium headless shell | Playwright revision 1243 (Chrome for Testing 153.0.8010.12) | Browser for the smoke test | `npx playwright install --only-shell chromium`. Already cached at `~/Library/Caches/ms-playwright/chromium_headless_shell-1243`. `[VERIFIED: playwright install --dry-run]` |
| `espree` | 10.4.0 (already in `node_modules` via ESLint) | AST-equivalence proof for the Prettier commit | One-off check, no new dependency. `[VERIFIED: node_modules]` |
| `fontTools` (Python) | present on this Mac | Optional: read axis ranges from the woff2 | Verification only |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Copy woff2 from `npm pack geist@1.7.2` | `gh release download v1.7.2 -R vercel/geist-font` (8.2 MB zip) | Same bytes; the release zip has `[wght]` brackets in its file names (awkward in URLs) but carries `OFL.txt` with the copyright line that matches the font's own `name` table |
| `geist` as a dependency | Nothing installed: one-off `npm pack` | The package exists to support `next/font`, which D-07 rules out. Do **not** add it to `package.json` |
| `next/font/local` | — | Ruled out by D-07 (renames families) |

**Installation:**
```bash
npm install -D --save-exact prettier@3.9.9 @playwright/test@1.63.0
npx playwright install --only-shell chromium
# Fonts: one-off copy, nothing stays installed
cd "$(mktemp -d)" && npm pack geist@1.7.2 && tar -xzf geist-1.7.2.tgz
cp package/dist/fonts/geist-sans/Geist-Variable.woff2      <repo>/public/fonts/
cp package/dist/fonts/geist-mono/GeistMono-Variable.woff2  <repo>/public/fonts/
curl -fsSL https://raw.githubusercontent.com/vercel/geist-font/v1.7.2/OFL.txt -o <repo>/public/fonts/OFL.txt
shasum -a 256 <repo>/public/fonts/*.woff2
#  a369fcf5628ea2aa4e1b9e2ec6a5b3624e365bda588e1f0f2f12b564f728fbb8  Geist-Variable.woff2
#  fba8f577f38a2bbcbe818efa6348dd58f36303a10b8737c42fefad275be563ab  GeistMono-Variable.woff2
```
The OFL raw URL at tag `v1.7.2` is `[ASSUMED]` to resolve. I verified that `OFL.txt` at repo HEAD is identical to the one inside the v1.7.2 release zip. If the tag path 404s, use `https://raw.githubusercontent.com/vercel/geist-font/main/OFL.txt`.

**Version verification (2026-10-03):** `npm view prettier version` → 3.9.9; `npm view @playwright/test version` → 1.63.0 (1.64 is only alpha); `npm view geist version` → 1.7.2 (repository `vercel/geist-font`, licence "SIL OPEN FONT LICENSE").

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| prettier | npm | ~9 yrs | very high (not measured) | github.com/prettier/prettier | [OK] | Approved (devDependency) |
| @playwright/test | npm | ~6 yrs | very high (not measured) | github.com/microsoft/playwright | [OK] | Approved (devDependency) |
| geist | npm | ~2 yrs | not measured | github.com/vercel/geist-font (confirmed via `npm view repository.url` and GitHub API) | [OK] | Approved as a **one-off `npm pack` source only**, not a dependency |

No package has a `postinstall` or `install` script (`npm view <pkg> scripts.postinstall` was empty for all three).
**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

**Incident to know:** `slopcheck install <pkgs>` really runs `npm install <pkgs>` in the current directory. It added all three packages to this repo's `dependencies`. I reverted `package.json` and `package-lock.json` with `git checkout`, ran `npm ci`, and confirmed `git status` is clean and `npm ls --depth=0` matches the lockfile. Future research runs should call slopcheck from an empty temp directory.

## Architecture Patterns

### System Architecture Diagram

```
                     npm test
                        │
                        ▼
        Playwright webServer: npm run build && next start -p 3100
                        │                     (reads .env.local if present →
                        │                      Notion live set; else 18 placeholders)
                        ▼
   ┌──────────── for project in [desktop-1512, phone-390-touch] ────────────┐
   │                                                                         │
   │  GET /sitemap.xml ──► parse <loc> ──► keep pathname /project/* ──► slugs │
   │                                                                         │
   │  page listeners: console(error) + pageerror ──► filter allowlist ──► errors[]
   │       allowlist = { text "Failed to load resource…404", url */_vercel/speed-insights/script.js }
   │  route guard: /api/book/** (POST) ──► abort + record (booking must never be hit)
   │                                                                         │
   │  "/"        ─► .ring-stage canvas count==1 ─► getContext('webgl2') alive │
   │             ─► [data-loader-count] == "100" (≤45 s SwiftShader)          │
   │  each slug  ─► status 200 ─► <h1> visible ─► settle                      │
   │  "/booking" ─► first step visible (no click)                             │
   │                                                                         │
   │  errors[] must be empty after every page                                │
   └─────────────────────────────────────────────────────────────────────────┘
                        │
                        ▼
        Playwright stops the server it started (port 3100 only)
```

Font path after the swap:
```
layout.js <link rel=preload Geist-Variable.woff2>
      │
globals.css @font-face "Geist" (100 900) / "Geist Mono" (100 900)
      │
DOM spans (meta, list, loader, pages) ─► CSS font-family "Geist" / "Geist Mono"
Carousel startEntry ─► await document.fonts.load('300 1em "Geist"', '500 1em "Geist"', '400 1em "Geist Mono"')
      └─► splitText.build() (canvas, textWeight 300, manual tracking) ─► tag.build() (canvas, tagWeight 500) ─► styleMeta() ─► replay()
```

### Recommended file layout (new and changed files only)
```
public/fonts/
├── Geist-Variable.woff2       # wght 100–900, Geist 1.800
├── GeistMono-Variable.woff2   # wght 100–900, Geist Mono 1.700
└── OFL.txt                    # verbatim from vercel/geist-font v1.7.2
tests/
└── smoke.spec.mjs             # one spec, three tests (home, projects, booking)
playwright.config.mjs
.prettierignore
.git-blame-ignore-revs
```

### Pattern 1: Commit order (control session, on `main`)
1. `style: prettier baseline`. Contents: `prettier` devDependency (exact), the `format` and `format:check` scripts, `.prettierignore`, and the output of `npx prettier --write .`. AST-check it before committing (Code Examples §2). This is the first commit of the phase and lands before any worktree is cut.
2. `chore: ignore prettier baseline in blame`. Adds `.git-blame-ignore-revs` with the **full** 40-character SHA of commit 1. A commit cannot contain its own SHA, so this has to be a second commit. GitHub reads this file from the repo root automatically. Locally: `git config blame.ignoreRevsFile .git-blame-ignore-revs`. `[CITED: docs.github.com "Ignore commits in the blame view"]`
3. `test: playwright smoke test`. Playwright devDependency, config, spec, `test` script, `.gitignore` and ESLint ignores for `playwright-report/` and `test-results/`. Run it green on the current fonts (D-22). Capture "before" screenshots here.
4. `feat(fonts): Geist for every face`. Add the woff2 files and OFL.txt, delete the 4 old files, rewrite the `@font-face` blocks, change every string (Pattern 2), add the `fonts.load` gate and the tracking params, extend the smoke test with font assertions. Capture "after" screenshots; Koussay signs.
5. `docs: licence, readme, breakdown credit`. LICENSE (D-09, D-10), README (D-13..D-16), BREAKDOWN header (D-11), AGENTS.md font lines (HYG-04).
6. `chore: remove dead files`. HYG-06.

Commits 4 and 5 can be one commit. D-08 and Pitfall 12 want the files and their notices to change together, and putting the LICENSE `public/` rewrite inside commit 4 satisfies that best.

### Pattern 2: Font-string inventory and target (HYG-02)

Rule: every `"Satoshi"` and `"PP Neue Montreal"` becomes `"Geist"`; every existing `"Geist"` becomes `"Geist Mono"` (D-04: Geist is used today only for digits and small data labels).

| File:line (today) | Selector / key | Today | After |
|---|---|---|---|
| `components/ring/params.js:144` | `textFont` | `"PP Neue Montreal"` (weight 400) | `"Geist"`, `textWeight: 300` (D-03) |
| `components/ring/params.js:166` | `nameFont` | `"Satoshi"` 500 | `"Geist"` 500 |
| `components/ring/params.js:169` | `idxFont` | `"Geist"` 400 | `"Geist Mono"` 400 |
| `components/ring/gui.js:142` | `textFont` dropdown | `["PP Neue Montreal","Satoshi","Geist"]` | `["Geist","Geist Mono"]` |
| `components/ring/meta.js:166–167` | `bigFace`/`smallFace` | built from params | unchanged code (follows params) |
| `components/ring/splitText.js:34`, `tag.js:36` | canvas `ctx.font` | from `params.textFont` | unchanged code (follows params) |
| `components/Carousel.jsx:1983` | project list `<ul>` inline style | `"Satoshi"` | `"Geist"` |
| `app/globals.css:8–41` | 4 `@font-face` blocks | Satoshi×2, Geist ttf, PP NM | 2 blocks: `"Geist"`, `"Geist Mono"` (variable) |
| `app/globals.css:133` | `.ring-loader-label, .ring-loader-time` | Satoshi | Geist (`.ring-loader-time` is overridden at :154) |
| `app/globals.css:146` | `.ring-loader-count` | Geist | Geist Mono |
| `app/globals.css:154` | `.ring-loader-time` | Geist | Geist Mono |
| `app/globals.css:177` | `.ring-credit` | Satoshi | Geist |
| `app/globals.css:235` | `.site-crumbs` | Satoshi | Geist |
| `app/globals.css:426` | `.glass-btn` | Satoshi | Geist |
| `app/booking/page.module.css:66` | `.page` | Satoshi | Geist |
| `app/booking/page.module.css:549` | `.fitIndex` | Geist | Geist Mono |
| `app/booking/page.module.css:770` | `.calendarWeekdays` (letters, not digits) | Geist | Geist Mono (recommended for consistency; see Open Q2) |
| `app/booking/page.module.css:955` | `.progressMeta` | Geist | Geist Mono |
| `app/project/[slug]/page.module.css:11` | `.page` | Satoshi | Geist |
| `app/project/[slug]/page.module.css:115` | `.heroIndex, .loadingNumber, .sectionNumber, .pagerIndex, .heroYear` | Geist | Geist Mono |
| `app/project/[slug]/page.module.css:273` | `.mediaFallbackFile` | Geist | Geist Mono |
| `app/globals.css:3–6, 33–34` | comments naming Satoshi / "Book is the only cut" | — | rewrite to match |
| `lib/mail/booking.js:45` | email body | system stack | unchanged (email clients cannot load the webfont) |

`[VERIFIED: grep of app, components, lib on 2026-10-03]`. Weights in CSS today: 400 ×4, 500 ×18, **600 ×5**. Satoshi had only 400 and 500 files, so 600 was synthesised. With the variable font, 600 becomes a true Semibold, a small visible change on the booking and project pages to note in the screenshots.

### Pattern 3: Canvas text and variable fonts
- `splitText.js` measures each glyph with `measureText` on a canvas whose `font` is `${textWeight} ${size}px "${textFont}", ui-sans-serif, …`, then adds `params.textTracking * size` between advances by hand. **Heading tracking already exists** as `textTracking` (em), with a GUI control at `gui.js` ~146 wired to `rebuildText`. D-06 for the heading means only retuning its default. `[VERIFIED: code read]`
- `tag.js` uses `params.textFont` at `params.tagWeight` (500), so the "View" tag moves to Geist Medium automatically.
- Variable-font weight selection in canvas: measured in headless Chromium 153 with one `@font-face { font-weight: 100 900 }`. Width of "Works '26" at 41 px: 100→179.09, 300→183.16, 400→185.20, 500→189.44, 900→206.43; serif fallback 164.68. The canvas selects the right instance. `[VERIFIED: Playwright probe]`. Safari and Firefox behaviour was not probed `[ASSUMED: same CSS font matching]`. Koussay's screenshot check on his Mac covers this.
- `ctx.letterSpacing` is present in Chromium (`"letterSpacing" in ctx === true`). It is **not** needed and should not be introduced, because the manual method already works and changing it would move glyph cell sizing.

### Pattern 4: Smoke test shape
- One spec file, three tests: `home`, `every project page`, `booking`. Two Playwright projects: `desktop` (viewport 1512×945, Chromium) and `phone` (390×844, `isMobile: true`, `hasTouch: true`, `deviceScaleFactor: 2`, Chromium). Do not use `devices["iPhone 13"]`: that descriptor defaults to WebKit. With `isMobile` + `hasTouch`, Chromium reports `(pointer: coarse)` true and `(hover: none)` true `[VERIFIED: probe]`, so the ring takes its phone path (`coarseMQ`, `loFi`).
- Slugs: fetch `/sitemap.xml` from the running server (`request.get`), regex the `<loc>` values, take `new URL(loc).pathname`, keep `/project/*`. Sitemap URLs use `SITE_URL` (`https://koussay.online`), so read only the pathname. Assert there is at least one project so an empty list cannot pass by default. This is the least coupled source: it reads what the build serves, needs no import of app code (the `@/` alias and Next caches don't work in the test process), and survives Phase 2's move to content modules untouched.
- Loop the slugs inside one test with `test.step(slug, …)` and `expect.soft` so every failing slug is reported in one run. Playwright collects tests synchronously, so it cannot generate one test per slug from an async fetch without a globalSetup file. That is not worth the extra moving part.
- WebGL alive: `canvas.evaluate(c => { const gl = c.getContext("webgl2"); return !!gl && !gl.isContextLost(); })`. three r185 creates a WebGL2 context, and `getContext("webgl2")` on that canvas returns the existing context. Asking for `"webgl"` on a webgl2 canvas returns `null`, so do not fall back to it.
- Ring readiness: wait for `[data-loader-count]` to have text `100` (timeout 45 s under SwiftShader). It reaches 100 only when the atlas art has loaded and the seed is born (`Carousel.jsx` `tickLoader`), so it proves textures loaded too.
- Booking: `page.route("**/api/book/**", …)` records any request and aborts it. Assert none were made. On step 1 nothing is fetched; availability loads only on steps 3–4 and the draft only when moving on (`BookFlow.jsx` 102–160). The guard keeps a later change from writing to Notion through the test.
- `next start` with `output: "standalone"`: Next logs a warning (`"next start" does not work with "output: standalone"…`) but keeps serving (`node_modules/next/dist/server/next.js:243` is `_log.warn`, not a throw). `[VERIFIED: source]`. The server log is not the browser console, so the test is unaffected.
- Build source: in the main checkout `.env.local` exists, so `next build` reads the live Notion set (8 slugs on 2026-10-03: pixenhouse, vamos-taxi, looma-kitchen, almar-private-journey, fido-homes, elysee-home-design, clickit-story, artemis-luxe). In a worktree without `.env.local` it serves the 18 placeholders. The sitemap approach covers both. Project-page media then comes through `/api/media/*`, which fetches Notion-signed URLs live, so a Notion or S3 blip can make the test flaky until Phase 3 removes the proxy. Use `retries: 1`.

### Pattern 5: Licence and README facts
- Upstream: **https://github.com/Yousuf-developer/Viscose-carousel**. Owner "Yousuf Soomro" (`gh api users/Yousuf-developer`), MIT LICENSE `Copyright (c) 2026 Yousuf Soomro`. It contains this repo's first commits: `a438cfb first commit` exists in both histories. `[VERIFIED: GitHub API]`. Use this link in the README credit and the BREAKDOWN header (D-14).
- LICENSE today: MIT block (lines 1–21), `---`, "covers the source code only", then `public/` notes for PP Neue Montreal, Satoshi (claims "free for personal and commercial use", which is wrong for redistribution under the FFL v2.0 per Pitfall 11), Geist (`Geist-Regular.ttf`), Behance imagery, and finally the simplex-noise notice. Edits: insert `Copyright (c) 2026 Koussay Zayani` above line 3. Replace the three font bullets with one Geist bullet (`public/fonts/*.woff2`, SIL OFL 1.1, Copyright 2024 The Geist Project Authors, `public/fonts/OFL.txt`). Keep the Behance bullet (D-10). Add an arrow-icon line (Open Q1). Keep the simplex block byte for byte.
- Geist copyright line: the font's own `name` table and the release `OFL.txt` say "Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font)". The npm `LICENSE.txt` says "Copyright (c) 2023 Vercel, in collaboration with basement.studio". Ship the release `OFL.txt`; it matches the font binary. `[VERIFIED: fontTools + diff]`
- Simplex-noise notice lives in two places that must both stay: `components/shaders/planeShaders.js` (inline, ~lines 125–127) and LICENSE "Third-party code".
- `public/` licence inventory after this phase: `1..18.webp` and `404.webp` (Behance, Phase 2 removes them); `favicon.ico` and `logo.png` (Koussay's mark `[ASSUMED]`); `arrow-top-right-svgrepo-com.svg` (SVG Repo icon #509306, bytes identical to `svgrepo.com/show/509306`; licence reported as CC0 by search results only, page blocked by a Vercel checkpoint, see Open Q1); `fonts/*` (OFL).
- `docs/carousel.png`, `docs/hover.png`, `docs/entry.png` are screenshots **showing the Behance placeholder art** (checked `docs/carousel.png`), embedded at README lines 13, 66 and 185. The rewritten README must not embed them (Open Q3).
- Env vars actually read by code (grep of `app lib components scripts`). App: `NOTION_TOKEN`, `NOTION_PROJECTS_DATABASE_ID`, `NOTION_BOOKINGS_DATABASE_ID`, `NOTION_CALENDAR_DATABASE_ID` (optional), `NOTION_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`, `BOOKING_NOTIFY_EMAIL`, and the optional research vars `FIRECRAWL_API_KEY`, `GEMINI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY`, `GEMINI_MODEL`, `OPENAI_API_KEY`, `OPENAI_MODEL`. Scripts only: `HF_CREDENTIALS` (or `HIGGSFIELD_API_KEY_ID` + `_SECRET`), `HIGGSFIELD_IMAGE_ENDPOINT` / `_VIDEO_ENDPOINT`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE`. Without Notion keys the site serves 18 placeholders; without booking keys `/api/book` returns 503.
- Stale claims to remove (HYG-04):
  - README: 50 (PP NM bundled), 125–148 (Fonts table and notes), 145 ("Satoshi and Geist are both free to redistribute"), 147 (.otf/.ttf), 223 ("Please don't commit font binaries", now wrong because the woff2 files are committed), 262 (PP NM).
  - AGENTS.md: 200–202 (Known gap 2: ".otf/.ttf, PP Neue Montreal is gitignored"), 223–228 ("PP Neue Montreal is bundled but not licensed… Satoshi (ITF) and Geist (OFL) have no such restriction"), 238–242 (family names list `nameFont`/`idxFont`/`textFont`; keep the rule, update the names), 244–248 (Dead files section, remove after deletion).
  - `.gitignore` 26–27 (the comment about PP Neue Montreal being included).

### Anti-Patterns to Avoid
- **Adding `geist` to `package.json`:** it exists to support `next/font`, which D-07 forbids. Copy the files once.
- **Relying on `document.fonts.ready` for canvas faces:** proven insufficient (Pitfall 1).
- **`page.route("**/_vercel/**")` stubbing as the allowlist:** this hides any other `_vercel` failure. Filter the one console message by text **and** URL instead, as D-20 words it.
- **`networkidle` as the main readiness signal on `/`:** the ring loads textures and keeps a rAF loop going; wait on `[data-loader-count] == 100` instead.
- **Formatting `CLAUDE.md` or `.planning/`:** GSD regenerates them, so they would fail `prettier --check` at the next phase end (Pitfall 3).
- **Pattern-killing servers after the test:** Playwright's `webServer` stops the process it started. Never `pkill`; if a stray server stays, kill by port: `lsof -nP -iTCP:3100 -sTCP:LISTEN -t | xargs kill`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Converting fonts to woff2 | `fonttools`/`woff2_compress` pipeline | Official `Geist-Variable.woff2` / `GeistMono-Variable.woff2` | Official files exist; self-conversion makes a Modified Version under the OFL and adds tooling |
| Starting and stopping the server for tests | shell `&` + `sleep` + `kill` | Playwright `webServer` | It waits for the URL, captures logs and kills only its own process tree |
| Proving the Prettier commit changes no behaviour | Reading the diff by eye | `espree` AST comparison (Code Examples §2) | 17 files, ~thousands of lines; an AST equality check is exact |
| Slug discovery | Importing `lib/cms/projects.js` into the test | `/sitemap.xml` from the running server | The app uses the `@/` alias and `unstable_cache`; the sitemap is what visitors and crawlers get |

## Runtime State Inventory

Not a rename or migration phase, but files leave the tree and are already served, so here is what stays outside git:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None. Fonts are not stored in Notion. Verified by grep: no font paths in `lib/notion/*` | none |
| Live service config | Vercel keeps past deployments, which still serve `/ppneuemontreal-book.otf` and `/Satoshi-*.otf` at their deployment URLs | Already planned as Koussay's Phase 2 step (Deployment Protection check). Note it in the README "history" line |
| OS-registered state | None. No launchd or pm2 entries for this repo were found or are relevant | none |
| Secrets/env vars | `HIGGSFIELD_API_KEY_ID`/`_SECRET` and `R2_PUBLIC_BASE` keep working in scripts after the `lib/env.js` accessors go (scripts read env through their own loaders) | code edit only; no env change |
| Build artifacts | `.next/` holds old font references until the next build; browser caches hold `/Satoshi-*.otf` | `npm run build` in the test rebuilds; nothing to migrate |

## Common Pitfalls

### Pitfall 1: Canvas-only face not loaded when the heading is built
**What goes wrong:** `startEntry` waits on `document.fonts.ready` (`Carousel.jsx` ~1662). `ready` resolves at once when no DOM element has asked for the face, so `splitText.build()` measures in the fallback font.
**Why it happens:** the CSS Font Loading API loads faces on demand. Canvas `ctx.font` with `measureText` does not count as a pending load before `ready` resolves. **Reproduced 2026-10-03:** with an 800 ms delayed font and no DOM use, `ready` took 0 ms and the measured width was 164.68 (serif); `document.fonts.load('300 41px "Geist"')` then took 808 ms and gave 183.16. With the DOM also using Geist, `ready` returned the correct width. This bug exists today with PP Neue Montreal on a cold load.
**How to avoid:** in `startEntry`, `await Promise.all([document.fonts.load('300 1em "Geist"'), document.fonts.load('500 1em "Geist"'), document.fonts.load('400 1em "Geist Mono"')])` before `splitText.build()`. Keep the 3 s `fontFallback` timeout. Use the current `params.textWeight`, `params.tagWeight`, `params.textFont` and `params.idxFont` values in the descriptors, not literals. Add a `<link rel="preload" as="font" type="font/woff2" crossorigin>` for `Geist-Variable.woff2`.
**Warning signs:** DevTools → Rendered Fonts shows the fallback on the heading on a cold load; heading width differs between a hard reload and a warm one.

### Pitfall 2: Metric shift moves the meta morph and the heading
**What goes wrong:** Geist Mono digits are wider than Geist Regular digits, and Geist Medium widths differ from Satoshi Medium. The meta rows are anchored to their edges (`meta.js` comment ~line 197), so widths change the gap reading but should not cause jumps. The loader counter (`letter-spacing: -0.08em` on mono digits) will look different.
**How to avoid:** before/after screenshots at 1512 and 390 (desktop and phone projects) of: the heading during entry, the meta lockup at rest, one morph mid-transition, the loader. Retune `metaGapL`/`metaGapR` only if Koussay asks.

### Pitfall 3: Generated files fail `prettier --check` at every phase end
**What goes wrong:** `npx prettier --check .` today flags 86 files: 50 under `.agents/`, 18 under `.planning/`, `CLAUDE.md`, and 17 code files. `.planning/*` and `CLAUDE.md` are rewritten by GSD tooling at each phase transition.
**How to avoid:** `.prettierignore` with `.planning/`, `.agents/`, `CLAUDE.md`, `playwright-report/`, `test-results/`. Prettier 3 also honours `.gitignore` (confirmed: `.next/` and `.env.local` were not scanned). After that the baseline touches exactly the 17 code files. `[VERIFIED: prettier 3.9.9 --check]`

### Pitfall 4: The baseline touches booking code
**What goes wrong:** 4 of the 17 files are under the "bookings off-limits, re-run a preview booking" rule.
**How to avoid:** run the AST check (Code Examples §2) and record its output in the plan summary. All 17 files compared AST-equal with `espree` 10.4.0 on 2026-10-03 (`{ changed: 17, astEqual: 17, astDiff: 0 }`). That shows no behaviour change. Whether this replaces the preview booking is Koussay's call at ship (Open Q4).

### Pitfall 5: Speed Insights allowlist too broad
**What goes wrong:** stubbing `/_vercel/**` or ignoring every "Failed to load resource" hides real 404s (a missing font, a missing cover).
**How to avoid:** skip a console error only when `msg.text()` starts with `Failed to load resource` **and** `msg.location().url` ends with `/_vercel/speed-insights/script.js`. The SDK's own `onerror` message is `console.log`, not an error, so it needs no filter. `[VERIFIED: probe + node_modules/@vercel/speed-insights 2.0.0 source]`. The SDK requests `/_vercel/speed-insights/script.js` only when `NODE_ENV` is production with no `dsn`/`basePath`; `next start` is production.

### Pitfall 6: `.gitignore` alone does not untrack `.agents/skills/`
**What goes wrong:** 102 files under `.agents/skills/` are tracked. Adding `/.agents/skills/` to `.gitignore` leaves them in the index.
**How to avoid:** `git rm -r --cached .agents/skills && echo "/.agents/skills/" >> .gitignore`. The files stay on disk, so the CLAUDE.md project-skills table keeps working locally. `skills-lock.json` (skill name → `higgsfield-ai/skills` + hash) stays tracked so the skills can be restored. New worktrees will not contain the skills, which is acceptable.

### Pitfall 7: Lint picks up test output
**What goes wrong:** `npm run lint` (`eslint` over the repo) has a flat config that does not read `.gitignore`; `playwright-report/` contains bundled JS.
**How to avoid:** add `playwright-report/**` and `test-results/**` to `globalIgnores` in `eslint.config.mjs` and to `.gitignore`.

### Pitfall 8: The "first commit" ordering breaks
**What goes wrong:** a worktree cut before the baseline merges with conflicts on 17 files.
**How to avoid:** commit the baseline on `main` before any work session is cut. Formatting `TwoPlaneMorph.jsx` (which is deleted later) is harmless.

## Code Examples

### §1 `.prettierignore` and package scripts
```gitignore
# GSD-generated; rewritten at every phase transition
.planning/
CLAUDE.md
# Third-party skills, untracked in this phase
.agents/
# Test output
playwright-report/
test-results/
```
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "test": "playwright test"
}
```

### §2 AST-equivalence check for the baseline (one-off, not committed)
```js
// Run from a temp dir holding old/ and new/ copies of the changed .js/.jsx/.mjs files.
// Verified 2026-10-03: { changed: 17, astEqual: 17, astDiff: 0 }
const espree = require("<repo>/node_modules/espree");
const strip = (n) => Array.isArray(n) ? n.map(strip)
  : n && typeof n === "object"
    ? Object.fromEntries(Object.entries(n)
        .filter(([k]) => !["start","end","range","loc","raw","comments","tokens"].includes(k))
        .map(([k, v]) => [k, strip(v)]))
    : n;
const parse = (s) => espree.parse(s, { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } });
// equal ⇔ JSON.stringify(strip(parse(old))) === JSON.stringify(strip(parse(new)))
```
For a committed tree the same check can run against `git show HEAD~1:<file>` vs `git show HEAD:<file>` for `git diff --name-only HEAD~1 -- '*.js' '*.jsx' '*.mjs'`. CSS and Markdown changes are not AST-checked; the baseline touches no CSS (all `.css` files already pass).

### §3 `playwright.config.mjs`
```js
import { defineConfig } from "@playwright/test";

// 3000, 3200 (Houssam) and 4330 (Vamos) are used by other products on this Mac.
const PORT = 3100;
const baseURL = process.env.BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  retries: 1, // project media still comes through the live Notion proxy until Phase 3
  workers: 1, // SwiftShader is CPU-bound; parallel pages starve each other
  reporter: [["list"]],
  use: {
    baseURL,
    launchOptions: { args: ["--enable-unsafe-swiftshader"] },
  },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1512, height: 945 } } },
    {
      name: "phone",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `npm run build && npx next start -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: false, // a busy 3100 fails loudly instead of testing someone else's server
        timeout: 300_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
```
The `1512×945` height is `[ASSUMED]` (a 1512-wide MacBook Pro window minus browser chrome). Width is what D-19 fixes. `workers: 1` is a recommendation; the run is (1 + N + 1) pages × 2 projects, about 20 page loads with 8 projects.

### §4 `tests/smoke.spec.mjs` (skeleton)
```js
import { test, expect } from "@playwright/test";

const SPEED_INSIGHTS = "/_vercel/speed-insights/script.js";

function watch(page) {
  const errors = [];
  const bookingCalls = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const url = msg.location()?.url ?? "";
    if (msg.text().startsWith("Failed to load resource") && url.endsWith(SPEED_INSIGHTS)) return;
    errors.push(`${msg.text()} @ ${url}`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.route("**/api/book/**", (route) => {
    bookingCalls.push(route.request().url());
    return route.abort();
  });
  return { errors, bookingCalls };
}

test("home renders the ring", async ({ page }) => {
  const { errors } = watch(page);
  await page.goto("/");
  const canvas = page.locator(".ring-stage canvas");
  await expect(canvas).toHaveCount(1);
  expect(await canvas.evaluate((c) => {
    const gl = c.getContext("webgl2");
    return !!gl && !gl.isContextLost();
  })).toBe(true);
  await expect(page.locator("[data-loader-count]")).toHaveText("100", { timeout: 45_000 });
  await page.waitForTimeout(1_000);
  expect(errors).toEqual([]);
});

test("every project page renders", async ({ page, request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1]).pathname)
    .filter((p) => p.startsWith("/project/"));
  expect(paths.length).toBeGreaterThan(0);
  for (const path of paths) {
    await test.step(path, async () => {
      const { errors } = watch(page);
      const res = await page.goto(path);
      expect.soft(res?.status(), path).toBe(200);
      await expect.soft(page.locator("h1").first(), path).toBeVisible();
      await page.waitForTimeout(500);
      expect.soft(errors, path).toEqual([]);
      page.removeAllListeners("console");
      page.removeAllListeners("pageerror");
      await page.unrouteAll({ behavior: "ignoreErrors" });
    });
  }
});

test("booking first step renders without a request", async ({ page }) => {
  const { errors, bookingCalls } = watch(page);
  await page.goto("/booking");
  await expect(page.locator("main, form").first()).toBeVisible();
  await page.waitForTimeout(500);
  expect(bookingCalls).toEqual([]);
  expect(errors).toEqual([]);
});
```
The exact booking selector and the project `<h1>` are `[ASSUMED]`. The planner should have the executor confirm both against `components/book/BookFlow.jsx` and `components/project/ProjectHero.jsx` before writing assertions. After the swap, add to the home test: `expect(await page.evaluate(() => document.fonts.check('300 41px "Geist"') && document.fonts.check('400 16px "Geist Mono"'))).toBe(true)`, and fail on any response whose URL ends in `.otf` or `.ttf`.

### §5 `@font-face` (replaces `globals.css` lines 1–41)
```css
/* Family names here have to match the strings in ring/params.js — nameFont,
   idxFont and textFont are looked up by name, not imported. One variable
   file per family, so every weight is a real cut. */
@font-face {
  font-family: "Geist";
  src: url("/fonts/Geist-Variable.woff2") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

/* Numbers, years and the load counter: fixed-width digits. */
@font-face {
  font-family: "Geist Mono";
  src: url("/fonts/GeistMono-Variable.woff2") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
```
Preload in `app/layout.js`. Either use React 19's `preload` from `react-dom` (`preload("/fonts/Geist-Variable.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" })`) `[CITED: react.dev/reference/react-dom/preload]`, or put a literal `<link>` in `<head>`. Preload only the Sans file, which the heading and the meta need on the first frame.

### §6 Font gate in `startEntry` (`Carousel.jsx` ~1651–1665)
```js
// fonts.ready only waits for faces the DOM has asked for; the heading and the
// tag are canvas-only, so ask for exactly the cuts they rasterise.
const faces = [
  `${params.textWeight} 1em "${params.textFont}"`,
  `${params.tagWeight} 1em "${params.textFont}"`,
  `${params.nameWeight} 1em "${params.nameFont}"`,
  `${params.idxWeight} 1em "${params.idxFont}"`,
];
const fontFallback = setTimeout(startEntry, 3000);
Promise.all(faces.map((f) => document.fonts?.load(f) ?? Promise.resolve()))
  .then(startEntry)
  .catch(startEntry);
```
This keeps the existing guarantees: build once, after faces load, with a 3 s ceiling. It is not one of the protected ring internals in AGENTS.md.

### §7 Card-name tracking param (D-06)
```js
// params.js, meta block
nameTracking: -0.02, // em; Geist Medium reads loose at display size
// gui.js, meta folder
onMeta("nameTracking", -0.1, 0.1, 0.001, "name tracking (em)");
// meta.js style(): set on the big-face span in all three rows
const bigTrack = `${params.nameTracking}em`;
lead.style.letterSpacing = isRight ? bigTrack : "";
trail.style.letterSpacing = isRight ? "" : bigTrack;
```
The empty string lets the small (index/year) span inherit the wrapper's `tracking-[-0.01em]` (`Carousel.jsx` meta `<div>` class). `styleMeta` is the right `onChange` per the AGENTS tuning rule, because `meta.style()` sizes the DOM labels. Proposed starting values for sign-off: `textTracking: -0.02` (heading, Geist Light 300 at 41 px) and `nameTracking: -0.02` (Geist Medium 500). These are `[ASSUMED]` starting points; Koussay signs the screenshots.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static OTF/TTF per weight | One variable woff2 per family (`font-weight: 100 900`) | Geist ships variable woff2 in npm 1.7.x / release v1.7.2 | 2 files (~141 KB) replace 4 files (~340 KB); every weight is a true cut |
| Chrome auto-fallback to SwiftShader | Explicit `--enable-unsafe-swiftshader` | Deprecated around Chrome 130 (blink-dev) | On this Mac the headless shell still got SwiftShader WebGL2 without the flag. Keep the flag for GPU-less machines `[CITED: groups.google.com/a/chromium.org/g/blink-dev/c/yhFguWS_3pM, via STACK.md]` |
| Prettier `--ignore-path .prettierignore` only | Prettier 3 reads `.gitignore` and `.prettierignore` by default | Prettier 3.0 | `.next/`, `node_modules`, `.env*` need no entry `[VERIFIED: check output]` |

**Deprecated/outdated in this repo:** `lib/env.js` `higgsfieldKeyId`, `higgsfieldKeySecret`, `r2PublicBase`, `isHiggsfieldConfigured`, `isR2Configured`. No file in `app/`, `components/`, `lib/` or `scripts/` imports them. `scripts/lib/r2.mjs` defines its own `isR2Configured(config)`, which stays. `[VERIFIED: grep]`

## Dead-file verification (HYG-06)

| File | Referenced by | Safe to delete |
|------|---------------|----------------|
| `components/TwoPlaneMorph.jsx` | only AGENTS.md text and `.planning/` docs; no import | yes `[VERIFIED: grep]` |
| `shader` (root, 13 KB) | nothing (it is a pasted docs page: "Docs / Tools / Pro / Sponsors…"); upstream Viscose-carousel ships it too | yes `[VERIFIED]` |
| `scripts/seed-notion-projects.mjs` | only CLAUDE.md / `.planning` docs; no `package.json` script; no import | yes `[VERIFIED]`. CLAUDE.md lines 35, 67, 91, 152–153 mention it; GSD regenerates CLAUDE.md, so leave it alone |
| 5 `lib/env.js` accessors (above) | none | yes |
| `.agents/skills/**` (102 tracked files) | CLAUDE.md skills table (local use) | untrack, keep on disk |
| `docs/NEXT-SESSION-PROMPT.md` | nothing; stale hand-off prompt | not in HYG-06; optional (Open Q3) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Safari and Firefox select the right variable instance for canvas `ctx.font` weights | Pattern 3 | Heading weight wrong on Safari; caught by Koussay's screenshot check on his Mac |
| A2 | `raw.githubusercontent.com/vercel/geist-font/v1.7.2/OFL.txt` resolves | Installation | Use the `main` path (verified identical) |
| A3 | Desktop viewport height 945 | §3 | None material; width is the locked value |
| A4 | Booking first-step and project `<h1>` selectors | §4 | Test fails to find elements; executor confirms selectors first |
| A5 | Starting tracking values −0.02 em | §7 | Cosmetic; Koussay signs |
| A6 | `favicon.ico` / `logo.png` are Koussay's own mark | Pattern 5 | Licence note incomplete |
| A7 | The SVG Repo arrow (#509306) is CC0 (search snippet only; page was blocked) | Pattern 5 | Licence note wrong; Open Q1 |

## Open Questions

1. **Arrow icon licence (`public/arrow-top-right-svgrepo-com.svg`)**
   - What we know: the bytes match SVG Repo #509306 "Arrow Top Right"; a search result says CC0; the page returned a Vercel security checkpoint, so the licence could not be read directly.
   - Recommendation: either Koussay opens svgrepo.com/svg/509306 once and confirms the licence line (one numbered step), then LICENSE gets "Arrow icon: SVG Repo #509306, CC0"; or draw the same three-segment path with `ctx.stroke()` in `tag.js` and delete the file. The first is smaller.
2. **`.calendarWeekdays` (weekday letters) → Geist Mono or Geist?** D-04 covers digits. Recommendation: Geist Mono, so every small uppercase data label on the booking page uses one face; flag it in the screenshots.
3. **README screenshots in `docs/*.png` show Behance art.** Recommendation: the new README embeds none of them. Deleting them belongs with Phase 2's Behance removal (CONT-08); the planner may pull it forward. `docs/NEXT-SESSION-PROMPT.md` is stale; deleting it is optional.
4. **Does the AST proof replace the preview booking for the baseline commit?** The cross-phase rule names `lib/book/*`. Recommendation: present the AST result at ship and let Koussay decide; no code depends on the answer.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build, Playwright | ✓ | v26.7.0 (Next needs ≥ 20.9) | — |
| npm | install, scripts | ✓ | 11.19.0 | — |
| Chromium headless shell (Playwright 1243) | smoke test | ✓ (cached) | Chrome for Testing 153.0.8010.12 | `npx playwright install --only-shell chromium` |
| Port 3100 | smoke test server | ✓ free; not referenced by any repo under `~/Developer` | — | another free port (avoid 3000, 3200, 4330) |
| `gh` CLI | Geist release download (optional) | ✓ | — | `npm pack geist@1.7.2` |
| `.env.local` (Notion keys) | live slug set in the test | ✓ in main checkout only | — | 18 placeholders in worktrees; test still passes |
| fontTools | optional font inspection | ✓ | — | not needed |

**Missing dependencies with no fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `@playwright/test` 1.63.0 (new, this phase) |
| Config file | `playwright.config.mjs` (Wave 0) |
| Quick run command | `npx playwright test --project=desktop -g home` (needs the server: with `BASE_URL` unset, the config builds and starts it) |
| Full suite command | `npm test` |
| Static gates | `npm run format:check && npm run lint && npm run build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HYG-05 | Baseline commit is formatting-only | static | AST check §2 over `git diff --name-only <baseline>~1 <baseline>` → `astDiff: 0` | ❌ one-off script (not committed) |
| HYG-05 | Tree is formatted, lints and builds | static | `npm run format:check && npm run lint && npm run build` | ✅ after Wave 0 scripts |
| HYG-05 | SHA recorded | static | `grep -q "$(git log --format=%H --grep='prettier baseline' -1)" .git-blame-ignore-revs` | ❌ Wave 0 |
| TEST-01 | Home renders canvas + live WebGL2, no console errors | e2e | `npx playwright test -g home` | ❌ Wave 0 |
| TEST-01 | Every sitemap project page renders clean (desktop + phone) | e2e | `npx playwright test -g "every project"` | ❌ Wave 0 |
| TEST-01 | Booking first step renders, no `/api/book` request | e2e | `npx playwright test -g booking` | ❌ Wave 0 |
| TEST-01 | Test actually fails when it should | manual-once | temporarily rename the canvas container class or add `console.error("x")` in a page → `npm test` must fail; revert | — |
| HYG-01 | No `.otf`/`.ttf` tracked; woff2 + OFL present | static | `test -z "$(git ls-files '*.otf' '*.ttf')" && test -f public/fonts/OFL.txt && ls public/fonts/*.woff2` | — |
| HYG-01 | Fonts served and loaded on a cold load | e2e | home test asserts `document.fonts.check('300 41px "Geist"')`, `check('400 16px "Geist Mono"')`, no `.otf`/`.ttf` response | ❌ added in the swap commit |
| HYG-02 | Every family string has a `@font-face` | static | `grep -rhoE '"(Geist Mono\|Geist\|Satoshi\|PP Neue Montreal)"' app components \| sort -u` → only `"Geist"`, `"Geist Mono"`; `grep -c '@font-face' app/globals.css` → 2 | — |
| HYG-02 | Metric shifts reviewed | manual | before/after screenshots (Playwright `page.screenshot` series at 1512 and 390) signed by Koussay | — |
| HYG-03 | Upstream notices intact | static | `git diff <pre-phase>..HEAD -- LICENSE` shows no `-` line in the MIT block or the simplex block; `grep -c "Copyright (c) 2026 Yousuf Soomro" LICENSE` = 1; `grep -n "Viscose-carousel" README.md BREAKDOWN.md` | — |
| HYG-04 | No Satoshi / PP NM claims | static | `grep -n -i -E "satoshi\|neue montreal" README.md LICENSE AGENTS.md .gitignore` → no claim of bundling (a history mention in README is allowed) | — |
| HYG-06 | Dead files gone, skills untracked | static | `test ! -e components/TwoPlaneMorph.jsx -a ! -e shader -a ! -e scripts/seed-notion-projects.mjs`; `grep -c -E "higgsfieldKey\|r2PublicBase\|isR2Configured\|isHiggsfieldConfigured" lib/env.js` = 0; `test -z "$(git ls-files .agents/skills)"`; `git ls-files skills-lock.json` non-empty | — |

### Sampling Rate
- **Per task commit:** `npm run format:check && npm run lint` (fast); the relevant `npx playwright test -g …` when the task touches the UI.
- **Per wave merge:** `npm test` (build included).
- **Phase gate:** `npm run format:check && npm run lint && npm run build && npm test` green on the tree that ships, then Koussay's screenshot sign-off.

### Wave 0 Gaps
- [ ] `playwright.config.mjs`, `tests/smoke.spec.mjs` cover TEST-01.
- [ ] `package.json` scripts `test`, `format`, `format:check`; devDependencies `prettier@3.9.9`, `@playwright/test@1.63.0` (exact).
- [ ] `.prettierignore`, `.git-blame-ignore-revs`.
- [ ] `.gitignore` + `eslint.config.mjs` ignores for `playwright-report/`, `test-results/`.
- [ ] Browser: `npx playwright install --only-shell chromium` (already cached on this Mac).

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no new input | — |
| V6 Cryptography | no | — |
| V14 Configuration / supply chain | yes | Exact-pinned devDependencies, lockfile, no install scripts on the new packages, fonts verified by SHA-256 against the official release |

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Test writes to the live Notion bookings DB | Tampering | `page.route("**/api/book/**")` abort + assert no calls; no form submit (D-18) |
| Secret leakage via test logs | Information disclosure | Test reads no env; `next start` stderr piped only; never print `.env.local` |
| Typosquatted package | Tampering | slopcheck [OK] on all three; registry repo URLs match official repos |
| Licence breach (served unlicensed fonts) | Repudiation / legal | Files deleted and notices changed in one commit; OFL shipped next to the fonts |

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view`, 2026-10-03): prettier 3.9.9, @playwright/test 1.63.0, geist 1.7.2 (repo, licence, no install scripts)
- GitHub API: `vercel/geist-font` releases (v1.7.2, 2026-06-01, asset `geist-font-v1.7.2.zip`), `OFL.txt`; `Yousuf-developer/Viscose-carousel` (MIT, shared commit `a438cfb`)
- Local probes: `npm pack geist@1.7.2` and the release zip compared by SHA-256; fontTools `fvar` (wght 100–900); Playwright 1.63 headless Chromium 153 probes (WebGL2 renderer string, variable-weight canvas widths, the `fonts.ready` race, phone media queries, the Speed Insights console message)
- Repo source: `components/ring/{params,gui,meta,splitText,tag}.js`, `components/Carousel.jsx`, `app/globals.css`, both CSS modules, `lib/env.js`, `app/sitemap.js`, `app/layout.js`, `components/book/BookFlow.jsx`, `next.config.mjs`, `node_modules/next/dist/server/next.js`, `node_modules/@vercel/speed-insights/dist/next/index.mjs`, `node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md`
- Prettier 3.9.9 `--check .` output; espree 10.4.0 AST comparison

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` §6–7 and `PITFALLS.md` 11, 12 and Tests (project-level research, built on here)
- docs.github.com: ignoring revisions in blame via `.git-blame-ignore-revs`
- react.dev: `preload` from `react-dom`

### Tertiary (LOW confidence)
- SVG Repo #509306 licence = CC0 (search snippet only)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. Registry and release bytes verified.
- Architecture: HIGH. Built from the code, with the font race reproduced.
- Pitfalls: HIGH. Each was reproduced or measured, except cross-browser canvas weights (A1).

**Research date:** 2026-10-03
**Valid until:** 2026-11-02 (Playwright releases monthly; re-check `npm view @playwright/test version` before install)
