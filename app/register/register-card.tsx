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
    <div className="auth-card">
      <div className="auth-card__brand">
        <h1>Villa Memorial</h1>
        <p>Create your family account</p>
      </div>

      <div className="auth-card__body">
        {submitted ? (
          <div className="stack-4">
            <Alert tone="success" title={`Thank you, ${form.first_name}.`}>
              Your registration request has been received. Our staff will contact
              you at <strong>{form.email}</strong> to complete setup.
            </Alert>
            <Link href="/login" className="btn btn--secondary">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="stack" noValidate>
            <div className="field-grid field-grid--2">
              <Field label="First name" htmlFor="reg-first" error={fieldErrors.first_name}>
                <input
                  id="reg-first"
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
                type="tel"
                autoComplete="tel"
                placeholder="+63 …"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                disabled={submitting}
              />
            </Field>
            <Button type="submit" className="btn--block" disabled={submitting}>
              {submitting ? "Sending…" : "Create my account"}
            </Button>
          </form>
        )}
      </div>

      <div className="auth-card__footer">
        Already registered? <Link href="/login">Sign in</Link>
      </div>
    </div>
  );
}
