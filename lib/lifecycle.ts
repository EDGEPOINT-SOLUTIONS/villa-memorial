/**
 * The client lifecycle AFTER Prospects — the office's post-enquiry outcomes, PURE.
 *
 * WHY THIS MODULE EXISTS. The captain (2026-10-03) drew the line past the
 * Prospect: when a person decides, the office records ONE of three outcomes —
 * they take a **Plan** (a member, paid in installments), they **avail a
 * service** (a burial / funeral service, booked on a day with a resource), or
 * they **buy a product** (a casket, a package, or a garden **lot** paid monthly).
 * Each of those is a recorded engagement, and the office must see, at a glance,
 * who owes what and when it is due.
 *
 * WHAT LIVES HERE, AND WHAT DOES NOT. This file is the ONE reading of an
 * engagement: the shape, the amortization derivation, the paid / outstanding /
 * remaining figures, the modular notice rules and the form intakes the BFF
 * routes and the forms both run. It never persists and never reads a wall clock
 * (`now` is always passed in). Persistence is `lib/api-client/lifecycle-store.ts`;
 * the app-facing reads are `lib/api-client/lifecycle.ts`.
 *
 * ONE FACT, ONE SOURCE. An engagement never restates a fact another store owns:
 * it LINKS to the prospect it came from (`prospect_id`) and to the recorded agent
 * (`agent`), and the money is derived from the recorded payments — never stored
 * twice. The members page lists plan engagements; the services page lists service
 * engagements (whose `schedule` is what the office calendar renders); the lots and
 * products pages list their own kinds.
 *
 * HONEST TRANSPORT. No email or SMS service is connected (P4), so a modular
 * notice is SCHEDULED and SHOWN in-system; the office hands it to its own mail
 * app. `NOTICE_TRANSPORT_NOTE` says so; a template is never dressed up as sent.
 *
 * MONEY stays integer minor units (`*_cents`) and is only FORMATTED here through
 * the shared helpers (`lib/payment-schedule.ts`) — a view never adds or subtracts.
 */
import {
  daysUntilDue,
  installmentDueDate,
  paymentAmountLabel,
  paymentDueState,
  longDueDate,
  type PaymentDueState,
} from "@/lib/payment-schedule";
import { PLAN_TERM_DEFS, type PlanTerm } from "@/lib/pricing-model";

export { paymentAmountLabel, longDueDate, shortDueDate } from "@/lib/payment-schedule";

/* ------------------------------------------------------------------ */
/* The vocabulary                                                      */
/* ------------------------------------------------------------------ */

export const ENGAGEMENT_KINDS = ["plan", "service", "lot", "product"] as const;
export type EngagementKind = (typeof ENGAGEMENT_KINDS)[number];

/** The office's own word for each outcome. */
export const ENGAGEMENT_KIND_LABEL: Record<EngagementKind, string> = {
  plan: "Plan membership",
  service: "Service",
  lot: "Garden lot",
  product: "Product",
};

export const ENGAGEMENT_KIND_PLURAL: Record<EngagementKind, string> = {
  plan: "Plan members",
  service: "Service clients",
  lot: "Garden lots",
  product: "Product buyers",
};

/** The register each kind is listed on — one page per outcome (captain, 2026-10-03). */
export const ENGAGEMENT_KIND_HREF: Record<EngagementKind, string> = {
  plan: "/staff/members",
  service: "/staff/services",
  lot: "/staff/lots",
  product: "/staff/products",
};

export function isEngagementKind(value: unknown): value is EngagementKind {
  return typeof value === "string" && (ENGAGEMENT_KINDS as readonly string[]).includes(value);
}

