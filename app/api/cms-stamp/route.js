export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

// Tabs still on the old bundle keep polling this route. An empty stamp makes
// them do nothing, and nothing here calls Notion (D-11).
export async function GET() {
  return Response.json({ stamp: "" }, { headers: NO_STORE });
}
