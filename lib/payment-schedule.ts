/**
 * Payment-due schedule — the ONE source of truth for when a client's plan is due and
 * which reminders the in-system surface shows.
 *
 * The client's minute (Villa Memorial, 2026-09-21, item 1 — Payment Due Notification) asks
 * that a client be notified at least TWO DAYS before a scheduled payment, that the reminder
 * be visible inside the system, and that other channels be used "where supported". A demo
 * cannot run a background timer, so the rule here is a PURE DERIVATION from the client's own
 * recorded plan: every surface asks this module for the dues as of `now`, and the same
 * functions decide what is due soon, what is overdue, and which reminders fire. `now` is
 * always passed in — nothing here reads the wall clock.
 *
 * DATA, NOT A GATEWAY (the honest fixture state): the client's plan records the payment
 * mode and the installments that carry an amount and what has been paid (integer minor
 * units). The DUE DATE of each installment is DERIVED from the mode's interval
 * (`PLAN_TERM_DEFS.paymentsPerYear`) and the first due date, never stored twice — so an
 * office edit to the plan cannot leave a stale date behind. No live gateway data is
 * invented: the family snapshot is provisional until the frozen billing contract's
 * `installments[]` (`seq`, `due_date`, `amount_cents`, `paid_cents`) becomes family-facing,
 * and this module is the seam that will read it.
 *
 * MONEY stays a live reference: amounts are integer minor units and are only FORMATTED
 * here (repo money rule — a display string is never parsed). No view adds or subtracts.
 *
 * The other-channel seam lives in `lib/payment-reminder-channels.ts`; this module only
 * selects the reminders.
 */
import { PLAN_TERM_DEFS, type PlanTerm } from "@/lib/pricing-model";

/**
 * How many days before a due date a reminder fires. The minute says "at least two (2)
 * days"; the due-soon window is therefore today through +2 days inclusive.
 */
export const PAYMENT_DUE_SOON_DAYS = 2;

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** One installment as the plan records it: what is owed, and what has been paid. */
export type ScheduleInstallment = {
  /** 1-based order in the plan — also the installment's place in the derivation. */
  seq: number;
  amount_cents: number;
  paid_cents: number;
};

/** A client's recorded payment plan: the reference, the mode, and the installments. */
export type PaymentSchedule = {
  /** The payment reference the office and the client both quote. */
  reference: string;
  /** The plan's payment mode — the interval the due dates follow. */
  term: PlanTerm;
  /** The first installment's due date (yyyy-mm-dd); the rest are derived from it. */
  first_due_on: string;
  installments: ScheduleInstallment[];
};

/** Where one installment stands relative to `now`. */
export type PaymentDueState = "paid" | "overdue" | "due_soon" | "upcoming";

/** One installment with its DERIVED due date and state — what a surface renders. */
export type PaymentDue = {
  seq: number;
  reference: string;
  /** yyyy-mm-dd, derived from the first due date and the payment mode. */
  due_on: string;
  amount_cents: number;
  paid_cents: number;
  /** amount - paid, never negative. */
  due_cents: number;
  /** Negative when the date has passed, 0 today. */
  days_until_due: number;
  state: PaymentDueState;
};

/** A reminder selected by the two-days-before rule (visible inside the system). */
export type PaymentDueNotice = {
  id: string;
  kind: "due_soon" | "overdue";
  /** The client the reminder is about, as the record names them. */
  client: string;
  reference: string;
  seq: number;
  /** What is still owed on the installment. */
  amount_cents: number;
  due_on: string;
  days_until_due: number;
};

/* ------------------------------------------------------------- the derivation --- */

/** Months between installments for a payment mode (monthly → 1, annual → 12). */
export function monthsPerTerm(term: PlanTerm): number {
  const def = PLAN_TERM_DEFS.find((t) => t.id === term);
  if (!def) throw new Error(`unknown payment term: ${term}`);
  return 12 / def.paymentsPerYear;
}

/**
 * The due date of an installment, derived from the plan's first due date and its mode.
 * The day-of-month is kept where the target month allows it and clamped otherwise
 * (31 January + 1 month → 28/29 February), so a month length can never drift a date.
 */
