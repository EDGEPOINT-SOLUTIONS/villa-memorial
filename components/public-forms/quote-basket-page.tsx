"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { QuoteForm } from "@/components/public-forms/quote-form";
import { QuoteLineRow } from "@/components/quote-line-row";
import { releaseChapelQuoteLine } from "@/lib/chapel-booking-api";
import {
  quoteLineKey,
  useQuoteBasket,
  type QuoteLine,
  type QuoteSender,
} from "@/lib/quote-basket/quote-basket-context";
import { buildQuoteInquiry } from "@/lib/quote-basket/quote-submit";
import { formatMinorUnits, previewSubtotal } from "@/lib/money";
import { validateQuote, type FieldErrors, type QuoteValues } from "@/lib/public-forms/validation";
import type { RequestPrefill } from "@/lib/public-forms/request-prefill";

/**
 * The QUOTE PAGE at /quote — the basket the office asked for (2026-09-29).
 *
 * Three parts, in order:
 *  1 · the ADD STEP — the quote form, its fields and layout unchanged, whose
 *      submit now adds the line to the basket ("Add to my quote") instead of
 *      sending it alone, so a family can ask about a service, a casket and a lot
 *      in one go;
 *  2 · THE LINES — every accumulated line with its own expandable detail, the
 *      chapel stays shown with their held dates, and a Remove that releases a
 *      chapel hold through the same helper that always owned it;
 *  3 · THE SEND — the contact details and consent the office needs, posting the
 *      WHOLE basket as one Request-for-Quote through `POST /api/inquiries`
 *      (kind "quote"). Nothing here is an order or a reservation; the office
 *      confirms every quotation by hand, exactly as the single-item screen did.
 *
 * A line with no published figure (a service the sheets only quote) prints
 * "Quoted on request", never a ₱0.00 that would read as a price. Catalogue
 * lines show their published 2026 amount, which the office confirms.
 */
