/**
 * Villa's contract terms, transcribed from the client's own documents and versioned by
 * effective date.
 *
 * Source of truth for the wording: `docs/07-client-villa/forms/` (transcripts of
 * `Service contract 2025.docx`, `purchase agreement sanctuario de mercedes y gloria.docx`
 * and `purchase application form 2026.docx`).
 *
 * WHY THIS LIVES HERE, IN CODE
 * documents ⓡ is a reusable service (ADR-005): no domain vocabulary may enter its code,
 * so it renders a generic `agreement` template — parties, a schedule, adjustments, terms,
 * signatories — and every Villa word arrives as a caller-supplied variable. This module is
 * that caller's half. Wording on a legal artifact moves through a reviewed PR, never an
 * UPDATE, which is the same rule the documents templates follow.
 *
 * WHY REVISIONS, NOT A SINGLE SET
 * Villa's 2025 and 2026 papers diverge materially — a cancelling buyer under the 2025
 * purchase agreement is refunded less a 30% liquidated-damages deduction; under 2026 there
 * is no refund at all, only 60 days to transfer or sell. A contract keeps the terms it was
 * signed under for its whole life, so `resolveTerms` is for NEW agreements only: an
 * existing one must be re-rendered from the `version` stored on it, never from today's
 * date. That version string is printed on the artifact by the template.
 *
 * NOT YET LEGALLY REVIEWED. These are faithful transcriptions of operative terms, not
 * counsel-approved wording, and two questions in `docs/07-client-villa/open-questions.md`
 * are still open against them: the 2025-vs-2026 refund divergence, and which document
 * types are valid for digital signature. Until both close, generated documents are a
 * staff-facing draft to print and sign on paper — v1 has no e-signature.
 */

export type TermsKind = "service_contract" | "lot_purchase";

export type TermsRevision = {
  /** Printed on the artifact as `terms_version`. Stored on whatever record is signed. */
  version: string;
  kind: TermsKind;
  /** The document's own name, in Villa's words — becomes the artifact's heading. */
  title: string;
  /** Inclusive ISO date from which this revision governs new agreements. */
  effectiveFrom: string;
  /** Exclusive ISO date after which it no longer governs new ones; null = current. */
  effectiveUntil: string | null;
  partyFirst: string;
  partyFirstRole: string;
  partySecondRole: string;
  /** Present only where the paper form has a third signatory block. */
  partyThirdRole?: string;
  /**
   * The memorial-lot classifications Villa prints on that revision's form, in the paper's
   * own words. The two revisions list different products (2026 drops Family Garden,
   * Premium and Condo-type Vaults; adds Lawn Lot Standard and plain Condo-type), and a
   * printed contract must use the vocabulary of the revision it was signed under.
   * Present only on `lot_purchase` revisions; the service contract has no lot list.
   */
  classifications?: string[];
  scheduleTitle: string;
  adjustmentsTitle?: string;
  clauses: string[];
  notarialNote: string;
};

const NOTARIAL =
  "Subscribed and sworn to before me, the parties exhibiting competent proof of identity.\n" +
  "Doc. No. ____;  Page No. ____;  Book No. ____;  Series of ____.";

/**
 * At-need funeral service contract (Funeraria Villa, 2025 revision).
 * Only one revision exists so far; it stays current until Villa issues another.
 */
