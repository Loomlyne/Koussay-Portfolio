# Phase 3: Notion projects path removed - Research

**Researched:** 2026-10-04
**Domain:** Next 16.3.8 dead-code removal, authoring-time share-image rendering (sharp + glyph paths), booking regression proof, Vercel env cleanup
**Confidence:** HIGH (font probe, Next metadata behaviour, removal inventory all verified on this machine); MEDIUM on two items flagged in the Assumptions Log

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Share images (Open Graph and Twitter)**
- **D-01:** Each project's share image is its cover, cropped to 1200×630, with text bottom-left in white Geist on a soft dark gradient so it reads on any cover.
- **D-02:** Project share text is three parts on two lines: the project name, then `<type> · Koussay Zayani` (e.g. "Fido Homes" / "Brand & Web · Koussay Zayani").
- **D-03:** The type line uses the project's existing `type` label as written. Claude may propose clearer share wording per project; proposals are shown beside the current label in the design pictures (D-07), and only labels Koussay approves there are used. Otherwise the current label stays. Nothing is invented without his approval.
- **D-04:** The home page share image is the cover of the project at the front of the ring (first in `ORDER`), in the same layout, with the text "Koussay Zayani" / "Creative developer and brand designer". That second line is `SITE_DESCRIPTION`'s opening words in `lib/site.js`, verbatim.
- **D-05:** The booking page share image stays as today: the logo centred on the light grey background, saved once as a static PNG. No text is added.
- **D-06:** All share images are rendered at authoring time by the media script (sharp in the script, never at request time), uploaded to R2 under content-addressed immutable keys and recorded in `content/media.json` (or a static file for booking). Page metadata points at them with width and height. No request runs `sharp`, and no share image falls back to the logo (carries Phase 2 D-07).
- **D-07:** Design before code. Before the plan is executed, Claude renders real 1200×630 PNGs for two projects and the home page (plus any proposed type labels), and Koussay signs them. Code that ships the share images waits for that signature.

**Booking proof**
- **D-08:** The booking test runs on the finished build served locally on `localhost:3100` with Koussay's real booking keys from `.env.local`, before ship. Koussay books once in the T3 browser panel and confirms the Notion row, the Notion Calendar entry, and both Resend emails (visitor and owner). This replaces the roadmap's "preview deployment" wording, because Vercel previews are protected and Koussay does no Vercel steps.
- **D-09:** The test booking is named so it's easy to find (e.g. "TEST — Phase 3"). Claude never deletes it; after Koussay confirms the test, Claude gives him one numbered step to delete the row himself.
- **D-10:** Blocked time is proven read-only by Claude: pick a date already blocked in the calendar and show the availability API hides those slots. No test block is created.

**Old addresses and dead config**
- **D-11:** Old `/api/media/...` addresses return a plain 404 once the route is deleted. No redirect map.
- **D-12:** The Notion webhook subscription is deleted by Koussay in Notion's integration settings, as one numbered step after ship. Until then it calls a 404 and does nothing.
- **D-13:** Claude removes `NOTION_PROJECTS_DATABASE_ID` and `NOTION_WEBHOOK_SECRET` from Vercel itself with the `vercel` CLI. Koussay does no Vercel step. They also leave `.env.example`, the README env table and Quick start, and `lib/env.js`.

### Claude's Discretion
- Whether the dead `cachedDataSourceId` export and the `CmsLive` comment are removed from `lib/notion/client.js`. Success criterion 1 requires `unstable_cache` to be gone, and the export is used only by `lib/notion/projects.js`. Removing it is allowed, and the D-08 booking test covers it.
- Fate of `lib/media.js` slot grammar, `lib/notion/props.js` (booking still imports `findProp`, `plainText`, `rich`, `textOf`, `dateRangeOf`, so keep what booking uses) and `robots.js` disallow entries for removed routes.
- Whether `revalidate = 60` is removed from pages now that content changes only through deploy (research recommends deleting).
- Gradient strength, type sizes and exact text placement within D-01, settled in the D-07 pictures.
- Image format of share renditions (PNG or JPEG), keeping them small enough for WhatsApp and LinkedIn scrapers.

### Deferred Ideas (OUT OF SCOPE)
- Deleting the Notion projects database or its rows: not planned (carried from Phase 2).
- Share images follow automatically when Phase 7 replaces covers and types: re-run the script, no new design.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEDIA-07 | OG and Twitter images pre-rendered by the script and served as static files; no `sharp` at request time | Sections "Share-image rendering" (glyph-path method proven), "Metadata wiring" (Next merges `twitter.images` from `openGraph.images`), "Manifest shape" |
| MEDIA-08 | Notion projects path deleted; deps uninstalled; `sharp` out of `dependencies` | "Removal inventory" (every file, export, config key, doc line, with grep evidence), "sharp after removal" |
| MEDIA-09 | Bookings and blocked time keep working; dead Vercel env vars removed; webhook deleted | "Booking is untouched" import map, "Booking proof procedure", "Vercel env removal" |
</phase_requirements>

## Summary

Phase 2 already did most of the groundwork. Pages are static (`dynamicParams = false`, no `revalidate` export on `app/page.js`, `app/project/[slug]/page.js` or `app/llms.txt/route.js`), `CmsLive` is unmounted, `/api/cms-stamp` already returns an empty stamp, and nothing in `app/`, `components/` or `lib/content*.js` imports `lib/notion/projects.js`, `lib/pdf.js`, `lib/media.js` or `lib/cms/bust.js`. The only remaining importers of the doomed code are the doomed files themselves (`app/api/media/[...parts]/route.js`, `app/api/revalidate/route.js`, `lib/notion/gallery-pdf.js`). So the removal half of the phase is a pure delete with no refactor. [VERIFIED: git grep]

The one piece of real engineering is the share images. The tempting route (sharp `text` input with `fontfile`) does not work on this machine: libvips logs `Fontconfig error: Cannot load default config file`, silently ignores `fontfile`, and renders Helvetica. This was proven by a control (a nonexistent font name rendered with the same Geist TTF gives identical widths, 266 px, as "Geist"). The reliable method is glyph-to-SVG-path conversion with `fontkit` from the static Geist TTFs in the `geist` npm package, composited by sharp. It needs no fontconfig, no system font, no committed TTF, and produced a correct 1200x630 card (75 KB JPEG) in the probe. [VERIFIED: probe in /tmp/ogprobe]

Booking code is not touched. Everything booking imports (`notion`, `dataSourceId`, `findProp`, `plainText`, `rich`, `textOf`, `dateRangeOf`, env accessors) survives. The proof procedure needs one non-obvious thing: `npm test` starts its own server with the booking keys blanked on port 3100 (`reuseExistingServer: false`), so the real-key proof server must be started by hand after the test run, on the same port, and stopped by port afterwards.

