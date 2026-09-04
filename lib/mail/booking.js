import { Resend } from "resend";

import { bookingCopy } from "@/lib/book/confirmation";
import {
  bookingNotifyEmail,
  isResendConfigured,
  resendApiKey,
  resendFrom,
} from "@/lib/env";
import { SITE_NAME, SITE_URL } from "@/lib/site";

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
  const copy = bookingCopy(booking);
  return `<table style="width:100%;border-collapse:collapse;font-size:15px">
    ${copy.details.map(([label, value]) => row(label, value)).join("")}
  </table>`;
}

function wrap(title, booking, extra) {
  const copy = bookingCopy(booking);
  const intro = extra?.intro;
  const closing = extra?.closing ?? copy.closing;
  const lead = intro
    ? `<p style="margin:0 0 12px;line-height:1.5;color:#444">${escapeHtml(intro)}</p>`
    : `<p style="margin:0 0 8px;line-height:1.5;color:#444">${escapeHtml(copy.greeting)}</p>
      <p style="margin:0 0 12px;line-height:1.5;color:#444">${escapeHtml(copy.when)}</p>`;
  return `<!doctype html>
<html>
  <body style="margin:0;background:#fafafa;color:#0a0a0a;font-family:ui-sans-serif,system-ui,sans-serif">
    <div style="max-width:560px;margin:0 auto;padding:40px 24px">
      <img src="${SITE_URL}/logo.png" width="40" height="40" alt="${escapeHtml(SITE_NAME)}" style="display:block;margin:0 0 20px;border:0" />
      <p style="margin:0 0 8px;letter-spacing:0.08em;text-transform:uppercase;font-size:11px;color:#6b6b6b">${escapeHtml(SITE_NAME)}</p>
      <h1 style="margin:0 0 16px;font-size:28px;letter-spacing:-0.04em;font-weight:500">${escapeHtml(title)}</h1>
      ${lead}
      <p style="margin:0 0 28px;line-height:1.5;color:#444">${escapeHtml(copy.detailsLead)}</p>
      ${bookingTable(booking)}
      <p style="margin:28px 0 0;line-height:1.5;color:#444">${escapeHtml(closing)}</p>
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
    replyTo: bookingNotifyEmail(),
    subject: `You're booked — ${booking.date} ${booking.time}`,
    html: wrap("You're booked", booking),
  });

  if (visitor.error) {
    throw new Error(visitor.error.message || "Resend visitor email failed");
  }

  const owner = await resend.emails.send({
    from: resendFrom(),
    to: bookingNotifyEmail(),
    replyTo: booking.email,
    subject: `New booking — ${booking.name} · ${booking.date} ${booking.time}`,
    html: wrap("New booking", booking, {
      intro: `${booking.name} just booked a 1-hour call.`,
      closing: "Same note went to their inbox.",
    }),
    attachments: files,
  });

  if (owner.error) {
    throw new Error(owner.error.message || "Resend owner email failed");
  }

  return { skipped: false };
}
