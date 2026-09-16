"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { claimChapelCartLines } from "@/lib/chapel-booking-api";
import { useCart } from "@/lib/cart/cart-context";

type FieldErrors = {
  name?: string;
  email?: string;
  phone?: string;
};

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!cart.ready) {
    return <Skeleton lines={4} />;
  }

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
        // The checkout contract carries only sku+quantity, so the chapel holds in
        // this cart are linked to the placed order here, in the page that still
        // knows their reservation ids. Best-effort: the order is already placed,
        // and a failed link leaves a hold the office confirms by hand.
        const heldLines = cart.lines.filter((line) => line.booking);
        cart.clear();
        await claimChapelCartLines(heldLines, number);
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
    <>
      <div className="page-header">
        <div>
          <p className="page-header__eyebrow">Memorial store</p>
          <h1>Checkout</h1>
          <p className="text-sm text-muted">
            Review your details — the store confirms final pricing before you commit.
          </p>
          <nav aria-label="Back" style={{ marginTop: "var(--space-3)" }}>
            <Link href="/cart" className="back-link">← Back to cart</Link>
          </nav>
        </div>
      </div>

      {cart.lines.length === 0 ? (
        <>
          <EmptyState
            title="There's nothing to check out"
            hint="Add items to your cart first."
          />
          <div className="mt-4">
            <Link href="/plans" className="btn btn--primary">
              Browse plans &amp; services
            </Link>
          </div>
        </>
      ) : (
        <div className="page-section" style={{ maxWidth: "34rem" }}>
          {serverError ? (
            <div className="mb-4">
              <Alert tone="danger" title="We couldn't place your order.">
                {serverError}
              </Alert>
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="stack" noValidate>
            {/* 01 — Your details */}
            <section className="card capture-section">
              <div className="capture-section__head">
                <span className="capture-section__num" aria-hidden="true">
                  01
                </span>
                <div>
                  <h3 className="capture-section__title">Your details</h3>
                  <p className="capture-section__blurb">
                    The store matches this order to your account by email if you already
                    have one.
                  </p>
                </div>
              </div>
              <div className="capture-section__body">
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
              </div>
            </section>

            <div className="capture-actions">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Placing your order…" : "Place order"}
              </Button>
            </div>
            <p className="field__hint">
              Payment in this demo settles immediately with the sandbox adapter.
            </p>
          </form>
        </div>
      )}
    </>
  );
}
