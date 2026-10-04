import { readFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = "image/png";

const BACKGROUND = { r: 244, g: 245, b: 246, alpha: 1 };

async function readLogo() {
  return readFile(join(process.cwd(), "public/logo.png"));
}

const MEDIA_PREFIX = "https://media.koussay.online/projects/";

// A project's cover is required: a missing one fails the build rather than
// shipping the logo as a share image.
async function fetchCover(project) {
  if (!String(project.file).startsWith(MEDIA_PREFIX)) {
    throw new Error(`[og] ${project.slug}: cover is not on the media host`);
  }
  const response = await fetch(project.file, {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`[og] ${project.slug}: cover fetch ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function ogImageResponse(project) {
  const cover = project ? await fetchCover(project) : null;
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
