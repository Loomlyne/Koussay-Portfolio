# Next session prompt — ring load, scroll, missing covers

Paste this into a new agent session. The site is a Next.js 16 WebGL portfolio
carousel (`components/Carousel.jsx`). Read `AGENTS.md` before changing the
ring. Do not present placeholder Behance art as the author's work.

## What the previous session already did

These are in the tree. Do not redo them unless they regressed.

1. **Ring radius follows project count.** Card size and neighbour gap stay
   constant. `radiusForCount()` in `components/ring/utils.js`. Authored
   radius `340` is for `ringRefCount: 18`. Live Notion currently has **11**
   published covers, so the circle shrinks; adding a project grows it.
2. **Phone scale.** `minScale` 0.38, `tightRadius` 0.76, `tightEndScale` 3.6
   so the arc no longer eats a phone screen.
3. **Facing card stays centred.** Hub `posX` was authored against 18 slots.
   With fewer projects the old math clamped the open card to the left edge.
   Layout now pins the front card where the 18-card composition put it
   (near centre) and only moves the hub. See `frontTarget` in `Carousel.jsx`.
4. **Smear while spinning.** Goo / honey / glass drop for the throw on every
   size and return when parked. Wheel `scrollSpeed` 0.0034, `damping` 0.91.
5. **Charging 001 / Notion hangs (started this session, must verify on
   production).** Notion client `timeoutMs: 4000`, `retry: false`. Media
   URL lookups cached 5 min. Upstream image fetch 5s timeout + 1h
   revalidate. Atlas waits on 1 facing cell; 1.8s failsafe opens the ring
   even if that cell is late. `getProjects` 3s timeout and **does not cache
   the 18-placeholder fallback** over a good payload. `CmsLive` stamp poll
   20s, not 1.5s. Atlas `Image()` gives up at 8s.

## What is still broken / must verify

User report 4 Sep 2026, koussay.online: reload sat on CHARGING 001 for
~16–20s; scroll not smooth; some covers wrong or blank.

The load-path fixes above are **local until deployed**. Next session must
hard-reload production and confirm:

- Time to ring motion is a few seconds, not twenty.
- Network: `/api/media/...` is cached after first load; `/api/cms-stamp`
  is not firing every 1.5s.
- The live **11** Notion projects show, not the 18 local placeholders.
- Wheel/trackpad throw stays sharp; covers fill in if they land late.

## Investigate first (in this order)

1. Production Network tab on a hard reload: time-to-first-byte of `/`, then
   each `/api/media/...` (status, TTFB, Cache-Control). Confirm whether
   CHARGING 001 is waiting on media or on `getProjects` SSR.
2. Notion rate limit: count `/api/cms-stamp` + media `pages.retrieve` +
   project list queries during one load. Stamp poll must not be 1.5s.
3. Atlas gate: `atlasLaunch` (was 7). Counter cannot leave 001 until
   `settled / launchAt` moves. One hung Image() blocks the whole entry.
4. Whether `unstable_cache(["cms-projects"])` stored the **fallback 18**
   after a failed Notion call (that would look like “wrong projects”).
5. Desktop scroll: profile a wheel throw. If GPU bound, extend the cheap
   spin path beyond lo-fi. If input bound, `scrollSpeed` / `damping` /
   snap fighting the wheel.
6. Blank cards: which `file` URLs 404, and whether Notion cover files are
   empty vs the proxy dropping the body.

## Remaining work (verify first, then only fix what still fails)

The load/scroll/cache changes listed above are already in the tree. Do
not re-implement them. Hard-reload production and:

- Confirm charging leaves 001 within ~2s and the ring unfurls.
- Confirm covers fill in (blank cells = media 404 or atlas timeout).
- Confirm the project list is the live 11, not the 18 placeholders.
- Profile a desktop wheel throw; only retune `scrollSpeed` / `damping`
  if it still feels heavy after deploy.
- If Notion 429s persist, look at remaining `pages.retrieve` fan-out
  (one per cover on a cold media cache) and consider writing cover bytes
  keyed by `pageId + last_edited_time` so signed URLs are not on the
  critical path.

## Files

- `components/Carousel.jsx` — loader gate, 1.8s failsafe, cheap spin, front pin
- `components/ring/atlas.js` — 8s image timeout
- `components/ring/params.js` — atlasLaunch 1, scrollSpeed, tight/minScale
- `app/api/media/[...parts]/route.js` — cached URL lookup, 5s upstream
- `lib/notion/client.js` — timeoutMs 4000, retry false
- `lib/notion/projects.js` — `cachedNotionMediaUrl`, stamp timeout
- `lib/cms/projects.js` — 3s list timeout, do not cache fallback
- `components/CmsLive.jsx` — stamp poll 20s
- `app/api/cms-stamp/route.js`

## Commands

```bash
npm run dev    # localhost:3000
npm run build
npm run lint
npx prettier --check "components/**/*.{js,jsx}" "app/**/*.{js,jsx}" "lib/**/*.{js,jsx}"
```

GLSL compiles at runtime. After shader edits, load the page.

## Do not

- Drop `dprCapLo` below 2 as a swipe-smoothness lever (facing card goes soft).
- Use `imageOffset` to reorder projects; order lives in the CMS / `PROJECTS`.
- Strip third-party art notices or widen PP Neue Montreal usage.
- Force-push main.
