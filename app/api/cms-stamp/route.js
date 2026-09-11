import { isNotionProjectsConfigured } from "@/lib/env";
import { bustProjectsCache } from "@/lib/cms/bust";
import {
  cachedProjectsStamp,
  getCachedProjectBundle,
} from "@/lib/notion/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  if (!isNotionProjectsConfigured()) {
    return Response.json({ stamp: "" }, { headers: NO_STORE });
  }

  try {
    const stamp = await cachedProjectsStamp();
    let seen = stamp;
    try {
      const bundle = await getCachedProjectBundle();
      // ISO timestamps compare as time. The cheap sorted query can return an
      // older row than the full list; only a newer stamp means Notion moved.
      if (stamp && bundle.stamp && stamp > bundle.stamp) {
        bustProjectsCache();
        seen = stamp;
      } else {
        seen = bundle.stamp || stamp;
      }
    } catch {
      // Stamp still goes out; the next poll retries the bundle.
    }
    return Response.json({ stamp: seen }, { headers: NO_STORE });
  } catch (error) {
    console.warn("[cms-stamp]", error);
    return Response.json({ stamp: "" }, { status: 200, headers: NO_STORE });
  }
}