export function installmentDueDate(
  firstDueOn: string,
  term: PlanTerm,
  seq: number,
): string {
  const base = new Date(`${firstDueOn}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return firstDueOn;
  const months = monthsPerTerm(term) * (seq - 1);
  const target = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + months, 1),
  );
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(base.getUTCDate(), lastDay));
  return target.toISOString().slice(0, 10);
}

/** Whole days from today (UTC) to a calendar due date. Negative = past. */
export function daysUntilDue(dueOn: string, now: Date): number {
  const due = Date.parse(`${dueOn}T00:00:00Z`);
  if (Number.isNaN(due)) return 0;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((due - today) / MS_PER_DAY);
}

/** What is still owed on an installment — never a negative (a credit is not modeled). */
export function installmentOutstandingCents(installment: ScheduleInstallment): number {
  return Math.max(0, installment.amount_cents - installment.paid_cents);
}

/**
 * The state rule, in one place: a settled installment is `paid`; a past-due one `overdue`;
 * one due within `PAYMENT_DUE_SOON_DAYS` (including today) `due_soon`; the rest `upcoming`.
 */
export function paymentDueState(dueCents: number, days: number): PaymentDueState {
  if (dueCents <= 0) return "paid";
  if (days < 0) return "overdue";
  if (days <= PAYMENT_DUE_SOON_DAYS) return "due_soon";
  return "upcoming";
}

/** Every installment as a due, with its derived date and state, in seq order. */
export function paymentDues(schedule: PaymentSchedule, now: Date): PaymentDue[] {
  return [...schedule.installments]
    .sort((a, b) => a.seq - b.seq)
    .map((installment) => {
      const due_on = installmentDueDate(schedule.first_due_on, schedule.term, installment.seq);
      const due_cents = installmentOutstandingCents(installment);
      const days_until_due = daysUntilDue(due_on, now);
      return {
        seq: installment.seq,
        reference: schedule.reference,
        due_on,
        amount_cents: installment.amount_cents,
        paid_cents: installment.paid_cents,
        due_cents,
        days_until_due,
        state: paymentDueState(due_cents, days_until_due),
      };
    });
}

/** Every installment still carrying a balance, earliest due first. */
export function unpaidPaymentDues(schedule: PaymentSchedule, now: Date): PaymentDue[] {
  return paymentDues(schedule, now)
    .filter((due) => due.due_cents > 0)
    .sort((a, b) => a.due_on.localeCompare(b.due_on) || a.seq - b.seq);
}

/** The next installment the client should pay — the earliest still open. */
export function nextPaymentDue(schedule: PaymentSchedule): PaymentDue | null {
  // The earliest open installment is a function of the recorded plan only; the state
  // (overdue / due soon) is what needs `now`, so this needs no clock.
  const open = [...schedule.installments]
    .filter((installment) => installmentOutstandingCents(installment) > 0)
    .sort((a, b) => a.seq - b.seq);
  const first = open[0];
  if (!first) return null;
  const due_on = installmentDueDate(schedule.first_due_on, schedule.term, first.seq);
  return {
    seq: first.seq,
    reference: schedule.reference,
    due_on,
    amount_cents: first.amount_cents,
    paid_cents: first.paid_cents,
    due_cents: installmentOutstandingCents(first),
    days_until_due: 0,
    state: paymentDueState(installmentOutstandingCents(first), 0),
  };
}

/* ------------------------------------------------------------- the reminder rule --- */

/**
 * The two-days-before selection: one reminder per installment that is due soon or
 * overdue. Overdue comes first (most late first), then the nearest due date. A settled
 * installment never reminds, and an installment further out never fires — so the surface
 * is deterministic from the plan and `now`, with no timer.
 */
export function paymentDueNotices(
  schedule: PaymentSchedule,
  options: { client: string; now: Date },
): PaymentDueNotice[] {
  return paymentDues(schedule, options.now)
    .filter((due) => due.state === "due_soon" || due.state === "overdue")
    .sort((a, b) => a.days_until_due - b.days_until_due || a.seq - b.seq)
    .map((due) => ({
      id: `${due.reference}:${due.seq}`,
      kind: due.state === "overdue" ? "overdue" : "due_soon",
      client: options.client,
      reference: due.reference,
      seq: due.seq,
      amount_cents: due.due_cents,
      due_on: due.due_on,
      days_until_due: due.days_until_due,
    }));
}

/* ------------------------------------------------------------- presentation --- */

/** A whole-peso amount, with centavos only when the record has them. */
export function paymentAmountLabel(cents: number): string {
  const pesos = cents / 100;
  const hasCentavos = cents % 100 !== 0;
  return (
    "₱" +
    pesos.toLocaleString("en-PH", {
      minimumFractionDigits: hasCentavos ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}

const SHORT_DATE = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});
const LONG_DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** “Sep 27, 2026” — the family snapshot's own next-due style. */
export function shortDueDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? iso : SHORT_DATE.format(date);
}

/** “27 September 2026” — a sentence reads better with the month spelled out. */
export function longDueDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? iso : LONG_DATE.format(date);
}

/** “Aug 27, 2026 · ₱10,000” — the plan's next open date and what it is for. */
export function nextPaymentDueLabel(due: PaymentDue): string {
  return `${shortDueDate(due.due_on)} · ${paymentAmountLabel(due.due_cents)}`;
}

/** “due today” / “due in 2 days” / “overdue by 5 days”. */
export function paymentDueCountdown(days: number): string {
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  if (days > 1) return `due in ${days} days`;
  const late = Math.abs(days);
  return late === 1 ? "overdue by 1 day" : `overdue by ${late} days`;
}

export const PAYMENT_DUE_STATE_LABEL: Record<PaymentDueState, string> = {
  paid: "Paid",
  overdue: "Overdue",
  due_soon: "Due soon",
  upcoming: "Upcoming",
};

/** The chip word for a state, whatever it is. */
export function paymentDueStateLabel(state: PaymentDueState): string {
  return PAYMENT_DUE_STATE_LABEL[state];
}

/** The one-line reminder body a channel carries. */
export function paymentDueNoticeBody(notice: PaymentDueNotice): string {
  const amount = paymentAmountLabel(notice.amount_cents);
  const date = longDueDate(notice.due_on);
  return notice.kind === "overdue"
    ? `${amount} was due on ${date}.`
    : `${amount} is due on ${date}.`;
}

/* ------------------------------------------------------------- the tolerant reader --- */

const TERM_IDS = PLAN_TERM_DEFS.map((term) => term.id);

function positiveInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  return value;
}

/**
 * Reads a recorded plan into the payment model, or returns null when the shape cannot be
 * trusted. This is the family snapshot's seam: a partial or corrupt record renders the
 * honest "not connected" state rather than a plausible-looking schedule, and extra fields
 * are ignored.
 */
export function parsePaymentSchedule(raw: unknown): PaymentSchedule | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;

  const reference = typeof record.reference === "string" ? record.reference.trim() : "";
  if (reference === "") return null;

  const term = record.term;
  if (typeof term !== "string" || !(TERM_IDS as readonly string[]).includes(term)) return null;

  const firstDue = record.first_due_on;
  if (typeof firstDue !== "string" || !ISO_DATE.test(firstDue)) return null;

  if (!Array.isArray(record.installments) || record.installments.length === 0) return null;

  const installments: ScheduleInstallment[] = [];
  for (const entry of record.installments) {
    if (typeof entry !== "object" || entry === null) return null;
    const row = entry as Record<string, unknown>;
    const seq = positiveInteger(row.seq);
    const amount = positiveInteger(row.amount_cents);
    const paid = positiveInteger(row.paid_cents);
    if (seq === null || seq < 1) return null;
    if (amount === null || amount <= 0) return null;
    if (paid === null || paid < 0 || paid > amount) return null;
    installments.push({ seq, amount_cents: amount, paid_cents: paid });
  }

  const seqs = installments.map((installment) => installment.seq);
  const unique = new Set(seqs);
  if (unique.size !== seqs.length) return null;
  const ordered = [...seqs].sort((a, b) => a - b);
  if (ordered[0] !== 1 || ordered[ordered.length - 1] !== ordered.length) return null;

  return {
    reference,
    term: term as PlanTerm,
    first_due_on: firstDue,
    installments,
  };
}
