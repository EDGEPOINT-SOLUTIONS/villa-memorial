/**
 * Payment alerts — the staff dashboard's due-soon / overdue selection, built on the
 * ONE two-day rule.
 *
 * The client's minute (Villa Memorial, 2026-09-21, item 4) asks for a red dashboard
 * indicator for payments approaching their due date, two days out, with a clear
 * upcoming-versus-overdue distinction. The rule itself is NOT re-declared here:
 * `lib/payment-schedule.ts` (the family-notification lane, PR #126) owns
 * `PAYMENT_DUE_SOON_DAYS`, `daysUntilDue` and `paymentDueState`, and this module
 * COMPOSES them, so a change to the window moves the family reminders and the office
 * dashboard together.
 *
 * SOURCE: the staff side of the platform ask (`docs/08-delivery/open-items.md` §6) —
 * the frozen billing list contract carries each invoice's `due_at` and outstanding
 * balance, while the family lane's plan-derived schedule is the same rule over a
 * different record shape. A record with no trustworthy due date is dropped rather
 * than guessed at. Amounts stay integer minor units and are only FORMATTED here
 * (repo money rule — a display string is never parsed, and no view adds or subtracts).
 *
 * `now` is always passed in; nothing here reads the wall clock, so the dashboard's
 * selection is a pure function of the records and the day the office is open.
 */
import {
  PAYMENT_DUE_SOON_DAYS,
  daysUntilDue,
  paymentAmountLabel,
  paymentDueCountdown,
  paymentDueState,
} from "@/lib/payment-schedule";

/** One payment the office is owed, as the billing record states it. */
export type PaymentAlertSource = {
  /** Stable record id (the invoice id) — used as the row key. */
  id: string;
  /** The invoice number the office and the client both quote. */
  reference: string;
  /** The client the payment belongs to, as the record names them. */
  client: string;
  /** Still owed, integer minor units. Zero/negative never alerts. */
  amount_cents: number;
  /** The record's due instant (ISO 8601); its UTC calendar day is what counts. */
  due_at: string;
};

/** The two states the dashboard flags; `upcoming` and `paid` never alert. */
export const PAYMENT_ALERT_STATES = ["overdue", "due_soon"] as const;
export type PaymentAlertState = (typeof PAYMENT_ALERT_STATES)[number];

export type PaymentAlert = {
  id: string;
  reference: string;
  client: string;
  /** Still owed, integer minor units. */
  amount_cents: number;
  /** Whole-peso label, e.g. “₱12,000” — display only. */
  amount_label: string;
  /** The due calendar day (yyyy-mm-dd), derived from the record's instant. */
  due_on: string;
  /** Negative when the date has passed, 0 today. */
  days_until_due: number;
  state: PaymentAlertState;
  /** “Due soon” / “Overdue” — the word, so colour is never the only signal. */
  state_label: string;
  /** “due in 2 days” / “overdue by 5 days”. */
  countdown: string;
};

export type PaymentAlertSummary = {
  /** Overdue first (most late first), then due-soon (nearest first). */
  overdue: PaymentAlert[];
  due_soon: PaymentAlert[];
  overdue_count: number;
  due_soon_count: number;
  /** What the dashboard headline counts: overdue + due-soon. */
  total: number;
  overdue_cents: number;
  due_soon_cents: number;
};

/** The UTC calendar day (yyyy-mm-dd) of an instant — the basis `daysUntilDue` reads. */
export function alertDueDate(dueAt: string): string {
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toAlert(source: PaymentAlertSource, now: Date): PaymentAlert | null {
  const amount = Math.max(0, source.amount_cents);
  const dueOn = alertDueDate(source.due_at);
  if (amount <= 0 || dueOn === "") return null;

  const days = daysUntilDue(dueOn, now);
  // The shared rule decides: paid / overdue / due_soon / upcoming. Only the two the
  // dashboard flags survive; the rest (settled, or further than two days out) are not
  // an alert.
  const state = paymentDueState(amount, days);
  if (state !== "overdue" && state !== "due_soon") return null;

  return {
    id: source.id,
    reference: source.reference,
    client: source.client,
    amount_cents: amount,
    amount_label: paymentAmountLabel(amount),
    due_on: dueOn,
    days_until_due: days,
    state,
    state_label: state === "overdue" ? "Overdue" : "Due soon",
    countdown: paymentDueCountdown(days),
  };
}

/**
 * The dashboard's alert set: every payment the office is still owed whose due date has
 * passed or falls within the shared two-day window. Deterministic from the records and
 * `now`, so the dashboard cannot disagree with the rule the family reminder runs on.
 */
export function buildPaymentAlerts(
  sources: readonly PaymentAlertSource[],
  now: Date,
): PaymentAlertSummary {
  const alerts = sources
    .map((source) => toAlert(source, now))
    .filter((alert): alert is PaymentAlert => alert !== null);

  const overdue = alerts
    .filter((alert) => alert.state === "overdue")
    .sort((a, b) => a.days_until_due - b.days_until_due || a.reference.localeCompare(b.reference));
  const due_soon = alerts
    .filter((alert) => alert.state === "due_soon")
    .sort((a, b) => a.days_until_due - b.days_until_due || a.reference.localeCompare(b.reference));

  const sum = (rows: PaymentAlert[]) => rows.reduce((total, row) => total + row.amount_cents, 0);

  return {
    overdue,
    due_soon,
    overdue_count: overdue.length,
    due_soon_count: due_soon.length,
    total: overdue.length + due_soon.length,
    overdue_cents: sum(overdue),
    due_soon_cents: sum(due_soon),
  };
}

/**
 * THE one overdue test every staff screen uses: an invoice still owes money and its due
 * date has passed. `buildPaymentAlerts` classifies with the same `paymentDueState`, so the
 * dashboard band, the billing list's KPI and its `?status=overdue` filter cannot disagree.
 *
 * This exists because they DID: the 2026-09-21 review found the dashboard reading
 * "Overdue accounts 2" (the invoice's stored status, which leaves a part-paid invoice
 * `partial` however late it is) beside the band's "6 overdue" (the date rule). One rule now.
 * A settled invoice is never overdue, even when its date has passed.
 */
export function invoiceOverdue(
  invoice: { total_cents: number; paid_cents: number; due_at: string },
  now: Date,
): boolean {
  const amount = Math.max(0, invoice.total_cents - invoice.paid_cents);
  if (amount <= 0) return false;
  const dueOn = alertDueDate(invoice.due_at);
  if (dueOn === "") return false;
  return paymentDueState(amount, daysUntilDue(dueOn, now)) === "overdue";
}

/** The window the alert headline names, read from the shared rule. */
export function paymentAlertWindowDays(): number {
  return PAYMENT_DUE_SOON_DAYS;
}