const SERVICE_CONTRACT_2025: TermsRevision = {
  version: "service-contract-2025",
  kind: "service_contract",
  title: "Service Contract",
  effectiveFrom: "2025-01-01",
  effectiveUntil: null,
  partyFirst: "Funeraria Villa, represented by its owner, Armando A. Villa",
  partyFirstRole: "Service provider",
  partySecondRole: "Client",
  partyThirdRole: "Co-maker",
  scheduleTitle: "Services rendered",
  adjustmentsTitle: "Less: life plans / insurance / burial assistance / guarantees",
  clauses: [
    "The CLIENT, together with the co-maker, jointly, solidarily and irrevocably promises to pay VILLA the balance stated above on or before nine (9) days after the date of this contract, unless extended upon request of the CLIENT and upon payment of the corresponding extension fees.",
    "For services whose payment is fully or partially guaranteed by an LGU or by a government or private agency — including DSWD, SSS, GSIS, life plans, insurance and pre-need companies approved by VILLA — the CLIENT undertakes to submit the payment guarantee instruments within three (3) days from the date of this contract. An Official Receipt issued for the purpose of claiming against such an agency does not by itself mean the CLIENT has paid VILLA in full.",
    "Failure to comply with clauses 1 and 2 means the CLIENT shall pay the TOTAL amount of the services rendered at standard prices, forfeiting all discounts, plus all applicable interests and penalties. The obligation becomes due immediately, no delay of payment is excused, and interest of ten percent (10%) per month shall apply.",
    "The CLIENT names, appoints and constitutes FUNERARIA VILLA and/or ARMANDO A. VILLA as attorney-in-fact to act on the CLIENT's behalf in connection with burial benefit claims and any insurance, life plan or other claim or benefit of the deceased before any government or private organisation, to the extent required to cover the accounts payable incurred — including to represent, process, submit, claim, sign, receive cash and encash cheques as rightful claimant — with full power of substitution and revocation.",
    "The CLIENT indemnifies and holds VILLA harmless from any loss, liability, damage or cost, including court costs and attorney's fees, arising from the CLIENT's insistence on transporting the coffin and the deceased, or from the absence of embalming, whether or not caused by the negligence of VILLA.",
    "The terms of this contract bind and benefit the successors, assigns, heirs, survivors and personal representatives of all parties.",
    "No breach of any provision is waived unless waived in writing. No course of dealing and no delay by VILLA in exercising a right operates as a waiver of it, and no right or remedy conferred here is exclusive of any other available at law or in equity.",
    "Should suit be brought on this contract, or should it be placed with an attorney for collection, the CLIENT shall pay all costs incurred, including penalties, interests, cost of money and applicable civil damages, plus attorney's fees of not less than fifty thousand pesos (PHP 50,000.00).",
    "This contract is governed by the laws of the Philippines. Suit may be brought in the proper court selected by VILLA, to whose venue and jurisdiction the CLIENT expressly consents.",
    "The CLIENT waives demand, diligence, presentment for payment, protest and notice of demand. Time is of the essence of every term of this contract.",
  ],
  notarialNote: NOTARIAL,
};

