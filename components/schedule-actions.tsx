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
import { useState } from "react";
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
    <div className="card">
      <div className="card__header">
        <h3>New booking</h3>
      </div>
      <div className="card__body">
        {done ? <Alert tone="success" title={done} /> : null}
        <form onSubmit={submit} className="stack">
          <Field label="Title" htmlFor="bk-title" hint="e.g. Wake — Day 1">
            <input
              id="bk-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="Resource" htmlFor="bk-resource">
            <select
              id="bk-resource"
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
          <Field
            label="Case number (optional)"
            htmlFor="bk-case"
            hint="Link the booking to a case when one exists."
          >
            <input
              id="bk-case"
              type="text"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="CASE-2026-0001"
            />
          </Field>
          <div className="row row--wrap">
            <Field label="Starts" htmlFor="bk-start">
              <input
                id="bk-start"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </Field>
            <Field label="Ends" htmlFor="bk-end">
              <input
                id="bk-end"
                type="datetime-local"
                value={endsAt}
                min={startsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </Field>
          </div>
          {error ? (
            <Alert tone="danger" title="Could not book">
              {error}
            </Alert>
          ) : null}
          <div className="row">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Booking…" : "Confirm booking"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
        <p className="text-sm text-muted mt-2">
          Overlapping bookings are flagged, never blocked — the service marks
          <code> conflicting </code> on both sides and staff decide.
        </p>
      </div>
    </div>
  );
}

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function cancel() {
    if (!window.confirm("Cancel this booking? The resource window is freed.")) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/schedule/bookings/${encodeURIComponent(bookingId)}/cancel`, {
        method: "POST",
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
      router.refresh();
    } catch {
      setError("Could not reach the scheduling service.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={cancel} disabled={pending}>
        {pending ? "Cancelling…" : "Cancel"}
      </Button>
      {error ? <p className="text-sm text-muted">{error}</p> : null}
    </>
  );
}

export { toLocalInputValue };
