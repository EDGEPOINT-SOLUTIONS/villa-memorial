"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useQuoteBasket, type QuoteLine } from "@/lib/quote-basket/quote-basket-context";

export type CatalogueAddItem = Omit<QuoteLine, "quantity">;

/**
 * One-click "Add to quote" for public catalogue item cards and price-list rows
 * (/plans · /packages · /products · /services).
 *
 * Cards are server-rendered rows of REAL commerce-contract data; this client
 * button is how a card reaches the SAME quote context the detail page uses
 * (useQuoteBasket.add — see app/(public)/plans/[sku]/add-to-quote.tsx). It never
 * invents anything: the caller passes the exact sku/name/type/unit price the
 * card already displays, and the quote merges repeat adds by SKU (no duplicate
 * lines, quantity capped by the quote).
 *
 * `quantity` lets a per-day line add a whole run in one click (e.g. "3 days"
 * of embalming) instead of asking the visitor to edit the quote afterwards;
 * `label` overrides the visible text for those rows. Chapel lines do NOT use
 * this control: a chapel stay goes through the booking step
 * (components/chapel-booking-dialog.tsx), which picks the dates and holds them.
 *
 * Feedback: the label flips to "Added ✓" for ~1.6s while the shared header
 * quote badge updates immediately (PublicShell quote count is driven by the same
 * context). Button text is announced politely for screen readers.
 */
const ADDED_LABEL_MS = 1600;

export function CatalogueAddButton({
  item,
  quantity = 1,
  label = "Add to quote",
}: {
  item: CatalogueAddItem;
  quantity?: number;
  label?: string;
}) {
  const quote = useQuoteBasket();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <Button
      variant="accent"
      size="sm"
      aria-live="polite"
      aria-label={
        // WCAG 2.5.3 — the accessible name starts with the visible label, so a
        // speech user can say what they see ("Add 3 days: Embalming — 3 days").
        quantity > 1
          ? `${label}: ${item.name} (quantity ${quantity})`
          : `${label}: ${item.name}`
      }
      onClick={() => {
        quote.add(item, quantity);
        setAdded(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setAdded(false), ADDED_LABEL_MS);
      }}
    >
      {added ? "Added ✓" : label}
    </Button>
  );
}