/** Clauses common to both lot-purchase revisions; the two differ only where noted below. */
const LOT_PURCHASE_COMMON: string[] = [
  "The BUYER shall pay the SELLER the TOTAL CONTRACT PRICE stated above in Philippine currency, which includes the contribution to the Maintenance Care Fund.",
  "The amount equal to the first amortisation shall be paid upon signing and is treated as down payment and part of the consideration where the BUYER complies with this agreement; otherwise it is treated as option money for the period given the BUYER to comply.",
  "The balance, which includes interest, is payable in regular instalments at the amount and duration stated above until fully paid. On default in any instalment or amount due, a penalty of four percent (4%) per month is charged, and the remaining unpaid balance with accrued penalties becomes immediately due and payable.",
  "Payments are made at the principal office of the SELLER, through a collecting bank, an accredited payment centre, an accredited collecting officer, or the website — in cash, cheque or credit card. Payment by cheque or substitute note is valid only when encashed.",
  "Should the BUYER fail to pay any instalment, interest or penalty, or leave any covenant unperformed, for sixty (60) days after it fell due, the SELLER may cancel this agreement without court intervention by written notice of cancellation.",
  "On cancellation the SELLER may re-enter, hold, sell or dispose of the property without liability to the BUYER and retain payments made prior to re-entry as liquidated damages. In place of cancellation the SELLER may at its sole discretion restructure the BUYER's indebtedness. Default renders the entire obligation automatically due, nullifies all discounts and interest-free concessions previously granted, and adds those discounts back to the purchase price.",
  "No waiver or consideration granted by the SELLER in respect of any violation or default is a renunciation of its rights on any subsequent breach.",
  "No interment shall be made unless the entire amount is fully paid. Where interment is exceptionally allowed before full payment and the BUYER later defaults, the SELLER may, without prior notice, transfer the remains to a lot or space it reserves for that purpose; payments in excess of the contract price of that reserved space are forfeited, and ownership of the property reverts to the SELLER.",
  "The running of the grace period is unaffected by payments made after the SELLER's final notice of cancellation, and no further grace period is given on a subsequent default.",
  "Should the property be unsatisfactory to the BUYER, it may be exchanged or substituted for other unsold interment property with the SELLER's consent, provided the request is made in writing within thirty (30) days from the SELLER's acceptance of this agreement and no interment has been made. Exchange credit is the amount paid on principal and maintenance care, less transfer fee, penalties and other charges.",
  "On full payment of the purchase price and the Maintenance Care Fund contribution, including accrued interest and penalties, and on submission of all documentary requirements including competent proof of identity, the SELLER shall issue a DEED OF SALE and CERTIFICATE OF OWNERSHIP over the property, subject to the SELLER's rules and regulations and to Philippine law.",
  "The BUYER may sell, transfer or assign the property at any time with the written consent of the SELLER and subject to its rules and regulations.",
  "The memorial park is operated as an endowed maintenance care cemetery. The BUYER's contribution to the Maintenance Care Fund is set aside in an irrevocable fund whose net income is applied to maintenance care — the cutting of grass, pruning of shrubs and trees, and upkeep of grounds, boundaries, walks, roadways and structures. The SELLER has the irrevocable power to revise, cancel or substitute any such fund.",
  "In case of force majeure or any unforeseen event causing damage to the property, the SELLER may require the BUYER to contribute to the repairs in an amount the SELLER determines.",
  "Any tax, fee or special assessment imposed by government on the property is payable by the BUYER, their heirs, administrators, executors or assigns.",
  "Only markers conforming to the SELLER's rules and regulations are permitted.",
  "This agreement and the payments made under it do not cover the interment fee, the casket or pre-burial services, the opening, closing and recording of the burial space, vault and casket services, construction of niches and memorial structures, or the taxes, licences and government fees due on any of those services.",
];

/**
 * 2025 purchase agreement, executed as a separate four-page notarised deed alongside the
 * purchase application form.
 */
const LOT_PURCHASE_2025: TermsRevision = {
  version: "lot-purchase-2025",
  kind: "lot_purchase",
  title: "Purchase Agreement",
  effectiveFrom: "2025-01-01",
  effectiveUntil: "2026-01-01",
  // 2025 standalone agreement's own list ("Block /Row No." row, per the paper).
  classifications: [
    "Mausoleum",
    "Garden Niche",
    "Lawn Lot — Family Garden",
    "Lawn Lot — Prime",
    "Lawn Lot — Premium",
    "Condo-type Vaults",
  ],
  partyFirst:
    "AA Villa Memorial Park Development Service, owner and developer of Sanctuario de Mercedes y Gloria, represented by its President, Armando A. Villa",
  partyFirstRole: "Seller",
  partySecondRole: "Buyer",
  scheduleTitle: "Property and price",
  clauses: [
    ...LOT_PURCHASE_COMMON,
    // The 2025-only refund schedule. Replaced wholesale in 2026 — see below.
    "Should the BUYER cancel or withdraw for any reason, or fail to comply with any obligation under this agreement, the SELLER shall refund the amount paid less: (a) reservation fees, which are forfeited in favour of the SELLER; (b) an amount equivalent to thirty percent (30%) of the actual purchase price as liquidated damages; (c) the broker's commission, if any; and (d) any unpaid charges and dues other than the instalment balance.",
    "The BUYER shall promptly notify the SELLER in writing of any change in mailing address. Notices sent to the address stated in this agreement and the Purchase Application Form, by personal delivery, registered mail or electronic means, bind the BUYER whether or not actually received.",
    "Should the SELLER resort to the courts to enforce this agreement, the BUYER shall pay attorney's fees equivalent to twenty-five percent (25%) of the total amount due and demandable, in no case less than PHP 20,000.00. Any action arising from this agreement shall be filed before the proper courts of Zamboanga City, to the exclusion of other courts.",
    "This agreement binds the heirs, executors, administrators, successors-in-interest and assigns of the parties. The obligations created and liabilities incurred by the BUYER are joint and several.",
    "This agreement is not valid and binding until accepted by the SELLER on the terms mutually agreed. The BUYER affirms having read this agreement, or having had it read and explained to them, and understanding its terms.",
  ],
  notarialNote: NOTARIAL,
};

