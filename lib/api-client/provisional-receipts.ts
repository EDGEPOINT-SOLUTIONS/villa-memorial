/**
 * Typed data access for the provisional-receipt flow — the counter's slip journal and the
 * official-receipt display match.
 *
 * MODES
 * Fixture mode (the default) reads the durable journal in
 * `lib/api-client/provisional-receipts-store.ts` and folds in the recorded billing data, so
 * the slip, the list and the official-receipt state are demonstrable standalone. Live mode is
 * honestly UNIMPLEMENTED: no frozen contract names a provisional-receipt record or endpoint,
 * so both reads and writes answer 503 with the reason (`PROVISIONAL_RECEIPTS_NOT_WIRED`)
 * instead of dressing local files up as a service. That contract ask travels with the PR.
 *
 * THE OFFICIAL-RECEIPT STATE
 * `officialReceiptForProvisional` (pure, `lib/contracts/provisional-receipt.ts`) matches each
 * record to the real receipt that replaces it — a recorded billing payment's own receipt, or
 * the documents repository's receipt row naming the invoice/order/case. This module only
 * gathers those recorded inputs; it never issues a receipt.
 */
import { ApiError } from "@/lib/api-client/api-error";
import {
  billingLiveModeEnabled,
  getInvoiceByNumber,
  listInvoices,
  type Invoice,
} from "@/lib/api-client/finance";
import {
  listFixtureProvisionalReceipts,
  getFixtureProvisionalReceipt,
  issueFixtureProvisionalReceipt,
} from "@/lib/api-client/provisional-receipts-store";
import { listFixturePayments } from "@/lib/api-client/billing-store";
import { listDocuments } from "@/lib/api-client/documents";
import {
  officialReceiptForProvisional,
  type ProvisionalReceiptOfficial,
} from "@/lib/contracts/provisional-receipt";
import {
  validateProvisionalReceiptInput,
  type ProvisionalReceiptRecord,
} from "@/lib/contracts/provisional-receipt-capture";
import type { Document } from "@/lib/api-client/documents";
import type { RecordedPayment } from "@/lib/billing-payments";

/** The named reason live mode refuses provisional receipts (no frozen contract names one). */
export const PROVISIONAL_RECEIPTS_NOT_WIRED =
  "live provisional receipts are not wired: no provisional-receipt contract is frozen yet " +
  "(FORMS_PLAN gap 3 — waits on dev). Fixture mode keeps the counter's slip journal in-process.";

export function provisionalReceiptsLiveModeEnabled(): boolean {
  return billingLiveModeEnabled();
}

function refuseLive(): never {
  throw new ApiError(PROVISIONAL_RECEIPTS_NOT_WIRED, 503);
}

/** One provisional receipt with the recorded invoice it settles and the receipt that replaces it. */
export type ProvisionalReceiptView = {
  record: ProvisionalReceiptRecord;
  /** The invoice as the current billing read reports it; null if it is no longer readable. */
  invoice: Invoice | null;
  /** The real receipt, when one exists — the state shown INSTEAD of the slip. */
  official: ProvisionalReceiptOfficial | null;
};

/** Every provisional receipt the counter has issued, oldest first. */
export async function listProvisionalReceipts(): Promise<ProvisionalReceiptRecord[]> {
  if (provisionalReceiptsLiveModeEnabled()) refuseLive();
  return listFixtureProvisionalReceipts();
}

/** One provisional receipt by its opaque id, or null. */
export async function getProvisionalReceipt(id: string): Promise<ProvisionalReceiptRecord | null> {
  if (provisionalReceiptsLiveModeEnabled()) refuseLive();
  return getFixtureProvisionalReceipt(id);
}

function invoiceNumberMatches(invoiceNumber: string, wanted: string): boolean {
  return invoiceNumber.trim().toUpperCase() === wanted.trim().toUpperCase();
}

function viewOf(
  record: ProvisionalReceiptRecord,
  invoices: readonly Invoice[],
  documents: readonly Document[],
  payments: readonly RecordedPayment[],
): ProvisionalReceiptView {
  const invoice =
    invoices.find((i) => invoiceNumberMatches(i.invoice_number, record.invoice_number)) ?? null;
  const official = officialReceiptForProvisional({
    record,
    payments: payments.filter((p) => invoiceNumberMatches(p.invoice_number, record.invoice_number)),
    documents,
    invoice,
  });
  return { record, invoice, official };
}

/** The recorded inputs the official-receipt match reads — gathered once per page render. */
async function matchInputs(): Promise<{
  invoices: Invoice[];
  documents: Document[];
  payments: RecordedPayment[];
}> {
  const [invoices, documents, payments] = await Promise.all([
    listInvoices(),
    listDocuments({ document_type: "receipt" }),
    listFixturePayments(),
  ]);
  return { invoices, documents, payments };
}

/** The counter's slips with their official-receipt state, oldest first. */
export async function listProvisionalReceiptViews(): Promise<ProvisionalReceiptView[]> {
  const records = await listProvisionalReceipts();
  if (records.length === 0) return [];
  const { invoices, documents, payments } = await matchInputs();
  return records.map((record) => viewOf(record, invoices, documents, payments));
}

/** One slip with its official-receipt state, or null when the id names none. */
export async function getProvisionalReceiptView(
  id: string,
): Promise<ProvisionalReceiptView | null> {
  const record = await getProvisionalReceipt(id);
  if (!record) return null;
  const { invoices, documents, payments } = await matchInputs();
  return viewOf(record, invoices, documents, payments);
}

/**
 * Issues one provisional receipt. Fixture mode validates against the CURRENT invoice first
 * (so the refusal is the screen's own words) and then writes the store, which re-runs the
 * same rules under its lock. Live mode answers the named 503.
 */
export async function issueProvisionalReceipt(args: {
  input: unknown;
  actor: string;
  now?: Date;
}): Promise<ProvisionalReceiptRecord> {
  if (provisionalReceiptsLiveModeEnabled()) refuseLive();
  const now = args.now ?? new Date();

  const rawInvoice =
    typeof args.input === "object" && args.input !== null
      ? (args.input as { invoice_number?: unknown }).invoice_number
      : undefined;
  const invoiceNumber = typeof rawInvoice === "string" ? rawInvoice.trim() : "";
  if (invoiceNumber === "") {
    throw new ApiError("Choose the invoice this receipt settles.", 422, {
      invoice: "Choose the invoice this receipt settles.",
    });
  }

  const invoice = await getInvoiceByNumber(invoiceNumber, now);
  if (!invoice) throw new ApiError("not_found", 404);

  const checked = validateProvisionalReceiptInput(args.input, invoice, now);
  if (!checked.ok) {
    const first =
      Object.values(checked.errors)[0] ?? "The provisional receipt could not be recorded.";
    throw new ApiError(first, 422, checked.errors);
  }

  return issueFixtureProvisionalReceipt({ input: checked.input, actor: args.actor, now });
}
