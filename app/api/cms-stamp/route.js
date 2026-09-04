import { isNotionProjectsConfigured } from "@/lib/env";
import { cachedProjectsStamp } from "@/lib/notion/projects";

export const runtime = "nodejs";
export const revalidate = 20;

const STAMP_CACHE = "public, s-maxage=20, stale-while-revalidate=40";

export async function GET() {
  if (!isNotionProjectsConfigured()) {
    return Response.json(
      { stamp: "" },
      { headers: { "Cache-Control": STAMP_CACHE } },
    );
  }

  try {
    const stamp = await cachedProjectsStamp();
    return Response.json(
      { stamp },
      { headers: { "Cache-Control": STAMP_CACHE } },
    );
  } catch (error) {
    console.warn("[cms-stamp]", error);
    return Response.json({ stamp: "" }, { status: 200 });
  }
}
