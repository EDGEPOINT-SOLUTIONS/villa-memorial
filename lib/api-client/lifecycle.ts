/**
 * App-facing client for the post-Prospect lifecycle (captain, 2026-10-03).
 *
 * ⚠️ NO FROZEN CONTRACT EXISTS — and the honest state is the feature, not an
 * accident. Nothing under `docs/08-delivery/contracts/` names a lifecycle /
 * engagement record (a plan membership, a booked service, a product sale or a
 * monthly-payable garden lot); CRM, billing and scheduling each own only part of
 * the picture. So:
 *
 *   - the reads fold the durable fixture store (`lib/api-client/lifecycle-store.ts`)
 *     with the recorded seed, the same pattern as the catalogue/pricing/orders
 *     stores, and derive every figure through the pure `lib/lifecycle.ts`;
 *   - the writes validate with the SAME pure intakes the forms run, so a field
 *     error is one sentence in both places;
 *   - there is no live branch to fake: `lifecycleLiveModeEnabled()` is always
 *     false and the module says so (the contract ask travels with the PR).
 *
 * ONE FACT, ONE SOURCE. The prospect links are read from the SAME agent journal
 * the Prospects screen and the agent portal fold (`lib/api-client/agent.ts`), so a
 * sold prospect with no recorded outcome is surfaced rather than lost, and an
 * outcome the office records is bound to the prospect it came from.
 */
import { ApiError } from "@/lib/api-client/api-error";
import { listAgentProspects } from "@/lib/api-client/agent";
import {
  getEngagement as getStoredEngagement,
  listEngagements as listStoredEngagements,
  listNoticeSends as listStoredNoticeSends,
  listNoticeTemplates as listStoredNoticeTemplates,
  listPayments as listStoredPayments,
  recordEngagement as recordStoredEngagement,
  recordNoticeSend as recordStoredNoticeSend,
  recordPayment as recordStoredPayment,
  saveNoticeTemplate as saveStoredNoticeTemplate,
} from "@/lib/api-client/lifecycle-store";
import {
  amortizationSchedule,
  engagementTotals,
  readEngagementIntake,
  readNoticeSendIntake,
  readNoticeTemplateIntake,
  readPaymentIntake,
  scheduledNotices,
  todayIso,
  type Engagement,
  type EngagementKind,
  type EngagementView,
  type NoticeSend,
  type NoticeTemplate,
  type Payment,
  type ScheduledNotice,
} from "@/lib/lifecycle";

export type {
  Engagement,
  EngagementKind,
  EngagementView,
  NoticeSend,
  NoticeTemplate,
  Payment,
  ScheduledNotice,
} from "@/lib/lifecycle";

/** The honest reason there is no live branch: no lifecycle contract is frozen. */
export const LIFECYCLE_NOT_WIRED =
  "live lifecycle records are not wired: no contract names a plan/service/lot/product " +
  "engagement, its amortization or its notices. Fixture mode records the office's outcomes " +
  "in the durable store.";

/**
 * There is no live lifecycle service to call, so this is fixture-only by
 * construction. The flag exists so a future live branch has one switch and the
 * screens can state the posture honestly.
 */
export function lifecycleLiveModeEnabled(): boolean {
  return false;
}

/** Every recorded outcome, newest first, with its folded money and payments. */
export async function listEngagementViews(now: Date): Promise<EngagementView[]> {
  const [engagements, payments] = await Promise.all([
    listStoredEngagements(),
    listStoredPayments(),
  ]);
  const byEngagement = groupPayments(payments);
  return engagements
    .map((engagement) => toView(engagement, byEngagement.get(engagement.id) ?? [], now))
    .sort((a, b) => b.engagement.recorded_at.localeCompare(a.engagement.recorded_at));
}

/** One outcome with its folded money, or null. */
export async function getEngagementView(id: string, now: Date): Promise<EngagementView | null> {
  const engagement = await getStoredEngagement(id);
  if (!engagement) return null;
  const payments = await listStoredPayments(id);
  return toView(engagement, payments, now);
}

/** One outcome's amortization schedule. */
export async function engagementSchedule(id: string, now: Date) {
  const view = await getEngagementView(id, now);
  if (!view) return null;
  return amortizationSchedule(view.engagement, view.payments, now);
}

/** Every modular notice template the office has written. */
export async function listNoticeTemplates(): Promise<NoticeTemplate[]> {
  return listStoredNoticeTemplates();
}

/** Every recorded notice hand-off. */
export async function listNoticeSends(): Promise<NoticeSend[]> {
  return listStoredNoticeSends();
}

export type EngagementDetail = EngagementView & {
  schedule: ReturnType<typeof amortizationSchedule>;
  notices: ScheduledNotice[];
  templates: NoticeTemplate[];
};

