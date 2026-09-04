export const BOOK_STEP_COUNT = 11;

export const SERVICES = [
  "Full website",
  "Landing page",
  "Product UI/UX",
  "Product development",
  "Branding",
];

export const BUDGET_OPTIONS = [
  "Under $5k",
  "$5k – $15k",
  "$15k – $30k",
  "$30k – $60k",
  "$60k+",
  "Not sure yet",
];

export const DEADLINE_OPTIONS = [
  "ASAP",
  "1 – 2 months",
  "3 – 4 months",
  "5 – 6 months",
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

export const TIME_SLOTS_12H = [
  "6:00pm",
  "7:00pm",
  "8:00pm",
  "9:00pm",
  "10:00pm",
];

export const SLOT_MINUTES = 60;

export const TIME_SLOTS_24H = ["18:00", "19:00", "20:00", "21:00", "22:00"];

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
  budget: "",
  deadline: "",
  details: "",
  attachment: null,
};
