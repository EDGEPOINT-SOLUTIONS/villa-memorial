/**
 * Villa's lot Purchase Application record — the buyer's structured capture that feeds the
 * Purchase Application + Agreement generator (`purchase-agreement.ts`).
 *
 * ⚠️ SHAPE NOT FROZEN. This type is INVENTED HERE for capture; no service contract names
 * it (nothing under `docs/08-delivery/contracts/` covers a purchase application or a
 * sale's financing terms). It is assembled from Villa's own papers — the 2026 combined
 * `Purchase Application Form.docx` and the 2025 standalone `Purchase Agreement.docx`,
 * clean copies of which live in `docs/07-client-villa/paper-forms/` — and the repo's
 * `FORMS_PLAN.md` gap 2 (P1) is the agreed plan to build it. It waits on a dev freeze of
 * the application/sale record shape before any service stores or posts against it; live
 * gateway wiring is out of scope until then (see `lib/api-client/purchase-applications.ts`
 * for the honest live-mode answer). Field names here are capture vocabulary, chosen to
 * mirror the paper's cells, NOT a frozen wire contract.
 *
 * BUSINESS-RULE BOUNDARY: this module captures and displays. It never prices, never
 * derives MCF/VAT/total from each other, never computes amortization amounts, and never
 * invents payment/posting rules — each amount is exactly what the counter wrote on the
 * paper, and nothing here validates it against the price list (that is dev/finance
 * domain). The only derived value is a calendar computation Villa's own form asks for
 * (Age next to Date of Birth), which is not money math.
 */
import type { Lot } from "@/lib/api-client/property";
import { resolveTerms, type TermsRevision } from "@/lib/contracts/villa-terms";

/** Buyer's civil status, in the paper's words (2026 form's Civil Status cell). */
export type CivilStatus =
  | "single"
  | "married"
  | "widowed"
  | "legally_separated"
  | "other";

/** Buyer's gender, per the form's Gender cell. */
export type Gender = "male" | "female";

/** The four instalment cadences both papers print. */
export type ModeOfPayment = "annual" | "semi_annual" | "quarterly" | "monthly";

export const MODES_OF_PAYMENT: ReadonlyArray<{ value: ModeOfPayment; label: string }> = [
  { value: "annual", label: "Annual" },
  { value: "semi_annual", label: "Semi" },
  { value: "quarterly", label: "Quarterly" },
  { value: "monthly", label: "Monthly" },
];

/** The 2026 combined form's own marker line next to Mode of Payment. */
export type IntermentInclusion = "included" | "not_included";

/**
 * One beneficiary row. The 2026 paper prints three columns — Beneficiaries, Age,
 * Relationship — with two blank rows; both paper revisions' beneficiary column is a
 * name, an age as written, and a relationship as written.
 */
export type Beneficiary = {
  name: string;
  age: number | null;
  relationship: string;
};

export type PurchaseApplication = {
  /** The lot being applied for; also the natural join key until a contract freezes ids. */
  lot_id: string;
  /** Platform lot snapshot for display (not authoritative — the lot record is). */
  lot_number: string;
  /** ISO date this application is dated. Resolves the terms revision that governs it. */
  application_date: string;

  /* ------------------------- Buyer (2026 paper, unioned with the 2025 agreement's buyer table) ------------------------- */
  last_name: string;
  first_name: string;
  middle_name: string;
  date_of_birth: string | null;
  civil_status: CivilStatus | null;
  gender: Gender | null;
  religion: string | null;
  /** The 2025 standalone agreement's buyer table has Citizenship; the 2026 merged form does not. */
  citizenship: string | null;
  contact_number: string | null;
  email: string | null;
  tin: string | null;
  gsis_sss_number: string | null;
  alternative_contact_number: string | null;
  facebook_account: string | null;
  address: string | null;
  occupation: string | null;
  employer: string | null;
  employer_address: string | null;
  employer_telephone: string | null;

  beneficiaries: Beneficiary[];

  /* ------------------------- Lot selection & financing (as written on the paper) ------------------------- */
  /**
   * Villa's own classification word (Mausoleum / Garden Niche / Lawn Lot … / Condo-type…).
   * Which list is valid depends on the governing terms revision — the two papers list
   * different products. The platform's frozen `Lot.type` (individual|family|estate)
   * cannot express Villa's vocabulary, so the application carries the Villa word.
   */
  classification: string | null;
  /** Amounts are the counter's written figures in integer minor units (the money rule). */
  basic_price_cents: number | null;
  total_contract_price_cents: number | null;
  mcf_cents: number | null;
  vat_cents: number | null;
  mode_of_payment: ModeOfPayment | null;
  /** The paper's blank reads "______ years/months": one duration and its unit. */
  amortization_value: number | null;
  amortization_unit: "years" | "months" | null;
  /** 2026 combined form row; blank/absent for a 2025-agreement sale. */
  interment_funeral_bundle_inclusion: IntermentInclusion | null;
  /** 2025 standalone agreement row ("Others/ Insurance"); absent on the 2026 merged form. */
  others_insurance: string | null;

  /* ------------------------- Consent & signatures ------------------------- */
  /** Data-privacy consent (the 2026 form's consent paragraph; recorded, printed in a later documents version — the frozen agreement template has no block after the notarial part). */
  dpa_consent: boolean;
  dpa_consented_at: string | null;
  /** 2026 form's co-signatory: "Signature over Printed Name of Sales Agent". */
  sales_agent_name: string | null;

  created_at: string;
  updated_at: string;
};

