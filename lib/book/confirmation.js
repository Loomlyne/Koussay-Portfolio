function firstName(name) {
  const first = String(name ?? "")
    .trim()
    .split(/\s+/)[0];
  return first || "there";
}

function formatDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return iso || "";
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function line(label, value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return [label, text];
}

export function bookingCopy(booking) {
  const date = formatDate(booking.date);
  const details = [
    line("Name", booking.name),
    line("Email", booking.email),
    line("Date", date),
    line("Time", `${booking.time} · ${booking.timezone} · 1 hour`),
    line("Company", booking.company),
    line("Website", booking.website),
    line("Help with", (booking.services || []).join(", ")),
    line("Budget", booking.budget),
    line("Deadline", booking.deadline),
    line(
      "Details",
      booking.details && booking.details !== "Skipped" ? booking.details : "",
    ),
    line("Attachment", booking.attachmentName),
  ].filter(Boolean);

  return {
    greeting: `Hi ${firstName(booking.name)} — you're booked for a 1-hour call.`,
    when: `${date} at ${booking.time} (${booking.timezone}).`,
    detailsLead: "Here's what you chose:",
    details,
    closing:
      "I'll come prepared. Reply to this email if anything needs to change.",
  };
}
