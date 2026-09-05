import { readFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

import { notionPageId } from "@/lib/notion/client";
import { cachedNotionMediaUrl } from "@/lib/notion/projects";
import { projectImageSrc } from "@/lib/projects";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = "image/png";

const BACKGROUND = { r: 244, g: 245, b: 246, alpha: 1 };

async function readLogo() {
  return readFile(join(process.cwd(), "public/logo.png"));
}

async function readLocalCover(project) {
  const src = projectImageSrc(project);
  if (!src || src.startsWith("http://") || src.startsWith("https://")) {
    return null;
  }
  if (src.startsWith("/api/")) return null;
  const relative = src.startsWith("/") ? src.slice(1) : src;
  try {
    return await readFile(join(process.cwd(), "public", relative));
  } catch {
    return null;
  }
}

async function fetchNotionCover(project) {
  if (!project?.id) return null;
  try {
    const url = await cachedNotionMediaUrl(
      notionPageId(project.id),
      "cover",
      project.updatedAt || "",
    );
    if (!url) return null;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

export async function ogImageResponse(project) {
  const cover =
    (await fetchNotionCover(project)) || (await readLocalCover(project));
  const source = cover || (await readLogo());
  const buffer = await sharp(source)
    .rotate()
    .resize(OG_SIZE.width, OG_SIZE.height, {
      fit: cover ? "cover" : "contain",
      position: "centre",
      background: BACKGROUND,
    })
    .png({ compressionLevel: 8 })
    .toBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": OG_TYPE,
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
