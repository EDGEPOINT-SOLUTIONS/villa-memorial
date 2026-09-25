"use client";

import { PageError } from "@/components/ui/page-error";

export default function ProvisionalReceiptsError({ reset }: { reset: () => void }) {
  return <PageError message="We couldn't open the counter's provisional-receipt journal just now." reset={reset} />;
}
