"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export function RegisterCard() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      setValidationError("Please fill in your name and email.");
      return;
    }
    setValidationError(null);
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
          <>
            {validationError ? (
              <div className="mb-4">
                <Alert tone="danger">{validationError}</Alert>
              </div>
            ) : null}
            <form onSubmit={onSubmit} noValidate>
              <div className="row row--wrap">
                <div style={{ flex: "1 1 10rem" }}>
                  <Field label="First name *" htmlFor="reg-first">
                    <input
                      id="reg-first"
                      className="input"
                      autoComplete="given-name"
                      value={form.first_name}
                      onChange={(e) =>
                        setForm({ ...form, first_name: e.target.value })
                      }
                      disabled={submitting}
                    />
                  </Field>
                </div>
                <div style={{ flex: "1 1 10rem" }}>
                  <Field label="Last name *" htmlFor="reg-last">
                    <input
                      id="reg-last"
                      className="input"
                      autoComplete="family-name"
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      disabled={submitting}
                    />
                  </Field>
                </div>
              </div>
              <Field label="Email *" htmlFor="reg-email" hint="We'll use this to reach you about your account.">
                <input
                  id="reg-email"
                  className="input"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={submitting}
                />
              </Field>
              <Field label="Mobile number (optional)" htmlFor="reg-phone">
                <input
                  id="reg-phone"
                  className="input"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+63 …"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  disabled={submitting}
                />
              </Field>
              <Button type="submit" disabled={submitting} style={{ width: "100%" }}>
                {submitting ? "Sending…" : "Create my account"}
              </Button>
            </form>
          </>
        )}
      </div>

      <div className="auth-card__footer">
        Already registered? <Link href="/login">Sign in</Link>
      </div>
    </div>
  );
}
