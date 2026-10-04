---
phase: 03-notion-projects-path-removed
plan: 03
subsystem: media
tags: [share-card, preview, d-07, sign-off]
requires: [03-02]
provides:
  - "scripts/media.mjs share --preview, --booking, --labels (preview only)"
  - "D-07 signature: every card ships its current type; no shareType set"
affects: [03-04, 03-05]
key-files:
  modified:
    - scripts/media.mjs
decisions:
  - "D-07: Koussay signed the share cards as shown, 2026-10-04"
  - "No shareType for any project; line 2 is project.type for all eight"
  - "Accepted deviation: name-line contrast on home (4.4:1) and vamos-taxi (4.2:1) is under the UI-SPEC 4.5:1 floor, above WCAG large-text 3:1 at 72 px"
requirements-completed: []
duration: checkpoint plan
completed: 2026-10-04
---

# Phase 3 Plan 03: Share preview and D-07 sign-off Summary

`node scripts/media.mjs share --preview` renders the D-07 set to gitignored `.media-probe/share/`, and Koussay signed it with every card on its current `type` label.

## Task 1: share --preview and share --booking (2535fb8)

- Fetches covers only from media.koussay.online and checks sha256 against `content/media.json`.
- Needs no R2 keys. Prints `nothing uploaded, manifest untouched`. No R2 or manifest writes.
- `--labels` without `--preview` exits 1 with `[media] --labels is preview-only (D-03)`.

Files in `.media-probe/share/`: home, vamos-taxi (+proposal), looma-kitchen (+proposal), clickit-story (+proposal), the other five projects, `contact-sheet.jpg` (185,729 B), `booking.png` (243,805 B). Largest card is elysee-home-design at 97,674 B; all cards are under 300 KB.

Contrast, p95, line 1 / line 2:

| Card | Line 1 | Line 2 |
|------|--------|--------|
| pixenhouse (home) | 4.4 | 6.7 |
| vamos-taxi | 4.2 | 5.7 |
| looma-kitchen | 15.1 | 12.6 |
| almar-private-journey | 6.2 | 18.0 |
| artemis-luxe | 8.8 | 11.2 |
| clickit-story | 10.7 | 12.0 |
| elysee-home-design | 6.8 | 10.1 |
| fido-homes | 6.5 | 8.8 |

## Task 2: D-07 signature (checkpoint, answered 2026-10-04, question form)

Koussay's answers, verbatim:

- Q1 design: "Sign as shown (Recommended)". He was told home (4.4:1) and vamos-taxi (4.2:1) miss the UI-SPEC 4.5:1 floor on the name line but pass WCAG large-text 3:1 (72 px), and chose not to darken the fade. Recorded as an accepted deviation from the UI-SPEC contrast floor.
- Q2 Vamos Taxi: "Full System (current, Recommended)"
- Q3 Looma Kitchen: "Full System (current, Recommended)"
- Q4 Clickit Story: "Full System (current, Recommended)"

Line 2 that ships (shareType = none for all):

| Slug | Line 2 that ships | shareType |
|------|-------------------|-----------|
| pixenhouse | Brand & Web · Koussay Zayani | none |
| vamos-taxi | Full System · Koussay Zayani | none |
| looma-kitchen | Full System · Koussay Zayani | none |
| almar-private-journey | Brand & Web · Koussay Zayani | none |
| fido-homes | Brand & Web · Koussay Zayani | none |
| elysee-home-design | Brand & Web · Koussay Zayani | none |
| clickit-story | Full System · Koussay Zayani | none |
| artemis-luxe | Web Design · Koussay Zayani | none |

## Deviations from Plan

None in execution. One accepted design deviation (contrast above), signed by Koussay.

## Notes

- MEDIA-07 stays open until plan 05; not ticked here.
- content/media.json and R2 untouched. Nothing pushed or deployed.

## Self-Check: PASSED

Commit 2535fb8 present; scripts/media.mjs modified.
