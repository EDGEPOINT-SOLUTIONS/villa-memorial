"use client";

/**
 * The provisional receipt capture — what the counter records and hands over.
 *
 * Folio grammar as the purchase application and the service contract use it: numbered
 * `capture-section` cards with a `capture-rail` of steps and readiness checks, so the same
 * paper discipline applies to the counter's smallest document. The form runs the shared
 * capture rules (`validateProvisionalReceiptDraft`) before posting; the BFF route and the
 * store run the SAME rules again and remain the authority. On success the counter lands on
 * the record's own page, where the slip prints and exports — the family is standing there.
 *
 * What the form shows about money is read from the recorded invoice (customer, outstanding,
 * order, case/contract); the form never invents a reference and never changes a balance.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ChevronRight } from "lucide-react";
import { formatMinorUnits } from "@/lib/money";
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_TONE } from "@/lib/api-client/billing-derive";
import {
  PAYMENT_INSTRUMENTS,
  instrumentNeedsReference,
} from "@/lib/contracts/payment-capture";
import {
  emptyProvisionalReceiptDraft,
  firstProvisionalReceiptError,
  validateProvisionalReceiptDraft,
  type ProvisionalReceiptDraft,
  type ProvisionalReceiptErrors,
} from "@/lib/contracts/provisional-receipt-capture";
import { amountInputValue, outstandingCents } from "@/lib/billing-payments";
import type { Invoice } from "@/lib/api-client/finance";

/** The server's own words for a failure, or null when the body carried none. */
function failureMessage(payload: unknown): string | null {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const message = (payload as { error: unknown }).error;
    if (typeof message === "string" && message.trim() !== "") return message;
  }
  return null;
}

/** Per-control messages the route passed through from the shared rules. */
function fieldErrors(payload: unknown): ProvisionalReceiptErrors {
  if (typeof payload !== "object" || payload === null || !("fieldErrors" in payload)) return {};
  const raw = (payload as { fieldErrors: unknown }).fieldErrors;
  if (typeof raw !== "object" || raw === null) return {};
  const errors: ProvisionalReceiptErrors = {};
  for (const key of [
    "invoice",
    "payer",
    "amount",
    "method",
    "reference",
    "received_on",
    "notes",
  ] as const) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim() !== "") errors[key] = value;
  }
  return errors;
}

const STEPS = [
  { num: "01", id: "capture-settles", label: "What it settles" },
  { num: "02", id: "capture-payment", label: "What was handed over" },
  { num: "03", id: "capture-paper", label: "Who received it" },
];

