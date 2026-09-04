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

function mapPage(page, usedSlugs) {
  const name = titleOf(page);
  if (!name) return null;

  const published = checkboxOf(findProp(page, "Published", "Live on site"));
  if (published === false) return null;

  const coverFiles = filesOf(findProp(page, "Cover", "Image", "Thumbnail"));
  const hasCover = Boolean(coverOf(page) || coverFiles[0]);
  if (!hasCover) return null;

  const galleryFiles = filesOf(findProp(page, "Gallery"));
  const slug = uniqueSlug(
    slugify(textOf(findProp(page, "Slug")) || name),
    usedSlugs,
  );

  const quote = textOf(findProp(page, "Quote", "Testimonial"));
  const tools = multiSelectOf(findProp(page, "Tools"));

  const version = page.last_edited_time || "";

  return {
    id: page.id,
    updatedAt: version,
    file: mediaPath(page.id, null, version),
    slug,
    name,
    type: textOf(findProp(page, "Type", "Discipline")) || "Work",
    year: textOf(findProp(page, "Year")) || "",
    liveUrl: textOf(findProp(page, "Live", "Live URL", "URL")) || null,
    order: numberOf(findProp(page, "Order", "Ring")),
    detail: {
      summary: textOf(findProp(page, "Summary")),
      overview: textOf(findProp(page, "Overview")),
      challenge: textOf(findProp(page, "Challenge")),
      outcome: textOf(findProp(page, "Outcome")),
      gallery: galleryFiles.map((file, index) => ({
        file: mediaPath(page.id, `g${index}`, version),
        alt: file.name || `${name} — gallery`,
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
  };
}

export async function fetchNotionProjects() {
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

  const usedSlugs = new Set();
  const mapped = results
    .filter(
      (page) => page.object === "page" && !page.archived && !page.in_trash,
    )
    .map((page) => mapPage(page, usedSlugs))
    .filter(Boolean)
    .sort((a, b) => {
      const ao = a.order ?? Number.POSITIVE_INFINITY;
      const bo = b.order ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name);
    })
    .slice(0, MAX_PLANES);

  return mapped;
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

export async function notionMediaUrl(pageId, slot = "cover") {
  const page = await notion().pages.retrieve({ page_id: pageId });
  if (slot === "cover") {
    const coverFiles = filesOf(findProp(page, "Cover", "Image", "Thumbnail"));
    return coverOf(page) || coverFiles[0]?.url || "";
  }

  const match = /^g(\d+)$/.exec(slot);
  if (!match) return "";
  const gallery = filesOf(findProp(page, "Gallery"));
  return gallery[Number(match[1])]?.url || "";
}

// `version` is last_edited_time from the list payload. It is only a cache
// key — signed URLs die in about an hour, so a new edit must not reuse
// a stale mapping. Bytes themselves are cached by the versioned media URL.
export const cachedNotionMediaUrl = unstable_cache(
  async (pageId, slot, _version) => notionMediaUrl(pageId, slot),
  ["notion-media-url"],
  { revalidate: 300, tags: ["projects"] },
);
