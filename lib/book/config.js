export const BOOK_STEP_COUNT = 11;

export const SERVICES = [
  "A site to show your work",
  "A website for your business",
  "A one-page website",
  "Brand identity",
  "App or product screens",
];

export const CURRENCIES = ["USD", "EUR", "AED"];

export const BUDGET_KEYS = ["under1k", "1k3k", "3k5k", "5k+", "unsure"];

const CURRENCY_MARK = {
  USD: "$",
  EUR: "€",
  AED: "AED ",
};

export function formatBudget(key, currency = "USD") {
  if (key === "unsure") return "Not sure yet";
  const mark = CURRENCY_MARK[currency] || CURRENCY_MARK.USD;
  if (currency === "AED") {
    if (key === "under1k") return `Under ${mark}4k`;
    if (key === "1k3k") return `${mark}4k – 11k`;
    if (key === "3k5k") return `${mark}11k – 18k`;
    if (key === "5k+") return `${mark}18k+`;
  }
  if (key === "under1k") return `Under ${mark}1k`;
  if (key === "1k3k") return `${mark}1k – ${mark}3k`;
  if (key === "3k5k") return `${mark}3k – ${mark}5k`;
  if (key === "5k+") return `${mark}5k+`;
  return "";
}

export function budgetKeyFromLabel(label) {
  const value = String(label ?? "").trim();
  if (!value) return "";
  for (const currency of CURRENCIES) {
    for (const key of BUDGET_KEYS) {
      if (formatBudget(key, currency) === value) return key;
    }
  }
  return "";
}

export function budgetOptions(currency = "USD") {
  return BUDGET_KEYS.map((key) => formatBudget(key, currency));
}

export const BUDGET_OPTIONS = CURRENCIES.flatMap((currency) =>
  budgetOptions(currency),
).filter((label, index, list) => list.indexOf(label) === index);

export const DEADLINE_OPTIONS = [
  "ASAP",
  "2 – 4 weeks",
  "1 – 2 months",
  "3 – 4 months",
  "Flexible",
];

export const TIMEZONES = [
  "Dubai/GST",
  "London/GMT",
  "New York/EST",
  "Los Angeles/PST",
  "Paris/CET",
];

export const TIMEZONE_ZONES = {
  "Dubai/GST": "Asia/Dubai",
  "London/GMT": "Europe/London",
  "New York/EST": "America/New_York",
  "Los Angeles/PST": "America/Los_Angeles",
  "Paris/CET": "Europe/Paris",
};

// 9am–7pm, hourly. A few hours per weekday read as already booked.
export const TIME_SLOTS_12H = [
  "9:00am",
  "10:00am",
  "11:00am",
  "12:00pm",
  "1:00pm",
  "2:00pm",
  "3:00pm",
  "4:00pm",
  "5:00pm",
  "6:00pm",
  "7:00pm",
];

export const SLOT_MINUTES = 60;

export const TIME_SLOTS_24H = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
];

// JS weekday: 0 Sunday … 6 Saturday. Hours are wall-clock on the picked date.
export const OCCUPIED_HOURS_BY_WEEKDAY = {
  0: [9, 13, 17],
  1: [10, 12, 15, 18],
  2: [9, 11, 14, 19],
  3: [12, 13, 16],
  4: [10, 14, 17, 18],
  5: [11, 15, 19],
  6: [9, 12, 16],
};

export const EMPTY_FORM = {
  name: "",
  email: "",
  timezone: "Dubai/GST",
  date: null,
  time: null,
  timeFormat: "12h",
  company: "",
  website: "",
  services: [],
  currency: "USD",
  budget: "",
  deadline: "",
  details: "",
  attachment: null,
};
