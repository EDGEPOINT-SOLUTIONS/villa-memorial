"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/lib/cart/cart-context";

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!cart.ready) {
    return <Skeleton lines={4} />;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    if (
      !form.name.trim() ||
      !form.email.includes("@") ||
      !form.phone.trim()
    ) {
      setValidationError("Please provide your complete name, email, and contact number.");
      return;
    }
    setValidationError(null);
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
        cart.clear();
        router.push(`/orders/${String((payload as { number: string }).number)}`);
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
          {validationError ? (
            <div className="mb-4">
              <Alert tone="danger">{validationError}</Alert>
            </div>
          ) : null}
          {serverError ? (
            <div className="mb-4">
              <Alert tone="danger" title="We couldn't place your order.">
                {serverError}
              </Alert>
            </div>
          ) : null}

          <form onSubmit={onSubmit} noValidate>
            <p className="text-sm text-muted mb-4">
              Your details let the store match this order to your account — matched
              by email if you already have one.
            </p>
            <Field label="Complete name *" htmlFor="co-name">
              <input
                id="co-name"
                className="input"
                autoComplete="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={submitting}
              />
            </Field>
            <Field label="Email *" htmlFor="co-email">
              <input
                id="co-email"
                className="input"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={submitting}
              />
            </Field>
            <Field label="Contact number *" htmlFor="co-phone">
              <input
                id="co-phone"
                className="input"
                type="tel"
                autoComplete="tel"
                placeholder="+63 …"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                disabled={submitting}
              />
            </Field>
            <Button type="submit" size="lg" disabled={submitting} style={{ width: "100%" }}>
              {submitting ? "Placing your order…" : "Place order"}
            </Button>
            <p className="field__hint mt-2">
              Payment in this demo settles immediately with the sandbox adapter.
            </p>
          </form>
        </div>
      )}
    </>
  );
}
