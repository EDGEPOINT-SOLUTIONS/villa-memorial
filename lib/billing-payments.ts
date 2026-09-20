/**
 * Recording a payment against an invoice — the counter's money write.
 *
 * WHAT THIS IS
 * The one rule set behind "the family just handed over ₱X": what a payment is, what makes
 * one valid against the invoice it settles, what recording it does to that invoice, and
 * whether the recorded payment has an official receipt to print. Pure and clock-explicit —
 * nothing here reads the system clock, reaches a service or writes anything.
 *
 * WHY THE RULES LIVE HERE (and not in the route, web/AGENTS.md rule 1)
 * The form, the BFF route and the durable store all run `validatePaymentInput` /
 * `validatePaymentDraft`, so a payment the browser accepted can never be one the server
 * refuses for a different reason, and the "what failed" sentence a counter clerk reads is
 * produced once.
 *
 * THE MONEY RULES, AND WHY THEY REFUSE RATHER THAN ADJUST
 * - Money is integer minor units (centavos) everywhere; the amount arrives from the form as
 *   typed pesos and is parsed here, once.
 * - A payment may not exceed what the invoice still owes, and an invoice paid in full takes
 *   no further payment. The app has no credit/overpayment representation and phase 1 does
 *   no refunds, so accepting the excess would silently create money the books cannot show —
 *   the refusal names the exact outstanding figure instead. This is a product decision,
 *   flagged in the PR: an overpayment today is a counter conversation, not a silent credit.
 * - Nothing is allocated across installments: the frozen `billing-list-api-v1` payments
 *   endpoint is invoice-scoped, and which installment a payment lands on is the service's
 *   business (the list contract defers `installments[]` to the single-invoice read).
 *
 * THE OFFICIAL RECEIPT
 * A recorded payment carries the official-receipt document the counter prints
 * (`receipt_document`, a forged documents-api-v1 row). `receiptFiguresForPayment` turns a
 * payment plus its invoice into the sheet's figures — or returns null when the payment has
 * no receipt, which the screen says plainly rather than printing a guess.
 *
 * CONTRACT NOTES (recorded in the PR, do not quietly widen)
 * - `POST /billing/api/v1/invoices/:number/payments` is NAMED and scoped (`billing:write`)
 *   by the frozen billing-list contract, but that contract does not give the request or
 *   response body. The body this app sends ({amount_cents, method, reference, received_on,
 *   notes}) is therefore APP-AUTHORED: it uses the contract's own `*_cents` money naming and
 *   the counter's slip vocabulary, and it is pinned by tests so a later contract can be
 *   diffed against it rather than guessed at.
 * - The counter's instrument vocabulary is the one the client's slip prototype already uses
 *   (`PAYMENT_INSTRUMENTS`: cash, check, bank transfer, GCash). The frozen
 *   `payment.completed` v1 event names `cash | bank_transfer | card | gcash`, which is a
 *   subset plus `card` — adding a card instrument is a client-vocabulary decision, not one
 *   this PR invents.
 */
import { formatMinorUnits } from "@/lib/money";
import {
  INSTRUMENT_LABEL,
  PAYMENT_INSTRUMENTS,
  businessToday,
  instrumentNeedsReference,
  isCalendarDate,
  paymentAmountCents,
  type PaymentInstrument,
} from "@/lib/contracts/payment-capture";
import {
  agingBucket,
  displayStatus,
  type StoredInvoiceStatus,
} from "@/lib/api-client/billing-derive";
import type { AgingBucket, InvoiceStatus } from "@/lib/api-client/finance";
import type { OfficialReceiptFigures } from "@/lib/contracts/official-receipt";

export {
  INSTRUMENT_LABEL,
  PAYMENT_INSTRUMENTS,
  businessToday,
  instrumentNeedsReference,
  isCalendarDate,
  paymentAmountCents,
  type PaymentInstrument,
};

/** The invoice fields the payment rules need. Everything else is display. */
export type InvoiceForPayment = {
  invoice_number: string;
  customer_name: string;
  order_number: string | null;
  total_cents: number;
  paid_cents: number;
  currency: string;
  due_at: string;
};

/* ------------------------------------------------------------------ */
/* What the counter filled in                                          */
/* ------------------------------------------------------------------ */

/** The form's draft: the amount is the text the counter typed, nothing is parsed yet. */
export type PaymentDraft = {
  amount_text: string;
  method: PaymentInstrument | "";
  reference: string;
  /** yyyy-mm-dd, as the date input supplies it. */
  received_on: string;
  notes: string;
};

/** The wire/store record: integer major-unit cents, a real instrument, a calendar day. */
export type PaymentInput = {
  amount_cents: number;
  method: PaymentInstrument;
  reference: string;
  received_on: string;
  notes: string;
};

/** One message per control, keyed by the control it belongs to. */
export type PaymentErrors = Partial<
  Record<"amount" | "method" | "reference" | "received_on" | "notes", string>
>;

export function emptyPaymentDraft(receivedOn: string): PaymentDraft {
  return {
    amount_text: "",
    method: "",
    reference: "",
    received_on: receivedOn,
    notes: "",
  };
}

