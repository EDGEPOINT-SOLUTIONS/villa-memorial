import { Fragment } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { QuoteLine } from "@/lib/quote-basket/quote-basket-context";
import { chapelBookingLineSummary } from "@/lib/chapel-booking";
import {
  QUOTE_LINE_TYPE_LABEL,
  getQuoteLineCatalogDetail,
} from "@/lib/quote-basket/quote-line-details";
import { formatMinorUnits, previewSubtotal } from "@/lib/money";

/**
 * One QUOTE line plus its expandable "show this item's details again" row
 * (used by the quote page).
 *
 * Each line has a chevron control; opening it reveals the item's REAL catalogue
 * details inline below the row (name · type · SKU · what's included/description
 * · unit price · quantity · line total — the same facts the detail page shows,
 * resolved from the recorded commerce catalogue by the line's SKU, never
 * invented). The details row is always in the DOM so the reveal is a plain
 * hidden toggle; aria-expanded/aria-controls keep the state announced.
 *
 * THREE LINE KINDS BEYOND THE CATALOGUE SHAPE, each honest:
 *  · a line with no published figure (a service the sheets only quote, a
 *    request added from the quote form) prints "Quoted on request" — never a
 *    ₱0.00 that looks like a price;
 *  · a chapel booking keeps its held dates and its FIXED day count (the
 *    quantity input is not shown — the booking owns the days);
 *  · a lot line names the plot/section it is about and carries no stock
 *    quantity (one plot is one line).
 *
 * Presentational (controlled by the quote page) so it renders under node tests.
 */
export function QuoteLineRow({
  line,
  open,
  onToggle,
  onQuantityChange,
  onRemove,
}: {
  line: QuoteLine;
  open: boolean;
  onToggle: () => void;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}) {
  const detail = getQuoteLineCatalogDetail(line.sku);
  const typeLabel = QUOTE_LINE_TYPE_LABEL[line.itemType] ?? "Item";
  const detailRowId = `quote-line-details-${line.sku}`;
  const priced = !line.booking && line.unitPriceCents > 0;
  const isLot = line.itemType === "lot";

  const description =
    detail?.description ??
    (detail
      ? `No description is published for this ${typeLabel.toLowerCase()} yet — the office confirms inclusions and the quotation by hand.`
      : isLot
        ? "The plot is priced from the office's own 2026 lot table; the office confirms the plot, the schedule and the written quotation."
        : "This item is no longer published in the online catalogue — the office can still arrange it; call us and we will confirm what it costs.");
  const typeTone = line.itemType === "package" ? "accent" : "info";

  return (
    <Fragment>
      <tr>
        <td>
          <div className="quote-line__item">
            <button
              type="button"
              className="quote-line-toggle"
              aria-expanded={open}
              aria-controls={detailRowId}
              aria-label={`${open ? "Hide" : "Show"} details for ${line.name}`}
              onClick={onToggle}
            >
              <svg
                className="quote-line-toggle__icon"
                width="12"
                height="12"
                viewBox="0 0 12 12"
                aria-hidden="true"
              >
                <path
                  d="M2.5 4.5 6 8l3.5-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div className="quote-line__item-main">
              <strong>{line.name}</strong>
              {line.booking ? (
                <div className="quote-line__booking">
                  <Badge tone="info">{line.booking.resourceName}</Badge>
                  <span className="text-sm text-muted">
                    {chapelBookingLineSummary(line.booking)} — dates held
                  </span>
                </div>
              ) : null}
              {line.detail ? (
                <p className="quote-line__detail text-sm text-muted">{line.detail}</p>
              ) : null}
              <br />
              <code className="text-sm text-muted">{isLot ? line.sku : line.sku}</code>
            </div>
          </div>
        </td>
        <td className="table__numeric">
          {priced ? formatMinorUnits(line.unitPriceCents, line.currency) : (
            <span className="text-sm text-muted">Quoted on request</span>
          )}
        </td>
        <td>
          {line.booking ? (
            <span className="text-sm text-muted">
              {line.booking.days} {line.booking.days === 1 ? "day" : "days"} — fixed by the
              booking
            </span>
          ) : isLot ? (
            <span className="text-sm text-muted">1 lot</span>
          ) : (
            <input
              className="input"
              style={{ width: "5rem" }}
              type="number"
              min={1}
              max={99}
              value={line.quantity}
              aria-label={`Quantity for ${line.name}`}
              onChange={(e) => onQuantityChange(Number(e.target.value))}
            />
          )}
        </td>
        <td className="table__numeric">
          {priced ? formatMinorUnits(previewSubtotal([line]), line.currency) : (
            <span className="text-sm text-muted">—</span>
          )}
        </td>
        <td>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            title={line.booking ? "Removes the line and releases the chapel dates" : undefined}
          >
            Remove
          </Button>
        </td>
      </tr>
      <tr className="quote-line-details-row" hidden={!open} id={detailRowId}>
        <td colSpan={5} className="quote-line-details-cell">
          <div className="quote-line-details">
            <div className="quote-line-details__main">
              <div className="row row--space" style={{ marginBottom: "var(--space-2)" }}>
                <Badge tone={typeTone}>{typeLabel}</Badge>
                <code className="text-sm text-muted">{line.sku}</code>
              </div>
              <h4 className="quote-line-details__name">{line.name}</h4>
              <p className="quote-line-details__desc">{description}</p>
              {detail ? (
                <Link
                  // A package's detail page is /plans/[sku]; every other
                  // catalogue line (services, add-ons) is /products/[sku].
                  href={
                    line.itemType === "package"
                      ? "/plans/packages"
                      : `/products/${line.sku}`
                  }
                  className="btn btn--secondary btn--sm"
                >
                  View full details
                </Link>
              ) : isLot ? (
                <Link href="/lots/price-list-2026" className="btn btn--secondary btn--sm">
                  See the 2026 lot price list
                </Link>
              ) : null}
            </div>
            <dl className="quote-line-details__recap" aria-label="Line summary">
              {line.booking ? (
                <div className="quote-line-details__recap-row">
                  <dt>Chapel</dt>
                  <dd>{line.booking.resourceName}</dd>
                </div>
              ) : null}
              {line.booking ? (
                <div className="quote-line-details__recap-row">
                  <dt>Booked dates</dt>
                  <dd>{chapelBookingLineSummary(line.booking)}</dd>
                </div>
              ) : null}
              <div className="quote-line-details__recap-row">
                <dt>Unit price</dt>
                <dd>
                  {priced
                    ? formatMinorUnits(line.unitPriceCents, line.currency)
                    : "Quoted on request"}
                </dd>
              </div>
              <div className="quote-line-details__recap-row">
                <dt>{line.booking ? "Days" : isLot ? "Plot" : "Quantity"}</dt>
                <dd>{isLot ? "1" : line.quantity}</dd>
              </div>
              <div className="quote-line-details__recap-row">
                <dt>Line total</dt>
                <dd>
                  {priced
                    ? formatMinorUnits(previewSubtotal([line]), line.currency)
                    : "Quoted on request"}
                </dd>
              </div>
            </dl>
          </div>
        </td>
      </tr>
    </Fragment>
  );
}
