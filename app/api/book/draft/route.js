import { sanitizeDraft } from "@/lib/book/draft";
import {
  isNotionBookingsConfigured,
  isResendConfigured,
} from "@/lib/env";
import { sendDraftNotice } from "@/lib/mail/booking";
import { upsertNotionDraft } from "@/lib/notion/bookings";

export const runtime = "nodejs";

function json(data, status = 200) {
  return Response.json(data, { status });
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Could not read this draft." }, 400);
  }

  const draft = sanitizeDraft(payload);
  if (!draft.email && !draft.name) {
    return json({ ok: true, skipped: true });
  }

  const created = !draft.id;
  let id = draft.id || "";

  try {
    if (isNotionBookingsConfigured()) {
      const saved = await upsertNotionDraft(draft);
      id = saved.id;
    }

    if (created && draft.email && isResendConfigured()) {
      await sendDraftNotice({ ...draft, id }).catch((error) => {
        console.error("[book/draft] notice", error);
      });
    }

    return json({ ok: true, id });
  } catch (error) {
    console.error("[book/draft]", error);
    return json({ ok: false, error: "Could not save this draft." }, 502);
  }
}