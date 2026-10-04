---
phase: 03-notion-projects-path-removed
plan: 04
subsystem: media
tags: [share-card, r2, manifest, build-gate]
requires: [03-03]
provides:
  - "9 immutable og cards on media.koussay.online, recorded in content/media.json (og per project, site.home)"
  - "build and check-content fail on a missing or stale og / site.home"
  - "project.og and getHomeShare() in lib/content.js"
affects: [03-05]
key-files:
  modified:
    - scripts/media.mjs
    - content/media.json
    - lib/content-schema.mjs
    - lib/content.js
    - scripts/check-content.mjs
    - scripts/content-schema.test.mjs
decisions:
  - "No shareType: all three labels kept as signed in 03-03, so projectLines and the content modules are unchanged"
  - "origin.from rewritten once with a throwaway script (not a script branch) to notion-snapshot:<pageId>[/<slot>]; only origin.from changed"
requirements-completed: []
duration: one session
completed: 2026-10-04
---

# Phase 3 Plan 04: Publish share cards and gate the build Summary

Nine signed og cards are on R2 and recorded by `scripts/media.mjs` (sole writer); the build now refuses to ship a missing or stale card.

## Commits

- 9e0486c feat: share upload mode, verify covers og and site.home, import-live removed, provenance rewritten, 9 cards uploaded
- test(03-04) RED commit: failing og and site.home validation tests
- ddff759 feat: validator, getHomeShare, check-content parity

## Cards on R2 (immutable, image/jpeg, 1200x630)

| Key | Bytes | Line 2 |
|-----|-------|--------|
| projects/_site/og-home-839a1a24.jpg | 56,955 | Creative developer and brand designer (line 1 "Koussay Zayani") |
| projects/pixenhouse/og-f20c9cbb.jpg | 54,741 | Brand & Web · Koussay Zayani |
| projects/vamos-taxi/og-21263e7e.jpg | 80,876 | Full System · Koussay Zayani |
| projects/looma-kitchen/og-275ff54d.jpg | 47,126 | Full System · Koussay Zayani |
| projects/almar-private-journey/og-66eeff54.jpg | 35,478 | Brand & Web · Koussay Zayani |
| projects/fido-homes/og-b163df98.jpg | 78,412 | Brand & Web · Koussay Zayani |
| projects/elysee-home-design/og-b6fff25a.jpg | 97,674 | Brand & Web · Koussay Zayani |
| projects/clickit-story/og-d0fa4b33.jpg | 80,504 | Full System · Koussay Zayani |
| projects/artemis-luxe/og-c33c441e.jpg | 60,403 | Web Design · Koussay Zayani |

## Verified

- `share --dry-run`: 9 `would upload`; real run: 9 `ok`; second run: 9 `skip (inputs unchanged)`, nothing uploaded.
- `media.mjs verify`: ok 46/46 (covers, gallery, 8 og, site/home) with size, sha256, content-type, cache-control, CORS.
- `curl -I` on the home card: 200, image/jpeg, `public, max-age=31536000, immutable`.
- `grep -c api/media content/media.json` = 0; every cover and gallery key, url, sha256 equals HEAD's (the diff is 37 `origin.from` lines).
- `grep -c import-live scripts/media.mjs` = 0; `--labels` without `--preview` still exits with the D-03 message.
- Schema tests 19/19 (3 new). `check-content`: `content ok: 8 projects, 37 media, 9 share`.
- Mutation: renaming "Fido Homes" made check-content fail with `[content] fido-homes.og: stale, run: node scripts/media.mjs share --only=fido-homes`; module restored (`git diff --quiet content/projects`).
- Prettier, lint and `npm run build` pass.

## Not verified

- Pages do not use project.og or getHomeShare yet (Plan 05). No social-platform scraper check.

## Deviations from Plan

- Provenance rewrite ran as a one-off `node -e` script instead of a temporary branch inside media.mjs; same result, nothing to delete afterwards.
- Plan task 1 verify mentions `--labels="vamos-taxi:X" --dry-run` failing; confirmed it exits 1 with the preview-only message.

## Notes

- MEDIA-07 and MEDIA-08 stay open until plan 05. Nothing pushed or deployed. Old R2 objects untouched, none deleted.
- Task 1 and Task 2 were committed separately; the RED test commit precedes the GREEN commit.

## Self-Check: PASSED
