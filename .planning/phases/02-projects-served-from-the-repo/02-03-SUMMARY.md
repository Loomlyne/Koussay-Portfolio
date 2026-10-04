---
phase: 02-projects-served-from-the-repo
plan: 03
subsystem: hosting
tags: [vercel, deployment-protection, hyg-08]
requires: []
provides:
  - "Proof that old Vercel deployment URLs no longer serve removed files"
affects: [02-11]
key-files:
  created: []
key-decisions:
  - "HYG-08 proven from the CLI; Koussay does no Vercel steps (his instruction 2026-10-04)"
requirements-completed: [HYG-08]
completed: 2026-10-04
---

# Phase 2 Plan 03: Deployment Protection Summary

Old Vercel deployment URLs answer with a redirect to the Vercel login, so they cannot serve `/1.webp` or the PP Neue Montreal file.

## Verification

- `vercel api /v9/projects/koussay-portfolio --scope koussays` → `ssoProtection: {"deploymentType":"all_except_custom_domains"}` (Standard Protection).
- `https://koussay-portfolio-fikr17s69-koussays.vercel.app/1.webp` → 302; `/ppneuemontreal-book.otf` → 302; `/` → 302.

## Deviation: Koussay's dashboard step dropped

- Asked for the dashboard and private-window confirmation, Koussay answered (2026-10-04, question form): "i said i dont wnat vercel to work anymore on this site".
- The CLI read-back and the probes above are taken as the proof. No Vercel step is asked of him again.
- He confirmed the hosting move stays right after Phase 3 (Phase 3.1).
