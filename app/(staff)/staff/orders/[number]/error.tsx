"use client";

import { PageError } from "@/components/ui/page-error";

export default function OrderDetailError({ reset }: { reset: () => void }) {
  return <PageError message="We couldn't open that order just now." reset={reset} />;
}
