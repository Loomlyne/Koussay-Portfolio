import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";

import { MAX_PLANES } from "@/components/shaders/planeShaders";
import {
  cachedDataSourceId,
  notion,
  notionPageId,
  withTimeout,
} from "@/lib/notion/client";
import {
  checkboxOf,
  coverOf,
  filesOf,
  findProp,
  multiSelectOf,
  numberOf,
  textOf,
  titleOf,
} from "@/lib/notion/props";
import { notionProjectsDatabaseId } from "@/lib/env";
import { isPdfName, parseMediaSlot } from "@/lib/media";

function slugify(value) {
  const slug = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "project";
}

function uniqueSlug(base, used) {
  let slug = base;
  let n = 2;
  while (used.has(slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  used.add(slug);
  return slug;
}

function mediaPath(pageId, slot, version) {
  const id = notionPageId(pageId);
  const path = slot ? `/api/media/${id}/${slot}` : `/api/media/${id}`;
  if (!version) return path;
  return `${path}?v=${encodeURIComponent(version)}`;
}

function mediaKey(pageId, slot) {
  return `${notionPageId(pageId)}:${slot}`;
}

// Strip the signed query so replacing a file changes the id even if
// last_edited_time in a stale list payload has not moved yet.
function fingerprint(url) {
  if (!url) return "";
  return createHash("sha1").update(url.split("?")[0]).digest("hex").slice(0, 8);
}

function mediaVersion(page, fileUrl) {
  const edited = page.last_edited_time || "";
  const id = fingerprint(fileUrl);
  return [edited, id].filter(Boolean).join("-");
}

// The Cover/Image/Thumbnail column is what you edit in the database. The
// page banner is only a fallback for rows that never got a files property.
function coverUrlOf(page) {
  const coverFiles = filesOf(findProp(page, "Cover", "Image", "Thumbnail"));
  return coverFiles[0]?.url || coverOf(page) || "";
}

function fileUrlFor(page, slot = "cover") {
  const parsed = parseMediaSlot(slot);
  if (parsed.kind === "cover") return coverUrlOf(page);
  if (parsed.kind !== "gallery") return "";
  return filesOf(findProp(page, "Gallery"))[parsed.fileIndex]?.url || "";
}

function mapPage(page, usedSlugs) {
  const name = titleOf(page);
  if (!name) return null;

  const published = checkboxOf(findProp(page, "Published", "Live on site"));
  if (published === false) return null;

  const coverUrl = coverUrlOf(page);
  if (!coverUrl) return null;

  const galleryFiles = filesOf(findProp(page, "Gallery"));
  const slug = uniqueSlug(
    slugify(textOf(findProp(page, "Slug")) || name),
    usedSlugs,
  );

  const quote = textOf(findProp(page, "Quote", "Testimonial"));
  const tools = multiSelectOf(findProp(page, "Tools"));
  const edited = page.last_edited_time || "";
  const coverVersion = mediaVersion(page, coverUrl);

  const media = { [mediaKey(page.id, "cover")]: coverUrl };
  galleryFiles.forEach((file, index) => {
    media[mediaKey(page.id, `g${index}`)] = file.url;
  });

  return {
    media,
    project: {
      id: page.id,
      updatedAt: edited,
      file: mediaPath(page.id, null, coverVersion),
      slug,
      name,
      type: textOf(findProp(page, "Type", "Discipline")) || "",
      year: textOf(findProp(page, "Year")) || "",
      liveUrl: textOf(findProp(page, "Live", "Live URL", "URL")) || null,
      order: numberOf(findProp(page, "Order", "Ring")),
      detail: {
        summary: textOf(findProp(page, "Summary")),
        overview: textOf(findProp(page, "Overview")),
        challenge: textOf(findProp(page, "Challenge")),
        outcome: textOf(findProp(page, "Outcome")),
        gallery: galleryFiles.map((file, index) => ({
          file: mediaPath(page.id, `g${index}`, mediaVersion(page, file.url)),
          alt: file.name || `${name} — gallery`,
          kind: isPdfName(file.name) || isPdfName(file.url) ? "pdf" : "image",
        })),
        testimonial: quote
          ? {
              quote,
              author: textOf(findProp(page, "Author")),
              role: textOf(findProp(page, "Role")),
            }
          : { quote: "", author: "", role: "" },
        tools,
      },
    },
  };
}

async function queryProjectPages() {
  const databaseId = await cachedDataSourceId(notionProjectsDatabaseId());
  const results = [];
  let startCursor;

  do {
    const page = await notion().dataSources.query({
      data_source_id: databaseId,
      start_cursor: startCursor,
      page_size: 100,
    });
    results.push(...page.results);
    startCursor = page.has_more ? page.next_cursor : undefined;
  } while (startCursor && results.length < MAX_PLANES * 2);

  return results;
}

export async function fetchNotionProjectBundle() {
  const results = await withTimeout(queryProjectPages(), 4000, "[projects]");

  const usedSlugs = new Set();
  const pages = results.filter(
    (page) => page.object === "page" && !page.archived && !page.in_trash,
  );
  const stamp = pages.reduce(
    (max, page) =>
      (page.last_edited_time || "") > max ? page.last_edited_time || "" : max,
    "",
  );

  const media = {};
  const mapped = pages
    .map((page) => mapPage(page, usedSlugs))
    .filter(Boolean)
    .sort((a, b) => {
      const ao = a.project.order ?? Number.POSITIVE_INFINITY;
      const bo = b.project.order ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return a.project.name.localeCompare(b.project.name);
    })
    .slice(0, MAX_PLANES);

  for (const row of mapped) Object.assign(media, row.media);

  return {
    projects: mapped.map((row) => row.project),
    media,
    stamp,
  };
}

export async function fetchNotionProjects() {
  const bundle = await fetchNotionProjectBundle();
  return bundle.projects;
}

export async function fetchProjectsStamp() {
  const databaseId = await cachedDataSourceId(notionProjectsDatabaseId());
  const page = await withTimeout(
    notion().dataSources.query({
      data_source_id: databaseId,
      page_size: 1,
      sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
    }),
    2500,
    "[cms-stamp]",
  );
  return page.results[0]?.last_edited_time || page.results[0]?.id || "";
}

export const cachedProjectsStamp = unstable_cache(
  fetchProjectsStamp,
  ["cms-stamp"],
  { revalidate: 20, tags: ["projects"] },
);

async function loadProjectBundle() {
  const bundle = await fetchNotionProjectBundle();
  if (bundle.projects.length === 0) {
    throw new Error("[projects] Notion returned no published covers");
  }
  return bundle;
}

export const getCachedProjectBundle = unstable_cache(
  loadProjectBundle,
  // v2: payload is { projects, media, stamp }. The old key stored a
  // bare array, and a hit after deploy would look like Notion was empty.
  ["cms-projects-v2"],
  { tags: ["projects"], revalidate: 60 },
);

export async function notionMediaUrl(pageId, slot = "cover") {
  const page = await notion().pages.retrieve({ page_id: pageId });
  return fileUrlFor(page, slot);
}

// Prefer the signed URLs already sitting on the list payload so a cold
// atlas does not fan out one pages.retrieve per cover (that is the 429
// that left the ring black). Fall back to a live retrieve if the slot
// was not in the bundle — an old HTML `?v=` after a gallery add.
export async function cachedNotionMediaUrl(
  pageId,
  slot = "cover",
  version = "",
) {
  try {
    const bundle = await getCachedProjectBundle();
    const url = bundle.media[mediaKey(pageId, parseMediaSlot(slot).lookup)];
    if (url) {
      const id = fingerprint(url);
      // Old HTML only sent last_edited_time. If that does not match the
      // file we would serve, go live — that is the Cover-column replace.
      if (!version || !id || version.includes(id)) return url;
    }
  } catch (error) {
    console.warn("[media] bundle", error);
  }
  return notionMediaUrl(pageId, slot);
}
