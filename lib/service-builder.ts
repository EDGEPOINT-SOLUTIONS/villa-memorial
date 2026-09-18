/**
 * Smart Service Builder (F-05) — the ONE rules home for the public configurator:
 * what a step can be, what a choice costs, and how the running total is built.
 *
 * WHY IT EXISTS / WHAT IT IS NOT: the PRD's configurator calls for a live
 * pricing-and-availability engine, and no such service exists (the platform's
 * rule engine is deferred platform scope). So nothing here is computed live —
 * every figure is the CLIENT'S OWN published 2026 figure, read from
 * `lib/villa-pricing.ts` (the single transcription home for the sheets) and the
 * pricing store document for the plan tables, and *resolved* into a plain
 * `BuilderCatalog` by `lib/service-builder-catalog.ts` before it reaches the
 * browser. This module never states an amount: it adds up what it is handed, so
 * a view can never publish a price the sheets do not carry.
 *
 * WHAT IT IS: one pure function per question a family answers, plus ONE total.
 *  · `builderEstimate()` — the arrangement as priced lines, the lines a plan
 *    already covers, the steps still to answer and the office-quoted items,
 *    with a one-time total that never mixes in the plan's monthly amount;
 *  · `builderRequestPrefill()` — the existing `/contact` request seam, carrying
 *    what the visitor saw so the office receives the same arrangement.
 *
 * HONEST-STATE RULES (the withdrawn-items precedent):
 *  · an item the sheets do not price is NOT in the catalog and cannot be added;
 *  · a line with no figure is never invented — it is a `pending` step ("still to
 *    choose") or an `officeQuote` ("the office quotes this"), both of which
 *    print with no amount;
 *  · the senior column is applied ONLY where the sheet prints one (casket,
 *    chapel, plan) — a senior flag never discounts an a-la-carte fee;
 *  · the plan is an instalment product: its amount is reported separately and
 *    never added to the one-time total.
 */
import { formatMinorUnits } from "@/lib/money";
import { buildRequestHref, type RequestPrefill } from "@/lib/public-forms/request-prefill";

/** The configurator's public route (nav, sitemap and the request echo share it). */
export const BUILDER_PATH = "/builder";

/** What the request the family hands over is called on the contact form. */
export const BUILDER_REQUEST_ITEM = "Smart Service Builder estimate";

/** The one-line honesty note the estimate panel and the request both carry. */
export const BUILDER_ESTIMATE_NOTE =
  "An estimate — the office confirms the final figures.";

/** The second line: nothing on this screen is an order or a hold. */
export const BUILDER_NO_RESERVATION_NOTE =
  "Nothing here is reserved or ordered.";

/* ------------------------------- the catalog ------------------------------ */

export type BuilderCasketOption = {
  /** The model name exactly as the sheet prints it ("White Rose Half"). */
  model: string;
  /** The sheet's collection header. */
  collection: string;
  /** The sheet's casket family — selects the inclusion row. */
  family: string;
  /** Regular price, integer minor units (centavos). */
  priceCents: number;
  /** The senior-citizen price the sheet prints for this model. */
  seniorPriceCents: number;
  /** What this family's casket comes with (sheet III's inclusion row). */
  includes: ReadonlyArray<string>;
};

export type BuilderEmbalmingDay = { days: number; priceCents: number };

export type BuilderServiceOption = {
  /** The sheet's own row label ("Retrieval", "Viewing equipment"). */
  label: string;
  priceCents: number;
};

export type BuilderChapelStay = {
  days: number;
  regularCents: number;
  /** The sheet's senior column for that stay (its own 3–9 day totals). */
  seniorCents: number;
};

export type BuilderChapelOption = {
  id: string;
  label: string;
  /** The class's own per-day figure (row 1 of the stay schedule). */
  perDayCents: number;
  stays: ReadonlyArray<BuilderChapelStay>;
};

export type BuilderPlanTerm = { id: string; label: string; per: string };
export type BuilderPlanTier = { id: string; name: string };

export type BuilderPlanRate = {
  tier: string;
  term: string;
  regularCents: number;
  seniorCents: number;
};

