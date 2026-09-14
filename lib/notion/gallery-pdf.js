import { isNotionProjectsConfigured } from "@/lib/env";
import { notionPageId } from "@/lib/notion/client";
import { isPdfName, parseMediaSlot, slotFromMediaPath } from "@/lib/media";
import { getCachedProjectBundle, notionMediaUrl } from "@/lib/notion/projects";
import { fetchPdfBytes, pdfPageCount } from "@/lib/pdf";

function isPdfItem(item) {
  if (item?.kind === "pdf") return true;
  return isPdfName(item?.alt) || isPdfName(item?.file);
}

function alreadyPaged(slot) {
  return /^g\d+p\d+$/.test(slot);
}

function pagedFile(file, page) {
  const [path, query] = String(file).split("?");
  const next = path.replace(/\/(g\d+)$/, `/$1p${page}`);
  return query ? `${next}?${query}` : next;
}

function expiredFetch(error) {
  const msg = String(error?.message || "");
  return msg.includes("403") || msg.includes("404");
}

async function bytesForGalleryPdf(pageId, slot, cachedUrl) {
  const attempt = async (url) => {
    if (!url) return null;
    try {
      return await fetchPdfBytes(url);
    } catch (error) {
      if (expiredFetch(error)) return null;
      throw error;
    }
  };

  return (
    (await attempt(cachedUrl)) ||
    (await attempt(await notionMediaUrl(pageId, slot)))
  );
}

async function expandPdfGallery(gallery, pageId, media) {
  const groups = await Promise.all(
    gallery.map(async (item) => {
      const slot = slotFromMediaPath(item.file);
      const parsed = parseMediaSlot(slot);
      if (!isPdfItem(item) || parsed.kind !== "gallery" || alreadyPaged(slot)) {
        return [item];
      }

      const url = media[`${notionPageId(pageId)}:${parsed.lookup}`];

      try {
        const bytes = await bytesForGalleryPdf(pageId, parsed.lookup, url);
        if (!bytes) return [item];
        const count = await pdfPageCount(bytes);
        return Array.from({ length: count }, (_, index) => {
          const page = index + 1;
          return {
            file: pagedFile(item.file, page),
            alt: item.alt,
            kind: "pdf",
            page,
            pages: count,
          };
        });
      } catch (error) {
        console.warn("[projects] pdf pages", error);
        return [item];
      }
    }),
  );

  return groups.flat();
}

export async function withExpandedPdfGallery(project) {
  const gallery = project?.detail?.gallery;
  if (!gallery?.some(isPdfItem) || !isNotionProjectsConfigured()) {
    return project;
  }

  try {
    const bundle = await getCachedProjectBundle();
    const nextGallery = await expandPdfGallery(
      gallery,
      project.id,
      bundle.media,
    );
    if (nextGallery === gallery) return project;
    return {
      ...project,
      detail: {
        ...project.detail,
        gallery: nextGallery,
      },
    };
  } catch (error) {
    console.warn("[projects] pdf gallery", error);
    return project;
  }
}
