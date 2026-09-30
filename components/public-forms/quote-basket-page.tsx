"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { QuoteAddRequest } from "@/components/public-forms/quote-add-request";
import { QuoteLineRow } from "@/components/quote-line-row";
import { releaseChapelQuoteLine } from "@/lib/chapel-booking-api";
import {
  quoteLineKey,
  useQuoteBasket,
  type QuoteLine,
  type QuoteSender,
} from "@/lib/quote-basket/quote-basket-context";
import { buildQuoteInquiry } from "@/lib/quote-basket/quote-submit";
import {
  QUOTE_ON_REQUEST_LABEL,
  lineNeedsPricing,
  quoteLineCurrency,
  quoteLinePriced,
  quoteLineUnitPrice,
} from "@/lib/quote-basket/quote-line";
import { formatMinorUnits, previewSubtotal } from "@/lib/money";
import { validateQuote, type FieldErrors } from "@/lib/public-forms/validation";
import type { RequestPrefill } from "@/lib/public-forms/request-prefill";

/**
 * The QUOTE PAGE at /quote — REVIEW, then SEND (captain D2-A, 2026-09-30).
 *
 * The page holds the quote basket and nothing else: what the basket contains,
 * each line described by its own data, a summary that never blends a published
 * figure with a hand-quoted one, and ONE send step that asks for the family's
 * contact details and consent exactly once. The old inline add form is gone; a
 * small link opens a light request dialog for anything not in the catalogue.
 *
 * HONEST PRICING. Every line is rendered by `QuoteLineRow` from its own
 * descriptor and pricing mode. A quote-only line prints "To be quoted by the
 * office" and contributes no amount to any total; the summary band splits
 * "published 2026 figures" from "N lines the office will quote by hand".
 *
 * TWO CHANNELS, KEPT APART (captain D1-B). Priced caskets and plans go to the
 * CART and its admin Order page; this basket takes what the office quotes, and
 * its inquiry lands on the admin Inquiries page. `/quote` no longer promises
 * caskets and plans it does not hold.
 */
export function QuoteBasketPage({ prefill = null }: { prefill?: RequestPrefill | null }) {
  const basket = useQuoteBasket();
  const [openKeys, setOpenKeys] = useState<ReadonlySet<string>>(new Set());
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(Boolean(prefill));

  const [sender, setSender] = useState<QuoteSender>({ full_name: "", email: "", phone: "" });
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ reference: string; count: number } | null>(null);

  // The send step opens prefilled with the details the family gave last time.
  useEffect(() => {
    if (basket.sender) setSender(basket.sender);
  }, [basket.sender]);

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

  if (sent) {
    return (
      <div className="stack">
        <Alert tone="success" title="Your quote request has reached the office.">
          {sent.count} {sent.count === 1 ? "item" : "items"} recorded as{" "}
          <strong>{sent.reference}</strong>. A coordinator prepares one written quotation for
          the whole list and replies to the contact details you gave. Nothing is reserved and
          nothing is ordered — for anything urgent, call the 24/7 assistance line.
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

  const lines = basket.lines;
  const published = lines.filter(quoteLinePriced);
  const toQuote = lines.filter(lineNeedsPricing);
  const publishedTotal = previewSubtotal(
    published.map((line) => ({
      unitPriceCents: quoteLineUnitPrice(line),
      quantity: line.quantity,
    })),
  );
  const publishedCurrency = published[0] ? quoteLineCurrency(published[0]) : "PHP";
  const itemCount = lines.length;

  return (
    <div className="stack-4">
      <div className="page-header">
        <div className="page-header__text">
          <p className="page-header__eyebrow">Request for quotation</p>
          <h1>Your quote</h1>
          <p className="page-header__lead">
            {basket.ready && itemCount > 0
              ? `${itemCount} ${itemCount === 1 ? "thing" : "things"} · one written quotation from the office.`
              : "The office answers your whole list with one written quotation."}
          </p>
        </div>
      </div>

      {releaseError ? (
        <Alert tone="warning" title="The dates could not be released automatically">
          {releaseError} Please call the park office so they can free the chapel dates.
        </Alert>
      ) : null}

      {!basket.ready ? (
        <Skeleton lines={3} />
      ) : lines.length === 0 ? (
        <div className="stack-3">
          <EmptyState
            title="Nothing here yet"
            hint="Add what your family is asking about — a service, a lot, a chapel stay or anything else — and the office quotes the whole list."
          />
          <div className="quote-empty__actions">
            <Link className="btn btn--secondary btn--sm" href="/services">
              Funeral services
            </Link>
            <Link className="btn btn--secondary btn--sm" href="/products">
              Caskets
            </Link>
            <Link className="btn btn--secondary btn--sm" href="/plans">
              Memorial plans
            </Link>
            <Link className="btn btn--secondary btn--sm" href="/lots">
              Memorial lots
            </Link>
          </div>
          <p className="quote-add-row">
            Something not listed?{" "}
            <button type="button" className="link-button" onClick={() => setAddOpen(true)}>
              Ask the office about it
            </button>
          </p>
        </div>
      ) : (
        <>
          {/* SUMMARY BAND — the page's honest figure, split (D4-A). Sticky on
              desktop so a long list keeps its send shortcut reachable. */}
          <section className="quote-summary-band" aria-label="What this quote holds">
            <div className="quote-summary-band__text">
              <p className="quote-summary-band__headline">
                {itemCount} {itemCount === 1 ? "item" : "items"} — {published.length}{" "}
                with a published 2026 figure · {toQuote.length} the office will quote by hand
              </p>
              {published.length > 0 ? (
                <p className="quote-summary-band__figure">
                  Published 2026 figures:{" "}
                  <strong>{formatMinorUnits(publishedTotal, publishedCurrency)}</strong>{" "}
                  <span className="text-sm text-muted">
                    ({published.length} {published.length === 1 ? "item" : "items"} — the office
                    confirms)
                  </span>
                </p>
              ) : (
                <p className="quote-summary-band__figure text-muted">
                  No published figures on this list — every line is quoted by the office.
                </p>
              )}
              {toQuote.length > 0 ? (
                <p className="quote-summary-band__figure text-muted">
                  To be quoted by the office: {toQuote.length}{" "}
                  {toQuote.length === 1 ? "line" : "lines"}
                </p>
              ) : null}
            </div>
            <a className="btn btn--secondary btn--sm" href="#quote-send">
              Send this quote request
            </a>
          </section>

          <h2 className="visually-hidden">The lines in your quote</h2>
          <ul className="quote-lines" aria-label="Lines in your quote">
            {lines.map((line) => {
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
          </ul>

          <p className="quote-add-row">
            Something not listed?{" "}
            <button type="button" className="link-button" onClick={() => setAddOpen(true)}>
              Ask the office about it
            </button>
          </p>

          <form id="quote-send" onSubmit={send} className="stack" noValidate>
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
                  <h2 className="capture-section__title">Who the quote goes to</h2>
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
                  <h2 className="capture-section__title">Anything else we should know?</h2>
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
                  Data Privacy Act consent — required before the office prepares your quotation.
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
              One request, several items — a coordinator replies with a written quotation.{" "}
              {QUOTE_ON_REQUEST_LABEL} Nothing is reserved or ordered.
            </p>
          </form>
        </>
      )}

      <QuoteAddRequest
        key={addOpen ? `open:${prefill?.item ?? ""}` : "closed"}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        initialItem={prefill?.item ?? ""}
      />
    </div>
  );
}
