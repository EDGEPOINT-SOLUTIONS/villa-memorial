"use client";

import { PageError } from "@/components/ui/page-error";

export default function CustomersError({ reset }: { reset: () => void }) {
  return <PageError message="We couldn't load the customer list just now." reset={reset} />;
}
