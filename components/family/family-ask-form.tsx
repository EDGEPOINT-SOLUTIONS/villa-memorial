"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { FamilyAsk } from "@/lib/family/ask";

/**
 * The confirmation step of the family plan/lot gate (captain, 2026-10-02).
 *
 * The gate PAGE has already required a family session, so this form only records
 * the inquiry the visitor is looking at — it POSTs the same fields the gate link
 * carried to `POST /api/family/inquiries`, which stamps it with the session's
 * account. On success it shows the office's own reference and sends the family to
 * their inquiries list, where the row now lives beside the office's copy of it.
 *
 * Nothing is recorded on a plain visit or a refresh: the write is a deliberate
 * press, so the same inquiry is never filed twice.
 */
export function FamilyAskForm({ ask }: { ask: FamilyAsk }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [phone, setPhone] = useState("");

  async function send() {
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/family/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: ask.kind,
          item: ask.item,
          ...(phone.trim() ? { phone: phone.trim() } : {}),
          ...(ask.sku ? { sku: ask.sku } : {}),
          ...(ask.price ? { price: ask.price } : {}),
          ...(ask.amountCents != null ? { amountCents: ask.amountCents } : {}),
          ...(ask.note ? { note: ask.note } : {}),
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "We could not send that just now. Please try again.");
        setState("error");
        return;
      }
      const payload = (await res.json().catch(() => null)) as { inquiry?: { reference?: string } } | null;
      setReference(payload?.inquiry?.reference ?? null);
      setState("sent");
    } catch {
      setError("We could not send that just now. Please try again.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="stack-3">
        <Alert tone="success" title="We have it.">
          Your inquiry {reference ? <strong>{reference}</strong> : null} is with the office. You can
          follow it here in your portal.
        </Alert>
        <Link href="/client/inquiries" className="btn btn--primary ag-btn-xl">
          See your inquiries
        </Link>
      </div>
    );
  }

  return (
    <div className="stack-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Field
        label="Contact number"
        htmlFor="ask-phone"
        hint="So the office can call you about this — optional."
      >
        <input
          id="ask-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </Field>
      <Button
        type="button"
        className="ag-btn-xl"
        onClick={send}
        disabled={state === "sending"}
      >
        {state === "sending" ? "Sending…" : "Send inquiry"}
      </Button>
      <p className="text-sm text-muted">
        This goes to the office as an inquiry — nothing is reserved.
      </p>
    </div>
  );
}
