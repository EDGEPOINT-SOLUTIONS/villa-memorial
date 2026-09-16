"use client";

/**
 * Operator lifecycle actions for one order (staff Orders admin).
 *
 * The allowed transitions are computed by the page from the store's own table
 * (`availableTransitions`), so the buttons never offer a transition the server would
 * reject; the POST goes through the BFF route, which re-checks `orders:write` and the
 * transition rule server-side. Each transition needs a confirmation step, and cancellation
 * additionally requires a reason that lands on the order timeline. Nothing here touches
 * payment: cancelling closes the fulfilment, not a refund.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { OrderTransition } from "@/lib/api-client/commerce";

const BUTTON_LABEL: Record<OrderTransition, string> = {
  confirmed: "Confirm order",
  fulfilled: "Mark fulfilled",
  cancelled: "Cancel order",
};

const CONFIRM_LABEL: Record<OrderTransition, string> = {
  confirmed: "Yes, confirm order",
  fulfilled: "Yes, mark fulfilled",
  cancelled: "Confirm cancellation",
};

export function OrderStatusActions({
  number,
  transitions,
}: {
  number: string;
  transitions: OrderTransition[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<OrderTransition | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  if (transitions.length === 0) {
    return (
      <p className="text-sm text-muted" role="status">
        This order is closed — there are no further status transitions.
      </p>
    );
  }

  async function submit() {
    if (!pending) return;
    const trimmed = reason.trim();
    if (pending === "cancelled" && trimmed.length === 0) {
      setReasonError("Enter the reason for the cancellation.");
      return;
    }
    setBusy(true);
    setError(null);
    setReasonError(null);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(number)}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: pending, reason: trimmed }),
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "Could not update the order.",
        );
        return;
      }
      setDone(pending === "cancelled" ? `${number} cancelled.` : `${number} moved to ${pending}.`);
      setPending(null);
      setReason("");
      router.refresh();
    } catch {
      setError("Could not reach the order store.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      {done ? <Alert tone="success" title={done} /> : null}
      {error ? (
        <Alert tone="danger" title="Could not update the order">
          {error}
        </Alert>
      ) : null}

      {pending === null ? (
        <div className="row" style={{ gap: "var(--space-2)", flexWrap: "wrap" }}>
          {transitions.map((transition) => (
            <Button
              key={transition}
              variant={transition === "cancelled" ? "danger" : "primary"}
              size="sm"
              onClick={() => {
                setPending(transition);
                setDone(null);
                setError(null);
                setReasonError(null);
              }}
            >
              {BUTTON_LABEL[transition]}
            </Button>
          ))}
        </div>
      ) : (
        <div className="stack-3">
          {pending === "cancelled" ? (
            <Field
              label="Reason for cancellation"
              htmlFor="order-cancel-reason"
              hint="Recorded on the order timeline. Required — nothing is refunded by this action."
              error={reasonError ?? undefined}
            >
              <textarea
                id="order-cancel-reason"
                rows={3}
                disabled={busy}
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  setReasonError(null);
                }}
              />
            </Field>
          ) : null}

          <p className="text-sm text-muted">
            {pending === "cancelled"
              ? `Cancel ${number}? The order closes on its timeline.`
              : `${BUTTON_LABEL[pending]} ${number}? This records the transition on the order timeline.`}
          </p>

          <div className="row" style={{ gap: "var(--space-2)" }}>
            <Button
              variant={pending === "cancelled" ? "danger" : "primary"}
              size="sm"
              onClick={submit}
              disabled={busy}
            >
              {busy ? "Saving…" : CONFIRM_LABEL[pending]}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPending(null);
                setReason("");
                setReasonError(null);
                setError(null);
              }}
              disabled={busy}
            >
              Keep order
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
