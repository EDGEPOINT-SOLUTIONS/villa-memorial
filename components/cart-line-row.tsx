import { Fragment } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CartLine } from "@/lib/cart/cart-context";
import {
  CART_LINE_TYPE_LABEL,
  getCartLineCatalogDetail,
} from "@/lib/cart/cart-line-details";
import { formatMinorUnits, previewSubtotal } from "@/lib/money";

/**
 * One cart line plus its expandable "show this item's details again" row
 * (used by the cart page).
 *
 * Each line has a chevron control; opening it reveals the item's REAL catalogue
 * details inline below the row (name · type · SKU · what's included/description
 * · unit price · quantity · line total — the same facts the detail page shows,
 * resolved from the recorded commerce catalogue by the line's SKU, never
 * invented). The details row is always in the DOM so the reveal is a plain
 * hidden toggle; aria-expanded/aria-controls keep the state announced.
 *
 * Presentational (controlled by CartPage) so it renders under node tests.
 */
export function CartLineRow({
  line,
  open,
  onToggle,
  onQuantityChange,
  onRemove,
}: {
  line: CartLine;
  open: boolean;
  onToggle: () => void;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}) {
  const detail = getCartLineCatalogDetail(line.sku);
  const typeLabel = CART_LINE_TYPE_LABEL[line.itemType] ?? "Item";
  const detailRowId = `cart-line-details-${line.sku}`;

  const description =
    detail?.description ??
    (detail
      ? `No description is published for this ${typeLabel.toLowerCase()} yet — the store confirms inclusions and pricing at checkout.`
      : "Catalogue details are no longer published for this line — the store confirms inclusions and pricing at checkout.");
  const typeTone = line.itemType === "package" ? "accent" : "info";

  return (
    <Fragment>
      <tr>
        <td>
          <div className="cart-line__item">
            <button
              type="button"
              className="cart-line-toggle"
              aria-expanded={open}
              aria-controls={detailRowId}
              aria-label={`${open ? "Hide" : "Show"} details for ${line.name}`}
              onClick={onToggle}
            >
              <svg
                className="cart-line-toggle__icon"
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
            <div className="cart-line__item-main">
              <strong>{line.name}</strong>
              <br />
              <code className="text-sm text-muted">{line.sku}</code>
            </div>
          </div>
        </td>
        <td className="table__numeric">
          {formatMinorUnits(line.unitPriceCents, line.currency)}
        </td>
        <td>
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
        </td>
        <td className="table__numeric">
          {formatMinorUnits(previewSubtotal([line]), line.currency)}
        </td>
        <td>
          <Button variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        </td>
      </tr>
      <tr className="cart-line-details-row" hidden={!open} id={detailRowId}>
        <td colSpan={5} className="cart-line-details-cell">
          <div className="cart-line-details">
            <div className="cart-line-details__main">
              <div className="row row--space" style={{ marginBottom: "var(--space-2)" }}>
                <Badge tone={typeTone}>{typeLabel}</Badge>
                <code className="text-sm text-muted">{line.sku}</code>
              </div>
              <h4 className="cart-line-details__name">{line.name}</h4>
              <p className="cart-line-details__desc">{description}</p>
              <Link href={`/plans/${line.sku}`} className="btn btn--secondary btn--sm">
                View full details
              </Link>
            </div>
            <dl className="cart-line-details__recap" aria-label="Line summary">
              <div className="cart-line-details__recap-row">
                <dt>Unit price</dt>
                <dd>{formatMinorUnits(line.unitPriceCents, line.currency)}</dd>
              </div>
              <div className="cart-line-details__recap-row">
                <dt>Quantity</dt>
                <dd>{line.quantity}</dd>
              </div>
              <div className="cart-line-details__recap-row">
                <dt>Line total</dt>
                <dd>{formatMinorUnits(previewSubtotal([line]), line.currency)}</dd>
              </div>
            </dl>
          </div>
        </td>
      </tr>
    </Fragment>
  );
}
