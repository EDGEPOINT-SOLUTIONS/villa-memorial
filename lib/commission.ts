/**
 * Commission engine vocabulary — the ONE home for the words the staff
 * Commission screen (captain checklist F-12, 2026-09-18) and the agent
 * Sales & commissions page use to describe how a sale would become a
 * commission.
 *
 * ⚠ NO RATE HAS BEEN GIVEN AND NONE MAY BE HARD-CODED HERE. The client has not
 * fixed commission rules or rates (`docs/07-client-villa/open-questions.md` —
 * "Commission rules and rates"), so every screen shows the shape with amounts
 * blank and marked "Not configured". A zero would read like a real figure.
 * The PRD's engine is rules-based and configurable by Villa
 * (`docs/04-modules/finance-billing.md` §Commissions, blueprint §34): the office
 * chooses the basis, the period, the counted sale states and the targets. This
 * module carries only that shape. When the office answers, the rate arrives
 * through a contract; the screens change data, not design.
 *
 * The seven bases are pinned to the recorded agent workspace
 * (`lib/fixtures/agent/workspace.json`) by
 * `tests/fixture-contract/commission.test.ts`, so the staff engine and the
 * agent statement can never describe different rules.
 */
import type { AdminOrder } from "@/lib/api-client/order-store";

/* ------------------------------- the bases ------------------------------- */

export type CommissionBasis = {
  key: string;
  label: string;
  detail: string;
};

/** The seven configurable bases the PRD names (finance-billing.md §Commissions). */
export const COMMISSION_BASES: readonly CommissionBasis[] = [
  { key: "fixed_percent", label: "Fixed %", detail: "A percentage of the sale value." },
  { key: "fixed_peso", label: "Fixed ₱", detail: "A flat amount per sale or per product." },
  { key: "tiered", label: "Tiered", detail: "A rate that rises with volume or with the product tier." },
  { key: "volume", label: "Volume", detail: "A bonus once a period's sales pass a threshold." },
  { key: "milestone", label: "Milestone", detail: "A reward for a specific achievement, e.g. first Gold plan sold." },
  { key: "split", label: "Split", detail: "Two or more agents share one sale; each share appears on its own line." },
  { key: "multi_agent", label: "Multi-agent", detail: "Referral, coordinator and closer each carry a share." },
];

/* ------------------------------- the states ------------------------------ */

export type CommissionState = {
  key: string;
  label: string;
  detail: string;
};

/**
 * The forward path every line walks before money moves. Nothing skips a step.
 * (The agent portal's recorded statement uses the first two plus
 * `COMMISSION_REVERSAL`; the fixture-contract test keeps the two in step.)
 */
export const COMMISSION_STATES: readonly CommissionState[] = [
  { key: "pending_approval", label: "Pending approval", detail: "Waiting on the office to verify the papers." },
  { key: "approved", label: "Approved", detail: "Ready for the payout cycle once rates are configured." },
  { key: "scheduled", label: "Scheduled", detail: "Placed in a payout run with a date." },
  { key: "paid", label: "Paid", detail: "The statement shows the payment date, method and reference." },
];

/** A cancellation or refund is its own line — never a silent deduction. */
export const COMMISSION_REVERSAL: CommissionState = {
  key: "reversed",
  label: "Reversed",
  detail:
    "A cancelled or refunded sale appears as its own line with the contract reference — a cancellation never quietly reduces the next payout.",
};

/* ---------------------------- the capabilities --------------------------- */

export type CommissionCapability = {
  key: string;
  label: string;
  detail: string;
};

/**
 * The rest of the engine the office switches on, transcribed from
 * finance-billing.md §Commissions — the config surface this screen will show
 * once the rules exist. Nothing here implies a rule is already chosen.
 */
export const COMMISSION_CAPABILITIES: readonly CommissionCapability[] = [
  { key: "registration", label: "Agent registration & types", detail: "Who may earn, and whether they are an internal staff agent or an external one." },
  { key: "territory", label: "Territory", detail: "Which area or book of business an agent owns." },
  { key: "performance", label: "Performance tracking", detail: "Plans, lots and services sold — per agent, per period." },
  { key: "referral", label: "Lead assignment & referral", detail: "Which lead, referral or coordinator touched a sale." },
  { key: "attribution", label: "Attribution", detail: "Which agent — or which split of agents — gets credit for a sale." },
  { key: "rates", label: "Rates & rules", detail: "The seven bases above; the office switches on the ones it uses." },
  { key: "approval", label: "Approval", detail: "The office verifies the sale's papers before the line is approved." },
  { key: "statements", label: "Statements", detail: "One statement per agent per period, one line per sale." },
  { key: "payouts", label: "Payment tracking", detail: "When and how each statement was paid." },
  { key: "reversals", label: "Clawbacks & reversals", detail: "A cancelled service or refunded sale becomes its own line, with the contract reference." },
  { key: "ranking", label: "Ranking analytics", detail: "How agents compare over a period." },
];

/* -------------------------------- the blanks ----------------------------- */

/** The one marker every blank commission figure carries. */
export const COMMISSION_NOT_CONFIGURED = "Not configured";

/** The blank amount: an em dash after the peso sign — never a zero. */
export const COMMISSION_BLANK_AMOUNT = "₱—";

/* ----------------------------- the sale pool ----------------------------- */

export type CommissionPool = {
  /** Orders that have happened: confirmed or fulfilled by the office. */
  sales: AdminOrder[];
  /** Placed at checkout but not yet confirmed by the office. */
  awaiting: AdminOrder[];
  /** Cancelled orders — shown, never hidden; a reversal line once the engine runs. */
  cancelled: AdminOrder[];
  /** The real sale value of `sales`, in integer minor units, grouped by currency. */
  saleValueByCurrency: Record<string, number>;
};

/**
 * Splits the recorded orders into the pool a commission would be calculated
 * from and the two states that currently would not count. Which states the
 * office actually counts is NOT decided here — that is one of the unconfigured
 * rules, and the screen says so. No rate is applied: the pool carries the real
 * sale values and nothing else.
 */
export function commissionPool(orders: readonly AdminOrder[]): CommissionPool {
  const sales = orders.filter(
    (o) => o.lifecycle_status === "confirmed" || o.lifecycle_status === "fulfilled",
  );
  const awaiting = orders.filter((o) => o.lifecycle_status === "new");
  const cancelled = orders.filter((o) => o.lifecycle_status === "cancelled");

  const saleValueByCurrency: Record<string, number> = {};
  for (const { order } of sales) {
    saleValueByCurrency[order.currency] = (saleValueByCurrency[order.currency] ?? 0) + order.total_cents;
  }

  return { sales, awaiting, cancelled, saleValueByCurrency };
}
