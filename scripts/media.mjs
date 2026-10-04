/**
 * The only writer of R2 objects under projects/ and of content/media.json.
 *
 * This runs at authoring time and never from the app. The manifest is the
 * gate: a slot already recorded there is skipped unless --force is passed,
 * because generations cost credits and imports must not rewrite anything.
 *
 *   node scripts/media.mjs check
 *   node scripts/media.mjs import-live [--force] [--only=slug,...] [--dry-run]
 *   node scripts/media.mjs verify
 *   node scripts/media.mjs generate [--dry-run] [--force] [--only=slug]
 *       [--limit=3] [--direction=chrome] [--video] [--probe]
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
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
  deleteObject,
  headObject,
  isR2Configured,
  publicUrl,
  putObject,
  r2Config,
} from "./lib/r2.mjs";

const IMMUTABLE = "public, max-age=31536000, immutable";
const HOST = "https://media.koussay.online";
const SITE = "https://koussay.online";
const MANIFEST = join(root, "content", "media.json");
const WORK = join(root, "media-work");
const COVER = { width: 1536, height: 1024 };

const args = process.argv.slice(2);
const command = args.find((arg) => !arg.startsWith("--"));
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback = "") => {
  const hit = args.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const only = value("only")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const force = flag("force");
const dryRun = flag("dry-run");

const USAGE = [
  "usage: node scripts/media.mjs <command>",
  "  check",
  "  import-live [--force] [--only=slug,...] [--dry-run]",
  "  verify",
  "  generate [--dry-run] [--force] [--only=slug] [--limit=n] [--direction=key] [--video] [--probe]",
].join("\n");

if (!["check", "import-live", "verify", "generate"].includes(command)) {
  console.error(USAGE);
  process.exit(1);
}

const env = loadEnv();
const r2 = r2Config(env);

const needsR2 = !(command === "generate" && dryRun);
if (needsR2) {
  if (!isR2Configured(r2)) {
    console.error(
      "[media] R2 is not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET)",
    );
    process.exit(1);
  }
  if (!publicUrl(r2, "x").startsWith(`${HOST}/`)) {
    console.error(`[media] R2_PUBLIC_BASE must be ${HOST}`);
    process.exit(1);
  }
}

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

function sortDeep(node) {
  if (Array.isArray(node)) return node.map(sortDeep);
  if (node && typeof node === "object") {
    return Object.fromEntries(
      Object.keys(node)
        .sort()
        .map((key) => [key, sortDeep(node[key])]),
    );
  }
  return node;
}

/** Start empty only when the file is absent; anything else must fail loudly. */
function readManifest() {
  if (!existsSync(MANIFEST)) return { host: HOST, projects: {} };
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  } catch (error) {
    console.error(`[media] content/media.json unreadable: ${error.message}`);
    process.exit(1);
  }
  if (
    !manifest ||
    typeof manifest !== "object" ||
    !manifest.projects ||
    typeof manifest.projects !== "object"
  ) {
    console.error("[media] content/media.json has no projects object");
    process.exit(1);
  }
  return manifest;
}

function writeManifest(manifest) {
  mkdirSync(join(root, "content"), { recursive: true });
  const tmp = `${MANIFEST}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(sortDeep(manifest), null, 2)}\n`);
  renameSync(tmp, MANIFEST);
}

function projectRecord(manifest, slug) {
  manifest.projects[slug] ||= { gallery: {} };
  manifest.projects[slug].gallery ||= {};
  return manifest.projects[slug];
}

function appendProvenance(slug, record) {
  const dir = join(WORK, slug);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "provenance.json");
  let list = [];
  if (existsSync(file)) {
    try {
      list = JSON.parse(readFileSync(file, "utf8"));
    } catch (error) {
      console.error(`[media] ${file} unreadable: ${error.message}`);
      process.exit(1);
    }
  }
  list.push(record);
  writeFileSync(file, `${JSON.stringify(list, null, 2)}\n`);
}

async function getPublic(url, origin) {
  const response = await fetch(url, {
    headers: origin ? { Origin: origin } : {},
    signal: AbortSignal.timeout(20000),
  });
  const body = Buffer.from(await response.arrayBuffer());
  return { response, body };
}

