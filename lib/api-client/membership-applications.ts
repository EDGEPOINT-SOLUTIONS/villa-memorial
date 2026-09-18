/**
 * App-facing client for membership applications (Villa Memorial Plan — FORMS_PLAN gap 4 / F-18).
 *
 * ⚠️ NO FROZEN CONTRACT EXISTS — and the honest state is the feature, not an accident.
 * Nothing under `docs/08-delivery/contracts/` names a membership / COC record; the
 * underwriter is a pre-need partner (Eternal Plans, Inc.) and the signed membership paper is
 * not archived in this project. So:
 *
 *   - READ/WRITE (fixture mode, the default: no `COMMERCE_BASE_URL`): the durable fixture
 *     store (`lib/api-client/membership-store.ts`) folds the recorded seed with an
 *     append-only journal, the same pattern as the catalogue/pricing/orders stores.
 *   - LIVE MODE: answers an honest 503 (`MEMBERSHIP_ADMIN_NOT_WIRED`) instead of dressing a
 *     demo store up as a partner integration. No COC issuance, no underwriting, no pre-need
 *     partner API is implemented anywhere — those are platform and client matters.
 *
 * THE RATE IS READ, NEVER TYPED: recording resolves the published tier × term × rate-class
 * figure from the CURRENT pricing document (`loadPricingDocument` → `planRateOf`) and stores
 * that exact amount on the record. The form can never post an amount.
 */
import { ApiError } from "@/lib/api-client/api-error";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import {
  getMembershipApplication as getStoredApplication,
  listMembershipApplications as listStoredApplications,
  recordMembershipApplication as recordStoredApplication,
  type MembershipRecordDraft,
} from "@/lib/api-client/membership-store";
import {
  membershipApplicationFromForm,
  membershipRateCents,
  validateMembershipApplication,
  type MembershipApplication,
} from "@/lib/contracts/membership-application";

export type { MembershipApplication } from "@/lib/contracts/membership-application";

/** The live-mode refusal shown to staff and recorded in the PR's contract ask. */
export const MEMBERSHIP_ADMIN_NOT_WIRED =
  "live membership applications are not wired: no membership/COC record contract is frozen " +
  "and the underwriter is a pre-need partner (Eternal Plans, Inc.). Fixture mode records " +
  "demo applications in the durable store; COC issuance stays with the office.";

/** Live mode is the same switch commerce uses (COMMERCE_BASE_URL → catalog-pricing/gateway). */
export function membershipLiveModeEnabled(): boolean {
  return (process.env.COMMERCE_BASE_URL ?? "").length > 0;
}

function refuseWhenLive(): void {
  if (membershipLiveModeEnabled()) throw new ApiError(MEMBERSHIP_ADMIN_NOT_WIRED, 503);
}

/** Every recorded application (seed + journal), newest last. */
export async function listMembershipApplications(): Promise<MembershipApplication[]> {
  refuseWhenLive();
  return listStoredApplications();
}

/** One application by id, or null when the office has not recorded it. */
export async function getMembershipApplication(
  id: number,
): Promise<MembershipApplication | null> {
  refuseWhenLive();
  return getStoredApplication(id);
}

/**
 * Records one application from a browser form body. Normalises and validates through
 * `lib/contracts/membership-application.ts` (the one rules home), reads the published rate
 * from the current pricing document, and persists durably. A refusal is an ApiError (422
 * with field errors, or 503 in live mode) — never a partial write.
 */
export async function recordMembershipApplication(
  body: unknown,
  actor: string | null,
): Promise<MembershipApplication> {
  refuseWhenLive();

  let input: ReturnType<typeof membershipApplicationFromForm>;
  try {
    input = membershipApplicationFromForm(body);
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : "invalid membership application",
      422,
    );
  }

  const fieldErrors = validateMembershipApplication(input);
  if (Object.keys(fieldErrors).length > 0) {
    throw new ApiError(Object.values(fieldErrors)[0], 422, fieldErrors);
  }

  const pricing = await loadPricingDocument();
  const draft: MembershipRecordDraft = {
    input,
    rate_cents: membershipRateCents(pricing.plans, input.plan_tier, input.plan_term, input.senior),
    pricing_updated_at: pricing.updated_at,
    recorded_by: actor,
  };
  return recordStoredApplication(draft);
}
