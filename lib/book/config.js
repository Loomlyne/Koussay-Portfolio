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

// 10am–7pm, hourly. 1pm–3pm is rest and is not offered.
export const TIME_SLOTS_12H = [
  "10:00am",
  "11:00am",
  "12:00pm",
  "4:00pm",
  "5:00pm",
  "6:00pm",
  "7:00pm",
];

export const SLOT_MINUTES = 60;

export const TIME_SLOTS_24H = [
  "10:00",
  "11:00",
  "12:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
];

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
