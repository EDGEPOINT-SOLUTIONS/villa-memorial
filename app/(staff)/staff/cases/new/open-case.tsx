"use client";

import { useRouter } from "next/navigation";
import { emptyIntake, IntakeForm } from "@/components/intake-form";

/**
 * Opens a case at the counter. Villa's actual sequence: a family arrives with a death,
 * staff take intake, the contract is written, and payment falls due nine days later —
 * before anything has been ordered or paid.
 */
export function OpenCaseForm() {
  const router = useRouter();

  return (
    <IntakeForm
      initial={emptyIntake()}
      submitLabel="Open case"
      pendingLabel="Opening…"
      onSubmit={async (values) => {
        try {
          const res = await fetch("/api/cases", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(values),
          });
          const payload: unknown = await res.json().catch(() => null);
          if (!res.ok) {
            return typeof payload === "object" && payload !== null && "error" in payload
              ? String((payload as { error: unknown }).error)
              : "Could not open the case.";
          }
          const kase = payload as { id: string };
          router.push(`/staff/cases/${kase.id}`);
          router.refresh();
          return null;
        } catch {
          return "Could not reach the operations service.";
        }
      }}
    />
  );
}