export const PAYMENT_MODES = ["one_time", "monthly", "quarterly", "semi", "annual"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export function isPaymentMode(value: unknown): value is PaymentMode {
  return typeof value === "string" && (PAYMENT_MODES as readonly string[]).includes(value);
}

/** A term mode is one of the plan's own payment modes; `one_time` is a single payment. */
export function isTermMode(mode: PaymentMode): mode is PlanTerm {
  return mode !== "one_time";
}

/** How many installments a term mode makes in one year (`one_time` → one). */
export function paymentsPerYear(mode: PaymentMode): number {
  if (mode === "one_time") return 1;
  return PLAN_TERM_DEFS.find((term) => term.id === mode)?.paymentsPerYear ?? 1;
}

const MODE_LABEL: Record<PaymentMode, string> = {
  one_time: "One-time",
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi: "Semi-annual",
  annual: "Annual",
};

export function paymentModeLabel(mode: PaymentMode): string {
  return MODE_LABEL[mode];
}

/** A short per-period suffix ("/ month", "one-time"). */
export function paymentModePer(mode: PaymentMode): string {
  if (mode === "one_time") return "one-time";
  return PLAN_TERM_DEFS.find((term) => term.id === mode)?.per ?? "";
}

/* ------------------------------------------------------------------ */
/* The record                                                          */
/* ------------------------------------------------------------------ */

export type LifecycleClient = {
  name: string;
  phone: string;
  email: string;
};

/** A service's calendar slot — what the office calendar renders and opens. */
export type EngagementSchedule = {
  /** yyyy-mm-dd. */
  on: string;
  /** Park-time "HH:MM", or "" for an all-day item. */
  time: string;
  resource_id: string;
  resource_name: string;
  case_number: string | null;
};

/** A garden lot's own coordinates (the lot sheet prices lots by family + area). */
export type EngagementLot = {
  lot_id: string | null;
  lot_number: string;
  section: string;
};

export type Engagement = {
  id: string;
  /** The office's own reference ("VMP-2026-0001"). */
  reference: string;
  kind: EngagementKind;
  client: LifecycleClient;
  /** The prospect this outcome came from, when the office converted one. */
  prospect_id: string | null;
  /** The recorded agent who brokered it, when one did. */
  agent: string | null;
  /** What was availed or bought, and where its figure comes from. */
  item: {
    sku: string;
    name: string;
    detail: string;
    /** The recorded price basis (the sheet or the office's quote). */
    price_basis: string;
  };
  /** The whole contract amount in minor units. */
  amount_cents: number;
  /** How it is paid. A plan and a lot are paid in installments; a product is not. */
  mode: PaymentMode;
  /** How many installments the contract makes (1 for `one_time`). */
  installments: number;
  /** The first installment's due date (yyyy-mm-dd); always set by the intake. */
  first_due_on: string;
  /** The calendar slot a service carries; null for every other kind. */
  schedule: EngagementSchedule | null;
  /** The lot coordinates a lot carries; null for every other kind. */
  lot: EngagementLot | null;
  recorded_at: string;
  recorded_by: string | null;
};

/** One recorded payment against an engagement (what the office received, and when). */
export type Payment = {
  id: string;
  engagement_id: string;
  amount_cents: number;
  /** yyyy-mm-dd the counter received it. */
  paid_on: string;
  note: string;
  recorded_by: string | null;
  recorded_at: string;
};

/**
 * A modular notice the office writes once and the app schedules per due date:
 * "Two days before", "A day before", "On the due day", or any offset the office
 * chooses. `days_before` is the offset; the message carries `{amount}`, `{date}`
 * and `{member}` tokens the renderer fills from the installment.
 */
export type NoticeTemplate = {
  id: string;
  label: string;
  /** Whole days before the due date the notice fires (0 = on the due day). */
  days_before: number;
  message: string;
  active: boolean;
  created_at: string;
};

/** A recorded hand-off of one scheduled notice (the office's own mail app). */
export type NoticeSend = {
  id: string;
  engagement_id: string;
  template_id: string;
  seq: number;
  /** ISO instant the office recorded it as handled. */
  sent_at: string;
  sent_by: string | null;
};

/* ------------------------------------------------------------------ */
/* Amortization — the one derivation                                   */
/* ------------------------------------------------------------------ */

/** Split a whole amount into `n` whole-cent installments; the last carries the remainder. */
export function installmentAmounts(totalCents: number, n: number): number[] {
  const count = Math.max(1, Math.trunc(n));
  const total = Math.max(0, Math.trunc(totalCents));
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, index) =>
    index === count - 1 ? base + remainder : base,
  );
}

