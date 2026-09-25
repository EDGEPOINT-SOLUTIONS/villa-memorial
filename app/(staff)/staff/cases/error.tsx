"use client";

import { PageError } from "@/components/ui/page-error";

export default function CasesError({ reset }: { reset: () => void }) {
  return <PageError message="We couldn't load the case records just now." reset={reset} />;
}