**Primary recommendation:** Do the deletions and dependency changes in one plan with no design dependency; in a second plan build the `share` command in `scripts/media.mjs` with a `--preview` mode (writes to gitignored `.media-probe/`, no R2, no manifest) and stop for Koussay's D-07 signature; only then render, upload and wire the images, validate `og` in the build, and run the booking proof.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Share-image rendering (crop, gradient, text) | Authoring script (`scripts/media.mjs`, Node) | — | D-06: never at request time; output is an immutable R2 object |
| Share-image hosting | CDN / Static (R2 at media.koussay.online) | — | Content-addressed, immutable, already the media host |
| Share-image URL + size in page metadata | Frontend Server (SSG `generateMetadata`) | — | Read from the manifest at build; static HTML |
| Share-image build gate (missing or stale `og`) | Build (`lib/content-schema.mjs`, pure) | `scripts/check-content.mjs` | Phase 2 D-10: the build is the safety net |
| Booking page share image | CDN / Static (Next static file convention) | — | `app/booking/opengraph-image.png`, no code |
| Booking submit and availability | API / Backend (`app/api/book/*`) | Database / Storage (Notion) | Unchanged |
| Booking email | API / Backend | Resend | Unchanged |
| Removed Notion projects path | — (deletion) | — | Nothing replaces it; content is repo modules |

## Standard Stack

### Core (already present, kept)
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| next | 16.3.8 (installed, pinned) | App Router, metadata API | `openGraph.images` and `twitter.images` inherit as documented below [VERIFIED: node_modules/next/dist/lib/metadata/resolve-metadata.js] |
| sharp | move to devDependencies, `^0.35.5` (registry latest 0.35.5) | Crop, composite, JPEG encode in the script | Next already carries its own optional `sharp ^0.35.4` [VERIFIED: node_modules/next/package.json, `npm ls sharp`] |
| @notionhq/client, resend | unchanged | Bookings | Out of scope |

### New devDependencies (authoring only)
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| fontkit | `^2.0.4` (npm modified 2026-09-30, MIT, foliojs, ~19.7M downloads/week) | Shape text and read glyph outlines from a TTF; emit SVG path data | Pure JS, no fontconfig, handles kerning (GPOS) [VERIFIED: probe] |
| geist | `1.7.2` (Vercel, OFL, repo vercel/geist-font, ~3.1M downloads/week) | Ships static `Geist-Bold.ttf`, `Geist-Regular.ttf`, `Geist-Medium.ttf`, `Geist-SemiBold.ttf` | Gives fontkit a TTF without committing one. Its `Geist-Variable.ttf` has byte-identical `glyf`, `gvar`, `fvar` and `name` tables to the committed `public/fonts/Geist-Variable.woff2` [VERIFIED: fontTools md5 compare] |

`geist` declares a peer dependency on `next`; `next` is installed, so no extra install flag is needed. The package is about 8 MB unpacked and is never bundled or served.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fontkit glyph paths | sharp `text` input with `fontfile` | **Rejected, proven broken here.** libvips cannot load the default fontconfig config, `fontfile` is ignored, Helvetica renders. A woff2 `fontfile` is also ignored. Would work on a machine with a fontconfig config, so it would pass on one laptop and fail on another |
| fontkit glyph paths | SVG `<text>` with `@font-face` | librsvg ignores `@font-face` and woff2 |
| `geist` package TTFs | Convert the committed woff2 to TTF in a temp file with Python fontTools | Needs Python plus fonttools on every authoring machine, and fontkit's `getVariation` fails on the woff2 (null glyphs) but works on the decompressed TTF, so a conversion step is unavoidable. The package avoids it |
| `geist` package | Commit a TTF | Forbidden: Phase 1 rule, `git ls-files` lists no `.ttf` or `.otf` (currently 0) |
| `next/og` ImageResponse | — | Request-time rendering; contradicts D-06; cannot take WebP covers [CITED: .planning/research/STACK.md line 219] |

**Installation:**
```bash
npm uninstall @napi-rs/canvas pdfjs-dist unpdf
npm install -D sharp@^0.35.5 fontkit@^2.0.4 geist@1.7.2
```
`npm install -D sharp` moves it out of `dependencies`. Afterwards `npm ls sharp` should show one top-level 0.35.x deduped under next.

**Version verification (run 2026-10-04):** `npm view sharp version` = 0.35.5; `npm view fontkit version` = 2.0.4; `npm view geist version` = 1.7.2 (published 2026-06-01).

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| fontkit | npm | years (foliojs, devongovett) | ~19.7M/wk | github.com/foliojs/fontkit | [OK] | Approved |
| sharp | npm | years (lovell) | very high | github.com/lovell/sharp | [OK] | Approved (already a dependency) |
| geist | npm | years (Vercel) | ~3.1M/wk | github.com/vercel/geist-font | not run by slopcheck (the CLI `install` mode takes no `--json` and installs; run in a temp dir only for fontkit and sharp) | Approved on registry evidence; `[ASSUMED]` per package-provenance rule until `slopcheck` is run on it in the plan's first task |

No `postinstall` script on fontkit (`npm view fontkit scripts.postinstall` empty) or geist (scripts are only changeset `version` and `release`).

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged [SUS]:** none. Planner: add one task step `slopcheck install geist` run in a temp directory (not the repo) before `npm install -D geist`.

## Architecture Patterns

### System Architecture Diagram

```
AUTHORING (Koussay's Mac, never at request time)
  content/projects/*.mjs ──┐
  content/media.json cover ─┼─> scripts/media.mjs share
  (cover.url + sha256)      │     1. fetch cover from R2, check sha256 = manifest
  lib/site.js (home text)  ─┘     2. sharp: resize 1200x630 cover-crop
  geist TTF (node_modules) ──>    3. fontkit: text -> SVG paths (bold name, regular type line)
                                  4. sharp: composite gradient + paths, JPEG q86
          --preview ──> .media-probe/share/*.jpg (gitignored, no R2, no manifest)   [D-07 pictures]
          default   ──> PUT projects/<slug>/og-<sha8>.jpg (immutable) ──> read back via public host
                        └─> write content/media.json: projects.<slug>.og, site.home   (script is sole writer)
          booking   ──> app/booking/opengraph-image.png (+ .alt.txt), committed once

BUILD (next build)
  lib/content-schema.mjs validates og present, under the slug prefix, width/height, inputs hash fresh
        └─ missing or stale og  =>  build fails "[content] <slug>.og: ..."
  generateMetadata (page.js, project/[slug]/page.js, layout.js) reads project.og / site.home
        └─ <meta og:image + width + height + alt>, twitter:image inherited from openGraph.images

REQUEST (visitor or scraper)
  GET /project/fido-homes (static HTML) ──> og:image = https://media.koussay.online/projects/fido-homes/og-xxxxxxxx.jpg
  scraper GET og:image ──> Cloudflare R2 (no Vercel function, no sharp)
```

