/**
 * Receivables — money owed and money received, PURE (client + server).
 *
 * WHY IT EXISTS. Two staff screens now read the office's dues: Accounting shows the
 * aging buckets and the received/outstanding/overdue tiles, Analytics shows the same
 * aging beside its figures. One rule set keeps them from disagreeing: the outstanding
 * balance is always `total − paid` floored at zero (never a negative "credit"), the
 * aging bucket is DERIVED from the invoice's own `due_at` and the business day
 * (`lib/payment-alerts.ts` owns the one overdue test), and a bucket is never stored
 * beside the invoice — `AgingBucket` in the billing contract is derived the same way
 * (`lib/api-client/billing-derive.ts`).
 *
 * HONESTY. A settled or over-paid invoice carries nothing here (it is not a due), and a
 * caller with no recorded payments gets `{ total_cents: 0, count: 0 }` — the SCREEN
 * decides whether that is a real ₱0 (payments exist, none in this window) or a named
 * blank (no payment was ever recorded), because only the record set knows.
 */
import { dateOnly, inPeriod, type DatePeriod } from "@/lib/period";
import { invoiceOverdue } from "@/lib/payment-alerts";

/** The four buckets the office reads dues by — the plan's exact vocabulary. */
export const AGING_BUCKETS = ["0-30", "31-60", "61-90", "90+"] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number];

export const AGING_BUCKET_LABEL: Record<AgingBucket, string> = {
  "0-30": "0–30 days",
  "31-60": "31–60 days",
  "61-90": "61–90 days",
  "90+": "90+ days",
};

/** The invoice fields the dues rules need; everything else is display. */
export type ReceivableInvoice = {
  total_cents: number;
  paid_cents: number;
  /** ISO instant; its UTC calendar day is what the age counts. */
  due_at: string;
};

export type ReceivablePayment = {
  /** yyyy-mm-dd the counter received it. */
  received_on: string;
  amount_cents: number;
};

/** What an invoice still owes: the balance floored at zero. Never a negative credit. */
export function outstandingCents(invoice: ReceivableInvoice): number {
  return Math.max(0, invoice.total_cents - invoice.paid_cents);
}

/** The total still owed across invoices. */
export function outstandingTotal(invoices: readonly ReceivableInvoice[]): number {
  return invoices.reduce((sum, invoice) => sum + outstandingCents(invoice), 0);
}

/**
 * The age of an invoice, whole calendar days past due, floored into the office's four
 * buckets. An invoice not yet due (or due today) is "0–30"; a due date the record cannot
 * parse is treated as current rather than dropped, so an invoice never disappears from
 * the dues it belongs to.
 */
export function agingBucketFor(dueAt: string, now: Date): AgingBucket {
  const due = Date.parse(`${dateOnly(dueAt)}T00:00:00Z`);
  if (Number.isNaN(due)) return "0-30";
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.floor((today - due) / 86_400_000);
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export type AgingRow = {
  bucket: AgingBucket;
  label: string;
  amount_cents: number;
  /** How many invoices carry money in this bucket. */
  count: number;
};

/**
 * The dues aging table: every invoice that still owes money, grouped into the four
 * buckets by its own due date. A bucket with no invoice is present with a real zero
 * amount and count — the table always has four rows so a reader can see the shape.
 */
export function duesAging(
  invoices: readonly ReceivableInvoice[],
  now: Date,
): AgingRow[] {
  const rows = new Map<AgingBucket, AgingRow>(
    AGING_BUCKETS.map((bucket) => [
      bucket,
      { bucket, label: AGING_BUCKET_LABEL[bucket], amount_cents: 0, count: 0 },
    ]),
  );
  for (const invoice of invoices) {
    const amount = outstandingCents(invoice);
    if (amount <= 0) continue;
    const row = rows.get(agingBucketFor(invoice.due_at, now));
    if (!row) continue;
    row.amount_cents += amount;
    row.count += 1;
  }
  return AGING_BUCKETS.map((bucket) => rows.get(bucket) as AgingRow);
}

/** The overdue half of the dues: the shared date rule, summed and counted. */
export function overdueTotal(
  invoices: readonly ReceivableInvoice[],
  now: Date,
): { amount_cents: number; count: number } {
  let amount = 0;
  let count = 0;
  for (const invoice of invoices) {
    const outstanding = outstandingCents(invoice);
    if (outstanding <= 0) continue;
    if (!invoiceOverdue(invoice, now)) continue;
    amount += outstanding;
    count += 1;
  }
  return { amount_cents: amount, count };
}

/** The payments received inside the window, with the count the tile shows. */
export function receivedInPeriod(
  payments: readonly ReceivablePayment[],
  period: DatePeriod,
): { total_cents: number; count: number } {
  let total = 0;
  let count = 0;
  for (const payment of payments) {
    if (!inPeriod(payment.received_on, period)) continue;
    total += payment.amount_cents;
    count += 1;
  }
  return { total_cents: total, count };
}
