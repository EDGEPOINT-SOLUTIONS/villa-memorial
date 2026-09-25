"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { captureDemoInquiry, quoteInquiryInput } from "@/lib/demo-inquiry-captures";
import {
  QUOTE_INTERESTS,
  validateQuote,
  type FieldErrors,
  type QuoteValues,
} from "@/lib/public-forms/validation";
import type { RequestPrefill } from "@/lib/public-forms/request-prefill";

const EMPTY: QuoteValues = {
  full_name: "",
  email: "",
  phone: "",
  service: "",
  preferred_date: "",
  notes: "",
  consent: false,
};

/** A Request-for-Quote link prefills the service it carried. */
function initialValues(prefill: RequestPrefill | null): QuoteValues {
  return prefill ? { ...EMPTY, service: prefill.item } : EMPTY;
}

/**
 * Public Request-for-Quote form on the shared capture shell.
 *
 * The funeral-service surfaces no longer publish a price: each service sends
 * the visitor here with the service they clicked, and this form records what
 * the office needs to prepare a customised quotation — the client's name and
 * contact details, the requested service, a preferred date when one applies,
 * and any additional requirements.
 *
 * The submit gate is lib/public-forms/validation.ts. A passed submission lands
 * in the DEMO-LOCAL inquiry store the staff board reads
 * (lib/demo-inquiry-captures.ts) because no crm-families contract exists, so
 * the confirmation states plainly that nothing was sent to a server.
 */
export function QuoteForm({ prefill = null }: { prefill?: RequestPrefill | null }) {
  const [values, setValues] = useState<QuoteValues>(() => initialValues(prefill));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [captured, setCaptured] = useState<{ reference: string } | null>(null);

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
    // disabled state is visible (same simulated save as the contact form).
    await new Promise((resolve) => setTimeout(resolve, 400));
    const inquiry = captureDemoInquiry(quoteInquiryInput(values));
    setPending(false);
    setCaptured({ reference: inquiry.reference });
  }

  if (captured) {
    return (
      <div className="stack">
        <Alert tone="success" title="Quote request captured in this browser.">
          {prefill ? (
            <>
              Your request for <strong>{prefill.item}</strong> is recorded as{" "}
              <strong>{captured.reference}</strong>
            </>
          ) : (
            <>
              Your quote request is recorded as <strong>{captured.reference}</strong>
            </>
          )}{" "}
          in the demo store this device keeps, so it shows on the staff inquiries
          board in this browser. <strong>Nothing was sent to a server</strong> — the
          records service is not connected in this build, so the office has not yet
          received it. For anything urgent, use the 24/7 assistance line.
        </Alert>
        <div className="capture-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setCaptured(null);
              setValues(initialValues(prefill));
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

      {prefill ? (
        <section className="request-context" aria-label="What you are asking about">
          <p className="request-context__lead">You are asking for a quote on</p>
          <h2 className="request-context__item">{prefill.item}</h2>
          {prefill.note ? (
            <dl className="request-context__facts">
              <div className="request-context__fact">
                <dt>Details</dt>
                <dd>{prefill.note}</dd>
              </div>
            </dl>
          ) : null}
          <p className="text-sm text-muted">
            This is an enquiry — the office prepares a written quotation from it.
          </p>
        </section>
      ) : null}

      {/* 01 — Your details */}
      <section className="card capture-section">
        <div className="capture-section__head">
          <span className="capture-section__num" aria-hidden="true">
            01
          </span>
          <div>
            <h2 className="capture-section__title">Your details</h2>
            <p className="capture-section__blurb">How the office reaches you back.</p>
          </div>
        </div>
        <div className="capture-section__body">
          <div className="field-grid field-grid--3">
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
          </div>
        </div>
      </section>

      {/* 02 — The service the quote is for */}
      <section className="card capture-section">
        <div className="capture-section__head">
          <span className="capture-section__num" aria-hidden="true">
            02
          </span>
          <div>
            <h2 className="capture-section__title">What the quote is for</h2>
            <p className="capture-section__blurb">
              The service you picked, or a few words about what you need.
            </p>
          </div>
        </div>
        <div className="capture-section__body">
          <div className="field-grid field-grid--2">
            <Field
              label="Service you are asking about"
              htmlFor="qr-service"
              hint="Prefilled when you came from a service page."
              error={errors.service}
            >
              <input
                id="qr-service"
                name="service"
                list="qr-service-options"
                disabled={pending}
                value={values.service}
                onChange={(e) => change("service", e.target.value)}
              />
            </Field>
            <Field
              label="Preferred date"
              htmlFor="qr-date"
              hint="Optional — if the date matters."
              error={errors.preferred_date}
            >
              <input
                id="qr-date"
                name="preferred_date"
                type="date"
                disabled={pending}
                value={values.preferred_date}
                onChange={(e) => change("preferred_date", e.target.value)}
              />
            </Field>
          </div>
          <datalist id="qr-service-options">
            {QUOTE_INTERESTS.map((interest) => (
              <option key={interest} value={interest} />
            ))}
          </datalist>
        </div>
      </section>

      {/* 03 — Anything we should know? */}
      <section className="card capture-section">
        <div className="capture-section__head">
          <span className="capture-section__num" aria-hidden="true">
            03
          </span>
          <div>
            <h2 className="capture-section__title">Additional requirements</h2>
            <p className="capture-section__blurb">
              Tell us what matters to your family — the office quotes from this.
            </p>
          </div>
        </div>
        <div className="capture-section__body">
          <div className="field-grid field-grid--1">
            <Field label="Anything else we should know?" htmlFor="qr-notes">
              <textarea
                id="qr-notes"
                name="notes"
                rows={4}
                placeholder="Timing, venue, budget, who to ask for…"
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
