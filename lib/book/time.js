import { SLOT_MINUTES, TIME_SLOTS_24H, TIMEZONE_ZONES } from "@/lib/book/config";

const pendingStarts = new Set();
const DAY_MS = 24 * 60 * 60 * 1000;

export const SLOT_MS = SLOT_MINUTES * 60 * 1000;

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

function pad(value) {
  return String(value).padStart(2, "0");
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
  const get = (type) => Number(parts.find((part) => part.type === type)?.value);
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

function wallDateTime(date, minutes) {
  const dayShift = Math.floor(minutes / (24 * 60));
  const mins = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  let year;
  let month;
  let day;
  if (dayShift) {
    const [y, m, d] = date.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + dayShift));
    year = next.getUTCFullYear();
    month = next.getUTCMonth() + 1;
    day = next.getUTCDate();
  } else {
    [year, month, day] = date.split("-").map(Number);
  }
  return `${year}-${pad(month)}-${pad(day)}T${pad(Math.floor(mins / 60))}:${pad(mins % 60)}:00`;
}

export function notionDateValue(date, time, timezone) {
  const minutes = parseClock(time);
  if (minutes == null) return { start: date };
  return {
    start: wallDateTime(date, minutes),
    end: wallDateTime(date, minutes + SLOT_MINUTES),
    time_zone: zoneOf(timezone),
  };
}

export function parseNotionInstant(value, timezone) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (!raw.includes("T")) return null;
  if (/Z$|[+-]\d{2}:\d{2}$/.test(raw)) {
    const ms = Date.parse(raw);
    return Number.isFinite(ms) ? ms : null;
  }
  const [isoDate, clock] = raw.split("T");
  const time = (clock || "").slice(0, 5);
  return slotStartMs(isoDate, time, timezone || "Asia/Dubai");
}

export function allDayBusy(startDate, endDate, timezone) {
  const zone = timezone || "Asia/Dubai";
  const start = slotStartMs(startDate, "00:00", zone);
  const last = /^\d{4}-\d{2}-\d{2}$/.test(endDate || "") ? endDate : startDate;
  const end = slotStartMs(last, "00:00", zone);
  if (start == null || end == null) return null;
  return { start, end: end + DAY_MS };
}

export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

export function asBusyList(busy) {
  if (Array.isArray(busy)) return busy;
  if (busy instanceof Set) {
    return [...busy].map((start) => ({ start, end: start + SLOT_MS }));
  }
  return [];
}

export function isBusy(start, end, busy) {
  return asBusyList(busy).some(
    (range) =>
      Number.isFinite(range.start) &&
      Number.isFinite(range.end) &&
      rangesOverlap(start, end, range.start, range.end),
  );
}

export function isSlotOpen(date, time, timezone, busy, now = Date.now()) {
  const start = slotStartMs(date, time, timezone);
  if (start == null || start <= now) return false;
  return !isBusy(start, start + SLOT_MS, busy);
}

export function isDayOpen(date, timezone, busy, now = Date.now()) {
  return TIME_SLOTS_24H.some((time) =>
    isSlotOpen(date, time, timezone, busy, now),
  );
}

export function busyFromResponse(data) {
  if (Array.isArray(data?.busy)) {
    return data.busy
      .map((item) => ({
        start: Number(item.start),
        end: Number(item.end),
      }))
      .filter(
        (item) => Number.isFinite(item.start) && Number.isFinite(item.end),
      );
  }
  if (Array.isArray(data?.taken)) {
    return data.taken
      .map((value) => Number(value))
      .filter((start) => Number.isFinite(start))
      .map((start) => ({ start, end: start + SLOT_MS }));
  }
  return null;
}

export function pendingBusy() {
  return [...pendingStarts].map((start) => ({ start, end: start + SLOT_MS }));
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
