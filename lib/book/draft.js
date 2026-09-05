import { FIT_KEYS, SERVICES } from "@/lib/book/config";
import { slugFromStep, stepFromSlug } from "@/lib/book/steps";
import { dateStamp } from "@/lib/book/validate";

export const BOOK_DRAFT_KEY = "koussay-book-draft";

export function serializeDraft(form, step, id = "") {
  return {
    id: String(id || "").trim(),
    step: slugFromStep(step),
    fit: Array.isArray(form.fit)
      ? form.fit.filter((item) => FIT_KEYS.includes(item))
      : [],
    name: String(form.name ?? "").trim(),
    email: String(form.email ?? "").trim(),
    date: dateStamp(form.date),
    time: form.time || "",
    timezone: form.timezone || "Dubai/GST",
    timeFormat: form.timeFormat === "24h" ? "24h" : "12h",
    company: String(form.company ?? "").trim(),
    website: String(form.website ?? "").trim(),
    services: Array.isArray(form.services)
      ? form.services.filter((item) => SERVICES.includes(item))
      : [],
    currency: form.currency || "USD",
    budget: form.budget || "",
    deadline: form.deadline || "",
    details: String(form.details ?? "").trim(),
  };
}

export function sanitizeDraft(input) {
  const draft = serializeDraft(input, stepFromSlug(input?.step), input?.id);
  draft.name = draft.name.slice(0, 200);
  draft.email = draft.email.slice(0, 200);
  draft.company = draft.company.slice(0, 200);
  draft.website = draft.website.slice(0, 300);
  draft.details = draft.details.slice(0, 4000);
  return draft;
}

export function draftToForm(draft, current = {}) {
  return {
    ...current,
    fit: draft.fit || [],
    name: draft.name || "",
    email: draft.email || "",
    timezone: draft.timezone || current.timezone || "Dubai/GST",
    date: draft.date ? new Date(`${draft.date}T12:00:00`) : null,
    time: draft.time || null,
    timeFormat: draft.timeFormat === "24h" ? "24h" : "12h",
    company: draft.company || "",
    website: draft.website || "",
    services: draft.services || [],
    currency: draft.currency || "USD",
    budget: draft.budget || "",
    deadline: draft.deadline || "",
    details: draft.details || "",
    attachment: current.attachment ?? null,
  };
}

export function readLocalDraft() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BOOK_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return sanitizeDraft(parsed);
  } catch {
    return null;
  }
}

export function writeLocalDraft(draft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BOOK_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Private mode or full storage should not block the flow.
  }
}

export function clearLocalDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(BOOK_DRAFT_KEY);
  } catch {
    // Ignore.
  }
}