### Recommended Project Structure
```
scripts/
├── media.mjs              # add `share` command (preview, render, upload, booking)
└── lib/share.mjs          # NEW: render function (sharp + fontkit); imported only by media.mjs
lib/
├── share.mjs              # NEW, PURE: LAYOUT_VERSION, shareLines(project), homeLines(), inputsHash(...)
├── content-schema.mjs     # validate og entries + staleness
├── content.js             # expose project.og and getHomeShare()
└── seo.js                 # projectOgImage -> project.og.url; delete shareImages/projectShareImage
app/booking/opengraph-image.png        # NEW static file (+ opengraph-image.alt.txt)
```
`lib/share.mjs` must be pure (no node:fs, no sharp, no app imports) because both `lib/content-schema.mjs` (build) and `scripts/media.mjs` import it, the same constraint `content-schema.mjs` already states.

### Pattern 1: Glyph-path text (verified working)
**What:** Lay out text with fontkit, convert each glyph outline to an SVG `<path>`, composite as one SVG over the cropped cover.
**When to use:** Any authoring-time text raster that must be Geist on every machine.
**Example (tested, 75,447-byte JPEG for Fido Homes):**
```js
// Source: probe /tmp/ogprobe/e.mjs, fontkit 2.0.4, sharp 0.35.5
import * as fontkit from "fontkit";
import sharp from "sharp";
const dir = "node_modules/geist/dist/fonts/geist-sans/";
const bold = fontkit.openSync(`${dir}Geist-Bold.ttf`);
const reg = fontkit.openSync(`${dir}Geist-Regular.ttf`);

function line(font, text, size, x, y, tracking = 0) {
  const run = font.layout(text);               // kerning + shaping
  const s = size / font.unitsPerEm;
  let pen = x, d = "";
  run.glyphs.forEach((g, i) => {
    const p = g.path.scale(s, -s).translate(pen, y).toSVG(); // flip y axis
    if (p) d += `<path d="${p}"/>`;
    pen += run.positions[i].xAdvance * s + tracking;
  });
  return { d, width: pen - x };
}

const W = 1200, H = 630, PAD = 64;
const name = line(bold, "Fido Homes", 76, PAD, H - PAD - 44, -1.5);
const sub = line(reg, "Brand & Web · Koussay Zayani", 30, PAD, H - PAD);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
<stop offset="0.35" stop-color="#000" stop-opacity="0"/>
<stop offset="1" stop-color="#000" stop-opacity="0.78"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#g)"/><g fill="#fff">${name.d}${sub.d}</g></svg>`;
const out = await sharp(coverBuffer)
  .resize(W, H, { fit: "cover", position: "centre" })
  .composite([{ input: Buffer.from(svg) }])
  .jpeg({ quality: 86, mozjpeg: true })
  .toBuffer();
