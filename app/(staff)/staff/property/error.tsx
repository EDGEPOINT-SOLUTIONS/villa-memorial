"use client";

import { PageError } from "@/components/ui/page-error";

export default function PropertyError({ reset }: { reset: () => void }) {
  return <PageError message="We couldn't load the property list just now." reset={reset} />;
}
