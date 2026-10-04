---
phase: 02-projects-served-from-the-repo
plan: 04
subsystem: media
tags: [r2, manifest, scripts, cloudflare]
requires: ["02-01", "02-02"]
provides:
  - "scripts/media.mjs: check | import-live | verify | generate, the only writer of R2 projects/ objects and content/media.json"
  - "content/media.json: 8 covers and 29 Pixenhouse pages on media.koussay.online"
affects: [02-05, 02-06, 02-07, 02-11]
key-files:
  created: [scripts/media.mjs, content/media.json]
  modified: [scripts/lib/r2.mjs, .gitignore, .prettierignore]
  deleted: [scripts/generate-project-media.mjs]
key-decisions:
  - "Keys are projects/<slug>/<slot>-<sha8>.webp, uploaded with Cache-Control public, max-age=31536000, immutable"
  - "deleteObject exists only for _healthcheck/ cleanup"
requirements-completed: [MEDIA-02, MEDIA-04]
completed: 2026-10-04
---

# Phase 2 Plan 04: Single media writer, live images on R2 Summary

All 37 live images (8 covers, 29 Pixenhouse pages) are on `media.koussay.online`, byte-identical to what koussay.online served, recorded in `content/media.json` by the only writer. The site does not read them yet, so visitors see no change.

Commit `95a0974` (not pushed, not deployed).

## Results

- `check`: put, head, `public ok`, `acao (no Origin): *`, `acao (Origin): *`, `cleanup ok` (healthcheck object deleted; exit 0).
- `import-live --dry-run`: 37 keys, exit 0, no manifest written.
- `import-live`: 37 `ok`, exit 0 (each first GET was cf-cache-status MISS).
- Second `import-live`: 37 `skip`, `content/media.json` byte-identical (cmp).
- `verify`: `verify ok 37/37`, with and without Origin.
- Manifest: 8 projects, every cover 1600 wide, Pixenhouse cover 1600x1200 with sha256 equal to `media-work/pixenhouse/cover.webp`, 29 gallery slots.
- Prettier (whole repo) and `npm run lint` exit 0.

## Header proof (pixenhouse cover, `projects/pixenhouse/cover-b5c64eb5.webp`)

| Request | Status | content-type | cache-control | ACAO | cf-cache-status | vary |
|---|---|---|---|---|---|---|
| cold (`?cold=<ts>`) | 200 | image/webp | public, max-age=31536000, immutable | * (one) | MISS | none |
| warm 1 | 200 | image/webp | same | * (one) | HIT | none |
| warm 2 | 200 | image/webp | same | * (one) | HIT | none |
| warm, Origin koussay.online | 200 | image/webp | same | * (one) | HIT | Origin |

Assumption A2 (zone Browser Cache TTL shortening cache-control) did not occur; no zone setting touched.

## Deviations from Plan

- Generate path is ported but simplified: the old 512-wide "cell" rendition is dropped (the manifest has cover and loop only, per the plan). Not run except by design in this phase (`generate` was not executed; it exits 1 until `content/projects/index.mjs` lands in Plan 05).
- The old script's `--probe` referenced `imageEndpoint` before its declaration; in media.mjs the endpoints are defined first.

## Not verified

- `generate` (no credentials used, content index not present yet).

## Known Stubs

None.

## Self-Check: PASSED

scripts/media.mjs, content/media.json, commit 95a0974 present; `scripts/generate-project-media.mjs` removed; `media-work/` untracked and ignored; no credential material in logs or manifest.
