"use client";

import { useState } from "react";
import Link from "next/link";
import { cartLineKey, useCart, type CartLine } from "@/lib/cart/cart-context";
import { chapelBookingLineSummary } from "@/lib/chapel-booking";
import { releaseChapelQuoteLine } from "@/lib/chapel-booking-api";
import { formatMinorUnits } from "@/lib/money";

/**
 * "In your cart" — the state the page shows after a successful add (approved
 * 2026-09-16 services design, question Q3).
 *
 * Today only the header's tiny cart count changes after an add, so a family
 * that books a chapel and keeps reading cannot tell whether it worked. This
 * chip answers that in place, on the exact line that was added: the held dates
 * and the price for a chapel stay, or the quantity for a service line.
 *
 * Removing a chapel line releases the dates it holds through the SAME helper
 * the cart page uses (lib/chapel-booking-api.releaseChapelCartLine) — the
 * services page never invents its own release logic. A failed release keeps the
 * line removed and says plainly that the office must confirm (same rule as the
 * cart page).
 */
export function InCartNotice({
  sku,
  unit = "line",
}: {
  /** The catalogue SKU this surface offers (one card per SKU). */
  sku: string;
  /** Singular noun for a non-chapel line's unit ("line", "stay"). */
  unit?: string;
}) {
  const cart = useCart();
  const [releaseError, setReleaseError] = useState<string | null>(null);
  if (!cart.ready) return null;
  const found = cart.lines.find((entry) => entry.sku === sku);
  if (!found) return null;
  const line: CartLine = found;

  const quantity = line.booking
    ? chapelBookingLineSummary(line.booking)
    : `${line.quantity} ${line.quantity === 1 ? unit : `${unit}s`}`;

  async function remove() {
    setReleaseError(null);
    const result = await releaseChapelQuoteLine(line, cartLineKey(line), cart.remove);
    if (result.error) setReleaseError(result.error);
  }

  return (
    <div className="sv-cartrow">
      <p className="sv-cardchip">
        <span aria-hidden="true">✓</span> In your cart
      </p>
      <div className="sv-cartchip">
        <b>{quantity}</b>
        <span>
          {line.booking
            ? "Dates held while the line stays in your cart."
            : `${formatMinorUnits(line.unitPriceCents, line.currency)} each.`}
        </span>
      </div>
      {releaseError ? (
        <p className="sv-cartrow__error" role="alert">
          {releaseError} Please call the park office so they can free the chapel dates.
        </p>
      ) : null}
      <div className="sv-cartrow__actions">
        <Link href="/cart" className="btn btn--primary btn--sm">
          View cart
        </Link>
        <button type="button" className="btn btn--secondary btn--sm" onClick={() => void remove()}>
          Remove
        </button>
      </div>
    </div>
  );
}
