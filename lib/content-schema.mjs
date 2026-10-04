/**
 * Content schema, validator and resolver. Pure: no app imports, no env, so the
 * fast gate (scripts/check-content.mjs) and the build run the same code.
 * Empty values (null, "", []) are allowed; a missing key is not (D-09, D-10).
 */

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
const goodEntry = (e) =>
  isObj(e) && isStr(e.url) && e.url.startsWith(MEDIA_PREFIX);

function collect(projects, manifest, maxPlanes) {
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
    for (const key of TEXT_KEYS) {
      if (Object.hasOwn(p, key) && p[key] !== null && !isStr(p[key])) {
        add(slug, key, "must be a string or null");
      }
    }
    if (Object.hasOwn(p, "updated")) {
      if (
        !isStr(p.updated) ||
        !p.updated ||
        Number.isNaN(Date.parse(p.updated))
      ) {
        add(slug, "updated", "must be a date string");
      }
    }
    if (Object.hasOwn(p, "kind") && !KINDS.includes(p.kind)) {
      add(slug, "kind", 'must be null, "client" or "own"');
    }
    if (Object.hasOwn(p, "status") && !STATUSES.includes(p.status)) {
      add(slug, "status", 'must be null, "live" or "pre-launch"');
    }
    for (const key of ["services", "tools"]) {
      if (Object.hasOwn(p, key) && !Array.isArray(p[key])) {
        add(slug, key, "must be an array");
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
    } else if (!goodEntry(m.cover)) {
      add(slug, "cover", `missing or not under ${MEDIA_PREFIX}`);
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
            if (!goodEntry(e)) {
              add(
                slug,
                `${at}.media "${item.media}"`,
                "not in content/media.json",
              );
            }
          }
        }
      }
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

export function validateContent(projects, manifest, { maxPlanes = 32 } = {}) {
  const errors = collect(projects, manifest, maxPlanes);
  if (errors.length) throw new Error(errors.join("\n"));
}

export function resolveContent(projects, manifest, { maxPlanes = 32 } = {}) {
  validateContent(projects, manifest, { maxPlanes });
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
