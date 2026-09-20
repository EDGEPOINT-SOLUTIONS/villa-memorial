/**
 * The Tenant settings screen's vocabulary (S32) — pure, client + server.
 *
 * ONE HOME FOR THE RULES THE PRODUCT REALLY APPLIES. The screen's job is to
 * show the office how this park is configured: the identity the app publishes,
 * the business rules in force, what is configured versus still waiting, and
 * what only the platform can change. Every rule row below reads its value from
 * the module that enforces it — a filing deadline from `guarantee-instruments`,
 * the booking window from `chapel-booking`, the plan/lot terms from the pricing
 * model — so the screen can never print a rule the product does not run.
 *
 * NO SETTING IS INVENTED HERE. The dynamic half of the table (what the recorded
 * documents actually carry, and their edit state) is composed by
 * `lib/api-client/tenant-settings.ts` from the landing content, the pricing
 * document and the catalogue store. `tenancy-config` — the service that would
 * own module flags and tenant configuration — is not in this build, and the
 * screen says so in one line.
 */
import { MAX_CHAPEL_DAYS, MIN_CHAPEL_DAYS } from "@/lib/chapel-booking";
import { INSTRUMENT_FILING_DAYS } from "@/lib/guarantee-instruments";
import {
  LOT_AMORTIZATION_ROUNDING,
  LOT_TERMS,
  PLAN_TERM_DEFS,
  type LotTerm,
} from "@/lib/pricing-model";
import { PLAN_TIERS } from "@/lib/villa-pricing";

/* ------------------------------- the words ------------------------------- */

/** The missing service, in two short sentences (one per paragraph). */
export const SETTINGS_NOT_WIRED_TITLE = "Tenant settings read-only";
export const SETTINGS_NOT_WIRED =
  "The tenancy-config service that would own tenant settings and module flags is not in this build.";
export const SETTINGS_NOT_WIRED_NOTE =
  "The values below are read from the records the product actually applies; nothing here can be changed.";

/* ---------------------------- the business rules -------------------------- */

export type BusinessRule = {
  key: string;
  /** What the rule governs. */
  rule: string;
  /** What the product actually applies, in the module's own figure. */
  value: string;
  /** Which sheet, contract or module the rule comes from. */
  source: string;
};

/** The lot terms as the 2026 lot sheet's columns read (the pricing model's ids). */
const LOT_TERM_LABELS: Record<LotTerm, string> = {
  selling: "Selling price",
  annual: "Annual",
  semi: "Semi-Annual",
  quarter: "Quarterly",
  monthly: "Monthly",
};

export const BUSINESS_RULES: ReadonlyArray<BusinessRule> = [
  {
    key: "guarantee-filing",
    rule: "Guarantee papers filed",
    value: `Within ${INSTRUMENT_FILING_DAYS} days of the contract date`,
    source: "Funeral Service Contract, clause 2",
  },
  {
    key: "chapel-stay",
    rule: "Chapel stay length",
    value: `${MIN_CHAPEL_DAYS}–${MAX_CHAPEL_DAYS} days`,
    source: "The 2026 chapel sheets",
  },
  {
    key: "plan-terms",
    rule: "Plan payment terms",
    value: PLAN_TERM_DEFS.map((term) => term.label).join(" · "),
    source: "The 2026 plan sheets",
  },
  {
    key: "plan-tiers",
    rule: "Plan tiers",
    value: PLAN_TIERS.map((tier) => tier.name).join(" · "),
    source: "The 2026 package sheet",
  },
  {
    key: "lot-terms",
    rule: "Lot payment terms",
    value: LOT_TERMS.map((term) => LOT_TERM_LABELS[term]).join(" · "),
    source: "The 2026 lot sheet",
  },
  {
    key: "lot-rounding",
    rule: "Lot amortization rounding",
    value: `Within ₱${LOT_AMORTIZATION_ROUNDING} of annual × 6`,
    source: "The 2026 lot sheet's own rounding",
  },
  {
    key: "senior-rates",
    rule: "Senior-citizen rates",
    value: "Where the 2026 sheet prints a senior column",
    source: "Casket · chapel · plan sheets",
  },
  {
    key: "package-embalming",
    rule: "Embalming in a package",
    value: "Included, with no fixed day count",
    source: "The 2026 package sheet",
  },
];

/* --------------------------- what the platform owns ----------------------- */

export type PlatformOnlyItem = {
  key: string;
  item: string;
  owner: string;
};

export const PLATFORM_ONLY: ReadonlyArray<PlatformOnlyItem> = [
  {
    key: "account",
    item: "This park's account — creating, suspending or closing it",
    owner: "Platform operator",
  },
  {
    key: "subscription",
    item: "Subscription and trial dates",
    owner: "Platform operator",
  },
  {
    key: "modules",
    item: "Which modules are switched on (the A–J registry)",
    owner: "tenancy-config, platform-side",
  },
];

/* ------------------------------ configuration ----------------------------- */

export type ConfigurationState = "configured" | "placeholder" | "waiting" | "not_readable";

export const CONFIGURATION_STATE_LABEL: Record<ConfigurationState, string> = {
  configured: "Configured",
  placeholder: "Placeholder",
  waiting: "Waiting",
  not_readable: "Not readable",
};

export const CONFIGURATION_STATE_TONE: Record<
  ConfigurationState,
  "success" | "warning" | "neutral"
> = {
  configured: "success",
  placeholder: "warning",
  waiting: "warning",
  not_readable: "neutral",
};

export type ConfigurationRow = {
  key: string;
  setting: string;
  state: ConfigurationState;
  /** Why it is in that state — the recorded fact, never an opinion. */
  basis: string;
};
