# Pitfalls Research

**Domain:** Content, media host, generated art, hero video and licence swap on a live WebGL portfolio (Next.js 16.3.8 on Vercel, Three.js ring, R2 media)
**Researched:** 2026-10-03
**Confidence:** HIGH on repo-specific findings (read from the code and the live site); MEDIUM on third-party platform behaviour (official docs plus community reports); LOW where marked.

Phase names used below: **Content** (eight projects, slugs, case-study copy), **R2/proxy removal** (bucket, domain, CORS, delete Notion projects path, OG rewrite, `sharp` and PDF deps), **Generation** (Higgsfield covers and gallery art), **Video** (brag/Hyperframes launch videos, hero player), **Ring geometry** (18 to 8), **Hygiene/licensing** (fonts, LICENSE/README, Prettier, dead files, AGENTS.md), **Tests** (Playwright smoke).

Items already in `.planning/codebase/CONCERNS.md` are referenced by name, not rediscovered. Deliberate designs in `AGENTS.md` (packed `uScale`, fan order, one-frame-stale focus, snap-only-decelerates, `forceContextLoss`, the load-counter gate) are constraints, not pitfalls to fix.

---

## Critical Pitfalls

### Pitfall 1: R2 covers taint the atlas canvas and freeze the ring

**What goes wrong:**
`components/ring/atlas.js` `load()` creates `new Image()` with no `crossOrigin`. Today every cover is same-origin (`/N.webp` or `/api/media/...`), so this never mattered. The moment `file` becomes `https://<r2-domain>/projects/...`, `ctx.drawImage` paints a cross-origin image into the 2D canvas and taints it. The next `texture.needsUpdate` makes Three call `texImage2D` with a tainted canvas, which throws `SecurityError`. The atlas `.catch` only wraps the image load, so the throw lands in the render loop, not in the atlas's own error handling. Expected result: blank or frozen ring on the first deploy, while the build and lint are green.

A second, quieter form: `app/page.js` emits `<link rel="preload" as="image">` for the first three covers with no `crossorigin`, and `SharedTransitionProvider.preloadImage()` and `next/image` also fetch the same URLs in no-cors mode. R2 sends CORS headers only when the request has an `Origin` header, and does not add `Vary: Origin`. Chrome can then answer the atlas's later CORS request from a cached no-cors response with no `Access-Control-Allow-Origin`, so the load fails. It fails only on warm caches, which makes it look random.

**Why it happens:**
The code path was written for same-origin media. CORS on R2 is configured per bucket and is invisible until a canvas reads pixels.

**How to avoid:**
1. Set `img.crossOrigin = "anonymous"` in `atlas.js` `load()` before `src`, next to the `fetchPriority` line.
2. Add `crossOrigin="anonymous"` to the preload `<link>` in `app/page.js` and to `preloadImage()` in `SharedTransitionProvider.jsx`. Any element that loads a URL the atlas also loads must use the same request mode.
3. R2 bucket CORS policy: `GET`/`HEAD`, origins `https://koussay.online` plus `http://localhost:<port>` for dev. Plan for preview origins too.
4. On the custom domain, add a Cloudflare Response Header Transform Rule that sets `Access-Control-Allow-Origin: *` on every response, Origin header or not. The media is public anyway. With a static header, a cached no-cors copy is still valid for CORS and the cache-mixing problem goes away. If you keep per-origin ACAO instead, also set `Vary: Origin`.
5. Purge the Cloudflare cache after any CORS change. R2 docs: cached assets do not pick up new CORS headers until refreshed.

**Warning signs:**
Console `SecurityError: Failed to execute 'texImage2D'... cross-origin data`. Or `[atlas] failed to load` after a soft navigation back to `/`. Or the ring renders on a cold load but goes blank after visiting a project page.

**Phase to address:** R2/proxy removal (before any cover is switched to an R2 URL). The Tests phase asserts no `pageerror`. Note: per CONCERNS ("Monitoring"), `removeConsole` strips `console.warn("[atlas]", ...)` in production. Raise atlas failures to `console.error` in the same phase, or they stay invisible on the live site.

---

### Pitfall 2: The R2 custom domain is blocked by DNS and the Cloudflare account

**What goes wrong:**
`koussay.online` uses Namecheap nameservers (`dns1/dns2.registrar-servers.com`; A record `216.198.79.1` points at Vercel). An R2 custom domain must be a zone in the same Cloudflare account as the bucket. Partial (CNAME) setup is mentioned in R2 docs but is a paid-plan feature (LOW confidence on the plan gate, so verify). The fallback, `r2.dev`, is rate-limited and "intended for non-production traffic". It gets no Cloudflare cache, no Transform Rules (so no fix for Pitfall 1), and no bot controls.

There is also an account trap. Per the global rules, the default `wrangler` login is the **Vamos** account, and Vamos configs pin no `account_id`. Running `wrangler r2 bucket create` with the default login puts the portfolio bucket inside another product's account.

**How to avoid:**
- Decide the media hostname before Generation: (a) move `koussay.online` nameservers to Cloudflare, recreate the Vercel records as DNS-only (grey cloud) and attach `media.koussay.online` to R2; or (b) use a separate domain that is a Cloudflare zone in the portfolio's own account. This is one gated human step for Koussay.
- Pin the account explicitly (`account_id` in config or `CLOUDFLARE_ACCOUNT_ID`) for every R2 command. Never rely on the default login.
- `generate-project-media.mjs --check` must report `public ok` against the final hostname before any credit is spent. Pitfall 6 explains why: the video step seeds Higgsfield from the public cover URL.

**Warning signs:** `--check` prints `public FAILED 401/404`. Bucket visible under the Vamos account in the dashboard. `R2_PUBLIC_BASE` ending in `.r2.dev`.

**Phase to address:** R2/proxy removal, first task, gate for Generation.

---

### Pitfall 3: Removing the Notion projects path leaves live importers behind

