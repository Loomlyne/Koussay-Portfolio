import sharp from "sharp";

import { cachedNotionMediaUrl, notionMediaUrl } from "@/lib/notion/projects";

export const runtime = "nodejs";

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

function extensionFor(type) {
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  if (type.includes("avif")) return "avif";
  return "png";
}

async function fetchFile(fileUrl) {
  return fetch(fileUrl, {
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
}

async function optimize(bytes, type) {
  if (type.includes("gif")) return { bytes, type };
  try {
    const out = await sharp(bytes)
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    return { bytes: out, type: "image/webp" };
  } catch {
    return { bytes, type };
  }
}

export async function GET(request, { params }) {
  const { parts } = await params;
  const [rawId, slot = "cover"] = parts ?? [];
  if (!rawId) return notFound();

  const pageId = rawId.replace(/[^a-fA-F0-9]/g, "");
  if (pageId.length < 32) return notFound();
  const dashed = `${pageId.slice(0, 8)}-${pageId.slice(8, 12)}-${pageId.slice(12, 16)}-${pageId.slice(16, 20)}-${pageId.slice(20, 32)}`;

  const version = request.nextUrl.searchParams.get("v") || "";

  let fileUrl = "";
  try {
    fileUrl = await cachedNotionMediaUrl(dashed, slot, version);
  } catch (error) {
    console.warn("[media]", error);
    return notFound();
  }

  if (!fileUrl) return notFound();

  let upstream;
  try {
    // Signed Notion URLs expire in about an hour. Never cache that fetch:
    // a cached 403 is what left the ring on black cells. The versioned
    // Cache-Control on the response is what stops the function running again.
    upstream = await fetchFile(fileUrl);
    if (upstream.status === 403 || upstream.status === 404) {
      fileUrl = await notionMediaUrl(dashed, slot);
      if (!fileUrl) return notFound();
      upstream = await fetchFile(fileUrl);
    }
  } catch (error) {
    console.warn("[media] upstream", error);
    return notFound();
  }
  if (!upstream.ok) return notFound();

  const raw = Buffer.from(await upstream.arrayBuffer());
  const rawType = upstream.headers.get("content-type") || "image/png";
  const { bytes, type } = await optimize(raw, rawType);
  const versioned = request.nextUrl.searchParams.has("v");
  const headers = new Headers();
  headers.set("Content-Type", type);
  headers.set("Content-Length", String(bytes.length));
  headers.set(
    "Content-Disposition",
    `inline; filename="cover.${extensionFor(type)}"`,
  );
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set(
    "Cache-Control",
    versioned ? "public, max-age=31536000, immutable" : "no-store",
  );

  return new Response(bytes, { status: 200, headers });
}

export function HEAD(request, context) {
  return GET(request, context);
}