export type BuilderCatalog = {
  caskets: ReadonlyArray<BuilderCasketOption>;
  /** The sheet's collection headers that still carry a model, in sheet order. */
  collections: ReadonlyArray<string>;
  embalming: ReadonlyArray<BuilderEmbalmingDay>;
  /** The sheet's ">9 +1,500/day" line; null when the catalogue lacks it. */
  embalmingExtraDayCents: number | null;
  /** The five a-la-carte fees, in the sheet's order. */
  services: ReadonlyArray<BuilderServiceOption>;
  /** The sheet's own unlabelled total for all five fees. */
  servicesSheetTotalCents: number;
  chapels: ReadonlyArray<BuilderChapelOption>;
  planTiers: ReadonlyArray<BuilderPlanTier>;
  planTerms: ReadonlyArray<BuilderPlanTerm>;
  planRates: ReadonlyArray<BuilderPlanRate>;
  /** What the 2026 sheets do NOT price (the office arranges it) — never a figure. */
  arrangedByOffice: ReadonlyArray<string>;
  /** The casket sheet's own substitution line. */
  substitutionNote: string;
  /** Sheet III's own scope line for its chapel table. */
  chapelScopeNote: string;
  /** Sheet III's own ₱1,000 miscellaneous-fee note. */
  chapelMiscFeeNote: string;
  /** The plan sheet's own inception/contestability line. */
  planNote: string;
};

/* ------------------------------ the selection ----------------------------- */

export type BuilderSelection = {
  /** The sheet's senior-citizen column where it prints one (casket, chapel, plan). */
  senior: boolean;
  /** What the family already has — each one keeps its items out of the total. */
  hasPlan: boolean;
  hasCasket: boolean;
  hasLot: boolean;
  /** The arrangement is already with the office: the builder stops pricing. */
  alreadyArranged: boolean;
  casketModel: string | null;
  /** Days of preparation at need (the sheet prices 3–9, then +1,500/day). */
  embalmingDays: number | null;
  /** The a-la-carte fees the family wants (sheet row labels). */
  services: ReadonlyArray<string>;
  chapelId: string | null;
  chapelDays: number;
  planTier: string | null;
  planTerm: string;
};

/** The shortest and longest stay the chapel sheet prices as a row. */
export const CHAPEL_MIN_DAYS = 3;
export const CHAPEL_MAX_DAYS = 9;
/** The shortest preparation the embalming sheet prices as a row. */
export const EMBALMING_MIN_DAYS = 3;
/** A sanity bound for "more than nine days" — the ladder is per extra day. */
export const EMBALMING_MAX_DAYS = 30;

export const INITIAL_SELECTION: BuilderSelection = {
  senior: false,
  hasPlan: false,
  hasCasket: false,
  hasLot: false,
  alreadyArranged: false,
  casketModel: null,
  embalmingDays: null,
  services: [],
  chapelId: null,
  chapelDays: CHAPEL_MIN_DAYS,
  planTier: null,
  planTerm: "monthly",
};

/* -------------------------------- the estimate ---------------------------- */

export type BuilderLine = {
  id: string;
  /** The step the line came from (the estimate groups by it). */
  group: "casket" | "preparation" | "services" | "chapel";
  label: string;
  /** The plain sub-label the step chose ("5 days", the collection). */
  detail?: string;
  /** Integer minor units; null when the line is covered (never a zero stand-in). */
  amountCents: number | null;
  /** The amount came from the sheet's senior column. */
  seniorRate?: boolean;
};

export type BuilderMonthly = {
  label: string;
  amountCents: number;
  per: string;
  seniorRate: boolean;
};

export type BuilderEstimate = {
  /** The one-time lines — this is exactly what `totalCents` sums. */
  lines: ReadonlyArray<BuilderLine>;
  /** Lines the family's plan already covers: shown, never counted. */
  covered: ReadonlyArray<BuilderLine>;
  /** What the family is keeping out of the total ("already yours"). */
  owned: ReadonlyArray<string>;
  /** Steps still to answer (labels only — a pending step has no figure). */
  pending: ReadonlyArray<string>;
  /** Items the office quotes rather than the product (labels, no figures). */
  officeQuotes: ReadonlyArray<string>;
  /**
   * The plan is an instalment product: its amount is reported here and is NOT
   * part of `totalCents` (one-time items only).
   */
  monthly: BuilderMonthly | null;
  /** True while the plan covers the arrangement (owned or chosen). */
  planApplies: boolean;
  totalCents: number;
};

/** The stay the family's chapel days select (clamped to the sheet's rows). */
export function chapelStay(
  chapel: BuilderChapelOption,
  days: number,
): BuilderChapelStay | null {
  if (chapel.stays.length === 0) return null;
  const wanted = Math.min(Math.max(Math.round(days), CHAPEL_MIN_DAYS), CHAPEL_MAX_DAYS);
  return chapel.stays.find((s) => s.days === wanted) ?? chapel.stays[0];
}

