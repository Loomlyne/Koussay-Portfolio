function trim(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function notionToken() {
  return trim(process.env.NOTION_TOKEN);
}

export function notionProjectsDatabaseId() {
  return trim(process.env.NOTION_PROJECTS_DATABASE_ID);
}

export function notionBookingsDatabaseId() {
  return trim(process.env.NOTION_BOOKINGS_DATABASE_ID);
}

export function notionWebhookSecret() {
  return trim(process.env.NOTION_WEBHOOK_SECRET);
}

export function resendApiKey() {
  return trim(process.env.RESEND_API_KEY);
}

export function resendFrom() {
  return trim(process.env.RESEND_FROM);
}

export function bookingNotifyEmail() {
  return trim(process.env.BOOKING_NOTIFY_EMAIL);
}

export function isNotionProjectsConfigured() {
  return Boolean(notionToken() && notionProjectsDatabaseId());
}

export function isNotionBookingsConfigured() {
  return Boolean(notionToken() && notionBookingsDatabaseId());
}

export function isResendConfigured() {
  return Boolean(resendApiKey() && resendFrom() && bookingNotifyEmail());
}

export function isBookingConfigured() {
  return isNotionBookingsConfigured() || isResendConfigured();
}
