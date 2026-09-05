"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import BrandMark from "@/components/BrandMark";
import BackToWorks from "@/components/BackToWorks";
import BookCalendar from "@/components/book/BookCalendar";
import BookProgress from "@/components/book/BookProgress";
import BookSelect from "@/components/book/BookSelect";
import BookTimePicker from "@/components/book/BookTimePicker";
import {
  BOOK_STEP_COUNT,
  CURRENCIES,
  DEADLINE_OPTIONS,
  EMPTY_FORM,
  FIT_CHECKS,
  SERVICES,
  budgetKeyFromLabel,
  budgetOptions,
  formatBudget,
} from "@/lib/book/config";
import {
  clearLocalDraft,
  draftToForm,
  readLocalDraft,
  serializeDraft,
  writeLocalDraft,
} from "@/lib/book/draft";
import { bookStepHref, stepFromSlug } from "@/lib/book/steps";
import {
  dateStamp,
  firstInvalidStep,
  issueForStep,
} from "@/lib/book/validate";
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

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className={styles.formError} role="alert">
      {message}
    </p>
  );
}

function FitMark({ on }) {
  return (
    <span className={styles.fitMark} data-on={on || undefined} aria-hidden="true">
      <svg className={styles.fitCheck} viewBox="0 0 16 16">
        <path d="M3.6 8.2 6.6 11.1 12.4 4.9" />
      </svg>
    </span>
  );
}

