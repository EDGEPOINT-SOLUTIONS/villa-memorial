"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  APPOINTMENT_REASONS,
  APPOINTMENT_TIMES,
  validateAppointment,
  type AppointmentValues,
  type FieldErrors,
} from "@/lib/public-forms/validation";

const EMPTY: AppointmentValues = {
  full_name: "",
  email: "",
  phone: "",
  reason: APPOINTMENT_REASONS[0],
  preferred_date: "",
  preferred_time: "",
  notes: "",
};

/**
 * Public appointment request on the shared shell. The gate is
 * lib/public-forms/validation.ts and the reason list there is PROVISIONAL (no
 * shared taxonomy exists). NO persistence and NO delivery: the scheduling
 * service does not exist, so a passed submission is confirmed plainly as not
 * sent — the screen must never imply a booking was made.
 */
export function AppointmentForm() {
  const [values, setValues] = useState<AppointmentValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function change<K extends keyof AppointmentValues>(key: K, value: AppointmentValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateAppointment(values);
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
          stored</strong>: the scheduling service is not connected in this build,
          so no slot was reserved. To book a visit now, use the 24/7 assistance
          line in the header.
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
        <Alert tone="danger" title="Could not request the appointment">
          {formError}
        </Alert>
      ) : null}

      {/* 01 — Who is visiting */}
      <section className="card capture-section">
        <div className="capture-section__head">
          <span className="capture-section__num" aria-hidden="true">
            01
          </span>
          <div>
            <h3 className="capture-section__title">Who is visiting</h3>
            <p className="capture-section__blurb">The coordinator greets you by name.</p>
          </div>
        </div>
        <div className="capture-section__body">
          <div className="field-grid field-grid--3">
            <Field label="Your name" htmlFor="ap-name" error={errors.full_name}>
              <input
                id="ap-name"
                name="full_name"
                autoComplete="name"
                disabled={pending}
                value={values.full_name}
                onChange={(e) => change("full_name", e.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="ap-email" error={errors.email}>
              <input
                id="ap-email"
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
              htmlFor="ap-phone"
              hint="The office confirms the slot on this number."
              error={errors.phone}
            >
              <input
                id="ap-phone"
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

      {/* 02 — When and why */}
      <section className="card capture-section">
        <div className="capture-section__head">
          <span className="capture-section__num" aria-hidden="true">
            02
          </span>
          <div>
            <h3 className="capture-section__title">When and why</h3>
            <p className="capture-section__blurb">
              Pick the reason and a preferred slot; the office confirms by phone or email.
            </p>
          </div>
        </div>
        <div className="capture-section__body">
          <div className="field-grid field-grid--3">
            <Field label="Reason for the visit" htmlFor="ap-reason">
              <select
                id="ap-reason"
                name="reason"
                disabled={pending}
                value={values.reason}
                onChange={(e) => change("reason", e.target.value)}
              >
                {APPOINTMENT_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Preferred date" htmlFor="ap-date" error={errors.preferred_date}>
              <input
                id="ap-date"
                name="preferred_date"
                type="date"
                disabled={pending}
                value={values.preferred_date}
                onChange={(e) => change("preferred_date", e.target.value)}
              />
            </Field>
            <Field label="Preferred time" htmlFor="ap-time" error={errors.preferred_time}>
              <select
                id="ap-time"
                name="preferred_time"
                disabled={pending}
                value={values.preferred_time}
                onChange={(e) => change("preferred_time", e.target.value)}
              >
                <option value="">—</option>
                {APPOINTMENT_TIMES.map((time) => (
                  <option key={time.value} value={time.value}>
                    {time.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="field-grid field-grid--1">
            <Field
              label="What should the coordinator prepare?"
              htmlFor="ap-notes"
              hint="Optional — e.g. lot options in a particular section."
            >
              <textarea
                id="ap-notes"
                name="notes"
                rows={4}
                disabled={pending}
                value={values.notes}
                onChange={(e) => change("notes", e.target.value)}
              />
            </Field>
          </div>
        </div>
      </section>

      <div className="capture-actions">
        <Button type="submit" disabled={pending}>
          {pending ? "Requesting…" : "Request appointment"}
        </Button>
      </div>
    </form>
  );
}
