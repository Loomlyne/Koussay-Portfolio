---
phase: 03-notion-projects-path-removed
plan: 01
subsystem: api
tags: [notion, cleanup, next-config, smoke-test]
requires: []
provides:
  - Notion projects path, media proxy, PDF renderer, webhook and CmsLive removed
  - /api/media, /api/cms-stamp, /api/revalidate return plain 404
affects: [03-02, 03-05]
tech-stack:
  added: []
  patterns: [notion client kept for bookings only]
key-files:
  created: []
  modified:
    - lib/notion/client.js
    - lib/notion/props.js
    - lib/env.js
    - lib/seo.js
    - lib/projects.js
    - next.config.mjs
    - app/robots.js
    - .env.example
    - README.md
    - tests/smoke.spec.mjs
decisions:
  - "client.js: withTimeout, notionPageId, cachedDataSourceId removed (no importer left)"
  - "robots.js disallows only /api/book"
requirements-completed: [MEDIA-08, MEDIA-09]
duration: 20min
completed: 2026-10-04
---

# Phase 3 Plan 01: Notion projects path removed Summary

The Notion projects runtime (media proxy, PDF renderer, stamp and webhook routes, CmsLive, cache layer) is deleted; the three old routes now 404 and booking files are unchanged.

Commit: cc1c408 (one commit for both tasks, as the plan specified).

## Deleted
`app/api/media`, `app/api/cms-stamp`, `app/api/revalidate`, `components/CmsLive.jsx`, `lib/cms/bust.js`, `lib/pdf.js`, `lib/media.js`, `lib/notion/gallery-pdf.js`, `lib/notion/projects.js`, `docs/NEXT-SESSION-PROMPT.md`.

## Edited
- `lib/notion/client.js`: exports only `notion()` and `dataSourceId()`; comment rewritten without CmsLive.
- `lib/env.js`: dropped `notionProjectsDatabaseId`, `notionWebhookSecret`, `isNotionProjectsConfigured`.
- `lib/seo.js` / `lib/projects.js`: dropped `shareImages` and `projectShareImage` (no callers); removed the unused `SITE_URL` import.
- `next.config.mjs`: removed the `/api/media/**` localPattern, `serverExternalPackages`, `outputFileTracingIncludes`.
- `app/robots.js`, `.env.example`, `README.md` (env rows and legacy sentence), `tests/smoke.spec.mjs` (GET and POST 404 checks, no-redirect check).

## props.js helpers pruned
Pruned `titleOf`, `numberOf`, `checkboxOf`, `selectOf`, `multiSelectOf`, `dateStartOf`, `filesOf`, `coverOf`. Each was safe because `git grep -w` over app, components, lib and scripts showed only its own definition after the deletions (the sole importer was `lib/notion/projects.js`), and the kept functions (`findProp`, `plainText`, `textOf`, `dateRangeOf`, `rich`) call none of them (`textOf` uses only `plainText`).

## Verification
- Removed-name grep over app, components, lib, next.config.mjs: empty.
- `git diff ca24456` on booking paths: empty.
- `npx prettier --check .`, `npm run lint`, `node scripts/check-content.mjs`: pass.
- `npm run build`: route table lists only `/api/book*` under `/api`.
- Playwright desktop "removed files are gone" and "placeholder slug": 2 passed.
- Not run: full smoke suite, phone project (not required by the plan).

## Deviations from Plan
None. Packages not uninstalled (Plan 05). Nothing pushed.

## Known Stubs
None.

## Self-Check: PASSED
