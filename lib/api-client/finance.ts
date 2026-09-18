/**
 * Typed data access for Module E billing/collections screens (invoices, payments).
 *
 * Contract: docs/08-delivery/contracts/billing-list-api-v1.md (KEB-D4-01, FROZEN).
 *
 * The service stores three statuses (`issued` / `partially_paid` / `paid`) and no aging
 * bucket; the screens show four statuses and six buckets. Both are DERIVED from `due_at`
 * by `billing-derive.ts` against the frozen rules — "overdue" is a function of time, not a
 * stored state.
 *
 * Live mode: BILLING_BASE_URL set → `${BILLING_BASE_URL}/billing/api/v1/...` through the
 * edge gateway with the staff session. Unset → recorded fixtures, which pass their stored
 * `aging_bucket` through unchanged so existing demo data does not shift.
 *
 * RECORDING A PAYMENT (the write this module owns)
 * The contract names exactly one write — `POST /api/v1/invoices/:number/payments` under
 * `billing:write` — so this is a genuine BFF proxy in live mode, not a stub. Fixture mode
 * writes the durable store (`lib/api-client/billing-store.ts`) the same way the Orders and
 * Catalogue admins do. The rules themselves live in `lib/billing-payments.ts` and run in one
 * place: the form, this client and the store all call `validatePaymentInput`.
 *
 * Two things the frozen contract does NOT fix, both handled conservatively here and flagged
 * in the PR:
 *  1. The POST body. This app sends `{amount_cents, method, reference, received_on, notes}`
 *     — the contract's own `*_cents` money naming plus the counter slip's fields.
 *  2. The POST response — and, above all, whether it names the official receipt. A live
 *     payment therefore carries `receipt_document: null` unless the service actually named
 *     one, which is what makes the screen say "no receipt yet" instead of printing a guess.
 *     `listPaymentsForInvoice` likewise reports `listed: false` in live mode, because no
 *     contract names a payments list (the documents repository is where a live receipt is).
 */
import { ApiError } from "@/lib/api-client/api-error";
import {
  getAuthedJson,
  itemsOf,
  postAuthedJson,
} from "@/lib/api-client/staff-fetch";
import {
  agingBucket,
  displayStatus,
  type StoredInvoiceStatus,
} from "@/lib/api-client/billing-derive";
import {
  firstPaymentError,
  validatePaymentInput,
  type PaymentInput,
  type RecordedPayment,
  type ReceiptDocumentRow,
} from "@/lib/billing-payments";
import {
  getFixtureInvoiceByNumber,
  listFixtureInvoices,
  listFixturePayments,
  recordFixturePayment,
} from "@/lib/api-client/billing-store";
import { PAYMENT_INSTRUMENTS } from "@/lib/contracts/payment-capture";

const BASE_URL = process.env.BILLING_BASE_URL ?? "";

/** The gateway route prefix, stripped before proxying (ADR-004). */
const BILLING_ROUTE = "/billing";

export function billingLiveModeEnabled(): boolean {
  return BASE_URL.length > 0;
}

export type InvoiceStatus = "pending" | "paid" | "overdue" | "partial";

export type AgingBucket = "current" | "1-30" | "31-60" | "61-90" | "91-120" | "120+";

export type Invoice = {
  id: string;
  invoice_number: string;
  customer_name: string;
  order_number: string | null;
  total_cents: number;
  paid_cents: number;
  currency: string;
  status: InvoiceStatus;
  issued_at: string;
  due_at: string;
  aging_bucket: AgingBucket;
};

/** Tolerant reader: extra upstream fields are ignored, missing essentials surface as 502. */
function toInvoice(raw: unknown, now: Date): Invoice {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed invoice", 502);
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.number !== "string") {
    throw new ApiError("malformed invoice", 502);
  }
  const stored = r.status as StoredInvoiceStatus;
  const dueAt = typeof r.due_at === "string" ? r.due_at : null;
  return {
    id: r.id,
    invoice_number: r.number,
    customer_name: String(r.customer_name ?? ""),
    order_number: typeof r.order_number === "string" ? r.order_number : null,
    total_cents: Number(r.total_cents ?? 0),
    paid_cents: Number(r.paid_cents ?? 0),
    currency: String(r.currency ?? "PHP"),
    status: displayStatus(stored, dueAt, now),
    issued_at: String(r.issued_at ?? ""),
    due_at: dueAt ?? "",
    aging_bucket: agingBucket(stored, dueAt, now),
  };
}

