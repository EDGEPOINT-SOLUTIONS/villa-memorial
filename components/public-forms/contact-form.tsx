"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  captureDemoInquiry,
  contactInquiryInput,
} from "@/lib/demo-inquiry-captures";
import {
  validateContact,
  type ContactValues,
  type FieldErrors,
} from "@/lib/public-forms/validation";

const EMPTY: ContactValues = {
  full_name: "",
  email: "",
  phone: "",
  message: "",
  consent: false,
};

/**
 * Public contact capture on the shared shell (numbered sections · hints ·
 * one action bar). The submit gate is lib/public-forms/validation.ts; a passed
 * submission lands in the DEMO-LOCAL inquiry store the staff board reads
 * (lib/demo-inquiry-captures.ts) because no crm-families contract exists.
 * The confirmation states plainly that nothing was sent to a server.
 */
export function ContactForm() {
  const [values, setValues] = useState<ContactValues>(EMPTY);
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
    // No service exists yet, but keep a perceivable pending beat so the
    // disabled state is visible (same simulated save as register-card).
    await new Promise((resolve) => setTimeout(resolve, 400));
    const inquiry = captureDemoInquiry(contactInquiryInput(values));
    setPending(false);
    setCaptured({ reference: inquiry.reference });
  }

  if (captured) {
    return (
      <div className="stack">
        <Alert tone="success" title="Message captured in this browser.">
          Your enquiry is recorded as <strong>{captured.reference}</strong> in the
          demo store this device keeps, so it shows on the staff inquiries board
          in this browser. <strong>Nothing was sent to a server</strong> — the
          records service is not connected in this build. For anything urgent,
          use the 24/7 assistance line in the header.
        </Alert>
        <div className="capture-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setCaptured(null);
              setValues(EMPTY);
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

      {/* 01 — Your details */}
      <section className="card capture-section">
        <div className="capture-section__head">
          <span className="capture-section__num" aria-hidden="true">
            01
          </span>
          <div>
            <h3 className="capture-section__title">Your details</h3>
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
            <h3 className="capture-section__title">Your message</h3>
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
