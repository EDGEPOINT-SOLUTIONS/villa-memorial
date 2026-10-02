import { describe, expect, it } from "vitest";
import { cartAddedLabel, quoteAddedLabel } from "@/lib/basket-guidance";

/**
 * The running-count confirmation on the add controls (captain, 2026-10-02:
 * “the page should provide a visual or guidance … on how many are he requesting
 * for quotes or adding to cart now”).
 *
 * The counts follow the header's own rule — the CART counts items, the QUOTE
 * counts lines — so the confirmation and the header badge can never disagree.
 */
describe("basket guidance", () => {
  it("names the cart's running item count", () => {
    expect(cartAddedLabel(1)).toBe("Added ✓ · 1 item in cart");
    expect(cartAddedLabel(3)).toBe("Added ✓ · 3 items in cart");
  });

  it("names the quote's running line count", () => {
    expect(quoteAddedLabel(1)).toBe("Added ✓ · 1 line in your quote");
    expect(quoteAddedLabel(3)).toBe("Added ✓ · 3 lines in your quote");
  });
});
