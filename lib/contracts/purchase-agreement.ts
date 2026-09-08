/**
 * Builds the `agreement` payload for Villa's lot Purchase Agreement from a property
 * record and, where one has been captured, its Purchase Application.
 *
 * Villa's 2026 revision merges the Purchase Application and the Purchase Agreement into one
 * document that becomes binding on the SELLER's acceptance, so this produces one artifact
 * rather than two. Which revision governs comes from the signing date — see
 * `villa-terms.ts` for why that must never be "the latest one".
 *
 * WHAT PRINTS WHEN: the artifact carries every value a captured purchase application
 * recorded — the buyer's demographics, beneficiaries, the lot's Villa classification, the
 * Maintenance Care Fund contribution, VAT, the total contract price as distinct from the
 * basic price, the amortisation term and the mode of payment (the fields that print blank
 * without an application; see `purchase-application.ts` for the shape and why it waits on
 * a dev freeze). Values are printed as captured — this module never derives MCF, VAT or a
 * total from the other fields, and never prices anything: finance rules are dev-domain.
 *
 * The classification vocabulary and the terms text are the governing revision's own (the
 * 2025 and 2026 papers list different products and refund rules). Without an application
 * the artifact is an honest blank form: the platform's frozen `Lot.type` (individual |
 * family | estate) cannot name Villa's classification on every revision, so it prints a
 * Villa word only where one of the revision's list genuinely covers that type, and blanks
 * the rest rather than guessing.
 */
import type { Lot } from "@/lib/api-client/property";
import type { GenerateDocumentInput } from "@/lib/contracts/service-contract";
import { resolveTerms, termsByVersion, type TermsRevision } from "@/lib/contracts/villa-terms";
import {
  ageOn,
  buyerFullName,
  type PurchaseApplication,
} from "@/lib/contracts/purchase-application";

/** Villa's own words for a lot classification, keyed by the platform's `LotType`. */
const CLASSIFICATION: Record<Lot["type"], string> = {
  individual: "Lawn Lot",
  family: "Lawn Lot — Family Garden",
  estate: "Mausoleum",
};

const CIVIL_STATUS_LABEL: Record<string, string> = {
  single: "Single",
  married: "Married",
  widowed: "Widowed",
  legally_separated: "Legally separated",
  other: "Other",
};

const GENDER_LABEL: Record<string, string> = {
  male: "Male",
  female: "Female",
};

const MODE_LABEL: Record<string, string> = {
  annual: "Annual",
  semi_annual: "Semi",
  quarterly: "Quarterly",
  monthly: "Monthly",
};

type Row = { label: string; value: string };

/**
 * A lot with no named party has no buyer, and an agreement with no buyer is not a
 * document — it is a blank form. Reserving names the party; capturing the purchase
 * application names it in full. Either makes this generable.
 */
export function canGeneratePurchaseAgreement(
  lot: Lot,
  application?: PurchaseApplication | null,
): boolean {
  const buyerNamed = Boolean(lot.owner_name) || Boolean(application && buyerFullName(application));
  return buyerNamed && (lot.status !== "available" || Boolean(application));
}

/**
 * Rows for the buyer + property block of the printed form. The field set follows the
 * revision's own paper — the 2025 standalone agreement carries a slim buyer table, the
 * 2026 merged form the full application demographics — so a printed artifact never shows
 * a cell that is not on the paper Villa actually signs. Uncaptured cells stay blank
 * (the paper's own empty cells), never guessed.
 */
function buyerAndPropertyRows(
  terms: TermsRevision,
  lot: Lot,
  application: PurchaseApplication,
  signedOn: string,
): Row[] {
  const rows: Row[] = [];
  const is2025 = terms.version === "lot-purchase-2025";
  const is2026 = terms.version === "lot-purchase-2026";
  const empty = (label: string, value: string): Row => ({ label, value });

  if (is2026) {
    rows.push(
      empty("Last name", application.last_name),
      empty("First name", application.first_name),
      empty("Middle name", application.middle_name),
      empty("Date of birth", application.date_of_birth ?? ""),
      empty("Age", ageOn(application.date_of_birth, signedOn)?.toString() ?? ""),
      empty("Civil status", application.civil_status ? (CIVIL_STATUS_LABEL[application.civil_status] ?? application.civil_status) : ""),
      empty("Gender", application.gender ? (GENDER_LABEL[application.gender] ?? application.gender) : ""),
      empty("Religion", application.religion ?? ""),
      empty("Contact no.", application.contact_number ?? ""),
      empty("Email address", application.email ?? ""),
      empty("TIN", application.tin ?? ""),
      empty("GSIS/SSS No.", application.gsis_sss_number ?? ""),
      empty("Alternative contact no.", application.alternative_contact_number ?? ""),
      empty("Facebook account", application.facebook_account ?? ""),
      empty("Address", application.address ?? ""),
      empty("Occupation", application.occupation ?? ""),
      empty("Employer", application.employer ?? ""),
      empty("Employer's address", application.employer_address ?? ""),
      empty("Employer's tel. no.", application.employer_telephone ?? ""),
    );
  } else if (is2025) {
    rows.push(
      empty("Name", buyerFullName(application)),
      empty("Address", application.address ?? ""),
      empty("Citizenship", application.citizenship ?? ""),
      empty("Date of birth", application.date_of_birth ?? ""),
      empty("E-mail address", application.email ?? ""),
      empty("Facebook", application.facebook_account ?? ""),
    );
  } else {
    // An unrecognised revision still prints what was captured, plainly labelled.
    rows.push(empty("Name of buyer", buyerFullName(application)));
  }

  application.beneficiaries.forEach((beneficiary, index) => {
    const n = index + 1;
    rows.push(
      empty(`Beneficiary ${n} — name`, beneficiary.name),
      empty(`Beneficiary ${n} — age`, beneficiary.age?.toString() ?? ""),
      empty(`Beneficiary ${n} — relationship`, beneficiary.relationship),
    );
  });

  rows.push(
    empty("Classification", application.classification ?? ""),
    empty("Section", lot.section),
    empty("Block / Row No.", lot.block),
    empty("Lot No.", lot.lot_number),
    empty("Area", `${lot.area_sqm} sqm`),
    empty("Mode of payment", application.mode_of_payment ? (MODE_LABEL[application.mode_of_payment] ?? application.mode_of_payment) : ""),
    empty(
      "Amortisation",
      application.amortization_value !== null && application.amortization_unit
        ? `${application.amortization_value} ${application.amortization_unit}`
        : "",
    ),
    // The two revisions print different rows in this slot; a row appears only when the
    // paper carries it and the counter wrote something in it.
    ...(is2026 && application.interment_funeral_bundle_inclusion
      ? [
          empty(
            "Interment (1st) / Funeral Bundle Inclusion",
            application.interment_funeral_bundle_inclusion === "included" ? "Included" : "Not included",
          ),
        ]
      : []),
    ...(is2025 && application.others_insurance
      ? [empty("Others / Insurance", application.others_insurance)]
      : []),
  );

  return rows;
}

