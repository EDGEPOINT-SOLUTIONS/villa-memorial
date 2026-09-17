/**
 * Typed client for the app-authored PLAN RATES + LOT PRICES seam (2026 sheets).
 *
 * ⚠ CONTRACT STATUS (stated loudly, per AGENTS.md): there is NO frozen
 * catalog-pricing read or write contract. The client's 2026 plan tables and lot
 * price list are published CONTENT recorded in
 * `lib/fixtures/commerce/pricing.json`; the public pages and both staff screens
 * render it through this client. A service that owns prices will one day serve
 *   GET  <catalog-pricing>/api/v1/price_lists/:code        (read)
 *   PUT  <catalog-pricing>/api/v1/price_lists/:code        (write)
 * or their frozen equivalents — the PR records that ask. Until then:
 *
 *   - READ — `loadPricingDocument()` never touches upstream: the recorded sheet
 *     content is the display authority in every run mode, so public pages always
 *     have the client's real numbers (the seed is not a placeholder).
 *   - WRITE — fixture mode persists through the durable store
 *     (`lib/api-client/pricing-store.ts`). LIVE MODE REFUSES with 503
 *     (`PRICING_ADMIN_NOT_WIRED`) rather than pretending a contract exists.
 *
 * Validation never lives here: `lib/pricing-model.ts` is the authority and a
 * violating edit is a 422 with a plain explanation.
 */
import { ApiError } from "@/lib/api-client/api-error";
import {
  loadFixturePricingDocument,
  saveFixtureLotPricing,
  saveFixturePlanPricing,
  seedPricingQuestions,
} from "@/lib/api-client/pricing-store";
import {
  validateLotCategoriesDraft,
  validatePlanPricingDraft,
  type PricingDocument,
  type PricingQuestion,
} from "@/lib/pricing-model";

/** The live-mode refusal shown to staff and recorded in the PR's contract ask. */
export const PRICING_ADMIN_NOT_WIRED =
  "plan-rate and lot-price administration is fixture-mode only: no frozen catalog-pricing " +
  "write contract exists yet — the 2026 sheets are app-recorded content, and an upstream " +
  "pricing endpoint must freeze before live edits can be stored.";

/**
 * Live mode is the same switch commerce uses (COMMERCE_BASE_URL → the
 * catalog-pricing service behind the gateway). It only affects WRITES: the
 * price sheets are content, and no pricing READ endpoint exists either.
 */
export function pricingLiveModeEnabled(): boolean {
  return (process.env.COMMERCE_BASE_URL ?? "").length > 0;
}

function refuseWhenLive(): void {
  if (pricingLiveModeEnabled()) throw new ApiError(PRICING_ADMIN_NOT_WIRED, 503);
}

/** The current plan rates + lot prices every public surface renders. */
export async function loadPricingDocument(): Promise<PricingDocument> {
  return loadFixturePricingDocument();
}

/** The read-only client questions carried beside the prices (admin screens). */
export async function listPricingQuestions(): Promise<PricingQuestion[]> {
  return seedPricingQuestions();
}

/**
 * Saves the plan-rates slice (`{ regular: PaymentRow[], senior: PaymentRow[] }`).
 * The draft is validated first, so an invariant-breaking edit is a 422 naming
 * the offending cell — never a written-then-broken document.
 */
export async function savePlanPricing(raw: unknown, actor: string): Promise<PricingDocument> {
  refuseWhenLive();
  const verdict = validatePlanPricingDraft(raw);
  if (!verdict.ok) throw new ApiError(verdict.error, 422);
  return saveFixturePlanPricing(verdict.value, actor);
}

/** Saves the lot-prices slice (the four families with their product rows). */
export async function saveLotPricing(raw: unknown, actor: string): Promise<PricingDocument> {
  refuseWhenLive();
  const verdict = validateLotCategoriesDraft(raw);
  if (!verdict.ok) throw new ApiError(verdict.error, 422);
  return saveFixtureLotPricing(verdict.value, actor);
}
