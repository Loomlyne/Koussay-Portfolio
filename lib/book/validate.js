import {
  BUDGET_OPTIONS,
  DEADLINE_OPTIONS,
  SERVICES,
  TIME_SLOTS_12H,
  TIME_SLOTS_24H,
  TIMEZONES,
} from "@/lib/book/config";
import { isSlotOpen, slotStartMs } from "@/lib/book/time";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
export const WEBSITE_ERROR =
  "That doesn't look like a website. Include a domain, like yourcompany.com.";

const TIME_SLOTS = new Set([...TIME_SLOTS_12H, ...TIME_SLOTS_24H]);
const HOST_PATTERN = /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i;

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

export function normalizeWebsite(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function websiteHost(value) {
  return String(value ?? "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .split(/[/?#]/)[0];
}

export function isWebsiteValid(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return true;
  const host = websiteHost(raw);
  return Boolean(host) && HOST_PATTERN.test(host);
}

export function issueForStep(step, form, busy = []) {
  switch (step) {
    case 1:
      return form.name.trim().length < 2 ? "Please enter your name." : "";
    case 2:
      return EMAIL_PATTERN.test(form.email.trim())
        ? ""
        : "Enter a valid email, like you@company.com.";
    case 3:
      return form.date ? "" : "Pick a day for the call.";
    case 4: {
      if (!form.time) return "Pick a time for the call.";
      if (
        !isSlotOpen(dateStamp(form.date), form.time, form.timezone, busy)
      ) {
        return "That time is no longer open. Pick another slot.";
      }
      return "";
    }
    case 5:
      return form.company.trim().length < 2
        ? "Please enter your company name."
        : "";
    case 6:
      return form.website.trim() && !isWebsiteValid(form.website)
        ? WEBSITE_ERROR
        : "";
    case 7:
      return form.services.length > 0
        ? ""
        : "Pick at least one thing you need.";
    case 8:
      return form.budget ? "" : "Pick a budget.";
    case 9:
      return form.deadline ? "" : "Pick a deadline.";
    default:
      return "";
  }
}

export function firstInvalidStep(form, busy = [], from = 1) {
  for (let step = from; step <= 9; step += 1) {
    if (issueForStep(step, form, busy)) return step;
  }
  return null;
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

  if (name.length < 2) {
    return { error: "Please enter your name.", step: 1, field: "name" };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return {
      error: "Enter a valid email, like you@company.com.",
      step: 2,
      field: "email",
    };
  }
  if (!isIsoDate(date)) {
    return { error: "Pick a day for the call.", step: 3, field: "date" };
  }
  if (!TIME_SLOTS.has(time)) {
    return { error: "Pick a time for the call.", step: 4, field: "time" };
  }
  if (!TIMEZONES.includes(timezone)) {
    return { error: "Pick a timezone.", step: 4, field: "timezone" };
  }
  const start = slotStartMs(date, time, timezone);
  if (start == null) {
    return { error: "Pick a time for the call.", step: 4, field: "time" };
  }
  if (start <= Date.now()) {
    return {
      error: "That time has already passed. Pick another slot.",
      step: 4,
      field: "time",
    };
  }
  if (company.length < 2) {
    return {
      error: "Please enter your company name.",
      step: 5,
      field: "company",
    };
  }
  if (website && !isWebsiteValid(website)) {
    return { error: WEBSITE_ERROR, step: 6, field: "website" };
  }
  if (
    services.length === 0 ||
    services.some((item) => !SERVICES.includes(item))
  ) {
    return {
      error: "Pick at least one thing you need.",
      step: 7,
      field: "services",
    };
  }
  if (!BUDGET_OPTIONS.includes(budget)) {
    return { error: "Pick a budget.", step: 8, field: "budget" };
  }
  if (!DEADLINE_OPTIONS.includes(deadline)) {
    return { error: "Pick a deadline.", step: 9, field: "deadline" };
  }

  return {
    booking: {
      name,
      email,
      date,
      time,
      timezone,
      company,
      website: normalizeWebsite(website),
      services,
      budget,
      deadline,
      details,
    },
  };
}
