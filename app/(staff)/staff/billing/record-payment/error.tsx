"use client";

import { PageError } from "@/components/ui/page-error";

export default function RecordPaymentError({ reset }: { reset: () => void }) {
  return <PageError message="We couldn't open the payment capture screen just now." reset={reset} />;
}
