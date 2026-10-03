# Phase 1: Baseline and licence hygiene - Pattern Map

**Mapped:** 2026-10-03
**Files analyzed:** 27 new/modified (plus deletions)
**Analogs found:** 17 / 27 (the rest are docs, binary assets or one-off commands where no code analog applies)

Line numbers are from the tree at `f79a7da`. Prettier will reflow some files in commit 1, so re-grep before quoting line numbers in a plan that runs after the baseline.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `package.json` (scripts, devDeps) | config | n/a | itself (`package.json` scripts block) | exact |
| `.prettierignore` | config | n/a | `.gitignore` | role-match |
| `.git-blame-ignore-revs` | config | n/a | none | no analog |
| `.gitignore` (edit) | config | n/a | itself | exact |
| `eslint.config.mjs` (edit) | config | n/a | itself (`globalIgnores`) | exact |
| `playwright.config.mjs` | config | n/a | `next.config.mjs` (ESM default export config) | partial; use RESEARCH §3 |
| `tests/smoke.spec.mjs` | test | request-response | none in repo (no tests exist) | no analog; use RESEARCH §4 |
| `public/fonts/*.woff2`, `OFL.txt` | static asset | n/a | none | no analog |
| `app/globals.css` (@font-face + font-family) | config (CSS) | n/a | itself lines 3-41 | exact |
| `app/layout.js` (font preload) | component | request-response (SSR) | itself | role-match |
| `app/booking/page.module.css`, `app/project/[slug]/page.module.css` | CSS module | n/a | themselves | exact |
| `components/ring/params.js` (font strings, `nameTracking`, `textTracking` default) | config | n/a | `textTracking` line 146 | exact |
| `components/ring/gui.js` (dropdown, `nameTracking` control) | utility (dev UI) | event-driven | `onMeta(...)` and `textTracking` control | exact |
| `components/ring/meta.js` (apply `nameTracking`) | utility | transform (params to DOM styles) | `style()` lines 160-228 | exact |
| `components/ring/tag.js` (draw arrow in code) | utility | file-I/O to transform (canvas raster) | itself (`build`, `load`) | exact |
| `components/ring/splitText.js` | utility | transform | unchanged (follows params) | n/a |
| `components/Carousel.jsx` (font gate, `tag.load` removal, inline `"Satoshi"`) | component | event-driven | itself lines 1633-1665 | exact |
| `lib/env.js` (delete 5 accessors) | utility | n/a | itself | exact |
| `LICENSE`, `README.md`, `BREAKDOWN.md`, `AGENTS.md` | docs | n/a | existing text | exact |
| Deletions: `components/TwoPlaneMorph.jsx`, `shader`, `scripts/seed-notion-projects.mjs`, 4 font files, arrow SVG, `.agents/skills/` (untrack) | n/a | n/a | n/a | n/a |

## Pattern Assignments

### `components/ring/params.js` (config)

**Analog:** `textTracking` and the meta block, same file.

**Existing shape** (lines 140-171):
```js
    text: "Works '26",
    textSize: 41,
    textFont: "PP Neue Montreal",
    textWeight: 400,
    textTracking: 0, // em
...
    nameSize: (24 / 1440) * 100, // vw, quoted at 1440
    nameFont: "Satoshi",
    nameWeight: 500,
    idxSize: (16 / 1440) * 100, // a step lighter and smaller than the name
    idxFont: "Geist",
    idxWeight: 400,
```
**Apply:** `textFont: "Geist"`, `textWeight: 300`, `textTracking` retuned (start -0.02); `nameFont: "Geist"`; `idxFont: "Geist Mono"`; add `nameTracking: -0.02, // em` directly after `nameWeight`. Same inline `// em` unit comment style. Also `tagArrow: 14, // px, the svg in /public` (line 225): reword, the svg is going. `WEIGHTS` (line 17) already has Light/Regular/Medium/Semibold; no change.

---

### `components/ring/gui.js` (dev UI, event-driven)

**Analog:** same file.

**Tracking control wired to `rebuildText`** (lines 146-149), the heading analog:
```js
  text
    .add(params, "textTracking", -0.1, 0.4, 0.005)
    .name("tracking (em)")
    .onChange(rebuildText);
```
**Meta helper that wires `styleMeta`** (lines 163-175), copy for `nameTracking`:
```js
  const onMeta = (k, lo, hi, step, label) =>
    meta.add(params, k, lo, hi, step).name(label).onChange(styleMeta);
  ...
  meta.add(params, "nameWeight", WEIGHTS).name("name weight").onChange(styleMeta); // prettier-ignore
```
**Apply:** add `onMeta("nameTracking", -0.1, 0.1, 0.001, "name tracking (em)");` after the `nameWeight` line. `styleMeta` is correct per AGENTS ("anything the DOM labels are sized from"); do not use `refit` or `replay`.

