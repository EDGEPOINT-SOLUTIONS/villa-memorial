/**
 * Typed data access for the staff Commission screen (captain checklist F-12,
 * 2026-09-18).
 *
 * ⚠ NO COMMISSION SERVICE OR CONTRACT EXISTS. The PRD's commission engine is
 * deferred platform scope (`docs/04-modules/finance-billing.md` §Commissions,
 * blueprint §34) and the client has not fixed the rules or rates
 * (`docs/07-client-villa/open-questions.md` — "Commission rules and rates").
 * This client therefore reads the recorded engine state
 * (`lib/fixtures/finance/commission.json` — app-authored, with provenance) and
 * composes the only real half of a commission from records the app already
 * has: the durable ORDER store (`lib/api-client/order-store.ts`).
 *
 * NO RATE IS APPLIED HERE and no commission amount is ever derived — the pool
 * carries the real sale values, and every rate-derived figure the screen shows
 * is blank on purpose (`COMMISSION_BLANK_AMOUNT` + "Not configured"). The
 * engine's vocabulary (bases, states, capabilities) is imported from
 * `lib/commission.ts`, its one home. A malformed seed crashes loudly (500)
 * instead of surfacing half-shaped state.
 *
 * When the commission engine lands, this module gains a live branch, the
 * fixture's provenance header is replaced by contract references, and the rate
 * arrives through the contract — never hard-coded.
 */
import commissionFile from "@/lib/fixtures/finance/commission.json";
import { ApiError } from "@/lib/api-client/api-error";
import { listOrders, type AdminOrder } from "@/lib/api-client/commerce";
import {
  COMMISSION_BASES,
  COMMISSION_CAPABILITIES,
  COMMISSION_STATES,
  commissionPool,
  type CommissionBasis,
  type CommissionCapability,
  type CommissionPool,
  type CommissionState,
} from "@/lib/commission";

/** The engine is recorded app state; there is no live branch to claim. */
export function commissionLiveModeEnabled(): boolean {
  return false;
}

export type CommissionStatementPeriod = {
  /** null until the office names the cycle. */
  label: string | null;
  detail: string;
};

export type CommissionTargetState = {
  /** null until the office sets a target — never 0. */
  amount_cents: number | null;
  detail: string;
};

export type CommissionEngineState = {
  configured: boolean;
  placeholder_note: string;
  statement_period: CommissionStatementPeriod;
  target: CommissionTargetState;
};

export type CommissionAdmin = CommissionEngineState & {
  bases: readonly CommissionBasis[];
  states: readonly CommissionState[];
  capabilities: readonly CommissionCapability[];
  /** Every recorded order, newest first — the real half of a commission. */
  orders: AdminOrder[];
  /** Those orders split into what would count and what would not (no rate applied). */
  pool: CommissionPool;
};

/* -------------------------------- reader --------------------------------- */

function malformed(what: string): never {
  throw new ApiError(`malformed commission fixture: ${what}`, 500);
}

function record(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null) malformed(what);
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim().length === 0) malformed(what);
  return value;
}

function nullableString(value: unknown, what: string): string | null {
  if (value === null) return null;
  return requiredString(value, what);
}

function nullableInteger(value: unknown, what: string): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value)) malformed(what);
  return value;
}

/** Field-by-field reader; extra fields are ignored, missing ones fail loudly. */
export function readCommissionEngine(raw: unknown): CommissionEngineState {
  const root = record(raw, "commission file");
  if (typeof root.configured !== "boolean") malformed("configured");

  const periodRaw = record(root.statement_period, "statement_period");
  const period: CommissionStatementPeriod = {
    label: nullableString(periodRaw.label, "statement_period.label"),
    detail: requiredString(periodRaw.detail, "statement_period.detail"),
  };

  const targetRaw = record(root.target, "target");
  const target: CommissionTargetState = {
    amount_cents: nullableInteger(targetRaw.amount_cents, "target.amount_cents"),
    detail: requiredString(targetRaw.detail, "target.detail"),
  };

  return {
    configured: root.configured,
    placeholder_note: requiredString(root.placeholder_note, "placeholder_note"),
    statement_period: period,
    target,
  };
}

/** The screen's model: the recorded engine state plus the real sale pool. */
export async function loadCommissionAdmin(): Promise<CommissionAdmin> {
  const engine = readCommissionEngine(commissionFile as unknown);
  const orders = await listOrders();
  return {
    ...engine,
    bases: COMMISSION_BASES,
    states: COMMISSION_STATES,
    capabilities: COMMISSION_CAPABILITIES,
    orders,
    pool: commissionPool(orders),
  };
}
