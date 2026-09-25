"use client";

import { PageError } from "@/components/ui/page-error";

export default function PurchaseApplicationError({ reset }: { reset: () => void }) {
  return <PageError message="We couldn't load that purchase application." reset={reset} />;
}