/** Header and body checks shared by import-live and verify. Returns problems. */
function checkPublic({ response, body }, expectedSha) {
  const problems = [];
  if (response.status !== 200) problems.push(`status ${response.status}`);
  if (response.headers.get("content-type") !== "image/webp") {
    problems.push(`content-type ${response.headers.get("content-type")}`);
  }
  if (response.headers.get("cache-control") !== IMMUTABLE) {
    problems.push(`cache-control ${response.headers.get("cache-control")}`);
  }
  if (response.headers.get("access-control-allow-origin") !== "*") {
    problems.push(
      `acao ${response.headers.get("access-control-allow-origin")}`,
    );
  }
  if (sha256(body) !== expectedSha) problems.push("sha256 mismatch");
  return problems;
}

/** Put a throwaway object, read it back through the public host, remove it. */
async function check() {
  const key = `_healthcheck/${Date.now()}.txt`;
  try {
    await putObject(r2, key, Buffer.from("ok\n"), "text/plain", {
      cacheControl: "no-store",
    });
    const head = await headObject(r2, key);
    console.log(`r2 put ok      key=${key}`);
    console.log(`r2 head ok     size=${head?.size ?? "?"}`);
    const url = publicUrl(r2, key);
    const plain = await getPublic(url);
    console.log(
      plain.response.ok && plain.body.toString() === "ok\n"
        ? "public ok"
        : `public FAILED ${plain.response.status}`,
    );
    console.log(
      `acao (no Origin): ${plain.response.headers.get("access-control-allow-origin")}`,
    );
    const withOrigin = await getPublic(url, SITE);
    console.log(
      `acao (Origin): ${withOrigin.response.headers.get("access-control-allow-origin")}`,
    );
  } finally {
    // Cleanup must log, never replace the error that got us here.
    try {
      await deleteObject(r2, key);
      console.log(
        (await headObject(r2, key)) === null
          ? "cleanup ok"
          : "cleanup FAILED object still present",
      );
    } catch (error) {
      console.error(`cleanup FAILED ${error.message || error}`);
    }
  }
}

async function importLive() {
  const snapshotPath = value(
    "snapshot",
    join(
      root,
      ".planning/phases/02-projects-served-from-the-repo/snapshot/live-2026-10-04.json",
    ),
  );
  const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
  const manifest = readManifest();
  manifest.host = HOST;
  let failed = 0;

  for (const { slug, slot, from } of snapshot.media) {
    if (only.length && !only.includes(slug)) continue;
    const label = `${slug}/${slot}`;
    const record = projectRecord(manifest, slug);
    const recorded = slot === "cover" ? record.cover : record.gallery[slot];
    if (recorded && !force) {
      console.log(`skip ${label}`);
      continue;
    }
    try {
      const source = new URL(from, SITE);
      if (source.host !== "koussay.online") {
        throw new Error(`refusing host ${source.host}`);
      }
      const live = await fetch(source, {
        signal: AbortSignal.timeout(30000),
      });
      if (live.status !== 200) throw new Error(`live ${live.status}`);
      if (!(live.headers.get("content-type") || "").includes("image/webp")) {
        throw new Error(
          `live content-type ${live.headers.get("content-type")}`,
        );
      }
      const buffer = Buffer.from(await live.arrayBuffer());
      const hash = sha256(buffer);
      const at = new Date().toISOString();

      // Raw bytes and provenance reach disk before anything is uploaded.
      mkdirSync(join(WORK, slug), { recursive: true });
      writeFileSync(join(WORK, slug, `${slot}.webp`), buffer);
      appendProvenance(slug, {
        slot,
        from: source.href,
        at,
        bytes: buffer.length,
        sha256: hash,
      });

      const { width, height } = await sharp(buffer).metadata();
      const key = `projects/${slug}/${slot}-${hash.slice(0, 8)}.webp`;
      if (dryRun) {
        console.log(`dry ${key}`);
        continue;
      }

      await putObject(r2, key, buffer, "image/webp", {
        cacheControl: IMMUTABLE,
      });
      const head = await headObject(r2, key);
      if (head?.size !== buffer.length) {
        throw new Error(`head size ${head?.size} != ${buffer.length}`);
      }
      const url = publicUrl(r2, key);
      const got = await getPublic(url);
      const problems = checkPublic(got, hash);
      if (problems.length) throw new Error(problems.join(", "));

      const entry = {
        key,
        url,
        type: "image/webp",
        width,
        height,
        bytes: buffer.length,
        sha256: hash,
        origin: { kind: "snapshot", from: source.href, at },
      };
      if (slot === "cover") record.cover = entry;
      else record.gallery[slot] = entry;
      writeManifest(manifest);
      console.log(`ok ${label} ${got.response.headers.get("cf-cache-status")}`);
    } catch (error) {
      failed += 1;
      console.error(`[media] ${label}: ${error.message || error}`);
    }
  }
  if (failed) process.exit(1);
}

