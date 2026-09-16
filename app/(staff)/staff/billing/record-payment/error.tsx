"use client";

import { ErrorState } from "@/components/ui/states";

export default function RecordPaymentError({ reset }: { reset: () => void }) {
  return (
    <div className="stack-4">
      <ErrorState message="We couldn't open the payment capture screen just now." />
      <div>
        <button className="btn btn--secondary btn--sm" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
