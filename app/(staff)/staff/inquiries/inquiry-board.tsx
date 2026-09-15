"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import type { Inquiry } from "@/lib/api-client/crm";

type Tone = "info" | "warning" | "success" | "neutral";

const SOURCE_LABELS: Array<{ value: Inquiry["source"]; label: string }> = [
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

/**
 * Quick-capture inquiry workspace. Capture is CLIENT-SIDE ONLY for now:
 * the BFF must not originate data writes (web/AGENTS.md rule 1) and no
 * crm-families API exists yet. Rows captured here live for the session and
 * are clearly marked as demo captures.
 */
export function InquiryBoard({
  initialInquiries,
  statusTone,
  canCapture,
}: {
  initialInquiries: Inquiry[];
  statusTone: Record<string, Tone>;
  canCapture: boolean;
}) {
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialInquiries);
  const [capturedCount, setCapturedCount] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    source: "phone",
    topic: "",
    message: "",
    assigned_to: "",
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return inquiries;
    return inquiries.filter((i) =>
      [i.reference, i.person.full_name, i.person.phone, i.topic]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [inquiries, filter]);

  function submitCapture(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.full_name.trim() || !form.phone.trim() || !form.topic.trim()) {
      setValidationError("Name, contact number, and topic are required.");
      return;
    }
    setValidationError(null);
    const now = new Date();
    setInquiries((prev) => [
      {
        id: `demo-${now.getTime()}`,
        reference: `INQ-DEMO-${String(capturedCount + 1).padStart(3, "0")}`,
        person: {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        },
        source: form.source as Inquiry["source"],
        topic: form.topic.trim(),
        message: form.message.trim(),
        assigned_to: form.assigned_to.trim() || "Unassigned",
        status: "new",
        received_at: now.toISOString(),
      },
      ...prev,
    ]);
    setCapturedCount((n) => n + 1);
    setFormOpen(false);
    setForm({
      full_name: "",
      phone: "",
      email: "",
      source: "phone",
      topic: "",
      message: "",
      assigned_to: "",
    });
  }

  return (
    <div className="stack-4">
      {capturedCount > 0 ? (
        <Alert tone="success" title="Inquiry captured for this session.">
          Demo captures live only in this browser until the records service is
          connected — nothing was sent anywhere.
        </Alert>
      ) : null}

      <div className="row row--wrap">
        <input
          className="input"
          style={{ maxWidth: "22rem" }}
          type="search"
          placeholder="Filter by reference, name, topic…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter inquiries"
        />
        {canCapture ? (
          <Button
            onClick={() => setFormOpen((open) => !open)}
            aria-expanded={formOpen}
          >
            {formOpen ? "Close quick capture" : "Log an inquiry"}
          </Button>
        ) : null}
      </div>

      {canCapture && formOpen ? (
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
                <h3 className="capture-section__title">Who is asking</h3>
                <p className="capture-section__blurb">
                  Enough to call them back — name and contact number are the only
                  essentials.
                </p>
              </div>
            </div>
            <div className="capture-section__body">
              <div className="field-grid field-grid--3">
                <Field label="Full name" htmlFor="inq-name">
                  <input
                    id="inq-name"
                    value={form.full_name}
                    onChange={(e) =>
                      setForm({ ...form, full_name: e.target.value })
                    }
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
                <h3 className="capture-section__title">What they need</h3>
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
                <Field label="Notes" htmlFor="inq-message" hint="Optional — what they said, in their words.">
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
                    onChange={(e) =>
                      setForm({ ...form, assigned_to: e.target.value })
                    }
                  />
                </Field>
              </div>
            </div>
          </section>

          <div className="capture-actions">
            <Button type="submit">Capture inquiry</Button>
            <Button variant="ghost" type="button" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          title={
            filter ? "No inquiries match your filter" : "No inquiries logged yet"
          }
          hint={
            filter
              ? "Clear the filter to see all inquiries."
              : "Calls, walk-ins, and messages will appear here as front desk logs them."
          }
        />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Person</th>
                <th scope="col">Topic</th>
                <th scope="col">Source</th>
                <th scope="col">Assigned</th>
                <th scope="col">Status</th>
                <th scope="col">Received</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id}>
                  <td>
                    <code>{i.reference}</code>
                  </td>
                  <td>
                    <strong>{i.person.full_name}</strong>
                    <br />
                    <span className="text-sm text-muted">{i.person.phone}</span>
                  </td>
                  <td>{i.topic}</td>
                  <td className="text-sm">{SOURCE_LABELS.find((s) => s.value === i.source)?.label ?? i.source}</td>
                  <td className="text-sm">{i.assigned_to}</td>
                  <td>
                    <Badge tone={statusTone[i.status] ?? "neutral"}>{i.status}</Badge>
                  </td>
                  <td className="text-sm">
                    {new Date(i.received_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
