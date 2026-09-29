"use client";

import { useState } from "react";
import Link from "next/link";
import { quoteLineKey, useQuoteBasket, type QuoteLine } from "@/lib/quote-basket/quote-basket-context";
import { chapelBookingLineSummary } from "@/lib/chapel-booking";
import { releaseChapelQuoteLine } from "@/lib/chapel-booking-api";
import { formatMinorUnits } from "@/lib/money";

/**
 * "In your quote" — the state the page shows after a successful add (approved
 * 2026-09-16 services design, question Q3).
 *
 * Today only the header's quote count changes after an add, so a family
 * that books a chapel and keeps reading cannot tell whether it worked. This
 * chip answers that in place, on the exact line that was added: the held dates
 * and the price for a chapel stay, or the quantity for a service line.
 *
 * Removing a chapel line releases the dates it holds through the SAME helper
 * the quote basket page uses (lib/chapel-booking-api.releaseChapelQuoteLine) — the
 * services page never invents its own release logic. A failed release keeps the
 * line removed and says plainly that the office must confirm (same rule as the
 * quote page).
 */
export function InQuoteNotice({
  sku,
  unit = "line",
}: {
  /** The catalogue SKU this surface offers (one card per SKU). */
  sku: string;
  /** Singular noun for a non-chapel line's unit ("line", "stay"). */
  unit?: string;
}) {
  const basket = useQuoteBasket();
  const [releaseError, setReleaseError] = useState<string | null>(null);
  if (!basket.ready) return null;
  const found = basket.lines.find((entry) => entry.sku === sku);
  if (!found) return null;
  const line: QuoteLine = found;

  const quantity = line.booking
    ? chapelBookingLineSummary(line.booking)
    : `${line.quantity} ${line.quantity === 1 ? unit : `${unit}s`}`;

  async function remove() {
    setReleaseError(null);
    const result = await releaseChapelQuoteLine(line, quoteLineKey(line), basket.remove);
    if (result.error) setReleaseError(result.error);
  }

  return (
    <div className="sv-quoterow">
      <p className="sv-cardchip">
        <span aria-hidden="true">✓</span> In your quote
      </p>
      <div className="sv-quotechip">
        <b>{quantity}</b>
        <span>
          {line.booking
            ? "Dates held while the line stays in your quote."
            : `${formatMinorUnits(line.unitPriceCents, line.currency)} each.`}
        </span>
      </div>
      {releaseError ? (
        <p className="sv-quoterow__error" role="alert">
          {releaseError} Please call the park office so they can free the chapel dates.
        </p>
      ) : null}
      <div className="sv-quoterow__actions">
        <Link href="/quote" className="btn btn--primary btn--sm">
          View your quote
        </Link>
        <button type="button" className="btn btn--secondary btn--sm" onClick={() => void remove()}>
          Remove
        </button>
      </div>
    </div>
  );
}
