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
 */
import invoicesFile from "@/lib/fixtures/finance/invoices.json";
import { ApiError } from "@/lib/api-client/api-error";
import { getAuthedJson, itemsOf } from "@/lib/api-client/staff-fetch";
import {
  agingBucket,
  displayStatus,
  type StoredInvoiceStatus,
} from "@/lib/api-client/billing-derive";

const BASE_URL = process.env.BILLING_BASE_URL ?? "";

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

type InvoiceStore = {
  tenant_id: string;
  invoices: Invoice[];
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
    const payload = await getAuthedJson(BASE_URL, "/billing/api/v1/invoices");
    return itemsOf(payload).map((raw) => toInvoice(raw, now));
  }
  const store = invoicesFile as unknown as InvoiceStore;
  return store.invoices.map((i) => ({ ...i }));
}

/**
 * Fetches one invoice. In fixture mode `id` is the record UUID; live, the service addresses
 * invoices by their capability token (`INV-…`/`ORD-…`), so the live branch resolves through
 * the list — the same trade `getCase` makes, for the same reason.
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
  const store = invoicesFile as unknown as InvoiceStore;
  const invoice = store.invoices.find((i) => i.id === id);
  if (!invoice) {
    throw new ApiError("not_found", 404);
  }
  return { ...invoice };
}