export type ScheduleRow = {
  seq: number;
  /** "1 of 12" — the period label the schedule table prints. */
  period: string;
  /** yyyy-mm-dd, derived from the first due date and the mode. */
  due_on: string;
  amount_cents: number;
  /** What has been applied to this installment. */
  paid_cents: number;
  /** amount − paid, never negative. */
  due_cents: number;
  /** The contract balance still owed AFTER this installment. */
  remaining_cents: number;
  days_until_due: number;
  state: PaymentDueState;
};

/** True when no installment carries money — the schedule is settled. */
export function scheduleSettled(rows: readonly ScheduleRow[]): boolean {
  return rows.every((row) => row.due_cents <= 0);
}

/**
 * The amortization schedule as the record stands: the contract split into its
 * installments, due dates derived from the mode, and the recorded payments
 * applied OLDEST FIRST (the standard waterfall; no credit is modeled).
 */
export function amortizationSchedule(
  engagement: Pick<Engagement, "amount_cents" | "mode" | "installments" | "first_due_on">,
  payments: readonly Pick<Payment, "amount_cents">[],
  now: Date,
): ScheduleRow[] {
  const amounts = installmentAmounts(engagement.amount_cents, engagement.installments);
  let pool = payments.reduce((sum, payment) => sum + payment.amount_cents, 0);

  const rows = amounts.map((amount_cents, index) => {
    const seq = index + 1;
    const applied = Math.max(0, Math.min(pool, amount_cents));
    pool -= applied;
    const due_cents = Math.max(0, amount_cents - applied);
    const due_on = isTermMode(engagement.mode)
      ? installmentDueDate(engagement.first_due_on, engagement.mode, seq)
      : engagement.first_due_on;
    const days = daysUntilDue(due_on, now);
    return {
      seq,
      period: `${seq} of ${amounts.length}`,
      due_on,
      amount_cents,
      paid_cents: applied,
      due_cents,
      remaining_cents: 0,
      days_until_due: days,
      state: paymentDueState(due_cents, days),
    };
  });

  // The remaining balance after each installment is the sum of this and every later due.
  let tail = 0;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    tail += rows[i].due_cents;
    rows[i].remaining_cents = tail;
  }
  return rows;
}

export type EngagementTotals = {
  amount_cents: number;
  paid_cents: number;
  /** Never negative — an overpayment is not a credit. */
  outstanding_cents: number;
  settled: boolean;
  installments_total: number;
  installments_paid: number;
  /** The whole contract balance due now (overdue installments). */
  overdue_cents: number;
  due_soon_cents: number;
  /** The earliest still-open installment, or null when settled. */
  next_due: ScheduleRow | null;
};

