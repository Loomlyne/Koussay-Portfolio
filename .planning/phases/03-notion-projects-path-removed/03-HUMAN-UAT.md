---
status: partial
phase: 03-notion-projects-path-removed
source: [03-VERIFICATION.md]
started: 2026-10-04T17:38:01Z
updated: 2026-10-04T17:38:01Z
---

## Current Test

[awaiting ship — both items run after the Phase 3 deploy]

## Tests

### 1. Dead Vercel env vars removed and Notion webhook deleted (post-ship)
expected: Claude runs `vercel env rm NOTION_PROJECTS_DATABASE_ID production` and `vercel env rm NOTION_WEBHOOK_SECRET production` (D-13) and `vercel env ls` no longer lists them; Koussay deletes the Notion webhook subscription in one numbered step (D-12)
result: [pending]

### 2. Live share images (post-ship)
expected: On koussay.online, the home page and a project page carry og:image = media.koussay.online og-<sha8>.jpg at 1200x630, twitter:image equal; booking og:image is the static PNG; /api/media/abc, /api/cms-stamp, /api/revalidate return 404
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