export async function listInvoices(now: Date = new Date()): Promise<Invoice[]> {
  if (billingLiveModeEnabled()) {
    const payload = await getAuthedJson(BASE_URL, `${BILLING_ROUTE}/api/v1/invoices`);
    return itemsOf(payload).map((raw) => toInvoice(raw, now));
  }
  return listFixtureInvoices(now);
}

/**
 * Fetches one invoice by the id the list carries. Fixture mode addresses the recorded
 * uuid; live mode resolves through the list, because the service addresses invoices by
 * their capability token (`INV-…`/`ORD-…`) — the same trade `getCase` makes.
 */
export async function getInvoice(id: string, now: Date = new Date()): Promise<Invoice> {
  if (billingLiveModeEnabled()) {
    const found = (await listInvoices(now)).find(
      (i) => i.id === id || i.invoice_number === id,
    );
    if (!found) {
      throw new ApiError("not_found", 404);
    }
    return found;
  }
  const found = (await listFixtureInvoices(now)).find((i) => i.id === id);
  if (!found) {
    throw new ApiError("not_found", 404);
  }
  return found;
}

/** One invoice by its capability number (`INV-…`), or null when there is no such invoice. */
export async function getInvoiceByNumber(
  number: string,
  now: Date = new Date(),
): Promise<Invoice | null> {
  if (billingLiveModeEnabled()) {
    try {
      return toInvoice(
        await getAuthedJson(
          BASE_URL,
          `${BILLING_ROUTE}/api/v1/invoices/${encodeURIComponent(number)}`,
        ),
        now,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }
  return getFixtureInvoiceByNumber(number, now);
}

/* ------------------------------------------------------------------ */
/* Recording a payment                                                 */
/* ------------------------------------------------------------------ */

export type RecordPaymentResult = {
  /** The invoice AS THE SERVER NOW REPORTS IT — the balance the screen must show. */
  invoice: Invoice;
  /**
   * The recorded payment, or null when the service accepted the write but named no payment
   * in its response. A null payment is never dressed up: the screen says the payment was
   * recorded and that there is nothing to print.
   */
  payment: RecordedPayment | null;
};

/** What a recorded invoice's payments look like to the screen. */
export type InvoicePayments = {
  payments: RecordedPayment[];
  /**
   * Whether this mode can list an invoice's payments at all. The frozen contract has no
   * payments list, so live mode reports `false` and the screen says where receipts live
   * instead of claiming the family has paid nothing.
   */
  listed: boolean;
};

/** The receipts a recorded invoice's payments issued, newest first. */
export async function listPaymentsForInvoice(invoiceNumber: string): Promise<InvoicePayments> {
  if (billingLiveModeEnabled()) {
    return { payments: [], listed: false };
  }
  const wanted = invoiceNumber.trim().toUpperCase();
  const payments = (await listFixturePayments()).filter(
    (p) => p.invoice_number.toUpperCase() === wanted,
  );
  return { payments: payments.reverse(), listed: true };
}

/**
 * The payment fields a service response may carry. The contract fixes none of them, so every
 * one is read defensively and an absent one is absent — never defaulted to a number that
 * would end up on a printed receipt.
 */
function toLiveReceiptDocument(raw: unknown): ReceiptDocumentRow | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.document_number !== "string" || typeof r.id !== "string") return null;
  return {
    id: r.id,
    document_number: r.document_number,
    title: typeof r.title === "string" ? r.title : `Official Receipt — ${r.document_number}`,
    document_type: "receipt",
    related_case_number:
      typeof r.related_case_number === "string" ? r.related_case_number : null,
    related_order_number:
      typeof r.related_order_number === "string" ? r.related_order_number : null,
    status: "approved",
    uploaded_by: typeof r.uploaded_by === "string" ? r.uploaded_by : "Billing service",
    uploaded_at:
      typeof r.uploaded_at === "string" ? r.uploaded_at : new Date().toISOString(),
    file_size_bytes:
      typeof r.file_size_bytes === "number" && Number.isInteger(r.file_size_bytes)
        ? r.file_size_bytes
        : 0,
  };
}

