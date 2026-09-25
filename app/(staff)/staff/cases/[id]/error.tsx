"use client";

import { PageError } from "@/components/ui/page-error";

export default function CaseDetailError({ reset }: { reset: () => void }) {
  return <PageError message="We couldn't load that case record." reset={reset} />;
}
