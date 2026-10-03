"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { paymentAmountLabel } from "@/lib/lifecycle";

/**
 * The counter's "record a payment" form. The amount may not exceed what the
 * record still owes — the route enforces the same rule, and this form shows the
 * balance so the amount is entered against the real figure, never from memory.
 */
export function PaymentForm({
  engagementId,
  outstandingCents,
}: {
  engagementId: string;
  outstandingCents: number;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState("");
  const [note, setNote] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/lifecycle/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ engagement_id: engagementId, amount, paid_on: paidOn, note }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "The payment could not be saved.");
        return;
      }
      setAmount("");
      setPaidOn("");
      setNote("");
      router.refresh();
    } catch {
      setError("The payment could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stack-2" onSubmit={submit} noValidate>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="field-grid field-grid--2">
        <Field label="Amount received (₱)" htmlFor="pay-amount" hint={`Still owed: ${paymentAmountLabel(outstandingCents)}.`}>
          <input
            id="pay-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 1120"
          />
        </Field>
        <Field label="Received on" htmlFor="pay-date" hint="Leave blank for today.">
          <input id="pay-date" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
        </Field>
      </div>
      <Field label="Note" htmlFor="pay-note" hint="Optional — for example “September installment”.">
        <input id="pay-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="row">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Record payment"}
        </Button>
      </div>
    </form>
  );
}
