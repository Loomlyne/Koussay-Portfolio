import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Client } from "@notionhq/client";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const env = { ...process.env };
  for (const file of [".env.local", ".env"]) {
    let text = "";
    try {
      text = readFileSync(join(root, file), "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const i = trimmed.indexOf("=");
      if (i === -1) continue;
      const key = trimmed.slice(0, i);
      if (env[key]) continue;
      env[key] = trimmed.slice(i + 1).trim();
    }
  }
  return env;
}

function rich(text) {
  const value = String(text ?? "");
  if (!value) return [];
  return [{ type: "text", text: { content: value.slice(0, 2000) } }];
}

function textOf(prop) {
  if (!prop) return "";
  if (prop.type === "rich_text") {
    return (prop.rich_text || []).map((part) => part.plain_text ?? "").join("");
  }
  if (prop.type === "title") {
    return (prop.title || []).map((part) => part.plain_text ?? "").join("");
  }
  return "";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(label, fn) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const status = error.status || error.code;
      const retryable = status === 429 || status === 409 || status === 502;
      if (!retryable || attempt === 5) {
        throw new Error(`${label}: ${error.message || error}`);
      }
      const wait = Math.min(8000, 600 * 2 ** attempt);
      console.warn(`retry ${label} in ${wait}ms`);
      await sleep(wait);
    }
  }
}

const env = loadEnv();
if (!env.NOTION_TOKEN || !env.NOTION_PROJECTS_DATABASE_ID) {
  console.error("Missing NOTION_TOKEN or NOTION_PROJECTS_DATABASE_ID");
  process.exit(1);
}

const { PROJECTS } = await import(
  pathToFileURL(join(root, "components/ring/projects.js")).href
);

const notion = new Client({ auth: env.NOTION_TOKEN });

async function sourceId() {
  try {
    const database = await notion.databases.retrieve({
      database_id: env.NOTION_PROJECTS_DATABASE_ID,
    });
    return database.data_sources?.[0]?.id || env.NOTION_PROJECTS_DATABASE_ID;
  } catch {
    return env.NOTION_PROJECTS_DATABASE_ID;
  }
}

async function uploadCover(filename) {
  const bytes = readFileSync(join(root, "public", filename));
  const created = await withRetry(`upload.create ${filename}`, () =>
    notion.fileUploads.create({
      mode: "single_part",
      filename,
      content_type: "image/webp",
    }),
  );
  await withRetry(`upload.send ${filename}`, () =>
    notion.fileUploads.send({
      file_upload_id: created.id,
      file: {
        filename,
        data: new Blob([bytes], { type: "image/webp" }),
      },
    }),
  );
  return created.id;
}

function propertiesFor(project, order, { includeCoverId } = {}) {
  const properties = {
    Name: { title: rich(project.name) },
    Slug: { rich_text: rich(project.slug) },
    Type: { rich_text: rich(project.type) },
    Year: { rich_text: rich(project.year) },
    Order: { number: order },
    Published: { checkbox: true },
    Summary: { rich_text: rich(project.detail?.summary) },
    Overview: { rich_text: rich(project.detail?.overview) },
    Challenge: { rich_text: rich(project.detail?.challenge) },
    Outcome: { rich_text: rich(project.detail?.outcome) },
    Quote: { rich_text: rich(project.detail?.testimonial?.quote) },
    Author: { rich_text: rich(project.detail?.testimonial?.author) },
    Role: { rich_text: rich(project.detail?.testimonial?.role) },
    Tools: {
      multi_select: (project.detail?.tools || []).map((name) => ({ name })),
    },
  };
  if (project.liveUrl) {
    properties.Live = { url: project.liveUrl };
  }
  if (includeCoverId) {
    properties.Cover = {
      files: [
        {
          type: "file_upload",
          file_upload: { id: includeCoverId },
          name: project.file,
        },
      ],
    };
  }
  return properties;
}

const id = await sourceId();
const existing = [];
let cursor;
do {
  const page = await notion.dataSources.query({
    data_source_id: id,
    start_cursor: cursor,
    page_size: 100,
  });
  existing.push(...page.results);
  cursor = page.has_more ? page.next_cursor : undefined;
} while (cursor);

const bySlug = new Map();
for (const page of existing) {
  if (page.archived || page.in_trash) continue;
  const slug = textOf(page.properties?.Slug).trim().toLowerCase();
  const name = textOf(page.properties?.Name).trim().toLowerCase();
  if (slug) bySlug.set(slug, page);
  if (name && !bySlug.has(name)) bySlug.set(name, page);
}

let created = 0;
let updated = 0;

for (const [index, project] of PROJECTS.entries()) {
  const order = index + 1;
  const current =
    bySlug.get(project.slug.toLowerCase()) ||
    bySlug.get(project.name.toLowerCase());
  const hasCover = Boolean(
    current?.cover || (current?.properties?.Cover?.files || []).length,
  );

  if (current && hasCover) {
    await withRetry(`update ${project.slug}`, () =>
      notion.pages.update({
        page_id: current.id,
        properties: propertiesFor(project, order),
      }),
    );
    updated += 1;
    console.log(`updated ${order}. ${project.name}`);
  } else {
    const uploadId = await uploadCover(project.file);
    const payload = {
      parent: { data_source_id: id },
      properties: propertiesFor(project, order, { includeCoverId: uploadId }),
      cover: {
        type: "file_upload",
        file_upload: { id: uploadId },
      },
    };
    if (current) {
      await withRetry(`fill ${project.slug}`, () =>
        notion.pages.update({
          page_id: current.id,
          properties: payload.properties,
          cover: payload.cover,
        }),
      );
      updated += 1;
      console.log(`filled ${order}. ${project.name}`);
    } else {
      const page = await withRetry(`create ${project.slug}`, () =>
        notion.pages.create(payload),
      );
      bySlug.set(project.slug.toLowerCase(), page);
      created += 1;
      console.log(`created ${order}. ${project.name}`);
    }
  }

  await sleep(350);
}

console.log(
  `done created=${created} updated=${updated} total=${PROJECTS.length}`,
);