export function QuoteBasketPage({ prefill = null }: { prefill?: RequestPrefill | null }) {
  const basket = useQuoteBasket();
  const [openKeys, setOpenKeys] = useState<ReadonlySet<string>>(new Set());
  const [releaseError, setReleaseError] = useState<string | null>(null);

  const [sender, setSender] = useState<QuoteSender>({ full_name: "", email: "", phone: "" });
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ reference: string; count: number } | null>(null);

  // The add step stores the details the family gave, so the send step opens
  // prefilled with them (and an existing basket still remembers them).
  useEffect(() => {
    if (basket.sender) setSender(basket.sender);
  }, [basket.sender]);

  function addFromForm(values: QuoteValues) {
    const service = values.service.trim() || "Quote request";
    const sku = `REQ-${service.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "ITEM"}`;
    basket.setSender({
      full_name: values.full_name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
    });
    basket.add({
      sku,
      name: service,
      itemType: "service",
      unitPriceCents: 0,
      currency: "PHP",
      detail: values.notes.trim() || undefined,
      preferredDate: values.preferred_date.trim() || undefined,
    });
  }

  async function removeLine(line: QuoteLine) {
    setReleaseError(null);
    const result = await releaseChapelQuoteLine(line, quoteLineKey(line), basket.remove);
    if (result.error) setReleaseError(result.error);
  }

  const toggle = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSendError(null);
    const submission = buildQuoteInquiry(basket.lines, sender, { consent, notes });
    const found = validateQuote(submission.values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setSendError("Please complete the highlighted fields.");
      return;
    }
    setErrors({});
    setSending(true);
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "quote", values: submission.values }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const body =
        typeof payload === "object" && payload !== null
          ? (payload as Record<string, unknown>)
          : {};
      if (!response.ok) {
        const message =
          typeof body.error === "string" ? body.error : "Your quote could not be sent.";
        if (typeof body.fieldErrors === "object" && body.fieldErrors !== null) {
          setErrors(body.fieldErrors as FieldErrors);
        }
        setSendError(message);
        return;
      }
      const inquiry = body.inquiry as { reference?: unknown } | undefined;
      setSent({
        reference: typeof inquiry?.reference === "string" ? inquiry.reference : "",
        count: basket.lines.length,
      });
      basket.clear();
      setNotes("");
      setConsent(false);
    } catch {
      setSendError(
        "Your quote could not be sent — check your connection and try again, or call the 24/7 assistance line and we will take the details by phone.",
      );
    } finally {
      setSending(false);
    }
  }

  const pricedLines = basket.lines.filter((line) => !line.booking && line.unitPriceCents > 0);

  if (sent) {
    return (
      <div className="stack">
        <Alert tone="success" title="Your quote request has reached the office.">
          {sent.count} {sent.count === 1 ? "item" : "items"} recorded as{" "}
          <strong>{sent.reference}</strong>. A coordinator prepares one written quotation
          for the whole list and replies to the contact details you gave. Nothing is
          reserved and nothing is ordered — for anything urgent, call the 24/7 assistance
          line.
        </Alert>
        <div className="capture-actions">
          <Link className="btn btn--secondary" href="/plans">
            Keep looking
          </Link>
          <Link className="btn btn--secondary" href="/contact">
            Send a message instead
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack-4">
      <div className="page-header">
        <div className="page-header__text">
          <p className="page-header__eyebrow">Request for quotation</p>
          <h1>Your quote</h1>
          <p className="page-header__lead">
            Ask about as many things as you need — a service, a plan, a casket or a lot.
            The office answers the whole list with one written quotation.
          </p>
        </div>
      </div>

      {/* 1 · the add step */}
      <section aria-labelledby="quote-add-title">
        <h2 id="quote-add-title" className="page-section-title" style={{ marginTop: 0 }}>
          Add to your quote
        </h2>
        <QuoteForm prefill={prefill} onAdd={addFromForm} />
      </section>

      {/* 2 + 3 · the lines and the send */}
      <section aria-labelledby="quote-list-title" className="quote-page">
        <div className="page-header">
          <div className="page-header__text">
            <p className="page-header__eyebrow">Your quote</p>
            <h2 id="quote-list-title" className="page-section-title" style={{ margin: 0 }}>
              What you are asking about
            </h2>
            <p className="page-header__lead">
              Everything on the list goes to the office in one request. The office confirms
              every figure by hand.
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

        {!basket.ready ? (
          <Skeleton lines={3} />
        ) : basket.lines.length === 0 ? (
          <EmptyState
            title="Your quote is empty"
            hint="Add a service, a plan, a casket or a lot above — or browse the catalogue."
          />
        ) : (
          <>
            <div className="table-wrapper" tabIndex={0}>
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col" className="table__numeric">Published figure</th>
                    <th scope="col">Quantity</th>
                    <th scope="col" className="table__numeric">Line total</th>
                    <th scope="col"></th>
                  </tr>
                </thead>
                <tbody>
                  {basket.lines.map((line) => {
                    const key = quoteLineKey(line);
                    return (
                      <QuoteLineRow
                        key={key}
                        line={line}
                        open={openKeys.has(key)}
                        onToggle={() => toggle(key)}
                        onQuantityChange={(q) => basket.setQuantity(key, q)}
                        onRemove={() => void removeLine(line)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="card quote-summary" style={{ maxWidth: "24rem", marginLeft: "auto" }}>
              <div className="card__body row" style={{ justifyContent: "space-between" }}>
                <span>
                  {pricedLines.length > 0 ? "Published figures so far" : "Figures"}
                </span>
                <strong style={{ fontSize: "var(--text-lg)" }}>
                  {pricedLines.length > 0
                    ? formatMinorUnits(previewSubtotal(pricedLines))
                    : "Quoted on request"}
                </strong>
              </div>
              <div className="card__footer">
                Every figure is the office&apos;s published 2026 amount or will be quoted.
                This is a request, not an order — the office confirms the written quotation.
              </div>
            </div>

            <form onSubmit={send} className="stack" noValidate>
              {sendError ? (
                <Alert tone="danger" title="Could not send your quote">
                  {sendError}
                </Alert>
              ) : null}

              <section className="card capture-section">
                <div className="capture-section__head">
                  <span className="capture-section__num" aria-hidden="true">
                    01
                  </span>
                  <div>
                    <h3 className="capture-section__title">Who the quote goes to</h3>
                    <p className="capture-section__blurb">
                      How the office reaches you back with the written quotation.
                    </p>
                  </div>
                </div>
                <div className="capture-section__body">
                  <div className="field-grid field-grid--3">
                    <Field label="Your name" htmlFor="qb-name" error={errors.full_name}>
                      <input
                        id="qb-name"
                        name="full_name"
                        autoComplete="name"
                        disabled={sending}
                        value={sender.full_name}
                        onChange={(e) => setSender({ ...sender, full_name: e.target.value })}
                      />
                    </Field>
                    <Field label="Email" htmlFor="qb-email" error={errors.email}>
                      <input
                        id="qb-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        disabled={sending}
                        value={sender.email}
                        onChange={(e) => setSender({ ...sender, email: e.target.value })}
                      />
                    </Field>
                    <Field
                      label="Phone"
                      htmlFor="qb-phone"
                      hint="Optional — only if you would rather we call."
                      error={errors.phone}
                    >
                      <input
                        id="qb-phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="+63 …"
                        disabled={sending}
                        value={sender.phone}
                        onChange={(e) => setSender({ ...sender, phone: e.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              </section>

              <section className="card capture-section">
                <div className="capture-section__head">
                  <span className="capture-section__num" aria-hidden="true">
                    02
                  </span>
                  <div>
                    <h3 className="capture-section__title">Anything else we should know?</h3>
                    <p className="capture-section__blurb">
                      Timing, venue, who to ask for — the office quotes from this.
                    </p>
                  </div>
                </div>
                <div className="capture-section__body">
                  <Field label="Additional requirements" htmlFor="qb-notes">
                    <textarea
                      id="qb-notes"
                      name="notes"
                      rows={4}
                      disabled={sending}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </Field>
                  <label className="check-row check-row--consent">
                    <input
                      type="checkbox"
                      id="qb-consent"
                      name="consent"
                      disabled={sending}
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      aria-invalid={errors.consent ? true : undefined}
                      aria-describedby={errors.consent ? "qb-consent-hint qb-consent-error" : "qb-consent-hint"}
                    />
                    <span>I consent to the office using these details to prepare my quote.</span>
                  </label>
                  <span className="field__hint" id="qb-consent-hint">
                    Data Privacy Act consent — required before the office prepares your
                    quotation.
                  </span>
                  {errors.consent ? (
                    <span className="field__error" role="alert" id="qb-consent-error">
                      {errors.consent}
                    </span>
                  ) : null}
                </div>
              </section>

              <div className="capture-actions">
                <Button type="submit" disabled={sending}>
                  {sending ? "Sending your quote…" : "Send this quote request"}
                </Button>
                <Link className="btn btn--secondary" href="/plans">
                  Keep looking
                </Link>
              </div>
              <p className="field__hint">
                One request, several items — a coordinator replies with a written quotation.
                Nothing is reserved or ordered.
              </p>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
