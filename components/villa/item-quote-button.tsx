"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useQuoteBasket,
  type QuoteLineKind,
} from "@/lib/quote-basket/quote-basket-context";

const ADDED_LABEL_MS = 1600;

export type ItemQuoteLine = {
  /** The catalogue SKU, so the office can quote the exact sheet line. */
  sku: string;
  /** The item exactly as the storefront names it. */
  name: string;
  itemType?: QuoteLineKind;
  /** Extra context for the office (scope, stay length, conditions). */
  detail?: string;
};

/**
 * "Add to Quote" for an ITEM action (office, inbox 047) — the same pattern the
 * lot button uses (`lot-quote-button.tsx`): the press adds the line(s) to the
 * quote basket and the button confirms with "Added ✓" for a moment, so a family
 * can add several things and send them in one inquiry.
 *
 * The line carries NO amount (`unitPriceCents: 0`): the funeral-service lines
 * are quoted by hand (the captain's minute 5 — those surfaces publish no
 * figure), and the quote page prints "Quoted on request" for them. The
 * catalogue SKU still rides the line so the office quotes the exact sheet item.
 *
 * The label is the staff-editable one from the content store (the home editor
 * defaults it to "Add to Quote"); the accessible name keeps the visible label
 * first, so WCAG 2.5.3 label-in-name holds at rest.
 */
export function ItemQuoteButton({
  lines,
  name,
  label = "Add to Quote",
}: {
  lines: ReadonlyArray<ItemQuoteLine>;
  /** The accessible-name subject (the service, the room, "all five"). */
  name: string;
  /** The stored, staff-editable label the button shows at rest. */
  label?: string;
}) {
  const basket = useQuoteBasket();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <Button
      variant="accent"
      size="sm"
      aria-live="polite"
      aria-label={`${label}: ${name}`}
      onClick={() => {
        for (const line of lines) {
          basket.add({
            sku: line.sku,
            name: line.name,
            itemType: line.itemType ?? "service",
            unitPriceCents: 0,
            currency: "PHP",
            detail: line.detail,
          });
        }
        setAdded(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setAdded(false), ADDED_LABEL_MS);
      }}
    >
      {added ? "Added ✓" : label}
    </Button>
  );
}
