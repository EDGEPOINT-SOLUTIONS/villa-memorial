"use client";

import { PageError } from "@/components/ui/page-error";

export default function HrError({ reset }: { reset: () => void }) {
  return <PageError message="We couldn't load the employee list just now." reset={reset} />;
}
