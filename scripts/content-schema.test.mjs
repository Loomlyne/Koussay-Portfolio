import test from "node:test";
import assert from "node:assert/strict";
import {
  SCHEMA_KEYS,
  validateContent,
  resolveContent,
} from "../lib/content-schema.mjs";

const HOST = "https://media.koussay.online/projects";
const entry = (slug, slot) => ({
  url: `${HOST}/${slug}/${slot}-abcd1234.webp`,
  width: 1600,
  height: 900,
});

const project = (slug, extra = {}) => ({
  slug,
  name: slug.toUpperCase(),
  updated: "2026-09-14T11:45:00.000Z",
  type: "Brand & Web",
  kind: null,
  client: null,
  industry: null,
  location: null,
  year: "2026",
  role: null,
  services: [],
  status: null,
  liveUrl: "https://www.example.com",
  summary: "s",
  overview: "o",
  challenge: "c",
  approach: null,
  outcome: "out",
  tools: ["Framer"],
  testimonial: null,
  identity: null,
  gallery: [],
  ...extra,
});

const fixture = () => ({
  projects: [
    project("alpha", {
      gallery: [{ media: "p01", alt: "a", kind: "identity", caption: null }],
    }),
    project("beta"),
  ],
  manifest: {
    projects: {
      alpha: {
        cover: entry("alpha", "cover"),
        gallery: { p01: entry("alpha", "p01") },
      },
      beta: { cover: entry("beta", "cover"), gallery: {} },
    },
  },
});

const opts = { maxPlanes: 32 };
const msg = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.message;
  }
  return "";
};

test("schema has 22 keys", () => {
  assert.equal(SCHEMA_KEYS.length, 22);
});

test("valid fixture resolves to the ring shape", () => {
  const { projects, manifest } = fixture();
  const out = resolveContent(projects, manifest, opts);
  assert.equal(out.length, 2);
  assert.equal(out[0].file, manifest.projects.alpha.cover.url);
  assert.equal(out[0].updatedAt, "2026-09-14T11:45:00.000Z");
  const g = out[0].detail.gallery[0];
  assert.equal(g.file, manifest.projects.alpha.gallery.p01.url);
  assert.equal(g.width, 1600);
  assert.equal(g.height, 900);
});

test("missing key names slug and field", () => {
  const { projects, manifest } = fixture();
  delete projects[0].approach;
  assert.match(
    msg(() => validateContent(projects, manifest, opts)),
    /^\[content\] alpha\.approach: key missing$/m,
  );
});

test("empty values pass", () => {
  const { projects, manifest } = fixture();
  assert.doesNotThrow(() => validateContent(projects, manifest, opts));
});

test("bad status and gallery kind are named", () => {
  const { projects, manifest } = fixture();
  projects[0].status = "done";
  projects[0].gallery[0].kind = "pdf";
  const m = msg(() => validateContent(projects, manifest, opts));
  assert.match(m, /alpha\.status/);
  assert.match(m, /alpha\.gallery\[0\]\.kind/);
});

test("gallery media absent from manifest is named", () => {
  const { projects, manifest } = fixture();
  projects[0].gallery[0].media = "nope";
  assert.match(
    msg(() => validateContent(projects, manifest, opts)),
    /alpha\.gallery\[0\]\.media "nope": not in content\/media\.json/,
  );
});

test("manifest slug missing from list, and the reverse", () => {
  const a = fixture();
  a.manifest.projects.gamma = { cover: entry("gamma", "cover"), gallery: {} };
  assert.match(
    msg(() => validateContent(a.projects, a.manifest, opts)),
    /gamma/,
  );
  const b = fixture();
  delete b.manifest.projects.beta;
  assert.match(
    msg(() => validateContent(b.projects, b.manifest, opts)),
    /beta/,
  );
});

test("cover on another host is rejected", () => {
  const { projects, manifest } = fixture();
  manifest.projects.beta.cover.url = "https://x.r2.dev/beta/cover.webp";
  assert.match(
    msg(() => validateContent(projects, manifest, opts)),
    /beta\.cover/,
  );
});

test("duplicate slugs and too many projects throw", () => {
  const { projects, manifest } = fixture();
  projects[1] = project("alpha");
  assert.match(
    msg(() => validateContent(projects, manifest, opts)),
    /duplicate/,
  );
  const f = fixture();
  assert.match(
    msg(() => validateContent(f.projects, f.manifest, { maxPlanes: 1 })),
    /more than 1|maxPlanes|at most 1/,
  );
});

test("two problems are reported together", () => {
  const { projects, manifest } = fixture();
  delete projects[0].approach;
  projects[1].status = "done";
  const m = msg(() => validateContent(projects, manifest, opts));
  assert.equal(m.split("\n").length, 2);
});
