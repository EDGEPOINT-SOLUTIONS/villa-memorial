"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CartLineRow } from "@/components/cart-line-row";
import { cartLineKey, useCart, type CartLine } from "@/lib/cart/cart-context";
import { releaseChapelQuoteLine } from "@/lib/chapel-booking-api";
import { formatMinorUnits, previewSubtotal } from "@/lib/money";

/**
 * Cart page — each line is a row with a chevron expand control that reveals
 * that item's real catalogue details inline (see CartLineRow), plus working
 * quantity / remove controls, the estimated-total summary card, and the same
 * empty / loading states as before.
 *
 * Removing a chapel line releases the dates it holds (lib/chapel-booking-api) —
 * the schedule stays honest. If that release call fails the line is still
 * removed and the page says plainly that the office must confirm.
 */
export default function CartPage() {
  const cart = useCart();
  const [openSkus, setOpenSkus] = useState<ReadonlySet<string>>(new Set());
  const [releaseError, setReleaseError] = useState<string | null>(null);

  async function removeLine(line: CartLine) {
    setReleaseError(null);
    const result = await releaseChapelQuoteLine(
      line,
      cartLineKey(line),
      cart.remove,
    );
    if (result.error) setReleaseError(result.error);
  }

  const toggle = (key: string) =>
    setOpenSkus((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

  if (!cart.ready) {
    return <Skeleton lines={4} />;
  }

  if (cart.lines.length === 0) {
    return (
      <div className="cart-page">
        <div className="page-header">
          <div className="page-header__text">
            <p className="page-header__eyebrow">Memorial store</p>
            <h1>Your cart</h1>
          </div>
        </div>
        {releaseError ? (
          <div className="mb-4">
            <Alert tone="warning" title="The dates could not be released automatically">
              {releaseError} Please call the park office so they can free the chapel dates.
            </Alert>
          </div>
        ) : null}
        <EmptyState
          title="Your cart is empty"
          hint="Browse the plans and services to start an order."
        />
        <div className="mt-4">
          <Link href="/plans" className="btn btn--primary">
            Browse plans &amp; services
          </Link>
        </div>
      </div>
    );
  }

  const itemCount = cart.lines.reduce((n, l) => n + l.quantity, 0);

  return (
    <div className="cart-page">
      <div className="page-header">
        <div className="page-header__text">
          <p className="page-header__eyebrow">Memorial store</p>
          <h1>Your cart</h1>
          <p className="page-header__lead">
            {itemCount} {itemCount === 1 ? "item" : "items"} · prices are confirmed by the
            store at checkout.
          </p>
        </div>
      </div>
      {releaseError ? (
        <div className="mb-4">
          <Alert tone="warning" title="The dates could not be released automatically">
            {releaseError} Please call the park office so they can free the chapel dates.
          </Alert>
        </div>
      ) : null}
      <div className="page-section">
        <div className="table-wrapper" tabIndex={0}>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col" className="table__numeric">Unit price</th>
                <th scope="col">Quantity</th>
                <th scope="col" className="table__numeric">Line total</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              {cart.lines.map((l) => {
                const key = cartLineKey(l);
                return (
                  <CartLineRow
                    key={key}
                    line={l}
                    open={openSkus.has(key)}
                    onToggle={() => toggle(key)}
                    onQuantityChange={(q) => cart.setQuantity(key, q)}
                    onRemove={() => void removeLine(l)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card cart-summary" style={{ maxWidth: "22rem", marginLeft: "auto" }}>
        <div className="card__body row" style={{ justifyContent: "space-between" }}>
          <span>Estimated total</span>
          <strong style={{ fontSize: "var(--text-lg)" }}>
            {formatMinorUnits(previewSubtotal(cart.lines))}
          </strong>
        </div>
        <div className="card__footer">
          Final pricing is confirmed by the store at checkout.
        </div>
      </div>

      <div className="row mt-4" style={{ justifyContent: "flex-end" }}>
        <Link href="/plans" className="btn btn--secondary">
          Keep browsing
        </Link>
        <Link href="/checkout" className="btn btn--primary btn--lg">
          Proceed to checkout
        </Link>
      </div>
    </div>
  );
}
