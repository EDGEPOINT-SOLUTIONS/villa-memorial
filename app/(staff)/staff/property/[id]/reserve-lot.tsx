"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

/**
 * Scenario F's first hop through the UI: reserve an available lot for a named party.
 *
 * Deliberately minimal — the service owns the rule. A rejected transition (someone else
 * reserved the lot between the page render and the click) comes back 422 and is shown
 * verbatim, then the row is refreshed so the screen stops offering an action that is no
 * longer legal.
 */
export function ReserveLotForm({ lotId, lotNumber }: { lotId: string; lotNumber: string }) {
  const router = useRouter();
  const [ownerName, setOwnerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!ownerName.trim()) {
      setError("Enter the name the lot is reserved for.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/property/lots/${encodeURIComponent(lotId)}/reserve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner_name: ownerName.trim() }),
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "Reservation failed.";
        setError(message);
        // The lot may have moved on without us; re-read so the screen tells the truth.
        router.refresh();
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Could not reach the property service.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <Alert tone="success" title={`${lotNumber} reserved`}>
        Reserved for {ownerName.trim()}. The reservation is recorded and a
        <code> lot.reserved</code> event has been emitted.
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} className="stack">
      <p className="text-sm text-muted">
        Reserving holds this lot for a named party. Completing the sale is a separate step
        (<code>POST /lots/:id/sell</code>) — buying a lot through storefront checkout is not
        wired yet.
      </p>
      <Field
        label="Reserve for"
        htmlFor="owner_name"
        hint="Full name of the reserving party, as it should appear on the lot record."
        error={error ?? undefined}
      >
        <input
          id="owner_name"
          name="owner_name"
          type="text"
          autoComplete="off"
          value={ownerName}
          disabled={pending}
          onChange={(e) => setOwnerName(e.target.value)}
        />
      </Field>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Reserving…" : `Reserve ${lotNumber}`}
        </Button>
      </div>
    </form>
  );
}
