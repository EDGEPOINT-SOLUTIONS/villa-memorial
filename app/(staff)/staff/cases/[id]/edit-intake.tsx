"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IntakeForm, intakeToValues } from "@/components/intake-form";
import type { Case } from "@/lib/api-client/operations";

/**
 * Completes intake on an existing case — including one that arrived from a fulfilled
 * order, which carries the purchaser but never the deceased.
 *
 * Collapsed by default: on a case whose intake is already done this is a correction path,
 * not the main thing on the screen.
 */
export function EditIntakeForm({ kase }: { kase: Case }) {
  const router = useRouter();
  const [open, setOpen] = useState(kase.intake === null);

  if (!open) {
    return (
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Edit intake
      </Button>
    );
  }

  return (
    <IntakeForm
      initial={intakeToValues(kase.intake, {
        deceased_name: kase.deceased_name === "Pending intake" ? "" : kase.deceased_name,
        assigned_coordinator:
          kase.assigned_coordinator === "Unassigned" ? "" : kase.assigned_coordinator,
      })}
      submitLabel="Save intake"
      pendingLabel="Saving…"
      onSubmit={async (values) => {
        try {
          const res = await fetch(`/api/cases/${encodeURIComponent(kase.case_number)}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(values),
          });
          const payload: unknown = await res.json().catch(() => null);
          if (!res.ok) {
            return typeof payload === "object" && payload !== null && "error" in payload
              ? String((payload as { error: unknown }).error)
              : "Could not save intake.";
          }
          setOpen(false);
          router.refresh();
          return null;
        } catch {
          return "Could not reach the operations service.";
        }
      }}
    />
  );
}
