"use client";

/**
 * Record payment — the counter screen: what the invoice stands at, the payment form, the
 * payments already recorded, and the official receipt each one issued.
 *
 * HOW THE MONEY MOVES (and why nothing here does arithmetic on a balance)
 * The form posts to the BFF route; the response carries the invoice AS THE SERVER REPORTS IT
 * and the recorded payment with the receipt it issued. The summary strip, the invoice rows and
 * the sheet are all rendered from those server figures — a failed or rejected write changes
 * nothing on screen and says exactly what failed, so a counter clerk can never believe a
 * family paid when the service refused the payment.
 *
 * THE RECEIPT
 * One paper, two copies: the sheet below is the office copy of the same document the family
 * opens in their papers (`lib/contracts/official-receipt.ts`), built from the recorded
 * figures only. A payment with no official receipt prints NO receipt — it shows the plain
 * sentence saying so (`NO_RECEIPT_NOTE`) and, for the counter, the clearly-labelled
 * provisional slip the repo already ships, which states on its face that it is not an
 * official receipt and carries no receipt number.
 *
 * The amount, the instrument and the day received are the counter's own slip vocabulary
 * (`lib/billing-payments.ts`); every rule and every refusal sentence is produced there.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { PaperExportActions } from "@/components/paper/paper-export-actions";
import { PaperSheet } from "@/components/paper/paper-sheet";
import { formatMinorUnits } from "@/lib/money";
import {
  INSTRUMENT_LABEL,
  NO_RECEIPT_NOTE,
  PAYMENT_INSTRUMENTS,
  amountInputValue,
  emptyPaymentDraft,
  firstPaymentError,
  outstandingCents,
  receiptFiguresForPayment,
  validatePaymentDraft,
  type PaymentDraft,
  type PaymentErrors,
  type RecordedPayment,
} from "@/lib/billing-payments";
import {
  INVOICE_STATUS_LABEL,
  INVOICE_STATUS_TONE,
} from "@/lib/api-client/billing-derive";
import type { Invoice } from "@/lib/api-client/finance";
import { PROVISIONAL_RECEIPT_NOTE, formatRecordedAt } from "@/lib/contracts/payment-capture";
import { buildProvisionalReceipt, provisionalReceiptFileStem } from "@/lib/contracts/provisional-receipt";
import {
  buildOfficialReceiptPaper,
  officialReceiptFileStem,
} from "@/lib/contracts/official-receipt";

/** The form starts on the balance the server reported; the counter can still change it. */
function draftFor(invoice: Invoice, today: string): PaymentDraft {
  const draft = emptyPaymentDraft(today);
  const owed = outstandingCents(invoice);
  return owed > 0 ? { ...draft, amount_text: amountInputValue(owed) } : draft;
}

/** The server's own words for a failure, or null when the body carried none. */
function failureMessage(payload: unknown): string | null {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const message = (payload as { error: unknown }).error;
    if (typeof message === "string" && message.trim() !== "") return message;
  }
  return null;
}

/** Per-control messages the route passed through from the shared rules. */
function fieldErrors(payload: unknown): PaymentErrors {
  if (typeof payload !== "object" || payload === null || !("fieldErrors" in payload)) return {};
  const raw = (payload as { fieldErrors: unknown }).fieldErrors;
  if (typeof raw !== "object" || raw === null) return {};
  const errors: PaymentErrors = {};
  for (const key of ["amount", "method", "reference", "received_on", "notes"] as const) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim() !== "") errors[key] = value;
  }
  return errors;
}

/**
 * The server's invoice, read back field by field. A response that does not carry a readable
 * balance is NOT trusted: the screen says the payment was recorded and asks for a reload
 * rather than showing a figure the counter would rely on.
 */