/** The one reading of an engagement's money, from its recorded payments. */
export function engagementTotals(
  engagement: Pick<Engagement, "amount_cents" | "mode" | "installments" | "first_due_on">,
  payments: readonly Pick<Payment, "amount_cents">[],
  now: Date,
): EngagementTotals {
  const rows = amortizationSchedule(engagement, payments, now);
  const paid_cents = payments.reduce((sum, payment) => sum + payment.amount_cents, 0);
  const outstanding_cents = Math.max(0, engagement.amount_cents - paid_cents);
  return {
    amount_cents: engagement.amount_cents,
    paid_cents,
    outstanding_cents,
    settled: outstanding_cents <= 0,
    installments_total: rows.length,
    installments_paid: rows.filter((row) => row.due_cents <= 0).length,
    overdue_cents: rows
      .filter((row) => row.state === "overdue")
      .reduce((sum, row) => sum + row.due_cents, 0),
    due_soon_cents: rows
      .filter((row) => row.state === "due_soon")
      .reduce((sum, row) => sum + row.due_cents, 0),
    next_due: rows.find((row) => row.due_cents > 0) ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Modular notices                                                     */
/* ------------------------------------------------------------------ */

const MS_PER_DAY = 86_400_000;

/** A calendar date `days` after an ISO date (negative steps backwards). */
export function shiftDate(iso: string, days: number): string {
  const base = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(base)) return iso;
  return new Date(base + days * MS_PER_DAY).toISOString().slice(0, 10);
}

export type NoticeState = "scheduled" | "due" | "sent" | "missed";

export const NOTICE_STATE_LABEL: Record<NoticeState, string> = {
  scheduled: "Scheduled",
  due: "Ready to send",
  sent: "Sent",
  missed: "Window passed",
};

export type ScheduledNotice = {
  /** `${engagement_id}:${template_id}:${seq}` — stable across renders. */
  id: string;
  engagement_id: string;
  template_id: string;
  label: string;
  days_before: number;
  seq: number;
  /** yyyy-mm-dd the installment is due. */
  due_on: string;
  /** yyyy-mm-dd the notice fires (due date − days_before). */
  fire_on: string;
  message: string;
  state: NoticeState;
  sent_at: string | null;
};

/** Fill a template's `{amount}` / `{date}` / `{member}` tokens from one installment. */
export function renderNoticeMessage(
  template: Pick<NoticeTemplate, "message">,
  row: Pick<ScheduleRow, "due_cents" | "due_on">,
  clientName: string,
): string {
  return template.message
    .replaceAll("{amount}", paymentAmountLabel(row.due_cents))
    .replaceAll("{date}", longDueDate(row.due_on))
    .replaceAll("{member}", clientName);
}

/**
 * The notices the app has scheduled for one engagement, from its ACTIVE modular
 * templates: one notice per open installment per template, fired `days_before`
 * days ahead. A settled installment never reminds. A notice the office already
 * handled (`sends`) reads `sent`; one whose window has passed unsent reads
 * `missed` — never a fabricated "sent".
 */
export function scheduledNotices(
  engagement: Pick<
    Engagement,
    "id" | "client" | "amount_cents" | "mode" | "installments" | "first_due_on"
  >,
  payments: readonly Pick<Payment, "amount_cents">[],
  templates: readonly NoticeTemplate[],
  sends: readonly NoticeSend[],
  now: Date,
): ScheduledNotice[] {
  const rows = amortizationSchedule(engagement, payments, now).filter((row) => row.due_cents > 0);
  const sent = new Set(sends.map((send) => `${send.template_id}:${send.seq}`));
  const sentAt = new Map(sends.map((send) => [`${send.template_id}:${send.seq}`, send.sent_at]));
  const today = todayIso(now);
  const active = templates.filter((template) => template.active);

  const notices: ScheduledNotice[] = [];
  for (const row of rows) {
    for (const template of active) {
      const fire_on = shiftDate(row.due_on, -template.days_before);
      const key = `${template.id}:${row.seq}`;
      let state: NoticeState;
      if (sent.has(key)) state = "sent";
      else if (fire_on > today) state = "scheduled";
      else if (row.due_on >= today) state = "due";
      else state = "missed";
      notices.push({
        id: `${engagement.id}:${key}`,
        engagement_id: engagement.id,
        template_id: template.id,
        label: template.label,
        days_before: template.days_before,
        seq: row.seq,
        due_on: row.due_on,
        fire_on,
        message: renderNoticeMessage(template, row, engagement.client.name),
        state,
        sent_at: sentAt.get(key) ?? null,
      });
    }
  }
  return notices.sort((a, b) => a.fire_on.localeCompare(b.fire_on) || a.seq - b.seq);
}

/** Today's calendar date (UTC) from a passed-in clock — never the host clock. */
export function todayIso(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

/** The one honest line about how a scheduled notice travels (or does not). */
export const NOTICE_TRANSPORT_NOTE =
  "No email or SMS service is connected yet (P4), so the app schedules each notice and " +
  "holds it in-system: the office opens it here and hands it to its own mail app. Nothing " +
  "is claimed as delivered.";

/* ------------------------------------------------------------------ */
/* One-line summaries the lists lead with                              */
/* ------------------------------------------------------------------ */

export type EngagementView = {
  engagement: Engagement;
  totals: EngagementTotals;
  payments: Payment[];
};

/** A one-line balance the list's row prints: "₱0 of ₱13,440 paid". */
export function balanceLine(totals: EngagementTotals): string {
  return `${paymentAmountLabel(totals.paid_cents)} of ${paymentAmountLabel(totals.amount_cents)} paid`;
}

/** A one-line next-due the list's row prints, or the settled word. */
export function nextDueLine(totals: EngagementTotals): string {
  if (totals.settled) return "Settled";
  if (!totals.next_due) return "—";
  const row = totals.next_due;
  if (row.state === "overdue") return `Overdue · ${paymentAmountLabel(row.due_cents)}`;
  if (row.state === "due_soon") return `Due ${row.days_until_due === 0 ? "today" : `in ${row.days_until_due} d`}`;
  return `${longDueDate(row.due_on)} · ${paymentAmountLabel(row.due_cents)}`;
}

/** The list's status tone from the totals, so a row never rides raw colour. */
export function engagementTone(
  totals: EngagementTotals,
): "success" | "warning" | "danger" | "neutral" {
  if (totals.settled) return "success";
  if (totals.overdue_cents > 0) return "danger";
  if (totals.due_soon_cents > 0) return "warning";
  return "neutral";
}

/** The office's one-word state for an engagement ("Settled" / "Overdue" / "Open"). */
export function engagementStateLabel(totals: EngagementTotals): string {
  if (totals.settled) return "Settled";
  if (totals.overdue_cents > 0) return "Overdue";
  if (totals.due_soon_cents > 0) return "Due soon";
  return "Open";
}

/* ------------------------------------------------------------------ */
/* Form intakes — the one reading the form and the route both run      */
/* ------------------------------------------------------------------ */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const MONEY_RE = /^\d+(\.\d{1,2})?$/;

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE.test(value);
}

function text(value: unknown, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Parse a whole-peso amount (a string or number) into integer minor units. */
export function parsePesoAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value * 100);
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replaceAll(",", "");
  if (!MONEY_RE.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
}

export type EngagementInput = {
  kind: EngagementKind;
  client: LifecycleClient;
  prospect_id: string | null;
  agent: string | null;
  item: Engagement["item"];
  amount_cents: number;
  mode: PaymentMode;
  installments: number;
  first_due_on: string;
  schedule: EngagementSchedule | null;
  lot: EngagementLot | null;
};

export type EngagementIntake =
  | { ok: true; value: EngagementInput }
  | { ok: false; errors: Record<string, string> };

const MAX_INSTALLMENTS = 240;

/**
 * The office's own "record an outcome" reading. Which fields are required depends
 * on the kind: a service needs a calendar slot, a lot needs its coordinates, and
 * a term-paid outcome (plan · lot) needs its installment count and first due date.
 * A product and a one-time service need only the amount.
 */
export function readEngagementIntake(
  body: unknown,
  options: { today: string },
): EngagementIntake {
  const record =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const errors: Record<string, string> = {};

  const kind = record.kind;
  if (!isEngagementKind(kind)) {
    return { ok: false, errors: { kind: "Choose what they took: a plan, a service, a lot or a product." } };
  }

  const name = text(record.name, 120);
  if (name.length === 0) errors.name = "Enter the client's name.";

  const itemName = text(record.item_name, 160);
  if (itemName.length === 0) {
    errors.item_name =
      kind === "plan"
        ? "Name the plan they took."
        : kind === "service"
          ? "Name the service they availed."
          : kind === "lot"
            ? "Name the lot they took."
            : "Name the product they bought.";
  }

  const amount_cents =
    typeof record.amount_cents === "number"
      ? (Number.isInteger(record.amount_cents) && record.amount_cents >= 0 ? record.amount_cents : null)
      : parsePesoAmount(record.amount);
  if (amount_cents === null || amount_cents <= 0) {
    errors.amount = "Enter the amount in pesos (for example 13440).";
  }

  const defaultMode: PaymentMode = kind === "plan" || kind === "lot" ? "monthly" : "one_time";
  const mode = isPaymentMode(record.mode) ? record.mode : defaultMode;
  if (kind === "plan" && mode === "one_time") {
    errors.mode = "A plan is paid in installments — choose a term (monthly, quarterly, semi-annual or annual).";
  }
  if (kind === "product" && mode !== "one_time") {
    errors.mode = "A product is a one-time purchase.";
  }

  const termPaid = isTermMode(mode);
  let first_due_on = isIsoDate(record.first_due_on) ? record.first_due_on : null;
  let installments = 1;
  if (termPaid) {
    const raw = record.installments;
    const parsed =
      typeof raw === "number" && Number.isInteger(raw)
        ? raw
        : typeof raw === "string" && /^\d+$/.test(raw.trim())
          ? Number(raw.trim())
          : paymentsPerYear(mode);
    if (parsed < 1 || parsed > MAX_INSTALLMENTS) {
      errors.installments = `Enter between 1 and ${MAX_INSTALLMENTS} installments.`;
    }
    installments = parsed;
    if (!first_due_on) errors.first_due_on = "Enter the first due date.";
  } else {
    first_due_on = first_due_on ?? options.today;
    installments = 1;
  }

  // A service carries the calendar slot the office calendar renders.
  let schedule: EngagementSchedule | null = null;
  if (kind === "service") {
    const raw =
      typeof record.schedule === "object" && record.schedule !== null
        ? (record.schedule as Record<string, unknown>)
        : {};
    const on = isIsoDate(raw.on) ? raw.on : null;
    const resource_name = text(raw.resource_name, 120);
    if (!on) errors.schedule_on = "Enter the service date.";
    if (resource_name.length === 0) errors.schedule_resource = "Enter the room, vehicle or chapel.";
    if (on && resource_name) {
      schedule = {
        on,
        time: text(raw.time, 5),
        resource_id: text(raw.resource_id, 80) || resource_name,
        resource_name,
        case_number: text(raw.case_number, 40) || null,
      };
    }
  }

  // A lot carries its own coordinates.
  let lot: EngagementLot | null = null;
  if (kind === "lot") {
    const raw =
      typeof record.lot === "object" && record.lot !== null
        ? (record.lot as Record<string, unknown>)
        : {};
    const lot_number = text(raw.lot_number, 40);
    const section = text(raw.section, 40);
    if (lot_number.length === 0) errors.lot_number = "Enter the lot number.";
    if (section.length === 0) errors.section = "Enter the section.";
    if (lot_number && section) {
      lot = { lot_id: text(raw.lot_id, 80) || null, lot_number, section };
    }
  }

  if (Object.keys(errors).length > 0 || amount_cents === null) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      kind,
      client: {
        name,
        phone: text(record.phone, 40),
        email: text(record.email, 160),
      },
      prospect_id: text(record.prospect_id, 120) || null,
      agent: text(record.agent, 120) || null,
      item: {
        sku: text(record.sku, 60),
        name: itemName,
        detail: text(record.detail, 300),
        price_basis: text(record.price_basis, 200),
      },
      amount_cents,
      mode,
      installments,
      first_due_on: first_due_on ?? options.today,
      schedule,
      lot,
    },
  };
}

