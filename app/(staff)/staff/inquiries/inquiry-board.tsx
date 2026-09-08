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
        <div className="card">
          <div className="card__header">
            <h3>Quick capture</h3>
          </div>
          <div className="card__body">
            {validationError ? (
              <div className="mb-4">
                <Alert tone="danger">{validationError}</Alert>
              </div>
            ) : null}
            <form onSubmit={submitCapture} noValidate>
              <div className="row row--wrap">
                <div style={{ flex: "1 1 14rem" }}>
                  <Field label="Full name *" htmlFor="inq-name">
                    <input
                      id="inq-name"
                      className="input"
                      value={form.full_name}
                      onChange={(e) =>
                        setForm({ ...form, full_name: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <div style={{ flex: "1 1 12rem" }}>
                  <Field label="Contact number *" htmlFor="inq-phone">
                    <input
                      id="inq-phone"
                      className="input"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </Field>
                </div>
                <div style={{ flex: "1 1 12rem" }}>
                  <Field label="Email (optional)" htmlFor="inq-email">
                    <input
                      id="inq-email"
                      className="input"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </Field>
                </div>
                <div style={{ flex: "1 1 10rem" }}>
                  <Field label="How they reached us" htmlFor="inq-source">
                    <select
                      id="inq-source"
                      className="select"
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
                </div>
              </div>
              <Field label="What are they asking about? *" htmlFor="inq-topic">
                <input
                  id="inq-topic"
                  className="input"
                  placeholder="e.g. Pre-need plans, pricing, documents…"
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                />
              </Field>
              <div className="row row--wrap">
                <div style={{ flex: "2 1 16rem" }}>
                  <Field label="Notes (optional)" htmlFor="inq-message">
                    <textarea
                      id="inq-message"
                      className="textarea"
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                    />
                  </Field>
                </div>
                <div style={{ flex: "1 1 12rem" }}>
                  <Field label="Assign to" htmlFor="inq-assignee">
                    <input
                      id="inq-assignee"
                      className="input"
                      placeholder="Unassigned"
                      value={form.assigned_to}
                      onChange={(e) =>
                        setForm({ ...form, assigned_to: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </div>
              <Button type="submit">Capture inquiry</Button>
            </form>
          </div>
        </div>
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
