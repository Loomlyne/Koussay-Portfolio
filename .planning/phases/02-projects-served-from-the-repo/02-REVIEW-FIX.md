---
phase: 02-projects-served-from-the-repo
fixed_at: 2026-10-04T18:12:00+04:00
review_path: .planning/phases/02-projects-served-from-the-repo/02-REVIEW.md
iteration: 1
findings_in_scope: 11
fixed: 10
skipped: 1
status: partial
---

# Phase 2: Code Review Fix Report

**Fixed at:** 2026-10-04
**Source review:** .planning/phases/02-projects-served-from-the-repo/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 11 (CR-01, CR-02, CR-03, WR-01 to WR-09). IN-* left unfixed by scope.
- Fixed: 10 (CR-02 was already fixed before this run)
- Skipped: 1 (CR-01, by decision)

## Fixed Issues

### CR-02: letter-spacing changed on every project page

**Files modified:** `app/project/[slug]/page.module.css`
**Commit:** 3aae6b3 (before this run)
**Applied fix:** Original `-0.04em` values restored; `-0.12em` kept only on the 404 mark.

### CR-03: unreadable manifest treated as empty

**Files modified:** `scripts/media.mjs`
**Commit:** e2c910d
**Applied fix:** `readManifest()` starts empty only when the file is absent. Invalid JSON, or a manifest without a `projects` object, exits 1. Provenance files follow the same rule. Verified by running `verify` against a deliberately broken file (exit 1), then restoring it with git. Writes were already atomic (tmp + rename).

### WR-01 and WR-02: validator gaps

**Files modified:** `lib/content-schema.mjs`, `scripts/content-schema.test.mjs`
**Commit:** 6137a8e (one commit; both touch the same function)
**Applied fix:** Cover and gallery entries need positive integer `width` and `height`. `name` must be a non-empty string. `updated` must match `^\d{4}-\d{2}-\d{2}T`. Items of `services` and `tools` must be non-empty strings. Media URLs must sit under `projects/<slug>/`. Empty values for the Phase 7 fields still pass (D-10), and the 8 current modules still validate (`content ok: 8 projects, 37 media`). Seven new unit tests cover each rule (16 pass in total).

### WR-03: `_healthcheck/` delete guard

**Files modified:** `scripts/lib/r2.mjs`, `scripts/media.mjs`
**Commit:** 3d18f15
**Applied fix:** `deleteObject` refuses any key not matching `^_healthcheck/[\w-][\w.-]*$`, so `projects/...`, `_healthcheck/..` and nested paths all throw before any network call (checked locally, no R2 request). The cleanup in `check()` sits in its own try/catch and logs instead of replacing the original error.

### WR-04: `check` exit code

**Files modified:** `scripts/media.mjs`
**Commit:** 4773cd1
**Applied fix:** Failures are collected (public status, body, ACAO with and without Origin, cleanup) and the script exits 1 if any exist. Ran `check` against R2: only a `_healthcheck/` key was written and removed; exit 0.

### WR-05: `import-live --dry-run` side effects

**Files modified:** `scripts/media.mjs`
**Commit:** 2a75177
**Applied fix:** The dry-run return comes before the disk write and provenance append. `import-live --dry-run` no longer needs R2 credentials. Confirmed `media-work/` and provenance files were not touched.

### WR-06: generate lacks public read-back

**Files modified:** `scripts/media.mjs`
**Commit:** 84c25d8
**Applied fix:** After each generated cover upload, the same `getPublic` + `checkPublic` runs. Loop videos now get a HEAD size check and a public check with `video/mp4`. Both throw before the manifest is written. `generate` was not run (paid); only `--dry-run`, which makes no API calls.

### WR-07: hex segment ids in compare-rendered

**Files modified:** `scripts/compare-rendered.mjs`
**Commit:** cfa78c0
**Applied fix:** Regex uses `([0-9a-f]+)`, plus a final assertion that no `<div hidden id="S:` remains after resolution. `rendered ok 9/9` against a local server.

### WR-08: unknown slug share image

**Files modified:** `app/project/[slug]/opengraph-image.js`
**Commit:** 609668f
**Applied fix:** `notFound()` when the slug is unknown. The Twitter route re-exports it. Checked on a local production server: `/project/matchday/opengraph-image/cover` and `.../twitter-image/cover` return 404; pixenhouse returns 200 image/png.

### WR-09: smoke fragility

**Files modified:** `tests/smoke.spec.mjs`
**Commit:** d41d571
**Applied fix:** Summary step runs only if `summary` is set. The gallery test uses `PROJECTS_IN_ORDER.find(p => p.gallery.length > 0)` and skips when none exists. A null gallery `alt` is checked against the generated fallback (non-empty) instead of equality.

## Skipped Issues

### CR-01: `/api/media/*` still live and calls Notion

**File:** `app/api/media/[...parts]/route.js`
**Reason:** skipped by decision. The route stays for stale clients until Phase 3 deletes it; SC1 is narrowed accordingly.
**Original issue:** The route can still run Notion queries for old `/api/media/<id>?v=` URLs, and `next.config.mjs` still allow-lists `/api/media/**`.

## Verification

| Gate | Result |
|------|--------|
| `node --test scripts/content-schema.test.mjs` | exit 0, 16 pass |
| `node scripts/check-content.mjs` | exit 0, 8 projects, 37 media |
| `node scripts/compare-snapshot.mjs` | `snapshot ok 8/8` |
| `npm run format:check` | exit 0 |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0 (also run inside `npm test`) |
| `node scripts/media.mjs verify` | `verify ok 37/37` |
| `npm test` | exit 0, 18 passed (8.9m); load average 25 at the end (`uptime` 18:10) |
| `node scripts/compare-rendered.mjs` (local 3100) | `rendered ok 9/9` |

Note: the Playwright server log shows `Error: Internal: NoFallbackError` while the "a placeholder slug is gone" test runs. The request still returns 404 and the test passes; it is the unprepared-route 404 path of Next, not a failure. The local 3100 servers were started with the five booking and mail variables blanked and stopped by port.

---

_Fixed: 2026-10-04_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
