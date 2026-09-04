import { notionMediaUrl } from "@/lib/notion/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function notFound() {
  return new Response("Not found", { status: 404 });
}

export async function GET(request, { params }) {
  const { parts } = await params;
  const [rawId, slot = "cover"] = parts ?? [];
  if (!rawId) return notFound();

  const pageId = rawId.replace(/[^a-fA-F0-9]/g, "");
  if (pageId.length < 32) return notFound();
  const dashed = `${pageId.slice(0, 8)}-${pageId.slice(8, 12)}-${pageId.slice(12, 16)}-${pageId.slice(16, 20)}-${pageId.slice(20, 32)}`;

  let fileUrl = "";
  try {
    fileUrl = await notionMediaUrl(dashed, slot);
  } catch (error) {
    console.warn("[media]", error);
    return notFound();
  }

  if (!fileUrl) return notFound();

  const upstream = await fetch(fileUrl, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) return notFound();

  const versioned = request.nextUrl.searchParams.has("v");
  const headers = new Headers();
  headers.set(
    "Content-Type",
    upstream.headers.get("content-type") || "application/octet-stream",
  );
  headers.set(
    "Cache-Control",
    versioned ? "public, max-age=31536000, immutable" : "no-store",
  );

  return new Response(upstream.body, { status: 200, headers });
}
