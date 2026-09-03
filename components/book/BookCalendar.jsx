"use client";

import { useMemo, useState } from "react";

import { TIMEZONES } from "@/lib/book/config";

import styles from "@/app/book/page.module.css";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function sameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSelectable(day, today) {
  if (day < today) return false;
  const weekday = day.getDay();
  return weekday !== 0 && weekday !== 6;
}

export default function BookCalendar({
  value,
  onChange,
  timezone,
  onTimezoneChange,
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [view, setView] = useState(() => {
    const base = value ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const monthLabel = view.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const cells = useMemo(() => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const items = [];

    for (let i = 0; i < offset; i++) items.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      items.push(new Date(year, month, day));
    }

    return items;
  }, [view]);

  const shiftMonth = (delta) => {
    setView((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  return (
    <div className={styles.calendarCard}>
      <div className={styles.calendarHeader}>
        <div className={styles.calendarProfile}>
          <span className={styles.calendarAvatar} aria-hidden="true">
            K
          </span>
          <span className={styles.calendarName}>Koussay</span>
        </div>
        <label className={styles.timezoneField}>
          <span className="sr-only">Timezone</span>
          <select
            className={styles.timezoneSelect}
            value={timezone}
            onChange={(event) => onTimezoneChange(event.target.value)}
          >
            {TIMEZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.calendarMonth}>
        <button
          type="button"
          className={styles.calendarNav}
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
        >
          ←
        </button>
        <p className={styles.calendarMonthLabel}>{monthLabel}</p>
        <button
          type="button"
          className={styles.calendarNav}
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <div className={styles.calendarWeekdays}>
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className={styles.calendarGrid}>
        {cells.map((day, index) => {
          if (!day) {
            return <span key={`empty-${index}`} />;
          }

          const selectable = isSelectable(day, today);
          const selected = sameDay(day, value);

          return (
            <button
              key={day.toISOString()}
              type="button"
              className={`${styles.calendarDay} ${
                selected ? styles.calendarDaySelected : ""
              } ${selectable ? "" : styles.calendarDayDisabled}`}
              disabled={!selectable}
              onClick={() => onChange(day)}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
