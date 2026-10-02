/**
 * Basket guidance — the running-count confirmation the "Add to cart" / "Add to
 * quote" controls show after a successful add (captain, 2026-10-02).
 *
 * The visible header badges already carry the basket sizes, but the visitor who
 * has just pressed Add needs the answer where they are: how many are in the
 * basket *now*. One pure home for the wording, so the cart control, the quote
 * controls and the plan page's add control cannot drift — and the counts follow
 * the header's own rule (`components/ui/public-shell.tsx`): the CART counts
 * items (a quantity is a unit), the QUOTE counts lines (a line is what the office
 * quotes).
 */

/** “Added ✓ · 3 items in cart” — the cart confirmation after an add. */
export function cartAddedLabel(items: number): string {
  return `Added ✓ · ${items} ${items === 1 ? "item" : "items"} in cart`;
}

/** “Added ✓ · 3 lines in your quote” — the quote confirmation after an add. */
export function quoteAddedLabel(lines: number): string {
  return `Added ✓ · ${lines} ${lines === 1 ? "line" : "lines"} in your quote`;
}