export type PaymentInput = {
  engagement_id: string;
  amount_cents: number;
  paid_on: string;
  note: string;
};

export type PaymentIntake =
  | { ok: true; value: PaymentInput }
  | { ok: false; errors: Record<string, string> };

/** The counter's "record a payment" reading. An amount is always whole pesos. */
export function readPaymentIntake(
  body: unknown,
  options: { today: string },
): PaymentIntake {
  const record =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const errors: Record<string, string> = {};

  const engagement_id = text(record.engagement_id, 120);
  if (engagement_id.length === 0) errors.engagement_id = "No engagement was named.";

  const amount_cents =
    typeof record.amount_cents === "number" && Number.isInteger(record.amount_cents)
      ? record.amount_cents
      : parsePesoAmount(record.amount);
  if (amount_cents === null || amount_cents <= 0) {
    errors.amount = "Enter the amount received in pesos (for example 1120).";
  }

  const paid_on = isIsoDate(record.paid_on) ? record.paid_on : options.today;

  if (Object.keys(errors).length > 0 || amount_cents === null) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      engagement_id,
      amount_cents,
      paid_on,
      note: text(record.note, 200),
    },
  };
}

export type NoticeTemplateInput = {
  label: string;
  days_before: number;
  message: string;
  active: boolean;
};

