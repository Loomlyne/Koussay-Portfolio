"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import BrandMark from "@/components/BrandMark";
import BackToWorks from "@/components/BackToWorks";
import BookCalendar from "@/components/book/BookCalendar";
import BookProgress from "@/components/book/BookProgress";
import BookSelect from "@/components/book/BookSelect";
import {
  BOOK_FORM_STEPS,
  BOOK_STEP_COUNT,
  CURRENCIES,
  DEADLINE_OPTIONS,
  EMPTY_FORM,
  SERVICES,
  budgetKeyFromLabel,
  budgetOptions,
  formatBudget,
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
  const emailRef = useRef(null);
  const companyRef = useRef(null);

  const update = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  useEffect(() => {
    if (step !== 1) return;
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
        return (
          Boolean(form.date) &&
          Boolean(form.time) &&
          isSlotOpen(dateStamp(form.date), form.time, form.timezone, busy)
        );
      case 2:
        return (
          form.name.trim().length > 1 && EMAIL_PATTERN.test(form.email.trim())
        );
      case 3:
        return (
          form.services.length > 0 &&
          Boolean(form.budget) &&
          Boolean(form.deadline)
        );
      case 4:
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
          setStep(1);
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

  const hasExtras =
    form.details.trim().length > 0 ||
    Boolean(form.attachment) ||
    form.website.trim().length > 0;
  const lastStep = step === BOOK_STEP_COUNT - 1;

  const goBack = () => {
    if (step === 0 || submitting) return;
    flushSync(() => {
      setStep((current) => Math.max(current - 1, 0));
    });
    focusField(fieldRef.current);
  };

  const onNameEnter = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    focusField(emailRef.current);
  };

  const onEmailEnter = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (EMAIL_PATTERN.test(form.email.trim())) {
      focusField(companyRef.current);
    }
  };

  const onCompanyEnter = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    goNext();
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
        <div
          className={`${styles.panel} ${
            step === 1 || step === 3 ? styles.panelPacked : ""
          }`}
        >
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
              <h1 className={styles.heading}>Pick a time</h1>
              <BookCalendar
                value={form.date}
                timezone={form.timezone}
                busy={busy}
                time={form.time}
                timeFormat={form.timeFormat}
                onTimezoneChange={(timezone) =>
                  update({ timezone, time: null })
                }
                onChange={(date) => update({ date, time: null })}
                onTimeChange={(time) => update({ time })}
                onTimeFormatChange={(timeFormat) =>
                  update({ timeFormat, time: null })
                }
              />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h1 className={styles.heading}>Who&apos;s booking?</h1>
              <div className={styles.fieldStack}>
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
                    onKeyDown={onNameEnter}
                  />
                </label>
                <label className={styles.field}>
                  <span className="sr-only">Email</span>
                  <input
                    ref={emailRef}
                    className={styles.input}
                    type="email"
                    name="email"
                    autoComplete="email"
                    enterKeyHint="next"
                    inputMode="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={(event) => update({ email: event.target.value })}
                    onKeyDown={onEmailEnter}
                  />
                </label>
                <label className={styles.field}>
                  <span className="sr-only">Company (optional)</span>
                  <input
                    ref={companyRef}
                    className={styles.input}
                    type="text"
                    name="organization"
                    autoComplete="organization"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    placeholder="Company, or skip if it's just you"
                    value={form.company}
                    onChange={(event) =>
                      update({ company: event.target.value })
                    }
                    onKeyDown={onCompanyEnter}
                  />
                </label>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h1 className={styles.heading}>What&apos;s the project?</h1>
              <div className={styles.group}>
                <p className={styles.groupLabel}>What do you need?</p>
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
              </div>
              <div className={styles.group}>
                <p className={styles.groupLabel}>
                  Budget{" "}
                  <BookSelect
                    variant="inline"
                    value={form.currency}
                    options={CURRENCIES}
                    ariaLabel="Currency"
                    onChange={(currency) => {
                      const key = budgetKeyFromLabel(form.budget);
                      update({
                        currency,
                        budget: key ? formatBudget(key, currency) : "",
                      });
                    }}
                  />
                </p>
                <div className={styles.chipGrid}>
                  {budgetOptions(form.currency).map((option) => (
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
              </div>
              <div className={styles.group}>
                <p className={styles.groupLabel}>Deadline</p>
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
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <h1 className={styles.heading}>Anything else?</h1>
              <p className={styles.lead}>
                Optional — skip if you&apos;d rather talk it through on the
                call.
              </p>
              <div className={styles.fieldStack}>
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
                    onChange={(event) =>
                      update({ details: event.target.value })
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span className="sr-only">Website URL</span>
                  <input
                    className={styles.input}
                    type="url"
                    name="url"
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder="Website, if you have one"
                    value={form.website}
                    onChange={(event) =>
                      update({ website: event.target.value })
                    }
                  />
                </label>
              </div>
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
                {lastStep && !hasExtras ? (
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

      {step > 0 ? <BookProgress step={step} total={BOOK_FORM_STEPS} /> : null}
    </main>
  );
}
