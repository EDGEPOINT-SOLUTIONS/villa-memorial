"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { NoticeTemplate } from "@/lib/lifecycle";

/**
 * The office's modular notices — the "2 days before", "a day before" rules.
 *
 * A template is a rule the office writes once: a label, a whole number of days
 * before the due date, and a message carrying `{amount}` / `{date}` / `{member}`.
 * The app schedules one notice per open installment per ACTIVE template; pausing
 * a template stops future notices without deleting the rule. The write goes to
 * `POST /api/staff/lifecycle/templates`.
 */
export function NoticeRules({ templates }: { templates: NoticeTemplate[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ label: "", days_before: "2", message: "" });

  async function post(body: Record<string, unknown>, id: string | null) {
    setBusyId(id);
    setError(null);
    setFieldErrors({});
    try {
      const res = await fetch("/api/staff/lifecycle/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { error?: string; fieldErrors?: Record<string, string> }
          | null;
        setError(payload?.error ?? "The notice could not be saved.");
        setFieldErrors(payload?.fieldErrors ?? {});
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("The notice could not be saved.");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const ok = await post(
      { label: form.label, days_before: form.days_before, message: form.message },
      null,
    );
    setSaving(false);
    if (ok) setForm({ label: "", days_before: "2", message: "" });
  }

  return (
    <div className="stack-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {templates.length === 0 ? (
        <p className="text-sm text-muted" style={{ margin: 0 }}>
          No notice rules yet. Add the first one below.
        </p>
      ) : (
        <div className="table-wrapper" tabIndex={0}>
          <table className="table">
            <caption className="visually-hidden">Modular notice rules</caption>
            <thead>
              <tr>
                <th scope="col">Notice</th>
                <th scope="col">When</th>
                <th scope="col">Message</th>
                <th scope="col">State</th>
                <th scope="col">
                  <span className="visually-hidden">Toggle</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id}>
                  <th scope="row">{template.label}</th>
                  <td>
                    {template.days_before === 0
                      ? "On the due day"
                      : `${template.days_before} day${template.days_before === 1 ? "" : "s"} before`}
                  </td>
                  <td>{template.message}</td>
                  <td>
                    <Badge tone={template.active ? "success" : "neutral"}>
                      {template.active ? "Active" : "Paused"}
                    </Badge>
                  </td>
                  <td className="table__numeric">
                    <Button
                      variant="ghost"
                      type="button"
                      disabled={busyId === template.id}
                      onClick={() =>
                        post(
                          {
                            id: template.id,
                            label: template.label,
                            days_before: template.days_before,
                            message: template.message,
                            active: !template.active,
                          },
                          template.id,
                        )
                      }
                    >
                      {template.active ? "Pause" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form className="stack-2" onSubmit={add} noValidate>
        <div className="field-grid field-grid--2">
          <Field label="Notice name" htmlFor="notice-label" error={fieldErrors.label}>
            <input
              id="notice-label"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. Two days before"
            />
          </Field>
          <Field label="Days before due" htmlFor="notice-days" error={fieldErrors.days_before}>
            <input
              id="notice-days"
              inputMode="numeric"
              value={form.days_before}
              onChange={(e) => setForm({ ...form, days_before: e.target.value })}
            />
          </Field>
        </div>
        <Field
          label="Message"
          htmlFor="notice-message"
          error={fieldErrors.message}
          hint="Use {amount}, {date} and {member} for the details."
        >
          <textarea
            id="notice-message"
            rows={2}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Hello {member}, a payment of {amount} is due on {date}."
          />
        </Field>
        <div className="row">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Add notice rule"}
          </Button>
        </div>
      </form>
    </div>
  );
}
