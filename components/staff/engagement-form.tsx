"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  ENGAGEMENT_KIND_LABEL,
  paymentModeLabel,
  paymentsPerYear,
  type EngagementKind,
  type PaymentMode,
} from "@/lib/lifecycle";

/**
 * The office's "record an outcome" form — one form for the four registers.
 *
 * Which fields show depends on the kind: a service asks for its calendar slot, a
 * lot for its coordinates, and a plan/lot for the payment term. The validation is
 * NOT re-implemented here: the form posts the fields and the pure
 * `lib/lifecycle.ts` intake (run by `POST /api/staff/lifecycle`) returns the one
 * sentence a field error shows.
 *
 * A sold prospect can be carried in (`prospectId`, `defaultName`), so recording
 * the outcome from the pipeline links the record to the person it came from.
 */
export function EngagementForm({
  kind,
  defaultName = "",
  prospectId = null,
  defaultAgent = "",
}: {
  kind: EngagementKind;
  defaultName?: string;
  prospectId?: string | null;
  defaultAgent?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const termPaid = kind === "plan" || kind === "lot";
  const [mode, setMode] = useState<PaymentMode>(termPaid ? "monthly" : "one_time");
  const [form, setForm] = useState({
    name: defaultName,
    phone: "",
    email: "",
    item_name: "",
    sku: "",
    detail: "",
    price_basis: "",
    amount: "",
    installments: String(paymentsPerYear(termPaid ? "monthly" : "one_time")),
    first_due_on: "",
    schedule_on: "",
    schedule_time: "",
    schedule_resource: "",
    schedule_case: "",
    lot_number: "",
    lot_section: "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function chooseMode(next: PaymentMode) {
    setMode(next);
    set("installments", String(paymentsPerYear(next)));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await fetch("/api/staff/lifecycle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          name: form.name,
          phone: form.phone,
          email: form.email,
          item_name: form.item_name,
          sku: form.sku,
          detail: form.detail,
          price_basis: form.price_basis,
          amount: form.amount,
          // A one-time kind never carries a term, even if the mode state is stale
          // from a kind switch (flow audit, 2026-10-03).
          mode: termPaid ? mode : "one_time",
          installments: form.installments,
          first_due_on: form.first_due_on,
          prospect_id: prospectId ?? "",
          agent: defaultAgent,
          schedule: {
            on: form.schedule_on,
            time: form.schedule_time,
            resource_name: form.schedule_resource,
            case_number: form.schedule_case,
          },
          lot: {
            lot_number: form.lot_number,
            section: form.lot_section,
          },
        }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { engagement?: { id: string }; error?: string; fieldErrors?: Record<string, string> }
        | null;
      if (!res.ok) {
        setError(payload?.error ?? "The record could not be saved.");
        setFieldErrors(payload?.fieldErrors ?? {});
        return;
      }
      if (payload?.engagement?.id) {
        router.push(`/staff/lifecycle/${payload.engagement.id}`);
        return;
      }
      router.refresh();
    } catch {
      setError("The record could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stack-3" onSubmit={submit} noValidate>
      {error ? (
        <Alert tone="danger" title="Could not save">
          {error}
        </Alert>
      ) : null}

      <div className="field-grid field-grid--2">
        <Field label="Client name" htmlFor="life-name" error={fieldErrors.name}>
          <input id="life-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Contact number" htmlFor="life-phone">
          <input id="life-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="life-email">
          <input id="life-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field
          label={kind === "plan" ? "Plan" : kind === "service" ? "Service" : kind === "lot" ? "Lot" : "Product"}
          htmlFor="life-item"
          error={fieldErrors.item_name}
        >
          <input
            id="life-item"
            value={form.item_name}
            onChange={(e) => set("item_name", e.target.value)}
            placeholder={
              kind === "plan"
                ? "e.g. Silver 2"
                : kind === "service"
                  ? "e.g. Interment"
                  : kind === "lot"
                    ? "e.g. Prime Lots"
                    : "e.g. White Rose Half casket"
            }
          />
        </Field>
      </div>

      <div className="field-grid field-grid--2">
        <Field label="SKU / sheet code" htmlFor="life-sku" hint="Optional — the catalogue line this matches.">
          <input id="life-sku" value={form.sku} onChange={(e) => set("sku", e.target.value)} />
        </Field>
        <Field label="Amount (₱)" htmlFor="life-amount" error={fieldErrors.amount}>
          <input
            id="life-amount"
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="e.g. 13440"
          />
        </Field>
        <Field label="What it covers" htmlFor="life-detail">
          <input id="life-detail" value={form.detail} onChange={(e) => set("detail", e.target.value)} />
        </Field>
        <Field label="Price basis" htmlFor="life-basis" hint="Where the figure comes from.">
          <input
            id="life-basis"
            value={form.price_basis}
            onChange={(e) => set("price_basis", e.target.value)}
            placeholder="e.g. 2026 plan sheet · Silver 2 · ₱1,120 / month"
          />
        </Field>
      </div>

      {termPaid ? (
        <div className="field-grid field-grid--2">
          <Field label="Payment term" htmlFor="life-mode">
            <select id="life-mode" value={mode} onChange={(e) => chooseMode(e.target.value as PaymentMode)}>
              {(["monthly", "quarterly", "semi", "annual"] as const).map((value) => (
                <option key={value} value={value}>
                  {paymentModeLabel(value)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Installments" htmlFor="life-installments" error={fieldErrors.installments}>
            <input
              id="life-installments"
              inputMode="numeric"
              value={form.installments}
              onChange={(e) => set("installments", e.target.value)}
            />
          </Field>
          <Field label="First due date" htmlFor="life-first-due" error={fieldErrors.first_due_on}>
            <input
              id="life-first-due"
              type="date"
              value={form.first_due_on}
              onChange={(e) => set("first_due_on", e.target.value)}
            />
          </Field>
        </div>
      ) : null}

      {kind === "service" ? (
        <div className="field-grid field-grid--2">
          <Field label="Service date" htmlFor="life-schedule-on" error={fieldErrors.schedule_on}>
            <input
              id="life-schedule-on"
              type="date"
              value={form.schedule_on}
              onChange={(e) => set("schedule_on", e.target.value)}
            />
          </Field>
          <Field label="Time" htmlFor="life-schedule-time" hint="24-hour, e.g. 09:00.">
            <input
              id="life-schedule-time"
              type="time"
              value={form.schedule_time}
              onChange={(e) => set("schedule_time", e.target.value)}
            />
          </Field>
          <Field label="Room / vehicle / chapel" htmlFor="life-schedule-resource" error={fieldErrors.schedule_resource}>
            <input
              id="life-schedule-resource"
              value={form.schedule_resource}
              onChange={(e) => set("schedule_resource", e.target.value)}
            />
          </Field>
          <Field label="Case number" htmlFor="life-schedule-case" hint="Optional.">
            <input
              id="life-schedule-case"
              value={form.schedule_case}
              onChange={(e) => set("schedule_case", e.target.value)}
            />
          </Field>
        </div>
      ) : null}

      {kind === "lot" ? (
        <div className="field-grid field-grid--2">
          <Field label="Lot number" htmlFor="life-lot-number" error={fieldErrors.lot_number}>
            <input id="life-lot-number" value={form.lot_number} onChange={(e) => set("lot_number", e.target.value)} />
          </Field>
          <Field label="Section" htmlFor="life-lot-section" error={fieldErrors.section}>
            <input id="life-lot-section" value={form.lot_section} onChange={(e) => set("lot_section", e.target.value)} />
          </Field>
        </div>
      ) : null}

      <div className="row">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : `Record ${ENGAGEMENT_KIND_LABEL[kind].toLowerCase()}`}
        </Button>
      </div>
    </form>
  );
}
