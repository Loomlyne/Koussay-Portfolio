"use client";

import { useEffect, useId, useRef, useState } from "react";

import styles from "@/app/booking/page.module.css";

export default function BookSelect({
  value,
  options,
  onChange,
  ariaLabel,
  variant = "default",
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();
  const heading = variant === "heading";

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      className={`${styles.selectRoot} ${heading ? styles.headingSelect : ""}`}
      ref={rootRef}
    >
      <button
        type="button"
        className={heading ? styles.headingTrigger : styles.selectTrigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={heading ? styles.headingTriggerLabel : undefined}>
          {value}
        </span>
        <span
          className={heading ? styles.headingChevron : styles.selectChevron}
          aria-hidden="true"
        >
          {heading ? (
            <svg viewBox="0 0 12 12" fill="none">
              <path
                d="M2.25 4.5L6 8.25L9.75 4.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            "▾"
          )}
        </span>
      </button>

      {open ? (
        <ul
          id={listId}
          className={`${styles.selectMenu} ${
            heading ? styles.headingMenu : ""
          }`}
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map((option) => {
            const selected = option === value;
            return (
              <li key={option} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={`${styles.selectOption} ${
                    selected ? styles.pickerSolid : ""
                  }`}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  {option}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
