# Basket guidance — the running count on the add controls

**Task:** `villa-admin-ia` · **Date:** 2026-10-02 · **Mode:** local-only ship
**Direction (captain, 2026-10-02):** “in requesting quotes and or adding carts, the page should
provide a visual or guidance for the visitor on how many are he requesting for quotes or adding to
cart now.”

The header badges (`Your Cart n` · `Your Quote n`) already carry the basket sizes, and the `/cart`
and `/quote` pages already lead with their totals. What was missing is the answer **where the
visitor just pressed Add**: the confirmation said “Added ✓” but not how many are in the basket now.

## What changed

One pure home for the wording — `lib/basket-guidance.ts`:

- `cartAddedLabel(items)` → “Added ✓ · 3 items in cart”
- `quoteAddedLabel(lines)` → “Added ✓ · 3 lines in your quote”

The counts follow the header's own rule (`components/ui/public-shell.tsx`): the **cart counts
items** (a quantity is a unit) and the **quote counts lines** (a line is what the office quotes), so
the confirmation and the header badge can never disagree. Four add controls now show it, and their
accessible name carries the same running count while the added state is up:

| Control | Surface | File |
|---|---|---|
| Add to cart | `/products`, `/plans`, `/services` rows | `components/catalogue-add-button.tsx` |
| Add to Quote (service/item) | `/services`, embalming picker, price list | `components/villa/item-quote-button.tsx` |
| Add to quote (lot) | `/lots/price-list-2026` | `components/villa/lot-quote-button.tsx` |
| Add to quote (package) | `/plans/[sku]` | `app/(public)/plans/[sku]/add-to-quote.tsx` |

The `/quote` and `/cart` pages keep their existing lead counts (“N things · one written quotation”,
“N items — prices are confirmed at checkout”) and their section heads (“In your cart · 2 items”);
no second counting rule was added.

## Evidence (1440 and 390)

Production build (`npm run build`, `next start`), driven with `chrome-devtools-axi`; the add
confirmations were read back from the live page:

- `/products` add → **“Added ✓ · 2 items in cart”**
- `/services` add → **“Added ✓ · 1 line in your quote”**
- `/lots/price-list-2026` add → **“Added ✓ · 2 lines in your quote”**

| Shot | File |
|---|---|
| The quote page: header `Your Quote 2`, lead “2 things”, “2 items — 1 published · 1 by hand” at 1440 | `quote-1440.png` |
| The quote page at 390 | `quote-390.png` |
| The cart page: header `Your Cart 2`, lead “2 items”, “In your cart · 2 items” at 1440 | `cart-1440.png` |
| The cart page at 390 | `cart-390.png` |

## Boundary

The guidance is presentation only: the counts come from the same client-side cart / quote-basket
contexts the pages already use (`lib/cart/cart-context.tsx`, `lib/quote-basket/quote-basket-context.tsx`),
and no server write is added. `tests/unit/basket-guidance.test.ts` pins the wording and the
singular/plural rule.
