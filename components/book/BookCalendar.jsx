"use client";

import { useMemo, useState } from "react";

import BookSelect from "@/components/book/BookSelect";
import { TIMEZONES } from "@/lib/book/config";
import { isDayOpen } from "@/lib/book/time";
import { dateStamp } from "@/lib/book/validate";

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
  return day >= today;
}

export default function BookCalendar({
  value,
  onChange,
  timezone,
  onTimezoneChange,
  busy,
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
    setView(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  };

  return (
    <div className={styles.calendarCard}>
      <div className={styles.calendarHeader}>
        <span className={styles.calendarName}>Koussay</span>
        <BookSelect
          value={timezone}
          options={TIMEZONES}
          onChange={onTimezoneChange}
          ariaLabel="Timezone"
        />
      </div>

      <div className={styles.calendarMonth}>
        <button
          type="button"
          className={styles.calendarNav}
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
        >
          <svg
            className={styles.calendarNavIcon}
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M7.5 2.25L4.25 6L7.5 9.75"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <p className={styles.calendarMonthLabel}>{monthLabel}</p>
        <button
          type="button"
          className={styles.calendarNav}
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
        >
          <svg
            className={styles.calendarNavIcon}
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4.5 2.25L7.75 6L4.5 9.75"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
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

          const selectable =
            isSelectable(day, today) &&
            isDayOpen(dateStamp(day), timezone, busy);
          const selected = sameDay(day, value);

          return (
            <button
              key={day.toISOString()}
              type="button"
              className={`${styles.calendarDay} ${
                selected ? styles.pickerSolid : ""
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
