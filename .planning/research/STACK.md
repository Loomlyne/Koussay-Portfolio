# Stack Research

**Domain:** Freelance web developer portfolio (Next.js 16 WebGL ring, case studies, booking). This milestone adds repo-hosted content, R2-hosted generated media, Higgsfield generation, HyperFrames launch videos and a smoke test.
**Researched:** 2026-10-03
**Confidence:** MEDIUM-HIGH overall. Next.js APIs were checked against the bundled `node_modules/next/dist/docs` (16.3.8). Higgsfield was checked against docs.higgsfield.ai and the installed SDK source. R2 was checked against developers.cloudflare.com. Versions come from `npm view` on 2026-10-03.

The existing stack (Next 16.3.8, React 19.2.8, three r185, GSAP, Tailwind v4, Vercel, Notion for bookings, Resend) is not re-researched here.

---

## Read this first: five findings that change the plan

1. **The Higgsfield endpoints in `scripts/lib/higgsfield.mjs` are stale.** (HIGH) The current docs and OpenAPI no longer list `/v1/text2image/soul` or `/v1/image2video/dop`. The canonical text-to-image endpoint is `higgsfield-ai/soul/v2/standard`, which takes `aspect_ratio: "3:2"` and `resolution: "720p" | "1080p"`, not `width_and_height: "2016x1344"` or `quality`. DoP is not in the current catalogue. Image-to-video is now per vendor, for example `kling-video/v3.0-turbo/image-to-video` with `{ prompt, image_url, duration 3–15, resolution }`. Re-target before the first paid run.
2. **koussay.online's DNS is at Namecheap (`dns1/dns2.registrar-servers.com`), not on Cloudflare.** (HIGH, checked with `dig`) An R2 custom domain needs the zone in the same Cloudflare account as the bucket. Partial (CNAME) setup requires the Business plan. In practice the nameservers have to move to Cloudflare (free plan, full setup), with the Vercel records kept DNS-only. Otherwise the only option is `r2.dev`, which Cloudflare rate-limits and says not to use in production. This is a human, gated step, and it must happen before any media URL goes into the app.
3. **The ring atlas will break on cross-origin art unless two things change.** (HIGH) `components/ring/atlas.js` creates `new Image()` with no `crossOrigin`. Today the art is same-origin. Once it comes from R2, `texImage2D` will refuse the tainted image and the ring will render blank. The fix: set `img.crossOrigin = "anonymous"` before `src`, and serve `Access-Control-Allow-Origin` from the media host. Because R2 does not send `Vary: Origin`, the safe way to do that is a static `*` header (see Patterns).
4. **`--probe` will crash once credentials exist.** (HIGH, read from source) `probe()` runs before the top-level `const imageEndpoint` and `const imageParams` are declared, so it throws `ReferenceError: Cannot access 'imageEndpoint' before initialization`. It is hidden today because the missing-credentials exit fires first.
5. **Satoshi may not be self-hostable.** (MEDIUM-LOW) Satoshi is under the ITF Free Font License. Fontsource declined it as "a closed source license exclusive to Fontshare", and secondary sources say the licence forbids redistributing the files and needs ITF's consent to self-host a webfont. The repo commits `Satoshi-*.otf` to a public GitHub repo. Geist is OFL and ships official `.woff2` files. Recommendation: Geist, unless Koussay reads the FFL and confirms otherwise. Also, `public/ppneuemontreal-book.otf` **is tracked in git** (`git ls-files`), which contradicts AGENTS.md's "gitignored".

---

## Recommended Stack

### Core Technologies (new this milestone)