function readServerInvoice(payload: unknown): Invoice | null {
  if (typeof payload !== "object" || payload === null || !("invoice" in payload)) return null;
  const raw = (payload as { invoice: unknown }).invoice;
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.invoice_number !== "string") return null;
  if (typeof r.paid_cents !== "number" || !Number.isInteger(r.paid_cents)) return null;
  if (typeof r.total_cents !== "number" || !Number.isInteger(r.total_cents)) return null;
  const status = r.status;
  if (status !== "paid" && status !== "partial" && status !== "overdue" && status !== "pending") {
    return null;
  }
  return {
    id: typeof r.id === "string" ? r.id : "",
    invoice_number: r.invoice_number,
    customer_name: typeof r.customer_name === "string" ? r.customer_name : "",
    order_number: typeof r.order_number === "string" ? r.order_number : null,
    total_cents: r.total_cents,
    paid_cents: r.paid_cents,
    currency: typeof r.currency === "string" ? r.currency : "PHP",
    status,
    issued_at: typeof r.issued_at === "string" ? r.issued_at : "",
    due_at: typeof r.due_at === "string" ? r.due_at : "",
    aging_bucket: "current",
  };
}

/** The receipt row a recorded payment carries, read field by field (it gets printed). */
function readReceiptRow(raw: unknown): RecordedPayment["receipt_document"] {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.document_number !== "string") return null;
  return {
    id: r.id,
    document_number: r.document_number,
    title: typeof r.title === "string" ? r.title : `Official Receipt — ${r.document_number}`,
    document_type: "receipt",
    related_case_number: typeof r.related_case_number === "string" ? r.related_case_number : null,
    related_order_number: typeof r.related_order_number === "string" ? r.related_order_number : null,
    status: "approved",
    uploaded_by: typeof r.uploaded_by === "string" ? r.uploaded_by : "Staff portal",
    uploaded_at: typeof r.uploaded_at === "string" ? r.uploaded_at : "",
    file_size_bytes:
      typeof r.file_size_bytes === "number" && Number.isInteger(r.file_size_bytes)
        ? r.file_size_bytes
        : 0,
  };
}

/**
 * The recorded payment the server returned, or null when it named none. A payment without a
 * readable id or amount is not a payment this screen will show: null means the receipt
 * panel says plainly that the service named no payment.
 */
function readServerPayment(payload: unknown): RecordedPayment | null {
  if (typeof payload !== "object" || payload === null || !("payment" in payload)) return null;
  const raw = (payload as { payment: unknown }).payment;
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || r.id === "") return null;
  if (typeof r.amount_cents !== "number" || !Number.isInteger(r.amount_cents)) return null;
  const method = PAYMENT_INSTRUMENTS.find((option) => option.value === r.method)?.value;
  if (!method) return null;
  return {
    id: r.id,
    invoice_number: typeof r.invoice_number === "string" ? r.invoice_number : "",
    amount_cents: r.amount_cents,
    method,
    reference: typeof r.reference === "string" ? r.reference : "",
    received_on: typeof r.received_on === "string" ? r.received_on : "",
    notes: typeof r.notes === "string" ? r.notes : "",
    recorded_at: typeof r.recorded_at === "string" ? r.recorded_at : "",
    recorded_by: typeof r.recorded_by === "string" ? r.recorded_by : "",
    receipt_document: readReceiptRow(r.receipt_document),
  };
}

