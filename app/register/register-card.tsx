"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

type FieldErrors = {
  first_name?: string;
  last_name?: string;
  email?: string;
};

/**
 * Create-your-account card — the register half of the one identity grammar.
 *
 * It renders the same `.signin-card` shell as the three sign-in doors (public-
 * minimal identity pass, lane 4): one card, one commit action, labelled fields.
 * The form is fully wired UX-side, but no provisioning endpoint exists yet, so
 * submission completes with the honest demo success state and never implies an
 * account was created.
 */
export function RegisterCard() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errors: FieldErrors = {};
    if (!form.first_name.trim()) errors.first_name = "Enter your first name.";
    if (!form.last_name.trim()) errors.last_name = "Enter your last name.";
    if (!form.email.trim()) errors.email = "Enter the email address we can reach you on.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    // Simulated processing time so the submitting state is perceivable; no
    // network call exists yet (see page.tsx note).
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <div className="signin-card">
      <div className="signin-card__head">
        <p className="signin-card__eyebrow">Villa Memorial · Family</p>
        <h1 className="signin-card__title">Create your account</h1>
        <p className="signin-card__blurb">
          One account keeps your family&rsquo;s arrangement, papers and updates in one place.
        </p>
      </div>

      {submitted ? (
        <div className="stack-4">
          <Alert tone="success" title={`Thank you, ${form.first_name}.`}>
            Your registration request has been received. Our staff will contact
            you at <strong>{form.email}</strong> to complete setup.
          </Alert>
          <Link href="/login" className="btn btn--secondary btn--block">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="stack" noValidate>
          <div className="field-grid field-grid--2">
            <Field label="First name" htmlFor="reg-first" error={fieldErrors.first_name}>
              <input
                id="reg-first"
                className="input"
                autoComplete="given-name"
                value={form.first_name}
                onChange={(e) => {
                  setForm({ ...form, first_name: e.target.value });
                  setFieldErrors((prev) => ({ ...prev, first_name: undefined }));
                }}
                disabled={submitting}
              />
            </Field>
            <Field label="Last name" htmlFor="reg-last" error={fieldErrors.last_name}>
              <input
                id="reg-last"
                className="input"
                autoComplete="family-name"
                value={form.last_name}
                onChange={(e) => {
                  setForm({ ...form, last_name: e.target.value });
                  setFieldErrors((prev) => ({ ...prev, last_name: undefined }));
                }}
                disabled={submitting}
              />
            </Field>
          </div>
          <Field
            label="Email"
            htmlFor="reg-email"
            hint="We'll use this to reach you about your account."
            error={fieldErrors.email}
          >
            <input
              id="reg-email"
              className="input"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              disabled={submitting}
            />
          </Field>
          <Field
            label="Mobile number"
            htmlFor="reg-phone"
            hint="Optional — only if you want SMS updates from the park office."
          >
            <input
              id="reg-phone"
              className="input"
              type="tel"
              autoComplete="tel"
              placeholder="+63 …"
              value={form.phone}
              onChange={(e) => {
                setForm({ ...form, phone: e.target.value });
              }}
              disabled={submitting}
            />
          </Field>
          <Button type="submit" className="btn--block" disabled={submitting}>
            {submitting ? "Creating…" : "Create my account"}
          </Button>
        </form>
      )}

      <div className="signin-card__foot">
        <p className="text-sm text-muted">
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
