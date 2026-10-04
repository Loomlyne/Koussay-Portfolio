---
phase: 02-projects-served-from-the-repo
plan: 05
subsystem: content
tags: [content-modules, validator, snapshot]
requires: ["02-01", "02-04"]
provides:
  - "lib/content-schema.mjs: SCHEMA_KEYS, GALLERY_KEYS, validateContent, resolveContent (pure)"
  - "content/projects/*.mjs: 8 live projects with the full schema, index.mjs with ORDER and PROJECTS_IN_ORDER"
  - "scripts/check-content.mjs and scripts/compare-snapshot.mjs gates"
affects: [02-06, 02-07, 02-11]
key-files:
  created: [lib/content-schema.mjs, scripts/content-schema.test.mjs, scripts/check-content.mjs, scripts/compare-snapshot.mjs, content/projects/index.mjs, content/projects/pixenhouse.mjs, content/projects/vamos-taxi.mjs, content/projects/looma-kitchen.mjs, content/projects/almar-private-journey.mjs, content/projects/fido-homes.mjs, content/projects/elysee-home-design.mjs, content/projects/clickit-story.mjs, content/projects/artemis-luxe.mjs]
key-decisions:
  - "Modules are `const project = {...}; export default project;` to satisfy import/no-anonymous-default-export"
requirements-completed: [CONT-02, CONT-06]
completed: 2026-10-04
---

# Phase 2 Plan 05: Content modules and validator Summary

The eight live projects now live in repo content modules with all 22 schema keys, equal to the live snapshot field for field, behind a validator that names slug and field. The app is not switched (Plan 07), so visitors see no change.

Commits (not pushed): `b95dba9` (RED), `9185069` (validator + check-content), `1870105` (modules + compare-snapshot).

## Results (exit codes)

- `node --test scripts/content-schema.test.mjs`: 10 pass, 0 fail, exit 0. RED run failed first (module absent).
- `node scripts/compare-snapshot.mjs`: `snapshot ok 8/8`, exit 0.
- `node scripts/check-content.mjs`: `content ok: 8 projects, 37 media`, exit 0.
- Prettier check on content, scripts, lib/content-schema.mjs: clean. `npm run lint` exit 0; `npx eslint content scripts lib/content-schema.mjs` exit 0.
- Pixenhouse: 29 items `kind: "identity"`, 29 `brand-guideline-p` refs. 9 files in content/projects, no imports in modules except index.mjs, no `@/`.
- `git status` for app, components, lib/projects.js, lib/cms: clean.

## Mutation proof (restored afterwards)

- Removed `approach` from fido-homes: exit 1, `[content] fido-homes.approach: key missing`.
- Pixenhouse gallery[3].media set to `brand-guideline-p99`: exit 1, `[content] pixenhouse.gallery[3].media "brand-guideline-p99": not in content/media.json`.
- Both restored; check-content and compare-snapshot green again.

## Deviations from Plan

**[Rule 1 - Lint] Anonymous default export warnings.** The 8 modules first used `export default {...}`, giving 8 `import/no-anonymous-default-export` warnings. Changed to a named const exported as default. Values unchanged; compare-snapshot still 8/8.

**Process note.** The mutation restore with `git checkout -- content/projects` did nothing because the files were still untracked; I restored fido-homes and pixenhouse from copies and re-ran both gates green before committing. The committed files are the unmutated ones (verified by compare-snapshot and check-content after restore).

## Notes

- check-content prints a Node `MODULE_TYPELESS_PACKAGE_JSON` warning to stderr when importing `components/shaders/planeShaders.js` by file URL (no `"type": "module"`). Harmless, exit codes unaffected; not changed, since it would affect the whole app.
- Content values come only from the committed snapshot; `testimonial` is null for all 8 (all empty live), `approach` null (D-12), `liveUrl` copied as live including the trailing slash on ALMAR.

## Known Stubs

None. Empty fields (kind, client, industry, location, role, status, services, identity) are intentionally empty per D-09.

## Self-Check: PASSED

All 13 created files present; commits b95dba9, 9185069, 1870105 exist.
