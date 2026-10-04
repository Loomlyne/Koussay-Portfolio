/**
 * Content schema, validator and resolver. Pure: no app imports, no env, so the
 * fast gate (scripts/check-content.mjs) and the build run the same code.
 * Empty values (null, "", []) are allowed; a missing key is not (D-09, D-10).
 */
import { homeLines, inputsHash, projectLines } from "./share.mjs";

export const SCHEMA_KEYS = [
  "slug",
  "name",
  "updated",
  "type",
  "kind",
  "client",
  "industry",
  "location",
  "year",
  "role",
  "services",
  "status",
  "liveUrl",
  "summary",
  "overview",
  "challenge",
  "approach",
  "outcome",
  "tools",
  "testimonial",
  "identity",
  "gallery",
];

export const GALLERY_KEYS = ["media", "alt", "kind", "caption"];

const MEDIA_PREFIX = "https://media.koussay.online/projects/";
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TEXT_KEYS = [
  "name",
  "type",
  "client",
  "industry",
  "location",
  "year",
  "role",
  "summary",
  "overview",
  "challenge",
  "approach",
  "outcome",
];
const KINDS = [null, "client", "own"];
const STATUSES = [null, "live", "pre-launch"];
const GALLERY_KINDS = [null, "screenshot", "generated", "identity", "video"];

const isStr = (v) => typeof v === "string";
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isPosInt = (v) => Number.isInteger(v) && v > 0;
const isText = (v) => isStr(v) && v.trim() !== "";
const UPDATED = /^\d{4}-\d{2}-\d{2}T/;

/** Why a manifest entry is unusable for this slug, or "" when it is fine. */
function entryProblem(e, slug) {
  if (!isObj(e) || !isStr(e.url)) return "missing";
  if (!e.url.startsWith(`${MEDIA_PREFIX}${slug}/`)) {
    return `url not under ${MEDIA_PREFIX}${slug}/`;
  }
  if (!isPosInt(e.width) || !isPosInt(e.height)) {
    return "width/height missing";
  }
  return "";
}

