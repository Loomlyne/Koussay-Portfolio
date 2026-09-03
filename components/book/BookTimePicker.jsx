"use client";

import {
  TIME_SLOTS_12H,
  TIME_SLOTS_24H,
} from "@/lib/book/config";

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
  onChange,
  timeFormat,
  onTimeFormatChange,
}) {
  const slots = timeFormat === "24h" ? TIME_SLOTS_24H : TIME_SLOTS_12H;

  return (
    <div className={styles.calendarCard}>
      <div className={styles.calendarHeader}>
        <div className={styles.calendarProfile}>
          <span className={styles.calendarAvatar} aria-hidden="true">
            K
          </span>
          <span className={styles.calendarName}>Koussay</span>
        </div>
        <div className={styles.timeToggle} role="group" aria-label="Time format">
          {["12h", "24h"].map((format) => (
            <button
              key={format}
              type="button"
              className={`${styles.timeToggleButton} ${
                timeFormat === format ? styles.timeToggleButtonActive : ""
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

      <div className={styles.timeGrid}>
        {slots.map((slot) => (
          <button
            key={slot}
            type="button"
            className={`${styles.timeSlot} ${
              value === slot ? styles.timeSlotSelected : ""
            }`}
            onClick={() => onChange(slot)}
          >
            {slot}
          </button>
        ))}
      </div>
    </div>
  );
}
