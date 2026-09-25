"use client";

import { PageError } from "@/components/ui/page-error";

export default function InquiriesError({ reset }: { reset: () => void }) {
  return <PageError message="We couldn't load the inquiry list just now." reset={reset} />;
}