**Font dropdown** (lines 140-144), D-07: change the list only.
```js
  text
    // Only families with an @font-face block in globals.css — anything else
    // silently falls back to system sans and looks like a bug.
    .add(params, "textFont", ["PP Neue Montreal", "Satoshi", "Geist"])
```
becomes `["Geist", "Geist Mono"]`. `textWeight` control at line 145 is `{ Light: 300, Regular: 400 }`; the default moves to 300 so keep Light available. The `// prettier-ignore` suffix on long lines stays.

---

### `components/ring/meta.js` (transform: params to DOM styles)

**Analog:** `style()`, same file.

**How faces/weights are applied** (lines 166-169, 220-232):
```js
    const bigFace = `"${params.nameFont}", ui-sans-serif, system-ui, sans-serif`;
    const smallFace = `"${params.idxFont}", ui-sans-serif, system-ui, sans-serif`;
    const bigWeight = `${params.nameWeight}`;
    const smallWeight = `${params.idxWeight}`;
...
        const [lead, trail] = row.children;
        lead.style.fontFamily = isRight ? bigFace : smallFace;
        lead.style.fontSize = isRight ? big : small;
        lead.style.fontWeight = isRight ? bigWeight : smallWeight;
        trail.style.fontFamily = isRight ? smallFace : bigFace;
        trail.style.fontSize = isRight ? small : big;
        trail.style.fontWeight = isRight ? smallWeight : bigWeight;
```
**Apply (RESEARCH §7):** add `const bigTrack = \`${params.nameTracking}em\`;` beside `bigWeight`, and in the same loop (it already covers all three rows via `[...g.layers, g.plain]`):
```js
        lead.style.letterSpacing = isRight ? bigTrack : "";
        trail.style.letterSpacing = isRight ? "" : bigTrack;
```
This direction matches the face lines above (on the right the lead is the big span; on the left the trail is). The empty string lets the small span inherit the wrapper's `tracking-[-0.01em]` (`Carousel.jsx:2056`). Do not edit the meta.js doc block.

---

### `components/ring/tag.js` (D-23, draw arrow in code)

**Analog:** itself. Current load-and-draw path.

**Image state and load** (lines 23-25, 76-82):
```js
  const arrow = new Image();
  let arrowReady = false;
  ...
  const load = (onReady) => {
    arrow.onload = () => {
      arrowReady = true;
      onReady?.();
    };
    arrow.src = "/arrow-top-right-svgrepo-com.svg";
  };
```
**Draw** (lines 36-52):
```js
    ctx.font = `${params.tagWeight} ${params.tagSize}px "${params.textFont}", ui-sans-serif, system-ui, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    const w = ctx.measureText(params.tagText).width;
    const run = params.tagArrow + params.tagGap + w;
    const x0 = (TAG_W - run) * 0.5;
    ctx.fillText(params.tagText, x0 + params.tagArrow + params.tagGap, TAG_H * 0.5);
    if (arrowReady) {
      const y = (TAG_H - params.tagArrow) * 0.5;
      ctx.drawImage(arrow, x0, y, params.tagArrow, params.tagArrow);
    }
```
**Source geometry** (`public/arrow-top-right-svgrepo-com.svg`): `viewBox="0 0 20 20"`, stroke 2, round caps and joins, path `M4.343 15.657L15.657 4.343m0 0v9.9m0-9.9h-9.9`. That is three segments: (4.343,15.657)->(15.657,4.343); (15.657,4.343)->(15.657,14.243); (15.657,4.343)->(5.757,4.343).

**Apply:** replace the `if (arrowReady)` block with a stroke in the same box, scaled `k = params.tagArrow / 20`:
```js
    const k = params.tagArrow / 20;
    ctx.save();
    ctx.translate(x0, (TAG_H - params.tagArrow) * 0.5);
    ctx.scale(k, k);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(4.343, 15.657); ctx.lineTo(15.657, 4.343);
    ctx.moveTo(15.657, 4.343); ctx.lineTo(15.657, 14.243);
    ctx.moveTo(15.657, 4.343); ctx.lineTo(5.757, 4.343);
    ctx.stroke();
    ctx.restore();
```
Only alpha is used (file header comment), so colour is irrelevant. Remove `arrow`, `arrowReady`, and `load` from the returned object (line 89 `return { box, build, show, load, dispose }`). The `ctx.scale(dpr, dpr)` at line 35 stays; `save/restore` keeps it intact. Skip the `tagArrow === 0` case cleanly (it is a GUI range 0-40, `gui.js:247`): guard with `if (params.tagArrow > 0)`.

**Caller to edit:** `components/Carousel.jsx` lines 1633-1636:
```js
    tag.build();
    tag.load(() => {
      if (!disposed) tag.build();
    });
