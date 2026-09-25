"use client";

import { PageError } from "@/components/ui/page-error";

export default function DashboardError({ reset }: { reset: () => void }) {
  return <PageError message="We couldn't load the dashboard just now." reset={reset} />;
}
