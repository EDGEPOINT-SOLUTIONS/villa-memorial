"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart, type CartLine } from "@/lib/cart/cart-context";

export type CatalogueAddItem = Omit<CartLine, "quantity">;

/**
 * One-click "Add to cart" for public catalogue item cards and price-list rows
 * (/plans · /packages · /products · /services).
 *
 * Cards are server-rendered rows of REAL commerce-contract data; this client
 * button is how a card reaches the SAME cart context the detail page uses
 * (useCart.add — see app/(public)/plans/[sku]/add-to-cart.tsx). It never
 * invents anything: the caller passes the exact sku/name/type/unit price the
 * card already displays, and the cart merges repeat adds by SKU (no duplicate
 * lines, quantity capped by the cart).
 *
 * `quantity` lets a per-day line add a whole stay in one click (e.g. "3 days"
 * of chapel use) instead of asking the visitor to edit the cart afterwards;
 * `label` overrides the visible text for those rows.
 *
 * Feedback: the label flips to "Added ✓" for ~1.6s while the shared header
 * cart badge updates immediately (PublicShell cart count is driven by the same
 * context). Button text is announced politely for screen readers.
 */
const ADDED_LABEL_MS = 1600;

export function CatalogueAddButton({
  item,
  quantity = 1,
  label = "Add to cart",
}: {
  item: CatalogueAddItem;
  quantity?: number;
  label?: string;
}) {
  const cart = useCart();
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
        quantity > 1
          ? `Add ${item.name} to cart, quantity ${quantity}`
          : `Add ${item.name} to cart`
      }
      onClick={() => {
        cart.add(item, quantity);
        setAdded(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setAdded(false), ADDED_LABEL_MS);
      }}
    >
      {added ? "Added ✓" : label}
    </Button>
  );
}
