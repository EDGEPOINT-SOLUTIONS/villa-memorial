"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicHero, SectionHead } from "@/components/kit";
import { containerClass } from "@/lib/public-layout";
import { cartLineKey, useCart } from "@/lib/cart/cart-context";
import { formatMinorUnits, previewSubtotal } from "@/lib/money";

type FieldErrors = {
  name?: string;
  email?: string;
  phone?: string;
};

/**
 * Checkout — the priced cart's final step.
 *
 * THE LOOK, NOT THE WORK (captain, 2026-09-30: "and also the checkout page it
 * should be revised for it to follow how every other pages looks like. the
 * forms should be in the center also."). The page now opens on the same designed
 * gateway every restyled public page opens on — kicker, the display-serif page
 * title at the page-title rung (weight 500, never bold), one short lead and the
 * page's own action — and reads as hairline-separated bands, exactly like the
 * sibling priced basket `/cart`:
 *
 *   · `PublicHero` (`variant="interior"`) in a `.checkout-page` scope that drops
 *     the shared boxed band and centres the copy;
 *   · ONE centred column at a comfortable reading measure (the captain's "the
 *     forms should be in the center"): the details, the order summary and the
 *     commit all share `.checkout-band`, never the old narrow left column;
 *   · the one gold commit (`Place order`) with the outline support actions, the
 *     same rung `/cart`'s `Proceed to checkout` wears;
 *   · a designed empty state that is a page (mark · display title · one line),
 *     not the shared dashed empty-state box.
 *
 * NOTHING ABOUT BEHAVIOUR CHANGED. The validation, the one `POST /api/orders`
 * payload (customer + sku/quantity lines), the order-number push, the clearing
 * of the cart and every field label / hint / error string are exactly as they
 * were. The order summary below is a read of `cart.lines` — no price is sent
 * that was not already sent.
 *
 * CSS: the "public: checkout" block at the tail of styles/components.css.
 */
export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!form.name.trim()) errors.name = "Enter the name the order is for.";
    if (!form.email.includes("@")) errors.email = "Enter an email address we can send the receipt to.";
    if (!form.phone.trim()) errors.phone = "Enter a contact number the store can call.";
    return errors;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
          },
          items: cart.lines.map((l) => ({ sku: l.sku, quantity: l.quantity })),
        }),
      });
      const payload = await res.json().catch(() => null);
      if (res.status === 201 && payload && typeof payload === "object" && "number" in payload) {
        const number = String((payload as { number: string }).number);
        // Chapel stays are QUOTE-ONLY (office, 2026-09-29): they are held in the
        // quote basket, never in this priced cart, so an order has no hold to
        // claim. The cart's lines are all priced catalogue items.
        cart.clear();
        router.push(`/orders/${number}`);
        return;
      }
      setServerError(
        payload && typeof payload === "object" && "error" in payload
          ? String((payload as { error: unknown }).error)
          : "Checkout is unavailable right now. Please try again.",
      );
      setSubmitting(false);
    } catch {
      setServerError("Checkout is unavailable right now. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className={`${containerClass("catalogue")} checkout-page`}>
      <PublicHero
        variant="interior"
        eyebrow="Memorial store"
        title="Checkout"
        lead="Review your details — the store confirms final pricing before you commit."
        secondary={{ label: "Back to cart", href: "/cart" }}
      />

      {!cart.ready ? (
        <section className="checkout-band" aria-label="Loading your order">
          <Skeleton lines={4} />
        </section>
      ) : cart.lines.length === 0 ? (
        <section className="checkout-band checkout-empty" aria-labelledby="checkout-empty-title">
          <span className="checkout-empty__mark" aria-hidden="true">
            <ShoppingBag size={30} strokeWidth={1.5} />
          </span>
          <h2 id="checkout-empty-title" className="checkout-empty__title">
            There&apos;s nothing to check out
          </h2>
          <p className="checkout-empty__line">
            Add items to your cart first. Browse the plans and services when you are ready —
            every figure is the office&apos;s published 2026 amount.
          </p>
          <div className="checkout-empty__actions">
            <Link href="/plans" className="btn btn--primary btn--lg">
              Browse plans &amp; services
            </Link>
          </div>
        </section>
      ) : (
        <form onSubmit={onSubmit} className="checkout-form" noValidate>
          {serverError ? (
            <div className="checkout-band checkout-alert">
              <Alert tone="danger" title="We couldn't place your order.">
                {serverError}
              </Alert>
            </div>
          ) : null}

          {/* 01 — Your details */}
          <section className="checkout-band" aria-labelledby="checkout-details-title">
            <SectionHead
              id="checkout-details-title"
              kicker="Your details"
              title="Who the order is for"
              lead="The store matches this order to your account by email if you already have one."
            />
            <div className="field-grid field-grid--1">
              <Field
                label="Complete name"
                htmlFor="co-name"
                hint="As it should appear on the receipt."
                error={fieldErrors.name}
              >
                <input
                  id="co-name"
                  autoComplete="name"
                  disabled={submitting}
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    setFieldErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                />
              </Field>
              <Field
                label="Email"
                htmlFor="co-email"
                hint="The order confirmation and receipt key go here."
                error={fieldErrors.email}
              >
                <input
                  id="co-email"
                  type="email"
                  autoComplete="email"
                  disabled={submitting}
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                />
              </Field>
              <Field
                label="Contact number"
                htmlFor="co-phone"
                hint="The store calls before delivery."
                error={fieldErrors.phone}
              >
                <input
                  id="co-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+63 …"
                  disabled={submitting}
                  value={form.phone}
                  onChange={(e) => {
                    setForm({ ...form, phone: e.target.value });
                    setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                />
              </Field>
            </div>
          </section>

          {/* 02 — Your order (a read of the cart — nothing is sent from here) */}
          <section className="checkout-band" aria-labelledby="checkout-order-title">
            <SectionHead
              id="checkout-order-title"
              kicker="Your order"
              title="What you are ordering"
              lead="The store re-prices the order and confirms before anything is final."
            />
            <ul className="checkout-lines">
              {cart.lines.map((line) => (
                <li className="checkout-line" key={cartLineKey(line)}>
                  <span className="checkout-line__name">
                    {line.name}
                    <span className="checkout-line__qty">
                      {line.quantity} × {formatMinorUnits(line.unitPriceCents, line.currency)}
                    </span>
                  </span>
                  <span className="checkout-line__total">
                    {formatMinorUnits(line.unitPriceCents * line.quantity, line.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="checkout-total">
              <div className="checkout-total__row">
                <span className="checkout-total__label">Estimated total</span>
                <strong className="checkout-total__figure">
                  {formatMinorUnits(previewSubtotal(cart.lines))}
                </strong>
              </div>
              <p className="checkout-total__note">
                Final pricing is confirmed by the store before you commit.
              </p>
            </div>
          </section>

          {/* The one commit — gold, with the outline support action */}
          <div className="checkout-band checkout-commit">
            <div className="checkout-actions">
              <Link href="/plans" className="btn btn--secondary btn--lg">
                Keep browsing
              </Link>
              <Button type="submit" size="lg" disabled={submitting}>
                {submitting ? "Placing your order…" : "Place order"}
              </Button>
            </div>
            <p className="field__hint checkout-actions__note">
              Payment in this demo settles immediately with the sandbox adapter.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