async function verify() {
  const manifest = readManifest();
  const entries = [];
  for (const [slug, record] of Object.entries(manifest.projects)) {
    if (record.cover) entries.push([`${slug}/cover`, record.cover]);
    for (const [slot, entry] of Object.entries(record.gallery || {})) {
      entries.push([`${slug}/${slot}`, entry]);
    }
  }
  let bad = 0;
  for (const [label, entry] of entries) {
    const problems = [];
    if (!entry.url.startsWith(`${HOST}/projects/`)) problems.push("url host");
    try {
      for (const origin of [undefined, SITE]) {
        const got = await getPublic(entry.url, origin);
        const acao = got.response.headers.get("access-control-allow-origin");
        for (const p of checkPublic(got, entry.sha256)) {
          problems.push(`${origin ? "origin " : ""}${p}`);
        }
        if (acao && acao.includes(",")) problems.push("duplicate acao");
      }
      const head = await headObject(r2, entry.key);
      if (head?.size !== entry.bytes) problems.push("head size");
    } catch (error) {
      problems.push(error.message || String(error));
    }
    if (problems.length) {
      bad += 1;
      console.error(`FAIL ${label}: ${problems.join(", ")}`);
    }
  }
  console.log(
    `verify ${bad ? "FAILED" : "ok"} ${entries.length - bad}/${entries.length}`,
  );
  if (bad) process.exit(1);
}

