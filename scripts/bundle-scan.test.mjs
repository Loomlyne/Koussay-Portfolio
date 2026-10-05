import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { scanText, envFileDefaults, preflight } from "./lib/bundle-scan.mjs";

// Key-shaped strings are built at runtime so this file holds no literal key.
const rep = (ch, n) => ch.repeat(n);
const shapes = {
  resend: ["re", "_", rep("a", 8), "_", rep("B", 20)].join(""),
  notion: ["nt", "n_", rep("c", 44)].join(""),
  openai: ["sk", "-", rep("d", 30)].join(""),
  google: ["AI", "za", rep("e", 35)].join(""),
  firecrawl: ["fc", "-", rep("a1", 16)].join(""),
};

test("scanText names the pattern for each key shape", () => {
  for (const [name, value] of Object.entries(shapes)) {
    const hits = scanText(`var x = "${value}";`);
    assert.ok(hits.length > 0, `${name} not detected`);
    assert.ok(!hits.join(" ").includes(value), "a value was returned");
  }
});

test("scanText ignores minified code", () => {
  assert.deepEqual(scanText("function a(){return re_match(x)}.fc-row{}"), []);
  assert.deepEqual(scanText("task-queue sk-learn"), []);
});

test("envFileDefaults sees only values inside the exported objects", () => {
  assert.deepEqual(
    envFileDefaults(
      "export const production = {}; export const development = {}; export const test = {};",
    ),
    [],
  );
  const baked = `export const production = {RESEND_API_KEY: "x"}; export const development = {}; export const test = {};`;
  assert.deepEqual(envFileDefaults(baked), ["RESEND_API_KEY"]);
});

test("preflight lists forbidden env files and ignores .env.example", () => {
  const dir = mkdtempSync(join(tmpdir(), "bundle-"));
  for (const f of [
    ".env",
    ".env.local",
    ".env.production.local",
    ".dev.vars",
    ".env.example",
  ]) {
    writeFileSync(join(dir, f), "");
  }
  assert.deepEqual(preflight(dir).sort(), [
    ".dev.vars",
    ".env",
    ".env.local",
    ".env.production.local",
  ]);
});
