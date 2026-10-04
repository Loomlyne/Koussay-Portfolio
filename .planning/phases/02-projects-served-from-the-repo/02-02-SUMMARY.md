---
phase: 02-projects-served-from-the-repo
plan: 02
subsystem: edge
tags: [cloudflare, cors, r2, transform-rules]
requires: []
provides:
  - "media.koussay.online sends Access-Control-Allow-Origin: * on every response"
affects: [02-04, 02-06, 02-07, 02-11]
key-files:
  created: [.planning/phases/02-projects-served-from-the-repo/cloudflare/media-acao-rule.json, .planning/phases/02-projects-served-from-the-repo/cloudflare/before.txt, .planning/phases/02-projects-served-from-the-repo/cloudflare/after.txt]
key-decisions:
  - "Response header rule uses set (not add), scoped to http.host eq media.koussay.online"
requirements-completed: []
completed: 2026-10-04
---

# Phase 2 Plan 02: Media host ACAO rule Summary

Every response from `media.koussay.online` now carries exactly one `Access-Control-Allow-Origin: *`, with or without an `Origin` header; koussay.online itself is untouched.

## Approval

- Koussay's own reply in the control session's question form ("Apply this header rule to the live koussay.online zone?"): **"Approved"**, 2026-10-04 16:25 +04.
- Approved command, run from the repo folder under cf profile `koussay` (account `4afee478…`):
  `cf rulesets account-rulesets phases update http_response_headers_transform -z d98c6ae2d8f14c329dafe0fa530a9d98 --rules @.planning/phases/02-projects-served-from-the-repo/cloudflare/media-acao-rule.json`
- The approval was given in the control session, so the orchestrator ran Task 2's apply and Task 3 directly.

## Verification

- Before: zone had no `http_response_headers_transform` entrypoint (404); dry run with `--validate-only true` exited 0 and saved nothing.
- Apply exit 0; ruleset `3062585e605b450bb0b3adc72a3ca668`, rule `f055f0404f6d40bfb251e74e65152374`, action `rewrite`, operation `set`, value `*`.
- Read-back: exactly 1 rule.
- `curl` on `https://media.koussay.online/__acao-probe-404`: no Origin → 1 ACAO header; with Origin → 1 ACAO header (no duplicate).
- Apex `https://koussay.online/`: 0 ACAO headers (scope proven).
- Evidence: `cloudflare/before.txt`, `cloudflare/after.txt`.

## Not verified

- Cover content type, immutable cache and cold/warm behaviour: no objects yet; Plan 04 checks them.

## Deviations

- Orchestrator executed Tasks 2 and 3 because the approval was given in its own session.
