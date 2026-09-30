import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { QuoteLine } from "@/lib/quote-basket/quote-basket-context";
import { chapelBookingLineSummary } from "@/lib/chapel-booking";
import { getQuoteLineCatalogDetail } from "@/lib/quote-basket/quote-line-details";
import {
  QUOTE_ON_REQUEST_LABEL,
  quoteLineCurrency,
  quoteLinePriced,
  quoteLineUnitPrice,
} from "@/lib/quote-basket/quote-line";
import { formatMinorUnits, previewSubtotal } from "@/lib/money";

/**
 * One QUOTE line, rendered from its OWN descriptor and pricing mode (never a
 * switch on the kind), plus its expandable "show this item's details again"
 * pane.
 *
 * A CARD, NOT A TABLE ROW. The old five-column table put Remove and the line
 * total off-screen on a phone and forced a pan frame; a card lays identity,
 * price mode, units, total and actions out in one block that stacks cleanly at
 * 390px with no horizontal pan.
 *
 * HONEST PRICING (D3-A, D4-A). A `published` line prints the 2026 figure the
 * adding surface supplied, with the office-confirms note. An `on_request` line
 * prints "To be quoted by the office" and NO line total — it never contributes
 * a figure to the page. The kind badge, unit and detail shape all come from
 * `line.descriptor`.
 *
 * The details pane reveals the item's REAL catalogue description by SKU (or an
 * honest fallback when the catalogue no longer knows it); it is always in the
 * DOM hidden, so the reveal is a plain toggle.
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
  const typeLabel = line.descriptor.label;
  const detailRowId = `quote-line-details-${(line.lineId ?? line.sku).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const priced = quoteLinePriced(line);
  const isLot = line.descriptor.detailSchema === "plot";
  const unit = line.descriptor.unit;
  const fixedUnit = Boolean(line.booking) || isLot;
  const showDetails = line.descriptor.actions.includes("details");
  const showQuantity = !fixedUnit && !unit;
  const priceCurrency = quoteLineCurrency(line);
  const lineTotal = previewSubtotal([
    { unitPriceCents: quoteLineUnitPrice(line), quantity: line.quantity },
  ]);

  const description =
    detail?.description ??
    (detail
      ? `No description is published for this ${typeLabel.toLowerCase()} yet — the office confirms inclusions and the quotation by hand.`
      : isLot
        ? "The plot is priced from the office's own 2026 lot table; the office confirms the plot, the schedule and the written quotation."
        : "This item is no longer published in the online catalogue — the office can still arrange it; call us and we will confirm what it costs.");
  const typeTone = line.kind === "package" ? "accent" : "info";

  return (
    <li className="quote-line" data-pricing={line.pricing.mode} data-kind={line.kind}>
      <div className="quote-line__body">
        <div className="quote-line__item">
          {showDetails ? (
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
          ) : null}
          <div className="quote-line__item-main">
            <div className="quote-line__badges">
              <Badge tone={typeTone}>{typeLabel}</Badge>
              <code className="text-sm text-muted">{line.sku}</code>
            </div>
            <strong className="quote-line__name">{line.name}</strong>
            {line.booking ? (
              <span className="quote-line__booking text-sm text-muted">
                {line.booking.resourceName} · {chapelBookingLineSummary(line.booking)} — dates held
              </span>
            ) : null}
            {line.detail ? (
              <p className="quote-line__detail text-sm text-muted">{line.detail}</p>
            ) : null}
          </div>
        </div>

        <dl className="quote-line__facts">
          <div className="quote-line__fact">
            <dt>{priced ? "Published 2026 figure" : "Price"}</dt>
            <dd>
              {priced ? (
                <>
                  <strong>{formatMinorUnits(quoteLineUnitPrice(line), priceCurrency)}</strong>
                  <span className="text-sm text-muted"> — the office confirms</span>
                </>
              ) : (
                <span className="quote-line__on-request">{QUOTE_ON_REQUEST_LABEL}</span>
              )}
            </dd>
          </div>

          {line.booking ? (
            <div className="quote-line__fact">
              <dt>Stay</dt>
              <dd>
                {line.booking.days} {line.booking.days === 1 ? "day" : "days"} — fixed by the
                booking
              </dd>
            </div>
          ) : isLot ? (
            <div className="quote-line__fact">
              <dt>Units</dt>
              <dd>1 lot</dd>
            </div>
          ) : showQuantity ? (
            <div className="quote-line__fact">
              <dt>Quantity</dt>
              <dd>
                <input
                  className="input"
                  id={`${detailRowId}-qty`}
                  name="quantity"
                  style={{ width: "5rem" }}
                  type="number"
                  min={1}
                  max={99}
                  value={line.quantity}
                  aria-label={`Quantity for ${line.name}`}
                  onChange={(e) => onQuantityChange(Number(e.target.value))}
                />
              </dd>
            </div>
          ) : (
            <div className="quote-line__fact">
              <dt>{unit === "day" ? "Days" : "Quantity"}</dt>
              <dd>
                {line.quantity} {line.quantity === 1 ? (unit ?? "unit") : `${unit ?? "unit"}s`}
              </dd>
            </div>
          )}

          {priced ? (
            <div className="quote-line__fact quote-line__fact--total">
              <dt>Line total</dt>
              <dd>{formatMinorUnits(lineTotal, priceCurrency)}</dd>
            </div>
          ) : null}
        </dl>

        <div className="quote-line__actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            title={line.booking ? "Removes the line and releases the chapel dates" : undefined}
          >
            Remove
          </Button>
        </div>
      </div>

      {showDetails ? (
        <div className="quote-line-details-row" hidden={!open} id={detailRowId}>
          <div className="quote-line-details-cell">
            <div className="quote-line-details">
              <div className="quote-line-details__main">
                <div className="row row--space" style={{ marginBottom: "var(--space-2)" }}>
                  <Badge tone={typeTone}>{typeLabel}</Badge>
                  <code className="text-sm text-muted">{line.sku}</code>
                </div>
                <h3 className="quote-line-details__name">{line.name}</h3>
                <p className="quote-line-details__desc">{description}</p>
                {detail ? (
                  <Link
                    href={line.kind === "package" ? "/plans/packages" : `/products/${line.sku}`}
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
                      ? formatMinorUnits(quoteLineUnitPrice(line), priceCurrency)
                      : QUOTE_ON_REQUEST_LABEL}
                  </dd>
                </div>
                <div className="quote-line-details__recap-row">
                  <dt>{line.booking ? "Days" : isLot ? "Plot" : "Quantity"}</dt>
                  <dd>{isLot ? "1" : line.quantity}</dd>
                </div>
                {priced ? (
                  <div className="quote-line-details__recap-row">
                    <dt>Line total</dt>
                    <dd>{formatMinorUnits(lineTotal, priceCurrency)}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}
