"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CartLineRow } from "@/components/cart-line-row";
import { PublicHero, SectionHead } from "@/components/kit";
import { containerClass } from "@/lib/public-layout";
import { cartLineKey, useCart, type CartLine } from "@/lib/cart/cart-context";
import { releaseChapelQuoteLine } from "@/lib/chapel-booking-api";
import { formatMinorUnits, previewSubtotal } from "@/lib/money";

/**
 * Cart page — the priced basket (office, 2026-09-29: priced items go to the
 * cart, quote-only items to /quote; neither can hold the other's line).
 *
 * THE LOOK, NOT THE WORK (captain, 2026-09-30): the page opens on the same
 * designed gateway every other public page opens on — kicker, the display-serif
 * page title at the page-title rung (weight 500, never bold), one short lead and
 * the page's own action — then reads as hairline-separated bands: the lines, the
 * estimated total, the commit. The behaviour is untouched: the same cart
 * context, the same quantity / remove controls, the same chapel release, the
 * same checkout link.
 *
 * Each line is still a row with a chevron expand control that reveals that
 * item's real catalogue details inline (see CartLineRow). Below 40rem the table
 * re-lays-out as stacked rows (the same grammar /price-list uses for its rate
 * card) so a phone gets the page, not a shrunken desktop.
 *
 * Removing a chapel line releases the dates it holds (lib/chapel-booking-api) —
 * the schedule stays honest. If that release call fails the line is still
 * removed and the page says plainly that the office must confirm.
 *
 * CSS: the "public: cart" block at the tail of styles/components.css.
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

  const itemCount = cart.lines.reduce((n, l) => n + l.quantity, 0);
  // While the stored cart is still loading, and for a genuinely empty cart, the
  // page's one action is to go and choose something. Only a ready cart with
  // lines commits to checkout.
  const hasLines = cart.ready && cart.lines.length > 0;

  return (
    <div className={`${containerClass("catalogue")} cart-page`}>
      <PublicHero
        variant="interior"
        eyebrow="Memorial store"
        title="Your cart"
        lead={
          hasLines
            ? `${itemCount} ${itemCount === 1 ? "item" : "items"} — prices are confirmed at checkout.`
            : "Nothing here yet — the plans, caskets and services are ready when you are."
        }
        primary={
          hasLines
            ? { label: "Proceed to checkout", href: "/checkout" }
            : { label: "Browse plans & services", href: "/plans" }
        }
        secondary={
          hasLines
            ? { label: "Keep browsing", href: "/plans" }
            : { label: "See the 2026 price list", href: "/price-list" }
        }
      />

      {releaseError ? (
        <div className="cart-alert">
          <Alert tone="warning" title="The dates could not be released automatically">
            {releaseError} Please call the park office so they can free the chapel dates.
          </Alert>
        </div>
      ) : null}

      {!cart.ready ? (
        <section className="cart-band" aria-label="Loading your cart">
          <Skeleton lines={4} />
        </section>
      ) : !hasLines ? (
        <section className="cart-band cart-empty" aria-labelledby="cart-empty-title">
          <span className="cart-empty__mark" aria-hidden="true">
            <ShoppingBag size={30} strokeWidth={1.5} />
          </span>
          <h2 id="cart-empty-title" className="cart-empty__title">
            Your cart is empty
          </h2>
          <p className="cart-empty__line">
            Nothing has been chosen yet. Browse the plans and services when you are ready —
            every figure is the office&apos;s published 2026 amount.
          </p>
        </section>
      ) : (
        <>
          <section className="cart-band" aria-labelledby="cart-lines-title">
            <SectionHead
              id="cart-lines-title"
              kicker="In your cart"
              title={`${itemCount} ${itemCount === 1 ? "item" : "items"}`}
              lead="Open a line to see its catalogue details again before you check out."
            />
            <div className="table-wrapper" tabIndex={0}>
              <table className="table cart-lines">
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col" className="table__numeric">
                      Unit price
                    </th>
                    <th scope="col">Quantity</th>
                    <th scope="col" className="table__numeric">
                      Line total
                    </th>
                    <th scope="col">
                      <span className="visually-hidden">Remove</span>
                    </th>
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
          </section>

          <section className="cart-band" aria-labelledby="cart-total-title">
            <h2 id="cart-total-title" className="visually-hidden">
              Estimated total
            </h2>
            <div className="cart-total">
              <div className="cart-total__row">
                <span className="cart-total__label">Estimated total</span>
                <strong className="cart-total__figure">
                  {formatMinorUnits(previewSubtotal(cart.lines))}
                </strong>
              </div>
              <p className="cart-total__note">
                Final pricing is confirmed by the store at checkout.
              </p>
            </div>
          </section>

          <div className="cart-actions">
            <Link href="/plans" className="btn btn--secondary">
              Keep browsing
            </Link>
            <Link href="/checkout" className="btn btn--primary btn--lg">
              Proceed to checkout
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