```
Measured text widths at 76 px Bold: Almar Private Journey 827, Élysée Home Design 751 (É renders, no missing glyph), PIXENHOUSE 491, all under the 1072 px text box (1200 minus 2x64 padding). The `·` (U+00B7) and `&` exist in Geist. Guard anyway: throw if any `glyph.id === 0` (notdef), and shrink the name size until it fits 1072 px. The home type line "Creative developer and brand designer" is 1 line at 30 px (the full "…· Koussay Zayani" form is 760 px).

### Pattern 2: Manifest `og` rendition, written only by the script
**What:** One entry per project plus one for home, same shape as `cover`:
```json
"fido-homes": {
  "cover": { "...": "unchanged" },
  "og": {
    "key": "projects/fido-homes/og-1a2b3c4d.jpg",
    "url": "https://media.koussay.online/projects/fido-homes/og-1a2b3c4d.jpg",
    "type": "image/jpeg", "width": 1200, "height": 630,
    "bytes": 75447, "sha256": "<of the JPEG>",
    "inputs": "<sha256 of JSON [LAYOUT_VERSION, cover.sha256, line1, line2]>"
  },
  "gallery": {}
},
"site": { "home": { "...same shape, key projects/_site/og-home-<sha8>.jpg": "" } }
```
Existing entries use `width`/`height` (not `w`/`h`) and `sha256`, so `entryProblem()` in `lib/content-schema.mjs` works unchanged for `og`. Home lives under a new top-level `site` key so the existing "manifest slug not in project list" check (which iterates `manifest.projects` only) is not tripped. `scripts/media.mjs verify` iterates `manifest.projects` cover+gallery only; extend it to `og` and `site.home`.

**Idempotence and `--force`:** skip a target when `entry.inputs === computedInputs` unless `--force`. This is what lets Phase 7 re-run with no new design: new cover sha or new name or type changes `inputs`, the script re-renders, writes a new content-addressed key, and orphans the old object harmlessly (same rule as ARCHITECTURE.md). Unlike the current "slot already recorded" gate, it detects a stale card.

**Build gate:** `lib/content-schema.mjs` recomputes `inputsHash(project, cover.sha256)` (pure, from `lib/share.mjs`) and fails with `[content] <slug>.og: stale, run: node scripts/media.mjs share --only=<slug>`; a missing `og` fails with `[content] <slug>.og: missing`. This matches Phase 2 D-10 and catches a copy edit that was not re-rendered. Home: pass `{ site: { name, tagline } }` into `resolveContent` options, or have `lib/content.js` check `site.home.inputs` against ORDER[0] cover sha plus `SITE_NAME` and the tagline. `scripts/check-content.mjs` must do the same call so the fast gate and the build agree.

### Pattern 3: Metadata wiring (Next 16.3.8, source read)
- `app/project/[slug]/page.js` `generateMetadata`: add
  `openGraph.images: [{ url: project.og.url, width: 1200, height: 630, alt: shareImageAlt(project) }]`.
  Do NOT also set `twitter.images`. Next's `postProcessMetadata` fills `twitter.images` from `openGraph.images` when `twitter` has no own `images` key (read in `node_modules/next/dist/lib/metadata/resolve-metadata.js`, lines 619-653). Card type stays `summary_large_image` as already set. Verify in the built HTML that `twitter:image` is present.
- `app/page.js` `generateMetadata`: same with `getHomeShare()`.
- `app/layout.js`: its `openGraph` object has no `images`. A page that sets its own `openGraph` replaces the layout's whole object (shallow merge), so the layout value only reaches routes with no own `openGraph` (the 404 page). Add `images: [home]` to the layout `openGraph` so not-found never ships imageless; it is cheap and avoids any logo fallback.
- `app/booking/page.js` keeps its `openGraph` and `twitter` objects with no `images`; the static file convention supplies them. Next documents `opengraph-image.(jpg|jpeg|png|gif)` and an adjacent `opengraph-image.alt.txt`; the file is limited to 8 MB, and the generated tag carries width and height [CITED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md]. The current logo-on-grey card is 1200x630 via `sharp(logo).resize(1200, 630, { fit: "contain", background: {r:244,g:245,b:246,alpha:1} })` (`lib/og-image.js`); reproduce with the same call in the `share --booking` command and commit the PNG (a PNG is correct here: flat colour plus a logo).
- Delete `app/twitter-image.js`, `app/booking/twitter-image.js`, `app/project/[slug]/twitter-image.js` along with the `opengraph-image.js` routes. A `twitter-image` file is only needed to differ from the OG image, which we do not want.
- `lib/seo.js`: `projectOgImage(project)` returns `project.og.url` (was a nonexistent-by-design route `/project/<slug>/opengraph-image/cover`); `projectSchema` keeps using it. `shareImages()` and `projectShareImage()` (in `lib/projects.js`) have no callers (`git grep` shows only their definitions), delete both. `SITE_SHARE_IMAGE` (the logo) stays for the Person, WebSite and ProfessionalService JSON-LD `image` fields; those are structured data, not share images, but flag to Koussay in the verify report so D-06's "never falls back to the logo" is read as covering Open Graph and Twitter only.

### Anti-Patterns to Avoid
- **sharp `text` with `fontfile` or SVG `<text>`:** silently renders Helvetica here. Never trust it without a pixel comparison. If a plan includes a fallback, make the script throw when it detects a missing glyph, not render something else.
- **Committing the TTFs, or serving them:** breaks the Phase 1 rule. They stay under `node_modules/geist`.
- **Rendering the preview through the R2 upload path:** D-07 pictures must not touch R2 or `content/media.json`.
- **Setting `twitter.images` AND relying on files:** redundant; let Next inherit.
- **Leaving the removed files' folders behind:** `app/api/media`, `app/api/cms-stamp`, `app/api/revalidate`, `lib/cms` become empty directories; git ignores them but delete them.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text shaping and kerning | A manual advance-width loop on a font table | fontkit `font.layout()` | GPOS kerning, ligature handling, accent glyphs (É) |
| TTF source for Geist | A woff2 to TTF converter or a committed TTF | `geist` devDependency | Same glyph tables as the served woff2; nothing committed |
| Image crop and encode | Canvas or manual pixel code | sharp (already used by the script) | Already the script's tool |
| HTTP verification of uploads | New fetch helpers | `getPublic`, `checkPublic` in `scripts/media.mjs` (pass `"image/jpeg"` as the content type) | Existing header and sha checks |
| Manifest writes | A second writer | `writeManifest` in `scripts/media.mjs` | Sole-writer rule (Phase 2 D-04) |
| Twitter image fallback | A `twitter-image` route per page | Next's `openGraph.images` inheritance | Verified in Next source |

**Key insight:** every piece of this phase already has a tool in the repo. The new code is one render function, one pure hash module, and validator lines.

## Removal Inventory (grep evidence)

All paths below were produced by `git grep` over the tree excluding `.planning/`, `.claude/` and `package-lock.json`.

### Delete outright
| Path | Notes |
|------|-------|
| `app/api/media/[...parts]/route.js` | Imports sharp, `lib/media`, `lib/notion/projects`, `lib/pdf` |
| `app/api/cms-stamp/route.js` | Returns `{stamp:""}` today |
| `app/api/revalidate/route.js` | Notion webhook; its absence also removes the fail-open cache-bust path |
| `components/CmsLive.jsx` | Not imported (`app/providers.js` already clean) |
| `lib/cms/bust.js` | Only importer is `api/revalidate` |
| `lib/pdf.js`, `lib/media.js`, `lib/notion/gallery-pdf.js`, `lib/notion/projects.js` | `lib/media.js` importers are only the media route, `gallery-pdf`, `projects.js` |
| `lib/og-image.js` | Importers are only the five OG routes |
| `app/opengraph-image.js`, `app/twitter-image.js`, `app/booking/opengraph-image.js`, `app/booking/twitter-image.js`, `app/project/[slug]/opengraph-image.js`, `app/project/[slug]/twitter-image.js` | Replaced by metadata and one static PNG |
| `docs/NEXT-SESSION-PROMPT.md` | Stale session prompt; 12 hits on removed names, would fail success criterion 1. `docs/` also holds three PNGs, keep those |

### Edit
| File | Change |
|------|--------|
| `lib/notion/client.js` | Remove `import { unstable_cache }`, `cachedDataSourceId` (lines 54-60), and the `CmsLive` mention in the comment (line 16). `withTimeout` and `notionPageId`: `git grep` after deletion; remove if no importer (bookings imports only `notion` and `dataSourceId`) |
| `lib/env.js` | Remove `notionProjectsDatabaseId`, `notionWebhookSecret`, `isNotionProjectsConfigured` (the last has no caller anywhere) |
| `lib/notion/props.js` | Booking imports `dateRangeOf`, `findProp`, `plainText`, `rich`, `textOf`. `titleOf`, `numberOf`, `checkboxOf`, `selectOf`, `multiSelectOf`, `dateStartOf`, `filesOf`, `coverOf` are candidates; ESLint does not flag unused exports, so prune only after `git grep -w <name>` shows no importer, and re-check that `textOf`/`dateRangeOf` do not call them internally |
| `next.config.mjs` | Delete `serverExternalPackages`, `outputFileTracingIncludes`, and the `{ pathname: "/api/media/**" }` `localPatterns` entry plus its comment. Keep `{ pathname: "/**", search: "" }`, `remotePatterns` for media.koussay.online, `staleTimes`, redirects, `output: "standalone"` gating |
| `app/robots.js` | `disallow: ["/api/book"]` only |
| `lib/seo.js`, `lib/projects.js` | Per Pattern 3 (`projectOgImage`, delete `shareImages`, `projectShareImage`) |
| `app/layout.js`, `app/page.js`, `app/project/[slug]/page.js` | OG images in metadata |
| `lib/content.js`, `lib/content-schema.mjs`, `scripts/check-content.mjs` | Expose `og`, `getHomeShare()`, validate |
| `package.json` and `package-lock.json` | Per Installation |
| `.env.example` | Remove lines 7-8 (`NOTION_PROJECTS_DATABASE_ID` and its comment) and 17-19 (webhook comment and `NOTION_WEBHOOK_SECRET`) |
| `README.md` | Remove lines 46-47 sentence about the legacy proxy and the two table rows (56, 58). Lines 45-47 will then read "Without the Notion booking keys, `/api/book` returns 503." Also add the `share` command to any scripts mention if one exists |
| `scripts/media.mjs` | Delete `import-live` and its snapshot default path (it fetches the dead `/api/media` route and cannot run after the phase), update the header usage block and USAGE string; add `share`; extend `verify` and `needsR2` |
| `tests/smoke.spec.mjs` | See Validation Architecture |
| `CLAUDE.md` | Its generated sections contain about 40 stale lines naming every removed file (grep lines 38-62, 70, 80, 88-89, 122-128, 174-216, 226-264, 273). Success criterion 1 greps the whole repo outside `.planning/`, so these must be rewritten in the phase (or the criterion must name `CLAUDE.md` as generated and excluded; recommend rewriting) |

### Provenance strings in `content/media.json`
37 `origin.from` values contain `https://koussay.online/api/media/...` (records of where the Phase 2 snapshot bytes came from). The literal success-criterion grep for `api/media` outside `.planning/` will match them. The URLs are dead after this phase, the `sha256`, `key` and bytes remain the proof, and the full snapshot is preserved in `.planning/phases/02-projects-served-from-the-repo/snapshot/`. Recommendation: rewrite `origin.from` to a non-URL string such as `notion-snapshot:<pageId>/<slot>` through the script's own writer (a one-shot step in the same plan as `share`, so the "script is the only writer" rule holds), then delete that step. See Open Question 1.

