/**
 * Generates the ring art (and optionally a detail-page loop) for each project
 * with Higgsfield, then uploads the results to R2.
 *
 * This runs at authoring time and never from the app. A generation is tens of
 * seconds and costs credits, so a visitor must never be able to trigger one.
 *
 * The manifest is the gate: anything already recorded there is skipped unless
 * --force is passed. Credits are money, so the default is never to repeat work.
 *
 *   node scripts/generate-project-media.mjs --check
 *   node scripts/generate-project-media.mjs --dry-run
 *   node scripts/generate-project-media.mjs --only=volt
 *   node scripts/generate-project-media.mjs --direction=chrome --limit=3
 *   node scripts/generate-project-media.mjs --video --only=volt
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import sharp from "sharp";

import {
  buildImagePrompt,
  buildVideoPrompt,
  DIRECTION_KEYS,
} from "./lib/art-direction.mjs";
import {
  download,
  generate,
  hasCredentials,
  imageInput,
  IMAGE_ENDPOINT,
  videoInput,
  VIDEO_ENDPOINT,
} from "./lib/higgsfield.mjs";
import { loadEnv, root, sleep } from "./lib/load-env.mjs";
import {
  headObject,
  isR2Configured,
  publicUrl,
  putObject,
  r2Config,
} from "./lib/r2.mjs";

const MANIFEST = join(root, "scripts", "media-manifest.json");
const IMMUTABLE = "public, max-age=31536000, immutable";

// atlas.js packs 512-wide cells at cellW / 1.5. Generate and store at that
// ratio so the atlas cover-fit crops nothing.
const CELL = { width: 512, height: 341 };
const COVER = { width: 1536, height: 1024 };

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback = "") => {
  const hit = args.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const direction = value("direction", "concrete");
const only = value("only")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const limit = Number(value("limit", "0")) || 0;
const wantVideo = flag("video");
const force = flag("force");
const dryRun = flag("dry-run");

if (!DIRECTION_KEYS.includes(direction)) {
  console.error(
    `--direction must be one of: ${DIRECTION_KEYS.join(", ")} (got "${direction}")`,
  );
  process.exit(1);
}

const env = loadEnv();
const r2 = r2Config(env);

function readManifest() {
  try {
    return JSON.parse(readFileSync(MANIFEST, "utf8"));
  } catch {
    return { version: 1, entries: {} };
  }
}

function writeManifest(manifest) {
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}

const sha8 = (buffer) =>
  createHash("sha256").update(buffer).digest("hex").slice(0, 8);

/** PUT a throwaway object and read it back, to prove credentials and bucket. */
async function check() {
  if (!isR2Configured(r2)) {
    console.error(
      "R2 is not configured. Need R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.",
    );
    process.exit(1);
  }
  const key = `_healthcheck/${Date.now()}.txt`;
  const body = Buffer.from("ok\n");
  await putObject(r2, key, body, "text/plain", { cacheControl: "no-store" });
  const head = await headObject(r2, key);
  console.log(`r2 put ok      bucket=${r2.bucket} key=${key}`);
  console.log(`r2 head ok     size=${head?.size ?? "?"}`);
  if (r2.publicBase) {
    const url = publicUrl(r2, key);
    const response = await fetch(url);
    console.log(
      `public ${response.ok ? "ok" : `FAILED ${response.status}`}   ${url}`,
    );
    if (!response.ok) {
      console.log(
        "  A 401/404 here means the bucket has no public custom domain yet,",
      );
      console.log("  or R2_PUBLIC_BASE does not match it.");
    }
  } else {
    console.log("public skipped  R2_PUBLIC_BASE not set");
  }
}

async function uploadImage(slug, bytes) {
  const [cell, cover] = await Promise.all([
    sharp(bytes)
      .resize(CELL.width, CELL.height, { fit: "cover", position: "centre" })
      .webp({ quality: 82 })
      .toBuffer(),
    sharp(bytes)
      .resize(COVER.width, COVER.height, { fit: "cover", position: "centre" })
      .webp({ quality: 82 })
      .toBuffer(),
  ]);

  const out = {};
  for (const [name, buffer] of [
    ["cell", cell],
    ["cover", cover],
  ]) {
    const key = `projects/${slug}/${name}-${sha8(buffer)}.webp`;
    if (dryRun) {
      out[name] = { key, url: publicUrl(r2, key), bytes: buffer.length };
      continue;
    }
    const put = await putObject(r2, key, buffer, "image/webp", {
      cacheControl: IMMUTABLE,
    });
    out[name] = { ...put, bytes: buffer.length };
  }
  return out;
}