/**
 * Reads the payment the service acknowledged. Only fields the service actually sent survive:
 * a missing id, amount or method means there is no payment record to show, and a response
 * that names no receipt means the payment HAS no receipt — the null that stops the screen
 * printing one nobody issued.
 */
function toLivePayment(
  payload: unknown,
  invoiceNumber: string,
  input: PaymentInput,
  actor: string,
  at: string,
): RecordedPayment | null {
  if (typeof payload !== "object" || payload === null) return null;
  const envelope = payload as Record<string, unknown>;
  const candidate =
    typeof envelope.payment === "object" && envelope.payment !== null
      ? (envelope.payment as Record<string, unknown>)
      : envelope;
  const id = typeof candidate.id === "string" ? candidate.id : typeof candidate.number === "string" ? candidate.number : null;
  const amount =
    typeof candidate.amount_cents === "number" && Number.isInteger(candidate.amount_cents)
      ? candidate.amount_cents
      : null;
  const method = typeof candidate.method === "string" ? candidate.method : null;
  if (!id || amount === null || !method) return null;
  if (!PAYMENT_INSTRUMENTS.some((option) => option.value === method)) return null;

  const receiptSource =
    candidate.receipt_document ?? candidate.receipt ?? candidate.document ?? null;

  return {
    id,
    invoice_number: invoiceNumber,
    amount_cents: amount,
    method: method as RecordedPayment["method"],
    reference: typeof candidate.reference === "string" ? candidate.reference : input.reference,
    received_on:
      typeof candidate.received_on === "string" ? candidate.received_on : input.received_on,
    notes: typeof candidate.notes === "string" ? candidate.notes : input.notes,
    recorded_at: typeof candidate.recorded_at === "string" ? candidate.recorded_at : at,
    recorded_by: actor,
    receipt_document: toLiveReceiptDocument(receiptSource),
  };
}

/**
 * Records a payment against one invoice.
 *
 * Fixture mode: the durable store allocates the official receipt beside the payment and the
 * invoice balance comes back from the fold. Live mode: the frozen payments endpoint, then a
 * RE-READ of the invoice from the contract's own read path — the screen's balance is always
 * the service's figure, never the request's arithmetic.
 */
export async function recordPayment(args: {
  invoiceNumber: string;
  /** Raw form/wire body — the shared rules below read and validate it. */
  input: unknown;
  actor: string;
  now?: Date;
}): Promise<RecordPaymentResult> {
  const now = args.now ?? new Date();
  const invoice = await getInvoiceByNumber(args.invoiceNumber, now);
  if (!invoice) {
    throw new ApiError("not_found", 404);
  }

  const validated = validatePaymentInput(args.input, invoice, now);
  if (!validated.ok) {
    throw new ApiError(firstPaymentError(validated.errors), 422, validated.errors);
  }

  if (!billingLiveModeEnabled()) {
    return recordFixturePayment({
      invoiceNumber: args.invoiceNumber,
      input: validated.input,
      actor: args.actor,
      now,
    });
  }

  const at = now.toISOString();
  const payload = await postAuthedJson(
    BASE_URL,
    `${BILLING_ROUTE}/api/v1/invoices/${encodeURIComponent(args.invoiceNumber)}/payments`,
    {
      amount_cents: validated.input.amount_cents,
      method: validated.input.method,
      reference: validated.input.reference,
      received_on: validated.input.received_on,
      notes: validated.input.notes,
    },
  );

  // The service is the authority on what is now owed: re-read rather than trust the write's
  // own body (web/AGENTS.md rule 1 + the tolerant-reader trap).
  const updated = await getInvoiceByNumber(args.invoiceNumber, now);
  if (!updated) {
    throw new ApiError("the payment was accepted but the invoice could not be re-read", 502);
  }
  return {
    invoice: updated,
    payment: toLivePayment(payload, updated.invoice_number, validated.input, args.actor, at),
  };
}