| Technology | Version | Purpose | Why Recommended | Confidence |
|---|---|---|---|---|
| Plain JS content modules + a generated JSON media map | n/a (no dependency) | Eight case studies in the repo | Content is short structured fields (summary, challenge, outcome, role, tools), not long-form prose, so MDX buys nothing. The pipeline script (plain Node) and the app both import the same `.js` modules without JSON import attributes or bundler plugins. The server page passes only ring fields to the client, so case-study text stays out of the client bundle. | HIGH |
| Cloudflare R2, public via a custom domain (e.g. `media.koussay.online`) | n/a | Host for all images and video | Content-addressed keys plus `Cache-Control: public, max-age=31536000, immutable` give permanent URLs with no proxy. Custom domains get Cloudflare cache, WAF and Transform Rules; `r2.dev` gets none of them and is rate-limited. On non-Enterprise plans, R2 is the sanctioned way to serve video through Cloudflare. | HIGH |
| `aws4fetch` | 1.0.20 | Signed S3 PUT/HEAD/LIST to R2 from Node scripts | Replaces the hand-rolled SigV4 in `scripts/lib/r2.mjs`. It is about 2.5 KB with no dependencies, Cloudflare's R2 docs carry a dedicated example for it, and it is maintained by mhart. It removes ~90 lines of untested crypto that would otherwise be debugged live against Koussay's credentials, and it covers DELETE and ListObjectsV2 (orphan cleanup) for free. | MEDIUM-HIGH |
| Higgsfield REST API via plain `fetch` | API as of 2026-10 | Cover and gallery art (Soul V2), image-to-video b-roll | The SDK adds almost nothing for two calls (POST, then GET status) and has three hazards here (see What NOT to Use). Plain fetch lets the script persist an `Idempotency-Key` and the `request_id` in the manifest before waiting, and call `/estimate/<endpoint>` during `--dry-run` to print credits and USD. | MEDIUM-HIGH |
| HyperFrames CLI (`hyperframes`) | 0.8.114, run via `npx`, not installed | Launch videos as HTML/GSAP compositions rendered to MP4 | It is what the `brag` skill already drives. Output is deterministic H.264 MP4 (default `--quality looks` = CRF 16), plus WebM/MOV/GIF/HLS if needed. Needs Node ≥ 22 (local is 26.7) and FFmpeg (local 9.0.2). It pulls in puppeteer-core, esbuild and sharp, so keep it out of `package.json`. | HIGH |
| FFmpeg | 9.0.2 (Homebrew, local) | Web re-encode of the hero MP4 and poster frame extraction | sharp/libvips cannot decode video. FFmpeg is already a HyperFrames requirement. | HIGH |
| `@playwright/test` | 1.63.0 | Smoke test: `/` loads, one `<canvas>`, live WebGL context, zero console errors | Next 16 lists it as an optional peer and ships a Playwright guide. It is the only way to catch GLSL errors, which AGENTS.md notes only appear in the browser console. | HIGH |

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---|---|---|---|---|
| `sharp` | ^0.35.5, **moved to `devDependencies`** | Resize to the atlas cell (512×341 WebP), cover (1536×1024 WebP), OG card (1200×630 **JPEG**), and poster WebP | Authoring-time only. Once the media proxy and `lib/og-image.js` are gone, nothing at runtime imports it. Next already carries its own optional `sharp@0.35.4` (patched; the audit flags `<0.35.4`). 0.35 breaks nothing the script uses (resize/webp); it drops Node 18 and removes the install script. | HIGH |
| Geist woff2 (from the `geist` npm package, or the copy shipped in it) | geist 1.7.2 | Heading, name and index type | OFL, so redistribution in a public repo is fine. Official `.woff2` ships in `dist/fonts/geist-sans/` (Geist-Regular.woff2 ~50 KB vs the 126 KB `.ttf` in `public/`). No conversion tooling needed. | HIGH |
| `fonttools` (Python) or `woff2_compress` (Homebrew `woff2`) | 4.66.1 / 1.0.2 | Converting OTF/TTF to WOFF2 | Only if a face with no official WOFF2 is kept (Satoshi, if its licence clears; Fontshare's own download already includes WOFF2). Neither is installed locally. `pip install fonttools brotli` then `fonttools ttLib.woff2 compress in.otf`. | HIGH |

### Development Tools

| Tool | Purpose | Notes |
|---|---|---|
| `cf` CLI (v1.0.0-beta.10, on PATH) | One-off R2 setup: bucket, CORS (`cf r2 buckets cors update`), custom domain (`cf r2 buckets domains custom create`), optional bucket lock | Per CLAUDE.md, use `cf` because this repo has no Wrangler config. Do not `wrangler login` into another account. Which Cloudflare account owns the bucket and the koussay.online zone is Koussay's decision; both must be in the same account. |
| Cloudflare Transform Rule (response header) on the media hostname | Static `Access-Control-Allow-Origin: *` | Avoids the R2 cache plus missing-`Vary: Origin` failure, where a response cached without the header is replayed to a later CORS request. |
| `npx playwright install --only-shell chromium` | Headless Chromium only | Skips Firefox and WebKit downloads. |

---

## Installation

```bash
# Remove runtime deps that only served the Notion media proxy / PDF / sharp OG path
npm uninstall @napi-rs/canvas pdfjs-dist unpdf sharp @higgsfield/client

# Authoring-time and test tooling (devDependencies)
npm install -D sharp@^0.35.5 aws4fetch@1.0.20 @playwright/test@1.63.0
npx playwright install --only-shell chromium

# Fonts: copy official Geist WOFF2 into public/ (one-off; geist need not stay installed)
npm pack geist@1.7.2 && tar -xzf geist-1.7.2.tgz package/dist/fonts/geist-sans/Geist-Regular.woff2 package/dist/fonts/geist-sans/Geist-Medium.woff2

# Video tooling: no install. Pinned per run:
npx hyperframes@0.8.114 doctor     # checks Chrome, FFmpeg, Node
```

`@notionhq/client` and `resend` stay; bookings still use them.

---

## Patterns by concern

### 1. Content in the repo (Next 16 static project pages)

Layout:

```
content/
  projects/
    index.js            // ordered array = ring order (AGENTS.md: order is ring order)
    fidohomes.js        // export default { slug, name, type, year, live, status, summary, challenge, outcome, role, tools, mood, gallery: [...] }
    ...
  media.json            // WRITTEN BY THE PIPELINE ONLY: { [slug]: { cell, cover, og, poster, video, gallery[] } } with url, width, height, bytes
lib/content.js          // server-only: joins projects + media, validates, throws at build on a missing field
```

- Keep Koussay-approved prose (`content/projects/*.js`) separate from machine output (`content/media.json`) so a regeneration can never overwrite copy.
- The app imports `media.json` statically (the bundler handles JSON). Scripts read it with `fs` and never `import` it, which avoids Node's `with { type: "json" }` requirement. Scripts *can* `import` the `.js` content modules, provided those modules import nothing (no `@/` alias; Node cannot resolve it).
- `app/project/[slug]/page.js`: `generateStaticParams()` returns the eight slugs from `lib/content.js`, plus `export const dynamicParams = false` (unknown slug returns 404 at the edge). Drop `revalidate = 60`: content changes ship by deploy. Both segment options are still valid because `cacheComponents` is not enabled (route segment config docs, v16 history row). (HIGH)
- Remove `lib/cms/*`, `/api/cms-stamp`, `CmsLive`, `unstable_cache` and the `projects` tag. `/api/revalidate` then has nothing to bust: delete it (this closes the fail-open defect).

### 2. R2 media served to Next 16 on Vercel

`next.config.mjs` (verified against `docs/01-app/03-api-reference/02-components/image.md`):

```js
images: {
  remotePatterns: [new URL("https://media.koussay.online/projects/**")], // URL form supported since 15.3; implies no query string
  // qualities defaults to [75] in 16; add values only if a quality prop is used
},
// delete localPatterns for /api/media/**, serverExternalPackages, outputFileTracingIncludes
```

- Immutable URLs: key = `projects/<slug>/<name>-<sha8>.<ext>`, uploaded with `Cache-Control: public, max-age=31536000, immutable`. The optimizer's TTL is the larger of `minimumCacheTTL` (default 4 h) and the upstream `Cache-Control`, so optimized variants inherit one year with no config change. Never append `?v=`. (HIGH)
- `next/image` for the project-page cover and gallery. Vercel fetches R2 server-side, so no CORS is needed. In Next 16, `priority` is deprecated: use `preload` (or `loading="eager"` / `fetchPriority="high"`) on the LCP image only. At this scale (8 projects), the Hobby allowance of 5K transformations a month is ample. (HIGH)
- The ring atlas loads cells **directly** from R2 (not through `/_next/image`) with `img.crossOrigin = "anonymous"` set before `src`. (HIGH)
- Bucket CORS (`cf r2 buckets cors update`): `[{ "AllowedOrigins": ["*"], "AllowedMethods": ["GET","HEAD"], "MaxAgeSeconds": 86400 }]`. `*` is right for public, credential-less art and sidesteps listing localhost, preview and production origins. Add a response-header Transform Rule on the media host that sets `Access-Control-Allow-Origin: *`, so a response cached from a no-`Origin` request (next/image, curl, OG crawlers) still carries it. Purge the host's cache after any CORS change. (MEDIUM: the R2 `Vary` gap is from the Cloudflare community, not official docs. Verify with `curl -I` with and without `Origin` after a cache warm.)
- `.webp`, `.mp4`, `.jpg` and `.webm` are on Cloudflare's default cached-extension list, so no Cache Rule is needed. (HIGH)
- OG images: the pipeline writes a 1200×630 **JPEG** to R2, and `generateMetadata` sets `openGraph.images` to that absolute URL. Root and booking get static `app/opengraph-image.png` / `app/booking/opengraph-image.png` files (supported static convention: jpg/png/gif only, not WebP). Delete `lib/og-image.js` and every `*-image.js` route. That is the last runtime `sharp` import. (HIGH)
- Seed image-to-video from a **JPEG/PNG** public R2 URL, not WebP. Higgsfield's i2v schemas only say "public URL of the input image"; accepted formats are not documented. (LOW, verify on the first probe.)

### 3. Higgsfield from Node (verified 2026-10-03)

- Auth header: `Authorization: Key ${id}:${secret}`. The base is `https://api.higgsfield.ai`. Keys are created at console.higgsfield.ai. (HIGH)
- Image: `POST /higgsfield-ai/soul/v2/standard` with `{ prompt, aspect_ratio: "3:2", resolution: "1080p", batch_size: 1, seed }`. `batch_size` is 1 or 4. There is no negative-prompt field; `art-direction.mjs` already folds its NEGATIVE text into the prompt, which is correct. `style_strength` is accepted but currently has no effect. (HIGH) The older `higgsfield-ai/soul/standard` also exists; its OpenAPI says `resolution: "2K" | "4K"` while its doc page example uses `"720p"`, so avoid it until a probe settles which is right. (MEDIUM)
- Exact pixel size at 3:2/1080p is not documented (likely ~1620×1080). The cover target of 1536×1024 fits under it either way. Read the real size from the first probe. (LOW)
- Video: pick from the current catalogue (Kling 3.0 Turbo i2v, Seedance 2.x, Wan 3.0, Hailuo 2.3, etc.) by running `POST /estimate/<endpoint>` and one probe. Do not hardcode `dop-standard`. (HIGH that DoP is gone from the docs; LOW on which model looks best.)
- Lifecycle: the submit returns `{ status: "queued", request_id, status_url, cancel_url }`. Poll `status_url` until `completed | failed | nsfw | canceled`. A completed image returns `images[].url` and a video returns `video.url`. `failed` and `nsfw` are refunded. Outputs are kept for at least 7 days, so download immediately (the script already does). Concurrency over the limit returns **400** "Maximum number of concurrent requests (4)", so run the eight projects sequentially. (HIGH)
- Idempotency: send an `Idempotency-Key` (UUID) per intended generation and store it in the manifest **before** the POST. A replay returns the original `request_id` without another charge. Changed parameters with the same key return 422; do not auto-rotate the key. (HIGH)

### 4. HyperFrames launch videos

- Output: `npx hyperframes render --output brag.mp4` gives H.264 MP4 at the composition's size and `data-fps` (default 30), CRF 16 by default. The brag skill then picks a poster frame and bakes it in as frame 0. (HIGH)
- Do not ship the CRF-16 master. Re-encode a web hero:
  `ffmpeg -i brag.mp4 -an -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 23 -preset slow -vf "scale=-2:1080" -movflags +faststart hero.mp4`
  `-an` because the hero is always muted. Only also ship the audio version if a real "sound on" control is built (no fake controls).
- Poster: `ffmpeg -ss <settled beat> -i hero.mp4 -frames:v 1 -q:v 2 poster.jpg`, then sharp to `poster.webp` (hero `poster=`) and to the atlas cell (the ring still). Upload with the same content-addressed scheme.
- Keep compositions out of the Next/Tailwind graph: put them under a top-level folder such as `media/launch/<slug>/` and add `@source not "../media";` to `app/globals.css`. Tailwind v4 auto-scans every non-gitignored file. Gitignore render output (`brag-output*/`, `renders/`). (MEDIUM)

### 5. Autoplaying muted hero video

```jsx
<video autoPlay muted playsInline loop preload="metadata" poster={posterUrl}
       width={w} height={h} src={videoUrl} />
```

- All four of `autoplay`, `muted`, `playsinline` and `loop` are needed for iOS Safari inline autoplay. React 19.2.8 SSR **does** emit `muted=""` (verified locally with `renderToString`). Because the page is also reached by client-side navigation from the ring, wrap the element in a small client component whose ref sets `el.muted = true` and calls `el.play().catch(() => {})`. iOS Low Power Mode and data-saver refuse autoplay, and the poster must then read as finished. (MEDIUM)
- Under `prefers-reduced-motion: reduce`, drop `autoPlay` and show the poster plus a real play button.
- Format: one H.264 MP4 (yuv420p, faststart). It plays everywhere, a 15–25 s 1080p clip at CRF 23 is a few MB, and R2 through Cloudflare serves the byte ranges Safari needs. Add a WebM/AV1 `<source>` only if bytes become a measured problem. (MEDIUM-HIGH)

### 6. Fonts

- Keep plain `@font-face` in `app/globals.css`, switch the files to WOFF2, and preload the heading face. **Do not move to `next/font/local`.** It generates scoped family names (`font.style.fontFamily`), but `splitText.js`, `tag.js` (canvas `ctx.font`), `meta.js` and the `gui.js` dropdown all look fonts up by the literal names in `params.js`. Adopting it would mean threading generated names through the ring for a CLS benefit the canvas does not get. (HIGH, from `docs/.../font.md` and grep of the ring code)
- `textFont: "PP Neue Montreal"` becomes `"Geist"`. Delete the `@font-face` block and the file, and remove it from the `gui.js` list in the same commit.

### 7. Smoke test

```js
// playwright.config.mjs
import { defineConfig, devices } from "@playwright/test";
const PORT = 3100; // 3000/3200/4330 are taken by other products on this Mac
const baseURL = process.env.BASE_URL || `http://localhost:${PORT}`;
export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  use: { baseURL, launchOptions: { args: ["--enable-unsafe-swiftshader"] } },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.BASE_URL ? undefined : {
    command: `npm run build && npx next start -p ${PORT}`,
    url: baseURL, reuseExistingServer: false, timeout: 240_000,
  },
});
```

```js
// tests/smoke.spec.mjs
import { test, expect } from "@playwright/test";
test("home renders the ring with no console errors", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/_vercel/**", (r) => r.fulfill({ status: 204, body: "" })); // Speed Insights 404s off-Vercel
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveCount(1);
  const alive = await canvas.evaluate((c) => {
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    return !!gl && !gl.isContextLost();
  });
  expect(alive).toBe(true);
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});
```

- `--enable-unsafe-swiftshader`: Chrome has deprecated automatic software-WebGL fallback, so on a GPU-less runner WebGL creation fails without this flag. (MEDIUM-HIGH)
- `next start` with `output: "standalone"` set (it is set whenever `VERCEL !== "1"`) only logs a warning; it still serves. (HIGH, from `next/dist/server/next.js`)
- `BASE_URL=https://koussay.online npx playwright test` runs the same check against live or preview, which fits "verify the live URL". Kill only port 3100 afterwards.
- Scripts: `"test:smoke": "playwright test"`.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|---|---|---|
| JS content modules | `@next/mdx` 16.3.8 | Only if case studies grow into long-form articles with embedded components. It costs `mdx-components.js`, `pageExtensions`, and Turbopack's restriction to serializable remark/rehype options. |
| JS content modules | One JSON per project | If Koussay wants to edit content outside an editor. The app then imports it fine, but scripts must `fs.readFileSync` it rather than import it. |
| `aws4fetch` | `@aws-sdk/client-s3` 3.1146.0 | If multipart uploads over ~100 MB become routine. It is dozens of packages for PUT/HEAD/LIST otherwise. |
| `aws4fetch` | Keep hand-rolled `r2.mjs` | Acceptable if `--check` passes on the first live run. Its weakness is not correctness on paper; it is that nobody has run it, and any future operation (list, delete) means more SigV4 code. |
| `aws4fetch` | `cf r2 objects put` | Interactive one-offs. A beta CLI with account-wide OAuth is a worse fit for a scripted pipeline than a bucket-scoped S3 token. |
| Custom domain on the koussay.online zone | Another domain already on Cloudflare | Only if moving the nameservers is refused. It costs brand and adds a second domain to keep alive. |
| Ring cells from R2 with CORS | Ring cells committed to `public/` with hashed names | If CORS caching proves flaky. Eight ~30 KB WebPs are same-origin and need no CORS, but this breaks the "all media on R2" requirement, so it needs Koussay's say. |
| Plain fetch for Higgsfield | `@higgsfield/client` 0.2.6 with `createHiggsfieldClient({ maxRetries: 0, maxPollTime: 1_200_000, headers: { "Idempotency-Key": key } })` per job | If an official client is preferred. At that point it only sets the auth header. |
| H.264 MP4 only | Add a WebM (VP9/AV1) `<source>` | When measured hero bytes hurt LCP on mobile. |

## What NOT to Use

| Avoid | Why | Use Instead |
|---|---|---|
| `/v1/text2image/soul`, `width_and_height`, `quality`, `/v1/image2video/dop`, `dop-standard` | Absent from current Higgsfield docs and OpenAPI; v1-era parameters. | `higgsfield-ai/soul/v2/standard` with `aspect_ratio` + `resolution`; a current i2v endpoint chosen by `/estimate`. |
| `@higgsfield/client` `subscribe(..., { withPolling: true })` as-is | (a) It retries the **POST** up to 3 times on timeouts and 5xx with no idempotency key: a possible double charge. (b) `maxPollTime` defaults to 5 min, and on timeout it throws without returning the `request_id`, so the paid job is orphaned. (c) No per-call headers. Its README also wrongly says `subscribe` returns a `JobSet`; the shipped code returns the raw `{status, request_id, images, video}`, which the current wrapper reads correctly. | Plain fetch with an `Idempotency-Key` stored in the manifest first. |
| `r2.dev` public URL in production | Rate-limited; no cache, WAF or Transform Rules; Cloudflare says non-production only. CNAME-ing to it is unsupported. | Custom domain on a Cloudflare zone. |
| R2 CORS with an origin allow-list and no header rule | R2 omits `Vary: Origin`, so a cached response without the header gets served to CORS requests and breaks the atlas intermittently. | `*` plus a static response-header Transform Rule. |
| `sharp` in `dependencies` | Nothing at runtime needs it after the proxy and OG removal. 0.34.x carries the high libvips/libheif advisories. | `sharp@^0.35.5` in devDependencies for scripts. |
| Dynamic `opengraph-image.js` with `sharp` or `ImageResponse` for projects | Runtime image work for an image that never changes. `ImageResponse` cannot take WebP or WOFF2 and has a 500 KB bundle cap. | Pre-rendered JPEG on R2 in `openGraph.images`; static `opengraph-image.png` for root and booking. |
| `next/font/local` for these faces | Generated family names break canvas `ctx.font` lookups by name. | `@font-face` + WOFF2 + preload. |
| Satoshi files in the public repo (until the licence is confirmed) | The ITF FFL reportedly bars redistribution and self-hosting without consent. | Geist (OFL). |
| `next-video` / Mux / Vercel Blob for video | A second media host and vendor for eight short clips. | R2 MP4 with `<video>`. |
| `hyperframes` in `package.json` | Heavy (puppeteer-core, esbuild, sharp); authoring only; Node ≥ 22 only. | `npx hyperframes@0.8.114`. |

## Version Compatibility

| Package | Compatible With | Notes |
|---|---|---|
| next 16.3.8 | sharp 0.35.4 (its own optional dep) | Leave it alone; it is patched. Removing the app's `sharp` does not affect Next. |
| sharp 0.35.5 | Node ≥ 20.9.0 | Local Node 26.7 fine. |
| @playwright/test 1.63.0 | Node ≥ 20; Next 16 optional peer | Chromium headless shell only. |
| hyperframes 0.8.114 | Node ≥ 22, FFmpeg on PATH | Released daily (modified 2026-10-03); pin per run for reproducible renders. |
| aws4fetch 1.0.20 | Node ≥ 18 (global `fetch` + WebCrypto) | Last publish 2024-08; stable, tiny surface. |
| remotePatterns `new URL(...)` form | Next ≥ 15.3 | `qualities` is mandatory-by-default `[75]` in 16. |

## Gaps to settle in phases

- Which Cloudflare account takes the koussay.online zone and the bucket (Vamos default login or a new one), and the exact DNS move. Every Vercel and Resend (SPF/DKIM/MX) record must be copied before switching nameservers. This is a human step for Koussay.
- Higgsfield: real output size at 3:2/1080p, accepted i2v input formats, the chosen video model and its cost. One `--probe` each, behind `/estimate`.
- Satoshi licence text (the primary source would not render for fetch).
- Vercel's Hobby plan is "non-commercial personal use only". A client-acquisition portfolio may need Pro. Not a stack choice; flagged.

## Sources

- `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md` — remotePatterns, `qualities` default, `preload` replaces `priority`, `minimumCacheTTL` vs upstream Cache-Control (HIGH)
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-static-params.md`, `03-file-conventions/02-route-segment-config/dynamicParams.md`, `01-metadata/opengraph-image.md`, `04-functions/image-response.md`, `02-components/font.md`, `02-guides/mdx.md`, `02-guides/testing/playwright.md` (HIGH)
- `node_modules/@higgsfield/client/dist/v2/client.js`, `utils/retry.js`, `config.js` — actual subscribe return, POST retry, 5-minute poll cap (HIGH)
- https://docs.higgsfield.ai/docs/llms.txt, `/docs/how-to/sdk.md`, `/docs/models/soul-2/generate.md`, `/docs/concepts/requests.md`, `/docs/concepts/idempotency.md`, `/docs/concepts/rate-limits.md`, `/docs/openapi.json`, `/docs/llms-full.txt` (Kling 3.0 Turbo i2v, billing and retention) (HIGH)
- https://developers.cloudflare.com/r2/buckets/public-buckets/ — custom domain needs a same-account zone; r2.dev non-production (HIGH)
- https://developers.cloudflare.com/dns/zone-setups/partial-setup/ — partial setup Business/Enterprise only (HIGH)
- https://developers.cloudflare.com/r2/buckets/cors/ — CORS fields, cache purge after change (HIGH)
- https://developers.cloudflare.com/r2/examples/aws/aws4fetch/ and `/aws-sdk-js-v3/` (HIGH)
- https://developers.cloudflare.com/cache/concepts/default-cache-behavior/ — default cached extensions (HIGH)
- https://community.cloudflare.com/t/r2-does-not-add-vary-origin-header-which-breaks-future-cors-requests/660056 — R2 Vary gap (MEDIUM)
- https://github.com/heygen-com/hyperframes README and `docs/packages/cli.mdx` — render flags, formats, Node 22 + FFmpeg (HIGH); `~/.claude/skills/brag/references/step-4-deliver.md` — poster bake (HIGH)
- https://raw.githubusercontent.com/lovell/sharp/main/docs/src/content/docs/changelog/v0.35.0.md (HIGH)
- https://groups.google.com/a/chromium.org/g/blink-dev/c/yhFguWS_3pM — SwiftShader fallback removal (MEDIUM-HIGH)
- https://vercel.com/docs/image-optimization/limits-and-pricing — Hobby 5K transformations; Hobby non-commercial (HIGH)
- https://github.com/fontsource/font-files/issues/15 — Satoshi FFL "closed source license exclusive to Fontshare" (MEDIUM); uwarp.design / fontalternatives.com on FFL self-hosting terms (LOW)
- Local checks: `dig NS koussay.online`, `npm view` versions, `npm audit`, `npm ls sharp`, React 19.2.8 `renderToString` of `<video muted>`, `git ls-files` for fonts
- WebKit inline autoplay policy (muted + playsinline): https://webkit.org/blog/6784/new-video-policies-for-ios/ (MEDIUM; from training, not re-fetched)

---
*Stack research for: Koussay Portfolio, milestone adding repo content, R2 media, Higgsfield, HyperFrames and a smoke test*
*Researched: 2026-10-03*