**What goes wrong:**
The projects CMS is read in more places than the ring:
- `app/page.js`, `app/sitemap.js`, `app/llms.txt/route.js`, `app/opengraph-image.js`, `app/project/[slug]/page.js` and `opengraph-image.js` all call `getProjects()` from `lib/cms/projects.js`.
- `app/project/[slug]/page.js` calls `withExpandedPdfGallery` (`lib/notion/gallery-pdf.js` → `lib/pdf.js`, which downloads PDFs during render).
- `lib/og-image.js` imports `cachedNotionMediaUrl` and **`sharp`**. All three OG routes (root, booking, project) go through it. CONCERNS says these routes use `next/og`; they do not, and nothing in the repo imports `next/og`.
- `components/project/ProjectGallery.jsx` imports `isPdfName` from `lib/media.js`.
- `app/api/cms-stamp` and `app/api/revalidate` import `lib/cms/bust.js`. `components/CmsLive.jsx` polls `/api/cms-stamp` every 20s.
- `next.config.mjs`: `images.localPatterns` for `/api/media/**`, `serverExternalPackages`, and the duplicated `outputFileTracingIncludes` for `/api/media/**` and `/project/**`.
- `scripts/generate-project-media.mjs` reads `components/ring/projects.js` (the 18 placeholders).

Delete `lib/notion/projects.js` alone and the build fails. Delete it carelessly and you also break **bookings**: `lib/notion/bookings.js` imports `dataSourceId` and `notion` from `lib/notion/client.js`, including the `cachedDataSourceId` `unstable_cache`.

**Why it happens:** The fallback chain (Notion → `lastGood` → `FALLBACK`) spreads one dependency across a dozen files. The OG path uses Notion media without going through the proxy.

**How to avoid:**
- Replace `getProjects()` with a synchronous import of the in-repo content module, keeping the same export name and shape so the call sites change only in their import line. Delete `FALLBACK` and the 18 placeholder rows in the same commit, so the Behance art cannot come back on any error path. This also closes CONCERNS "Fail-closed CMS fallback".
- Keep `lib/notion/client.js` and `lib/notion/props.js`. Delete only `projects.js`, `gallery-pdf.js`, `lib/cms/*`, `lib/pdf.js`, `lib/media.js` (after moving `isPdfName` out or dropping PDF galleries), `app/api/media`, `app/api/cms-stamp`, `app/api/revalidate` (this resolves the CONCERNS "Unauthenticated cache-bust" item by removal), and `components/CmsLive.jsx`.
- Delete `serverExternalPackages`, `outputFileTracingIncludes` and the `/api/media/**` `localPatterns` entry in the same commit as the packages.
- Exit check: `grep -rn "lib/cms\|notion/projects\|api/media\|gallery-pdf\|lib/pdf\|cms-stamp"` returns nothing outside `.planning/`. `next build` route table shows `/project/[slug]` as SSG with exactly 8 paths. A booking runs end to end on a preview deployment.

**Warning signs:** OG images for projects show the logo instead of the cover. `readLocalCover` returns `null` for `https://` URLs, so after the R2 switch every project OG image silently falls back to `public/logo.png`. Build passes but `/booking` fails at runtime. Stale tabs log 404s for `/api/cms-stamp`.

**Phase to address:** R2/proxy removal, after Content has produced the new module. The booking regression check is part of that phase's UAT.

---

### Pitfall 4: Slug churn breaks indexed URLs, or redirects them to the home page

**What goes wrong:**
The live sitemap (fetched 2026-10-03) lists eight project URLs, all returning 200:
- Five map onto the new set and must keep their **exact** slug: `fido-homes`, `elysee-home-design`, `clickit-story`, `artemis-luxe`, `vamos-taxi`.
- Three leave the ring: `pixenhouse`, `looma-kitchen`, `almar-private-journey`.
- New: NUMAI, Invios, Payme.

The 18 placeholder slugs (`matchday`, `volt`, `nightshift`, ...) may also be indexed, because `dynamicParams = true` and the fallback could render. Two common mistakes:
- Deriving new slugs from names, which turns `clickit-story` into `clickitstory`. That loses rankings and breaks shared links.
- 301-ing every retired slug to `/`, which Google treats as soft 404s.

**How to avoid:**
- Store slugs as literal strings in the content module. Copy the five surviving ones from the live sitemap, not from the product names.
- Set `dynamicParams = false` on `app/project/[slug]` so unknown slugs return a real 404 instead of rendering. Retired and placeholder slugs then 404. A 410 is possible through a small redirect/`notFound` map if wanted.
- Redirect a retired slug only where there is a true successor. ALMAR is Koussay's own product but not on the ring, so 404, or an external link from copy, is more honest than a redirect to an unrelated case study.
- Do not add a `/work/:slug` style rewrite for old slugs. The existing `/work/:slug` → `/project/:slug` redirect stays.
- `sitemap.js`: stop writing `lastModified: now` for every build. Use a per-project date from the content module.

**Warning signs:** `curl -o /dev/null -w "%{http_code}"` on the five surviving URLs shows anything other than 200 after the deploy. Search Console coverage shows "Page with redirect" or "Soft 404" spikes.

**Phase to address:** Content (slug table); R2/proxy removal (`dynamicParams`, sitemap).

---

### Pitfall 5: Eight cards changes the ring's composition and feel in ways a screenshot at one width will not show

**What goes wrong (computed from `utils.js`, `params.js` and the layout loop):**
- `radiusForCount(340, 18, 8)` = 340 × sin(π/18)/sin(π/8) ≈ **154** (×0.454). The neighbour chord is preserved by design. At the 1512 reference with `endScale` 4.46, the front card stays near centre (`frontTarget` ≈ +4 px) and the hub moves from about −1512 px to about −684 px.
- One slot is 45° instead of 20°. With `radial: true` each neighbour is rotated 45°, so the visible arc reads as a tight wheel, not a gentle curve. At 1512 the ±1 neighbours sit about 486 px above and below centre, half-cropped, as today. The ±2 cards (90°) sit just off-screen vertically, about 63 px clear at a ~982 px viewport. At the `narrow` (`posX` −2.5, radius ×1.3) and `tight` (−3.5, ×1.066) bands this margin is unverified. On a tall phone viewport the 90° cards, and possibly the 135° and 180° ones (upside down because radial), can come into view.
- Input feel: wheel velocity is multiplied by `slot/refSlot` = **2.25**. The snap engage threshold (`decay * slot * 0.5`) is 2.25× larger. `scrollSlot` 0.58 of a 45° slot is a long coast. `pick` time scales with √slots, so every pick is short. The ring will feel heavier and jumpier at once.
- Entry: `maxN` = |signedOffset(7)| = 4 generations instead of 9, so the unfurl stagger (`stagger` 0.34 across `maxN`) runs at a different rhythm. `spinTurns: 1` is now eight cards passing instead of eighteen.
- Atlas: `cols = ceil(√8) = 3`, `rows = 3`, so 9 cells with one blank, on a 1536 × 1023 canvas. Fine for the GPU. The front card, though, is drawn at about 90 × 4.46 ≈ 401 CSS px, around 800 device px on a 2× screen, from a **512 px** cell. That was tolerable for Behance placeholders but softens real work. With eight cards there is budget to raise `cell` to 768 or 1024 (2304 or 3072 px wide canvas). The generation script's `CELL` constant (512 × 341) must change with it, or the two disagree.

