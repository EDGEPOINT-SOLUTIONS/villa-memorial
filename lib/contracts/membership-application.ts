/**
 * Villa Memorial Plan — the membership application (the plan holder's enrolment folio).
 *
 * FORMS_PLAN.md gap 4 / front-end item F-18. The office enrols a plan holder: who joins,
 * who the plan protects, which branch, which tier × payment mode, and the declarations the
 * plan's paper carries.
 *
 * ⚠️ THE SHAPE IS NOT FROZEN, AND THE PAPER IS NOT IN THIS PROJECT — STATED LOUDLY.
 * No contract under `docs/08-delivery/contracts/` names a membership / COC record (the
 * underwriter is a pre-need partner domain, Eternal Plans, Inc.), and the signed
 * membership/COC paper is not archived here (`docs/07-client-villa/paper-forms/` holds the
 * service contract and the two lot-purchase papers only; that folder's rule is "the paper
 * wins"). So this module:
 *   - captures the enrolment in the plan's own published shape (holder · who is protected ·
 *     branch · tier × payment mode from the pricing store · declarations);
 *   - never reproduces a document the project has never seen — no COC number, no coverage
 *     start/end dates, no health questionnaire wording, no consent clause text;
 *   - names what waits: the paper's own field list and wording, the COC issuance, and a
 *     frozen contract/scope for a membership record.
 * If the office's paper later arrives, THIS is the module that changes, and the paper wins.
 *
 * BUSINESS-RULE BOUNDARY: this module captures and validates structure only. The rate is
 * READ from the pricing store (`planRateOf`) — never typed, never computed. Eligibility is
 * displayed (the plan already publishes "Age 1–60 / In good health / Resident of the
 * Philippines" and the senior terms); qualifying a member is the office's and the
 * underwriter's call, not this app's.
 */
import {
  PLAN_TERM_DEFS,
  planRateOf,
  type PlanPricing,
  type PlanTerm,
  type PlanTier,
} from "@/lib/pricing-model";
// One calendar helper, shared with the lot-purchase application (Age next to Date of birth);
// neither module duplicates the arithmetic.
import { ageOn } from "@/lib/contracts/purchase-application";

/* ------------------------------------------------------------------ */
/* The client's own relationship list                                  */
/* ------------------------------------------------------------------ */

/**
 * Who a membership may protect, in the client's own words — `current-state-forms.md` §5:
 * "plan holder + beneficiary (legal spouse/children of legal age/parents/siblings)".
 * The list is the paper's vocabulary; anything else is a client decision, not an app one.
 */
export const MEMBERSHIP_RELATIONSHIPS = [
  { value: "legal_spouse", label: "Legal spouse" },
  { value: "child_of_legal_age", label: "Child of legal age" },
  { value: "parent", label: "Parent" },
  { value: "sibling", label: "Sibling" },
] as const;

export type MembershipRelationship = (typeof MEMBERSHIP_RELATIONSHIPS)[number]["value"];

export const MEMBERSHIP_RELATIONSHIP_LABEL: Record<MembershipRelationship, string> = {
  legal_spouse: "Legal spouse",
  child_of_legal_age: "Child of legal age",
  parent: "Parent",
  sibling: "Sibling",
};

/* ------------------------------------------------------------------ */
/* Published plan facts the folio may state                            */
/* ------------------------------------------------------------------ */

/**
 * The plan's coverage line as the client's own records describe it — "Memorial Services
 * within Eternal Plan's network of mortuary partners" (`current-state-forms.md` §5;
 * "memorial services within network" in `client-profile.md`). One coverage type is
 * recorded, so the folio states it rather than offering an invented list.
 */
export const MEMBERSHIP_COVERAGE =
  "Memorial services within Eternal Plans, Inc.'s network of accredited mortuaries";

/**
 * The honest state, one short line, printed on the screen AND on the application paper:
 * the product has issued nothing — the office issues the real membership document.
 */
export const APPLICATION_NOT_A_COC_NOTE =
  "This is an application, not a certificate of coverage — the office issues the real " +
  "membership document (the COC).";

/**
 * The paper's authority, stated on the artifact: the app reproduces no document it has
 * never seen, and the terms the member signs live on the office's own paper.
 */
export const PAPER_AUTHORITY_NOTE =
  "The office's own signed membership paper and the issued certificate of coverage carry " +
  "the operative wording; this application records the enrolment details only.";

/**
 * The paper's health declarations are an insurance questionnaire this project has never
 * seen. The folio records the declaration the plan's published eligibility states ("In
 * good health") and says plainly what is not reproduced.
 */
export const HEALTH_DECLARATION_STATEMENT =
  "The plan holder declares they are in good health, as the plan's published eligibility requires.";

export const HEALTH_DECLARATION_WAITS =
  "The signed paper's own health questionnaire is not archived in this project — the office " +
  "attaches it, and its wording governs.";

