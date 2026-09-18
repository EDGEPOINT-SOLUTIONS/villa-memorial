/**
 * The Smart Service Builder's CATALOG — the server-side join that turns the
 * client's 2026 sheets into the plain, serialisable document the configurator
 * renders (F-05).
 *
 * WHY A SEPARATE MODULE: the builder needs a price for every option it offers,
 * and the browser needs them as plain data (the page is a client component so
 * the running total can update). This is the ONE place that reads the sheets and
 * the pricing store and shapes them for that; nothing here invents a rule and
 * nothing here is typed by hand:
 *
 *   · caskets          ← CASKET_MODELS (sheet A "For package", 24 models) +
 *                        CASKET_INCLUSIONS (sheet III's per-family row);
 *   · preparation      ← EMBALMING_RATES (3–9 days) and
 *                        EMBALMING_PER_DAY_BEYOND_9 (the sheet's ">9 +1,500/day");
 *   · a-la-carte fees  ← ALACARTE_SERVICE_FEES (+ the sheet's own total);
 *   · chapel           ← CHAPEL_RATES (sheet III's 3–9 day schedule, regular and
 *                        the senior column exactly as printed);
 *   · plans            ← the CURRENT pricing store document through `planRateOf`
 *                        — an office edit on /staff/plans is what a visitor sees;
 *   · what the sheets do NOT price ← WITHDRAWN_CATALOG_ITEMS (the four items the
 *                        platform seed carried with no client source). They are
 *                        published as "ask the office" labels, never as figures.
 *
 * Amounts are integer minor units (centavos) throughout, like every catalogue
 * figure in the app, and every peso figure from the sheets is multiplied once,
 * here.
 *
 * ⚠ CONTRACT STATUS (stated loudly): the live rules engine the PRD's configurator
 * assumes does not exist. This module is the app-authored stand-in built on the
 * client's published figures — a display estimate, never a quotation, and the
 * view says so. When a pricing/availability service freezes, this join is the
 * seam that changes; the view does not.
 */
import {
  ALACARTE_SERVICE_FEES,
  ALACARTE_SERVICE_TOTAL,
  CASKET_COLLECTIONS,
  CASKET_INCLUSION_COLUMNS,
  CASKET_INCLUSIONS,
  CASKET_MODELS,
  CHAPEL_NOTES,
  CHAPEL_RATES,
  COFFIN_TIER_NOTE,
  EMBALMING_PER_DAY_BEYOND_9,
  EMBALMING_RATES,
  PLAN_TIERS,
  VMP_NOTES,
  type CasketFamily,
} from "@/lib/villa-pricing";
import { PLAN_TERM_DEFS, planRateOf, type PricingDocument } from "@/lib/pricing-model";
import { WITHDRAWN_CATALOG_ITEMS } from "@/lib/catalog-sources";
import type {
  BuilderCasketOption,
  BuilderCatalog,
  BuilderChapelOption,
  BuilderPlanRate,
} from "@/lib/service-builder";

const cents = (pesos: number): number => Math.round(pesos * 100);

/** Sheet III's inclusion row for a family, as the chip labels the view prints. */
function includesFor(family: CasketFamily): string[] {
  const row = CASKET_INCLUSIONS.find((entry) => entry.family === family);
  if (!row) return [];
  return CASKET_INCLUSION_COLUMNS.filter((column) => row[column.key]).map(
    (column) => column.label,
  );
}

/** The 24 sheet models, in the sheet's own order, with their two price columns. */
function caskets(): BuilderCasketOption[] {
  return CASKET_MODELS.map((model) => ({
    model: model.model,
    collection: model.collection,
    family: model.family,
    priceCents: cents(model.srp),
    seniorPriceCents: cents(model.seniorPrice),
    includes: includesFor(model.family),
  }));
}

/** Sheet III's two chapel classes, each with the printed 3–9 day schedule. */
function chapels(): BuilderChapelOption[] {
  return [
    { id: "common", label: "Common chapel" },
    { id: "private", label: "Private chapel" },
  ].map(({ id, label }) => {
    const stays = CHAPEL_RATES.map((row) => ({
      days: row.days,
      regularCents: cents(id === "common" ? row.common.regular : row.private.regular),
      seniorCents: cents(id === "common" ? row.common.senior : row.private.senior),
    }));
    const perDay = CHAPEL_RATES[0]
      ? cents(id === "common" ? CHAPEL_RATES[0].common.ratePerDay : CHAPEL_RATES[0].private.ratePerDay)
      : 0;
    return { id, label, perDayCents: perDay, stays };
  });
}

/** Every tier × term cell of both plan tables, in the sheet's order. */
function planRates(pricing: PricingDocument): BuilderPlanRate[] {
  const rates: BuilderPlanRate[] = [];
  for (const tier of PLAN_TIERS) {
    for (const term of PLAN_TERM_DEFS) {
      rates.push({
        tier: tier.id,
        term: term.id,
        regularCents: cents(planRateOf(pricing.plans, tier.id, term.id, false)),
        seniorCents: cents(planRateOf(pricing.plans, tier.id, term.id, true)),
      });
    }
  }
  return rates;
}

/**
 * The builder's catalog from the CURRENT pricing document (plan rates +
 * lot prices) and the sheet constants. Pure: no IO, no caching — the caller
 * reads the store per request, exactly like /plans and /lots/price-list-2026.
 */
export function builderCatalog(pricing: PricingDocument): BuilderCatalog {
  const allCaskets = caskets();
  const collections = CASKET_COLLECTIONS.filter((collection) =>
    allCaskets.some((casket) => casket.collection === collection),
  );
  return {
    caskets: allCaskets,
    collections,
    embalming: EMBALMING_RATES.map((row) => ({ days: row.days, priceCents: cents(row.amount) })),
    embalmingExtraDayCents: cents(EMBALMING_PER_DAY_BEYOND_9),
    services: ALACARTE_SERVICE_FEES.map((fee) => ({
      label: fee.service,
      priceCents: cents(fee.amount),
    })),
    servicesSheetTotalCents: cents(ALACARTE_SERVICE_TOTAL),
    chapels: chapels(),
    planTiers: PLAN_TIERS.map((tier) => ({ id: tier.id, name: tier.name })),
    planTerms: PLAN_TERM_DEFS.map((term) => ({
      id: term.id,
      label: term.label,
      per: term.per,
    })),
    planRates: planRates(pricing),
    arrangedByOffice: WITHDRAWN_CATALOG_ITEMS.map((item) => item.name),
    substitutionNote: COFFIN_TIER_NOTE,
    chapelScopeNote: CHAPEL_NOTES.scope,
    chapelMiscFeeNote: CHAPEL_NOTES.miscFee,
    planNote: VMP_NOTES.contestability,
  };
}
