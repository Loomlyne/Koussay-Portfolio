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

export function notionCalendarDatabaseId() {
  return trim(process.env.NOTION_CALENDAR_DATABASE_ID);
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

export function openaiApiKey() {
  return trim(process.env.OPENAI_API_KEY);
}

export function openaiModel() {
  return trim(process.env.OPENAI_MODEL) || "gpt-4o-mini";
}

export function geminiApiKey() {
  return (
    trim(process.env.GEMINI_API_KEY) ||
    trim(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  );
}

export function geminiModel() {
  return trim(process.env.GEMINI_MODEL) || "gemini-2.5-flash";
}

export function firecrawlApiKey() {
  return trim(process.env.FIRECRAWL_API_KEY);
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