export function RecordPaymentScreen({
  invoice,
  reference,
  choices,
  payments,
  paymentsListed,
  today,
}: {
  /** The invoice the link opened, resolved server-side; null = nothing to record against yet. */
  invoice: Invoice | null;
  /** The reference that opened the screen, as typed, for the "no such invoice" sentence. */
  reference: string;
  /** Unpaid invoices to choose from when the screen was opened bare. */
  choices: Invoice[];
  /** Payments already recorded against this invoice, newest first. */
  payments: RecordedPayment[];
  /** False when the mode cannot list an invoice's payments (see `listPaymentsForInvoice`). */
  paymentsListed: boolean;
  /** Today at the park, resolved on the server so the form and the rules agree. */
  today: string;
}) {
  if (!invoice) {
    return <InvoiceChooser reference={reference} choices={choices} />;
  }
  return (
    <InvoiceWorkbench
      key={invoice.invoice_number}
      invoice={invoice}
      payments={payments}
      paymentsListed={paymentsListed}
      today={today}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Nothing chosen yet — pick the invoice the family is paying          */
/* ------------------------------------------------------------------ */

function InvoiceChooser({
  reference,
  choices,
}: {
  reference: string;
  choices: Invoice[];
}) {
  return (
    <div className="stack">
      {reference ? (
        <Alert tone="danger" title="No invoice matches that reference">
          Nothing in billing matches <code>{reference}</code>, so there is nothing to record
          against. Choose an invoice below, or find it on the billing list.
        </Alert>
      ) : null}

      <Card header={<h2>Choose the invoice the payment settles</h2>}>
        {choices.length === 0 ? (
          <EmptyState
            title="Every invoice is paid in full"
            hint="There is nothing outstanding to record a payment against."
          />
        ) : (
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Invoice</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Status</th>
                  <th scope="col">Outstanding</th>
                  <th scope="col">
                    <span className="text-sm text-muted">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {choices.map((choice) => (
                  <tr key={choice.id}>
                    <td>
                      <code>{choice.invoice_number}</code>
                    </td>
                    <td>{choice.customer_name}</td>
                    <td>
                      <Badge tone={INVOICE_STATUS_TONE[choice.status]}>{INVOICE_STATUS_LABEL[choice.status]}</Badge>
                    </td>
                    <td>{formatMinorUnits(outstandingCents(choice), choice.currency)}</td>
                    <td>
                      <Link
                        className="btn btn--primary btn--sm"
                        href={`/staff/billing/record-payment?invoice=${encodeURIComponent(choice.invoice_number)}`}
                        aria-label={`Record a payment against ${choice.invoice_number}`}
                      >
                        Record payment
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* One invoice — its state, its payments, the form, the receipts        */
/* ------------------------------------------------------------------ */

function InvoiceWorkbench({
  invoice: initialInvoice,
  payments,
  paymentsListed,
  today,
}: {
  invoice: Invoice;
  payments: RecordedPayment[];
  paymentsListed: boolean;
  today: string;
}) {
  const router = useRouter();
  const [serverInvoice, setServerInvoice] = useState<Invoice | null>(null);
  const [recorded, setRecorded] = useState<RecordedPayment[]>([]);
  const [draft, setDraft] = useState<PaymentDraft>(() => draftFor(initialInvoice, today));
  const [errors, setErrors] = useState<PaymentErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [unreadable, setUnreadable] = useState(false);
  const [busy, setBusy] = useState(false);
  // The most recent payment's receipt is ready to print the moment the invoice opens — the
  // family is usually standing there. A payment WITHOUT a receipt opens on the honest
  // "no official receipt" state rather than on nothing at all.
  const [openReceipt, setOpenReceipt] = useState<string | null>(() => payments[0]?.id ?? null);

  const invoice = serverInvoice ?? initialInvoice;
  const owed = outstandingCents(invoice);

  // The server's list, plus anything recorded in this session; deduped so a refresh that
  // brings the same payment back never shows it twice.
  const allPayments = useMemo(() => {
    const seen = new Set<string>();
    return [...recorded, ...payments].filter((payment) =>
      seen.has(payment.id) ? false : (seen.add(payment.id), true),
    );
  }, [recorded, payments]);

  const shown = openReceipt
    ? allPayments.find((payment) => payment.id === openReceipt) ?? null
    : null;

  function patch(next: Partial<PaymentDraft>) {
    setDraft((current) => ({ ...current, ...next }));
    setErrors({});
    setFailure(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    // The browser runs the SHARED rules first for immediate feedback; the server runs the
    // same function again and remains the authority.
    const checked = validatePaymentDraft(draft, invoice, new Date());
    if (!checked.ok) {
      setErrors(checked.errors);
      setFailure(firstPaymentError(checked.errors));
      setSuccess(null);
      return;
    }

    setBusy(true);
    setFailure(null);
    setSuccess(null);
    setUnreadable(false);
    try {
      const response = await fetch(
        `/api/billing/invoices/${encodeURIComponent(invoice.invoice_number)}/payments`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(checked.input),
        },
      );
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setErrors(fieldErrors(payload));
        setFailure(
          failureMessage(payload) ?? "The payment could not be recorded — nothing was changed.",
        );
        return;
      }

      const updated = readServerInvoice(payload);
      if (!updated) {
        // Recorded, but this screen will not show a balance it cannot read.
        setUnreadable(true);
        router.refresh();
        return;
      }

      const payment = readServerPayment(payload);
      setServerInvoice(updated);
      if (payment) {
        setRecorded((current) => [payment, ...current]);
        setOpenReceipt(payment.id);
      }
      setDraft(draftFor(updated, today));
      setErrors({});
      setSuccess(
        `${formatMinorUnits(checked.input.amount_cents, updated.currency)} recorded against ` +
          `${updated.invoice_number}. ${formatMinorUnits(outstandingCents(updated), updated.currency)} ` +
          `still owed.`,
      );
      router.refresh();
    } catch {
      setFailure("Could not reach billing — nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="kpi-grid">
        <span className="card kpi-card">
          <span className="kpi-card__body">
            <span className="kpi-card__label">Outstanding</span>
            <span className="kpi-card__value">{formatMinorUnits(owed, invoice.currency)}</span>
            <span className="kpi-card__sub">{invoice.invoice_number}</span>
          </span>
        </span>
        <span className="card kpi-card">
          <span className="kpi-card__body">
            <span className="kpi-card__label">Paid so far</span>
            <span className="kpi-card__value">{formatMinorUnits(invoice.paid_cents, invoice.currency)}</span>
            <span className="kpi-card__sub">of {formatMinorUnits(invoice.total_cents, invoice.currency)}</span>
          </span>
        </span>
        <span className="card kpi-card">
          <span className="kpi-card__body">
            <span className="kpi-card__label">Status</span>
            <span className="kpi-card__value kpi-card__value--sm">
              <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>{INVOICE_STATUS_LABEL[invoice.status]}</Badge>
            </span>
            <span className="kpi-card__sub">
              {invoice.due_at ? `due ${invoice.due_at.slice(0, 10)}` : "no due date"}
            </span>
          </span>
        </span>
      </div>

      <p className="text-sm text-muted">
        {invoice.customer_name}
        {invoice.order_number ? ` · ${invoice.order_number}` : ""}
      </p>

      {unreadable ? (
        <Alert tone="warning" title="Payment recorded — balance not shown">
          The server accepted the payment but this screen could not read the balance it
          returned. Reload this invoice before trusting any figure on it.
        </Alert>
      ) : null}

      {failure ? (
        <Alert tone="danger" title="The payment was not recorded">
          {failure}
        </Alert>
      ) : null}

      {success ? (
        <Alert tone="success" title="Payment recorded">
          {success}
        </Alert>
      ) : null}

      {owed > 0 ? (
        <Card header={<h2>Record what the family handed over</h2>}>
          <form className="stack" onSubmit={submit} noValidate>
            <div className="field-grid field-grid--3">
              <Field
                label="Amount received"
                htmlFor="pay-amount"
                hint={`${formatMinorUnits(owed, invoice.currency)} outstanding`}
                error={errors.amount}
              >
                <div className="peso-input">
                  <span className="peso-input__mark" aria-hidden="true">
                    ₱
                  </span>
                  <input
                    id="pay-amount"
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
                label="Payment method"
                htmlFor="pay-method"
                hint="How it arrived."
                error={errors.method}
              >
                <select
                  id="pay-method"
                  disabled={busy}
                  value={draft.method}
                  aria-invalid={errors.method ? true : undefined}
                  onChange={(event) =>
                    patch({ method: event.target.value as PaymentDraft["method"] })
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
                label="Date received"
                htmlFor="pay-date"
                hint="The day the counter took it."
                error={errors.received_on}
              >
                <input
                  id="pay-date"
                  type="date"
                  disabled={busy}
                  value={draft.received_on}
                  aria-invalid={errors.received_on ? true : undefined}
                  onChange={(event) => patch({ received_on: event.target.value })}
                />
              </Field>
            </div>

            <div className="field-grid field-grid--2">
              <Field
                label="Reference no."
                htmlFor="pay-reference"
                hint="Check / transfer reference; blank for cash."
                error={errors.reference}
              >
                <input
                  id="pay-reference"
                  autoComplete="off"
                  disabled={busy}
                  value={draft.reference}
                  aria-invalid={errors.reference ? true : undefined}
                  onChange={(event) => patch({ reference: event.target.value })}
                />
              </Field>
              <Field
                label="Notes"
                htmlFor="pay-notes"
                hint="Optional."
                error={errors.notes}
              >
                <input
                  id="pay-notes"
                  autoComplete="off"
                  disabled={busy}
                  value={draft.notes}
                  onChange={(event) => patch({ notes: event.target.value })}
                />
              </Field>
            </div>

            <div className="capture-actions">
              <Button type="submit" disabled={busy}>
                {busy ? "Recording…" : "Record payment"}
              </Button>
              <Button
                variant="ghost"
                type="button"
                disabled={busy}
                onClick={() => {
                  setDraft(draftFor(invoice, today));
                  setErrors({});
                  setFailure(null);
                }}
              >
                Clear
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Alert tone="info" title="This invoice is paid in full">
          There is nothing left to record against {invoice.invoice_number}.
        </Alert>
      )}

      {shown ? <ReceiptPanel payment={shown} invoice={invoice} /> : null}

      <Card header={<h2>Payments recorded</h2>}>
        {!paymentsListed ? (
          <p className="text-sm text-muted">
            The live billing service does not list an invoice&apos;s payments — every receipt it
            issued is in the documents repository.
          </p>
        ) : allPayments.length === 0 ? (
          <p className="text-sm text-muted">
            {invoice.status === "paid"
              ? `No payment has been recorded from this screen against ${invoice.invoice_number} — the balance came to us already settled.`
              : `Nothing has been recorded against ${invoice.invoice_number} yet.`}
          </p>
        ) : (
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Amount</th>
                  <th scope="col">Method</th>
                  <th scope="col">Date received</th>
                  <th scope="col">Reference</th>
                  <th scope="col">Recorded</th>
                  <th scope="col">
                    <span className="text-sm text-muted">Receipt</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {allPayments.map((payment) => {
                  const number = payment.receipt_document?.document_number ?? null;
                  return (
                    <tr key={payment.id}>
                      <td>{formatMinorUnits(payment.amount_cents, invoice.currency)}</td>
                      <td>{INSTRUMENT_LABEL[payment.method]}</td>
                      <td className="text-sm">{payment.received_on}</td>
                      <td className="text-sm">{payment.reference || "—"}</td>
                      <td className="text-sm">
                        {payment.recorded_by} · {formatRecordedAt(payment.recorded_at)}
                      </td>
                      <td>
                        {number ? (
                          payment.id === shown?.id ? (
                            <span className="text-sm text-muted">Showing {number}</span>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={`Print receipt ${number}`}
                              onClick={() => setOpenReceipt(payment.id)}
                            >
                              Print receipt
                            </Button>
                          )
                        ) : (
                          <span className="text-sm text-muted">No receipt issued</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The receipt for one recorded payment                                */
/* ------------------------------------------------------------------ */

function ReceiptPanel({ payment, invoice }: { payment: RecordedPayment; invoice: Invoice }) {
  const figures = receiptFiguresForPayment(payment, invoice);

  if (!figures) {
    // No official receipt: say so, and hand the counter the clearly-labelled slip instead.
    // The slip carries the payer and the receiving staff member the recorded data already
    // holds — the same fields the counter's own capture writes — so the family never gets a
    // paper with blanks the app could fill.
    const slip = buildProvisionalReceipt({
      payer: invoice.customer_name,
      amount_cents: payment.amount_cents,
      instrument: payment.method,
      reference: payment.reference,
      received_on: payment.received_on,
      against: payment.invoice_number,
      order_number: invoice.order_number,
      case_number: null,
      notes: payment.notes,
      received_by: payment.recorded_by,
      recorded_at: payment.recorded_at,
    });
    return (
      <Card header={<h2>No official receipt for this payment</h2>}>
        <div className="stack">
          <Alert tone="warning" title="Nothing has been printed or guessed at">
            {NO_RECEIPT_NOTE}
          </Alert>
          <p className="text-sm text-muted">{PROVISIONAL_RECEIPT_NOTE}</p>
          <PaperExportActions
            blocks={slip.blocks}
            filename={provisionalReceiptFileStem({
              against: payment.invoice_number,
              received_on: payment.received_on,
            })}
          />
          <PaperSheet blocks={slip.blocks} />
        </div>
      </Card>
    );
  }

  const paper = buildOfficialReceiptPaper(figures, "office");
  return (
    <Card header={<h2>Official receipt {figures.number}</h2>}>
      <div className="stack">
        <PaperExportActions
          blocks={paper.blocks}
          filename={officialReceiptFileStem(figures.number, figures.received_on)}
        />
        <PaperSheet blocks={paper.blocks} />
        <p className="text-sm text-muted">
          The family&apos;s copy is in their papers. The documents repository lists the same
          receipt number.
        </p>
      </div>
    </Card>
  );
}
