"use client";

import { PageError } from "@/components/ui/page-error";

export default function OrdersError({ reset }: { reset: () => void }) {
  return <PageError message="We couldn't load the orders just now." reset={reset} />;
}
