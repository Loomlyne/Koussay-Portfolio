# Phase 3: Notion projects path removed - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-04
**Phase:** 3-Notion projects path removed
**Areas discussed:** Share image look, Where the booking test runs, Old /api/media links

---

## Share image look

| Question | Options | Selected |
|----------|---------|----------|
| Project share image | Cover only, as today / Cover plus project name | Cover plus project name |
| Home share image | First ring project's cover / Logo on grey | First ring project's cover |
| Booking share image | Logo on grey, as today / Same as home | Logo on grey, as today |
| Project text | Name + your name / Name + type + your name / Name only | Name + type + your name |
| Layout | Bottom-left over dark fade / Solid band under cover | Bottom-left over dark fade |
| Home text | Koussay Zayani + second line / No text | Koussay Zayani + second line |
| Home second line | Creative developer and brand designer / Web design and development | Creative developer and brand designer |
| Type labels | Use as written / Rewrite for sharing | Free text: "if you have better than what's existing now that's great, if you don't keep it like it is" |
| Sign-off | Pictures first, then code / Sign at UAT | Pictures first, then code |

**Notes:** Claude flagged that "Web design and development" was its own wording, and offered the site's existing description instead. Koussay chose the existing wording.

---

## Where the booking test runs

| Question | Options | Selected |
|----------|---------|----------|
| Booking test location | Local build with real keys before ship / Live after ship / Both | Local build with real keys before ship |
| Test row | Koussay deletes it / Keep it | Koussay deletes it |
| Blocked time | Read-only check by Claude / Koussay adds a test block | Read-only check by Claude |

---

## Old /api/media links

| Question | Options | Selected |
|----------|---------|----------|
| Old addresses | Plain 404 / Redirect to R2 image | Plain 404 |
| Notion webhook | Koussay deletes it in one step / Leave it | Koussay deletes it in one step |

---

## Claude's Discretion

- Dead `cachedDataSourceId` in `lib/notion/client.js`, `lib/media.js`, unused `props.js` helpers, robots entries, `revalidate` removal, gradient/type sizing, share image format.

## Deferred Ideas

- Deleting the Notion projects database or rows: not planned.