### Config and runtime facts confirmed
- No `revalidate` export remains on `app/page.js`, `app/project/[slug]/page.js`, `app/llms.txt/route.js`; the only `revalidate` in `app/` outside the files being deleted is `export const revalidate = 0` in `app/api/book/availability/route.js` (booking, leave). So "delete `revalidate = 60`" (CONTEXT discretion) is already done; `CLAUDE.md` line 80 is stale. [VERIFIED: git grep]
- `sharp` runtime importers today: `app/api/media/[...parts]/route.js` and `lib/og-image.js`. Both are deleted. Remaining importer: `scripts/media.mjs`. [VERIFIED: git grep `from "sharp"`]
- `@napi-rs/canvas`, `pdfjs-dist`, `unpdf` importers: `lib/pdf.js` only (the CLAUDE.md claim of `outputFileTracingIncludes` for `/project/**` is also in `next.config.mjs` and goes with it).

## sharp After Removal

- Next 16.3.8 declares `optionalDependencies.sharp: "^0.35.4"`. `npm ls sharp` currently shows `next@16.3.8 -> sharp@0.35.4` nested plus the app's own top-level `sharp@0.34.5`. [VERIFIED: node_modules/next/package.json, npm ls]
- Removing sharp from `dependencies` does not affect `next/image`: Next resolves its own nested copy. With the top-level at `^0.35.5` npm will dedupe to one copy. This also clears the 0.34.x libvips advisory noted in `.planning/research/STACK.md` line 218.
- Vercel production builds install devDependencies (the build already depends on `@tailwindcss/postcss`, which is a devDependency, and builds fine). The runtime function image does not need sharp after this phase because no route imports it. Vercel's image optimiser is platform-side; the smoke test's gallery assertion (`/_next/image?url=https%3A%2F%2Fmedia.koussay.online`) is the regression check, and `npm run build && next start` exercises Next's own sharp path locally.
- `scripts/media.mjs` imports `sharp` directly; as a devDependency that import still resolves for authoring (`npm install` installs devDependencies).

## Booking Is Untouched

Import map after the phase (verified by `git grep`):
- `lib/notion/bookings.js` imports `dataSourceId`, `notion` from `lib/notion/client.js`; `dateRangeOf`, `findProp`, `plainText`, `rich`, `textOf` from `lib/notion/props.js`; `notionBookingsDatabaseId`, `notionCalendarDatabaseId` from `lib/env.js`; `lib/book/*`.
- `app/api/book/{route,availability/route,draft/route}.js`, `lib/mail/booking.js`, `components/book/*` import nothing on the removal list.
- `lib/notion/client.js` after the edit exports `notion`, `dataSourceId` (and `withTimeout`, `notionPageId` only if still imported). The `notion()` singleton keeps `timeoutMs: 4000, retry: false`.
- Only edit to the booking-adjacent surface: delete `cachedDataSourceId` and the `unstable_cache` import. This is why the ROADMAP rule "any phase that touches `lib/notion/client.js` re-runs a booking" applies, hence D-08.

## Booking Proof Procedure (D-08, D-10)

**Facts:**
- `/api/book/availability` is a `GET` with no query parameters. It returns `{ busy: [...ranges], taken: [...starts] }`, built from `fetchBusyRanges()` (bookings DB, plus the calendar DB with all-day blocks allowed) plus in-memory pending bookings. The busy cache is 20 s. [VERIFIED: app/api/book/availability/route.js, lib/notion/bookings.js lines 355-380]
- The UI filters with `busyFromResponse` and `isSlotOpen` from `lib/book/time.js`; those are the functions to reuse for a read-only proof.
- `npm test` (Playwright) starts its own server: `npm run build && npx next start -p 3100` with `NOTION_BOOKINGS_DATABASE_ID`, `NOTION_CALENDAR_DATABASE_ID`, `RESEND_API_KEY`, `RESEND_FROM`, `BOOKING_NOTIFY_EMAIL` set empty, `reuseExistingServer: false`. It cannot be pointed at the real-key server without `BASE_URL`, and the booking guard (`tests/guards.mjs`) aborts every `/api/book*` request anyway.
- Production on Vercel has only these booking vars: `NOTION_BOOKINGS_DATABASE_ID`, `NOTION_TOKEN`, `RESEND_API_KEY`, `RESEND_FROM`, `BOOKING_NOTIFY_EMAIL`, `FIRECRAWL_API_KEY` (plus the two dead ones). It has no `NOTION_CALENDAR_DATABASE_ID`. [VERIFIED: `vercel env ls --project koussay-portfolio --scope koussays`, Production only, 2026-10-04]

