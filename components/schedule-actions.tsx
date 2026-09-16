"use client";

/**
 * Schedule mutations (Module H): create a booking + cancel one.
 *
 * Both POST through BFF route handlers (app/api/schedule/*) that check the session
 * and `scheduling:write` scope server-side; the service stays the only authority on
 * the conflict rule. A 422 (e.g. overlap policy or a stale booking) is shown verbatim
 * and the list is refreshed so the screen stops offering illegal actions.
 */
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { Resource } from "@/lib/api-client/scheduling";

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewBookingForm({ resources }: { resources: Resource[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [resourceId, setResourceId] = useState(resources[0]?.id ?? "");
  const [caseNumber, setCaseNumber] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setDone(null);
    if (!title.trim() || !resourceId || !startsAt || !endsAt) {
      setError("Title, resource, start and end are required.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/schedule/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          resource_id: resourceId,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: new Date(endsAt).toISOString(),
          case_number: caseNumber.trim() || undefined,
        }),
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "Booking failed.";
        setError(message);
        router.refresh();
        return;
      }
      setDone(`${title.trim()} booked.`);
      setTitle("");
      setCaseNumber("");
      setStartsAt("");
      setEndsAt("");
      router.refresh();
    } catch {
      setError("Could not reach the scheduling service.");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        + New booking
      </Button>
    );
  }

  return (
    <div className="stack">
      {done ? <Alert tone="success" title={done} /> : null}
      {error ? (
        <Alert tone="danger" title="Could not book">
          {error}
        </Alert>
      ) : null}

      <form onSubmit={submit} className="stack" noValidate>
        {/* 01 — Booking */}
        <section className="card capture-section">
          <div className="capture-section__head">
            <span className="capture-section__num" aria-hidden="true">
              01
            </span>
            <div>
              <h3 className="capture-section__title">Booking</h3>
              <p className="capture-section__blurb">
                What is being reserved and against whose case.
              </p>
            </div>
          </div>
          <div className="capture-section__body">
            <div className="field-grid field-grid--2">
              <Field label="Title" htmlFor="bk-title" hint="e.g. Wake — Day 1">
                <input
                  id="bk-title"
                  type="text"
                  disabled={pending}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Field>
              <Field label="Resource" htmlFor="bk-resource">
                <select
                  id="bk-resource"
                  disabled={pending}
                  value={resourceId}
                  onChange={(e) => setResourceId(e.target.value)}
                >
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.resource_type.replace(/_/g, " ")}, capacity {r.capacity})
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="field-grid field-grid--2">
              <Field
                label="Case number"
                htmlFor="bk-case"
                hint="Optional — links the booking to a case when one exists."
              >
                <input
                  id="bk-case"
                  type="text"
                  disabled={pending}
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  placeholder="CASE-2026-0001"
                />
              </Field>
            </div>
          </div>
        </section>

        {/* 02 — When */}
        <section className="card capture-section">
          <div className="capture-section__head">
            <span className="capture-section__num" aria-hidden="true">
              02
            </span>
            <div>
              <h3 className="capture-section__title">When</h3>
              <p className="capture-section__blurb">
                Overlapping bookings are flagged, never blocked — the service marks
                conflicting on both sides and staff decide.
              </p>
            </div>
          </div>
          <div className="capture-section__body">
            <div className="field-grid field-grid--2">
              <Field label="Starts" htmlFor="bk-start">
                <input
                  id="bk-start"
                  type="datetime-local"
                  disabled={pending}
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </Field>
              <Field label="Ends" htmlFor="bk-end">
                <input
                  id="bk-end"
                  type="datetime-local"
                  disabled={pending}
                  value={endsAt}
                  min={startsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </Field>
            </div>
          </div>
        </section>

        <div className="capture-actions">
          <Button type="submit" disabled={pending}>
            {pending ? "Booking…" : "Confirm booking"}
          </Button>
          <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

export function CancelBookingButton({
  bookingId,
  chapel = false,
}: {
  bookingId: string;
  /**
   * Chapel stays must say WHY the dates are given back: the cancellation reason
   * is recorded app-side (the frozen cancel endpoint carries no body) and the
   * office reads it on /staff/schedule.
   */
  chapel?: boolean;
}) {
  const router = useRouter();
  const reasonId = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");

  async function cancel() {
    if (!chapel && !window.confirm("Cancel this booking? The resource window is freed.")) return;
    if (chapel && !reason.trim()) {
      setError("Say why the chapel stay is being cancelled.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/schedule/bookings/${encodeURIComponent(bookingId)}/cancel`, {
        method: "POST",
        ...(chapel
          ? {
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ reason: reason.trim() }),
            }
          : {}),
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "Could not cancel.";
        setError(message);
        router.refresh();
        return;
      }
      setAsking(false);
      setReason("");
      router.refresh();
    } catch {
      setError("Could not reach the scheduling service.");
    } finally {
      setPending(false);
    }
  }

  if (chapel && asking) {
    return (
      <div className="stack-3">
        <Field
          label="Why is it cancelled?"
          htmlFor={reasonId}
          hint="Recorded with the cancellation; the dates are freed either way."
        >
          <input
            id={reasonId}
            type="text"
            disabled={pending}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            placeholder="Family changed the dates"
          />
        </Field>
        <div className="row">
          <Button variant="danger" size="sm" onClick={cancel} disabled={pending}>
            {pending ? "Cancelling…" : "Cancel booking"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAsking(false);
              setReason("");
              setError(null);
            }}
            disabled={pending}
          >
            Keep it
          </Button>
        </div>
        {error ? (
          <p className="field__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <Button
        variant="danger"
        size="sm"
        onClick={chapel ? () => setAsking(true) : cancel}
        disabled={pending}
      >
        {pending ? "Cancelling…" : "Cancel"}
      </Button>
      {error ? <p className="field__error" role="alert">{error}</p> : null}
    </>
  );
}

export { toLocalInputValue };
