"use client";

import { PageError } from "@/components/ui/page-error";

export default function DocumentsError({ reset }: { reset: () => void }) {
  return <PageError message="We couldn't load the document records just now." reset={reset} />;
}
