---
phase: 03-notion-projects-path-removed
depth: standard
files_reviewed: 21
status: fixed
findings:
  critical: 0
  warning: 5
  info: 3
  total: 8
fixed: [WR-01, WR-02, WR-03, WR-04, IN-02]
open: [WR-05, IN-01, IN-03]
reviewed_at: 2026-10-04
---

# Phase 3 Code Review

Base `ca24456`, 21 changed source files, standard depth (gsd-code-reviewer). No blockers. No remaining imports of deleted modules; the only hits for removed routes are the smoke test's 404 assertions.

## Warnings

- **WR-01** `lib/share.mjs` `projectLines` printed `"null · Koussay Zayani"` when `type` is null, and `lib/content-schema.mjs` skipped the og staleness check for a null type. **Fixed:** line 2 falls back to `Koussay Zayani`; the `isStr(p.type)` guard is removed. Output for every current project is unchanged, so no card hash changes.
- **WR-02** `scripts/media.mjs` `--only=<typo>` exited 0 doing nothing. **Fixed:** `checkOnly(ORDER)` exits 1 on an unknown slug in `share` upload and preview.
- **WR-03** `scripts/check-content.mjs` crashed on a manifest project without `gallery`. **Fixed:** `p.gallery ?? {}`.
- **WR-04** `resolveContent` dereferenced `m.gallery` unguarded. **Fixed:** `m.gallery?.[g.media]`.
- **WR-05** `sharp` is a devDependency; the Docker/standalone image path is untested for `next/image`. **Open:** Vercel builds are verified; Docker is replaced by Workers in Phase 3.1, where image optimisation is re-decided.

## Info

- **IN-01** Preview sign-off HTML hard-codes four slugs and does not escape `"` (slugs are validated, harmless). Open.
- **IN-02** Project page hard-coded og `1200`/`630`. **Fixed:** uses `project.og.width/height`.
- **IN-03** `SCHEMA_KEYS.length === 22` magic count in tests. Open.
