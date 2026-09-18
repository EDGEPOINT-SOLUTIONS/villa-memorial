"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  QUOTE_INTERESTS,
  validateQuote,
  type FieldErrors,
  type QuoteValues,
} from "@/lib/public-forms/validation";

const EMPTY: QuoteValues = {
  full_name: "",
  email: "",
  phone: "",
  interest: QUOTE_INTERESTS[0],
  notes: "",
  consent: false,
};

/**
 * Public quote request on the shared shell. The gate is
 * lib/public-forms/validation.ts. NO persistence and NO delivery: the
 * quotation service does not exist, so a passed submission is confirmed
 * plainly as not sent — the screen must never imply otherwise.
 */
export function QuoteForm() {
  const [values, setValues] = useState<QuoteValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function change<K extends keyof QuoteValues>(key: K, value: QuoteValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateQuote(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setFormError("Please complete the highlighted fields.");
      return;
    }
    setErrors({});
    setFormError(null);
    setPending(true);
    // No service exists to await; keep a perceivable pending beat so the
    // disabled state is visible (same simulated save as register-card).
    await new Promise((resolve) => setTimeout(resolve, 400));
    setPending(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="stack">
        <Alert tone="warning" title="Request checked — nothing was sent.">
          Your details passed validation, but <strong>nothing was transmitted or
          stored</strong>: the quotation service is not connected in this build,
          so there is no contract to receive this request yet. For a written
          quotation now, use the 24/7 assistance line in the header or visit the
          park office.
        </Alert>
        <div className="capture-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSubmitted(false);
              setValues(EMPTY);
            }}
          >
            Back to the form
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="stack" noValidate>
      {formError ? (
        <Alert tone="danger" title="Could not request the quote">
          {formError}
        </Alert>
      ) : null}

      {/* 01 — What the quote is for */}
      <section className="card capture-section">
        <div className="capture-section__head">
          <span className="capture-section__num" aria-hidden="true">
            01
          </span>
          <div>
            <h2 className="capture-section__title">What the quote is for</h2>
            <p className="capture-section__blurb">
              Pick the closest interest — the office confirms the details.
            </p>
          </div>
        </div>
        <div className="capture-section__body">
          <div className="field-grid field-grid--2">
            <Field label="Your name" htmlFor="qr-name" error={errors.full_name}>
              <input
                id="qr-name"
                name="full_name"
                autoComplete="name"
                disabled={pending}
                value={values.full_name}
                onChange={(e) => change("full_name", e.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="qr-email" error={errors.email}>
              <input
                id="qr-email"
                name="email"
                type="email"
                autoComplete="email"
                disabled={pending}
                value={values.email}
                onChange={(e) => change("email", e.target.value)}
              />
            </Field>
          </div>
          <div className="field-grid field-grid--2">
            <Field
              label="Phone"
              htmlFor="qr-phone"
              hint="Optional — speeds up a callback."
              error={errors.phone}
            >
              <input
                id="qr-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+63 …"
                disabled={pending}
                value={values.phone}
                onChange={(e) => change("phone", e.target.value)}
              />
            </Field>
            <Field label="I’m interested in" htmlFor="qr-interest">
              <select
                id="qr-interest"
                name="interest"
                disabled={pending}
                value={values.interest}
                onChange={(e) => change("interest", e.target.value)}
              >
                {QUOTE_INTERESTS.map((interest) => (
                  <option key={interest} value={interest}>
                    {interest}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </section>

      {/* 02 — Anything we should know? */}
      <section className="card capture-section">
        <div className="capture-section__head">
          <span className="capture-section__num" aria-hidden="true">
            02
          </span>
          <div>
            <h2 className="capture-section__title">Anything we should know?</h2>
            <p className="capture-section__blurb">
              Preferred area, budget, timing — the details that shape the quote.
            </p>
          </div>
        </div>
        <div className="capture-section__body">
          <div className="field-grid field-grid--1">
            <Field label="Notes" htmlFor="qr-notes">
              <textarea
                id="qr-notes"
                name="notes"
                rows={4}
                placeholder="Preferred area, budget, timing…"
                disabled={pending}
                value={values.notes}
                onChange={(e) => change("notes", e.target.value)}
              />
            </Field>
          </div>
          <label className="check-row check-row--consent">
            <input
              type="checkbox"
              id="qr-consent"
              name="consent"
              disabled={pending}
              checked={values.consent}
              onChange={(e) => change("consent", e.target.checked)}
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={errors.consent ? "qr-consent-hint qr-consent-error" : "qr-consent-hint"}
            />
            <span>I consent to Villa Memorial using these details to prepare my quote.</span>
          </label>
          <span className="field__hint" id="qr-consent-hint">
            Data Privacy Act consent — required before the office prepares your quote.
          </span>
          {errors.consent ? (
            <span className="field__error" role="alert" id="qr-consent-error">
              {errors.consent}
            </span>
          ) : null}
        </div>
      </section>

      <div className="capture-actions">
        <Button type="submit" disabled={pending}>
          {pending ? "Requesting…" : "Request quote"}
        </Button>
      </div>
    </form>
  );
}
