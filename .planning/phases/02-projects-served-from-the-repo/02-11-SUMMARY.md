---
phase: 02-projects-served-from-the-repo
plan: 11
subsystem: testing
tags: [mutation-proof, smoke, content-build, uat]
requires: [02-10, 02-09, 02-03]
provides:
  - Proof that the smoke test and the content build bite on the defects they guard
  - Phase-end gate result on the final tree
  - After-screenshots for the side-by-side UAT
key-files:
  created:
    - .planning/phases/02-projects-served-from-the-repo/uat/after/ (18 PNGs)
  modified: []
requirements-completed: [TEST-02, CONT-06, MEDIA-02, MEDIA-03]
metrics:
  completed: 2026-10-04
---

# Phase 2 Plan 11: Safety-net proof and phase-end gate Summary

Four mutations each turned the guard red with the expected log line, the restored tree was green twice, and the phase-end gate passed on the final tree with 18 after-screenshots ready for UAT. No code changed.

## Mutation log (exit code, matching line)

| Run | Mutation | Exit | Line in log |
|-----|----------|------|-------------|
| M1 | delete `approach` in fido-homes | 1 | `[cause]: Error: [content] fido-homes.approach: key missing` |
| M2 | pixenhouse gallery[3].media -> `brand-guideline-p99` | 1 | `[content] pixenhouse.gallery[3].media "brand-guideline-p99": not in content/media.json` |
| M3 | remove `img.crossOrigin` in components/ring/atlas.js | 1 | `THREE.WebGLState: SecurityError: Failed to execute 'texSubImage2D' ... Tainted canvases may not be loaded.` |
| P1 | M3 restored | 0 | 1 passed |
| M4 | `uResolution` -> `uResolutionX` at one use in the ring fragment shader | 1 | `THREE.WebGLProgram: Shader Error 0 - VALIDATE_STATUS false` |
| P2 | M4 restored | 0 | build ok, test passed |

Assumption A4 held (three logs shader errors through console.error), so the smoke test needed no change and no `test(02-11)` commit was made. Each mutation was reverted with `git checkout -- <file>`; `git status --porcelain` and `git diff --stat` for app, components, lib, content and scripts were empty before the commit. Port 3100 was free after every run. Load average was 9 to 12 during the runs; no Playwright failure needed a re-run.

## Phase-end gate (final tree)

- `npm run format:check` 0, `npm run lint` 0, `node --test scripts/content-schema.test.mjs` 0, `node scripts/check-content.mjs` 0 (`content ok: 8 projects, 37 media`), `node scripts/compare-snapshot.mjs` 0 (`snapshot ok 8/8`).
- `npm run build` 0; `● /project/[slug]` lists pixenhouse, vamos-taxi, looma-kitchen and 5 more paths.
- `npm test` 18 passed (desktop and phone).
- `node scripts/compare-rendered.mjs` last line `rendered ok 9/9`; `/llms.txt` diff against snapshot empty.
- `node scripts/media.mjs check`: `public ok` and `cleanup ok`, acao `*` with and without Origin; `verify ok 37/37`.
- Cover header proof (media.koussay.online/projects/pixenhouse/cover-b5c64eb5.webp), cold (MISS), warm twice (HIT), warm with `Origin: https://koussay.online` (HIT): each `image/webp`, `public, max-age=31536000, immutable`, one `access-control-allow-origin: *`.
- Static checks: no placeholder files or `components/ring/projects.js` tracked; no Notion-for-projects callers outside `app/api/media`, `lib/notion` and `CmsLive`; bookings code unchanged since 124cfc6 (empty diff).
- After-screenshots: 18 files in `uat/after/`, names identical to `snapshot/screens/` (home and 8 slugs at 1512 and 390).

SC1, narrowed wording: no page, build step or current client code calls Notion for projects; /api/media remains for stale clients until Phase 3 deletes it.

## Deviations from Plan

None to the code. Two literal-reading notes:

- `grep -rn "r2\.dev" ... scripts` matches one line, `scripts/content-schema.test.mjs:135`, a negative test fixture that proves the schema rejects an r2.dev URL. No served code, content or config references r2.dev. Left as is.
- `npm test` log shows `Error: Internal: NoFallbackError` from the Next web server on the placeholder-slug 404 test, and a warning that `next start` does not work with standalone output. Tests pass; both predate this plan. Not fixed (out of scope).

## Verified / not verified / failed

- Verified: everything above.
- Not verified: the visual side-by-side (snapshot/screens vs uat/after), the signed 404, which are Koussay's UAT; no push, no deploy done.
- Failed: nothing.

## Commits

- 9960de4 docs(02-11): after-screenshots for the side-by-side UAT (planning note, no code, no deploy)

## Self-Check: PASSED