/**
 * DPA consent: the paper's own clause (marketing/research purposes listed in
 * `current-state-forms.md` §5) is not archived either, so the folio records the holder's
 * consent to the application's purposes without authoring clause text.
 */
export const DPA_CONSENT_STATEMENT =
  "The plan holder consents to the office recording these details for this application and " +
  "for the membership paper's own purposes (marketing and research included).";

export const DPA_CONSENT_WAITS =
  "The paper's own data-privacy clause is not archived in this project — the office's signed " +
  "paper carries the wording that governs.";

/** The two rate classes the 2026 sheets publish, with their own eligibility lines. */
export const PLAN_RATE_CLASSES = [
  { value: "regular", label: "Regular", eligibility: "Ages 1–60" },
  { value: "senior", label: "Senior citizen", eligibility: "Ages 61–100 · no insurance benefit" },
] as const;

export type PlanRateClass = (typeof PLAN_RATE_CLASSES)[number]["value"];

/** A payment mode's own label / unit, read from the ONE term definition. */
export function planTermLabel(term: PlanTerm): string {
  return PLAN_TERM_DEFS.find((t) => t.id === term)?.label ?? term;
}

export function planTermPer(term: PlanTerm): string {
  return PLAN_TERM_DEFS.find((t) => t.id === term)?.per ?? "";
}

/* ------------------------------------------------------------------ */
/* The record                                                          */
/* ------------------------------------------------------------------ */

/** One person the plan protects — the paper's name + relationship cells. */
export type MembershipBeneficiary = {
  name: string;
  relationship: MembershipRelationship;
};

/**
 * A recorded membership application. The record's `id` is the app's own stable identity
 * (the fixture store allocates it); the official application/COC numbers are the office's
 * and are deliberately absent.
 */
export type MembershipApplication = {
  id: number;
  /** ISO date the application is dated. */
  application_date: string;

  /* The plan holder */
  last_name: string;
  first_name: string;
  middle_name: string;
  date_of_birth: string | null;
  contact_number: string | null;
  email: string | null;
  address: string | null;

  /* Who the plan protects */
  beneficiaries: MembershipBeneficiary[];

  /** Branch enrolling the plan, as the office records it (branch structure is an open client question). */
  branch: string;

  /* The plan chosen */
  plan_tier: PlanTier;
  plan_term: PlanTerm;
  senior: boolean;
  /** The published rate for that tier × term × rate class, recorded at save (minor units, never typed). */
  rate_cents: number;
  /** The pricing store's own `updated_at` when the rate was read (null = the recorded seed). */
  pricing_updated_at: string | null;

  /* The declarations the paper carries */
  health_declaration: boolean;
  dpa_consent: boolean;
  dpa_consented_at: string | null;

  /** The staff session that recorded the application (display name). */
  recorded_by: string | null;
  created_at: string;
};

/** What a save sends — every editable field; the store adds `id` + `created_at`. */
export type MembershipApplicationInput = Omit<
  MembershipApplication,
  "id" | "created_at" | "rate_cents" | "pricing_updated_at" | "recorded_by"
>;

/* ------------------------------------------------------------------ */
/* Shape helpers                                                       */
/* ------------------------------------------------------------------ */

