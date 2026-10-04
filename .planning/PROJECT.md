# Koussay Portfolio

## What This Is

Koussay Zayani's portfolio at https://koussay.online. One full-screen WebGL shader draws a ring of project cards; scroll, drag or swipe turns it and a card settles at the front. Clicking a card opens a case study with a launch video, a gallery and any branding made for the project, and every page leads to a booking form. It is for prospects in Dubai and the GCC deciding whether to hire Koussay for web work.

The ring is the hook. The case studies and the booking form are the close.

## Core Value

A prospect can go from the ring to a true case study to a booked call without meeting one fake thing.

## Requirements

### Validated

- ✓ WebGL ring with goo, glass lip and honey threads; scroll, drag, swipe, click-to-centre — existing
- ✓ Click a front card to open `/project/[slug]` through a shared-element transition — existing
- ✓ Project page with hero, summary, challenge, outcome, role, tools, gallery, prev/next pager — existing
- ✓ Eleven-step booking flow at `/booking` with availability, slot claim, Notion Calendar event, Resend confirmation to visitor and owner — existing
- ✓ Open Graph and Twitter images per route, JSON-LD for site and projects — existing
- ✓ Live on Vercel at koussay.online with production deploys from `main` — existing
- ✓ Next.js patched to 16.3.8 for the critical Image Optimization RCE — this session
- ✓ Prettier baseline, Playwright smoke test (home, every project, booking; desktop and phone) — Phase 1
- ✓ Geist and Geist Mono for every face, OFL shipped; PP Neue Montreal and Satoshi removed — Phase 1
- ✓ LICENSE credits Koussay above Yousuf Soomro, upstream MIT and simplex notices intact; README and BREAKDOWN credit the upstream ring — Phase 1

### Active

- [ ] Ring holds exactly eight real projects: fidohomes.ae, elyseehomedesign.com, artemis-luxe.com, clickitstory.com, numaitrading.com, Vamos Taxi, Invios, Payme
- [ ] Each project has a written case study (summary, challenge, outcome, role, tools) drafted by Claude from an interview with Koussay and approved by him
- [ ] Each project has a Higgsfield-generated cover and gallery art; branding Koussay made for the project is in its gallery
- [ ] Each project has a launch video (brag skill plus Higgsfield); the ring shows a still, the project page hero autoplays it muted with the still as poster
- [ ] Payme shows a pre-launch state (no live URL yet) without looking broken
- [ ] Project content and media references live in the repo; Notion is no longer read for projects
- [ ] All media served from Cloudflare R2 with immutable URLs; the Notion media proxy and PDF renderer are deleted
- [ ] Bookings and blocked time keep working through Notion and Resend after the projects side is removed
- [ ] No Behance art, no invented names, types or years in the tree or served to visitors (fonts done in Phase 1)
- [ ] `/api/revalidate` fails closed without a secret, or is removed with the Notion projects path
- [ ] `prefers-reduced-motion` skips the entry timeline and spin blur
- [ ] Arrow keys, Home and End step the ring
- [ ] `sharp` on a patched major, or removed from the runtime with the proxy
- [ ] AGENTS.md matches the tree (layout, line counts, gaps)

### Out of Scope

- Video textures inside the ring shader — heavy; only after the image version ships, as its own phase
- Moving bookings to Supabase or Neon — Notion works at a one-person calendar's volume; revisit if double bookings happen
- Obox MENA and ZARA Dubai Hills cards — Koussay chose client sites and own products only
- Blog, CMS admin, multi-language — not asked for
- Rewriting git history to purge the Behance files — public repo risk is noted; decided separately from this milestone

## Context

