/**
 * Proves D-01 "no visible change": compares a running local build against the
 * committed live snapshot, measuring both sides with the same extract().
 * Usage: node scripts/compare-rendered.mjs [--base=http://localhost:3100]
 * Refuses koussay.online and its subdomains. Reads no env.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const snap = join(
  root,
  ".planning/phases/02-projects-served-from-the-repo/snapshot",
);

const arg = process.argv.slice(2).find((a) => a.startsWith("--base="));
const base = arg ? arg.slice("--base=".length) : "http://localhost:3100";
const host = new URL(base).hostname;
if (host === "koussay.online" || host.endsWith(".koussay.online")) {
  console.error(`[rendered] refusing production host ${host}`);
  process.exit(1);
}

function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    )
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

const collapse = (s) => s.replace(/\s+/g, " ").trim();
const text = (s) =>
  collapse(decode(s.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ")));

function meta(html, name) {
  for (const m of html.matchAll(/<meta\s[^>]*>/g)) {
    const key = m[0].match(/name="([^"]*)"/);
    if (key && key[1] === name) {
      const c = m[0].match(/content="([^"]*)"/);
      return c ? decode(c[1]) : null;
    }
  }
  return null;
}

// React streams a Suspense fallback first and a hidden segment after it; the
// browser's inline $RC script swaps them. Do the same swap on the raw HTML so
// both sides are measured as rendered, not as streamed.
function divEnd(html, from) {
  let depth = 0;
  const re = /<div\b|<\/div>/g;
  re.lastIndex = from;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    depth += m[0] === "</div>" ? -1 : 1;
    if (depth === 0) return m.index + m[0].length;
  }
  return -1;
}

function boundaryEnd(html, from) {
  let depth = 0;
  const re = /<!--\$[?!]?-->|<!--\/\$-->/g;
  re.lastIndex = from;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    depth += m[0] === "<!--/$-->" ? -1 : 1;
    if (depth === 0) return m.index + m[0].length;
  }
  return -1;
}

function resolveStreaming(input) {
  let html = input;
  const segments = new Map();
  for (;;) {
    const seg = html.match(/<div hidden id="S:(\d+)">/);
    if (!seg) break;
    const end = divEnd(html, seg.index);
    if (end < 0) throw new Error(`unbalanced streamed segment S:${seg[1]}`);
    segments.set(
      seg[1],
      html.slice(seg.index + seg[0].length, end - "</div>".length),
    );
    html = html.slice(0, seg.index) + html.slice(end);
  }
  // A segment's boundary can sit inside another segment, so swap until none
  // is left that has a boundary to land in.
  for (let progress = true; progress && segments.size;) {
    progress = false;
    for (const [id, inner] of segments) {
      // $RS: the segment replaces its placeholder template in place.
      const slot = `<template id="P:${id}"></template>`;
      if (html.includes(slot)) {
        html = html.replace(slot, () => inner);
        segments.delete(id);
        progress = true;
        continue;
      }
      const open = html.indexOf(`<!--$?--><template id="B:${id}"></template>`);
      if (open < 0) continue;
      const close = boundaryEnd(html, open);
      if (close < 0) throw new Error(`unbalanced boundary B:${id}`);
      html = `${html.slice(0, open)}<!--$-->${inner}<!--/$-->${html.slice(close)}`;
      segments.delete(id);
      progress = true;
    }
  }
  if (segments.size) {
    throw new Error(
      `streamed segments without a boundary: ${[...segments.keys()]}`,
    );
  }
  return html.replace(/<script>\$R[CS]\([^<]*<\/script>/g, "");
}

function extract(raw) {
  const html = resolveStreaming(raw);
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/);
  const h1 =
    html.match(/<h1[^>]*id="project-title"[^>]*>([\s\S]*?)<\/h1>/) ??
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const live = html.match(/<a\s[^>]*href="([^"]+)"[^>]*>\s*View live project/);
  const gal = html.match(
    /<section[^>]*aria-label="Gallery"[^>]*>([\s\S]*?)<\/section>/,
  );
  const galleryAlts = gal
    ? [...gal[1].matchAll(/<img\s[^>]*>/g)]
        .map((m) => m[0].match(/\salt="([^"]*)"/))
        .filter(Boolean)
        .map((m) => decode(m[1]))
    : [];
  const main = [...html.matchAll(/<main([^>]*)>([\s\S]*?)<\/main>/g)].find(
    (m) => !/aria-busy="true"/.test(m[1]),
  );
  const mainText = main
    ? text(
        main[2]
          .replace(/<script[\s\S]*?<\/script>/g, "")
          .replace(/<style[\s\S]*?<\/style>/g, "")
          .replace(/<noscript[\s\S]*?<\/noscript>/g, "")
          .replace(/<template[\s\S]*?<\/template>/g, ""),
      )
    : "";
  return {
    title: t ? collapse(decode(t[1])) : null,
    description: meta(html, "description"),
    h1: h1 ? text(h1[1]) : null,
    liveHref: live ? decode(live[1]) : null,
    galleryAlts,
    mainText,
  };
}

const problems = [];
function clip(v) {
  const s = JSON.stringify(v);
  return s && s.length > 160 ? `${s.slice(0, 157)}...` : s;
}
function diff(a, b) {
  const x = String(a);
  const y = String(b);
  let i = 0;
  while (i < x.length && x[i] === y[i]) i++;
  const from = Math.max(0, i - 40);
  return [x.slice(from, from + 160), y.slice(from, from + 160)];
}
function report(page, field, live, local) {
  const same = JSON.stringify(live) === JSON.stringify(local);
  if (same) return true;
  const [a, b] =
    typeof live === "string" && typeof local === "string"
      ? diff(live, local)
      : [clip(live), clip(local)];
  problems.push(`[rendered] ${page}.${field}: live "${a}" vs local "${b}"`);
  return false;
}

async function local(path) {
  const res = await fetch(new URL(path, base), {
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.text();
}

const live = JSON.parse(await readFile(join(snap, "live-2026-10-04.json")));
const rendered = JSON.parse(await readFile(join(snap, "rendered.json")));
const pages = [{ name: "home", path: "/" }].concat(
  live.order.map((slug) => ({ name: slug, path: `/project/${slug}` })),
);

let ok = 0;
for (const { name, path } of pages) {
  const before = problems.length;
  const snapHtml = await readFile(join(snap, "html", `${name}.html`), "utf8");
  const a = extract(snapHtml);
  let b;
  try {
    b = extract(await local(path));
  } catch (err) {
    problems.push(`[rendered] ${name}: ${err.message}`);
    continue;
  }
  for (const field of Object.keys(a)) report(name, field, a[field], b[field]);
  // The committed capture must agree with the snapshot html.
  const r = rendered[name];
  for (const field of [
    "title",
    "description",
    "h1",
    "liveHref",
    "galleryAlts",
  ]) {
    if (r[field] !== undefined)
      report(name, `capture.${field}`, r[field], b[field]);
  }
  if (name !== "home") {
    const p = live.projects.find((x) => x.slug === name);
    const d = p.detail;
    const want = [
      p.name,
      p.type,
      p.year,
      d.summary,
      d.overview,
      d.challenge,
      d.outcome,
    ]
      .concat(d.tools ?? [])
      .concat(["Overview", "Challenge", "Outcome"])
      .filter(Boolean);
    for (const w of want) {
      if (!b.mainText.includes(collapse(w))) {
        problems.push(
          `[rendered] ${name}.mainText: live "${clip(collapse(w))}" vs local "(missing)"`,
        );
      }
    }
  }
  if (problems.length === before) ok++;
}

for (const line of problems) console.error(line);
if (problems.length || ok !== pages.length) {
  console.error(`rendered FAILED ${ok}/${pages.length}`);
  process.exit(1);
}
console.log(`rendered ok ${ok}/${pages.length}`);
