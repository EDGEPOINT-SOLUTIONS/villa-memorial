"use client";

import { PageError } from "@/components/ui/page-error";

export default function CatalogError({ reset }: { reset: () => void }) {
  return <PageError message="We couldn't load the catalog just now." reset={reset} />;
}