/**
 * 2026 revision. Villa merged the application and the agreement into one document, so the
 * record a buyer signs is a single form that becomes binding on the SELLER's acceptance.
 * Three material changes from 2025, each of which changes money or process:
 *   1. no refund on buyer cancellation — 60 days to transfer or sell instead;
 *   2. attorney's fee floor PHP 20,000 → PHP 50,000;
 *   3. notice follows the buyer's email address, not their mailing address.
 */
const LOT_PURCHASE_2026: TermsRevision = {
  version: "lot-purchase-2026",
  kind: "lot_purchase",
  title: "Purchase Application and Agreement",
  effectiveFrom: "2026-01-01",
  effectiveUntil: null,
  // 2026 combined form's own list; Family Garden, Premium and Condo-type Vaults are gone.
  classifications: [
    "Mausoleum",
    "Garden Niche",
    "Lawn Lot Prime",
    "Lawn Lot Standard",
    "Condo-type",
  ],
  partyFirst:
    "AA Villa Memorial Park Development Services, owner and developer of Sanctuario de Mercedes y Gloria, represented by its President, Armando A. Villa",
  partyFirstRole: "Seller",
  partySecondRole: "Buyer",
  scheduleTitle: "Property and price",
  clauses: [
    ...LOT_PURCHASE_COMMON,
    "Should the BUYER cancel or withdraw for any reason, or fail to comply with any obligation under this agreement, the SELLER shall not refund the BUYER. The BUYER has sixty (60) days to transfer or sell the property subject to the terms and conditions of the SELLER. After sixty (60) days the SELLER is free to dispose of the property as if this agreement had not been executed.",
    "The BUYER shall promptly notify the SELLER in writing of any change in email address. Notices sent to the address stated in this agreement and the Purchase Application Form, by personal delivery, registered mail or electronic means, bind the BUYER whether or not actually received.",
    "Should the SELLER resort to the courts to enforce this agreement, the BUYER shall pay attorney's fees equivalent to twenty-five percent (25%) of the total amount due and demandable, in no case less than PHP 50,000.00. Any action arising from this agreement shall be filed before the proper courts of Zamboanga City, to the exclusion of other courts.",
    "This agreement binds the heirs, executors, administrators, successors-in-interest and assigns of the parties. The obligations created and liabilities incurred by the BUYER are joint and several.",
    "This agreement is not valid and binding until accepted by the SELLER on the terms mutually agreed. The BUYER affirms having read this agreement, or having had it read and explained to them, and understanding its terms.",
  ],
  notarialNote: NOTARIAL,
};

export const TERMS_REVISIONS: TermsRevision[] = [
  SERVICE_CONTRACT_2025,
  LOT_PURCHASE_2025,
  LOT_PURCHASE_2026,
];

/** Look a revision up by the version string stored on a signed agreement. */
export function termsByVersion(version: string): TermsRevision | undefined {
  return TERMS_REVISIONS.find((r) => r.version === version);
}

/**
 * Which revision governs a NEW agreement of `kind` signed on `signedOn` (ISO date).
 *
 * Never call this to re-render an existing agreement: that one keeps the version stored on
 * it, which is why `termsByVersion` exists. Ranges are [effectiveFrom, effectiveUntil).
 */
export function resolveTerms(kind: TermsKind, signedOn: string): TermsRevision {
  const day = signedOn.slice(0, 10);
  const match = TERMS_REVISIONS.find(
    (r) =>
      r.kind === kind &&
      day >= r.effectiveFrom &&
      (r.effectiveUntil === null || day < r.effectiveUntil),
  );
  if (!match) {
    // A gap in the revision table is a data error, not something to paper over with a
    // silent fallback — an agreement printed under the wrong terms is a legal problem.
    throw new Error(`no ${kind} terms revision covers ${day}`);
  }
  return match;
}
