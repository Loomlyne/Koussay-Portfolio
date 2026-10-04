# Phase 3: Notion projects path removed - Context

**Gathered:** 2026-10-04
**Status:** Ready for planning

<domain>
## Phase Boundary

The running site carries no Notion projects code, PDF renderer or request-time image library, and bookings still work end to end (MEDIA-07, MEDIA-08, MEDIA-09).

Deleted: `app/api/media/[...parts]`, `app/api/cms-stamp`, `app/api/revalidate`, `components/CmsLive.jsx`, `lib/cms/bust.js`, `lib/pdf.js`, `lib/notion/gallery-pdf.js`, `lib/notion/projects.js`, `lib/og-image.js`, the OG/Twitter image routes, every `unstable_cache` use, `pdfjs-dist`, `unpdf`, `@napi-rs/canvas`, `serverExternalPackages`, `outputFileTracingIncludes`, the `/api/media/**` `localPatterns` entry, the Notion-projects and webhook env accessors. `sharp` leaves `dependencies` (stays a devDependency for the scripts).

Kept intact in behaviour: bookings and blocked time through `lib/notion/client.js`, `lib/notion/bookings.js`, `lib/notion/props.js`, `lib/book/*`, `app/api/book/*`, `lib/mail/booking.js`.

Share images become static files produced by the media script. They are redesigned to carry text (decided below), which is the one visible change in this phase.

</domain>

<decisions>
## Implementation Decisions

### Share images (Open Graph and Twitter)
- **D-01:** Each project's share image is its cover, cropped to 1200×630, with text bottom-left in white Geist on a soft dark gradient so it reads on any cover.
- **D-02:** Project share text is three parts on two lines: the project name, then `<type> · Koussay Zayani` (e.g. "Fido Homes" / "Brand & Web · Koussay Zayani").
- **D-03:** The type line uses the project's existing `type` label as written. Claude may propose clearer share wording per project; proposals are shown beside the current label in the design pictures (D-07), and only labels Koussay approves there are used. Otherwise the current label stays. Nothing is invented without his approval.
- **D-04:** The home page share image is the cover of the project at the front of the ring (first in `ORDER`), in the same layout, with the text "Koussay Zayani" / "Creative developer and brand designer". That second line is `SITE_DESCRIPTION`'s opening words in `lib/site.js`, verbatim.
- **D-05:** The booking page share image stays as today: the logo centred on the light grey background, saved once as a static PNG. No text is added.
- **D-06:** All share images are rendered at authoring time by the media script (sharp in the script, never at request time), uploaded to R2 under content-addressed immutable keys and recorded in `content/media.json` (or a static file for booking). Page metadata points at them with width and height. No request runs `sharp`, and no share image falls back to the logo (carries Phase 2 D-07).
- **D-07:** Design before code. Before the plan is executed, Claude renders real 1200×630 PNGs for two projects and the home page (plus any proposed type labels), and Koussay signs them. Code that ships the share images waits for that signature.

### Booking proof
- **D-08:** The booking test runs on the finished build served locally on `localhost:3100` with Koussay's real booking keys from `.env.local`, before ship. Koussay books once in the T3 browser panel and confirms the Notion row, the Notion Calendar entry, and both Resend emails (visitor and owner). This replaces the roadmap's "preview deployment" wording, because Vercel previews are protected and Koussay does no Vercel steps.
- **D-09:** The test booking is named so it's easy to find (e.g. "TEST — Phase 3"). Claude never deletes it; after Koussay confirms the test, Claude gives him one numbered step to delete the row himself.
- **D-10:** Blocked time is proven read-only by Claude: pick a date already blocked in the calendar and show the availability API hides those slots. No test block is created.

### Old addresses and dead config
- **D-11:** Old `/api/media/...` addresses return a plain 404 once the route is deleted. No redirect map.
- **D-12:** The Notion webhook subscription is deleted by Koussay in Notion's integration settings, as one numbered step after ship. Until then it calls a 404 and does nothing.
- **D-13:** Claude removes `NOTION_PROJECTS_DATABASE_ID` and `NOTION_WEBHOOK_SECRET` from Vercel itself with the `vercel` CLI. Koussay does no Vercel step. They also leave `.env.example`, the README env table and Quick start, and `lib/env.js`.

