/**
 * One-off read-only snapshot of https://koussay.online, kept as evidence.
 * Run from the repo root:
 *   node .planning/phases/02-projects-served-from-the-repo/snapshot/capture.mjs
 * Fetches only koussay.online. Reads no env and no keys.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HOST = "koussay.online";
const BASE = `https://${HOST}`;
const here = dirname(fileURLToPath(import.meta.url));
const SLUGS = [
  "pixenhouse",
  "vamos-taxi",
  "looma-kitchen",
  "almar-private-journey",
  "fido-homes",
  "elysee-home-design",
  "clickit-story",
  "artemis-luxe",
];

function fail(reason) {
  console.error(`[snapshot] ${reason}`);
  process.exit(1);
}

async function get(path, headers = {}) {
  const url = new URL(path, BASE);
  if (url.hostname !== HOST) throw new Error(`refusing host ${url.hostname}`);
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`${url.pathname} -> ${res.status}`);
  return res.text();
}

function sliceJson(text, marker) {
  const at = text.indexOf(marker);
  if (at === -1) throw new Error(`marker not found: ${marker}`);
  const start = at + marker.length - 1;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let k = start; k < text.length; k++) {
    const c = text[k];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "[" || c === "{") depth++;
    else if (c === "]" || c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, k + 1);
    }
  }
  throw new Error("unbalanced");
}

function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function metaContent(html, attr, name) {
  for (const m of html.matchAll(/<meta\s[^>]*>/g)) {
    const tag = m[0];
    const key = tag.match(new RegExp(`${attr}="([^"]*)"`));
    if (key && key[1] === name) {
      const c = tag.match(/content="([^"]*)"/);
      return c ? decode(c[1]) : null;
    }
  }
  return null;
}

function title(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/);
  return m ? decode(m[1]) : null;
}

function stripTags(s) {
  return decode(s.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, "")).trim();
}

function pathAndSearch(u) {
  if (!u) return null;
  const x = new URL(u, BASE);
  return x.pathname + x.search;
}

async function main() {
  await mkdir(join(here, "html"), { recursive: true });
  await mkdir(join(here, "screens"), { recursive: true });

  // 1. projects prop
  const flight = await get("/", { RSC: "1" });
  const projects = JSON.parse(sliceJson(flight, '"projects":['));
  if (projects.length !== 8) fail(`expected 8 rows, got ${projects.length}`);
  const order = projects.map((p) => p.slug);
  if (JSON.stringify(order) !== JSON.stringify(SLUGS))
    fail(`live order differs: ${order.join(",")}`);
  if (/"\$[^"]*"/.test(JSON.stringify(projects)))
    fail("RSC references inside projects");

  // 2. pixenhouse pages
  const pix = await get("/project/pixenhouse", { RSC: "1" });
  const hits = [
    ...pix.matchAll(
      /"file":"(\/api\/media\/[0-9a-f]+\/g0p(\d+)\?[^"]+)","alt":"([^"]*)","kind":"pdf","page":(\d+),"pages":(\d+)/g,
    ),
  ];
  if (hits.length !== 29) fail(`expected 29 pixenhouse pages, got ${hits.length}`);
  const pixenhouseGallery = hits.map((m) => ({
    page: Number(m[4]),
    pages: Number(m[5]),
    from: m[1],
    rscAlt: m[3],
  }));
  pixenhouseGallery.forEach((g, i) => {
    if (g.page !== i + 1 || g.pages !== 29) fail(`bad page numbering at ${i}`);
  });

  // 3. HTML
  const rendered = {};
  const homeHtml = await get("/");
  await writeFile(join(here, "html", "home.html"), homeHtml);
  const h1 = homeHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  rendered.home = {
    title: title(homeHtml),
    description: metaContent(homeHtml, "name", "description"),
    h1: h1 ? stripTags(h1[1]) : null,
  };
  for (const slug of SLUGS) {
    const html = await get(`/project/${slug}`);
    await writeFile(join(here, "html", `${slug}.html`), html);
    const t = html.match(/<h1[^>]*id="project-title"[^>]*>([\s\S]*?)<\/h1>/);
    const live = html.match(
      /<a\s[^>]*href="([^"]+)"[^>]*>\s*View live project/,
    );
    const gal = html.match(
      /<section[^>]*aria-label="Gallery"[^>]*>([\s\S]*?)<\/section>/,
    );
    const galleryAlts = gal
      ? [...gal[1].matchAll(/<img\s[^>]*>/g)]
          .map((m) => m[0].match(/\salt="([^"]*)"/))
          .filter(Boolean)
          .map((m) => decode(m[1]))
      : [];
    rendered[slug] = {
      title: title(html),
      description: metaContent(html, "name", "description"),
      h1: t ? stripTags(t[1]) : null,
      liveHref: live ? decode(live[1]) : null,
      ogImage: pathAndSearch(metaContent(html, "property", "og:image")),
      galleryAlts,
    };
  }
  const pa = rendered.pixenhouse.galleryAlts;
  if (pa.length !== 29) fail(`pixenhouse rendered ${pa.length} alts, expected 29`);
  pa.forEach((a, i) => {
    const want = `PIXENHOUSE — page ${i + 1} of 29. Brand & Web by Koussay Zayani.`;
    if (a !== want) fail(`alt ${i + 1} is "${a}"`);
    pixenhouseGallery[i].alt = a;
  });
  for (const slug of SLUGS.slice(1)) {
    if (rendered[slug].galleryAlts.length !== 0)
      fail(`${slug} has ${rendered[slug].galleryAlts.length} gallery alts`);
  }

  // 4. llms.txt and sitemap.xml
  const llms = await get("/llms.txt");
  const sitemap = await get("/sitemap.xml");
  if (!llms.trim() || !sitemap.trim()) fail("llms.txt or sitemap.xml empty");
  await writeFile(join(here, "llms.txt"), llms);
  await writeFile(join(here, "sitemap.xml"), sitemap);
  for (const p of projects) {
    const re = new RegExp(
      `<loc>[^<]*/project/${p.slug}</loc>\\s*<lastmod>([^<]+)</lastmod>`,
    );
    const m = sitemap.match(re);
    if (!m) fail(`no sitemap lastmod for ${p.slug}`);
    if (new Date(m[1]).toISOString() !== new Date(p.updatedAt).toISOString())
      fail(`lastmod mismatch for ${p.slug}`);
  }

  // 5. JSON
  const media = [
    ...projects.map((p) => ({ slug: p.slug, slot: "cover", from: p.file })),
    ...pixenhouseGallery.map((g) => ({
      slug: "pixenhouse",
      slot: `brand-guideline-p${String(g.page).padStart(2, "0")}`,
      from: g.from,
    })),
  ];
  const out = {
    capturedAt: new Date().toISOString(),
    source: BASE,
    order,
    projects,
    pixenhouseGallery,
    media,
  };
  await writeFile(
    join(here, "live-2026-10-04.json"),
    JSON.stringify(out, null, 2) + "\n",
  );
  await writeFile(
    join(here, "rendered.json"),
    JSON.stringify(rendered, null, 2) + "\n",
  );
  console.log(
    `snapshot ok: ${projects.length} projects, ${pixenhouseGallery.length} pages, ${media.length} media`,
  );
}

main().catch((e) => fail(e.message));