/* ------------------------------------------------------------------ */
/* The rule set                                                        */
/* ------------------------------------------------------------------ */

/** What an invoice still owes. An overpaid invoice contributes zero, never a credit. */
export function outstandingCents(invoice: Pick<InvoiceForPayment, "total_cents" | "paid_cents">): number {
  return Math.max(0, invoice.total_cents - invoice.paid_cents);
}

/**
 * A minor-unit figure as the amount input wants it ("1250000" → "12500.00"). Used only to
 * PREFILL the counter's field with the balance the server reported — the counter can always
 * type a different figure, and the value that is recorded is whatever they submit.
 */
export function amountInputValue(cents: number): string {
  return (Math.max(0, Math.trunc(cents)) / 100).toFixed(2);
}

/**
 * The one rule set. `raw` is the wire body (or anything shaped like it): a payment is valid
 * only when it is a positive whole-peso-centavo amount that the invoice can still absorb, an
 * instrument the counter's slip offers, the reference that instrument needs, and a real
 * calendar day that has already happened.
 */
export function validatePaymentInput(
  raw: unknown,
  invoice: InvoiceForPayment,
  now: Date = new Date(),
): { ok: true; input: PaymentInput } | { ok: false; errors: PaymentErrors } {
  const r = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const errors: PaymentErrors = {};

  const rawAmount = r.amount_cents;
  const amountCents =
    typeof rawAmount === "number" && Number.isFinite(rawAmount) ? Math.trunc(rawAmount) : null;
  const outstanding = outstandingCents(invoice);

  if (amountCents === null || !Number.isInteger(rawAmount)) {
    errors.amount = "Enter the amount received in pesos and centavos.";
  } else if (amountCents <= 0) {
    errors.amount = "The amount received must be more than zero.";
  } else if (outstanding === 0) {
    errors.amount = `${invoice.invoice_number} is already paid in full — there is nothing left to record.`;
  } else if (amountCents > outstanding) {
    errors.amount =
      `That is more than the ${formatMinorUnits(outstanding, invoice.currency)} still owed on ` +
      `${invoice.invoice_number}. Record the outstanding balance or less — overpayments are ` +
      `not credited here.`;
  }

  const method = typeof r.method === "string" ? r.method.trim() : "";
  const knownMethod = PAYMENT_INSTRUMENTS.find((option) => option.value === method)?.value;
  if (!knownMethod) {
    errors.method = "Choose how the payment arrived.";
  }

  const reference = typeof r.reference === "string" ? r.reference.trim() : "";
  if (knownMethod && instrumentNeedsReference(knownMethod) && reference === "") {
    errors.reference = `A ${INSTRUMENT_LABEL[knownMethod].toLowerCase()} payment needs the reference printed on the slip.`;
  }

  const receivedOn = typeof r.received_on === "string" ? r.received_on.trim() : "";
  if (receivedOn === "") {
    errors.received_on = "Enter the date the payment was received.";
  } else if (!isCalendarDate(receivedOn)) {
    errors.received_on = "Enter a real date.";
  } else if (receivedOn > businessToday(now)) {
    errors.received_on = "The date received cannot be in the future.";
  }

  const notes = typeof r.notes === "string" ? r.notes.trim() : "";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    input: {
      amount_cents: amountCents as number,
      method: knownMethod as PaymentInstrument,
      reference,
      received_on: receivedOn,
      notes,
    },
  };
}

/**
 * The form adapter: parse the typed pesos first (so "12,50" is reported on the amount
 * control as text), then run the SAME rule set the server runs.
 */
export function validatePaymentDraft(
  draft: PaymentDraft,
  invoice: InvoiceForPayment,
  now: Date = new Date(),
): { ok: true; input: PaymentInput } | { ok: false; errors: PaymentErrors } {
  const parsed = paymentAmountCents(draft.amount_text);
  if (parsed === null) {
    return {
      ok: false,
      errors: {
        amount:
          draft.amount_text.trim() === ""
            ? "Enter the amount received."
            : "Enter pesos and centavos only, e.g. 12,500.00.",
      },
    };
  }
  return validatePaymentInput(
    {
      amount_cents: parsed,
      method: draft.method,
      reference: draft.reference,
      received_on: draft.received_on,
      notes: draft.notes,
    },
    invoice,
    now,
  );
}

/** The first message, for the one-sentence banner above the field errors. */
export function firstPaymentError(errors: PaymentErrors): string {
  for (const key of ["amount", "method", "reference", "received_on", "notes"] as const) {
    if (errors[key]) return errors[key] as string;
  }
  return "The payment could not be recorded.";
}

/* ------------------------------------------------------------------ */
/* What recording does to the invoice                                  */
/* ------------------------------------------------------------------ */

/** The invoice fields the fold writes. */
type FoldableInvoice = {
  total_cents: number;
  paid_cents: number;
  due_at: string;
  status: InvoiceStatus;
  aging_bucket: AgingBucket;
};