/** The body a capture form sends to the BFF — the nullable/editable half of the record. */
export type PurchaseApplicationInput = Omit<
  PurchaseApplication,
  "lot_id" | "lot_number" | "created_at" | "updated_at"
>;

/** The 2026 combined form's consent paragraph, word for word from the paper. */
export const DPA_CONSENT_STATEMENT =
  "I hereby consent to the collection, use and disclosure by the SELLER of all the " +
  "personal information I have given hereunder, including sketch of my residence, for the " +
  "purpose of processing the Purchase Agreement and all other documents related hereto. " +
  "Buyer hereby agrees to take whatever additional actions and execute whatever additional " +
  "documents Seller may in its reasonable judgment deem necessary or advisable in order to " +
  "carry out or effect one or more of the obligations or restrictions imposed on Buyer " +
  "pursuant to the express provisions of this Purchase.";

/* ------------------------- shape helpers ------------------------- */

/** The buyer's full name, "First Middle Last", from the paper's three name cells. */
export function buyerFullName(application: {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
}): string {
  return [application.first_name, application.middle_name, application.last_name]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

export function emptyBeneficiary(): Beneficiary {
  return { name: "", age: null, relationship: "" };
}

/** Blank capture state for a lot, prefilled from the platform record where it is safe. */
export function emptyPurchaseApplicationInput(lot: Lot): PurchaseApplicationInput {
  return {
    application_date: new Date().toISOString().slice(0, 10),
    last_name: "",
    first_name: "",
    middle_name: "",
    date_of_birth: null,
    civil_status: null,
    gender: null,
    religion: null,
    citizenship: null,
    contact_number: null,
    email: null,
    tin: null,
    gsis_sss_number: null,
    alternative_contact_number: null,
    facebook_account: null,
    address: null,
    occupation: null,
    employer: null,
    employer_address: null,
    employer_telephone: null,
    beneficiaries: [],
    classification: null,
    // The lot record's price is the counter's starting figure; staff may correct it.
    basic_price_cents: lot.price_cents,
    total_contract_price_cents: null,
    mcf_cents: null,
    vat_cents: null,
    mode_of_payment: null,
    amortization_value: null,
    amortization_unit: null,
    interment_funeral_bundle_inclusion: null,
    others_insurance: null,
    dpa_consent: false,
    dpa_consented_at: null,
    sales_agent_name: null,
  };
}

/** Calendar age on a given date — the form's Age cell next to Date of Birth. Not money. */
export function ageOn(dateOfBirth: string | null, onDate: string): number | null {
  if (!dateOfBirth || !onDate) return null;
  const birth = new Date(`${dateOfBirth.slice(0, 10)}T00:00:00Z`);
  const day = new Date(`${onDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(day.getTime())) return null;
  let years = day.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    day.getUTCMonth() < birth.getUTCMonth() ||
    (day.getUTCMonth() === birth.getUTCMonth() && day.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) years -= 1;
  return years >= 0 ? years : null;
}

/** The terms revision that governs a NEW application dated `applicationDate`. */
export function purchaseTerms(applicationDate: string): TermsRevision {
  return resolveTerms("lot_purchase", applicationDate);
}

/* ------------------------- normalising form input ------------------------- */

const text = (raw: Record<string, unknown>, key: string): string =>
  typeof raw[key] === "string" ? (raw[key] as string).trim() : "";

/**
 * Pesos as a counter types them ("32,000" / "1500.50") → integer minor units.
 * Returns null for an absent field and throws for something that is not money.
 */
export function pesosInputToCents(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().replace(/,/g, "");
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0 || !/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error(`${trimmed} is not a valid peso amount (at most two decimals)`);
  }
  return Math.round(value * 100);
}

const MONEY_FIELDS = [
  "basic_price_cents",
  "total_contract_price_cents",
  "mcf_cents",
  "vat_cents",
] as const;

const TEXT_FIELDS: Array<keyof PurchaseApplicationInput> = [
  "application_date",
  "last_name",
  "first_name",
  "middle_name",
  "religion",
  "citizenship",
  "contact_number",
  "email",
  "tin",
  "gsis_sss_number",
  "alternative_contact_number",
  "facebook_account",
  "address",
  "occupation",
  "employer",
  "employer_address",
  "employer_telephone",
  "classification",
  "others_insurance",
  "sales_agent_name",
];

/**
 * Turns a browser form body into the application payload the BFF stores. Untouched fields
 * arrive as "" — dropped to null rather than forwarded (same rule as the service
 * contract's `intake-input.ts`). Throws on malformed money; the capture form and the BFF
 * both call this so a legal artifact never carries a hand-typed junk figure.
 */
export function purchaseApplicationFromForm(body: unknown): PurchaseApplicationInput {
  const raw = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const key of TEXT_FIELDS) {
    const value = text(raw, key);
    if (value !== "") out[key] = value;
  }
  for (const key of MONEY_FIELDS) {
    const cents = pesosInputToCents(raw[key]);
    if (cents !== null) out[key] = cents;
  }
  if (typeof raw.date_of_birth === "string" && raw.date_of_birth.trim() !== "") {
    out.date_of_birth = raw.date_of_birth.trim();
  }
  if (raw.civil_status === "single" || raw.civil_status === "married" || raw.civil_status === "widowed" || raw.civil_status === "legally_separated" || raw.civil_status === "other") {
    out.civil_status = raw.civil_status;
  }
  if (raw.gender === "male" || raw.gender === "female") {
    out.gender = raw.gender;
  }
  if (raw.mode_of_payment === "annual" || raw.mode_of_payment === "semi_annual" || raw.mode_of_payment === "quarterly" || raw.mode_of_payment === "monthly") {
    out.mode_of_payment = raw.mode_of_payment;
  }
  if (raw.interment_funeral_bundle_inclusion === "included" || raw.interment_funeral_bundle_inclusion === "not_included") {
    out.interment_funeral_bundle_inclusion = raw.interment_funeral_bundle_inclusion;
  }
  const amortizationUnitRaw =
    typeof raw.amortization_unit === "string"
      ? raw.amortization_unit.trim()
      : (raw.amortization_unit as unknown);
  const amortizationValueRaw = raw.amortization_value;
  const amortizationUnitPresent =
    typeof amortizationUnitRaw === "string"
      ? amortizationUnitRaw !== ""
      : amortizationUnitRaw !== undefined && amortizationUnitRaw !== null;
  const amortizationValuePresent =
    typeof amortizationValueRaw === "string"
      ? amortizationValueRaw.trim() !== ""
      : amortizationValueRaw !== undefined && amortizationValueRaw !== null;
  if (amortizationUnitPresent || amortizationValuePresent) {
    if (amortizationUnitRaw !== "years" && amortizationUnitRaw !== "months") {
      throw new Error("amortization unit is required when an amortization term is entered (years or months)");
    }
    const value =
      typeof amortizationValueRaw === "number"
        ? amortizationValueRaw
        : Number(
            typeof amortizationValueRaw === "string"
              ? amortizationValueRaw.trim()
              : (amortizationValueRaw as unknown as string),
          );
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error("amortization value must be a positive whole number of years or months");
    }
    out.amortization_value = value;
    out.amortization_unit = amortizationUnitRaw;
  }
  if (typeof raw.dpa_consent === "boolean") {
    out.dpa_consent = raw.dpa_consent;
    if (raw.dpa_consent) out.dpa_consented_at = new Date().toISOString();
  }

  // Beneficiary rows: only complete-ish rows survive; a row with no name is an untouched blank.
  const beneficiaries: Beneficiary[] = [];
  if (Array.isArray(raw.beneficiaries)) {
    for (const entry of raw.beneficiaries) {
      if (typeof entry !== "object" || entry === null) continue;
      const row = entry as Record<string, unknown>;
      const name = text(row, "name");
      if (name === "") continue;
      const ageRaw = row.age;
      let age: number | null = null;
      if (typeof ageRaw === "number") {
        if (!Number.isInteger(ageRaw) || ageRaw < 0) {
          throw new Error(`${String(ageRaw)} is not a valid beneficiary age (a whole number of years)`);
        }
        age = ageRaw;
      } else if (typeof ageRaw === "string") {
        const trimmed = ageRaw.trim();
        if (trimmed !== "") {
          const parsed = Number(trimmed);
          if (!Number.isInteger(parsed) || parsed < 0) {
            throw new Error(`${trimmed} is not a valid beneficiary age (a whole number of years)`);
          }
          age = parsed;
        }
      } else if (ageRaw !== undefined && ageRaw !== null) {
        throw new Error(`${String(ageRaw)} is not a valid beneficiary age (a whole number of years)`);
      }
      beneficiaries.push({
        name,
        age,
        relationship: text(row, "relationship"),
      });
    }
  }
  out.beneficiaries = beneficiaries;

  return out as PurchaseApplicationInput;
}

/** Validation the capture screen (and the BFF, defensively) applies before saving. */
export function validatePurchaseApplication(
  input: PurchaseApplicationInput,
  terms: TermsRevision,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (buyerFullName(input).length === 0) {
    errors.name = "Enter the buyer's first and last name — the lot is reserved in that name.";
  }
  if (!input.application_date) {
    errors.application_date = "Date the application.";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(input.application_date)) {
    errors.application_date = "Not a valid date.";
  }
  if (input.classification && !(terms.classifications ?? []).includes(input.classification)) {
    errors.classification = `Not one of the classifications on the ${terms.title} (${terms.version}).`;
  }
  if (input.amortization_unit && input.amortization_value == null) {
    errors.amortization = "Enter the number of years or months.";
  }
  if (!input.dpa_consent) {
    errors.dpa_consent = "The buyer's data-privacy consent is required to record the application.";
  }
  return errors;
}