/** The member's accounting page's one read: money, schedule and scheduled notices. */
export async function getEngagementDetail(
  id: string,
  now: Date,
): Promise<EngagementDetail | null> {
  const view = await getEngagementView(id, now);
  if (!view) return null;
  const [templates, sends] = await Promise.all([listNoticeTemplates(), listNoticeSends()]);
  return {
    ...view,
    schedule: amortizationSchedule(view.engagement, view.payments, now),
    notices: scheduledNotices(view.engagement, view.payments, templates, sends, now),
    templates,
  };
}

/**
 * Sold prospects still waiting for an outcome on one register. Read from the SAME
 * agent journal the Prospects screen folds, so a sale the office has not yet
 * recorded as a plan/service/lot/product is surfaced, never silently dropped.
 */
export async function soldProspectsAwaiting(kind: EngagementKind): Promise<
  Array<{ id: string; name: string; phone: string; want: string }>
> {
  const wanted =
    kind === "plan"
      ? "plan"
      : kind === "service"
        ? "services"
        : kind === "lot"
          ? "lot"
          : null;
  if (wanted === null) return [];
  const [prospects, engagements] = await Promise.all([
    listAgentProspects(),
    listStoredEngagements(),
  ]);
  const recorded = new Set(
    engagements
      .filter((engagement) => engagement.prospect_id)
      .map((engagement) => engagement.prospect_id as string),
  );
  return prospects
    .filter(
      (prospect) =>
        prospect.stage === "sold" && prospect.interest === wanted && !recorded.has(prospect.id),
    )
    .map((prospect) => ({
      id: prospect.id,
      name: prospect.name,
      phone: prospect.phone,
      want: prospect.want,
    }));
}

/* ------------------------------ writes ---------------------------------- */

/**
 * Records one outcome from a browser form body. Runs the SAME intake the form
 * runs, then persists through the store. A refusal is an ApiError (422 with field
 * errors) — never a partial write.
 */
export async function recordEngagementOutcome(
  body: unknown,
  actor: string | null,
  now: Date = new Date(),
): Promise<Engagement> {
  const verdict = readEngagementIntake(body, { today: todayIso(now) });
  if (!verdict.ok) {
    throw new ApiError(Object.values(verdict.errors)[0] ?? "the outcome could not be saved", 422, verdict.errors);
  }
  return recordStoredEngagement(verdict.value, actor, now);
}

/**
 * Records one payment against a recorded outcome. The amount may not exceed the
 * outstanding balance: no credit is modeled (`lib/receivables.ts`), so an
 * overpayment is refused rather than silently floored.
 */
export async function recordEngagementPayment(
  body: unknown,
  actor: string | null,
  now: Date = new Date(),
): Promise<Payment> {
  const verdict = readPaymentIntake(body, { today: todayIso(now) });
  if (!verdict.ok) {
    throw new ApiError(Object.values(verdict.errors)[0] ?? "the payment could not be saved", 422, verdict.errors);
  }
  const view = await getEngagementView(verdict.value.engagement_id, now);
  if (!view) throw new ApiError("no such engagement", 404);
  if (verdict.value.amount_cents > view.totals.outstanding_cents) {
    throw new ApiError("The amount exceeds what is still owed on this record.", 422, {
      amount: "The amount exceeds what is still owed.",
    });
  }
  return recordStoredPayment(verdict.value, actor, now);
}

/** Saves one modular notice template from a browser form body. */
export async function saveNoticeTemplate(
  body: unknown,
  now: Date = new Date(),
): Promise<NoticeTemplate> {
  const verdict = readNoticeTemplateIntake(body);
  if (!verdict.ok) {
    throw new ApiError(Object.values(verdict.errors)[0] ?? "the notice could not be saved", 422, verdict.errors);
  }
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : undefined;
  return saveStoredNoticeTemplate({ ...verdict.value, id }, now);
}

/** Records that the office handed one scheduled notice off. */
export async function markNoticeSent(
  body: unknown,
  actor: string | null,
  now: Date = new Date(),
): Promise<NoticeSend> {
  const verdict = readNoticeSendIntake(body);
  if (!verdict.ok) {
    throw new ApiError(Object.values(verdict.errors)[0] ?? "the notice could not be recorded", 422, verdict.errors);
  }
  return recordStoredNoticeSend(verdict.value, actor, now);
}

/* ------------------------------ helpers --------------------------------- */

function groupPayments(payments: Payment[]): Map<string, Payment[]> {
  const byEngagement = new Map<string, Payment[]>();
  for (const payment of payments) {
    const list = byEngagement.get(payment.engagement_id) ?? [];
    list.push(payment);
    byEngagement.set(payment.engagement_id, list);
  }
  return byEngagement;
}

function toView(engagement: Engagement, payments: Payment[], now: Date): EngagementView {
  return {
    engagement,
    payments: [...payments].sort((a, b) => a.paid_on.localeCompare(b.paid_on) || a.recorded_at.localeCompare(b.recorded_at)),
    totals: engagementTotals(engagement, payments, now),
  };
}