export type NoticeTemplateIntake =
  | { ok: true; value: NoticeTemplateInput }
  | { ok: false; errors: Record<string, string> };

/** The office's modular-notice reading: a label, an offset and the message. */
export function readNoticeTemplateIntake(body: unknown): NoticeTemplateIntake {
  const record =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const errors: Record<string, string> = {};

  const label = text(record.label, 80);
  if (label.length === 0) errors.label = "Give the notice a name (for example “Two days before”).";

  const rawDays = record.days_before;
  const days_before =
    typeof rawDays === "number" && Number.isInteger(rawDays)
      ? rawDays
      : typeof rawDays === "string" && /^\d+$/.test(rawDays.trim())
        ? Number(rawDays.trim())
        : NaN;
  if (!Number.isInteger(days_before) || days_before < 0 || days_before > 90) {
    errors.days_before = "Enter how many days before the due date (0 to 90).";
  }

  const message = text(record.message, 500);
  if (message.length === 0) {
    errors.message = "Write the notice. Use {amount}, {date} and {member} for the details.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      label,
      days_before: days_before as number,
      message,
      active: record.active === false ? false : true,
    },
  };
}

export type NoticeSendInput = { engagement_id: string; template_id: string; seq: number };

export type NoticeSendIntake =
  | { ok: true; value: NoticeSendInput }
  | { ok: false; errors: Record<string, string> };

