---
status: partial
phase: 03-notion-projects-path-removed
source: [03-VERIFICATION.md]
started: 2026-10-04T17:38:01Z
updated: 2026-10-04T18:10:00Z
---

## Current Test

number: 1
name: Notion webhook subscription deleted
expected: Koussay deletes the webhook in the Notion integration settings (D-12)
awaiting: Koussay (numbered step given in chat)

## Tests

### 1. Dead Vercel env vars removed and Notion webhook deleted (post-ship)
expected: Claude runs `vercel env rm NOTION_PROJECTS_DATABASE_ID production` and `vercel env rm NOTION_WEBHOOK_SECRET production` (D-13) and `vercel env ls` no longer lists them; Koussay deletes the Notion webhook subscription in one numbered step (D-12)
result: partial
note: Shipped 2026-10-04 22:02 +04 (main e7bdb60). Both env vars removed from Vercel production 22:09 +04, `vercel env ls` no longer lists them. Notion webhook deletion is Koussay's step, still open.

### 2. Live share images (post-ship)
expected: On koussay.online, the home page and a project page carry og:image = media.koussay.online og-<sha8>.jpg at 1200x630, twitter:image equal; booking og:image is the static PNG; /api/media/abc, /api/cms-stamp, /api/revalidate return 404
result: pass
note: Live 2026-10-04 22:05 +04. Home og/twitter image media.koussay.online/projects/_site/og-home-839a1a24.jpg; pixenhouse og-f20c9cbb.jpg (both 200 image/jpeg, 1200x630, twitter equal); booking is the static PNG (200 image/png); the three routes 404.

## Summary

total: 2
passed: 1
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
