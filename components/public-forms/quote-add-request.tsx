"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useModalFocus } from "@/components/ui/use-modal-focus";
import { useQuoteBasket } from "@/lib/quote-basket/quote-basket-context";
import { quoteLineDescriptor } from "@/lib/quote-basket/quote-line";

/**
 * "Ask about something not listed" — the ONE typed add left on `/quote`
 * (captain D2-A, 2026-09-30).
 *
 * The page's old inline add form was a second full contact form (name, email,
 * phone, a service, a date, notes AND consent) sitting above the basket it fed,
 * so a family was asked for the same details twice and had to consent before a
 * quote even existed. This dialog collects ONLY what a line needs — what the
 * family is asking about, an optional preferred date and an optional note — and
 * adds an `on_request` line. The contact details and consent are collected once,
 * at the send step.
 *
 * It is opened by a small link on `/quote`; when a `?item=` prefill arrives it
 * opens seeded with that item (the `/services` "Start a quote" door). Focus,
 * Escape and scroll-lock come from the shared `useModalFocus` hook.
 */
export function QuoteAddRequest({
  open,
  onClose,
  initialItem = "",
}: {
  open: boolean;
  onClose: () => void;
  initialItem?: string;
}) {
  const basket = useQuoteBasket();
  const { panelRef } = useModalFocus<HTMLDivElement>(open, onClose);
  const [item, setItem] = useState(initialItem);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function add() {
    const name = item.trim();
    if (!name) {
      setError("Tell us what you are asking about.");
      return;
    }
    const sku = `REQ-${name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "ITEM"}`;
    basket.add({
      sku,
      name,
      kind: "service",
      descriptor: quoteLineDescriptor("service", { label: "Request", detailSchema: "text" }),
      pricing: { mode: "on_request" },
      detail: note.trim() || undefined,
      preferredDate: date.trim() || undefined,
    });
    setItem("");
    setDate("");
    setNote("");
    setError(null);
    onClose();
  }

  return (
    <div className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="quote-add-title">
      <div className="booking-modal__backdrop" onClick={onClose} />
      <div className="booking-modal__panel" ref={panelRef} tabIndex={-1}>
        <header className="booking-modal__head">
          <div>
            <p className="booking-modal__eyebrow">Request for quotation</p>
            <h2 id="quote-add-title">Ask about something not listed</h2>
          </div>
          <button type="button" className="quick-menu__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="booking-modal__body">
          {error ? (
            <Alert tone="danger" title="Could not add that">
              {error}
            </Alert>
          ) : null}
          <div className="stack">
            <Field
              label="What are you asking about?"
              htmlFor="qa-item"
              hint="A service, a keepsake, a transfer — a few words is enough."
              error={error ?? undefined}
            >
              <input
                id="qa-item"
                name="item"
                value={item}
                onChange={(e) => {
                  setItem(e.target.value);
                  setError(null);
                }}
              />
            </Field>
            <div className="field-grid field-grid--2">
              <Field label="Preferred date" htmlFor="qa-date" hint="Optional — if the date matters.">
                <input
                  id="qa-date"
                  name="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
              <Field label="Anything else" htmlFor="qa-note" hint="Optional — the office quotes from this.">
                <input
                  id="qa-note"
                  name="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
            </div>
          </div>
          <div className="booking-modal__actions">
            <Button type="button" onClick={add}>
              Add to my quote
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
          <p className="field__hint">
            This adds a line to review; nothing is reserved or ordered, and the office
            confirms the quotation by hand.
          </p>
        </div>
      </div>
    </div>
  );
}
