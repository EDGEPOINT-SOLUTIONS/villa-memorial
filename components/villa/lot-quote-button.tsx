"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useQuoteBasket } from "@/lib/quote-basket/quote-basket-context";
import { quoteLineDescriptor } from "@/lib/quote-basket/quote-line";

/**
 * "Add to quote" for a LOT — the office's 2026-09-29 direction: a family can ask
 * about a lot, a casket and a chapel in one request, so the lot path joins the
 * quote basket alongside the catalogue lines (it used to live only in the
 * reserve/application flow).
 *
 * The button carries the EXACT figures the price-list row publishes (the pricing
 * store's own row: product, area, regular selling price) and names the family
 * that makes it a lot rather than a stock item. A lot line never merges with
 * another (one plot is one line) and its detail says which ground it is, so the
 * office sees the whole ask in the single inquiry.
 */
const ADDED_LABEL_MS = 1600;

export function LotQuoteButton({
  category,
  product,
  area,
  sellingPrice,
}: {
  /** The pricing store's family title (e.g. "1. Lot Only"). */
  category: string;
  /** The product row inside that family. */
  product: string;
  /** The row's area in sqm — a real store figure, not typed here. */
  area: number;
  /** The row's regular selling price in pesos — a real store figure. */
  sellingPrice: number;
}) {
  const basket = useQuoteBasket();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <Button
      variant="accent"
      size="sm"
      aria-live="polite"
      aria-label={`Add to quote: ${product} lot`}
      onClick={() => {
        basket.add({
          sku: `LOT-${product.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`,
          name: `${product} — memorial lot`,
          kind: "lot",
          descriptor: quoteLineDescriptor("lot"),
          pricing: { mode: "published", unitPriceCents: Math.round(sellingPrice * 100), currency: "PHP" },
          detail: `${area} sqm · ${category} · lot only`,
        });
        setAdded(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setAdded(false), ADDED_LABEL_MS);
      }}
    >
      {added ? "Added ✓" : "Add to quote"}
    </Button>
  );
}
