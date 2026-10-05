import { readdirSync } from "node:fs";

// Realistic key shapes only: minified code must not trip them.
export const KEY_PATTERNS = {
  resend: /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/,
  notion: /\b(?:ntn_|secret_)[A-Za-z0-9]{40,}/,
  openai: /\bsk-[A-Za-z0-9_-]{20,}/,
  google: /\bAIza[A-Za-z0-9_-]{35}/,
  firecrawl: /\bfc-[a-f0-9]{32}\b/,
};

export const ENV_NAMES = [
  "NOTION_TOKEN",
  "NOTION_BOOKINGS_DATABASE_ID",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "BOOKING_NOTIFY_EMAIL",
  "FIRECRAWL_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "OPENAI_API_KEY",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "HF_CREDENTIALS",
  "ADMIN_EMAIL",
];

/** Pattern names that match the text. Never returns a matched value. */
export function scanText(text) {
  return Object.entries(KEY_PATTERNS)
    .filter(([, re]) => re.test(text))
    .map(([name]) => name);
}

/**
 * Entry names inside the production, development and test objects of
 * OpenNext's next-env.mjs. Empty objects mean no .env value was baked in.
 */
export function envFileDefaults(text) {
  const found = new Set();
  const objects = text.matchAll(
    /export\s+const\s+(?:production|development|test)\s*=\s*\{([\s\S]*?)\}\s*;/g,
  );
  for (const [, body] of objects) {
    for (const [, key] of body.matchAll(
      /["']?([A-Za-z_][A-Za-z0-9_]*)["']?\s*:/g,
    )) {
      found.add(key);
    }
  }
  // Prefer a known name when the body is not plain `KEY:` syntax.
  for (const name of ENV_NAMES) {
    if (
      /export\s+const\s+(?:production|development|test)\s*=\s*\{[^}]*\}/.test(
        text,
      ) &&
      new RegExp(`${name}\\s*["']?\\s*:`).test(text)
    ) {
      found.add(name);
    }
  }
  return [...found];
}

/** Env files that must not exist in a deploy build folder. */
export function preflight(dir) {
  return readdirSync(dir).filter(
    (name) =>
      name === ".env" ||
      name === ".dev.vars" ||
      (name.startsWith(".env.") && name !== ".env.example") ||
      name.startsWith(".dev.vars."),
  );
}
