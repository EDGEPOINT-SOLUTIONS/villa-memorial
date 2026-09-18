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
 *
 * Layout follows the house capture shell: one numbered section card + the shared action
 * bar, the same grammar as the purchase application.
 */
export function ReserveLotForm({ lotId, lotNumber }: { lotId: string; lotNumber: string }) {
  const router = useRouter();
  const [ownerName, setOwnerName] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    if (!ownerName.trim()) {
      setFieldError("Enter the name the lot is reserved for.");
      return;
    }
    setFieldError(null);

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
        setServerError(message);
        // The lot may have moved on without us; re-read so the screen tells the truth.
        router.refresh();
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setServerError("Could not reach the property service.");
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
    <form onSubmit={submit} className="stack" noValidate>
      {serverError ? (
        <Alert tone="danger" title="Could not reserve">
          {serverError}
        </Alert>
      ) : null}

      <section className="card capture-section">
        <div className="capture-section__head">
          <span className="capture-section__num" aria-hidden="true">
            01
          </span>
          <div>
            <h2 className="capture-section__title">Reservation</h2>
            <p className="capture-section__blurb">
              Reserving holds this lot for a named party. Completing the sale is a separate
              step — buying a lot through storefront checkout is not wired yet.
            </p>
          </div>
        </div>
        <div className="capture-section__body">
          <div className="field-grid field-grid--2">
            <Field
              label="Reserve for"
              htmlFor="owner_name"
              hint="Full name of the reserving party, as it should appear on the lot record."
              error={fieldError ?? undefined}
            >
              <input
                id="owner_name"
                name="owner_name"
                type="text"
                autoComplete="off"
                value={ownerName}
                disabled={pending}
                onChange={(e) => {
                  setOwnerName(e.target.value);
                  setFieldError(null);
                }}
              />
            </Field>
          </div>
        </div>
      </section>

      <div className="capture-actions">
        <Button type="submit" disabled={pending}>
          {pending ? "Reserving…" : `Reserve ${lotNumber}`}
        </Button>
      </div>
    </form>
  );
}