/** The office's "I handed this notice off" reading. */
export function readNoticeSendIntake(body: unknown): NoticeSendIntake {
  const record =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const errors: Record<string, string> = {};
  const engagement_id = text(record.engagement_id, 120);
  const template_id = text(record.template_id, 120);
  const rawSeq = record.seq;
  const seq =
    typeof rawSeq === "number" && Number.isInteger(rawSeq)
      ? rawSeq
      : typeof rawSeq === "string" && /^\d+$/.test(rawSeq.trim())
        ? Number(rawSeq.trim())
        : NaN;
  if (engagement_id.length === 0) errors.engagement_id = "No engagement was named.";
  if (template_id.length === 0) errors.template_id = "No notice was named.";
  if (!Number.isInteger(seq) || seq < 1) errors.seq = "No installment was named.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { engagement_id, template_id, seq } };
}

/* ------------------------------------------------------------------ */
/* Reference allocation                                                */
/* ------------------------------------------------------------------ */

const REFERENCE_PREFIX: Record<EngagementKind, string> = {
  plan: "VMP",
  service: "SVC",
  lot: "LOT",
  product: "PRD",
};

/** The next office reference for a kind ("VMP-2026-0003"), from the current count. */
export function nextReference(kind: EngagementKind, existing: number, year: number): string {
  return `${REFERENCE_PREFIX[kind]}-${year}-${String(existing + 1).padStart(4, "0")}`;
}
