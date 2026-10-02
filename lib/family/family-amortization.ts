/**
 * The family's amortization view — the plan's recorded schedule and the held
 * lot's recorded six-year sheet figures, derived in ONE place.
 *
 * WHY THIS MODULE EXISTS. The captain's 2026-10-02 brief: “the family portal
 * should have amortization also” — a family should see what they are paying and
 * where they stand, at a glance. The plan's instalments and the lot's amortization
 * were already RECORDED (the snapshot's `payment_schedule`; the client's 2026 lot
 * sheet), but no family screen showed them together. This module turns those
 * records into the rows the portal renders. It reuses the ONE amortization model
 * (`lib/monthly-pricing.ts`) and the ONE due-date derivation
 * (`lib/payment-schedule.ts`) rather than inventing a second arithmetic:
 *
 *   · PLAN — the recorded payment mode (monthly … annual) and the plan's own
 *     recorded term, the periodic amount, what has been paid, the remaining
 *     balance, the remaining periods and the next due date. Every due date and
 *     state is DERIVED by `lib/payment-schedule.ts`; every amount is summed from
 *     the recorded integer minor units and only FORMATTED here (repo money rule:
 *     a display string is never parsed). When the record carries no schedule the
 *     page renders the honest “not recorded” state — never a plausible one.
 *   · LOT — the client's own six-year amortization for the lot's park section
 *     (regular and senior monthly figures plus the sheet's selling total),
 *     resolved through `lib/catalog-sources.ts` → `lib/monthly-pricing.ts`, the
 *     same binding the public lot surfaces use. A section the sheet does not
 *     price returns null and the page says so instead of guessing.
 *
 * Pure module: no IO, no React, `now` passed in. The view
 * (`components/family/family-amortization.tsx`) renders what these helpers return.
 */
import type { FamilyLotRecord, FamilyPlanSummary } from "@/lib/api-client/family";
import {
  LOT_TERM_LABEL,
  LOT_TERM_MONTHS,
  lotFamilyMonthlyPrices,
  type LotFamilyMonthly,
} from "@/lib/monthly-pricing";
import { LOT_FAMILY_BY_SECTION } from "@/lib/catalog-sources";
import type { LotCategory } from "@/lib/pricing-model";
import {
  longDueDate,
  nextPaymentDue,
  paymentAmountLabel,
  paymentDueStateLabel,
  paymentDues,
  type PaymentDueState,
  type PaymentSchedule,
} from "@/lib/payment-schedule";

/** One period in the family's plan schedule. */
export type AmortizationPeriod = {
  key: string;
  seq: number;
  of: number;
  /** “Period 1 of 4” — the row's own label. */
  periodLabel: string;
  /** “27 July 2026” — the DERIVED due date. */
  dueLabel: string;
  /** The recorded amount for the period, formatted. */
  amount: string;
  /** The family's word for where the period stands. */
  status: string;
  statusKey: PaymentDueState;
  /** What is still owed on the period, formatted. */
  remaining: string;
  paid: boolean;
};

/** The plan's amortization as the family reads it. */
export type PlanAmortization = {
  reference: string;
  /** The recorded mode in the sheet's own word (“Monthly” … “Annual”). */
  modeLabel: string;
  /** The plan's recorded term, or null when the record does not carry one. */
  termLabel: string | null;
  /** “Each payment” when every period is equal, else “Next payment” (or “Last payment” once settled). */
  amountLabel: string;
  amount: string;
  periodsTotal: number;
  periodsPaid: number;
  periodsRemaining: number;
  /** Total contract value, summed from the recorded periods, formatted. */
  totalLabel: string;
  paidLabel: string;
  remainingLabel: string;
  nextDueLabel: string | null;
  rows: AmortizationPeriod[];
};

/** The held lot's recorded six-year amortization, both printed columns. */
export type LotAmortization = {
  /** The sheet's own family name for the lot's section. */
  family: string;
  product: string;
  area: number;
  termLabel: string;
  termMonths: number;
  regularMonthly: string;
  seniorMonthly: string;
  totalLabel: string;
  /** The client document the figures come from, named for the reader. */
  sourceLabel: string;
};

