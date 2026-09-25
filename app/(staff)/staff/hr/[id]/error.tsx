"use client";

import { PageError } from "@/components/ui/page-error";

export default function EmployeeDetailError({ reset }: { reset: () => void }) {
  return <PageError message="We couldn't load that employee record." reset={reset} />;
}
