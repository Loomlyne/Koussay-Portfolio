import {
  BUDGET_OPTIONS,
  DEADLINE_OPTIONS,
  SERVICES,
  TIME_SLOTS_12H,
  TIME_SLOTS_24H,
  TIMEZONES,
} from "@/lib/book/config";
import { isHeldSlot, slotStartMs } from "@/lib/book/time";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;

const TIME_SLOTS = new Set([...TIME_SLOTS_12H, ...TIME_SLOTS_24H]);

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function dateStamp(date) {
  if (!date) return "";
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function validateBooking(input) {
  const name = String(input.name ?? "").trim();
  const email = String(input.email ?? "").trim();
  const date = String(input.date ?? "").trim();
  const time = String(input.time ?? "").trim();
  const timezone = String(input.timezone ?? "").trim();
  const company = String(input.company ?? "").trim();
  const website = String(input.website ?? "").trim();
  const budget = String(input.budget ?? "").trim();
  const deadline = String(input.deadline ?? "").trim();
  const details = String(input.details ?? "").trim();
  const services = Array.isArray(input.services)
    ? input.services.map((item) => String(item).trim()).filter(Boolean)
    : [];

  if (name.length < 2) return { error: "Name is required." };
  if (!EMAIL_PATTERN.test(email))
    return { error: "A valid email is required." };
  if (!isIsoDate(date)) return { error: "Pick a date." };
  if (!TIME_SLOTS.has(time)) return { error: "Pick a time." };
  if (!TIMEZONES.includes(timezone)) return { error: "Pick a timezone." };
  const start = slotStartMs(date, time, timezone);
  if (start == null) return { error: "Pick a time." };
  if (start <= Date.now()) return { error: "That time has already passed." };
  if (isHeldSlot(date, time)) return { error: "That time is already booked." };
  if (
    website &&
    !/^https?:\/\//i.test(website) &&
    !/^[^\s]+\.[^\s]+$/.test(website)
  ) {
    return { error: "Website looks off." };
  }
  if (
    services.length === 0 ||
    services.some((item) => !SERVICES.includes(item))
  ) {
    return { error: "Pick at least one way we can help." };
  }
  if (!BUDGET_OPTIONS.includes(budget)) return { error: "Pick a budget." };
  if (!DEADLINE_OPTIONS.includes(deadline))
    return { error: "Pick a deadline." };

  const href =
    website && !/^https?:\/\//i.test(website) ? `https://${website}` : website;

  return {
    booking: {
      name,
      email,
      date,
      time,
      timezone,
      company,
      website: href,
      services,
      budget,
      deadline,
      details,
    },
  };
}
