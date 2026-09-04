import {
  isBookingConfigured,
  isNotionBookingsConfigured,
  isResendConfigured,
} from "@/lib/env";
import { sendBookingEmails } from "@/lib/mail/booking";
import { createNotionBooking } from "@/lib/notion/bookings";
import { MAX_ATTACHMENT_BYTES, validateBooking } from "@/lib/book/validate";

export const runtime = "nodejs";

function json(data, status = 200) {
  return Response.json(data, { status });
}

export async function POST(request) {
  if (!isBookingConfigured()) {
    return json(
      {
        error:
          "Booking is not connected yet. Add Notion and/or Resend keys in .env.local.",
      },
      503,
    );
  }

  let payload;
  let attachment = null;

  try {
    const form = await request.formData();
    payload = JSON.parse(String(form.get("payload") || "{}"));
    const file = form.get("attachment");
    if (
      file &&
      typeof file === "object" &&
      "arrayBuffer" in file &&
      file.size
    ) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        return json({ error: "Attachment must be 4 MB or smaller." }, 413);
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      attachment = {
        filename: file.name || "attachment",
        contentType: file.type || "application/octet-stream",
        buffer,
      };
    }
  } catch {
    return json({ error: "Could not read the booking form." }, 400);
  }

  const { booking, error } = validateBooking(payload);
  if (error) return json({ error }, 400);

  const record = {
    ...booking,
    attachmentName: attachment?.filename || "",
  };

  const results = { notion: false, email: false };

  try {
    if (isNotionBookingsConfigured()) {
      await createNotionBooking(record);
      results.notion = true;
    }
    if (isResendConfigured()) {
      await sendBookingEmails(record, attachment);
      results.email = true;
    }
  } catch (err) {
    console.error("[book]", err);
    return json(
      { error: "Could not save this booking. Try again in a moment." },
      502,
    );
  }

  return json({ ok: true, ...results });
}
