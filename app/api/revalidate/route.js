import { revalidatePath, revalidateTag } from "next/cache";

import { notionWebhookSecret } from "@/lib/env";

export const runtime = "nodejs";

function authorized(request, body) {
  const secret = notionWebhookSecret();
  if (!secret) {
    // First-time Notion handshake has no secret yet.
    return Boolean(body?.verification_token);
  }

  const header =
    request.headers.get("authorization") ||
    request.headers.get("x-webhook-secret") ||
    "";
  const bearer = header.replace(/^Bearer\s+/i, "");
  const query = request.nextUrl.searchParams.get("secret") || "";
  return (
    bearer === secret || query === secret || body?.verification_token === secret
  );
}

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (body?.verification_token && !notionWebhookSecret()) {
    console.info(
      "[revalidate] Notion verification token (paste into Notion, then set NOTION_WEBHOOK_SECRET):",
      body.verification_token,
    );
    return Response.json({ ok: true });
  }

  if (!authorized(request, body)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag("projects", "max");
  revalidatePath("/");
  revalidatePath("/work", "layout");

  return Response.json({ ok: true, revalidated: true });
}

export async function GET(request) {
  if (!authorized(request, {})) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag("projects", "max");
  revalidatePath("/");
  revalidatePath("/work", "layout");
  return Response.json({ ok: true, revalidated: true });
}