### Claude's Discretion
- Whether the dead `cachedDataSourceId` export and the `CmsLive` comment are removed from `lib/notion/client.js`. Success criterion 1 requires `unstable_cache` to be gone, and the export is used only by `lib/notion/projects.js`. Removing it is allowed, and the D-08 booking test covers it.
- Fate of `lib/media.js` slot grammar, `lib/notion/props.js` (booking still imports `findProp`, `plainText`, `rich`, `textOf`, `dateRangeOf`, so keep what booking uses) and `robots.js` disallow entries for removed routes.
- Whether `revalidate = 60` is removed from pages now that content changes only through deploy (research recommends deleting).
- Gradient strength, type sizes and exact text placement within D-01, settled in the D-07 pictures.
- Image format of share renditions (PNG or JPEG), keeping them small enough for WhatsApp and LinkedIn scrapers.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` § "Phase 3: Notion projects path removed": goal, success criteria, Koussay's steps (step 2 is narrowed by D-12/D-13)
- `.planning/REQUIREMENTS.md`: MEDIA-07, MEDIA-08, MEDIA-09

### Prior decisions
- `.planning/phases/02-projects-served-from-the-repo/02-CONTEXT.md`: D-03/D-04 (R2, one script writes the manifest), D-06 (remotePatterns), D-07 (share image shows the cover, never the logo), D-11 (Notion rows untouched)
- `.planning/PROJECT.md`: constraints (R2 media host, Notion stays for bookings, licensing)

### Design and removal map
- `.planning/research/ARCHITECTURE.md` § "OG images and `generateStaticParams`" (lines ~196–200) and the removal/build-order tables (lines ~183, ~264–272, ~402–405): what to delete, what booking imports, the `og` rendition in the manifest
- `AGENTS.md`: ring internals that must not change

### Booking and UAT
- `~/.claude/projects/-Users-koss-Developer-Koussay-Portfolio/memory/uat-and-ship-portfolio.md`: local prod build on 3100, how env blanking works (for D-08, run *with* real booking keys instead of blanked)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/media.mjs` (already imports `sharp`, writes `content/media.json`, uploads via `scripts/lib/r2.mjs`): the place to add the `og` rendition and text compositing.
- `public/fonts/Geist-Variable.woff2` + `OFL.txt`: the licensed face for the share text.
- `lib/og-image.js`: current crop parameters (1200×630, `fit: cover`, logo `contain` on `#F4F5F6`) to reproduce in the script, then delete.
- `lib/seo.js` `projectOgImage()` / `shareImages()`: switch to the manifest URL. It currently filters `/api/media/` URLs.
- `lib/site.js` `SITE_NAME`, `SITE_DESCRIPTION`: source of the home text (D-04).

### Established Patterns
- The media manifest is written only by `scripts/media.mjs`, idempotent, `--force` to rewrite, paid/destructive work behind flags.
- `lib/content.js` throws at build on a missing key or unknown media. A missing `og` entry should fail the build the same way.
- Logging tags `[media]`, `[og]`; no `console.log` in app code.

### Integration Points
- `app/page.js`, `app/project/[slug]/page.js`, `app/layout.js` `openGraph`/`twitter` metadata.
- `app/providers.js` already no longer mounts `CmsLive`.
- `next.config.mjs`: remove `serverExternalPackages`, `outputFileTracingIncludes`, the `/api/media/**` local pattern.
- `app/robots.js` disallow list references `/api/revalidate`, `/api/cms-stamp`.

</code_context>

<specifics>
## Specific Ideas

- Project share image example: Fido Homes cover, bottom-left "Fido Homes" over "Brand & Web · Koussay Zayani", white on a dark fade.
- Home share image: front-of-ring cover with "Koussay Zayani" / "Creative developer and brand designer".
- Booking share image: unchanged logo-on-grey.

</specifics>

<deferred>
## Deferred Ideas

- Deleting the Notion projects database or its rows: not planned (carried from Phase 2).
- Share images follow automatically when Phase 7 replaces covers and types: re-run the script, no new design.

</deferred>

---

*Phase: 03-notion-projects-path-removed*
*Context gathered: 2026-10-04*
