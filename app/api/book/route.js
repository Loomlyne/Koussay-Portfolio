import { after } from "next/server";

import { isResearchConfigured, researchBusiness } from "@/lib/book/research";
import {
  SLOT_MS,
  claimSlot,
  isBusy,
  pendingBusy,
  releaseSlot,
  slotStartMs,
} from "@/lib/book/time";
import { MAX_ATTACHMENT_BYTES, validateBooking } from "@/lib/book/validate";
import {
  isBookingConfigured,
  isNotionBookingsConfigured,
  isResendConfigured,
} from "@/lib/env";
import { sendBookingEmails } from "@/lib/mail/booking";
import {
  createNotionBooking,
  fetchBusyRanges,
  fillBookingResearch,
} from "@/lib/notion/bookings";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  const { booking, error, step, field } = validateBooking(payload);
  if (error) return json({ error, step, field }, 400);

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
        step: 4,
        field: "time",
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
          step: 4,
          field: "time",
          busy,
          taken: busy.map((range) => range.start),
        },
        409,
      );
    }

    const results = { notion: false, email: false };
    const researchPromise =
      isNotionBookingsConfigured() && isResearchConfigured()
        ? researchBusiness(record).catch((err) => {
            console.error("[book] research", err);
            return null;
          })
        : null;
    let created = null;

    if (isNotionBookingsConfigured()) {
      created = await createNotionBooking(
        record,
        attachment,
        typeof payload.draftId === "string" ? payload.draftId : "",
      );
      results.notion = true;
    }
    if (isResendConfigured()) {
      await sendBookingEmails(record, attachment);
      results.email = true;
    }

    if (created?.id && researchPromise) {
      const pageId = created.id;
      after(async () => {
        try {
          const briefing = await researchPromise;
          await fillBookingResearch(pageId, briefing);
        } catch (err) {
          console.error("[book] research write", err);
        }
      });
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
