/**
 * Builds the `agreement` payload for Villa's lot Purchase Agreement from a property record.
 *
 * Villa's 2026 revision merges the Purchase Application and the Purchase Agreement into one
 * document that becomes binding on the SELLER's acceptance, so this produces one artifact
 * rather than two. Which revision governs comes from the signing date — see
 * `villa-terms.ts` for why that must never be "the latest one".
 *
 * WHAT IS NOT CAPTURED YET, and therefore prints blank: the buyer's demographics (TIN,
 * GSIS/SSS, employer, beneficiaries), the Maintenance Care Fund contribution, VAT, the
 * total contract price as distinct from the basic price, the amortisation term and the
 * mode of payment. property-gis holds a lot's price and its owner, not a sale's financing
 * terms — that is the purchase-application record this platform does not have yet, and the
 * blanks on this artifact are the argument for building it.
 */
import type { Lot } from "@/lib/api-client/property";
import type { GenerateDocumentInput } from "@/lib/contracts/service-contract";
import { resolveTerms, termsByVersion, type TermsRevision } from "@/lib/contracts/villa-terms";

/** Villa's own words for a lot classification, keyed by the platform's `LotType`. */
const CLASSIFICATION: Record<Lot["type"], string> = {
  individual: "Lawn Lot",
  family: "Lawn Lot — Family Garden",
  estate: "Mausoleum",
};

/**
 * A lot with no named party has no buyer, and an agreement with no buyer is not a
 * document — it is a blank form. Reserving names the party; that is the step that makes
 * this generable.
 */
export function canGeneratePurchaseAgreement(lot: Lot): boolean {
  return Boolean(lot.owner_name) && lot.status !== "available";
}

export function buildPurchaseAgreement({
  lot,
  tenantName,
  signedOn,
  termsVersion,
}: {
  lot: Lot;
  tenantName: string;
  signedOn: string;
  termsVersion?: string;
}): GenerateDocumentInput {
  if (!canGeneratePurchaseAgreement(lot)) {
    throw new Error("a purchase agreement needs a named buyer — reserve the lot first");
  }

  const terms: TermsRevision = termsVersion
    ? (termsByVersion(termsVersion) ??
      (() => {
        throw new Error(`unknown terms version ${termsVersion}`);
      })())
    : resolveTerms("lot_purchase", signedOn);

  return {
    template: "agreement",
    variables: {
      agreement_title: terms.title,
      reference: lot.lot_number,
      reference_label: "Lot",
      party_first: terms.partyFirst,
      party_first_role: terms.partyFirstRole,
      party_second: lot.owner_name ?? "",
      party_second_role: terms.partySecondRole,
      effective_date: signedOn.slice(0, 10),
      terms_version: terms.version,
      tenant_name: tenantName,
      currency: lot.currency,
      particulars_title: "Property",
      particulars: [
        { label: "Classification", value: CLASSIFICATION[lot.type] ?? lot.type },
        { label: "Section", value: lot.section },
        { label: "Block / Row No.", value: lot.block },
        { label: "Lot No.", value: lot.lot_number },
        { label: "Area", value: `${lot.area_sqm} sqm` },
        // Villa's form captures these; the platform does not hold them yet.
        { label: "Mode of payment", value: "" },
        { label: "Amortisation", value: "" },
      ],
      schedule_title: terms.scheduleTitle,
      schedule: [
        { label: "Basic price", amount_minor_units: lot.price_cents },
        { label: "Maintenance Care Fund (MCF)", note: "not recorded on the lot" },
        { label: "VAT", note: "not recorded on the lot" },
      ],
      totals: [
        {
          label: "Total contract price",
          note: "basic price only — MCF and VAT are not captured",
          amount_minor_units: lot.price_cents,
        },
      ],
      clauses_title: "Terms and conditions",
      clauses: terms.clauses,
      signatories: [
        { name: "Armando A. Villa", role: "For the Seller" },
        { name: lot.owner_name ?? "", role: "Buyer (sign over printed name)" },
      ],
      notarial_note: terms.notarialNote,
    },
  };
}
