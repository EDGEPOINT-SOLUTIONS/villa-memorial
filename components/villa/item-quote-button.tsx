"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { quoteAddedLabel } from "@/lib/basket-guidance";
import { useQuoteBasket } from "@/lib/quote-basket/quote-basket-context";
import { quoteLineDescriptor, type QuoteLineDescriptor } from "@/lib/quote-basket/quote-line";

const ADDED_LABEL_MS = 1600;

export type ItemQuoteLine = {
  /** The catalogue SKU, so the office can quote the exact sheet line. */
  sku: string;
  /** The item exactly as the storefront names it. */
  name: string;
  /** The open line kind — defaults to "service". */
  kind?: string;
  /** Optional descriptor overrides (badge, unit, detail shape, actions). */
  descriptor?: Partial<QuoteLineDescriptor>;
  /** Extra context for the office (scope, stay length, conditions). */
  detail?: string;
};

/**
 * "Add to Quote" for a QUOTE-ONLY item action (office, inbox 047) — the same
 * add-and-confirm pattern the catalogue's other quote controls use: the press
 * adds the line to the quote basket and the button confirms with "Added ✓" for a
 * moment, so a family can add several things and send them in one inquiry.
 *
 * Lots are NOT here: since the captain's 2026-10-02 decision a lot inquiry needs
 * a family account and lives behind the family ask gate ("Ask about this lot").
 *
 * The line is `on_request`: the funeral-service lines are quoted by hand (the
 * captain's minute 5 — those surfaces publish no figure), and the quote page
 * prints "To be quoted by the office" for them. The catalogue SKU still rides
 * the line so the office quotes the exact sheet item. The line's descriptor
 * comes from `lib/quote-basket/quote-line.ts`, so a new kind needs no page edit.
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
  // The header counts quote LINES (a line is what the office quotes); the
  // confirmation repeats that running count where the visitor pressed.
  const addedLabel = quoteAddedLabel(basket.lines.length);

  return (
    <Button
      variant="accent"
      size="sm"
      aria-live="polite"
      aria-label={added ? addedLabel : `${label}: ${name}`}
      onClick={() => {
        for (const line of lines) {
          const kind = line.kind ?? "service";
          basket.add({
            sku: line.sku,
            name: line.name,
            kind,
            descriptor: quoteLineDescriptor(kind, line.descriptor),
            pricing: { mode: "on_request" },
            detail: line.detail,
          });
        }
        setAdded(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setAdded(false), ADDED_LABEL_MS);
      }}
    >
      {added ? addedLabel : label}
    </Button>
  );
}
