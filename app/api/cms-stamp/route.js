import { isNotionProjectsConfigured } from "@/lib/env";
import { fetchProjectsStamp } from "@/lib/notion/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isNotionProjectsConfigured()) {
    return Response.json(
      { stamp: "" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const stamp = await fetchProjectsStamp();
    return Response.json(
      { stamp },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.warn("[cms-stamp]", error);
    return Response.json({ stamp: "" }, { status: 200 });
  }
}
