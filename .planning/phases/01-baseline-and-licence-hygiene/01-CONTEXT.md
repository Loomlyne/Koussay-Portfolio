# Phase 1: Baseline and licence hygiene - Context

**Gathered:** 2026-10-03
**Status:** Ready for planning

<domain>
## Phase Boundary

The repo gets a formatting-only baseline commit, a Playwright smoke test that passes on the current tree before any visible change, Geist (Sans and Mono) replacing PP Neue Montreal and Satoshi everywhere, LICENSE and README that are honest about authorship and fonts, and the dead files removed. Requirements: HYG-05, TEST-01, HYG-01, HYG-02, HYG-03, HYG-04, HYG-06. Nothing a visitor sees changes except the typeface.

</domain>

<decisions>
## Implementation Decisions

### Typefaces
- **D-01:** Every face is Geist, served from the site itself (`public/`), not from R2. Source files are the official OFL releases from the Geist project (`vercel/geist-font`), committed as woff2 with the OFL licence text alongside.
- **D-02:** Use the Geist **variable** woff2 so any weight costs no extra file.
- **D-03:** Intro heading ("Works '26", `textFont`) is **Geist Light 300**, replacing PP Neue Montreal 400.
- **D-04:** Index numbers, years and the load counter (`idxFont` and every place Geist is used for digits today) move to **Geist Mono**, so digits never shift sideways.
- **D-05:** Card names (`nameFont`, today Satoshi 500) become Geist Medium 500; body text on booking and project pages (today Satoshi 400) becomes Geist Regular 400.
- **D-06:** Hierarchy comes from **weight plus tighter letter-spacing** on the heading and card names. Tracking values are params in `components/ring/params.js` with dev-panel controls in `components/ring/gui.js` (repo rule: every new tunable is a param with a control, wired to the right `onChange`). Koussay approves the result through the before/after screenshots already required by the phase's success criteria.
- **D-07:** Font-family names stay literal strings that match `@font-face` blocks (`"Geist"`, `"Geist Mono"`); the `textFont` dropdown in `gui.js` lists only faces that exist. No `next/font` (it renames families and the ring looks fonts up by name).
- **D-08:** `public/ppneuemontreal-book.otf`, `public/Satoshi-Regular.otf`, `public/Satoshi-Medium.otf` and `public/Geist-Regular.ttf` leave the tree in the same change that adds the woff2 files.

### Authorship and licence
- **D-09:** LICENSE gains `Copyright (c) 2026 Koussay Zayani` on the line **above** the existing `Copyright (c) 2026 Yousuf Soomro`; the MIT text and Yousuf's line stay word for word. The simplex-noise notice (Ashima Arts, Stefan Gustavson) stays word for word.
- **D-10:** LICENSE's `public/` notes are rewritten to match the tree: Geist under OFL 1.1; no Satoshi or PP Neue Montreal claims; the Behance imagery note stays until Phase 2 deletes the files, then goes.
- **D-11:** BREAKDOWN.md is **kept**. It gets a short header crediting Yousuf Soomro as the original author of the ring animation and idea, open-sourced under MIT, on which Koussay built. Body text unchanged.
- **D-12:** The repo stays public.

### README
- **D-13:** README is rewritten as Koussay's portfolio README: what the site is, live link https://koussay.online, stack, how to run it locally with the env vars actually in use (from `.env.example`), credits, licence notes. Short.
- **D-14:** Credits carry one line: the WebGL ring started from Yousuf Soomro's open-source MIT carousel; he is the original idea and animation author, with a link to BREAKDOWN.md and the upstream repo if one is public.
- **D-15:** The Behance section shrinks to one honest line (placeholder art from other designers, being replaced, still in git history) until Phase 2 removes the files. README states that removed assets remain in git history.
- **D-16:** The dev-panel and interaction docs that remain true can stay in shortened form; nothing in the README may claim Satoshi or PP Neue Montreal is bundled.

### Smoke test
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Ring and fonts
- `AGENTS.md` — authoritative on the ring; font families are looked up by name in three places; dev-panel `onChange` rules; "Conventions" and "This is a public repo" sections
- `components/ring/params.js` — `textFont`/`textWeight` (line ~144), `nameFont`/`nameWeight` (~166), `idxFont`/`idxWeight` (~169), `tagWeight` (~224)
- `components/ring/gui.js` — `textFont` dropdown (line ~142) and weight controls
- `components/ring/meta.js` — label faces (`bigFace`/`smallFace`) used by the meta morph
- `app/globals.css` — four `@font-face` blocks (lines ~8–41) and every `font-family` declaration
- `app/booking/page.module.css`, `app/project/[slug]/page.module.css`, `components/Carousel.jsx` (~line 1983) — remaining `font-family` uses

### Licence and docs
- `LICENSE` — MIT block, `public/` notes, simplex-noise notice
- `README.md` — sections to rewrite
- `BREAKDOWN.md` — keep, add credit header
- `components/shaders/planeShaders.js` — inline simplex-noise MIT notice (must stay)

### Planning
- `.planning/REQUIREMENTS.md` — HYG-01..06, TEST-01
- `.planning/ROADMAP.md` — Phase 1 success criteria
- `.planning/research/STACK.md` — font, Prettier and Playwright recommendations (versions, SwiftShader flag, Speed Insights stub)
- `.planning/research/PITFALLS.md` — font swap and Playwright-on-WebGL pitfalls
- `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/TESTING.md`, `.planning/codebase/CONCERNS.md`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/lib/load-env.mjs` — shared env loader for any test helper that needs config.
- The ring already logs `console.error("[ring] could not create a WebGL context:", err)` on failure, which the smoke test's console-error rule will catch.

### Established Patterns
- Fonts are looked up by literal family string in `params.js`, `gui.js` and `globals.css`; a mismatch silently falls back to system sans.
- New tunables are params with dev-panel controls wired to `refit`, `styleMeta`, `replay` or `rebuildText` per AGENTS.md.
- Prettier defaults, no config file; 17 files currently unformatted.
- Several dev servers run on this Mac (ALMAR, Vamos 4330, Houssam 3200): never pattern-kill; stop only the port the test started.

### Integration Points
- `package.json` scripts: add `test` (and `format`).
- `app/globals.css` `@font-face` blocks, plus the three CSS modules and `Carousel.jsx` inline style.

</code_context>

<specifics>
## Specific Ideas

- Koussay wants Yousuf credited as "the original idea person": he open-sourced the animation and Koussay built on top of it.
- The heading should keep PP Neue Montreal's airy, light feel at display size.

</specifics>

<deferred>
## Deferred Ideas

- **Hosting move to Cloudflare Workers** — added to the roadmap as Phase 3.1 on 2026-10-03 with Koussay's sign-off (PLAT-01 promoted to v1). Not Phase 1 work.

</deferred>

---

*Phase: 01-baseline-and-licence-hygiene*
*Context gathered: 2026-10-03*

## Addendum after research (2026-10-03, Koussay)

- **D-23:** The cursor tag's arrow is drawn in code in `components/ring/tag.js` with the same geometry; `public/arrow-top-right-svgrepo-com.svg` is deleted (its licence could not be confirmed).
- **D-24:** For the formatting-only commit, an AST-equivalence check (espree, `astDiff: 0` on every changed file) replaces the preview booking that the cross-phase rule otherwise requires for booking files. Any non-formatting change to booking code still needs a preview booking.
- **D-25:** The heading and cursor-tag fonts are loaded explicitly (`document.fonts.load(...)`) before the canvas measures or rasterises them, since `document.fonts.ready` ignores canvas-only faces (reproduced in research).
