"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import BrandMark from "@/components/BrandMark";
import BackToWorks from "@/components/BackToWorks";
import BookCalendar from "@/components/book/BookCalendar";
import BookProgress from "@/components/book/BookProgress";
import BookTimePicker from "@/components/book/BookTimePicker";
import {
  BOOK_STEP_COUNT,
  BUDGET_OPTIONS,
  DEADLINE_OPTIONS,
  EMPTY_FORM,
  SERVICES,
} from "@/lib/book/config";
import { dateStamp, EMAIL_PATTERN } from "@/lib/book/validate";
import { busyFromResponse, isSlotOpen } from "@/lib/book/time";

import styles from "@/app/book/page.module.css";

function focusField(node) {
  if (!node) return;
  node.focus();
}

function toggleService(list, service) {
  return list.includes(service)
    ? list.filter((item) => item !== service)
    : [...list, service];
}

export default function BookFlow() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(() => []);
  const fieldRef = useRef(null);

  const update = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  useEffect(() => {
    if (step !== 3 && step !== 4) return;
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/book/availability", {
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        const nextBusy = busyFromResponse(data);
        if (cancelled || !nextBusy) return;
        setBusy(nextBusy);
        setForm((current) => {
          if (!current.date || !current.time) return current;
          if (
            isSlotOpen(
              dateStamp(current.date),
              current.time,
              current.timezone,
              nextBusy,
            )
          ) {
            return current;
          }
          return { ...current, time: null };
        });
      } catch {
        // Keep the last known set; the submit path still re-checks.
      }
    };

    load();
    const timer = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [step]);

  const canContinue = useMemo(() => {
    switch (step) {
      case 0:
        return true;
      case 1:
        return form.name.trim().length > 1;
      case 2:
        return EMAIL_PATTERN.test(form.email.trim());
      case 3:
        return Boolean(form.date);
      case 4:
        return (
          Boolean(form.time) &&
          isSlotOpen(dateStamp(form.date), form.time, form.timezone, busy)
        );
      case 5:
        return form.company.trim().length > 1;
      case 6:
        return true;
      case 7:
        return form.services.length > 0;
      case 8:
        return Boolean(form.budget);
      case 9:
        return Boolean(form.deadline);
      case 10:
        return true;
      default:
        return false;
    }
  }, [form, step, busy]);

  const submit = async () => {
    if (submitting) return;
    setError("");
    setSubmitting(true);

    const body = new FormData();
    body.append(
      "payload",
      JSON.stringify({
        name: form.name,
        email: form.email,
        date: dateStamp(form.date),
        time: form.time,
        timezone: form.timezone,
        company: form.company,
        website: form.website,
        services: form.services,
        budget: form.budget,
        deadline: form.deadline,
        details: form.details,
      }),
    );
    if (form.attachment) body.append("attachment", form.attachment);

    try {
      const response = await fetch("/api/book", {
        method: "POST",
        body,
      });
      const data = await response.json().catch(() => ({}));
      const nextBusy = busyFromResponse(data);
      if (nextBusy) setBusy(nextBusy);
      if (!response.ok) {
        if (response.status === 409) {
          setStep(4);
          update({ time: null });
        }
        setError(data.error || "Could not send this booking.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Could not send this booking. Check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = () => {
    if (!canContinue || submitting) return;
    if (step === BOOK_STEP_COUNT - 1) {
      submit();
      return;
    }
    // Flush before focusing so iOS still treats this as the tap that
    // opened the field, and the keyboard comes up with it.
    flushSync(() => {
      setStep((current) => Math.min(current + 1, BOOK_STEP_COUNT - 1));
    });
    focusField(fieldRef.current);
  };

  const hasProjectNotes =
    form.details.trim().length > 0 || Boolean(form.attachment);
  const lastStep = step === BOOK_STEP_COUNT - 1;

  const goBack = () => {
    if (step === 0 || submitting) return;
    flushSync(() => {
      setStep((current) => Math.max(current - 1, 0));
    });
    focusField(fieldRef.current);
  };

  const onFieldEnter = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    goNext();
  };

  const skipWebsite = () => {
    update({ website: "" });
    setStep(7);
  };

  if (submitted) {
    return (
      <main className={styles.page}>
        <BrandMark className={styles.brandMark} />
        <div className={styles.stage}>
          <div className={styles.panel}>
            <h1 className={styles.heading}>Thank you</h1>
            <p className={styles.lead}>
              Your booking is in. We emailed the details to {form.email}.
            </p>
            <BackToWorks
              arrow={false}
              className={`${styles.primaryButton} ${styles.primaryButtonActive} ${styles.soloButton}`}
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <BrandMark className={styles.brandMark} />
      <div className={styles.stage}>
        <div className={styles.panel}>
          {step === 0 ? (
            <>
              <h1 className={styles.heading}>Let&apos;s talk</h1>
              <p className={styles.lead}>
                Book a 1-hour call and let&apos;s figure out if we&apos;re the
                right fit for your project.
              </p>
              <div className={styles.introActions}>
                <BackToWorks
                  arrow={false}
                  className={`${styles.primaryButton} ${styles.soloButton}`}
                />
                <button
                  type="button"
                  className={`${styles.primaryButton} ${styles.primaryButtonActive} ${styles.soloButton}`}
                  onClick={goNext}
                >
                  Start a project
                </button>
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <h1 className={styles.heading}>What is your name?</h1>
              <label className={styles.field}>
                <span className="sr-only">Your name</span>
                <input
                  ref={fieldRef}
                  className={styles.input}
                  type="text"
                  name="name"
                  autoComplete="name"
                  autoCapitalize="words"
                  autoCorrect="off"
                  enterKeyHint="next"
                  placeholder="Your name..."
                  value={form.name}
                  onChange={(event) => update({ name: event.target.value })}
                  onKeyDown={onFieldEnter}
                />
              </label>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h1 className={styles.heading}>What is your best email?</h1>
              <label className={styles.field}>
                <span className="sr-only">Email</span>
                <input
                  ref={fieldRef}
                  className={styles.input}
                  type="email"
                  name="email"
                  autoComplete="email"
                  enterKeyHint="next"
                  inputMode="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={(event) => update({ email: event.target.value })}
                  onKeyDown={onFieldEnter}
                />
              </label>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h1 className={styles.heading}>Choose a day</h1>
              <BookCalendar
                value={form.date}
                timezone={form.timezone}
                busy={busy}
                onTimezoneChange={(timezone) =>
                  update({ timezone, time: null })
                }
                onChange={(date) => update({ date, time: null })}
              />
            </>
          ) : null}

          {step === 4 ? (
            <>
              <h1 className={styles.heading}>Choose a time</h1>
              <BookTimePicker
                date={form.date}
                timezone={form.timezone}
                value={form.time}
                busy={busy}
                timeFormat={form.timeFormat}
                onTimeFormatChange={(timeFormat) =>
                  update({ timeFormat, time: null })
                }
                onChange={(time) => update({ time })}
              />
            </>
          ) : null}

          {step === 5 ? (
            <>
              <h1 className={styles.heading}>
                What is the name of your company?
              </h1>
              <label className={styles.field}>
                <span className="sr-only">Company name</span>
                <input
                  ref={fieldRef}
                  className={styles.input}
                  type="text"
                  name="organization"
                  autoComplete="organization"
                  autoCapitalize="words"
                  enterKeyHint="next"
                  placeholder="Your company name..."
                  value={form.company}
                  onChange={(event) => update({ company: event.target.value })}
                  onKeyDown={onFieldEnter}
                />
              </label>
            </>
          ) : null}

          {step === 6 ? (
            <>
              <h1 className={styles.heading}>What is your website URL?</h1>
              <label className={styles.field}>
                <span className="sr-only">Website URL</span>
                <input
                  ref={fieldRef}
                  className={styles.input}
                  type="url"
                  name="url"
                  inputMode="url"
                  enterKeyHint="next"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="https://yourcompany.com"
                  value={form.website}
                  onChange={(event) => update({ website: event.target.value })}
                  onKeyDown={onFieldEnter}
                />
              </label>
            </>
          ) : null}

          {step === 7 ? (
            <>
              <h1 className={styles.heading}>How can we help?</h1>
              <div className={styles.chipGrid}>
                {SERVICES.map((service) => {
                  const active = form.services.includes(service);
                  return (
                    <button
                      key={service}
                      type="button"
                      className={`${styles.chip} ${
                        active ? styles.pickerSolid : ""
                      }`}
                      onClick={() =>
                        update({
                          services: toggleService(form.services, service),
                        })
                      }
                    >
                      {service}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {step === 8 ? (
            <>
              <h1 className={styles.heading}>
                What is your budget for the project?
              </h1>
              <div className={styles.chipGrid}>
                {BUDGET_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`${styles.chip} ${
                      form.budget === option ? styles.pickerSolid : ""
                    }`}
                    onClick={() => update({ budget: option })}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 9 ? (
            <>
              <h1 className={styles.heading}>
                What is your deadline for the project?
              </h1>
              <div className={styles.chipGrid}>
                {DEADLINE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`${styles.chip} ${
                      form.deadline === option ? styles.pickerSolid : ""
                    }`}
                    onClick={() => update({ deadline: option })}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 10 ? (
            <>
              <h1 className={styles.heading}>
                Tell us more about your project
              </h1>
              <p className={styles.lead}>
                Optional — skip if you&apos;d rather talk it through on the
                call.
              </p>
              <label className={styles.field}>
                <span className="sr-only">Project details</span>
                <textarea
                  ref={fieldRef}
                  className={`${styles.input} ${styles.textarea}`}
                  name="details"
                  rows={5}
                  enterKeyHint="enter"
                  placeholder="Share goals, scope, references, or anything else that helps us prepare."
                  value={form.details}
                  onChange={(event) => update({ details: event.target.value })}
                />
              </label>
              <div className={styles.attachField}>
                <input
                  id="book-attachment"
                  className={styles.attachInput}
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.key,.zip,image/*"
                  onChange={(event) =>
                    update({ attachment: event.target.files?.[0] ?? null })
                  }
                />
                <label
                  htmlFor="book-attachment"
                  className={styles.attachButton}
                >
                  {form.attachment ? form.attachment.name : "Attach document"}
                </label>
                {form.attachment ? (
                  <button
                    type="button"
                    className={styles.attachClear}
                    onClick={() => update({ attachment: null })}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </>
          ) : null}

          {step > 0 ? (
            <>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={goBack}
                  disabled={submitting}
                >
                  Back
                </button>
                {step === 6 ? (
                  <button
                    type="button"
                    className={
                      form.website.trim()
                        ? `${styles.continueButton} ${styles.continueButtonActive}`
                        : styles.primaryButton
                    }
                    onClick={form.website.trim() ? goNext : skipWebsite}
                    disabled={submitting}
                  >
                    {form.website.trim() ? "Continue" : "Skip for now"}
                  </button>
                ) : lastStep && !hasProjectNotes ? (
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={goNext}
                    disabled={submitting}
                  >
                    {submitting ? "Sending..." : "Skip for now"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`${styles.continueButton} ${
                      canContinue && !submitting
                        ? styles.continueButtonActive
                        : styles.continueButtonDisabled
                    }`}
                    disabled={!canContinue || submitting}
                    onClick={goNext}
                  >
                    {submitting
                      ? "Sending..."
                      : lastStep
                        ? "Submit"
                        : "Continue"}
                  </button>
                )}
              </div>
              {error ? <p className={styles.formError}>{error}</p> : null}
            </>
          ) : null}
        </div>
      </div>

      <BookProgress step={step} total={BOOK_STEP_COUNT} />
    </main>
  );
}