/**
 * Applies recorded payments to an invoice, using the FROZEN derivation rules
 * (`billing-derive.ts`): the storage status is derived from what is now paid, and the
 * display status + aging bucket follow from the due date exactly as they do for a live
 * invoice.
 *
 * An invoice no payment touches is returned UNCHANGED — fixture mode deliberately passes
 * the recorded demo values through so existing screens do not shift under a derivation
 * their rows were never authored for (see `billing-list-api-v1.md`).
 */
export function foldPaymentsIntoInvoice<T extends FoldableInvoice>(
  invoice: T,
  payments: readonly RecordedPayment[],
  now: Date,
): T {
  if (payments.length === 0) return invoice;

  const paid = invoice.paid_cents + payments.reduce((sum, p) => sum + p.amount_cents, 0);
  const stored: StoredInvoiceStatus =
    paid >= invoice.total_cents ? "paid" : paid > 0 ? "partially_paid" : "issued";

  return {
    ...invoice,
    paid_cents: paid,
    status: displayStatus(stored, invoice.due_at, now),
    aging_bucket: agingBucket(stored, invoice.due_at, now),
  };
}

/* ------------------------------------------------------------------ */
/* The record a recorded payment is                                    */
/* ------------------------------------------------------------------ */

/**
 * The forged documents-api-v1 row a payment's official receipt is. The frozen documents
 * contract fixes this shape (document_number, document_type `receipt`, generated documents
 * arrive `approved`), which is what keeps the repository and the printed sheet consistent:
 * the number printed under "Receipt no." IS `document_number`.
 */
export type ReceiptDocumentRow = {
  id: string;
  document_number: string;
  title: string;
  document_type: "receipt";
  related_case_number: string | null;
  related_order_number: string | null;
  status: "approved";
  uploaded_by: string;
  uploaded_at: string;
  file_size_bytes: number;
};

/**
 * What the counter recorded — the service's payment, as this app holds it.
 *
 * `receipt_document` is null when no official receipt exists for the payment (a live
 * service that confirmed the payment without issuing one). That null is load-bearing: it is
 * what stops the screen printing a receipt nobody issued.
 */
export type RecordedPayment = {
  id: string;
  invoice_number: string;
  amount_cents: number;
  method: PaymentInstrument;
  reference: string;
  /** yyyy-mm-dd the counter received it. */
  received_on: string;
  notes: string;
  /** ISO instant the counter recorded it. */
  recorded_at: string;
  recorded_by: string;
  receipt_document: ReceiptDocumentRow | null;
  /**
   * The payer a `payment.recorded`-era service names on the payment (PROPOSED,
   * platform-contracts plan C13). Absent when the service sent none; the receipt
   * then falls back to the invoice's customer, exactly as it did before.
   */
  payer?: string | null;
};

/** The one sentence a payment without an official receipt carries. */
export const NO_RECEIPT_NOTE =
  "This payment was recorded without an official receipt number, so there is no receipt to " +
  "print. Nothing has been printed or guessed at — ask finance to issue the receipt for this " +
  "payment.";

/**
 * The receipt sheet's figures for a recorded payment, or null when the payment has no
 * receipt to print. Every figure printed comes from the record: the payment's own amount,
 * day and instrument, and what the invoice names as its payer and what it covers.
 */
export function receiptFiguresForPayment(
  payment: RecordedPayment,
  invoice: Pick<InvoiceForPayment, "customer_name" | "order_number">,
): OfficialReceiptFigures | null {
  const document = payment.receipt_document;
  if (!document || document.document_number.trim() === "") return null;
  return {
    number: document.document_number,
    received_on: payment.received_on,
    amount: formatMinorUnits(payment.amount_cents, "PHP"),
    covers: invoice.order_number
      ? `${payment.invoice_number} · ${invoice.order_number}`
      : payment.invoice_number,
    payer: payment.payer ?? invoice.customer_name,
    received_by: payment.recorded_by,
    method: INSTRUMENT_LABEL[payment.method],
    reference: payment.reference,
  };
}

/* ------------------------------------------------------------------ */
/* Which invoice a counter reference means                             */
/* ------------------------------------------------------------------ */

/**
 * Normalises the reference a link handed the screen (an invoice number, an order number or
 * a case number) — trimmed and upper-cased so `inv-2026-00003` finds the same invoice as
 * `INV-2026-00003`. Empty means the screen was opened bare: choose an invoice.
 */
export function normaliseReference(raw: string | null | undefined): string {
  return (raw ?? "").trim().toUpperCase();
}

/**
 * Which invoice a counter reference names, looking at invoice numbers first and then at the
 * order number each invoice carries. `null` means the reference names no invoice this
 * session can read — the screen says that plainly instead of guessing at a near match.
 */
export function findInvoiceByReference<T extends { invoice_number: string; order_number: string | null }>(
  invoices: readonly T[],
  reference: string,
): T | null {
  if (reference === "") return null;
  return (
    invoices.find((i) => i.invoice_number.toUpperCase() === reference) ??
    invoices.find((i) => (i.order_number ?? "").toUpperCase() === reference) ??
    null
  );
}
