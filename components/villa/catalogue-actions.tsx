import Link from "next/link";
import { CatalogueAddButton } from "@/components/catalogue-add-button";
import { buildRequestHref, type RequestPrefill } from "@/lib/public-forms/request-prefill";
import { formatMinorUnits } from "@/lib/money";
import type { CartLine } from "@/lib/cart/cart-context";

/**
 * The storefront's two actions for one price-list line, together:
 *   · "Add to cart" — the shared CatalogueAddButton, fed the EXACT catalogue
 *     sku/name/type/price the row publishes (never a hand-typed shape);
 *   · "Request order" — the prefilled contact capture for anything the cart
 *     cannot settle (senior conditions, day counts, availability). It is an
 *     enquiry; nothing is reserved.
 *
 * Used by /products (casket cards) and /services (a-la-carte, embalming and
 * chapel lines) so every sellable line offers the same pair.
 */
export function CatalogueActions({
  item,
  prefill,
  quantity = 1,
  addLabel,
  displayPrice,
}: {
  item: Omit<CartLine, "quantity">;
  /** Extra request context; item/sku/price default to the catalogue facts. */
  prefill?: Partial<RequestPrefill>;
  /** Add more than one unit (e.g. a chapel stay of N days). */
  quantity?: number;
  /** Override the add button's visible label (e.g. "Add 3 days"). */
  addLabel?: string;
  /**
   * The catalogue's own `display_price` string (e.g. "₱600.00 / month"). Used
   * as the request's price when the caller passes none, so the request echoes
   * the unit the row shows; falls back to formatting the minor units.
   */
  displayPrice?: string;
}) {
  return (
    <div className="catalogue-actions">
      <CatalogueAddButton
        item={{ sku: item.sku, name: item.name, itemType: item.itemType, unitPriceCents: item.unitPriceCents, currency: item.currency }}
        quantity={quantity}
        label={addLabel}
      />
      <Link
        href={buildRequestHref({
          item: item.name,
          sku: item.sku,
          price:
            prefill?.price ??
            displayPrice ??
            formatMinorUnits(item.unitPriceCents, item.currency),
          note: prefill?.note,
        })}
        className="btn btn--secondary btn--sm"
      >
        Request order
      </Link>
    </div>
  );
}
