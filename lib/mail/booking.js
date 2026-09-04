import { Resend } from "resend";

import {
  bookingNotifyEmail,
  isResendConfigured,
  resendApiKey,
  resendFrom,
} from "@/lib/env";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label, value) {
  const text = String(value ?? "").trim() || "—";
  return `<tr>
    <td style="padding:8px 0;color:#6b6b6b;vertical-align:top;width:140px">${escapeHtml(label)}</td>
    <td style="padding:8px 0;color:#0a0a0a">${escapeHtml(text)}</td>
  </tr>`;
}

function bookingTable(booking) {
  return `<table style="width:100%;border-collapse:collapse;font-size:15px">
    ${row("Name", booking.name)}
    ${row("Email", booking.email)}
    ${row("Date", `${booking.date} ${booking.time}`)}
    ${row("Timezone", booking.timezone)}
    ${row("Company", booking.company)}
    ${row("Website", booking.website)}
    ${row("Help with", booking.services.join(", "))}
    ${row("Budget", booking.budget)}
    ${row("Deadline", booking.deadline)}
    ${row("Details", booking.details || "Skipped")}
    ${row("Attachment", booking.attachmentName || "None")}
  </table>`;
}

function wrap(title, intro, booking) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#fafafa;color:#0a0a0a;font-family:ui-sans-serif,system-ui,sans-serif">
    <div style="max-width:560px;margin:0 auto;padding:40px 24px">
      <p style="margin:0 0 8px;letter-spacing:0.08em;text-transform:uppercase;font-size:11px;color:#6b6b6b">Koussay</p>
      <h1 style="margin:0 0 16px;font-size:28px;letter-spacing:-0.04em;font-weight:500">${escapeHtml(title)}</h1>
      <p style="margin:0 0 28px;line-height:1.5;color:#444">${escapeHtml(intro)}</p>
      ${bookingTable(booking)}
    </div>
  </body>
</html>`;
}

export async function sendBookingEmails(booking, attachment) {
  if (!isResendConfigured()) return { skipped: true };

  const resend = new Resend(resendApiKey());
  const files = [];
  if (attachment?.buffer && attachment.filename) {
    files.push({
      filename: attachment.filename,
      content: attachment.buffer,
      contentType: attachment.contentType,
    });
  }

  const visitor = await resend.emails.send({
    from: resendFrom(),
    to: booking.email,
    subject: `Call booked — ${booking.date} ${booking.time}`,
    html: wrap(
      "You're booked",
      "Thanks for the details. I'll confirm this time shortly and come prepared.",
      booking,
    ),
  });

  if (visitor.error) {
    throw new Error(visitor.error.message || "Resend visitor email failed");
  }

  const owner = await resend.emails.send({
    from: resendFrom(),
    to: bookingNotifyEmail(),
    replyTo: booking.email,
    subject: `New booking — ${booking.name} · ${booking.date} ${booking.time}`,
    html: wrap("New booking", `${booking.name} just booked a call.`, booking),
    attachments: files,
  });

  if (owner.error) {
    throw new Error(owner.error.message || "Resend owner email failed");
  }

  return { skipped: false };
}