**Why it happens:** `ringRefCount: 18` and every tuned param were authored at 18. `AGENTS.md` only says to re-check at 11 and 32.

**How to avoid:**
- Leave `ringRefCount` at 18. It is the reference for the authored spacing, not the live count. Changing it to 8 rescales everything authored against it.
- Tune with the dev panel at 1512, 1024, 640 and 390 wide plus one tall phone (390 × 844), set `refWidth` first (`AGENTS.md`), and take before/after screenshots at each. Adjust `posX` per band, `scrollSpeed`, `scrollSlot`, `snapFrom`, `stagger` and `edgePad` as params with dev-panel controls. Do not hardcode numbers in the layout loop.
- Decide the cell size together with Generation. Change `atlas.js` `cell` and the script's `CELL` in one commit.
- Keep the project column and the meta morph's three rows working with 8 entries (index `01`–`08`).

**Warning signs:** A card is visible upside down at any band. A single notch skips two cards. The snap backs up instead of running in. The front card looks soft on a Retina screen.

**Phase to address:** Ring geometry. It needs the eight real covers (or eight stand-ins of the right aspect) to judge, so it comes after Content and before final UAT.

---

### Pitfall 6: Higgsfield credits are spent, then lost to an upload failure, or spent on the wrong eighteen projects

**What goes wrong:**
- `generate-project-media.mjs` iterates `PROJECTS` from `components/ring/projects.js`. Run it before Content replaces that list and it plans and pays for `matchday`, `volt` and the other Behance placeholders.
- The manifest is written only **after** `generate` → `download` → `uploadImage` all succeed. The upload path is the hand-rolled SigV4 that has never run (CONCERNS, "Hand-rolled SigV4 for R2"). A `SignatureDoesNotMatch` after a paid generation records nothing, so the next run pays again. The same applies to `download()` failing on Higgsfield's output URL; that those URLs expire is LOW confidence but likely.
- The video step seeds from `entry.image.cover.url`, the public R2 URL. If the public domain is not live (Pitfall 2), the video call fails after the image was paid for.
- Outputs are non-deterministic: `--force` on one project replaces art Koussay already approved, with no way back.

**How to avoid:**
- Order: Content (new list) → R2 `--check` green on the final domain → `--dry-run` reviewed by Koussay → `--limit=1` → full run.
- Change the script so the raw Higgsfield bytes are written to a gitignored `.media-raw/<slug>/<requestId>.<ext>`, and `requestId` is recorded in the manifest **before** any upload. A retry uploads from disk and never regenerates. Raw files stay local until the art is approved.
- Replace hand-rolled SigV4 with `@aws-sdk/client-s3` (CONCERNS recommends this). Otherwise prove `--check` and one real put/get first.
- Never use bare `--force`. Require `--force --only=<slug>`, and archive the previous manifest entry under `history[]` so approved art is never silently overwritten.
- Generate 3:2 natively (`SOUL_SIZE_3_2 = "2016x1344"` is already set) so the `fit: "cover"` crop to the cell and the 1536 × 1024 cover crops nothing. Spot-check that the model honoured the size: the downloaded image's dimensions must match.
- Put the cost per image and per video in the dry-run output, so the credit spend is visible before Koussay approves it.

**Warning signs:** Higgsfield dashboard shows more generations than manifest entries. `failed=` non-zero on a run that consumed credits. Manifest slugs that are not in the new content list.

**Phase to address:** Generation (script changes are its first plan); depends on R2/proxy removal for the bucket.

---

### Pitfall 7: Generated art reads as a screenshot of the real product

**What goes wrong:**
Core Value is "without meeting one fake thing". Three ways the honesty breaks:
1. Prompts that mention "website", "app", "dashboard" or "UI" make image models invent interfaces. A hallucinated Invios dashboard next to "Invios" is a fake product shot.
2. `shareImageAlt()` writes "`<name>` cover. `<type>` (`<year>`) by Koussay Zayani." into alt text, OG alt and, through `projectListSchema`, JSON-LD. That credits machine-generated art as the author's own design work.
3. Models put stray text, near-logos, real-looking licence plates (Vamos), real Dubai landmarks or human faces into images despite negative prompts. That creates likeness and trademark exposure on a commercial site.

Payme has no live product, so anything that looks like its UI is invented by definition.

**How to avoid:**
- Art direction stays abstract or material (light, surfaces, objects, mood). `scripts/lib/art-direction.mjs` must forbid screens, UI, text, logos, people and faces. Reject outputs that show any of them at review. The prompt alone cannot be trusted to prevent them.
- Add a per-media `kind` field in the content module: `screenshot`, `branding`, `generated`, `video`. Alt text and captions read from it: "Generated cover art for X" vs "X homepage, live site". JSON-LD `image` uses only `screenshot` or `branding` assets, or is labelled as such.
- Real UI evidence comes only from real screenshots or the brag video of the real site. Payme gets an explicit "Pre-launch" state, not a generated mock of the product.
- Keep the Higgsfield `requestId` and prompt per asset (already in the manifest) as provenance. Under the current Terms of Use the user owns outputs and commercial use is not restricted (§4.4, MEDIUM confidence; the terms changed in 2026). Keep a dated copy of the terms page with the manifest.

**Warning signs:** Any generated image with legible characters, a face or a UI frame. Alt text containing "by Koussay Zayani" on a `generated` asset.

**Phase to address:** Content (the `kind` field and copy rules); Generation (prompt rules and review gate).

---

### Pitfall 8: The hero video, the poster and the ring still are three different pictures