async function uploadVideo(slug, bytes) {
  const key = `projects/${slug}/loop-${sha8(bytes)}.mp4`;
  if (dryRun) return { key, url: publicUrl(r2, key), bytes: bytes.length };
  const put = await putObject(r2, key, bytes, "video/mp4", {
    cacheControl: IMMUTABLE,
  });
  return { ...put, bytes: bytes.length };
}

if (flag("check")) {
  await check();
  process.exit(0);
}

const imageEndpoint = value(
  "image-endpoint",
  env.HIGGSFIELD_IMAGE_ENDPOINT || IMAGE_ENDPOINT,
);
const videoEndpoint = value(
  "video-endpoint",
  env.HIGGSFIELD_VIDEO_ENDPOINT || VIDEO_ENDPOINT,
);

// Overrides for the typed defaults (size, quality, DoP model, motions). Kept in
// env so trying another model needs no code change.
function extraParams(name) {
  const raw = String(env[name] || "").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    console.error(`${name} is not valid JSON`);
    process.exit(1);
  }
}
const imageParams = extraParams("HIGGSFIELD_IMAGE_PARAMS");
const videoParams = extraParams("HIGGSFIELD_VIDEO_PARAMS");

if (!dryRun) {
  if (!hasCredentials(env)) {
    console.error(
      "No Higgsfield credentials. Set HF_CREDENTIALS=id:secret (or the two halves) in .env.local.",
    );
    console.error("Create a key pair at https://console.higgsfield.ai");
    process.exit(1);
  }
  if (!isR2Configured(r2)) {
    console.error(
      "Missing R2 config. Run with --dry-run to preview, or --check once R2 is set.",
    );
    process.exit(1);
  }
}

const { PROJECTS } = await import(
  pathToFileURL(join(root, "components/ring/projects.js")).href
);

const manifest = readManifest();
let done = 0;
let skipped = 0;
let failed = 0;

for (const [index, project] of PROJECTS.entries()) {
  if (only.length && !only.includes(project.slug)) continue;
  if (limit && done >= limit) break;

  const entry = manifest.entries[project.slug] || {};
  const needImage = force || !entry.image;
  const needVideo = wantVideo && (force || !entry.video);
  if (!needImage && !needVideo) {
    skipped += 1;
    continue;
  }

  const label = `${String(index + 1).padStart(2, "0")} ${project.name}`;

  try {
    if (needImage) {
      const prompt = buildImagePrompt(project, index, direction);
      if (dryRun) {
        console.log(`\n${label}\n  ${prompt}`);
        entry.image = { prompt, direction, dryRun: true };
      } else {
        console.log(`${label} generating image...`);
        const { requestId, urls } = await generate(
          imageEndpoint,
          imageInput(prompt, imageParams),
          env,
        );
        const bytes = await download(urls[0]);
        const uploaded = await uploadImage(project.slug, bytes);
        entry.image = {
          direction,
          prompt,
          endpoint: imageEndpoint,
          requestId,
          source: urls[0],
          cell: uploaded.cell,
          cover: uploaded.cover,
          at: new Date().toISOString(),
        };
        console.log(
          `${label} image -> ${uploaded.cell.key} (${Math.round(uploaded.cell.bytes / 1024)} KB cell, ${Math.round(uploaded.cover.bytes / 1024)} KB cover)`,
        );
      }
    }

    if (needVideo) {
      const prompt = buildVideoPrompt(direction);
      if (dryRun) {
        console.log(`  video: ${prompt}`);
        entry.video = { prompt, direction, dryRun: true };
      } else {
        // Seed the video from the still that is already on the card, so the
        // loop and the ring art are the same picture.
        const start = entry.image?.cover?.url;
        if (!start) throw new Error("no cover url to seed the video from");
        console.log(`${label} generating video...`);
        const { requestId, urls } = await generate(
          videoEndpoint,
          videoInput(prompt, start, videoParams),
          env,
        );
        const bytes = await download(urls[0]);
        const uploaded = await uploadVideo(project.slug, bytes);
        entry.video = {
          direction,
          prompt,
          endpoint: videoEndpoint,
          requestId,
          source: urls[0],
          ...uploaded,
          at: new Date().toISOString(),
        };
        console.log(
          `${label} video -> ${uploaded.key} (${Math.round(uploaded.bytes / 1024)} KB)`,
        );
      }
    }

    manifest.entries[project.slug] = entry;
    if (!dryRun) writeManifest(manifest);
    done += 1;
    if (!dryRun) await sleep(500);
  } catch (error) {
    failed += 1;
    console.error(`${label} FAILED ${error.message || error}`);
  }
}

if (dryRun) {
  console.log(
    `\ndry run: ${done} would generate, ${skipped} already in manifest`,
  );
} else {
  writeManifest(manifest);
  console.log(`done generated=${done} skipped=${skipped} failed=${failed}`);
  console.log(`manifest ${MANIFEST}`);
}
if (failed) process.exit(1);
