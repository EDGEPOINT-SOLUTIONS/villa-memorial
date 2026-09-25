"use client";

import { PageError } from "@/components/ui/page-error";

export default function BillingError({ reset }: { reset: () => void }) {
  return <PageError message="We couldn't load the billing records just now." reset={reset} />;
}
