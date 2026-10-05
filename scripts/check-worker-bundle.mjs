/**
 * Deploy gate for the Worker bundle.
 *   node scripts/check-worker-bundle.mjs --preflight   before a build
 *   node scripts/check-worker-bundle.mjs               after opennextjs-cloudflare build
 * Exits 1 with "[bundle] <file>: <reason>" lines. Prints file and pattern
 * name only, never a matched value.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { root } from "./lib/load-env.mjs";
import { envFileDefaults, preflight, scanText } from "./lib/bundle-scan.mjs";

const BINARY = new Set([".wasm", ".png", ".jpg", ".webp", ".woff2", ".ico"]);

if (process.argv.includes("--preflight")) {
  const files = preflight(root);
  for (const file of files) {
    console.error(
      `[bundle] ${file} present: deploy builds run in a clean clone`,
    );
  }
  process.exit(files.length ? 1 : 0);
}

const nextEnv = join(root, ".open-next/cloudflare/next-env.mjs");
if (!existsSync(nextEnv)) {
  console.error("[bundle] .open-next/cloudflare/next-env.mjs missing");
  process.exit(1);
}

let failed = false;
if (envFileDefaults(readFileSync(nextEnv, "utf8")).length > 0) {
  console.error("[bundle] next-env.mjs carries values");
  failed = true;
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (!BINARY.has(extname(entry.name))) yield path;
  }
}

for (const file of walk(join(root, ".open-next"))) {
  for (const name of scanText(readFileSync(file, "utf8"))) {
    console.error(`[bundle] ${relative(root, file)}: ${name}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.info("[bundle] clean");
