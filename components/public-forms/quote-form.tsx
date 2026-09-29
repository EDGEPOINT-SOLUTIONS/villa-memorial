"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { BRAND_NAME } from "@/lib/brand";
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
 * TWO MODES, ONE FORM (the office's quote-basket direction, 2026-09-29):
 *  · `onAdd` set — the form is the ADD STEP of the quote basket: its fields stay
 *    exactly as they were, but the submit adds this line to the basket instead
 *    of sending it on its own ("Request quote" becomes "Add to my quote");
 *  · `onAdd` unset — the form sends a single inquiry as it always has.
 *
 * The submit gate is lib/public-forms/validation.ts, run here for field-level
 * feedback and again on the server as the veto. A sent submission is POSTed to
 * `POST /api/inquiries`, which records it in the office's durable journal
 * (lib/api-client/inquiry-store.ts) and hands back the reference the family is
 * shown. The staff inquiries board reads the same journal, so a request appears
 * there as soon as it is sent.
 *
 * No frozen crm-families contract exists, so live mode refuses with a named 503
 * rather than pretending: the form then tells the family to call, and never
 * claims a delivery that did not happen.
 */
export function QuoteForm({
  prefill = null,
  onAdd,
  addLabel = "Add to my quote",
}: {
  prefill?: RequestPrefill | null;
  /** When set, the submit adds the line to the quote basket instead of sending. */
  onAdd?: (values: QuoteValues) => void;
  addLabel?: string;
}) {
  const [values, setValues] = useState<QuoteValues>(() => initialValues(prefill));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [captured, setCaptured] = useState<{ reference: string } | null>(null);
  const [addedName, setAddedName] = useState<string | null>(null);

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
    // THE ADD STEP: this line joins the quote basket; the basket sends the whole
    // inquiry later, so the family can ask about several things at once.
    if (onAdd) {
      setAddedName(values.service || prefill?.item || "This request");
      onAdd(values);
      setValues(initialValues(prefill));
      return;
    }
    setPending(true);
    try {
      // 2026-09-27: this posts to the office. It used to call
      // `captureDemoInquiry`, which wrote the request into THIS VISITOR'S BROWSER and
      // told them plainly that nothing had been sent — so a family asking for a
      // quotation reached nobody. The server is the record now.
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "quote", values }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const body = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};

      if (!response.ok) {
        // The server's own sentence, verbatim — never a generic "something went wrong".
        const message =
          typeof body.error === "string" ? body.error : "Your request could not be sent.";
        if (typeof body.fieldErrors === "object" && body.fieldErrors !== null) {
          setErrors(body.fieldErrors as Record<string, string>);
        }
        setFormError(message);
        return;
      }

      const inquiry = body.inquiry as { reference?: unknown } | undefined;
      setCaptured({
        reference: typeof inquiry?.reference === "string" ? inquiry.reference : "",
      });
    } catch {
      setFormError(
        "Your request could not be sent — check your connection and try again, or call the 24/7 assistance line and we will take the details by phone.",
      );
    } finally {
      setPending(false);
    }
  }

  if (addedName) {
    return (
      <div className="stack">
        <Alert tone="success" title="Added to your quote.">
          <strong>{addedName}</strong> is in your quote. Add anything else your family is
          asking about, then send the whole list in one go below. Nothing is reserved and
          nothing is ordered — the office confirms every quotation by hand.
        </Alert>
        <div className="capture-actions">
          <Button type="button" variant="secondary" onClick={() => setAddedName(null)}>
            Add another item
          </Button>
        </div>
      </div>
    );
  }

  if (captured) {
    return (
      <div className="stack">
        <Alert tone="success" title="Your request has reached the office.">
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
          and the office can see it now. A coordinator prepares the quotation and replies
          to the contact details you gave. For anything urgent, use the 24/7 assistance
          line.
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
            <span>I consent to {BRAND_NAME} using these details to prepare my quote.</span>
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
          {pending ? "Requesting…" : onAdd ? addLabel : "Request quote"}
        </Button>
      </div>
    </form>
  );
}
