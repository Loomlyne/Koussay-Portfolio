---
phase: 03-notion-projects-path-removed
plan: 07
subsystem: bookings
tags: [bookings, proof, post-ship]
requires: [03-06]
provides:
  - "Gated code confirmed; booking proof closed by Koussay's decision to drop Notion"
affects: [03.1]
key-files:
  modified: []
duration: one session
completed: 2026-10-04
---

# Plan 03-07 Summary: booking proof closed by decision

## What ran

- Tree clean; code at HEAD equals `Gated SHA: 65aacf6b9a57d19e838e867f8b6a55e7766913f8` outside `.planning` (`git diff --quiet 65aacf6 HEAD -- . ':!.planning'`).
- Port 3100 free. No server started, no build, no test booking, no Notion or Resend call.
- Key presence by name only (values never read): local `.env.local` has none of `NOTION_TOKEN`, `NOTION_BOOKINGS_DATABASE_ID`, `NOTION_CALENDAR_DATABASE_ID`, `RESEND_API_KEY`, `RESEND_FROM`, `BOOKING_NOTIFY_EMAIL`. Vercel Production has all of them except `NOTION_CALENDAR_DATABASE_ID`.
- Live blocked time today: calendar blocks do not hide slots on koussay.online (no `NOTION_CALENDAR_DATABASE_ID` on Vercel); only booked calls do.

## Decision (Koussay, 2026-10-04 21:25 +04)

Asked to add booking keys for the D-08 test, Koussay answered: "first of all notion we wil drop it complitely / for emails we will ahve resend to do it". Then, in the question form:

- Phase 3: "Finish without the Notion booking test (Recommended)".
- Replacement: "Inside Phase 3.1, the Cloudflare move (Recommended)" — bookings and blocked time to Cloudflare D1, Resend for emails, Notion removed (new requirement PLAT-02).

So D-08 (test booking), D-09 (delete the TEST row) and D-10 (blocked-time proof) are not run. MEDIA-09 is met by the amended proof: booking code (`lib/book`, `lib/notion/bookings.js`, `lib/mail`, `app/api/book`, `components/book`) is byte-identical to `ca24456`, so the live Notion booking flow is unchanged until Phase 3.1 replaces it.

## Success criteria

| Criterion | Status |
|---|---|
| 1. Removal grep, packages, config | Met in 03-06 (named smoke-test exception) |
| 2. Static share images, no request-time sharp | Met in 03-05 |
| 3. Bookings still work | Met as amended: booking code unchanged; Notion test dropped by decision |
| 4. Dead env vars and webhook gone | **Pending post-ship** (repo side done in 03-01) |

## Post-ship steps

a. Claude removes `NOTION_PROJECTS_DATABASE_ID` and `NOTION_WEBHOOK_SECRET` from Vercel Production with `vercel env rm <NAME> production --yes --project koussay-portfolio --scope koussays`, then confirms with `vercel env ls` (D-13).
b. Koussay deletes the Notion webhook subscription in Notion's integration settings, one numbered step (D-12).
c. Claude confirms on the live deploy: `/api/revalidate`, `/api/cms-stamp`, `/api/media/abc` return 404; share images resolve on R2.

## Self-Check: PASSED (scope reduced by Koussay's decision, recorded above)