**What goes wrong:**
The brag skill renders a 1920 × 1080 (16:9) MP4 of about 20 s with music. It picks the "strongest settled frame", usually a text-heavy title beat, and **bakes it as frame 0**. The ring card is a 3:2 Higgsfield cover. The click path:
1. The shared transition flies the cover `<img>` (`SharedTransitionProvider`, raw `src`).
2. `ProjectMedia.land()` measures the hero frame, whose `--media-ratio` comes from the media's natural size.
3. The video's metadata arrives with 16:9 and resizes the frame after landing. That is layout shift.
4. The poster (brag's title frame) differs from the flown cover, so a different picture appears.
5. Playback starts with a jump cut out of frame 0.
6. Every loop flashes the baked poster frame again.

Also, `next/image` serves the hero through `/_next/image?url=...` while the flight uses the raw URL. They are two downloads, so the landing can flash even for stills.

**How to avoid:**
- One source of truth per project: the ring still **is** the video's opening frame. Either compose the video to open on the Higgsfield cover for at least 0.5 s, or extract the still from the video (text-free shot) and use it as the cover. Choose one per project and record it in the content module.
- Fix the hero frame aspect to 3:2 (the ring's). Render the hero cut at 3:2, or `object-fit: cover` a 16:9 render inside a fixed 3:2 frame. Do not let `fitToImage`/`loadedmetadata` resize the frame.
- `poster` = the exact R2 URL the ring used (same bytes, already cached). Serve R2 stills with `unoptimized` (they are pre-sized) so flight, poster and hero share one URL.
- Call `play()` only after `land()` resolves, then crossfade from poster to video.
- For the site cut, skip brag's frame-0 poster bake. That bake is for social thumbnails. Keep two outputs: `hero-<hash>.mp4` (no audio, no baked poster, loop-clean) and the social cut with audio.

**Warning signs:** CLS > 0 on project pages in Speed Insights. A visible image swap at the end of the shared transition. A flash at the loop point.

**Phase to address:** Video (player and transition wiring); Content (decide the still source per project).

---

### Pitfall 9: Autoplay rules, motion preferences and page weight

**What goes wrong:**
- iOS Safari blocks **all** autoplay in Low Power Mode, including `muted playsinline` (multiple reports, including Apple developer forums). The page cannot detect Low Power Mode. Without a designed state the visitor sees the native play glyph over the poster, which looks broken.
- React and SSR: React has historically set `muted` as a DOM property rather than an attribute, so server HTML can lack `muted` and Safari can refuse autoplay before hydration. Not re-verified for React 19 (LOW confidence), so check the SSR HTML.
- A looping video over 5 s with no pause control fails WCAG 2.2.2 (Pause, Stop, Hide). `prefers-reduced-motion` is already a milestone requirement for the ring (CONCERNS, "`prefers-reduced-motion` is not handled"). The hero must obey it too: do not autoplay; show the poster with a play button.
- Weight: a 20 s 1080p H.264 at brag's `-crf 18 -preset slow` is commonly 8–15 MB. `lib/project/warm.js` prefetches neighbouring routes. Any `preload="auto"` or prefetched `<video>` multiplies that.
- LCP: an above-the-fold `<video>` with a poster makes the poster the LCP candidate. A poster loaded late, or through a cold `/_next/image` transformation, sets LCP.

**How to avoid:**
- `<video muted playsInline autoPlay loop preload="metadata" poster=...>`. Set `muted` and call `play()` from a ref in an effect, catch the rejected promise, and fall back to a styled poster with a visible play control. Add a pause/play toggle that is always present (AT-labelled).
- Reduced motion: poster only, play on demand.
- Encode the hero at 1280 px wide (or 1440 for 3:2), H.264 High, `yuv420p`, `+faststart`, CRF 26–28, no audio (`-an`). Target ≤ 2.5 MB for 10–15 s. Optional WebM/AV1 `<source>` first, MP4 second.
- Never prefetch videos from the pager warm-up. Preload only the poster (`fetchpriority="high"`).

**Warning signs:** The play glyph appears on an iPhone in Low Power Mode. Lighthouse "Avoid enormous network payloads" names the MP4. LCP element = `video` with a late poster.

**Phase to address:** Video.

---

### Pitfall 10: Launch-video production goes wrong outside the player

**What goes wrong:**
- brag "reads the current project code". Run from this repo it makes a video about the **portfolio**. The client sites (Fido, Elysee, Artemis, Clickit, NUMAI on Shopify) are mostly not repos Koussay has here. They need the URL mode (brag-slim takes a URL) with a headless capture. Cookie banners and scroll-triggered sections come out blank unless handled.
- Output defaults to `brag-output-<timestamp>/` in the **current directory**. In this public repo that commits MP4s, music and capture assets.
- The bundled music (ende.app "Happy Beats") has an unverified licence. The skill's own README says to verify before redistributing. A muted hero does not need it. The social cut does.
- brag's inspect step forbids real customer names, emails or PII on screen. Invios (business OS) and Vamos (bookings) have real data in their UIs.
- Hyperframes renders headless Chrome plus FFmpeg. Assets referenced by absolute path silently fail (brag `audio.md`). Remote assets in the composition, including R2 images, need CORS (Pitfall 1 again). Render time and failures scale with effects. Durations default to 15–25 s, so eight videos come out at eight lengths unless pinned.
- HEVC output (Apple-encoder habit) does not play in Firefox or most non-Apple Chromium. H.264 MP4 is the only universal baseline.

**How to avoid:**
- Run brag in a scratch folder outside the repo (or the product's own repo). Add `brag-output*/` to `.gitignore` anyway.
- Pin `--duration` for all eight and use one tone preset, so the set reads as a series.
- Strip audio for the hero. For the social cut, confirm the music licence or use `--no-music`.
- Use fictional stand-in data on screen for Invios and Vamos, and say so in the case study.
- Before publishing a client's site in a video, get the client's OK in writing. A WhatsApp message is enough. This is about the relationship, not the licence.
- After rendering, `ffprobe` each file: codec `h264`, `yuv420p`, `faststart`, duration, size. Upload to R2 as `projects/<slug>/hero-<sha8>.mp4` with `video/mp4` and the immutable cache header, the same path the script uses for `loop-*.mp4`.

**Warning signs:** `git status` shows `brag-output-*`. A video with sound plays in a muted context. Durations in the content module differ by more than ±1 s.

**Phase to address:** Video.

---

### Pitfall 11: Satoshi is not licence-clean either, and the font swap breaks canvas text silently

**What goes wrong:**
- **ITF Free Font License v2.0 (17 Aug 2026, read from the licence file in Fontshare's Satoshi download, 2026-10-03):**
  - §02 forbids making the font software available "through another font website, font library, marketplace, **repository** ... **publicly accessible servers**".
  - §02 and the Derivative Work definition forbid "subsetting, **format conversion**" without written consent.
  - Self-hosting **for your own website** through `@font-face` is explicitly allowed.

  Committing `public/Satoshi-*.otf` to a **public GitHub repo** is repository distribution. Converting it to WOFF2 yourself is a Derivative Work. `README.md` line ~145 ("Satoshi and Geist are both free to redistribute") and the `AGENTS.md` claim that Satoshi has "no such restriction" are wrong under the current FFL. The milestone requirement "switch to Satoshi or Geist" therefore has a licence fork.
- Fonts are looked up by string in three places (`params.js` `nameFont`/`idxFont`/`textFont`, the `gui.js` dropdown, `globals.css` `@font-face`). A miss falls back to system sans with no error (CONCERNS, "Font family names looked up by string").
  - If you move to `next/font`, it **renames** the family (e.g. `__Geist_abc123`). Canvas `ctx.font = '... "Geist"'` then misses even though the DOM looks right.
- `splitText.js` measures glyph advances with `measureText` and `tag.js` measures the tag, both on canvas. Two outcomes:
  - Different metrics change the heading's width, the meta morph's row positions and the tag size.
  - `document.fonts.ready` only waits for faces the **DOM** has requested. A weight used only on canvas may not be loaded yet, so the heading is built in the fallback face, or waits for the 3 s `fontFallback` timeout on a cold load.

**How to avoid:**
- Recommend **Geist (SIL OFL 1.1, no Reserved Font Name)** for the heading and tag, and preferably for name and index too. That leaves no ITF files in the repo. Use the official Geist WOFF2 files from the vercel/geist-font release (no self-conversion needed). Ship `OFL.txt` with them (`public/fonts/OFL.txt`) and keep the copyright line in LICENSE.
- If Koussay wants Satoshi for the look: keep it out of git (gitignored and fetched at build from his own Fontshare download or served from his own R2 bucket for his own site). Use only Fontshare's official WOFF2, never a converted file, and record the decision. This is his call: one question, Geist recommended.
- Change all three string sites plus the `@font-face` block in one commit. If `next/font` is used, pass its `style.fontFamily` into `params` instead of a literal.
- Before `splitText.build()`, `await document.fonts.load('<weight> 1em "<family>"')` for every canvas face.
- Re-check the meta morph and the tag at all four widths after the swap. Widths move by a few percent.
- Delete `public/ppneuemontreal-book.otf` and its `@font-face` in the same commit. History still holds it; a rewrite is out of scope per PROJECT.

**Warning signs:** The heading renders in Helvetica/Arial on a cold load (DevTools → Rendered Fonts). `textFont` dropdown still lists "PP Neue Montreal". Any `.otf`/`.ttf` from ITF in `git ls-files`.

**Phase to address:** Hygiene/licensing (decision and swap); Ring geometry re-checks the labels.

---

### Pitfall 12: The licence cleanup strips a required notice, or leaves the old files publicly served

**What goes wrong:**
- Rewriting `LICENSE` to "MIT, Koussay Zayani" drops "Copyright (c) 2026 Yousuf Soomro". MIT requires that notice to travel with substantial portions. The Ashima Arts / Stefan Gustavson notice (in `planeShaders.js` lines ~125–127 and in LICENSE) must stay too.
- Removing the README/LICENSE disclaimers about Behance art and PP Neue Montreal **before** the files are gone breaks `AGENTS.md`'s rule. Leaving them **after** the files are gone describes files that no longer exist.
- `git rm` does not remove the files from history (CONCERNS, "Unlicensed third-party artwork"). PROJECT puts the history rewrite out of scope. The README must then say plainly that earlier commits contain third-party art and an unlicensed font, and that they are not covered.
- Vercel keeps every past deployment. Under **(Legacy) Pre-Production** protection, past production `*.vercel.app` URLs stay public and keep serving `/1.webp`…`/18.webp` and the PP Neue Montreal file after the new deploy. The current "Standard Protection" covers every deployment except production domains, on all plans (MEDIUM, Vercel docs).

**How to avoid:**
- LICENSE keeps the Yousuf Soomro MIT block verbatim. Add a second copyright line for Koussay's modifications. Keep the third-party code section, and add Geist OFL (and Satoshi FFL only if Satoshi stays).
- Delete the files and update the notices in **one** commit.
- README Credits: an upstream carousel line ("based on <repo> by Yousuf Soomro, MIT"), webgl-noise, Geist.
- Koussay checks Vercel → Settings → Deployment Protection shows **Standard Protection** (not legacy) and spot-checks one old deployment URL for 401/redirect. One numbered step.
- Diff LICENSE against the previous version before commit. The upstream block must show zero removed lines.

**Warning signs:** `git diff HEAD~1 -- LICENSE` shows removed lines inside the MIT block. An old deployment URL serves `/1.webp` with 200.

**Phase to address:** Hygiene/licensing.

---

## Moderate Pitfalls

### `sharp`, `@napi-rs/canvas`, `pdfjs-dist`, `unpdf` removal is not one-line
- `next@16.3.8` declares `sharp ^0.35.4` as an **optionalDependency** (`npm ls sharp`: `next → sharp@0.35.4`, plus the direct `sharp@0.34.5`). Removing the direct dep does not remove `sharp` from `node_modules`. Re-run `npm audit` afterwards and record whether the CONCERNS advisory still applies through Next's copy.
- `scripts/generate-project-media.mjs` imports `sharp`. Without a direct dep it resolves only if npm hoists Next's copy, which is fragile. Move `sharp@^0.35.5` to **devDependencies** for the scripts.
- All three OG routes use `sharp` at runtime through `lib/og-image.js`. Recommendation: generate a 1200 × 630 OG image per project at authoring time (script, devDependency `sharp`) to R2, reference it through `generateMetadata` `openGraph.images`, and delete the `opengraph-image.js`/`twitter-image.js` files and `lib/og-image.js`. That leaves zero runtime image code. If you keep dynamic OG, use `next/og` `ImageResponse`; the ImageResponse RCE advisory is patched at 16.3.8.
- Social caches (LinkedIn about 7 days) keep the old OG image. Refresh with LinkedIn Post Inspector after deploy.
- Vercel's build cache can keep traced native binaries until the next clean build. Check the function bundle size drop in the deploy output.
- **Phase:** R2/proxy removal.

### `next/image` with R2: silent 400s and a visible fallback with the file key
- Next 16 needs `images.remotePatterns` with the exact `protocol: "https"`, `hostname`, `pathname: "/projects/**"`, `search: ""` (CONCERNS: "`remotePatterns` absent"). A miss returns **400**. `ProjectMedia` then shows "Artwork unavailable" **and prints `project.file`** (the R2 key) to visitors.
- Next 16 also requires `qualities` (default `[75]`); other values are coerced.
- Recommendation: mark R2 assets `unoptimized`. They are already pre-sized WebP, so you avoid Vercel's Hobby cap (5K transformations a month, then **402** and the alt text shows instead; Vercel docs) and share one URL with the transition (Pitfall 8). Keep `remotePatterns` anyway so a forgotten `unoptimized` still works.
- Remove `project.file` from the fallback UI.
- **Phase:** R2/proxy removal.

### Content-addressed URLs drift from the code
- Keys are `projects/<slug>/<name>-<sha8>.webp`, hashed over the **encoded** buffer. A `sharp` major bump re-encodes to different bytes, producing new hashes and new uploads for unchanged art. Harmless, but `--force` after an upgrade re-uploads everything.
- The dangerous drift is the content module pointing at URLs typed by hand while `scripts/media-manifest.json` holds different ones. Rules:
  - The content module **imports** URLs from the manifest by slug and asset name. No copy-paste.
  - The manifest is committed in the same commit as the content change.
  - A `--verify` mode HEADs every referenced URL (200, right `content-type`, `cache-control: ... immutable`) and fails the run on any miss. Run it before every ship.
- Never mix `?v=` versioning into hashed keys. Delete the `?v=` handling and the `/api/media/**` `localPatterns` with the proxy.
- Never delete old R2 objects in this milestone. Immutable URLs may sit in browser, CDN and social caches for up to a year.
- **Phase:** Generation (manifest and verify); R2/proxy removal (`next.config` cleanup).

### Branding PDFs have nowhere to go once the PDF renderer is deleted
- Branding that lived in Notion as PDFs was rasterised on request by `lib/pdf.js`. With it gone, branding must be rasterised **at authoring time** (`pdftoppm` or the script) into WebP pages on R2, with `kind: "branding"` and page alt text.
- `ProjectGallery`'s `isPdfName` branch becomes dead. Remove it rather than leave a path that 404s.
- **Phase:** Content (collect files) and Generation/R2 (rasterise and upload).

### The R2 and Cloudflare cache layer
- R2 stores the `Content-Type` and `Cache-Control` sent at PUT. The script sets `image/webp`/`video/mp4` and the immutable header; verify with `curl -I` on the public URL, not `headObject`.
- Cloudflare's default cache does include `.webp`/`.mp4`. The zone's "Browser Cache TTL" can override origin headers if it is not set to "Respect existing headers".
- Safari needs byte-range (206) responses for video. R2 supports them; confirm with `curl -r 0-99 -I`.
- **Phase:** R2/proxy removal.

### Stale clients after the cut-over
- Open tabs on the old bundle keep polling `/api/cms-stamp` every 20s. After removal they get 404s, and `experimental.staleTimes` (180/300 s) holds old RSC payloads with `/api/media` URLs.
- Either keep `/api/cms-stamp` returning a constant for one release, or accept the 404s and note them so nobody reads them as a regression.
- Skew Protection availability on the current Vercel plan is unverified (LOW).
- **Phase:** R2/proxy removal.

---

## Minor Pitfalls

### Formatting mixed into functional diffs
17 files fail `prettier --check` (PROJECT). Formatting them inside the Content or ring commits makes the hand-over check impossible to read. Do one formatting-only commit first, add its SHA to `.git-blame-ignore-revs`, then run Prettier on each later commit (per `AGENTS.md`). **Phase:** Hygiene/licensing, as the first commit of the milestone, before worktrees branch.

### Dead files
`components/TwoPlaneMorph.jsx` and the root `shader` paste are safe to delete (`AGENTS.md`). `.agents/skills/` (102 files, licence unreviewed, CONCERNS) should be gitignored. Do it in the hygiene commit, not mixed with the Notion removal. **Phase:** Hygiene/licensing.

### AGENTS.md describes a tree that no longer exists
After this milestone, Layout, the "Known gaps" list (gaps 1, 2, 3 and 6 are resolved or changed), the line count and the font licensing paragraph are all stale. The Satoshi claim is now wrong (Pitfall 11). Update it last, from the final tree. **Phase:** Hygiene/licensing (closing task).

### Vercel Hobby is "non-commercial personal use"
Vercel's docs say Hobby teams are restricted to non-commercial personal use. A portfolio that sells services with a booking flow may count as commercial (LOW confidence on interpretation; plan unverified). It is not a code issue but it decides whether Image Optimization overages return 402 or bill. Flag it to Koussay; the decision is outside this milestone. **Phase:** none (decision log).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Serve media from `*.r2.dev` | No DNS move | Rate-limited, uncached, no Transform Rules, so Pitfall 1 has no full fix | Local dev and `--check` only, never production |
| Keep the 18-row `FALLBACK` "just in case" | Feels safe | Behance art and invented years can return to production on any error | Never |
| Let Vercel optimise R2 images | Responsive `srcset` for free | Hobby 5K/month cap then 402; double download in the transition | Only for gallery images far below the fold, if at all |
| Convert Satoshi OTF to WOFF2 yourself | 60% smaller files | FFL §02 Derivative Work breach | Never; use the official WOFF2 or Geist |
| Hand-type R2 URLs into the content module | Quick | Manifest drift, 404s after a re-run | Never |
| One brag render for both social and hero | Half the work | Audio bytes, baked poster flash at each loop, 16:9 vs 3:2 frame | Never for the hero |
| Keep the hand-rolled SigV4 | No new dependency | First real upload can fail after a paid generation | Only after `--check` plus a known-answer test pass |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| R2 + WebGL atlas | No `crossOrigin` on `Image`, no ACAO on the bucket | `crossOrigin="anonymous"` everywhere the URL is loaded + static `Access-Control-Allow-Origin: *` Transform Rule |
| R2 custom domain | Assuming any domain works | Must be a zone in the same Cloudflare account; `koussay.online` NS is Namecheap today |
| Cloudflare account | Default `wrangler` login (Vamos) | Pin `account_id` for the portfolio account on every command |
| Higgsfield SDK | Retrying a failed run regenerates | Persist the raw output plus `requestId` before upload; resume from disk |
| Higgsfield video (`image2video/dop`) | Seeding from an R2 URL that is not public yet | `--check` reports `public ok` before any video run |
| next/image | `remotePatterns` missing or `search` mismatch → 400 | Exact pattern + `unoptimized` for pre-sized R2 assets |
| brag / Hyperframes | Running inside this repo; absolute asset paths | Scratch folder; assets copied into `composition/assets/` |
| Notion (bookings) | Deleting `lib/notion/client.js` with the projects code | Keep `client.js`/`props.js`; run one booking on a preview before ship |
| Fontshare (Satoshi) | Treating the FFL like the OFL | FFL forbids repository distribution and format conversion |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| 512 px atlas cells on a 2× screen | Front card soft on Retina | Raise `cell` (768–1024) now that there are 8 cells; change `CELL` in the script to match | Every Retina visitor, today |
| Hero MP4 at brag's CRF 18, 1080p, with audio | 8–15 MB per page, poor LCP on mobile | Separate hero encode ≤ 2.5 MB, no audio, `preload="metadata"` | First mobile visitor on 4G |
| Pager warm-up prefetching media | Neighbour videos downloading in the background | Warm posters only, never `<video>` | As soon as the warm-up touches video |
| Cold `/_next/image` transformations on R2 covers | Slow first hero, 402 on Hobby cap | `unoptimized` R2 assets | 5K transformations/month (Hobby) |
| SwiftShader in CI | Smoke test timeouts during the 6 s entry | Generous timeouts; reduced-motion run as a second, faster variant | Every headless run |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Leaving `/api/media` "for old links" | Keeps the open proxy and the PDF renderer (CONCERNS, "Media proxy is open") | Delete it; let old URLs 404 |
| Leaving `/api/revalidate` with the projects path gone | Unauthenticated cache bust (CONCERNS) with nothing left to revalidate | Delete it in R2/proxy removal |
| ACAO `*` plus credentials | None for public media, but `*` must never be paired with `Access-Control-Allow-Credentials` | Static `*` only, no credentials header |
| Real customer data in a launch video | PII published on a public site | brag's stand-in data rule; Koussay reviews each render |
| R2 API token with account-wide scope | A leaked token writes any bucket in the account | Bucket-scoped Object Read & Write token; kept in Koussay's terminal only |

Booking-side items in CONCERNS (open draft endpoint, no rate limit, in-memory slot lock) are untouched by this milestone. None of the phases above should change `lib/book/*`. A regression there is a sign a Notion deletion went too far.

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Native play glyph in iOS Low Power Mode | Looks broken | Designed poster state with its own play button |
| Payme with an empty "Visit site" or a generated UI | Fake or broken thing, against Core Value | Explicit "Pre-launch" label, no live link, real material only |
| "Artwork unavailable" + R2 key on error | Leaks internals, looks broken | Neutral placeholder, `console.error` for diagnosis |
| Ring feels jumpy at 8 (velocity ×2.25) | Overshoots, every notch skips | Retune `scrollSpeed`/`scrollSlot`/`snapFrom` at 8 |
| Autoplay ignores reduced motion | Motion-sensitive visitors get a looping video | Poster and play-on-demand under `prefers-reduced-motion` |

## "Looks Done But Isn't" Checklist

- [ ] **R2 covers:** ring renders on a warm cache after visiting a project page (Pitfall 1). Check DevTools for `SecurityError`.
- [ ] **R2 domain:** `curl -I` on a cover shows `content-type: image/webp`, `cache-control: public, max-age=31536000, immutable`, `access-control-allow-origin: *`, served through the custom domain, not `r2.dev`.
- [ ] **Notion removed:** grep from Pitfall 3 is clean; `/booking` books a slot on a preview deployment; Notion still receives the booking.
- [ ] **OG images:** each of the 8 project OG images shows its cover, not the logo; root and booking OG still render.
- [ ] **Slugs:** the five surviving slugs return 200; `pixenhouse`, `looma-kitchen`, `almar-private-journey`, `matchday` return 404; sitemap lists exactly 8 projects.
- [ ] **Generated art:** no text, faces, UI or logos; alt text says "generated" where it is.
- [ ] **Hero video:** plays muted inline on iPhone; Low Power Mode shows a designed poster; pause control present; reduced motion respected; no frame jump after the shared transition; no flash at the loop point; file ≤ 2.5 MB, H.264, no audio.
- [ ] **Fonts:** no PP Neue Montreal and no ITF files in `git ls-files`; heading renders in the intended face on a cold load (Rendered Fonts panel); `textFont` dropdown lists only real faces; OFL text shipped.
- [ ] **Licence:** LICENSE still contains the Yousuf Soomro MIT block and the Ashima/Gustavson notice; README Credits names the upstream carousel; Vercel Deployment Protection is Standard (not legacy).
- [ ] **Deps:** `serverExternalPackages` and `outputFileTracingIncludes` gone; `npm audit --omit=dev` re-run and recorded; scripts still run (`sharp` as devDependency).
- [ ] **Ring at 8:** screenshots at 1512/1024/640/390 and 390 × 844; no upside-down card visible; one notch = one card.
- [ ] **Smoke test:** fails when a shader typo is introduced, and when `crossOrigin` is removed from `atlas.js`. Prove both once.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Tainted atlas on production | LOW | Revert to the previous deployment in Vercel (instant), add `crossOrigin` + Transform Rule, purge Cloudflare cache, redeploy |
| Credits spent, upload failed | MEDIUM | If raw files were kept: upload from `.media-raw`. If not: find the `requestId` in Higgsfield's history and re-download, if the output URL still resolves (LOW confidence it does) |
| Approved art overwritten by `--force` | MEDIUM | Old R2 object is never deleted, so restore the previous key from git history of `media-manifest.json` |
| Indexed slug renamed | MEDIUM | Add a permanent redirect old → new in `next.config.mjs` `redirects()`; request reindex |
| LICENSE notice stripped and pushed | LOW | Restore the block from history in a new commit; nothing to rewrite |
| Satoshi already in public history | HIGH to fully clean (history rewrite, out of scope) | Remove from the tree, stop serving it, note it in README; raise the rewrite with Koussay as a separate decision |
| Booking broken by Notion deletion | LOW | Restore `lib/notion/client.js` exports from `main`; re-run a preview booking |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Prettier noise in functional diffs | Hygiene/licensing (first commit) | `prettier --check` clean on `main` before worktrees branch |
| Slug continuity, retired slugs | Content | Live-URL status check after ship; sitemap = 8 |
| Generated art presented as product (`kind` field, alt text) | Content + Generation | Review gate per asset; alt-text grep for "by Koussay Zayani" on generated assets |
| R2 domain/DNS/account | R2/proxy removal (task 1) | `--check` → `public ok` on the custom domain; bucket under the right account |
| Tainted atlas / CORS cache | R2/proxy removal | Warm-cache round trip home → project → home; smoke test |
| Notion importers, bookings regression, OG via `sharp` | R2/proxy removal | Grep clean; build route table; preview booking; 8 OG images |
| `remotePatterns`, `unoptimized`, fallback leak | R2/proxy removal | Hero and gallery load; no `/_next/image?url=https://<r2>` requests |
| Native deps and tracing config | R2/proxy removal | Config keys gone; audit re-run; function size drop |
| Credit burn, wrong list, overwrite | Generation | Manifest slugs = content slugs; raw files present; `--verify` green |
| Atlas cell size vs `CELL` | Generation + Ring geometry | Same constant in both; Retina screenshot sharp |
| Ring composition and feel at 8 | Ring geometry | Five-width screenshot set signed by Koussay; feel UAT (one notch = one card) |
| Video/poster/still mismatch, aspect, loop flash | Video | Slow-motion recording of the click transition; CLS = 0 |
| Autoplay, reduced motion, WCAG pause, weight | Video | iPhone Low Power Mode test; reduced-motion emulation; file ≤ 2.5 MB |
| brag in repo, music licence, PII, codec | Video | `git status` clean; `ffprobe` table for all 8 |
| Satoshi FFL, font strings, canvas font load | Hygiene/licensing | `git ls-files public` has no ITF/Pangram files; cold-load Rendered Fonts check |
| LICENSE/README notices, old deployments | Hygiene/licensing | LICENSE diff shows the upstream block unchanged; old deployment URL protected |
| AGENTS.md drift | Hygiene/licensing (last) | Layout section matches `git ls-files` |
| Smoke test (SwiftShader, Speed Insights noise, timing) | Tests | See below |

**Tests-phase specifics:**
- Launch Chromium with `--enable-unsafe-swiftshader` (`launchOptions.args`); WebGL fallback to SwiftShader has been deprecated since Chrome 130, so context creation can fail without it (Chromium docs, MEDIUM).
- Run against `next build && next start` on a free port, not `next dev`. StrictMode double mounts and HMR context churn are the dev-only failure `AGENTS.md` describes.
- `@vercel/speed-insights` requests `/_vercel/speed-insights/script.js`, which 404s under `next start`. Allowlist exactly that URL, nothing broader.
- Fail on `pageerror`, on `console.error`, and when `canvas` is missing or blank (sample pixels from a screenshot). Wait for `[data-loader-count]` to read 100, with a timeout of at least 30 s under SwiftShader.
- Add a second run with `reducedMotion: "reduce"` once that requirement lands.
- Kill only the port the test started (global rule; several dev servers share this Mac).

## Sources

Repo and live (HIGH):
- `components/ring/atlas.js`, `components/ring/utils.js`, `components/ring/params.js`, `components/Carousel.jsx`, `lib/og-image.js`, `app/page.js`, `app/project/[slug]/page.js`, `components/project/ProjectMedia.jsx`, `components/SharedTransitionProvider.jsx`, `scripts/generate-project-media.mjs`, `scripts/lib/higgsfield.mjs`, `next.config.mjs`, `LICENSE`, `README.md`
- `npm ls sharp` (next@16.3.8 → sharp@0.35.4 optional; direct sharp@0.34.5)
- `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md` (remotePatterns 400, `qualities` required in v16, `maximumRedirects`)
- Live `https://koussay.online/sitemap.xml` and status codes, fetched 2026-10-03; `dig NS koussay.online` → registrar-servers.com
- ITF Free Font License v2.0 (17 Aug 2026), `License/FFL.txt` in the Fontshare Satoshi download, read 2026-10-03
- Geist OFL: https://github.com/vercel/geist-font (OFL.txt, no Reserved Font Name)
- brag skill: `~/.claude/skills/brag/references/step-4-deliver.md` (frame-0 poster bake, x264 CRF 18), `audio.md` (absolute paths fail), `assets/music/README.md` (licence to verify)

Platform docs (MEDIUM to HIGH):
- R2 CORS: https://developers.cloudflare.com/r2/buckets/cors/ (CORS only with an `Origin` header; cached assets need a purge after a CORS change)
- R2 public buckets: https://developers.cloudflare.com/r2/buckets/public-buckets/ (r2.dev rate-limited and non-production; custom domain must be a zone in the same account)
- Vercel Image Optimization limits: https://vercel.com/docs/image-optimization/limits-and-pricing (Hobby 5K transformations, 402 on overage, Hobby non-commercial)
- Vercel Deployment Protection: https://vercel.com/docs/deployment-protection (Standard vs legacy scopes)
- Chromium SwiftShader: https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md, https://groups.google.com/a/chromium.org/g/blink-dev/c/yhFguWS_3pM

Community (MEDIUM to LOW, corroborating):
- R2 missing `Vary: Origin` breaks later CORS requests in Chrome: https://community.cloudflare.com/t/r2-does-not-add-vary-origin-header-which-breaks-future-cors-requests/660056, https://stackharbor.com/en/knowledge-base/cffix-cors-errors-only-behind-cloudflare/, https://kian.org.uk/configuring-cors-on-cloudflare-r2/
- iOS Low Power Mode blocks autoplay: https://wojtek.im/journal/safari-autoplay-not-working-in-low-power-mode, https://developer.apple.com/forums/thread/691839
- LCP and video posters: https://web.dev/learn/performance/video-performance, https://chromium.googlesource.com/chromium/src.git/+/master/docs/speed/metrics_changelog/lcp.md
- Higgsfield output ownership: https://higgsfield.ai/creator-hub/help-center/account/who-owns-my-generations-and-can-i-use-them-commercially
- ITF FFL repository clause discussion: https://github.com/kollektiv-mc/Kollektiv/issues/40

---
*Pitfalls research for: content, media, generated art, hero video and licence swap on a live WebGL portfolio*
*Researched: 2026-10-03*
