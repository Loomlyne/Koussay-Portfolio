"use client";

import { TIME_SLOTS_12H, TIME_SLOTS_24H } from "@/lib/book/config";
import { isSlotOpen } from "@/lib/book/time";
import { dateStamp } from "@/lib/book/validate";

import styles from "@/app/book/page.module.css";

function formatSelectedDate(date) {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function BookTimePicker({
  date,
  timezone,
  value,
  busy,
  onChange,
  timeFormat,
  onTimeFormatChange,
}) {
  const slots = timeFormat === "24h" ? TIME_SLOTS_24H : TIME_SLOTS_12H;
  const iso = dateStamp(date);
  const openSlots = slots.filter((slot) =>
    isSlotOpen(iso, slot, timezone, busy),
  );

  return (
    <div className={styles.calendarCard}>
      <div className={styles.calendarHeader}>
        <span className={styles.calendarName}>Koussay</span>
        <div
          className={styles.timeToggle}
          role="group"
          aria-label="Time format"
        >
          {["12h", "24h"].map((format) => (
            <button
              key={format}
              type="button"
              className={`${styles.timeToggleButton} ${
                timeFormat === format ? styles.pickerSolid : ""
              }`}
              onClick={() => onTimeFormatChange(format)}
            >
              {format}
            </button>
          ))}
        </div>
      </div>

      <p className={styles.timeMeta}>
        {timezone} · {formatSelectedDate(date)}
      </p>

      {openSlots.length === 0 ? (
        <p className={styles.timeEmpty}>
          No times left this day. Go back and pick another date.
        </p>
      ) : (
        <div className={styles.timeGrid}>
          {slots.map((slot) => {
            const open = isSlotOpen(iso, slot, timezone, busy);
            return (
              <button
                key={slot}
                type="button"
                className={`${styles.timeSlot} ${
                  value === slot ? styles.pickerSolid : ""
                } ${open ? "" : styles.timeSlotDisabled}`}
                disabled={!open}
                onClick={() => onChange(slot)}
              >
                {slot}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