/** Higgsfield generation. Credits are money: never run without --dry-run first. */
async function generateMedia() {
  const direction = value("direction", "concrete");
  if (!DIRECTION_KEYS.includes(direction)) {
    console.error(`--direction must be one of: ${DIRECTION_KEYS.join(", ")}`);
    process.exit(1);
  }
  const limit = Number(value("limit", "0")) || 0;
  const imageEndpoint = value(
    "image-endpoint",
    env.HIGGSFIELD_IMAGE_ENDPOINT || IMAGE_ENDPOINT,
  );
  const videoEndpoint = value(
    "video-endpoint",
    env.HIGGSFIELD_VIDEO_ENDPOINT || VIDEO_ENDPOINT,
  );
  const extra = (name) => {
    const raw = String(env[name] || "").trim();
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      console.error(`${name} is not valid JSON`);
      process.exit(1);
    }
  };
  const imageParams = extra("HIGGSFIELD_IMAGE_PARAMS");
  const videoParams = extra("HIGGSFIELD_VIDEO_PARAMS");

  if (!dryRun && !hasCredentials(env)) {
    console.error(
      "No Higgsfield credentials. Set HF_CREDENTIALS=id:secret in .env.local.",
    );
    process.exit(1);
  }
  const indexFile = join(root, "content", "projects", "index.mjs");
  if (!existsSync(indexFile)) {
    console.error("[media] content/projects/index.mjs missing");
    process.exit(1);
  }
  const { PROJECTS_IN_ORDER } = await import(pathToFileURL(indexFile).href);

  if (flag("probe")) {
    const list = PROJECTS_IN_ORDER;
    const slug = only[0] || list[0].slug;
    const index = list.findIndex((item) => item.slug === slug);
    if (index === -1) {
      console.error(`no project with slug "${slug}"`);
      process.exit(1);
    }
    const prompt = buildImagePrompt(list[index], index, direction);
    console.log(prompt);
    const { requestId, urls } = await generate(
      imageEndpoint,
      imageInput(prompt, { quality: "720p", ...imageParams }),
      env,
    );
    const bytes = await download(urls[0]);
    const dir = join(root, ".media-probe");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${slug}-${direction}.png`), bytes);
    console.log(`request ${requestId}; nothing uploaded, manifest untouched`);
    return;
  }

  const manifest = readManifest();
  let done = 0;
  let failed = 0;
  for (const [index, project] of PROJECTS_IN_ORDER.entries()) {
    if (only.length && !only.includes(project.slug)) continue;
    if (limit && done >= limit) break;
    const record = projectRecord(manifest, project.slug);
    const needImage = force || !record.cover;
    const needVideo = flag("video") && (force || !record.loop);
    if (!needImage && !needVideo) continue;
    const label = `${String(index + 1).padStart(2, "0")} ${project.name}`;
    try {
      if (needImage) {
        const prompt = buildImagePrompt(project, index, direction);
        if (dryRun) {
          console.log(`${label}\n  ${prompt}`);
        } else {
          const { requestId, urls } = await generate(
            imageEndpoint,
            imageInput(prompt, imageParams),
            env,
          );
          const bytes = await download(urls[0]);
          const rawPath = join(WORK, project.slug, "generated-cover.bin");
          mkdirSync(join(WORK, project.slug), { recursive: true });
          writeFileSync(rawPath, bytes);
          appendProvenance(project.slug, {
            slot: "cover",
            requestId,
            endpoint: imageEndpoint,
            prompt,
            raw: rawPath,
            at: new Date().toISOString(),
          });
          const buffer = await sharp(bytes)
            .resize(COVER.width, COVER.height, { fit: "cover" })
            .webp({ quality: 82 })
            .toBuffer();
          const hash = sha256(buffer);
          const key = `projects/${project.slug}/cover-${hash.slice(0, 8)}.webp`;
          await putObject(r2, key, buffer, "image/webp", {
            cacheControl: IMMUTABLE,
          });
          if ((await headObject(r2, key))?.size !== buffer.length) {
            throw new Error("head size mismatch");
          }
          record.cover = {
            key,
            url: publicUrl(r2, key),
            type: "image/webp",
            width: COVER.width,
            height: COVER.height,
            bytes: buffer.length,
            sha256: hash,
            origin: {
              kind: "higgsfield",
              requestId,
              endpoint: imageEndpoint,
              prompt,
              raw: rawPath,
            },
          };
          writeManifest(manifest);
          console.log(`ok ${label} -> ${key}`);
        }
      }
      if (needVideo) {
        const prompt = buildVideoPrompt(direction);
        if (dryRun) {
          console.log(`  video: ${prompt}`);
        } else {
          if (!record.cover) throw new Error("no cover to seed the video");
          const { requestId, urls } = await generate(
            videoEndpoint,
            videoInput(prompt, record.cover.url, videoParams),
            env,
          );
          const bytes = await download(urls[0]);
          const rawPath = join(WORK, project.slug, "generated-loop.mp4");
          mkdirSync(join(WORK, project.slug), { recursive: true });
          writeFileSync(rawPath, bytes);
          appendProvenance(project.slug, {
            slot: "loop",
            requestId,
            endpoint: videoEndpoint,
            prompt,
            raw: rawPath,
            at: new Date().toISOString(),
          });
          const hash = sha256(bytes);
          const key = `projects/${project.slug}/loop-${hash.slice(0, 8)}.mp4`;
          await putObject(r2, key, bytes, "video/mp4", {
            cacheControl: IMMUTABLE,
          });
          record.loop = {
            key,
            url: publicUrl(r2, key),
            type: "video/mp4",
            bytes: bytes.length,
            sha256: hash,
            origin: {
              kind: "higgsfield",
              requestId,
              endpoint: videoEndpoint,
              prompt,
              raw: rawPath,
            },
          };
          writeManifest(manifest);
          console.log(`ok ${label} loop -> ${key}`);
        }
      }
      done += 1;
      if (!dryRun) await sleep(500);
    } catch (error) {
      failed += 1;
      console.error(`[media] ${label}: ${error.message || error}`);
    }
  }
  if (failed) process.exit(1);
}

if (command === "check") await check();
else if (command === "import-live") await importLive();
else if (command === "verify") await verify();
else await generateMedia();