```
becomes just `tag.build();` (no async image, so no second build). Keep the `build` call because `startEntry` rebuilds after fonts anyway.

---

### `components/Carousel.jsx` (D-25, font gate)

**Analog:** itself, `startEntry` (lines 1652-1665).
```js
    const startEntry = () => {
      if (disposed || tl) return;
      splitText.build();
      tag.build();
      styleMeta();
      replay();
    };

    // fonts.ready is reliable, but nothing here is worth a permanently blank
    // page if it ever is not.
    const fontFallback = setTimeout(startEntry, 3000);
    (document.fonts?.ready ?? Promise.resolve())
      .then(startEntry)
      .catch(startEntry);
```
**Apply (RESEARCH §6):** keep `startEntry`, the 3 s `fontFallback` and its `clearTimeout(fontFallback)` at line 1918. Replace only the `fonts.ready` chain with `Promise.all(faces.map((f) => document.fonts?.load(f) ?? Promise.resolve()))` where `faces` are built from live params (`textWeight`/`textFont`, `tagWeight`/`textFont`, `nameWeight`/`nameFont`, `idxWeight`/`idxFont`), same `.then(startEntry).catch(startEntry)`. Update the comment above it: `fonts.ready` ignores canvas-only faces. Descriptors need a size token: `` `${w} 1em "${family}"` ``.

Other `Carousel.jsx` font touch: inline `"Satoshi"` at ~line 1983 (project list `<ul>` style) becomes `"Geist"`.

**Other dev-panel rebuild paths** (lines ~1688-1691) already call `splitText.build()` / `tag.build()` via `rebuildText`/`rebuildTag`; unchanged.

---

### `app/globals.css` (@font-face)

**Analog:** itself, lines 3-41 (4 blocks: Satoshi x2, Geist ttf, PP NM).

**Block shape to keep** (lines 25-31):
```css
@font-face {
  font-family: "Geist";
  src: url("/Geist-Regular.ttf") format("truetype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```
**Apply:** two blocks, `"Geist"` and `"Geist Mono"`, `src: url("/fonts/<file>.woff2") format("woff2")`, `font-weight: 100 900;`. Full text is in RESEARCH §5. Keep the lead comment (lines 3-4) but reword; drop the "Book is the only cut" and Satoshi comments (lines 6-7, 33-34). Then update each `font-family` per the RESEARCH Pattern 2 table (globals.css lines 133, 146, 154, 177, 235, 426; booking CSS 66, 549, 770, 955; project CSS 11, 115, 273). Verify with the HYG-02 grep in RESEARCH Validation.

---

### `app/layout.js` (font preload)

**Analog:** itself. Imports are `import "./globals.css";` first, then Next/React, then `@/` aliases (lines 1-18). No `<head>` exists yet in this file's visible part; read the `RootLayout` return before editing. Use React 19 `preload` from `react-dom` or a literal `<link rel="preload" as="font" type="font/woff2" crossOrigin="anonymous">` for `Geist-Variable.woff2` only.

---

### `package.json`

**Analog:** itself.
```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "devDependencies": {
    "@higgsfield/client": "^0.2.6",
    "@tailwindcss/postcss": "^4",
    "eslint": "^9",
    "eslint-config-next": "16.3.8",
```
**Apply:** add `"format": "prettier --write ."`, `"format:check": "prettier --check ."`, `"test": "playwright test"`. Note convention: existing deps use carets, but `next`, `react`, `eslint-config-next` are exact; RESEARCH asks for exact pins on the two new devDeps (`npm install -D --save-exact`). Keep keys alphabetical in `devDependencies` (npm does this). Commit 1 adds prettier only; Playwright arrives in commit 3.

---

### `eslint.config.mjs` and `.gitignore` (ignores)

**ESLint analog** (lines 7-13):
```js
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
```
**Apply:** append `"playwright-report/**"`, `"test-results/**"` with a short comment line (`// Playwright output`), same quoting. Flat config does not read `.gitignore`.

**`.gitignore` conventions:** section comment then rule, leading slash for root dirs (`/node_modules`, `/.next/`, `/coverage`, `/build`), trailing slash for dirs (`.media-probe/`). Lines 27-28 are the stale PP Neue Montreal comment: rewrite to a Geist/OFL note or delete. Add:
```
# playwright
/playwright-report/
/test-results/

# third-party agent skills; skills-lock.json restores them
/.agents/skills/
```
Remember `git rm -r --cached .agents/skills` (rule alone does not untrack). `skills-lock.json` must not be ignored.

**`.prettierignore`** has no existing file; content is RESEARCH §1 (`.planning/`, `CLAUDE.md`, `.agents/`, `playwright-report/`, `test-results/`). Prettier 3 already honours `.gitignore`.

---

### `playwright.config.mjs` and `tests/smoke.spec.mjs` (test)

No analog: the repo has no tests (CLAUDE.md "None. No test runner"). Use RESEARCH §3 and §4 verbatim, with these repo conventions applied:
- ESM `.mjs`, double quotes, semicolons, Prettier-formatted (commit 1 precedes, so run `npx prettier --write` on them).
- Bracketed-tag logging is for app code; tests do not log.
- Port 3100 (not 3000/3200/4330); never `pkill`, stop by port only.
- Style analog for a root-level ESM config: `next.config.mjs` and `eslint.config.mjs` (`export default defineConfig(...)`).
- Confirm selectors before asserting (RESEARCH A4): `components/book/BookFlow.jsx` first step, `components/project/ProjectHero.jsx` `<h1>`, `.ring-stage canvas`, `[data-loader-count]`.

---

### `lib/env.js` (delete dead accessors)

**Analog:** itself. Pattern is one tiny named function per variable via `trim()` (lines 1-25). Delete `higgsfieldKeyId`, `higgsfieldKeySecret`, `r2PublicBase`, `isHiggsfieldConfigured`, `isR2Configured` (lines ~60-78). Leave the rest untouched; scripts read env through `scripts/lib/load-env.mjs`.

---

### Docs: `LICENSE`, `README.md`, `BREAKDOWN.md`, `AGENTS.md`

No code analog. Edits are specified in CONTEXT D-09..D-16 and RESEARCH Pattern 5 (stale line numbers listed there). AGENTS.md stale spots seen in this read: Commands block line 25-30 ("There are no tests" becomes false after commit 3), Known gap 2 (lines 200-202), "This is a public repo" font paragraph (lines 223-228), family-name rule (lines 238-242, keep the rule, update names), "Dead files" (lines 244-248, remove after deletion). The Layout block mentions `projects.js` as eighteen projects and `tag.js` as the "View" tag (still true).

## Shared Patterns

### Font family strings are looked up by name in three places
**Source:** `components/ring/params.js` (144, 166, 169), `components/ring/gui.js` (142), `app/globals.css` (+ two CSS modules).
**Apply to:** every font edit. Literal `"Geist"` and `"Geist Mono"` only, must match a `@font-face` `font-family`. No `next/font` (D-07). Canvas strings always carry the fallback tail `, ui-sans-serif, system-ui, sans-serif` (`splitText.js:34`, `tag.js:36`, `meta.js:166-167`); keep it.

### New tunable = param + control + right onChange
**Source:** `AGENTS.md` Conventions, `components/ring/gui.js` header doc.
**Apply to:** `nameTracking`. `styleMeta` for DOM labels; `rebuildText` for heading canvas; `rebuildTag` for tag canvas.

### Canvas-only faces need an explicit load
**Source:** `components/Carousel.jsx:1652-1665` (the pattern to extend).
**Apply to:** the one `startEntry` gate; `splitText.build()` and `tag.build()` stay inside `startEntry`.

### Formatting and commit order
**Source:** RESEARCH Pattern 1. Prettier defaults, no config file; the baseline is its own commit and its SHA goes in `.git-blame-ignore-revs` in the next commit. New and edited files after that must pass `npm run format:check`. Do not reformat `CLAUDE.md` or `.planning/`.

### Comments explain why, short
**Source:** CLAUDE.md Conventions. Match the existing tone, e.g. the `fontFallback` and `// Cleared rather than set...` comments. No `console.log` in app code.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `tests/smoke.spec.mjs`, `playwright.config.mjs` | test | request-response | Repo has no test files or runner; use RESEARCH §3-4 |
| `.git-blame-ignore-revs` | config | n/a | New file type; one full 40-char SHA, optional `#` comment |
| `public/fonts/*.woff2`, `OFL.txt` | asset | n/a | Binary assets from `npm pack geist@1.7.2`; verify SHA-256 listed in RESEARCH |
| AST-equivalence check (RESEARCH §2) | one-off script | transform | Not committed; run from a temp dir |

## Metadata

**Analog search scope:** `components/ring/`, `components/Carousel.jsx`, `app/globals.css`, `app/layout.js`, `lib/env.js`, `package.json`, `eslint.config.mjs`, `.gitignore`, `public/arrow-top-right-svgrepo-com.svg`, `skills-lock.json`.
**Files scanned:** about 15 (targeted reads plus grep).
**Pattern extraction date:** 2026-10-03
