"use client";

import { PageError } from "@/components/ui/page-error";

export default function LotDetailError({ reset }: { reset: () => void }) {
  return <PageError message="We couldn't load that lot record." reset={reset} />;
}
