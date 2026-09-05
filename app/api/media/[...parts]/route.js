import { cachedNotionMediaUrl } from "@/lib/notion/projects";

export const runtime = "nodejs";

function notFound() {
  return new Response("Not found", { status: 404 });
}

function extensionFor(type) {
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  if (type.includes("avif")) return "avif";
  return "png";
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
    upstream = await fetch(fileUrl, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 },
    });
  } catch (error) {
    console.warn("[media] upstream", error);
    return notFound();
  }
  if (!upstream.ok) return notFound();

  const bytes = Buffer.from(await upstream.arrayBuffer());
  const type = upstream.headers.get("content-type") || "image/png";
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
