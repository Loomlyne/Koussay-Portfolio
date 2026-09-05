export const BOOK_STEPS = [
  { index: 0, slug: "start" },
  { index: 1, slug: "name" },
  { index: 2, slug: "email" },
  { index: 3, slug: "day" },
  { index: 4, slug: "time" },
  { index: 5, slug: "company" },
  { index: 6, slug: "website" },
  { index: 7, slug: "services" },
  { index: 8, slug: "budget" },
  { index: 9, slug: "deadline" },
  { index: 10, slug: "details" },
];

const BY_SLUG = new Map(BOOK_STEPS.map((step) => [step.slug, step]));
const BY_INDEX = new Map(BOOK_STEPS.map((step) => [step.index, step]));

export function stepFromSlug(slug) {
  const value = String(slug ?? "")
    .trim()
    .toLowerCase();
  if (!value || value === "start" || value === "done") return 0;
  return BY_SLUG.get(value)?.index ?? 0;
}

export function slugFromStep(index) {
  return BY_INDEX.get(index)?.slug ?? "start";
}

export function bookStepHref(index) {
  const slug = slugFromStep(index);
  return slug === "start" ? "/book" : `/book?step=${slug}`;
}