export default function BookFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = stepFromSlug(searchParams.get("step"));
  const [form, setForm] = useState(EMPTY_FORM);
  const [draftId, setDraftId] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resumeSubmit, setResumeSubmit] = useState(false);
  const [busy, setBusy] = useState(() => []);
  const fieldRef = useRef(null);
  const restoredRef = useRef(false);

  const update = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
    setError("");
  };

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const saved = readLocalDraft();
    if (!saved) return;
    /* Restore once from localStorage after mount so a refresh keeps the draft. */
    /* eslint-disable react-hooks/set-state-in-effect */
    setForm((current) => draftToForm(saved, current));
    if (saved.id) setDraftId(saved.id);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

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

  const stepError = issueForStep(step, form, busy);

  const canContinue = useMemo(() => {
    if (step === 10) return true;
    if (step === 6) return !form.website.trim() || !stepError;
    return !stepError;
  }, [form.website, step, stepError]);

  const goToStep = (next) => {
    router.push(bookStepHref(next), { scroll: false });
    requestAnimationFrame(() => focusField(fieldRef.current));
  };

  const persistDraft = (nextStep, nextForm = form) => {
    const payload = serializeDraft(nextForm, nextStep, draftId);
    writeLocalDraft(payload);
    if (!payload.name && !payload.email) return;

    fetch("/api/book/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((response) => response.json().catch(() => ({})))
      .then((data) => {
        if (typeof data?.id === "string" && data.id) {
          setDraftId(data.id);
          writeLocalDraft({ ...payload, id: data.id });
        }
      })
      .catch(() => {
        // Local draft is enough if Notion is down.
      });
  };

  const returnToIssue = (issueStep, message) => {
    setResumeSubmit(true);
    setError(message);
    goToStep(issueStep);
  };

  const submit = async () => {
    if (submitting) return;

    const invalid = firstInvalidStep(form, busy);
    if (invalid != null) {
      returnToIssue(invalid, issueForStep(invalid, form, busy));
      return;
    }

    setError("");
    setResumeSubmit(false);
    setSubmitting(true);

    const body = new FormData();
    body.append(
      "payload",
      JSON.stringify({
        fit: form.fit,
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
        draftId,
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
        if (typeof data.step === "number") {
          const nextForm =
            response.status === 409 ? { ...form, time: null } : form;
          if (response.status === 409) update({ time: null });
          returnToIssue(
            data.step,
            data.error || issueForStep(data.step, nextForm, nextBusy || busy),
          );
          return;
        }
        setError(data.error || "Could not send this booking.");
        return;
      }
      clearLocalDraft();
      setSubmitted(true);
      router.replace("/book?step=done", { scroll: false });
    } catch {
      setError("Could not send this booking. Check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const advanceFrom = (current) => {
    if (resumeSubmit) {
      const invalid = firstInvalidStep(form, busy, current + 1);
      if (invalid != null) {
        goToStep(invalid);
        setError(issueForStep(invalid, form, busy));
        return;
      }
      setResumeSubmit(false);
      goToStep(BOOK_STEP_COUNT - 1);
      return;
    }
    goToStep(Math.min(current + 1, BOOK_STEP_COUNT - 1));
  };

  const goNext = () => {
    if (submitting) return;
    const issue = issueForStep(step, form, busy);
    if (issue) {
      setError(issue);
      return;
    }

    persistDraft(Math.min(step + 1, BOOK_STEP_COUNT - 1));

    if (step === BOOK_STEP_COUNT - 1) {
      submit();
      return;
    }

    setError("");
    advanceFrom(step);
  };

  const hasProjectNotes =
    form.details.trim().length > 0 || Boolean(form.attachment);
  const lastStep = step === BOOK_STEP_COUNT - 1;

  const goBack = () => {
    if (step === 0 || submitting) return;
    persistDraft(step - 1);
    goToStep(Math.max(step - 1, 0));
  };

  const onFieldEnter = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    goNext();
  };

  const skipWebsite = () => {
    const nextForm = { ...form, website: "" };
    update({ website: "" });
    persistDraft(7, nextForm);
    setError("");
    if (resumeSubmit) {
      const invalid = firstInvalidStep(nextForm, busy, 7);
      if (invalid != null) {
        goToStep(invalid);
        setError(issueForStep(invalid, nextForm, busy));
        return;
      }
      setResumeSubmit(false);
      goToStep(BOOK_STEP_COUNT - 1);
      return;
    }
    goToStep(7);
  };

  if (submitted) {
    return (
      <main className={styles.page}>
        <BrandMark className={styles.brandMark} />
        <div className={styles.stage} data-lenis-prevent>
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
      <div className={styles.stage} data-lenis-prevent>
        <div className={styles.panel}>
          {step === 0 ? (
            <>
              <h1 className={`${styles.heading} ${styles.headingFit}`}>
                Let&apos;s make sure we&apos;re a good fit
              </h1>
              <p className={styles.lead}>
                Select both before we book a 1-hour call.
              </p>
              <div className={styles.fitList} role="group" aria-label="Fit">
                {FIT_CHECKS.map((check, index) => {
                  const active = form.fit.includes(check.key);
                  return (
                    <button
                      key={check.key}
                      type="button"
                      className={`${styles.fitItem} ${
                        active ? styles.fitItemOn : ""
                      }`}
                      aria-pressed={active}
                      onClick={() =>
                        update({ fit: toggleService(form.fit, check.key) })
                      }
                    >
                      <span className={styles.fitIndex} aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className={styles.fitCopy}>
                        <span className={styles.fitTitle}>{check.title}</span>
                        <span className={styles.fitBody}>{check.body}</span>
                      </span>
                      <FitMark on={active} />
                    </button>
                  );
                })}
              </div>
              <FieldError message={error && stepError ? error : ""} />
              <div className={styles.introActions}>
                <BackToWorks
                  arrow={false}
                  className={`${styles.primaryButton} ${styles.soloButton}`}
                />
                <button
                  type="button"
                  className={`${styles.primaryButton} ${
                    canContinue
                      ? styles.primaryButtonActive
                      : styles.continueButtonDisabled
                  } ${styles.soloButton}`}
                  disabled={!canContinue}
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
                  className={`${styles.input} ${
                    error && stepError ? styles.inputError : ""
                  }`}
                  type="text"
                  name="name"
                  autoComplete="name"
                  autoCapitalize="words"
                  autoCorrect="off"
                  enterKeyHint="next"
                  placeholder="Your name..."
                  value={form.name}
                  aria-invalid={Boolean(error && stepError)}
                  onChange={(event) => update({ name: event.target.value })}
                  onKeyDown={onFieldEnter}
                />
              </label>
              <FieldError message={error && stepError ? error : ""} />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h1 className={styles.heading}>What is your best email?</h1>
              <label className={styles.field}>
                <span className="sr-only">Email</span>
                <input
                  ref={fieldRef}
                  className={`${styles.input} ${
                    error && stepError ? styles.inputError : ""
                  }`}
                  type="email"
                  name="email"
                  autoComplete="email"
                  enterKeyHint="next"
                  inputMode="email"
                  placeholder="you@company.com"
                  value={form.email}
                  aria-invalid={Boolean(error && stepError)}
                  onChange={(event) => update({ email: event.target.value })}
                  onKeyDown={onFieldEnter}
                />
              </label>
              <FieldError message={error && stepError ? error : ""} />
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
                  className={`${styles.input} ${
                    error && stepError ? styles.inputError : ""
                  }`}
                  type="text"
                  name="organization"
                  autoComplete="organization"
                  autoCapitalize="words"
                  enterKeyHint="next"
                  placeholder="Your company name..."
                  value={form.company}
                  aria-invalid={Boolean(error && stepError)}
                  onChange={(event) => update({ company: event.target.value })}
                  onKeyDown={onFieldEnter}
                />
              </label>
              <FieldError message={error && stepError ? error : ""} />
            </>
          ) : null}

          {step === 6 ? (
            <>
              <h1 className={styles.heading}>What is your website URL?</h1>
              <label className={styles.field}>
                <span className="sr-only">Website URL</span>
                <input
                  ref={fieldRef}
                  className={`${styles.input} ${
                    error && stepError ? styles.inputError : ""
                  }`}
                  type="text"
                  name="website"
                  inputMode="url"
                  enterKeyHint="next"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="yourcompany.com"
                  value={form.website}
                  aria-invalid={Boolean(error && stepError)}
                  onChange={(event) => update({ website: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    if (form.website.trim()) goNext();
                    else skipWebsite();
                  }}
                />
              </label>
              <FieldError message={error && stepError ? error : ""} />
            </>
          ) : null}

          {step === 7 ? (
            <>
              <h1 className={styles.heading}>What do you need?</h1>
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
              <h1 className={`${styles.heading} ${styles.headingWithSelect}`}>
                What is your budget for the project?{" "}
                <BookSelect
                  variant="heading"
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
              </h1>
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
                  <div className={styles.websiteActions}>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={skipWebsite}
                      disabled={submitting}
                    >
                      Skip for now
                    </button>
                    {form.website.trim() ? (
                      <button
                        type="button"
                        className={`${styles.continueButton} ${styles.continueButtonActive}`}
                        onClick={goNext}
                        disabled={submitting}
                      >
                        Continue
                      </button>
                    ) : null}
                  </div>
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
              {step !== 1 &&
              step !== 2 &&
              step !== 5 &&
              step !== 6 &&
              error ? (
                <p className={styles.formError}>{error}</p>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <BookProgress step={step} total={BOOK_STEP_COUNT} />
    </main>
  );
}
