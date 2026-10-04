/**
 * Compares content/projects against the committed live snapshot, field for
 * field: node scripts/compare-snapshot.mjs
 * Prints "snapshot ok 8/8" or one "[snapshot] <slug>.<field>" line per mismatch.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { pathToFileURL } from "node:url";
import { root } from "./lib/load-env.mjs";

const dir = join(
  root,
  ".planning/phases/02-projects-served-from-the-repo/snapshot",
);
const live = JSON.parse(
  readFileSync(join(dir, "live-2026-10-04.json"), "utf8"),
);
const rendered = JSON.parse(readFileSync(join(dir, "rendered.json"), "utf8"));
const { PROJECTS_IN_ORDER, ORDER } = await import(
  pathToFileURL(join(root, "content/projects/index.mjs")).href
);

const errors = [];
const bad = (slug, field, a, b) =>
  errors.push(
    `[snapshot] ${slug}.${field}: live ${JSON.stringify(a)} vs content ${JSON.stringify(b)}`,
  );
const eq = (slug, field, a, b) => {
  if (!isDeepStrictEqual(a, b)) bad(slug, field, a, b);
};

let ok = 0;
for (const row of live.projects) {
  const before = errors.length;
  const slug = row.slug;
  const c = PROJECTS_IN_ORDER.find((p) => p.slug === slug);
  if (!c) {
    bad(slug, "(module)", "present", "absent");
    continue;
  }
  eq(slug, "order", row.index, ORDER.indexOf(slug));
  eq(slug, "name", row.name, c.name);
  eq(slug, "type", row.type, c.type);
  eq(slug, "year", row.year, c.year);
  eq(slug, "liveUrl", row.liveUrl || null, c.liveUrl);
  eq(slug, "updated", row.updatedAt, c.updated);
  for (const k of ["summary", "overview", "challenge", "outcome", "tools"]) {
    eq(slug, k, row.detail[k], c[k]);
  }
  const t = row.detail.testimonial;
  const empty = !t || (!t.quote && !t.author && !t.role);
  eq(slug, "testimonial", empty ? null : t, c.testimonial);
  const alts = rendered[slug].galleryAlts || [];
  eq(slug, "gallery.length", alts.length, c.gallery.length);
  c.gallery.forEach((g, i) => {
    eq(slug, `gallery[${i}].alt`, alts[i], g.alt);
    if (slug === "pixenhouse") {
      eq(
        slug,
        `gallery[${i}].media`,
        `brand-guideline-p${String(i + 1).padStart(2, "0")}`,
        g.media,
      );
    }
  });
  if (errors.length === before) ok += 1;
}
for (const p of PROJECTS_IN_ORDER) {
  if (!live.projects.some((r) => r.slug === p.slug)) {
    bad(p.slug, "(module)", "absent", "extra slug");
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`snapshot ok ${ok}/${live.projects.length}`);