**Order (one port, sequential):**
1. Run the full gate, including `npm test`, which starts and stops its own blanked server on 3100.
2. Confirm nothing listens on 3100: `lsof -nP -iTCP:3100 -sTCP:LISTEN -t`.
3. `npm run build`, then start the real-key server in the background from the main checkout: `npx next start -p 3100` (no env blanking). `@next/env` loads `.env.local` for `next start`. Never read or print `.env.local`; confirm the keys are present by name only: `node -e` that checks `Boolean(process.env.NOTION_BOOKINGS_DATABASE_ID)` after `@next/env` load, printing booleans (see Open Question 2).
4. Read-only blocked-time proof (D-10): `curl -s localhost:3100/api/book/availability`, pick a `busy` range whose date is in the future, and show with `node` using `isSlotOpen` that every grid slot in that range is closed and neighbours are open. Koussay can also see the day's slots missing in the booking UI. No block is created.
5. Koussay books once in the T3 browser panel, name "TEST — Phase 3". He confirms the Notion row, the Notion Calendar entry and both Resend emails. Claude never deletes the row; gives him one numbered step to delete it.
6. Stop only what was started: `lsof -nP -iTCP:3100 -sTCP:LISTEN -t | xargs kill`.

`next start` with `output: "standalone"` set (off Vercel) prints a warning; Phase 1 used this exact flow successfully (memory `uat-and-ship-portfolio`).

## Vercel Env Removal (D-13)

Both variables exist in **Production only**; there are no Preview or Development copies. [VERIFIED: `vercel env ls`] The project is not linked in this checkout (`.vercel/` absent), so pass the project explicitly instead of linking:

```bash
vercel env rm NOTION_PROJECTS_DATABASE_ID production --yes --project koussay-portfolio --scope koussays
vercel env rm NOTION_WEBHOOK_SECRET production --yes --project koussay-portfolio --scope koussays
vercel env ls --project koussay-portfolio --scope koussays   # confirm both are gone
```
Run after the code that stops reading them has shipped and is live (a removal earlier changes nothing for running deployments, but doing it after ship keeps a rollback intact). The CLI is logged in as `loomlyne` and the team is `koussays` (CLI 59.5.0). Env changes apply to the next deployment only, so the removal itself needs no redeploy; the live site no longer reads them. Notion's webhook subscription is Koussay's one numbered step (D-12) and Claude cannot do it.

## Common Pitfalls

### Pitfall 1: Text silently renders in the wrong font
**What goes wrong:** sharp's text path returns an image, with a Helvetica look-alike and no error.
**Why:** libvips here has no fontconfig default config, so `fontfile` is not registered.
**How to avoid:** use fontkit paths. In the render function, throw on `glyph.id === 0` and unit-test that two renders with different fonts differ (a regression check that the font is really Geist, for example compare the path data length of "Fido Homes" against a stored constant).
**Warning signs:** a `Fontconfig error` line on stderr; text widths identical for a made-up font name.

### Pitfall 2: Cached HTML and scrapers still point at deleted OG URLs
**What goes wrong:** old `/project/<slug>/opengraph-image/cover` URLs 404 after the deploy. LinkedIn, WhatsApp and X cache link previews for days, so a re-shared link may show the stale card or none until their cache expires.
**How to avoid:** accept it (D-11 style: plain 404). Phase 2 shipped already, so site HTML no longer references the old route; only third-party caches do. Optional: Koussay re-scrapes a link in LinkedIn Post Inspector, not required.

### Pitfall 3: Shallow metadata merge drops images
**What goes wrong:** a page's `openGraph` object replaces the layout's whole `openGraph`, so images set only in the layout vanish on pages and a new page with its own `openGraph` ships without an image.
**How to avoid:** set `images` in each `generateMetadata` that sets `openGraph` (home, project); the booking static file covers booking; add a layout default for 404.

### Pitfall 4: `twitter:image` missing after the routes go
**Why it could happen:** `twitter.images` inherits only when `openGraph.images` is resolved on the same route. **How to avoid:** assert `<meta name="twitter:image" ...>` equals the `og:image` URL on the home page, one project page and booking in the smoke test, from the built HTML (Assumption A2 for the booking static-file case).

### Pitfall 5: A stale card ships after a copy edit
**What goes wrong:** the name or type changes in `content/projects/*.mjs`, nobody re-runs `share`, the card shows the old text.
**How to avoid:** the `inputs` hash in the manifest plus the validator check (Pattern 2). Build fails naming the slug and the command.

### Pitfall 6: Port 3100 collision
**What goes wrong:** the Playwright server and the real-key proof server both want 3100; `reuseExistingServer: false` fails loudly if one is already up, and a stray real-key server would be tested by the suite's own run only if `BASE_URL` is set.
**How to avoid:** the sequential order above, and stop by port only (never `pkill`).

### Pitfall 7: `origin.from` provenance fails the literal grep
See Removal Inventory; decide Open Question 1 before the verification step is written, or the verifier will report a false failure.

## Code Examples

### Pure inputs hash (shared by script and validator)
```js
// lib/share.mjs — pure; no fs, no sharp, no app imports
import { createHash } from "node:crypto"; // pure Node built-in is allowed: the validator already runs in Node at build
export const LAYOUT_VERSION = 1;
export const typeLine = (project) => `${project.type} · Koussay Zayani`;
export const projectLines = (project) => [project.name, typeLine(project)];
export const homeLines = (name, description) => [
  name,
  description.split(".")[0], // "Creative developer and brand designer"
];
export const inputsHash = (coverSha, lines) =>
  createHash("sha256")
    .update(JSON.stringify([LAYOUT_VERSION, coverSha, ...lines]))
    .digest("hex");
```
Note: `lib/content-schema.mjs` currently has no imports; `node:crypto` is available at build (server) and in the script. If the planner wants zero imports there, hash with a tiny pure function instead. Keep `lib/share.mjs` out of any client component (it is imported only by `content-schema.mjs`, which is server-only through `lib/content.js`).

### Smoke assertions (replacement for the share-image test)
```js
// Source: pattern from tests/smoke.spec.mjs "project share images" test, rewritten for static R2 images
test("share images are static R2 files", async ({ request }) => {
  const meta = (html, p) =>
    html.match(new RegExp(`<meta[^>]+(?:property|name)="${p}"[^>]+content="([^"]+)"`))?.[1];
  for (const slug of ORDER) {
    const html = await (await request.get(`/project/${slug}`)).text();
    const og = meta(html, "og:image");
    expect(og, `${slug} og:image`).toMatch(
      new RegExp(`^https://media\\.koussay\\.online/projects/${slug}/og-[0-9a-f]{8}\\.jpg$`),
    );
    expect(meta(html, "twitter:image"), `${slug} twitter:image`).toBe(og);
    expect(meta(html, "og:image:width")).toBe("1200");
    const res = await request.get(og);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/jpeg");
  }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Request-time `sharp` crop in `opengraph-image.js`, fetching R2 on first request | Pre-rendered JPEG on R2, URL in `openGraph.images` | This phase | No function, no cold-start, no per-request fetch (the smoke test used `setTimeout(300_000)` for it) |