export function ProvisionalReceiptForm({
  invoices,
  initialInvoiceNumber,
  caseNumber,
  receivedBy,
  today,
}: {
  /** Unpaid invoices to choose from (the resolved one is included even when already paid). */
  invoices: Invoice[];
  /** The invoice the link resolved, or "" when the screen was opened bare. */
  initialInvoiceNumber: string;
  /** The case/contract the resolved invoice links to, from recorded data; null when none. */
  caseNumber: string | null;
  /** The signed-in staff member who hands the paper over. */
  receivedBy: string;
  /** Today at the park, resolved on the server so the form and the rules agree. */
  today: string;
}) {
  const router = useRouter();
  const initial = invoices.find((i) => i.invoice_number === initialInvoiceNumber) ?? null;
  const [draft, setDraft] = useState<ProvisionalReceiptDraft>(() =>
    emptyProvisionalReceiptDraft({
      invoiceNumber: initial?.invoice_number ?? "",
      caseNumber,
      payer: initial?.customer_name ?? "",
      receivedOn: today,
    }),
  );
  const [errors, setErrors] = useState<ProvisionalReceiptErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected =
    invoices.find((i) => i.invoice_number === draft.invoice_number) ?? initial ?? null;
  const owed = selected ? outstandingCents(selected) : 0;
  const paidInFull = selected !== null && owed === 0;

  function patch(next: Partial<ProvisionalReceiptDraft>) {
    setDraft((current) => ({ ...current, ...next }));
    setErrors({});
    setFailure(null);
  }

  function chooseInvoice(invoice: Invoice) {
    patch({
      invoice_number: invoice.invoice_number,
      // The case/contract link was resolved for the invoice the link named; a different
      // invoice is a different recorded record, so the link resets rather than being carried.
      case_number: invoice.invoice_number === initialInvoiceNumber ? caseNumber : null,
      payer: invoice.customer_name,
      amount_text: amountInputValue(outstandingCents(invoice)),
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || paidInFull) return;

    // The browser runs the SHARED rules first for immediate feedback; the server runs the
    // same function again and remains the authority.
    const checked = validateProvisionalReceiptDraft(draft, selected, new Date());
    if (!checked.ok) {
      setErrors(checked.errors);
      setFailure(firstProvisionalReceiptError(checked.errors));
      return;
    }

    setBusy(true);
    setFailure(null);
    try {
      const response = await fetch("/api/billing/provisional-receipts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(checked.input),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setErrors(fieldErrors(payload));
        setFailure(
          failureMessage(payload) ??
            "The provisional receipt could not be recorded — nothing was changed.",
        );
        return;
      }

      const receipt =
        typeof payload === "object" && payload !== null && "receipt" in payload
          ? (payload as { receipt: unknown }).receipt
          : null;
      const id =
        typeof receipt === "object" &&
        receipt !== null &&
        typeof (receipt as { id?: unknown }).id === "string"
          ? (receipt as { id: string }).id
          : null;
      if (!id) {
        // Recorded, but this screen will not navigate to an address it cannot read.
        setFailure("The receipt was recorded — open the provisional-receipts list to find it.");
        return;
      }
      router.push(`/staff/billing/provisional-receipts/${encodeURIComponent(id)}`);
    } catch {
      setFailure("Could not reach billing — nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  function jumpTo(sectionId: string) {
    const section = document.getElementById(sectionId);
    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const ready = {
    invoice: selected !== null && !paidInFull,
    payer: draft.payer.trim() !== "",
    amount: draft.amount_text.trim() !== "",
    instrument: draft.instrument !== "",
    reference:
      draft.instrument === "" ||
      !instrumentNeedsReference(draft.instrument) ||
      draft.reference.trim() !== "",
  };

  return (
    <form onSubmit={submit} className="capture-layout" noValidate>
      <div className="capture-layout__main">
        {failure ? (
          <Alert tone="danger" title="The provisional receipt was not recorded">
            {failure}
          </Alert>
        ) : null}

        {/* 01 — What it settles */}
        <section id="capture-settles" className="card capture-section">
          <div className="capture-section__head">
            <span className="capture-section__num" aria-hidden="true">
              01
            </span>
            <div>
              <h2 className="capture-section__title">What it settles</h2>
              <p className="capture-section__blurb">
                The recorded invoice, its balance and the order or case it belongs to.
              </p>
            </div>
          </div>
          <div className="capture-section__body">
            <div className="field-grid field-grid--2">
              <Field
                label="Invoice"
                htmlFor="receipt-invoice"
                hint="Read from the recorded billing data."
                error={errors.invoice}
              >
                <select
                  id="receipt-invoice"
                  disabled={busy}
                  value={draft.invoice_number}
                  aria-invalid={errors.invoice ? true : undefined}
                  onChange={(event) => {
                    const invoice = invoices.find(
                      (i) => i.invoice_number === event.target.value,
                    );
                    if (invoice) chooseInvoice(invoice);
                    else patch({ invoice_number: event.target.value });
                  }}
                >
                  <option value="">—</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.invoice_number}>
                      {invoice.invoice_number} · {invoice.customer_name}
                      {outstandingCents(invoice) === 0 ? " · paid in full" : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Case or contract" htmlFor="receipt-case" hint="Only when the record names one.">
                <input
                  id="receipt-case"
                  readOnly
                  value={draft.case_number ?? "—"}
                  aria-readonly="true"
                />
              </Field>
            </div>
            {selected ? (
              <dl className="kv">
                <div>
                  <dt>Customer</dt>
                  <dd>{selected.customer_name}</dd>
                </div>
                <div>
                  <dt>Order</dt>
                  <dd>{selected.order_number ?? "—"}</dd>
                </div>
                <div>
                  <dt>Outstanding</dt>
                  <dd>{formatMinorUnits(owed, selected.currency)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <Badge tone={INVOICE_STATUS_TONE[selected.status]}>
                      {INVOICE_STATUS_LABEL[selected.status]}
                    </Badge>
                  </dd>
                </div>
              </dl>
            ) : null}
            {paidInFull ? (
              <Alert tone="warning" title="This invoice is paid in full">
                There is nothing left on {selected?.invoice_number} for a provisional receipt to
                record. Pick another invoice or use the billing record for a receipt already
                issued.
              </Alert>
            ) : null}
          </div>
        </section>

        {/* 02 — What was handed over */}
        <section id="capture-payment" className="card capture-section">
          <div className="capture-section__head">
            <span className="capture-section__num" aria-hidden="true">
              02
            </span>
            <div>
              <h2 className="capture-section__title">What the family handed over</h2>
              <p className="capture-section__blurb">
                Exactly as the counter slip asks — the payer, the amount and how it arrived.
              </p>
            </div>
          </div>
          <div className="capture-section__body">
            <div className="field-grid field-grid--2">
              <Field
                label="Payer"
                htmlFor="receipt-payer"
                hint="Who handed the money over; prefilled from the invoice."
                error={errors.payer}
              >
                <input
                  id="receipt-payer"
                  autoComplete="off"
                  disabled={busy}
                  value={draft.payer}
                  aria-invalid={errors.payer ? true : undefined}
                  onChange={(event) => patch({ payer: event.target.value })}
                />
              </Field>
              <Field
                label="Amount received"
                htmlFor="receipt-amount"
                hint={selected ? `${formatMinorUnits(owed, selected.currency)} outstanding` : undefined}
                error={errors.amount}
              >
                <div className="peso-input">
                  <span className="peso-input__mark" aria-hidden="true">
                    ₱
                  </span>
                  <input
                    id="receipt-amount"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00"
                    disabled={busy}
                    value={draft.amount_text}
                    aria-invalid={errors.amount ? true : undefined}
                    onChange={(event) => patch({ amount_text: event.target.value })}
                  />
                </div>
              </Field>
              <Field
                label="Instrument"
                htmlFor="receipt-instrument"
                hint="How it arrived."
                error={errors.method}
              >
                <select
                  id="receipt-instrument"
                  disabled={busy}
                  value={draft.instrument}
                  aria-invalid={errors.method ? true : undefined}
                  onChange={(event) =>
                    patch({ instrument: event.target.value as ProvisionalReceiptDraft["instrument"] })
                  }
                >
                  <option value="">—</option>
                  {PAYMENT_INSTRUMENTS.map((instrument) => (
                    <option key={instrument.value} value={instrument.value}>
                      {instrument.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Reference no."
                htmlFor="receipt-reference"
                hint="Check / transfer reference; blank for cash."
                error={errors.reference}
              >
                <input
                  id="receipt-reference"
                  autoComplete="off"
                  disabled={busy}
                  value={draft.reference}
                  aria-invalid={errors.reference ? true : undefined}
                  onChange={(event) => patch({ reference: event.target.value })}
                />
              </Field>
              <Field
                label="Date received"
                htmlFor="receipt-date"
                hint="The day the counter took it."
                error={errors.received_on}
              >
                <input
                  id="receipt-date"
                  type="date"
                  disabled={busy}
                  value={draft.received_on}
                  aria-invalid={errors.received_on ? true : undefined}
                  onChange={(event) => patch({ received_on: event.target.value })}
                />
              </Field>
              <Field label="Notes" htmlFor="receipt-notes" hint="Optional." error={errors.notes}>
                <input
                  id="receipt-notes"
                  autoComplete="off"
                  disabled={busy}
                  value={draft.notes}
                  onChange={(event) => patch({ notes: event.target.value })}
                />
              </Field>
            </div>
          </div>
        </section>

        {/* 03 — Who received it */}
        <section id="capture-paper" className="card capture-section">
          <div className="capture-section__head">
            <span className="capture-section__num" aria-hidden="true">
              03
            </span>
            <div>
              <h2 className="capture-section__title">Who received it</h2>
              <p className="capture-section__blurb">
                The paper names the staff member who took the money.
              </p>
            </div>
          </div>
          <div className="capture-section__body">
            <Field label="Received by" htmlFor="receipt-received-by" hint="Your staff session.">
              <input id="receipt-received-by" readOnly value={receivedBy} aria-readonly="true" />
            </Field>
            <Alert tone="warning" title="What this paper is">
              The family gets a <strong>provisional receipt</strong> — it is not an official
              receipt, it carries no receipt number, and the official receipt replaces it once
              finance issues one. This record posts nothing; the balance moves in Billing.
            </Alert>
          </div>
        </section>

        <div className="capture-actions">
          <Button type="submit" disabled={busy || paidInFull}>
            {busy ? "Issuing…" : "Issue provisional receipt"}
          </Button>
          <Button
            variant="ghost"
            type="button"
            disabled={busy}
            onClick={() => {
              setDraft(
                emptyProvisionalReceiptDraft({
                  invoiceNumber: initial?.invoice_number ?? "",
                  caseNumber,
                  payer: initial?.customer_name ?? "",
                  receivedOn: today,
                }),
              );
              setErrors({});
              setFailure(null);
            }}
          >
            Clear
          </Button>
          <Link
            href="/staff/billing/provisional-receipts"
            className="btn btn--ghost btn--sm"
          >
            Back to provisional receipts
          </Link>
        </div>
      </div>

      <aside className="capture-rail" aria-label="Steps and readiness">
        <div className="card capture-rail__card">
          <div className="capture-rail__head">
            <p className="capture-rail__eyebrow">Paper document</p>
            <h3>Provisional receipt</h3>
          </div>
          <div className="capture-rail__steps">
            {STEPS.map((step) => (
              <button
                key={step.num}
                type="button"
                className="capture-rail__step"
                onClick={() => jumpTo(step.id)}
              >
                <span className="capture-rail__step-num">{step.num}</span>
                <span className="capture-rail__step-label">{step.label}</span>
                <ChevronRight size={14} className="capture-rail__step-arrow" aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className="capture-rail__checks">
            <p className="capture-rail__checks-title">Ready to issue</p>
            <Check ok={ready.invoice} label="Invoice chosen" />
            <Check ok={ready.payer} label="Payer named" />
            <Check ok={ready.amount} label="Amount entered" />
            <Check ok={ready.instrument} label="Instrument chosen" />
            <Check ok={ready.reference} label="Reference given when needed" />
          </div>
          <div className="capture-rail__cta">
            <Button type="submit" disabled={busy || paidInFull} className="btn--block">
              {busy ? "Issuing…" : "Issue provisional receipt"}
            </Button>
          </div>
        </div>
      </aside>
    </form>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`capture-rail__check${ok ? " capture-rail__check--ok" : ""}`}>
      <span aria-hidden="true">{ok ? "✓" : "○"}</span>
      {label}
    </span>
  );
}
