/**
 * The only writer of R2 objects under projects/ and of content/media.json.
 *
 * This runs at authoring time and never from the app. The manifest is the
 * gate: a slot already recorded there is skipped unless --force is passed,
 * because generations cost credits and imports must not rewrite anything.
 *
 *   node scripts/media.mjs check
 *   node scripts/media.mjs verify
 *   node scripts/media.mjs generate [--dry-run] [--force] [--only=slug]
 *       [--limit=3] [--direction=chrome] [--video] [--probe]
 *   node scripts/media.mjs share [--preview] [--booking] [--only=slug,...|home]
 *       [--force] [--dry-run] [--labels=slug:Label,...]
 *     (no --preview/--booking: render, upload og cards to R2, record them)
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
import { homeLines, inputsHash, OWNER, projectLines } from "../lib/share.mjs";
import { SITE_DESCRIPTION, SITE_MARK_ALT, SITE_NAME } from "../lib/site.js";
import { renderBooking, renderCard } from "./lib/share.mjs";
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
const preview = flag("preview");
const booking = flag("booking");
const labels = value("labels");

const USAGE = [
  "usage: node scripts/media.mjs <command>",
  "  check",
  "  verify",
  "  generate [--dry-run] [--force] [--only=slug] [--limit=n] [--direction=key] [--video] [--probe]",
  "  share [--preview] [--booking] [--only=slug,...] [--force] [--dry-run] [--labels=slug:Label,...]",
].join("\n");

if (!["check", "verify", "generate", "share"].includes(command)) {
  console.error(USAGE);
  process.exit(1);
}

if (labels && !preview) {
  console.error("[media] --labels is preview-only (D-03)");
  process.exit(1);
}

const env = loadEnv();
const r2 = r2Config(env);

const needsR2 =
  !(command === "generate" && dryRun) &&
  !(command === "share" && (preview || booking || dryRun));
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

/** Header and body checks shared by share, generate and verify. Returns problems. */
function checkPublic(
  { response, body },
  expectedSha,
  contentType = "image/webp",
) {
  const problems = [];
  if (response.status !== 200) problems.push(`status ${response.status}`);
  if (response.headers.get("content-type") !== contentType) {
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
  const failures = [];
  try {
    await putObject(r2, key, Buffer.from("ok\n"), "text/plain", {
      cacheControl: "no-store",
    });
    const head = await headObject(r2, key);
    console.log(`r2 put ok      key=${key}`);
    console.log(`r2 head ok     size=${head?.size ?? "?"}`);
    const url = publicUrl(r2, key);
    const plain = await getPublic(url);
    const publicOk =
      plain.response.status === 200 && plain.body.toString() === "ok\n";
    console.log(
      publicOk ? "public ok" : `public FAILED ${plain.response.status}`,
    );
    if (!publicOk) failures.push(`public read ${plain.response.status}`);
    const acao = plain.response.headers.get("access-control-allow-origin");
    console.log(`acao (no Origin): ${acao}`);
    if (acao !== "*") failures.push(`acao without Origin: ${acao}`);
    const withOrigin = await getPublic(url, SITE);
    const acaoOrigin = withOrigin.response.headers.get(
      "access-control-allow-origin",
    );
    console.log(`acao (Origin): ${acaoOrigin}`);
    if (acaoOrigin !== "*") failures.push(`acao with Origin: ${acaoOrigin}`);
  } catch (error) {
    failures.push(error.message || String(error));
    console.error(`[media] check: ${error.message || error}`);
  } finally {
    // Cleanup must log, never replace the error that got us here.
    try {
      await deleteObject(r2, key);
      if ((await headObject(r2, key)) === null) {
        console.log("cleanup ok");
      } else {
        console.log("cleanup FAILED object still present");
        failures.push("object still present after cleanup");
      }
    } catch (error) {
      console.error(`cleanup FAILED ${error.message || error}`);
      failures.push(`cleanup: ${error.message || error}`);
    }
  }
  if (failures.length) {
    console.error(`check FAILED: ${failures.join("; ")}`);
    process.exit(1);
  }
  console.log("check ok");
}

async function verify() {
  const manifest = readManifest();
  const entries = [];
  for (const [slug, record] of Object.entries(manifest.projects)) {
    if (record.cover) entries.push([`${slug}/cover`, record.cover]);
    for (const [slot, entry] of Object.entries(record.gallery || {})) {
      entries.push([`${slug}/${slot}`, entry]);
    }
    if (record.og) entries.push([`${slug}/og`, record.og]);
  }
  if (manifest.site?.home) entries.push(["site/home", manifest.site.home]);
  let bad = 0;
  for (const [label, entry] of entries) {
    const problems = [];
    if (!entry.url.startsWith(`${HOST}/projects/`)) problems.push("url host");
    try {
      for (const origin of [undefined, SITE]) {
        const got = await getPublic(entry.url, origin);
        const acao = got.response.headers.get("access-control-allow-origin");
        for (const p of checkPublic(got, entry.sha256, entry.type)) {
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
          const coverUrl = publicUrl(r2, key);
          const coverProblems = checkPublic(await getPublic(coverUrl), hash);
          if (coverProblems.length) throw new Error(coverProblems.join(", "));
          record.cover = {
            key,
            url: coverUrl,
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
          if ((await headObject(r2, key))?.size !== bytes.length) {
            throw new Error("loop head size mismatch");
          }
          const loopUrl = publicUrl(r2, key);
          const loopProblems = checkPublic(
            await getPublic(loopUrl),
            hash,
            "video/mp4",
          );
          if (loopProblems.length) throw new Error(loopProblems.join(", "));
          record.loop = {
            key,
            url: loopUrl,
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

/** Cover bytes come only from the public media host and must match the manifest. */
async function fetchCover(slug, cover) {
  if (new URL(cover.url).host !== "media.koussay.online") {
    throw new Error(`[share] ${slug}: cover host is not media.koussay.online`);
  }
  const { body } = await getPublic(cover.url);
  if (sha256(body) !== cover.sha256) {
    throw new Error(`[share] ${slug}: cover sha mismatch`);
  }
  return body;
}

const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** A mistyped --only would otherwise exit 0 having done nothing. */
function checkOnly(order) {
  const known = new Set([...order, "home"]);
  const unknown = only.filter((slug) => !known.has(slug));
  if (unknown.length) {
    console.error(`[media] --only: unknown slug ${unknown.join(", ")}`);
    process.exit(1);
  }
}

/** Render and publish the signed og cards; skip any whose inputs are unchanged. */
async function shareUpload() {
  const { PROJECTS_IN_ORDER, ORDER } = await import(
    pathToFileURL(join(root, "content", "projects", "index.mjs")).href
  );
  checkOnly(ORDER);
  const manifest = readManifest();
  let failed = 0;
  const targets = PROJECTS_IN_ORDER.filter(
    (p) => !only.length || only.includes(p.slug),
  ).map((p) => ({
    label: `${p.slug}/og`,
    coverSlug: p.slug,
    lines: projectLines(p),
    prefix: `projects/${p.slug}/og-`,
    get: () => manifest.projects[p.slug]?.og,
    set: (entry) => {
      manifest.projects[p.slug].og = entry;
    },
  }));
  if (!only.length || only.includes("home")) {
    targets.push({
      label: "site/home",
      coverSlug: ORDER[0],
      lines: homeLines(SITE_NAME, SITE_DESCRIPTION),
      prefix: "projects/_site/og-home-",
      get: () => manifest.site?.home,
      set: (entry) => {
        manifest.site ||= {};
        manifest.site.home = entry;
      },
    });
  }
  for (const target of targets) {
    try {
      const cover = manifest.projects[target.coverSlug]?.cover;
      if (!cover) throw new Error("no cover in manifest");
      const inputs = inputsHash(cover.sha256, target.lines);
      if (target.get()?.inputs === inputs && !force) {
        console.log(`skip ${target.label} (inputs unchanged)`);
        continue;
      }
      const jpeg = await renderCard(
        await fetchCover(target.coverSlug, cover),
        target.lines,
        {
          label: target.label,
        },
      );
      const hash = sha256(jpeg);
      const key = `${target.prefix}${hash.slice(0, 8)}.jpg`;
      if (dryRun) {
        console.log(`would upload ${key} ${jpeg.length}`);
        continue;
      }
      await putObject(r2, key, jpeg, "image/jpeg", { cacheControl: IMMUTABLE });
      const head = await headObject(r2, key);
      if (head?.size !== jpeg.length) {
        throw new Error(`head size ${head?.size} != ${jpeg.length}`);
      }
      const url = publicUrl(r2, key);
      const problems = checkPublic(await getPublic(url), hash, "image/jpeg");
      if (problems.length) throw new Error(problems.join(", "));
      target.set({
        key,
        url,
        type: "image/jpeg",
        width: 1200,
        height: 630,
        bytes: jpeg.length,
        sha256: hash,
        inputs,
      });
      writeManifest(manifest);
      console.log(`ok ${target.label} ${key} ${jpeg.length}`);
    } catch (error) {
      failed += 1;
      console.error(`[media] ${target.label}: ${error.message || error}`);
    }
  }
  if (failed) process.exit(1);
}

/**
 * D-07 sign-off pictures. Preview only: writes under .media-probe/share/,
 * never R2, never the manifest. Proposed labels (D-03) exist only here.
 */
async function share() {
  if (!preview && !booking) {
    await shareUpload();
    return;
  }
  const out = join(root, ".media-probe", "share");
  mkdirSync(out, { recursive: true });
  const printed = [];
  const write = (name, buffer) => {
    writeFileSync(join(out, name), buffer);
    printed.push([name, buffer.length]);
    console.log(`preview ${name} ${buffer.length}`);
  };

  if (!preview) {
    // --booking: the static /booking share image, committed under app/booking.
    const png = await renderBooking(
      readFileSync(join(root, "public", "logo.png")),
    );
    writeFileSync(join(root, "app", "booking", "opengraph-image.png"), png);
    writeFileSync(
      join(root, "app", "booking", "opengraph-image.alt.txt"),
      `${SITE_MARK_ALT}\n`,
    );
    console.log(`booking opengraph-image.png ${png.length}`);
    return;
  }

  const proposals = new Map();
  for (const pair of labels.split(",").filter(Boolean)) {
    const at = pair.indexOf(":");
    if (at < 1) {
      console.error(`[media] --labels entry "${pair}" is not slug:Label`);
      process.exit(1);
    }
    proposals.set(pair.slice(0, at).trim(), pair.slice(at + 1).trim());
  }

  const { PROJECTS_IN_ORDER, ORDER } = await import(
    pathToFileURL(join(root, "content", "projects", "index.mjs")).href
  );
  for (const slug of proposals.keys()) {
    if (!ORDER.includes(slug)) {
      console.error(`[media] --labels: unknown slug ${slug}`);
      process.exit(1);
    }
  }
  checkOnly(ORDER);
  const manifest = readManifest();
  const covers = new Map();
  const coverOf = async (slug) => {
    if (!covers.has(slug)) {
      const cover = manifest.projects[slug]?.cover;
      if (!cover) throw new Error(`[share] ${slug}: no cover in manifest`);
      covers.set(slug, await fetchCover(slug, cover));
    }
    return covers.get(slug);
  };

  // name -> { lines, line2, slug, kind }
  const jobs = [];
  jobs.push({
    name: "home",
    slug: ORDER[0],
    lines: homeLines(SITE_NAME, SITE_DESCRIPTION),
    kind: "home",
  });
  for (const project of PROJECTS_IN_ORDER) {
    if (only.length && !only.includes(project.slug)) continue;
    jobs.push({
      name: project.slug,
      slug: project.slug,
      lines: projectLines(project),
      kind: "current",
    });
    if (proposals.has(project.slug)) {
      jobs.push({
        name: `${project.slug}-proposal`,
        slug: project.slug,
        lines: [project.name, `${proposals.get(project.slug)} · ${OWNER}`],
        kind: "proposal",
      });
    }
  }

  const sizes = new Map();
  for (const job of jobs) {
    const jpg = await renderCard(await coverOf(job.slug), job.lines, {
      label: job.name,
    });
    write(`${job.name}.jpg`, jpg);
    const feed = await sharp(jpg)
      .resize(600, 315)
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer();
    write(`${job.name}-feed.jpg`, feed);
    const square = await sharp(jpg)
      .extract({ left: 285, top: 0, width: 630, height: 630 })
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer();
    write(`${job.name}-square.jpg`, square);
    sizes.set(job.name, {
      full: jpg.length,
      feed: feed.length,
      square: square.length,
    });
  }

  const sheetNames = PROJECTS_IN_ORDER.map((p) => p.slug).filter((slug) =>
    sizes.has(slug),
  );
  const sheet = await sharp({
    create: {
      width: 1200,
      height: 315 * Math.ceil(sheetNames.length / 2),
      channels: 3,
      background: "#111111",
    },
  })
    .composite(
      await Promise.all(
        sheetNames.map(async (slug, i) => ({
          input: readFileSync(join(out, `${slug}-feed.jpg`)),
          left: (i % 2) * 600,
          top: Math.floor(i / 2) * 315,
        })),
      ),
    )
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
  write("contact-sheet.jpg", sheet);

  const bookingPng = await renderBooking(
    readFileSync(join(root, "public", "logo.png")),
  );
  write("booking.png", bookingPng);

  const section = (job, note) => {
    const sz = sizes.get(job.name);
    if (!sz) return "";
    const img = (suffix, label, bytes, width) =>
      `<figure><img src="${job.name}${suffix}.jpg" width="${width}"><figcaption>${label} ${bytes} bytes</figcaption></figure>`;
    return (
      `<section><h2>${esc(job.name)}${note ? ` (${note})` : ""}</h2>` +
      `<p>${esc(job.lines[0])}<br>${esc(job.lines[1])}</p>` +
      img("", "full 1200x630", sz.full, 1200) +
      img("-feed", "feed 600x315", sz.feed, 600) +
      img("-square", "square 630x630 centre crop", sz.square, 630) +
      `</section>`
    );
  };
  const order = ["home", "vamos-taxi", "looma-kitchen", "clickit-story"];
  const html = [];
  for (const slug of order) {
    for (const job of jobs.filter((j) => j.slug === slug || j.name === slug)) {
      if (slug === "home" && job.name !== "home") continue;
      if (slug !== "home" && job.name === "home") continue;
      html.push(
        section(job, slug === "clickit-story" ? "reference, unsigned" : ""),
      );
    }
  }
  html.push(
    `<section><h2>contact sheet (current labels)</h2><img src="contact-sheet.jpg" width="1200"></section>`,
    `<section><h2>booking card</h2><img src="booking.png" width="1200"></section>`,
  );
  const page = `<!doctype html><meta charset="utf-8"><title>D-07 share sign-off</title><body style="background:#222;color:#eee;font:14px system-ui;padding:24px">${html.join("")}</body>`;
  writeFileSync(join(out, "index.html"), page);
  console.log("nothing uploaded, manifest untouched");
}

if (command === "share") await share();
else if (command === "check") await check();
else if (command === "verify") await verify();
else await generateMedia();