| `twitter-image.js` re-export | `twitter.images` inherited from `openGraph.images` | Next 13.3+ behaviour, verified in 16.3.8 source | Delete three files |
| `sharp ^0.34.4` runtime dependency | `sharp ^0.35.5` devDependency | This phase | Clears libvips advisory; Next keeps its own 0.35.4 |

**Deprecated/outdated:** `lib/og-image.js`, the media proxy, the PDF renderer, `unstable_cache` layer, Notion webhook.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `geist` 1.7.2 is legitimate for install (registry data, Vercel repo, 3M/wk) but `slopcheck` was not run on it | Package Legitimacy Audit | Low; planner gates one `slopcheck` run before install |
| A2 | For the booking static `opengraph-image.png`, `twitter:image` also appears via inheritance (code path read for config images; static-file merge order not run) | Pattern 3, Pitfall 4 | Low; a smoke assertion catches it, fallback is a copied `twitter-image.png` |
| A3 | Static `Geist-Bold.ttf` and `Geist-Regular.ttf` from the package match the variable font at 700 and 400 | Standard Stack | Low visual drift; only the variable table equality was diffed. D-07 pictures are Koussay's check |
| A4 | Vercel's production install includes devDependencies (inferred from `@tailwindcss/postcss` already being a devDependency that builds) | sharp After Removal | Low; the build would fail at the first `npm run build` on Vercel, which only runs after ship, so confirm with the `vercel inspect` of the deploy |
| A5 | Koussay's `.env.local` holds the real booking keys (not read, per the instruction; Phase 1 memory said it had none) | Booking Proof | D-08 needs them; if absent Koussay supplies them in his terminal as one numbered step |
| A6 | LinkedIn/WhatsApp/X preview caches expire in days | Pitfall 2 | None for correctness |

## Open Questions

1. **`origin.from` provenance strings in `content/media.json`**
   - Known: 37 values contain `koussay.online/api/media/...`; the grep in success criterion 1 will match them; the data is dead provenance.
   - Unclear: whether Koussay reads "grep clean" literally.
   - Recommendation: rewrite them to `notion-snapshot:<pageId>/<slot>` through the script's writer in the same plan as `share`; state this in the plan so it is visible and not a silent edit of a script-owned file.

2. **Are the booking keys in `.env.local`?**
   - Known: Phase 1 memory says the main checkout had no Notion keys; D-08 says real keys come from `.env.local`.
   - Unclear: current state.
   - Recommendation: first task of the proof plan checks presence by name as booleans only (no values printed). If missing, one numbered terminal step for Koussay.

3. **Where does the home card's cover come from after Phase 7?** ORDER[0] is `pixenhouse` today and Phase 7 swaps slugs; the `inputs` hash makes the build fail until `share` is re-run, which is the intended behaviour. No action needed now; note it in the Phase 7 hand-off.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | scripts, build | yes | 26.7.0 | — |
| npm | install | yes | present (registry reachable) | — |
| sharp (libvips) | `share` render | yes | 0.34.5 now, 0.35.5 after install | — |
| fontkit | `share` render | after install | 2.0.4 | none; glyph-path is the chosen method |
| geist TTFs | `share` render | after install | 1.7.2 | none |
| R2 credentials (`R2_*` in `.env.local`) | upload, `verify` | `media.mjs check` passed in Phase 2 (verified then, not re-run now) | — | `--preview` and `--dry-run` need none |
| vercel CLI | env removal | yes | 59.5.0, logged in as loomlyne, team `koussays` | — |
| slopcheck | package gate | yes | at /opt/homebrew/bin/slopcheck | — |
| Python fontTools | not needed | yes (4.63.0) | — | only used for the probe diff |
| `fc-list`, system Geist | not needed | n/a | — | The method does not depend on system fonts |

**Missing dependencies with no fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.63.0 (`npm test`), plus Node scripts (`scripts/check-content.mjs`, `scripts/content-schema.test.mjs`) |
| Config file | `playwright.config.mjs` (port 3100, desktop 1512 and phone 390, builds then `next start`, booking keys blanked) |
| Quick run command | `node scripts/check-content.mjs && node --test scripts/content-schema.test.mjs` (sub-second, no network) |
| Full suite command | `npx prettier --check . && npm run lint && npm run build && npm test` |

(`scripts/content-schema.test.mjs` is run with `node` today; confirm whether it uses `node --test` before copying the command.)

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEDIA-07 | Missing or stale `og` fails the build | unit | schema tests: add cases `og missing`, `og stale`, `og under wrong slug`, `site.home stale` to `scripts/content-schema.test.mjs` | exists, extend |
| MEDIA-07 | Every project page has an `og:image` on R2, `og-<sha8>.jpg`, 1200 wide, equal `twitter:image`, content-type `image/jpeg` | e2e | replace test "project share images are real and not the logo" in `tests/smoke.spec.mjs` | exists, rewrite |
| MEDIA-07 | Home `og:image` is the home entry, booking `og:image` is the static PNG route and returns `image/png` 200 | e2e | same file, two more assertions | rewrite |
| MEDIA-07 | Share text is Geist (not fallback) | unit | a script test rendering "Fido Homes" with fontkit and asserting glyph ids are non-zero and path count equals glyph count; plus the D-07 signed picture | Wave 0 |
| MEDIA-07 | No `sharp` import outside `scripts/` | grep | `git grep -n -E "from \"sharp\"|require\\(.sharp.\\)" -- app components lib` returns nothing | n/a |
| MEDIA-07 | Pictures signed before code ships | manual-only | Koussay signs 2 projects plus home, justified: D-07 | n/a |
| MEDIA-08 | Removed names absent | grep | `git grep -n -E "lib/cms|notion/projects|api/media|gallery-pdf|lib/pdf|cms-stamp|api/revalidate|CmsLive|unstable_cache" -- . ':!.planning' ':!package-lock.json'` returns nothing (needs Open Question 1 settled and `CLAUDE.md`, `docs/NEXT-SESSION-PROMPT.md` handled) | n/a |
| MEDIA-08 | Packages gone, sharp dev-only | cmd | `node -e` assert `package.json` dependencies lack `@napi-rs/canvas`, `pdfjs-dist`, `unpdf`, `sharp`; devDependencies has `sharp`; and `npm ls @napi-rs/canvas pdfjs-dist unpdf` empty | n/a |
| MEDIA-08 | Config keys gone | grep | `git grep -n -E "serverExternalPackages|outputFileTracingIncludes" -- next.config.mjs` returns nothing | n/a |
| MEDIA-08 | Deleted routes 404, including POST on `/api/revalidate` | e2e | change the "removed files are gone" test: `/api/cms-stamp`, `/api/revalidate`, `/api/media/abc` all 404 | exists, rewrite |
| MEDIA-08 | No page requests `/api/media` | e2e | `apiMedia` array already asserted empty in `watch()`; keep | exists |
| MEDIA-08 | `next/image` gallery still optimises via R2 with sharp dev-only | e2e | existing gallery test (`/_next/image?url=https%3A%2F%2Fmedia.koussay.online`) | exists |
| MEDIA-08 | Build output has no `/api/media` route | cmd | `npm run build` route table lacks `/api/media`, `/api/cms-stamp`, `/api/revalidate`, `/opengraph-image` | n/a |
| MEDIA-09 | Booking code unchanged except `cachedDataSourceId` | diff | `git diff main -- lib/book lib/notion/bookings.js lib/mail app/api/book components/book` is empty | n/a |
| MEDIA-09 | Booking end to end on the finished build | manual-only | D-08 procedure, justified: needs real Notion, Notion Calendar and Resend | n/a |
| MEDIA-09 | Blocked time hides its slots | script | read-only GET `/api/book/availability` on the real-key server plus `isSlotOpen` check | Wave 0 helper |
| MEDIA-09 | Env vars gone from Vercel, `.env.example`, README, `lib/env.js` | cmd | `vercel env ls --project koussay-portfolio --scope koussays` lacks both; `git grep -n -E "NOTION_PROJECTS|NOTION_WEBHOOK" -- . ':!.planning'` returns nothing | n/a |
| MEDIA-09 | Webhook subscription deleted | manual-only | Koussay's step D-12; evidence is his word | n/a |