function collect(projects, manifest, maxPlanes, site) {
  const errors = [];
  const add = (slug, field, reason) =>
    errors.push(`[content] ${slug}.${field}: ${reason}`);

  if (!Array.isArray(projects)) {
    return ["[content] projects: not an array"];
  }
  if (projects.length < 1) errors.push("[content] projects: no projects");
  if (projects.length > maxPlanes) {
    errors.push(
      `[content] projects: ${projects.length} projects, at most ${maxPlanes}`,
    );
  }
  const mp = manifest?.projects ?? {};
  const seen = new Set();

  for (const [i, p] of projects.entries()) {
    const slug = isStr(p?.slug) && p.slug ? p.slug : `#${i}`;
    if (!isObj(p)) {
      add(slug, "(module)", "not an object");
      continue;
    }
    for (const key of SCHEMA_KEYS) {
      if (!Object.hasOwn(p, key)) add(slug, key, "key missing");
    }
    if (Object.hasOwn(p, "slug")) {
      if (!isStr(p.slug) || !SLUG.test(p.slug)) add(slug, "slug", "bad slug");
      else if (seen.has(p.slug)) add(slug, "slug", "duplicate slug");
      seen.add(p.slug);
    }
    if (Object.hasOwn(p, "name") && !isText(p.name)) {
      add(slug, "name", "must be a non-empty string");
    }
    for (const key of TEXT_KEYS) {
      if (Object.hasOwn(p, key) && p[key] !== null && !isStr(p[key])) {
        add(slug, key, "must be a string or null");
      }
    }
    if (Object.hasOwn(p, "updated")) {
      if (
        !isStr(p.updated) ||
        !UPDATED.test(p.updated) ||
        Number.isNaN(Date.parse(p.updated))
      ) {
        add(
          slug,
          "updated",
          "must be an ISO date like 2026-09-14T11:45:00.000Z",
        );
      }
    }
    if (Object.hasOwn(p, "kind") && !KINDS.includes(p.kind)) {
      add(slug, "kind", 'must be null, "client" or "own"');
    }
    if (Object.hasOwn(p, "status") && !STATUSES.includes(p.status)) {
      add(slug, "status", 'must be null, "live" or "pre-launch"');
    }
    for (const key of ["services", "tools"]) {
      if (!Object.hasOwn(p, key)) continue;
      if (!Array.isArray(p[key])) {
        add(slug, key, "must be an array");
      } else if (!p[key].every(isText)) {
        add(slug, key, "every item must be a non-empty string");
      }
    }
    if (Object.hasOwn(p, "liveUrl") && p.liveUrl !== null) {
      let ok = false;
      try {
        ok = isStr(p.liveUrl) && new URL(p.liveUrl).protocol === "https:";
      } catch {
        ok = false;
      }
      if (!ok) add(slug, "liveUrl", "must be null or an https URL");
    }
    if (Object.hasOwn(p, "testimonial") && p.testimonial !== null) {
      const t = p.testimonial;
      if (!isObj(t) || !["quote", "author", "role"].every((k) => isStr(t[k]))) {
        add(slug, "testimonial", "must be null or { quote, author, role }");
      }
    }
    if (
      Object.hasOwn(p, "identity") &&
      p.identity !== null &&
      !isObj(p.identity)
    ) {
      add(slug, "identity", "must be null or an object");
    }

    const m = mp[p.slug];
    if (!m) {
      add(slug, "cover", "slug not in content/media.json");
    } else {
      const why = entryProblem(m.cover, p.slug);
      if (why) add(slug, "cover", why);
      const ogWhy = entryProblem(m.og, p.slug);
      if (ogWhy) add(slug, "og", ogWhy);
      else if (
        !why &&
        isStr(m.cover.sha256) &&
        isStr(p.name) &&
        isStr(p.type) &&
        m.og.inputs !== inputsHash(m.cover.sha256, projectLines(p))
      ) {
        add(
          slug,
          "og",
          `stale, run: node scripts/media.mjs share --only=${p.slug}`,
        );
      }
    }

    if (Object.hasOwn(p, "gallery")) {
      if (!Array.isArray(p.gallery)) {
        add(slug, "gallery", "must be an array");
      } else {
        for (const [n, item] of p.gallery.entries()) {
          const at = `gallery[${n}]`;
          if (!isObj(item)) {
            add(slug, at, "not an object");
            continue;
          }
          for (const key of GALLERY_KEYS) {
            if (!Object.hasOwn(item, key))
              add(slug, `${at}.${key}`, "key missing");
          }
          if (
            Object.hasOwn(item, "kind") &&
            !GALLERY_KINDS.includes(item.kind)
          ) {
            add(slug, `${at}.kind`, "bad gallery kind");
          }
          for (const key of ["alt", "caption"]) {
            if (
              Object.hasOwn(item, key) &&
              item[key] !== null &&
              !isStr(item[key])
            ) {
              add(slug, `${at}.${key}`, "must be a string or null");
            }
          }
          if (Object.hasOwn(item, "media")) {
            const e = m?.gallery?.[item.media];
            if (!e) {
              add(
                slug,
                `${at}.media "${item.media}"`,
                "not in content/media.json",
              );
            } else {
              const why = entryProblem(e, p.slug);
              if (why) add(slug, `${at}.media "${item.media}"`, why);
            }
          }
        }
      }
    }
  }

  if (site) {
    const home = manifest?.site?.home;
    const why = entryProblem(home, "_site");
    const first = mp[projects[0]?.slug]?.cover;
    if (why) {
      errors.push(`[content] site.home: ${why}`);
    } else if (
      isStr(first?.sha256) &&
      home.inputs !==
        inputsHash(first.sha256, homeLines(site.name, site.description))
    ) {
      errors.push(
        "[content] site.home: stale, run: node scripts/media.mjs share --only=home",
      );
    }
  }

  const listed = new Set(projects.map((p) => p?.slug));
  for (const slug of Object.keys(mp)) {
    if (!listed.has(slug)) {
      add(
        slug,
        "(manifest)",
        "in content/media.json but not in the project list",
      );
    }
  }
  return errors;
}

export function validateContent(
  projects,
  manifest,
  { maxPlanes = 32, site = null } = {},
) {
  const errors = collect(projects, manifest, maxPlanes, site);
  if (errors.length) throw new Error(errors.join("\n"));
}

export function resolveContent(
  projects,
  manifest,
  { maxPlanes = 32, site = null } = {},
) {
  validateContent(projects, manifest, { maxPlanes, site });
  return projects.map((p) => {
    const m = manifest.projects[p.slug];
    return {
      slug: p.slug,
      name: p.name,
      type: p.type,
      year: p.year,
      liveUrl: p.liveUrl,
      updatedAt: p.updated,
      file: m.cover.url,
      og: { url: m.og.url, width: m.og.width, height: m.og.height },
      kind: p.kind,
      client: p.client,
      industry: p.industry,
      location: p.location,
      role: p.role,
      services: p.services,
      status: p.status,
      detail: {
        summary: p.summary,
        overview: p.overview,
        challenge: p.challenge,
        approach: p.approach,
        outcome: p.outcome,
        tools: p.tools,
        testimonial: p.testimonial,
        identity: p.identity,
        gallery: p.gallery.map((g) => {
          const e = m.gallery[g.media];
          return {
            file: e.url,
            alt: g.alt,
            kind: g.kind,
            caption: g.caption,
            width: e.width,
            height: e.height,
          };
        }),
      },
    };
  });
}