const MODE_LABELS: Record<PaymentSchedule["term"], string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi: "Semi-annual",
  annual: "Annual",
};

/**
 * The plan's amortization from its recorded schedule. Returns null when the
 * record carries no readable schedule — the caller renders the honest state.
 */
export function planAmortization(
  schedule: PaymentSchedule | undefined,
  plan: FamilyPlanSummary,
  now: Date,
): PlanAmortization | null {
  if (!schedule || schedule.installments.length === 0) return null;

  const dues = paymentDues(schedule, now);
  const total = dues.reduce((sum, due) => sum + due.amount_cents, 0);
  const paid = dues.reduce((sum, due) => sum + due.paid_cents, 0);
  const remaining = dues.reduce((sum, due) => sum + due.due_cents, 0);

  const open = dues.filter((due) => due.due_cents > 0);
  const nextDue = nextPaymentDue(schedule);
  const uniform = dues.every((due) => due.amount_cents === dues[0]?.amount_cents);
  // A settled plan has no “next” payment, so a varying plan names its last one
  // instead of printing “Next payment ₱0”.
  const amountLabel = uniform ? "Each payment" : open.length > 0 ? "Next payment" : "Last payment";
  const amountCents = uniform
    ? dues[0]?.amount_cents ?? 0
    : open.length > 0
      ? open[0]?.due_cents ?? 0
      : dues[dues.length - 1]?.amount_cents ?? 0;

  return {
    reference: schedule.reference,
    modeLabel: MODE_LABELS[schedule.term],
    termLabel: plan.term.trim() !== "" ? plan.term.trim() : null,
    amountLabel,
    amount: paymentAmountLabel(amountCents),
    periodsTotal: dues.length,
    periodsPaid: dues.filter((due) => due.due_cents <= 0).length,
    periodsRemaining: open.length,
    totalLabel: paymentAmountLabel(total),
    paidLabel: paymentAmountLabel(paid),
    remainingLabel: paymentAmountLabel(remaining),
    nextDueLabel: nextDue ? longDueDate(nextDue.due_on) : null,
    rows: dues.map((due) => ({
      key: `${due.reference}-${due.seq}`,
      seq: due.seq,
      of: dues.length,
      periodLabel: `Period ${due.seq} of ${dues.length}`,
      dueLabel: longDueDate(due.due_on),
      amount: paymentAmountLabel(due.amount_cents),
      status: paymentDueStateLabel(due.state),
      statusKey: due.state,
      remaining: paymentAmountLabel(due.due_cents),
      paid: due.due_cents <= 0,
    })),
  };
}

/**
 * The held lot's recorded six-year amortization, resolved from the client's 2026
 * lot sheet through the lot's park section (the same section↔family binding the
 * public lot surfaces use). Returns null when the sheet does not price the
 * section — the caller renders the honest state.
 */
export function lotAmortization(
  lot: Pick<FamilyLotRecord, "section">,
  categories: ReadonlyArray<LotCategory>,
): LotAmortization | null {
  const section = lot.section.trim().toUpperCase();
  if (section === "") return null;
  const family = LOT_FAMILY_BY_SECTION[section];
  if (!family) return null;
  const prices: LotFamilyMonthly | null = lotFamilyMonthlyPrices(categories, family);
  if (!prices) return null;

  return {
    family,
    product: prices.product,
    area: prices.area,
    termLabel: LOT_TERM_LABEL,
    termMonths: LOT_TERM_MONTHS,
    regularMonthly: paymentAmountLabel(prices.regular.monthly * 100),
    seniorMonthly: paymentAmountLabel(prices.senior.monthly * 100),
    totalLabel:
      prices.regular.total !== null ? paymentAmountLabel(prices.regular.total * 100) : "—",
    sourceLabel: `PRICE LIST FOR 2026 · LOT ONLY · ${family}`,
  };
}