/**
 * The preparation figure for a day count: the sheet's 3–9 day ladder, and its
 * own ">9 +1,500/day" line beyond it. Fewer than three days is not priced by
 * the sheet (the office arranges it) → null, never an invented row.
 */
export function embalmingPriceCents(
  catalog: BuilderCatalog,
  days: number,
): number | null {
  const ladder = catalog.embalming;
  if (ladder.length === 0) return null;
  const whole = Math.round(days);
  const row = ladder.find((entry) => entry.days === whole);
  if (row) return row.priceCents;
  const longest = ladder[ladder.length - 1];
  if (whole <= longest.days) return null;
  if (catalog.embalmingExtraDayCents === null) return null;
  return longest.priceCents + (whole - longest.days) * catalog.embalmingExtraDayCents;
}

/** The plan rate for a tier × term, or null when the selection is incomplete. */
export function planRateCents(
  catalog: BuilderCatalog,
  tier: string | null,
  term: string,
  senior: boolean,
): number | null {
  if (!tier) return null;
  const rate = catalog.planRates.find((r) => r.tier === tier && r.term === term);
  if (!rate) return null;
  return senior ? rate.seniorCents : rate.regularCents;
}

function planTierName(catalog: BuilderCatalog, tier: string): string {
  return catalog.planTiers.find((t) => t.id === tier)?.name ?? tier;
}

function planTermOf(catalog: BuilderCatalog, term: string): BuilderPlanTerm | undefined {
  return catalog.planTerms.find((t) => t.id === term);
}

/** The model option a chosen name resolves to (the sheet's own spelling wins). */
export function casketOptionOf(
  catalog: BuilderCatalog,
  model: string | null,
): BuilderCasketOption | null {
  if (!model) return null;
  return catalog.caskets.find((c) => c.model === model) ?? null;
}

/**
 * The arrangement, priced. Every amount is read from the catalog; the function
 * only decides which lines count. A line the plan covers is reported under
 * `covered` with no amount, so the total never double-counts a paid plan.
 */
export function builderEstimate(
  catalog: BuilderCatalog,
  selection: BuilderSelection,
): BuilderEstimate {
  const lines: BuilderLine[] = [];
  const covered: BuilderLine[] = [];
  const owned: string[] = [];
  const pending: string[] = [];
  const officeQuotes: string[] = [];

  const chosenPlan = selection.planTier !== null;
  const planApplies = selection.hasPlan || chosenPlan;

  if (selection.hasPlan) owned.push("Your plan");
  if (selection.hasCasket) owned.push("Your casket");
  if (selection.hasLot) owned.push("Your burial lot");

  /* ------------------------------- the casket ----------------------------- */
  const casket = casketOptionOf(catalog, selection.casketModel);
  if (selection.hasCasket) {
    // Already theirs: nothing to price and nothing to choose.
  } else if (planApplies) {
    covered.push({
      id: "casket",
      group: "casket",
      label: casket ? `${casket.model} casket` : "Casket",
      detail: "The package's casket follows the plan tier",
      amountCents: null,
    });
  } else if (casket) {
    lines.push({
      id: "casket",
      group: "casket",
      label: `${casket.model} casket`,
      detail: casket.collection,
      amountCents: selection.senior ? casket.seniorPriceCents : casket.priceCents,
      seniorRate: selection.senior,
    });
  } else {
    pending.push("Casket");
  }

  /* --------------------------- preparation days --------------------------- */
  const days = selection.embalmingDays;
  const embalmingCents = days === null ? null : embalmingPriceCents(catalog, days);
  const preparationDetail =
    days === null ? undefined : `${days} ${days === 1 ? "day" : "days"}`;
  if (planApplies) {
    covered.push({
      id: "preparation",
      group: "preparation",
      label: "Preparation & casketing",
      detail: preparationDetail,
      amountCents: null,
    });
  } else if (days !== null && embalmingCents !== null) {
    lines.push({
      id: "preparation",
      group: "preparation",
      label: "Preparation & casketing",
      detail: preparationDetail,
      amountCents: embalmingCents,
    });
  } else {
    pending.push("Preparation days");
  }

  /* --------------------------- the service fees --------------------------- */
  const chosenServices = catalog.services.filter((s) => selection.services.includes(s.label));
  for (const service of chosenServices) {
    const line: BuilderLine = {
      id: `service:${service.label}`,
      group: "services",
      label: service.label,
      amountCents: service.priceCents,
    };
    if (planApplies) covered.push({ ...line, amountCents: null });
    else lines.push(line);
  }

  /* --------------------------------- chapel ------------------------------- */
  const chapel = catalog.chapels.find((c) => c.id === selection.chapelId) ?? null;
  if (chapel) {
    const stay = chapelStay(chapel, selection.chapelDays);
    if (stay) {
      lines.push({
        id: "chapel",
        group: "chapel",
        label: `${chapel.label} — chapel use`,
        detail: `${stay.days} days`,
        amountCents: selection.senior ? stay.seniorCents : stay.regularCents,
        seniorRate: selection.senior,
      });
    }
  } else {
    pending.push("Chapel");
  }

  /* ------------------------------ the lot + the office --------------------- */
  if (!selection.hasLot) {
    officeQuotes.push("Burial lot — the office quotes it per plot");
  }

  /* ----------------------------- the plan --------------------------------- */
  let monthly: BuilderMonthly | null = null;
  if (chosenPlan) {
    const amount = planRateCents(catalog, selection.planTier, selection.planTerm, selection.senior);
    const term = planTermOf(catalog, selection.planTerm);
    if (amount !== null && term) {
      monthly = {
        label: `${planTierName(catalog, selection.planTier as string)} plan · ${term.label}`,
        amountCents: amount,
        per: term.per,
        seniorRate: selection.senior,
      };
    }
  }

  const totalCents = lines.reduce((sum, line) => sum + (line.amountCents ?? 0), 0);

  return {
    lines,
    covered,
    owned,
    pending,
    officeQuotes,
    monthly,
    planApplies,
    totalCents,
  };
}