### Sampling Rate
- **Per task commit:** `node scripts/check-content.mjs` plus the touched file's prettier and eslint
- **Per wave merge:** `npx prettier --check . && npm run lint && npm run build`
- **Phase gate:** full suite green on the tree that ships, then the D-08 proof, before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `scripts/lib/share.mjs` and `lib/share.mjs` created before any test can run
- [ ] New cases in `scripts/content-schema.test.mjs` for `og` and `site.home`
- [ ] Glyph test for the Geist render (font is real, no notdef)
- [ ] `--preview` mode in `scripts/media.mjs` (D-07 pictures) before the signature gate
- [ ] Availability proof helper (a throwaway `node -e` is enough, not committed)
- [ ] Framework install: none; Playwright exists

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes (build-time only) | `lib/content-schema.mjs` validator; the script validates host and sha256 of fetched cover and refuses a non-R2 host |
| V6 Cryptography | no (sha256 via `node:crypto`, not a security control) | — |
| V14 Configuration | yes | Remove dead secrets from Vercel and the webhook endpoint; no secret in repo |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Webhook endpoint that fails open on cache bust (`/api/revalidate`) | Tampering, DoS | Delete the route (closes it); Notion subscription deleted by Koussay |
| Unused secrets lingering in Vercel | Information disclosure | `vercel env rm` both, verified with `env ls` |
| Slopsquatted or compromised devDependency | Tampering | slopcheck, exact `geist@1.7.2`, `fontkit ^2.0.4`, no postinstall scripts, lockfile committed, run `npm audit` after install |
| Script SSRF through manifest URLs | Tampering | The `share` command fetches only `cover.url` and refuses any host other than `media.koussay.online` |
| Secret leakage in logs | Information disclosure | Never print env values; booleans only for key presence |

## Sources

### Primary (HIGH confidence)
- Next 16.3.8 source and bundled docs read locally: `node_modules/next/dist/lib/metadata/resolve-metadata.js` (twitter inheritance), `node_modules/next/dist/lib/metadata/resolvers/resolve-opengraph.js`, `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md`, `.../04-functions/generate-metadata.md`
- Repo `git grep` of the whole tree, `lib/notion/client.js`, `lib/env.js`, `lib/seo.js`, `lib/og-image.js`, `lib/content*.js`, `scripts/media.mjs`, `tests/smoke.spec.mjs`, `playwright.config.mjs`, `next.config.mjs`, `package.json`
- Local probe in `/tmp/ogprobe` (sharp 0.35.5, fontkit 2.0.4, Geist 1.7.2 from `npm pack`), fontTools table comparison
- `npm view` for sharp, fontkit, geist; `vercel env ls --project koussay-portfolio --scope koussays`; `vercel env rm --help`
- `.planning/research/ARCHITECTURE.md` (sections 4, 8) and `.planning/research/STACK.md` (lines 39, 112, 218-230)

### Secondary (MEDIUM confidence)
- npm weekly download counts from `api.npmjs.org` for fontkit and geist

### Tertiary (LOW confidence)
- None used for recommendations

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, the font method was exercised end to end and the failed alternative was shown failing with a control
- Architecture: HIGH for metadata inheritance (source read) and removal inventory (grep); MEDIUM for booking static-file `twitter:image` (A2)
- Pitfalls: HIGH for 1, 3, 5, 6, 7 (observed or read); MEDIUM for 2 (third-party caches)

**Research date:** 2026-10-04
**Valid until:** 2026-11-03 (stable stack; re-check `sharp` and `geist` versions at plan time)

## Project Constraints (from CLAUDE.md)

- Read `AGENTS.md` before changing anything under `components/`; the removal does not touch `components/` except deleting `CmsLive.jsx` (not a ring file). Ring internals untouched.
- Next 16 is newer than training data: read `node_modules/next/dist/docs/` before framework-level changes (done for metadata and file conventions).
- Plain JavaScript (JSX), no TypeScript. Prettier defaults with no config; `format:check` is a gate; new and edited files must be formatted (including `lib/share.mjs`, `scripts/lib/share.mjs`).
- Read env only through `lib/env.js` in app code; scripts use `loadEnv()` from `scripts/lib/load-env.mjs`.
- Logging tags: bracketed (`[media]`, `[og]`); no `console.log` in app code (scripts may log as `scripts/media.mjs` does).
- `scripts/media.mjs` is the only writer of `content/media.json` and R2 objects under `projects/`; paid or destructive work stays behind flags; `--dry-run` first.
- Phase-end gate: `prettier --check`, `npm run lint`, `npm run build`, `npm test` green on the tree that ships.
- No `.otf` or `.ttf` in `git ls-files`; fonts are Geist under OFL only.
- Never read, quote or commit `.env.local`; secrets stay in Koussay's terminal.
- Control session ships; Koussay signs plan, UAT and ship; gates stop for him (D-07 signature is a gate before the share-image code).
- Never pattern-kill processes: stop port 3100 by `lsof ... | xargs kill`.
- No Vercel steps for Koussay; prove Vercel facts from the CLI (done: `env ls`).
- GSD workflow enforcement: file changes happen through a GSD command (this research file is the researcher's own artefact).
