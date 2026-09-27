"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  validateContact,
  type ContactValues,
  type FieldErrors,
} from "@/lib/public-forms/validation";
import {
  requestMessage,
  type RequestPrefill,
} from "@/lib/public-forms/request-prefill";

const EMPTY: ContactValues = {
  full_name: "",
  email: "",
  phone: "",
  message: "",
  consent: false,
};

/** Initial form values for a visit: a request link prefills the message. */
function initialValues(prefill: RequestPrefill | null): ContactValues {
  return prefill ? { ...EMPTY, message: requestMessage(prefill) } : EMPTY;
}

/**
 * Public contact capture on the shared shell (numbered sections · hints ·
 * one action bar). The submit gate is lib/public-forms/validation.ts, run here for
 * field feedback and again on the server as the veto; a passed submission is
 * POSTed to `POST /api/inquiries`, which records it in the office's durable
 * journal (lib/api-client/inquiry-store.ts). The staff inquiries board reads the
 * same journal, so a message appears there as soon as it is sent.
 *
 * No frozen crm-families contract exists, so live mode refuses with a named 503
 * and the form tells the family to call — it never claims a delivery that did not
 * happen.
 *
 * `prefill` comes from a storefront "Request order" link
 * (lib/public-forms/request-prefill.ts): the banner echoes the exact item, SKU
 * and published figure the visitor clicked and the message asks the office to
 * confirm — it never claims a reservation or a purchase.
 */
export function ContactForm({ prefill = null }: { prefill?: RequestPrefill | null }) {
  const [values, setValues] = useState<ContactValues>(() => initialValues(prefill));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [captured, setCaptured] = useState<{ reference: string } | null>(null);

  function change<K extends keyof ContactValues>(key: K, value: ContactValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateContact(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setFormError("Please complete the highlighted fields.");
      return;
    }
    setErrors({});
    setFormError(null);
    setPending(true);
    try {
      // 2026-09-27: this posts to the office. It used to write the message into this
      // visitor's own browser and say so — so a family's message reached nobody in the
      // office at all. `POST /api/inquiries` is the record now.
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "contact", values }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const body = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};

      if (!response.ok) {
        const message =
          typeof body.error === "string" ? body.error : "Your message could not be sent.";
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
        "Your message could not be sent — check your connection and try again, or call the 24/7 assistance line and we will take the details by phone.",
      );
    } finally {
      setPending(false);
    }
  }

  if (captured) {
    return (
      <div className="stack">
        <Alert tone="success" title="Your message has reached the office.">
          {prefill ? (
            <>
              Your request for <strong>{prefill.item}</strong> is recorded as{" "}
              <strong>{captured.reference}</strong>
            </>
          ) : (
            <>
              Your enquiry is recorded as <strong>{captured.reference}</strong>
            </>
          )}{" "}
          and the office can see it now. A coordinator replies to the contact details
          you gave. This is not a reservation or a purchase. For anything urgent, use
          the 24/7 assistance line in the header.
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
            Send another message
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="stack" noValidate>
      {formError ? (
        <Alert tone="danger" title="Could not send">
          {formError}
        </Alert>
      ) : null}

      {prefill ? (
        <section className="request-context" aria-label="What you are requesting">
          <p className="request-context__lead">You are asking about</p>
          <h2 className="request-context__item">{prefill.item}</h2>
          <dl className="request-context__facts">
            {prefill.sku ? (
              <div className="request-context__fact">
                <dt>Catalogue SKU</dt>
                <dd>
                  <code>{prefill.sku}</code>
                </dd>
              </div>
            ) : null}
            {prefill.price ? (
              <div className="request-context__fact">
                <dt>Published 2026 price</dt>
                <dd>{prefill.price}</dd>
              </div>
            ) : null}
            {prefill.note ? (
              <div className="request-context__fact">
                <dt>Details</dt>
                <dd>{prefill.note}</dd>
              </div>
            ) : null}
          </dl>
          <p className="text-sm text-muted">
            This is an enquiry — it does not reserve the item or complete a
            purchase. The office confirms availability and the final price.
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
            <p className="capture-section__blurb">How the care team reaches you back.</p>
          </div>
        </div>
        <div className="capture-section__body">
          <div className="field-grid field-grid--3">
            <Field label="Your name" htmlFor="ct-name" error={errors.full_name}>
              <input
                id="ct-name"
                name="full_name"
                autoComplete="name"
                disabled={pending}
                value={values.full_name}
                onChange={(e) => change("full_name", e.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="ct-email" error={errors.email}>
              <input
                id="ct-email"
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
              htmlFor="ct-phone"
              hint="Optional — only if you would rather we call."
              error={errors.phone}
            >
              <input
                id="ct-phone"
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

      {/* 02 — Your message */}
      <section className="card capture-section">
        <div className="capture-section__head">
          <span className="capture-section__num" aria-hidden="true">
            02
          </span>
          <div>
            <h2 className="capture-section__title">Your message</h2>
            <p className="capture-section__blurb">
              A few lines are enough — the coordinator will ask for the rest.
            </p>
          </div>
        </div>
        <div className="capture-section__body">
          <div className="field-grid field-grid--1">
            <Field label="How can we help?" htmlFor="ct-message" error={errors.message}>
              <textarea
                id="ct-message"
                name="message"
                rows={5}
                placeholder="Tell us what you need — a plan, a lot, a service, or just guidance."
                disabled={pending}
                value={values.message}
                onChange={(e) => change("message", e.target.value)}
              />
            </Field>
          </div>
          <label className="check-row check-row--consent">
            <input
              type="checkbox"
              id="ct-consent"
              name="consent"
              disabled={pending}
              checked={values.consent}
              onChange={(e) => change("consent", e.target.checked)}
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={errors.consent ? "ct-consent-hint ct-consent-error" : "ct-consent-hint"}
            />
            <span>I consent to Villa Memorial storing these details to answer my enquiry.</span>
          </label>
          <span className="field__hint" id="ct-consent-hint">
            Data Privacy Act consent — required before an enquiry is stored.
          </span>
          {errors.consent ? (
            <span className="field__error" role="alert" id="ct-consent-error">
              {errors.consent}
            </span>
          ) : null}
        </div>
      </section>

      <div className="capture-actions">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}