/* ------------------------------- the request ------------------------------ */

const MAX_NOTE = 200; // lib/public-forms/request-prefill.ts clamps to the same length.

/** The honesty line every note ends with — kept even when the list is trimmed. */
const NOTE_SUFFIX = " An estimate, not a quote.";
const NOTE_PREFIX = "Builder estimate: ";

/**
 * The one-line summary the office reads on the contact form: WHAT was built, in
 * the order the builder asked, then the honesty line. A compact list — the
 * request seam's note field is 200 characters, so a long arrangement trims the
 * LIST and never the "estimate, not a quote" line. `builderRequestNote` is the
 * only builder string a family never sees; it is what the office receives.
 */
export function builderRequestNote(
  catalog: BuilderCatalog,
  selection: BuilderSelection,
  estimate: BuilderEstimate = builderEstimate(catalog, selection),
): string {
  const parts: string[] = [];
  if (selection.hasCasket) parts.push("casket already arranged");
  else if (estimate.planApplies) parts.push(casketOptionOf(catalog, selection.casketModel)?.model ?? "casket through the plan");
  else if (selection.casketModel) parts.push(`${selection.casketModel} casket`);

  if (selection.embalmingDays !== null) {
    parts.push(`preparation ${selection.embalmingDays} days`);
  }
  if (selection.services.length > 0) parts.push(selection.services.join(", "));
  const chapel = catalog.chapels.find((c) => c.id === selection.chapelId);
  if (chapel) parts.push(`${chapel.label} ${selection.chapelDays} days`);
  if (selection.hasLot) parts.push("lot already arranged");
  if (selection.planTier) {
    const term = planTermOf(catalog, selection.planTerm);
    parts.push(`${planTierName(catalog, selection.planTier)} plan ${term?.label ?? ""}`.trim());
  } else if (selection.hasPlan) {
    parts.push("plan already in place");
  }
  if (selection.senior) parts.push("senior-citizen rates");
  if (parts.length === 0) parts.push("no choices made yet");

  const budget = Math.max(0, MAX_NOTE - NOTE_PREFIX.length - NOTE_SUFFIX.length - 1);
  let body = parts.join("; ");
  if (body.length > budget) body = `${body.slice(0, budget - 1).trimEnd()}…`;
  return `${NOTE_PREFIX}${body}.${NOTE_SUFFIX}`;
}

/**
 * The request the estimate's action opens: the existing `/contact` capture,
 * carrying the arrangement and the figure the visitor saw. Omitted when the
 * arrangement is already with the office (there is nothing to hand over).
 */
export function builderRequestPrefill(
  catalog: BuilderCatalog,
  selection: BuilderSelection,
): RequestPrefill {
  const estimate = builderEstimate(catalog, selection);
  return {
    item: BUILDER_REQUEST_ITEM,
    price: estimate.totalCents > 0 ? formatMinorUnits(estimate.totalCents) : undefined,
    note: builderRequestNote(catalog, selection, estimate),
  };
}

/** The request link (built here so the view and its tests share one shape). */
export function builderRequestHref(
  catalog: BuilderCatalog,
  selection: BuilderSelection,
): string {
  return buildRequestHref(builderRequestPrefill(catalog, selection));
}
