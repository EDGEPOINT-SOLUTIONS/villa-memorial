"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { Inquiry } from "@/lib/api-client/crm";

/**
 * The office's enquiry capture — ONE form, used by the board's inline "Log an
 * inquiry" panel and by the dedicated `/staff/inquiries/new` page.
 *
 * Both write the same durable route (`POST /api/inquiries`), so a call logged at
 * the desk survives the tab and reaches every staff screen; the board then
 * prepends the record it gets back, and the dedicated page opens the board.
 */
export const SOURCE_LABELS: Array<{ value: Inquiry["source"]; label: string }> = [
  { value: "walk_in", label: "Walk-in" },
  { value: "phone", label: "Phone" },
  { value: "facebook", label: "Facebook" },
  { value: "messenger", label: "Messenger" },
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "agent", label: "Agent" },
  { value: "event", label: "Event" },
  { value: "ads", label: "Ads" },
];

const EMPTY_FORM = {
  full_name: "",
  phone: "",
  email: "",
  source: "phone",
  topic: "",
  message: "",
  assigned_to: "",
};

export function InquiryCaptureForm({
  onCaptured,
  onCancel,
  submitLabel = "Capture inquiry",
}: {
  onCaptured: (inquiry: Inquiry) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submitCapture(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setValidationError(null);
    setSaving(true);
    try {
      // The counter's row goes to the SAME durable journal the website writes to, so a
      // call logged at the desk survives the tab and reaches every staff screen.
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "log", values: form }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const body =
        typeof payload === "object" && payload !== null
          ? (payload as Record<string, unknown>)
          : {};

      if (!response.ok || typeof body.inquiry !== "object" || body.inquiry === null) {
        setValidationError(
          typeof body.error === "string" ? body.error : "The enquiry could not be recorded.",
        );
        return;
      }

      onCaptured(body.inquiry as Inquiry);
      setForm({ ...EMPTY_FORM });
    } catch {
      setValidationError(
        "The enquiry could not be recorded — check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submitCapture} className="stack" noValidate>
      {validationError ? (
        <Alert tone="danger" title="Could not capture">
          {validationError}
        </Alert>
      ) : null}

      {/* 01 — Who is asking */}
      <section className="card capture-section">
        <div className="capture-section__head">
          <span className="capture-section__num" aria-hidden="true">
            01
          </span>
          <div>
            <h2 className="capture-section__title">Who is asking</h2>
            <p className="capture-section__blurb">
              Enough to call them back — name and contact number are the only essentials.
            </p>
          </div>
        </div>
        <div className="capture-section__body">
          <div className="field-grid field-grid--3">
            <Field label="Full name" htmlFor="inq-name">
              <input
                id="inq-name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </Field>
            <Field label="Contact number" htmlFor="inq-phone">
              <input
                id="inq-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Email" htmlFor="inq-email" hint="Optional.">
              <input
                id="inq-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* 02 — What they need */}
      <section className="card capture-section">
        <div className="capture-section__head">
          <span className="capture-section__num" aria-hidden="true">
            02
          </span>
          <div>
            <h2 className="capture-section__title">What they need</h2>
            <p className="capture-section__blurb">
              The topic is the one thing the inquiries board filters on.
            </p>
          </div>
        </div>
        <div className="capture-section__body">
          <div className="field-grid field-grid--2">
            <Field label="How they reached us" htmlFor="inq-source">
              <select
                id="inq-source"
                value={form.source}
                onChange={(e) =>
                  setForm({ ...form, source: e.target.value as Inquiry["source"] })
                }
              >
                {SOURCE_LABELS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="What are they asking about?" htmlFor="inq-topic">
              <input
                id="inq-topic"
                placeholder="e.g. Pre-need plans, pricing, documents…"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
              />
            </Field>
          </div>
          <div className="field-grid field-grid--2">
            <Field
              label="Notes"
              htmlFor="inq-message"
              hint="Optional — what they said, in their words."
            >
              <textarea
                id="inq-message"
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </Field>
            <Field label="Assign to" htmlFor="inq-assignee">
              <input
                id="inq-assignee"
                placeholder="Unassigned"
                value={form.assigned_to}
                onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </section>

      <div className="capture-actions">
        <Button type="submit" disabled={saving}>
          {saving ? "Recording…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="ghost" type="button" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
