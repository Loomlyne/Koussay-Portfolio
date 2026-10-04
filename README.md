# Koussay Portfolio

Koussay Zayani's portfolio. A ring of project cards drawn by one WebGL shader.
Scroll, drag or swipe to turn it. A card settles at the front. Click a card to
open its case study, and every page leads to a booking form.

Live at https://koussay.online.

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Three.js](https://img.shields.io/badge/Three.js-r185-black)

The cards are not images in a grid. The whole ring is one full-screen fragment
shader drawing signed distance fields. That is what lets neighbouring cards
melt into one another as they close up and string thin threads as they pull
apart.

[Read the breakdown](BREAKDOWN.md) for where the idea came from and how it was
built.

## Stack

- Next.js 16 (App Router) and React 19
- three.js for the ring, GSAP for the entry animation, Lenis for smooth scroll
- Tailwind v4
- Repo content modules for projects, Notion for bookings, Resend for email
- Geist and Geist Mono, self-hosted as woff2 under the SIL Open Font Licence

## Quick start

You need Node 20.9 or newer.

```bash
git clone https://github.com/Loomlyne/Koussay-Portfolio.git
cd Koussay-Portfolio
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. Restart the dev server after you change
`.env.local`.

Projects are read from `content/projects` and their images come from
media.koussay.online, so the ring needs no keys. Without the Notion booking
keys, `/api/book` returns 503.

### Environment variables

Names and purposes only. Put the values in `.env.local`, never in git.

| Variable                                                                 | Group         | Purpose                                                         |
| ------------------------------------------------------------------------ | ------------- | --------------------------------------------------------------- |
| `NOTION_TOKEN`                                                           | App           | Notion integration token                                        |
| `NOTION_BOOKINGS_DATABASE_ID`                                            | App           | Bookings database, one timed event per booking                  |
| `RESEND_API_KEY`                                                         | App           | Resend key for booking email                                    |
| `RESEND_FROM`                                                            | App           | Sender, on a domain verified in Resend                          |
| `BOOKING_NOTIFY_EMAIL`                                                   | App           | Inbox for new-booking alerts                                    |
| `NOTION_CALENDAR_DATABASE_ID`                                            | App, optional | Extra Notion database for blocked time                          |
| `FIRECRAWL_API_KEY`                                                      | App, optional | Reads the company site for the booking briefing                 |
| `GEMINI_API_KEY`                                                         | App, optional | Writes the briefing (`GOOGLE_GENERATIVE_AI_API_KEY` also works) |
| `GEMINI_MODEL`                                                           | App, optional | Gemini model override                                           |
| `OPENAI_API_KEY`                                                         | App, optional | Writes the briefing with OpenAI instead                         |
| `OPENAI_MODEL`                                                           | App, optional | OpenAI model override                                           |
| `HF_CREDENTIALS`                                                         | Scripts only  | Higgsfield key pair joined with a colon                         |
| `HIGGSFIELD_API_KEY_ID`, `HIGGSFIELD_API_KEY_SECRET`                     | Scripts only  | Same key pair, as two variables                                 |
| `HIGGSFIELD_IMAGE_ENDPOINT`, `HIGGSFIELD_VIDEO_ENDPOINT`                 | Scripts only  | Override the default endpoints                                  |
| `HIGGSFIELD_IMAGE_PARAMS`, `HIGGSFIELD_VIDEO_PARAMS`                     | Scripts only  | JSON overrides for generation settings                          |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Scripts only  | Cloudflare R2 upload credentials                                |
| `R2_PUBLIC_BASE`                                                         | Scripts only  | Public domain of the R2 bucket                                  |

## Content

Project text lives in `content/projects/<slug>.mjs`, one module per project.
`content/projects/index.mjs` holds `ORDER`, which is the ring order. Project
text and media change only through this repo.

Images live on Cloudflare R2 at https://media.koussay.online and never change
once uploaded. `content/media.json` lists them and is written only by
`scripts/media.mjs`:

- `node scripts/media.mjs check` checks the manifest.
- `node scripts/media.mjs import-live` imports existing live images.
- `node scripts/media.mjs verify` checks the files on R2.
- `node scripts/media.mjs generate --dry-run` shows what would be generated.
  Run it before any real `generate`, which costs credits.

`node scripts/check-content.mjs` checks the content in under a second.

## Commands

| Command                | What it does                                                  |
| ---------------------- | ------------------------------------------------------------- |
| `npm run dev`          | Dev server on localhost:3000                                  |
| `npm run build`        | Production build                                              |
| `npm start`            | Serve the build                                               |
| `npm run lint`         | ESLint                                                        |
| `npm run format`       | Prettier, write                                               |
| `npm run format:check` | Prettier, check only                                          |
| `npm test`             | Playwright smoke test on port 3100 against a production build |
| `npm run screens`      | Font sign-off screenshots                                     |

## What you can interact with

- Scroll or drag to turn the ring. It has momentum and snaps to the nearest
  card.
- Hover a card to soften the field around it and push its neighbours aside.
- Click a card to open its case study.
- On touch, swipe to turn and press and hold for the hover effects.

In development, a [lil-gui](https://lil-gui.georgealways.com/) panel appears
top right with every tunable. It never ships. Before you tune anything, open
the `fit` folder and check that `scale` reads `1.000`.

For ring internals, coordinate conventions and the things that look like bugs
but are not, read [AGENTS.md](AGENTS.md).

## Credits

- The WebGL ring started from Yousuf Soomro's open-source MIT carousel,
  https://github.com/Yousuf-developer/Viscose-carousel. He is the original
  author of the idea and the animation. See [BREAKDOWN.md](BREAKDOWN.md).
- The gooey text morph, two blurred copies fused through an SVG alpha
  threshold, is a widely circulated CodePen technique. It is adapted here to
  run once per card change instead of on a loop.
- Simplex noise in the ring shader is
  [webgl-noise](https://github.com/ashima/webgl-noise) by Ian McEwan (Ashima
  Arts) and Stefan Gustavson, MIT.

## Licence

[MIT](LICENSE) for the source code. The licence carries Koussay's line and
Yousuf's line. It does not cover anything in `public/`.

Fonts are Geist and Geist Mono under the SIL Open Font Licence 1.1, in
`public/fonts` with `OFL.txt`.

Project media is not MIT. Images and videos served from media.koussay.online
belong to Koussay or to the clients named on each project page. See
[LICENSE](LICENSE).

Files removed from the tree, including earlier fonts and old placeholder art,
remain in this repository's git history.

## Contributing

Run `npm run format`, `npm run lint` and `npm test` before a pull request. If
you change anything in `components/shaders/`, load the page, because GLSL
compiles in the browser and a passing build proves nothing about it.