/** The plan holder's full name, "First Middle Last". */
export function planHolderFullName(holder: {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
}): string {
  return [holder.first_name, holder.middle_name, holder.last_name]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

/**
 * The published rate for a tier × term × rate class, in integer minor units — READ from
 * the pricing document through the one accessor (`planRateOf`), never typed. The sheets
 * print whole pesos; the record keeps minor units like every other amount in the app.
 */
export function membershipRateCents(
  pricing: PlanPricing,
  tier: PlanTier,
  term: PlanTerm,
  senior: boolean,
): number {
  return planRateOf(pricing, tier, term, senior) * 100;
}

/** The plan holder's age on a date (the eligibility line next to Date of birth). */
export function planHolderAgeOn(dateOfBirth: string | null, onDate: string): number | null {
  return ageOn(dateOfBirth, onDate);
}

/** A blank capture for a new application, dated today. */
export function emptyMembershipApplicationInput(
  today: string,
): MembershipApplicationInput {
  return {
    application_date: today,
    last_name: "",
    first_name: "",
    middle_name: "",
    date_of_birth: null,
    contact_number: null,
    email: null,
    address: null,
    beneficiaries: [{ name: "", relationship: "legal_spouse" }],
    branch: "",
    plan_tier: "bronze1",
    plan_term: "monthly",
    senior: false,
    health_declaration: false,
    dpa_consent: false,
    dpa_consented_at: null,
  };
}

/* ------------------------------------------------------------------ */
/* Normalising form input                                              */
/* ------------------------------------------------------------------ */

const isRelationship = (value: unknown): value is MembershipRelationship =>
  MEMBERSHIP_RELATIONSHIPS.some((r) => r.value === value);

const TIERS: readonly PlanTier[] = ["bronze1", "bronze2", "silver1", "silver2", "gold"];
const TERMS: readonly PlanTerm[] = ["monthly", "quarterly", "semi", "annual"];

const text = (raw: Record<string, unknown>, key: string): string =>
  typeof raw[key] === "string" ? (raw[key] as string).trim() : "";

const nullable = (raw: Record<string, unknown>, key: string): string | null => {
  const value = text(raw, key);
  return value === "" ? null : value;
};

/**
 * Turns a browser form body into the application payload the store records. Untouched
 * fields arrive as "" and become null; junk that should never reach a legal artifact
 * (an unknown relationship, an unknown tier/term) throws instead of being stored.
 */
export function membershipApplicationFromForm(body: unknown): MembershipApplicationInput {
  const raw = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;

  const beneficiaries: MembershipBeneficiary[] = [];
  if (Array.isArray(raw.beneficiaries)) {
    for (const entry of raw.beneficiaries) {
      if (typeof entry !== "object" || entry === null) continue;
      const row = entry as Record<string, unknown>;
      const name = text(row, "name");
      if (name === "") continue;
      const relationship = row.relationship;
      if (!isRelationship(relationship)) {
        throw new Error(`${String(relationship)} is not one of the plan's recorded relationships`);
      }
      beneficiaries.push({ name, relationship });
    }
  }

  const tier = raw.plan_tier;
  if (typeof tier !== "string" || !(TIERS as readonly string[]).includes(tier)) {
    throw new Error(
      tier === undefined
        ? "a plan tier is required"
        : `${String(tier)} is not one of the plan's five tiers`,
    );
  }
  const term = raw.plan_term;
  if (typeof term !== "string" || !(TERMS as readonly string[]).includes(term)) {
    throw new Error(
      term === undefined
        ? "a payment mode is required"
        : `${String(term)} is not one of the plan's four payment modes`,
    );
  }

  return {
    application_date: text(raw, "application_date"),
    last_name: text(raw, "last_name"),
    first_name: text(raw, "first_name"),
    middle_name: text(raw, "middle_name"),
    date_of_birth: nullable(raw, "date_of_birth"),
    contact_number: nullable(raw, "contact_number"),
    email: nullable(raw, "email"),
    address: nullable(raw, "address"),
    beneficiaries,
    branch: text(raw, "branch"),
    plan_tier: tier as PlanTier,
    plan_term: term as PlanTerm,
    senior: raw.senior === true,
    health_declaration: raw.health_declaration === true,
    dpa_consent: raw.dpa_consent === true,
    dpa_consented_at: raw.dpa_consent === true ? new Date().toISOString() : null,
  };
}

/* ------------------------------------------------------------------ */
/* Validation — structure and the paper's required declarations         */
/* ------------------------------------------------------------------ */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * What must be true before the application is recorded. Structural only: eligibility
 * (age, health, residence) is published on screen and the office/underwriter qualifies
 * the member — this app never underwrites.
 */
export function validateMembershipApplication(
  input: MembershipApplicationInput,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (planHolderFullName(input).length === 0) {
    errors.name = "Enter the plan holder's name — the membership is recorded in that name.";
  }
  if (!input.application_date) {
    errors.application_date = "Date the application.";
  } else if (!ISO_DATE.test(input.application_date)) {
    errors.application_date = "Not a valid date.";
  }
  if (!input.date_of_birth) {
    errors.date_of_birth = "Record the plan holder's date of birth — the plan's rates depend on age.";
  } else if (!ISO_DATE.test(input.date_of_birth)) {
    errors.date_of_birth = "Not a valid date of birth.";
  }
  if (input.branch.trim() === "") {
    errors.branch = "Record the branch enrolling the plan.";
  }
  if (input.beneficiaries.length === 0) {
    errors.beneficiaries = "Name at least one beneficiary — the person the plan protects.";
  } else if (
    input.beneficiaries.some((b) => b.name.trim() === "" || !isRelationship(b.relationship))
  ) {
    errors.beneficiaries = "Each beneficiary row needs a name and one of the plan's relationships.";
  }
  if (!input.health_declaration) {
    errors.health_declaration = "The plan holder's good-health declaration is required to record the application.";
  }
  if (!input.dpa_consent) {
    errors.dpa_consent = "The plan holder's data-privacy consent is required to record the application.";
  }
  return errors;
}

/**
 * The same validation as a screen's readiness list, in field order — so the capture UI
 * and the store can never disagree about what is missing (one rules home).
 */
export function membershipApplicationIssues(input: MembershipApplicationInput): string[] {
  return Object.values(validateMembershipApplication(input));
}
