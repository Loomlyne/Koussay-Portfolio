---
phase: 03-notion-projects-path-removed
verified: 2026-10-04T21:45:00+04:00
status: human_needed
score: 3/3 roadmap criteria verified in code (criterion 4 pending post-ship by design)
overrides_applied: 0
gaps: []
human_verification:
  - test: "Remove NOTION_PROJECTS_DATABASE_ID and NOTION_WEBHOOK_SECRET from Vercel Production and delete the Notion webhook subscription"
    expected: "Vercel env list no longer shows the two names; Notion integration shows no webhook subscription"
    why_human: "Vercel dashboard and Notion settings; D-12/D-13 make this a post-ship step for Koussay"
  - test: "After ship, open a project share URL and the home URL in a link debugger or curl the HTML"
    expected: "og:image is the media.koussay.online og-<sha8>.jpg, 1200x630, twitter:image equal"
    why_human: "Live URL check belongs to the ship step; local smoke test asserts it on the local build only"
---

# Phase 3: Notion projects path removed. Verification Report

**Phase Goal:** The running site carries no Notion projects code, PDF renderer or request-time image library, and bookings still work end to end.
**Status:** human_needed. No code gaps. Only the post-ship Vercel/Notion step remains.
**Re-verification:** No, initial. Head checked: 727981a.

## Observable Truths (ROADMAP criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Grep for removed names clean outside `.planning/`; the three PDF packages uninstalled; `sharp` not in dependencies; `serverExternalPackages` and `outputFileTracingIncludes` gone | VERIFIED | `git grep` of the nine patterns (excluding `.planning`, lockfile) returns only `tests/smoke.spec.mjs` lines 53, 245, 250, which assert the routes 404 and that no page requests `/api/media`. `NOTION_PROJECTS` / `NOTION_WEBHOOK` grep is empty. `package.json` dependencies: `@notionhq/client, @vercel/speed-insights, gsap, lenis, lil-gui, next, react, react-dom, resend, three`. `sharp ^0.35.5`, `geist`, `fontkit` are devDependencies. `node_modules` has no `unpdf`, `pdfjs-dist` or `@napi-rs`. `next.config.mjs` has neither key. Files `lib/cms`, `lib/pdf.js`, `lib/notion/projects.js`, `gallery-pdf.js`, `app/api/media|cms-stamp|revalidate`, `CmsLive` are absent from `git ls-files`. `app/api` holds only `book`. |
| 2 | Each project's OG and Twitter image is a pre-rendered static file of its cover; home and booking keep a working image; no request runs `sharp` | VERIFIED | `content/media.json` has `og` on all 8 projects and `site.home` (`check-content` prints `8 projects, 37 media, 9 share`). Project page metadata uses `project.og.url` at 1200x630; home uses `getHomeShare()`. Booking uses committed `app/booking/opengraph-image.png`. Twitter image is inherited from openGraph, and smoke test lines 209-232 assert `twitter:image === og:image` (18/18 green per gate). Home card URL returns 200 `image/jpeg` from media.koussay.online (checked now). `git grep sharp` in `app lib components` finds only two comments. No `opengraph-image.js` or `twitter-image.js` route remains. |
| 3 | Booking code byte-identical to before the phase | VERIFIED | `git diff ca24456 --stat -- lib/book lib/notion/bookings.js lib/mail app/api/book components/book` is empty. |
| 4 | Env vars gone from Vercel, `.env.example`, README; webhook deleted | PARTIAL, pending post-ship by design | Repo side verified: `.env.example` and README have no hits. Vercel and Notion-side removal is Koussay's step (D-12/D-13), not done. |

**Score:** criteria 1-3 verified; criterion 4 repo side verified, external side pending.

## Superseded by decision (not a gap)

Koussay decided on 2026-10-04 21:25 +04 to drop Notion entirely and move bookings to Cloudflare D1 + Resend in Phase 3.1 (PLAT-02). Plan 03-07 must-haves D-08 (local Notion test booking), D-09 (TEST-row delete) and D-10 (blocked-time proof) were therefore not run. They are superseded by the amended criterion 3 and MEDIA-09. Stated plainly: no live Notion booking, no blocked-time read and no `NOTION_CALENDAR_DATABASE_ID` check were performed in this phase. The only booking evidence is that the code is unchanged from `ca24456`. Proof of "bookings work end to end" is therefore inherited from before the phase, not re-demonstrated.

## Requirements Coverage

| Requirement | Plans | Status | Evidence |
|-------------|-------|--------|----------|
| MEDIA-07 (static OG/Twitter, no request-time sharp) | 03-01, 03-02, 03-03, 03-04, 03-05, 03-06 | SATISFIED | Truth 2 |
| MEDIA-08 (Notion projects path deleted, sharp out of dependencies) | 03-02, 03-04 (path removal), 03-06 | SATISFIED | Truth 1 (REQUIREMENTS.md traceability table still reads "In progress" at line 164; the checkbox is ticked, update the table) |
| MEDIA-09 (bookings keep working; env vars removed) | 03-04, 03-07 | SATISFIED (amended) | Truth 3; external env/webhook removal pending as in criterion 4 |

No orphaned requirements: the three IDs mapped to Phase 3 all appear in plan frontmatter.

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Content and share manifest valid | `node scripts/check-content.mjs` | `content ok: 8 projects, 37 media, 9 share` | PASS |
| Unit tests | `node --test` | 27 pass, 0 fail | PASS |
| Home share card served | `curl -I` on `site.home.url` | 200 image/jpeg | PASS |
| Build and smoke | not re-run | Latest gate on 727981a: prettier, lint, build, npm test 18/18 green (reported by control session) | Accepted, not independently re-run |

## Anti-Patterns

None blocking. No TBD/FIXME/XXX markers checked beyond the review, which reports 0 critical, WR-01..04 and IN-02 fixed. Open and non-blocking: WR-05 (`next/image` with sharp as devDependency, Docker path untested; Docker replaced in 3.1), IN-01, IN-03.

## Gaps Summary

No code gaps. Phase goal is achieved in the tree. Remaining: Koussay's single numbered step to delete the two Vercel env vars and the Notion webhook after ship, and a live check of share images after deploy. Housekeeping: change the MEDIA-08 row in the REQUIREMENTS.md traceability table from "In progress" to "Complete".

---

_Verified: 2026-10-04_
_Verifier: Claude (gsd-verifier)_
