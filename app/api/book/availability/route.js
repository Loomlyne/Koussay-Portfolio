import { isNotionBookingsConfigured } from "@/lib/env";
import { fetchBookedStarts } from "@/lib/notion/bookings";
import { pendingSlotStarts } from "@/lib/book/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const taken = isNotionBookingsConfigured()
      ? await fetchBookedStarts()
      : new Set(pendingSlotStarts());
    for (const start of pendingSlotStarts()) taken.add(start);
    return Response.json(
      { taken: [...taken] },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[book/availability]", error);
    return Response.json(
      { taken: [...pendingSlotStarts()] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
