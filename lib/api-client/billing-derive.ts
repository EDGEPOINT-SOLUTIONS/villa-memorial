/**
 * Presentation vocabulary for invoices, derived from the frozen storage vocabulary.
 * Rules are FROZEN in docs/08-delivery/contracts/billing-list-api-v1.md (KEB-D4-01).
 *
 * finance-billing stores three statuses; screens show four. "Overdue" is a function of
 * time rather than a stored state — an invoice becomes overdue while nobody touches it —
 * so it is derived here, once, and unit-tested against a fixed clock.
 *
 * These functions are pure and take `now` explicitly. Nothing here reads the system clock.
 */
import type { AgingBucket, InvoiceStatus } from "@/lib/api-client/finance";

/** Storage vocabulary as finance-billing persists it. */
export type StoredInvoiceStatus = "issued" | "partially_paid" | "paid";

const MS_PER_DAY = 86_400_000;

/** Whole days `due` is in the past relative to `now`, in UTC. Negative = not yet due. */
export function daysPastDue(dueAt: string, now: Date): number {
  const due = Date.parse(dueAt);
  if (Number.isNaN(due)) return 0;
  const dayOf = (ms: number) => Math.floor(ms / MS_PER_DAY);
  return dayOf(now.getTime()) - dayOf(due);
}

/**
 * A part-paid invoice stays `partial` even when late — its lateness is carried by the
 * aging bucket, not by the status. Only an untouched (`issued`) invoice goes `overdue`.
 */
export function displayStatus(
  stored: StoredInvoiceStatus,
  dueAt: string | null,
  now: Date,
): InvoiceStatus {
  if (stored === "paid") return "paid";
  if (stored === "partially_paid") return "partial";
  if (dueAt && daysPastDue(dueAt, now) > 0) return "overdue";
  return "pending";
}

/** A paid invoice is never aged — it is not owed, so it cannot be late. */
export function agingBucket(
  stored: StoredInvoiceStatus,
  dueAt: string | null,
  now: Date,
): AgingBucket {
  if (stored === "paid" || !dueAt) return "current";
  const days = daysPastDue(dueAt, now);
  if (days <= 0) return "current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  if (days <= 120) return "91-120";
  return "120+";
}

/**
 * The words a screen prints for a displayed status. One map, so the billing list and the
 * payment screen cannot call the same state two different things.
 */
export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  paid: "Paid",
  pending: "Pending",
  partial: "Part paid",
  overdue: "Overdue",
};

/** The badge tone per displayed status — the screen's one colour decision, made here. */
export const INVOICE_STATUS_TONE: Record<
  InvoiceStatus,
  "success" | "info" | "warning" | "danger"
> = {
  paid: "success",
  pending: "info",
  partial: "warning",
  overdue: "danger",
};
