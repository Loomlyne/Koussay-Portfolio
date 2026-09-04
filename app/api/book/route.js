import {
  isBookingConfigured,
  isNotionBookingsConfigured,
  isResendConfigured,
} from "@/lib/env";
import { sendBookingEmails } from "@/lib/mail/booking";
import { createNotionBooking, fetchBusyRanges } from "@/lib/notion/bookings";
import {
  SLOT_MS,
  claimSlot,
  isBusy,
  pendingBusy,
  releaseSlot,
  slotStartMs,
} from "@/lib/book/time";
import { MAX_ATTACHMENT_BYTES, validateBooking } from "@/lib/book/validate";

export const runtime = "nodejs";

function json(data, status = 200) {
  return Response.json(data, { status });
}

async function currentBusy() {
  const busy = isNotionBookingsConfigured() ? await fetchBusyRanges() : [];
  return [...busy, ...pendingBusy()];
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
  const start = slotStartMs(booking.date, booking.time, booking.timezone);

  if (!claimSlot(start)) {
    const busy = await currentBusy();
    return json(
      {
        error: "That time was just booked. Pick the next open slot.",
        busy,
        taken: busy.map((range) => range.start),
      },
      409,
    );
  }

  try {
    const booked = isNotionBookingsConfigured() ? await fetchBusyRanges() : [];
    if (isBusy(start, start + SLOT_MS, booked)) {
      const busy = [...booked, ...pendingBusy()];
      return json(
        {
          error: "That time is already booked. Pick the next open slot.",
          busy,
          taken: busy.map((range) => range.start),
        },
        409,
      );
    }

    const results = { notion: false, email: false };

    if (isNotionBookingsConfigured()) {
      await createNotionBooking(record, attachment);
      results.notion = true;
    }
    if (isResendConfigured()) {
      await sendBookingEmails(record, attachment);
      results.email = true;
    }

    return json({ ok: true, ...results });
  } catch (err) {
    console.error("[book]", err);
    return json(
      { error: "Could not save this booking. Try again in a moment." },
      502,
    );
  } finally {
    releaseSlot(start);
  }
}
