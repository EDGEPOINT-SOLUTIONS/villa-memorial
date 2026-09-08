"use client";

import { ErrorState } from "@/components/ui/states";

export default function EmployeeDetailError({ reset }: { reset: () => void }) {
  return (
    <div className="stack-4">
      <ErrorState message="We couldn't load that employee record." />
      <div>
        <button className="btn btn--secondary btn--sm" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
