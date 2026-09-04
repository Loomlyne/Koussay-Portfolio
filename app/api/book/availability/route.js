import { isNotionBookingsConfigured } from "@/lib/env";
import { fetchBusyRanges } from "@/lib/notion/bookings";
import { pendingBusy } from "@/lib/book/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const busy = isNotionBookingsConfigured()
      ? [...(await fetchBusyRanges()), ...pendingBusy()]
      : pendingBusy();
    return Response.json(
      { busy, taken: busy.map((range) => range.start) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[book/availability]", error);
    const busy = pendingBusy();
    return Response.json(
      { busy, taken: busy.map((range) => range.start) },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
