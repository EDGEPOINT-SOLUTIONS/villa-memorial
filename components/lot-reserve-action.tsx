"use client";

/**
 * LotReserveAction — the ONE inline lot-reservation control.
 *
 * Used by the staff property map's details panel AND by the 3D park's plot panel,
 * so both surfaces reserve through the same BFF route
 * (`POST /api/property/lots/:id/reserve`), with the same rules and the same
 * success/refusal states. There is deliberately no second reservation path: the
 * scope check in that route (session + `property:write`) is the contract, and the
 * property service stays the only authority on `available → reserved`.
 *
 * A visitor WITHOUT `property:write` never renders this component at all: their
 * plot panel keeps the existing request-to-reserve contact link
 * (`components/park-plot-details.tsx`), which claims nothing and reserves nothing.
 *
 * On success (and on any refusal) the host page is refreshed, so the shared lot
 * listing — and with it the 2D map, which overlays live lot status onto the same
 * plot records — shows the new status immediately.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { Lot } from "@/lib/api-client/property";

export function LotReserveAction({ lot }: { lot: Lot }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Only an available lot can be reserved (property-gis enforces the same rule);
  // the panel that hosts this control reports every other status itself.
  if (lot.status !== "available") return null;

  async function reserve() {
    if (!ownerName.trim()) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/property/lots/${encodeURIComponent(lot.id)}/reserve`, {
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
        router.refresh(); // the lot may have moved on; re-read so the map tells the truth
        return;
      }
      setNotice(`${lot.lot_number} reserved for ${ownerName.trim()}.`);
      setFormOpen(false);
      setOwnerName("");
      router.refresh();
    } catch {
      setError("Could not reach the property service.");
    } finally {
      setPending(false);
    }
  }

  if (notice) return <Alert tone="success" title={notice} />;

  if (!formOpen) {
    return (
      <Button size="sm" onClick={() => setFormOpen(true)}>
        Reserve lot
      </Button>
    );
  }

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        void reserve();
      }}
    >
      <Field
        label="Reserve for"
        htmlFor={`lot-owner-${lot.id}`}
        hint="Full name as it should appear on the lot record."
        error={error ?? undefined}
      >
        <input
          id={`lot-owner-${lot.id}`}
          type="text"
          autoComplete="off"
          value={ownerName}
          disabled={pending}
          onChange={(event) => setOwnerName(event.target.value)}
        />
      </Field>
      <div className="row">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Reserving…" : "Confirm reservation"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setFormOpen(false);
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