- Brownfield. Codebase map in `.planning/codebase/` (2026-10-02). `AGENTS.md` is authoritative on the ring internals and must be read before touching `components/`; its layout and gaps sections are stale.
- Stack: Next.js 16.3.8 App Router, React 19, Three.js r185, GSAP, Tailwind v4, Vercel. No tests, no CI. `npm run build` plus `npm run lint` is the whole safety net.
- Content today comes from a Notion projects database through `lib/cms/projects.js`, with eighteen placeholder rows as fallback. Media goes through `/api/media/*`, which fetches Notion signed URLs, renders PDFs with `pdfjs-dist` and `@napi-rs/canvas`, and re-encodes with `sharp`. All of that goes.
- Bookings: `lib/book/*`, `lib/notion/bookings.js`, `lib/mail/booking.js`, `app/api/book/*`. Stays.
- Media generation pipeline exists but has never run against real credentials: `scripts/generate-project-media.mjs`, `scripts/lib/{higgsfield,r2,art-direction}.mjs`. Hand-rolled SigV4 for R2. `HF_CREDENTIALS` in `.env.local` is still empty; R2 bucket and token not yet created.
- Higgsfield MCP tools are connected in this session. Auto memory: the free plan gated generation; Koussay now says he has API access.
- Launch videos: the `brag` skill (Hyperframes) builds a video from project code or a URL. Payme has no URL, so its video comes from the repo or a generated concept.
- The ring's radius follows project count (`radiusForCount`, authored for 18). Eight cards changes the composition; `AGENTS.md` says re-check at 11 and 32, so check at 8.
- `MAX_PLANES = 32` caps project count through the uniform budget.
- Known live defects from the map: unauthenticated cache bust in `/api/revalidate` when the secret is unset; `removeConsole` hides every non-error log in production; `remotePatterns` absent so `next/image` cannot load R2 URLs; `sharp` high advisory (breaking major); 17 files fail `prettier --check`.
- Repo origin is `Loomlyne/Koussay-Portfolio`; LICENSE names Yousuf Soomro. Under MIT the notice stays.

## Constraints

- **Hosting**: Vercel until Phase 3.1, then Cloudflare Workers in Koussay's own Cloudflare account (decided 2026-10-03)
- **Bookings store**: Notion stays for bookings and blocked time — zero migration, Koussay reads them in Notion Calendar
- **Media host**: Cloudflare R2 with content-addressed immutable URLs — Notion signed URLs expire and were the cause of slow cold loads
- **Licensing**: nothing served that Koussay does not own or hold a licence for — public repo, commercial site
- **Ring internals**: the non-obvious designs in `AGENTS.md` (packed `uScale`, fan-order indices, one-frame-stale focus, snap-only-decelerates, `forceContextLoss`) are preserved
- **Control**: this is the control session; one control session ships, work sessions build in worktrees and hand over; Koussay signs plan, UAT and ship
- **Secrets**: stay in Koussay's terminal; Claude never reads or types them
- **Costs**: Higgsfield and Hyperframes spend is Koussay's; generation runs behind the manifest gate and `--dry-run` first

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Real work plus generated art, eight cards | Every click must land on a true project; generated covers fill where screenshots are weak | — Pending |
| Drop Notion for projects, keep it for bookings | Notion caused the slow loads and 429s on the content path; bookings work and are read there | — Pending |
| Content in the repo, written by Claude from interviews | Koussay answers questions, Claude drafts, Koussay approves | — Pending |
| Media on R2, immutable URLs | Decided earlier (auto memory); removes the proxy and PDF code | — Pending |
| Launch video per project via brag skill plus Higgsfield; still on the ring, video on the page hero | Ring stays an image atlas; video in the shader deferred | — Pending |
| Stay on Vercel until Phase 3, then move to Cloudflare Workers (Phase 3.1) | Koussay wants everything on Cloudflare; native deps are gone after Phase 3 | — Pending |
| Geist everywhere, delete PP Neue Montreal and Satoshi | PP Neue not licensed for commercial use; Satoshi's ITF licence bars public-repo distribution | ✓ Good (Phase 1, signed 2026-10-03) |
| Keep upstream MIT notice, add README attribution | MIT requires it; honest provenance | — Pending |
| Next patched to 16.3.8 in-place, `sharp` major deferred to a phase | Critical RCE fixed same day; `sharp` is breaking and may be removed entirely | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-04 after Phase 1*