export function buildPurchaseAgreement({
  lot,
  tenantName,
  signedOn,
  termsVersion,
  application,
}: {
  lot: Lot;
  tenantName: string;
  signedOn: string;
  termsVersion?: string;
  /** The captured purchase application for this lot; absent → an honest blank form. */
  application?: PurchaseApplication | null;
}): GenerateDocumentInput {
  if (!canGeneratePurchaseAgreement(lot, application)) {
    throw new Error(
      "a purchase agreement needs a named buyer — reserve the lot or capture its purchase application first",
    );
  }

  const terms: TermsRevision = termsVersion
    ? (termsByVersion(termsVersion) ??
      (() => {
        throw new Error(`unknown terms version ${termsVersion}`);
      })())
    : resolveTerms("lot_purchase", signedOn);

  const buyerName = (application && buyerFullName(application)) || lot.owner_name || "";

  // Classification: the captured Villa word wins; without an application, fall back to the
  // lot type only when the governing revision actually lists that word — never a word from
  // the other revision's paper (see module header).
  let classification = application?.classification ?? "";
  if (!classification) {
    const guess = CLASSIFICATION[lot.type];
    if (guess && (terms.classifications ?? []).includes(guess)) {
      classification = guess;
    }
  }

  const particulars: Row[] = application
    ? buyerAndPropertyRows(terms, lot, application, signedOn)
    : [
        { label: "Classification", value: classification },
        { label: "Section", value: lot.section },
        { label: "Block / Row No.", value: lot.block },
        { label: "Lot No.", value: lot.lot_number },
        { label: "Area", value: `${lot.area_sqm} sqm` },
        // Villa's form captures these; the platform does not hold them without an application.
        { label: "Mode of payment", value: "" },
        { label: "Amortisation", value: "" },
      ];

  const basicPrice = application?.basic_price_cents ?? lot.price_cents;
  const schedule: Array<{ label: string; amount_minor_units?: number; note?: string }> = [
    { label: "Basic price", amount_minor_units: basicPrice },
    application?.mcf_cents != null
      ? { label: "Maintenance Care Fund (MCF)", amount_minor_units: application.mcf_cents }
      : { label: "Maintenance Care Fund (MCF)", note: application ? "not recorded in the purchase application" : "not recorded on the lot" },
    application?.vat_cents != null
      ? { label: "VAT", amount_minor_units: application.vat_cents }
      : { label: "VAT", note: application ? "not recorded in the purchase application" : "not recorded on the lot" },
  ];

  const totalContractPrice = application?.total_contract_price_cents;
  const totals = [
    totalContractPrice != null
      ? { label: "Total contract price", amount_minor_units: totalContractPrice }
      : {
          label: "Total contract price",
          note: application
            ? "basic price only — the application's total contract price is not captured"
            : "basic price only — MCF and VAT are not captured",
          amount_minor_units: basicPrice,
        },
  ];

  const signatories = [
    { name: "Armando A. Villa", role: "For the Seller" },
    { name: buyerName, role: "Buyer (sign over printed name)" },
  ];
  if (application?.sales_agent_name) {
    signatories.push({ name: application.sales_agent_name, role: "Sales agent (sign over printed name)" });
  }

  return {
    template: "agreement",
    variables: {
      agreement_title: terms.title,
      reference: lot.lot_number,
      reference_label: "Lot",
      party_first: terms.partyFirst,
      party_first_role: terms.partyFirstRole,
      party_second: buyerName,
      party_second_role: terms.partySecondRole,
      effective_date: signedOn.slice(0, 10),
      terms_version: terms.version,
      tenant_name: tenantName,
      currency: lot.currency,
      particulars_title: application ? "Particulars" : "Property",
      particulars,
      schedule_title: terms.scheduleTitle,
      schedule,
      totals,
      clauses_title: "Terms and conditions",
      clauses: terms.clauses,
      signatories,
      notarial_note: terms.notarialNote,
    },
  };
}
