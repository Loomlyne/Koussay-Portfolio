import { verifyWebhookSignature } from "@notionhq/client";
import { revalidatePath, revalidateTag } from "next/cache";

import { notionWebhookSecret } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bust() {
  revalidateTag("projects", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/project", "layout");
  revalidatePath("/api/media", "layout");
}

export async function POST(request) {
  const raw = await request.text();
  let body = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }

  if (body?.verification_token) {
    console.info(
      "[revalidate] Notion verification_token — paste this into Notion Verify, then set NOTION_WEBHOOK_SECRET on Vercel:",
      body.verification_token,
    );
    return Response.json({
      ok: true,
      verification_token: body.verification_token,
    });
  }

  const secret = notionWebhookSecret();
  const signature =
    request.headers.get("x-notion-signature") ||
    request.headers.get("X-Notion-Signature");

  if (secret) {
    const valid = await verifyWebhookSignature({
      body: raw,
      signature,
      verificationToken: secret,
    });
    if (!valid) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (!body?.type) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  bust();
  return Response.json({ ok: true, revalidated: true });
}

export async function GET(request) {
  const secret = notionWebhookSecret();
  const query = request.nextUrl.searchParams.get("secret") || "";
  if (!secret || query !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  bust();
  return Response.json({ ok: true, revalidated: true });
}
