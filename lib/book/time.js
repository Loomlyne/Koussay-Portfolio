import { TIME_SLOTS_24H, TIMEZONE_ZONES } from "@/lib/book/config";

const pendingStarts = new Set();

export function zoneOf(timezone) {
  return TIMEZONE_ZONES[timezone] || timezone || "Asia/Dubai";
}

export function parseClock(time) {
  const value = String(time ?? "")
    .trim()
    .toLowerCase();
  const match = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/.exec(value);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3];
  if (period === "pm" && hour < 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function tzParts(timeZone, utcMs) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(utcMs));
  const get = (type) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

export function slotStartMs(date, time, timezone) {
  const minutes = parseClock(time);
  if (minutes == null || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split("-").map(Number);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const wanted = Date.UTC(year, month - 1, day, hour, minute, 0);
  let utc = wanted;
  const timeZone = zoneOf(timezone);

  for (let i = 0; i < 4; i++) {
    const seen = tzParts(timeZone, utc);
    const asUtc = Date.UTC(
      seen.year,
      seen.month - 1,
      seen.day,
      seen.hour,
      seen.minute,
      0,
    );
    const diff = wanted - asUtc;
    if (diff === 0) return utc;
    utc += diff;
  }

  return utc;
}

export function notionDateValue(date, time, timezone) {
  const start = slotStartMs(date, time, timezone);
  if (start == null) return { start: date };
  return {
    start: new Date(start).toISOString(),
    time_zone: zoneOf(timezone),
  };
}

export function isSlotOpen(date, time, timezone, taken, now = Date.now()) {
  const start = slotStartMs(date, time, timezone);
  if (start == null || start <= now) return false;
  return !taken.has(start);
}

export function isDayOpen(date, timezone, taken, now = Date.now()) {
  return TIME_SLOTS_24H.some((time) =>
    isSlotOpen(date, time, timezone, taken, now),
  );
}

export function claimSlot(start) {
  if (start == null || pendingStarts.has(start)) return false;
  pendingStarts.add(start);
  return true;
}

export function releaseSlot(start) {
  pendingStarts.delete(start);
}

export function pendingSlotStarts() {
  return [...pendingStarts];
}
