/**
 * Purchase Application + Agreement — paper content assembly (paper-faithful document).
 *
 * Produces the ordered `PaperBlock[]` (lib/export/types.ts) that renders the SAME
 * document three ways: the on-screen paper sheet, a real .docx export, and a real .pdf
 * export. The layout follows the authoritative paper copies archived at
 * `docs/07-client-villa/paper-forms/`:
 *   - `Purchase Application Form.docx`  → revision lot-purchase-2026 (the combined form),
 *   - `Purchase Agreement.docx`         → revision lot-purchase-2025 (standalone deed).
 * Which revision governs comes from the application date (see `villa-terms.ts`).
 *
 * WORDING RULES (same as every Villa artifact in this repo):
 *  - Operative clauses come from `villa-terms.ts` (versioned by effective date) — never
 *    authored here. The fixed form chrome (letterhead, WHEREAS/NOW THEREFORE lead-ins,
 *    signature and notarial blocks) is transcribed verbatim from the archived paper and
 *    is the same static frame a documents template would carry.
 *  - Captured values print as recorded; uncaptured cells print an em dash (—), never a
 *    guess. No money is derived — MCF, VAT, totals and amortisation amounts are exactly
 *    the counter's written figures (finance rules are dev domain).
 */
import type { PurchaseApplication, ModeOfPayment } from "@/lib/contracts/purchase-application";
import type { PurchaseApplicationFormValues } from "@/lib/contracts/purchase-application-values";
import type { Lot } from "@/lib/api-client/property";
import { resolveTerms, type TermsRevision } from "@/lib/contracts/villa-terms";
import {
  ageOn,
  buyerFullName,
  DPA_CONSENT_STATEMENT,
  pesosInputToCents,
} from "@/lib/contracts/purchase-application";
import {
  line,
  paperValue,
  pageBreak,
  pesoText,
  space,
  table,
  type PaperBlock,
  type PaperCell,
} from "@/lib/export/types";
import { PAPER_PROFILES, type PaperProfile } from "@/lib/export/paper-profile";

/* ------------------------------- label maps ------------------------------- */

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
  semi_annual: "Semi-annual",
  quarterly: "Quarterly",
  monthly: "Monthly",
};

export const INCLUSION_LABEL: Record<string, string> = {
  included: "Included",
  not_included: "Not included",
};

/** The application's own letterhead, verbatim from the archived paper. */
export const PARK_LETTERHEAD: Array<{ text: string; size?: number; bold?: boolean }> = [
  { text: "SANCTUARIO DE MERCEDES Y GLORIA", size: 15, bold: true },
  { text: "AA VILLA MEMORIAL PARK DEVELOPMENT SERVICES", size: 10.5, bold: true },
  { text: "Purok 3, Begang, Isabela City, Basilan", size: 9.5 },
  { text: "Main Office: Capilla de San Jose Bldg., Sunrise, Isabela City, Basilan", size: 9.5 },
  { text: "Tel No. 09176178489 / 09171839262", size: 9.5 },
];

/* ------------------------------- input shape ------------------------------- */

/** Normalised paper-capture data shared by the draft and the stored record. */
export type PurchasePaperData = {
  applicationDate: string;
  buyer: {
    last: string | null;
    first: string | null;
    middle: string | null;
    dateOfBirth: string | null;
    civilStatus: string | null;
    gender: string | null;
    religion: string | null;
    citizenship: string | null;
    contact: string | null;
    email: string | null;
    tin: string | null;
    gsisSss: string | null;
    altContact: string | null;
    facebook: string | null;
    address: string | null;
    occupation: string | null;
    employer: string | null;
    employerAddress: string | null;
    employerTelephone: string | null;
  };
  beneficiaries: Array<{ name: string; age: string | null; relationship: string }>;
  classification: string | null;
  prices: {
    basic: number | null;
    total: number | null;
    mcf: number | null;
    vat: number | null;
  };
  modeOfPayment: ModeOfPayment | null;
  amortizationValue: number | null;
  amortizationUnit: "years" | "months" | null;
  intermentInclusion: string | null;
  othersInsurance: string | null;
  salesAgent: string | null;
  lot: {
    lotNumber: string;
    section: string | null;
    block: string | null;
    areaSqm: number | null;
  };
  /** The day the sale is dated (today for a new capture); resolves the terms revision. */
  signedOn: string;
};

/** Draft form values → paper data. Amounts must parse as pesos; throws otherwise. */
export function purchasePaperFromForm(
  values: PurchaseApplicationFormValues,
  lot: Pick<Lot, "lot_number" | "section" | "block" | "area_sqm">,
  signedOn: string =
    values.application_date || new Date().toISOString().slice(0, 10),
): PurchasePaperData {
  const cents = (raw: string): number | null => pesosInputToCents(raw);
  const str = (v: string): string | null => (v.trim() === "" ? null : v.trim());
  const age = (v: string): string | null => (v.trim() === "" ? null : v.trim());
  return {
    applicationDate: values.application_date,
    buyer: {
      last: str(values.last_name),
      first: str(values.first_name),
      middle: str(values.middle_name),
      dateOfBirth: str(values.date_of_birth),
      civilStatus: values.civil_status || null,
      gender: values.gender || null,
      religion: str(values.religion),
      citizenship: str(values.citizenship),
      contact: str(values.contact_number),
      email: str(values.email),
      tin: str(values.tin),
      gsisSss: str(values.gsis_sss_number),
      altContact: str(values.alternative_contact_number),
      facebook: str(values.facebook_account),
      address: str(values.address),
      occupation: str(values.occupation),
      employer: str(values.employer),
      employerAddress: str(values.employer_address),
      employerTelephone: str(values.employer_telephone),
    },
    beneficiaries: values.beneficiaries
      .filter((b) => b.name.trim() !== "")
      .map((b) => ({ name: b.name.trim(), age: age(b.age), relationship: b.relationship.trim() })),
    classification: str(values.classification) ?? null,
    prices: {
      basic: cents(values.basic_price_cents),
      total: cents(values.total_contract_price_cents),
      mcf: cents(values.mcf_cents),
      vat: cents(values.vat_cents),
    },
    modeOfPayment: values.mode_of_payment || null,
    amortizationValue:
      values.amortization_value.trim() === ""
        ? null
        : (Number(values.amortization_value.trim()) || null),
    amortizationUnit: values.amortization_unit || null,
    intermentInclusion: values.interment_funeral_bundle_inclusion || null,
    othersInsurance: str(values.others_insurance),
    salesAgent: str(values.sales_agent_name),
    lot: {
      lotNumber: lot.lot_number,
      section: str(lot.section) ?? null,
      block: str(lot.block) ?? null,
      areaSqm: typeof lot.area_sqm === "number" ? lot.area_sqm : Number(lot.area_sqm) || null,
    },
    signedOn,
  };
}

/** Stored application → paper data. */
export function purchasePaperFromApplication(
  application: PurchaseApplication,
  lot: Pick<Lot, "lot_number" | "section" | "block" | "area_sqm">,
  signedOn?: string,
): PurchasePaperData {
  return {
    applicationDate: application.application_date,
    buyer: {
      last: application.last_name || null,
      first: application.first_name || null,
      middle: application.middle_name || null,
      dateOfBirth: application.date_of_birth,
      civilStatus: application.civil_status,
      gender: application.gender,
      religion: application.religion,
      citizenship: application.citizenship,
      contact: application.contact_number,
      email: application.email,
      tin: application.tin,
      gsisSss: application.gsis_sss_number,
      altContact: application.alternative_contact_number,
      facebook: application.facebook_account,
      address: application.address,
      occupation: application.occupation,
      employer: application.employer,
      employerAddress: application.employer_address,
      employerTelephone: application.employer_telephone,
    },
    beneficiaries: application.beneficiaries.map((b) => ({
      name: b.name,
      age: b.age === null ? null : String(b.age),
      relationship: b.relationship,
    })),
    classification: application.classification,
    prices: {
      basic: application.basic_price_cents,
      total: application.total_contract_price_cents,
      mcf: application.mcf_cents,
      vat: application.vat_cents,
    },
    modeOfPayment: application.mode_of_payment,
    amortizationValue: application.amortization_value,
    amortizationUnit: application.amortization_unit,
    intermentInclusion: application.interment_funeral_bundle_inclusion,
    othersInsurance: application.others_insurance,
    salesAgent: application.sales_agent_name,
    lot: {
      lotNumber: lot.lot_number,
      section: lot.section ?? null,
      block: lot.block ?? null,
      areaSqm: typeof lot.area_sqm === "number" ? lot.area_sqm : Number(lot.area_sqm) || null,
    },
    signedOn: signedOn ?? application.application_date,
  };
}

/* ------------------------------ cell helpers ------------------------------ */

const cell = (label: string, value: string, span = 1): PaperCell => ({ label, value, span });

/** A value-only cell filling the remainder of its row. */
const fillCell = (value: string, span = 1): PaperCell => ({
  label: undefined,
  value,
  span,
});

/** Row of label/value pairs; each pair is two grid units (label cell + value cell). */
function pairsRow(
  pairs: Array<[string, string | null | undefined]>,
): PaperCell[] {
  const row: PaperCell[] = [];
  for (const [label, value] of pairs) {
    row.push({ label, value: "" });
    row.push({ label: undefined, value: paperValue(value) });
  }
  return row;
}

/* ------------------------------- revisions -------------------------------- */

function termsFor(data: PurchasePaperData): TermsRevision {
  return resolveTerms("lot_purchase", data.applicationDate || data.signedOn);
}

/**
 * The full document sheet for a captured purchase (2026 combined form) or a standalone
 * 2025 agreement, whichever revision the application date resolves to.
 */
export function buildPurchasePaper(
  data: PurchasePaperData,
): { blocks: PaperBlock[]; terms: TermsRevision; title: string; profile: PaperProfile } {
  const terms = termsFor(data);
  const blocks: PaperBlock[] = [];
  const is2026 = terms.version === "lot-purchase-2026";
  // The revision governs the paper as well as the wording: the 2026 combined form is a
  // Times/Bookman folio, the 2025 standalone deed an Arial legal sheet.
  const profile = is2026
    ? PAPER_PROFILES["purchase-application"]
    : PAPER_PROFILES["purchase-agreement-2025"];

  // ---- Letterhead (the 2026 combined form carries the park letterhead, in Bookman) ----
  if (is2026) {
    for (const head of PARK_LETTERHEAD) {
      blocks.push(
        line(head.text, {
          align: "center",
          bold: head.bold,
          caps: true,
          size: head.size ?? 10,
          spaceAfter: 1,
          typeface: "heading",
        }),
      );
    }
    blocks.push(space(6));
    blocks.push(
      line("PURCHASE APPLICATION AND AGREEMENT", {
        align: "center",
        bold: true,
        size: 12,
        spaceAfter: 2,
      }),
    );
    blocks.push(
      line(`Form No. ____________        Date: ${paperValue(data.applicationDate)}`, {
        align: "center",
        bold: true,
        size: 10.5,
        spaceAfter: 4,
      }),
    );
  } else {
    blocks.push(line("PURCHASE AGREEMENT", { align: "center", bold: true, size: 13, spaceAfter: 2 }));
    blocks.push(line("KNOW ALL MEN BY THESE PRESENTS:", { align: "center", size: 10.5, spaceAfter: 6 }));
  }

  blocks.push(...buyerBlock(data, is2026));
  blocks.push(...propertyBlock(data, is2026));

  // ---- Agreement body ----
  blocks.push(space(6));
  blocks.push(...agreementBody(terms, is2026, data));

  // ---- Signature + notarial ----
  blocks.push(...signatureBlock(data, is2026));
  blocks.push(...notarialBlock(is2026));

  if (is2026) {
    blocks.push(...dpaBlock(data));
  }

  return { blocks, terms, title: terms.title, profile };
}

/* ------------------------------- buyer block ------------------------------ */

function buyerBlock(data: PurchasePaperData, is2026: boolean): PaperBlock[] {
  const b = data.buyer;
  const blocks: PaperBlock[] = [];
  if (!is2026) {
    // 2025 standalone agreement: slim buyer table above the property table.
    const age = b.dateOfBirth ? ageOn(b.dateOfBirth, data.signedOn)?.toString() ?? null : null;
    blocks.push(
      table(4, [
        [
          { label: "Name", value: paperValue(buyerFullName({ first_name: b.first, middle_name: b.middle, last_name: b.last })), span: 2 },
          { label: "Date of Birth", value: paperValue(b.dateOfBirth), span: 1 },
          { label: "Age", value: paperValue(age), span: 1 },
        ],
        [
          { label: "Address", value: paperValue(b.address), span: 2 },
          { label: "Citizenship", value: paperValue(b.citizenship), span: 2 },
        ],
        [
          { label: "E-mail address", value: paperValue(b.email), span: 2 },
          { label: "Facebook", value: paperValue(b.facebook), span: 2 },
        ],
      ]),
    );
    blocks.push(space(4));
    return blocks;
  }

  const age = b.dateOfBirth ? ageOn(b.dateOfBirth, data.signedOn)?.toString() ?? null : null;
  const pairs: Array<[string, string | null | undefined]> = [
    ["Last name", b.last],
    ["First name", b.first],
    ["Middle name", b.middle],
    ["Date of birth", b.dateOfBirth],
    ["Age", age],
    ["Civil status", b.civilStatus ? (CIVIL_STATUS_LABEL[b.civilStatus] ?? b.civilStatus) : null],
    ["Gender", b.gender ? (GENDER_LABEL[b.gender] ?? b.gender) : null],
    ["Religion", b.religion],
    ["Contact no.", b.contact],
    ["Email address", b.email],
    ["TIN", b.tin],
    ["GSIS/SSS No.", b.gsisSss],
    ["Alternative contact no.", b.altContact],
    ["Facebook account", b.facebook],
  ];

  const twoPairs: PaperCell[][] = [];
  for (let i = 0; i < pairs.length; i += 2) {
    twoPairs.push(pairsRow(pairs.slice(i, i + 2)));
  }
  const grid: PaperCell[][] = [
    ...twoPairs,
    [cell("Address", paperValue(b.address), 4)],
    [cell("Occupation", paperValue(b.occupation), 4)],
    [cell("Employer", paperValue(b.employer), 4)],
    [cell("Employer's address", paperValue(b.employerAddress), 4)],
    [cell("Employer's tel. no.", paperValue(b.employerTelephone), 4)],
  ];

  blocks.push(table(4, grid, { widths: [0.17, 0.33, 0.17, 0.33] }));

  // Beneficiaries — the paper's own three-column block.
  const beneRows: PaperCell[][] =
    data.beneficiaries.length > 0
      ? data.beneficiaries.map((ben) => [
          fillCell(paperValue(ben.name)),
          fillCell(paperValue(ben.age)),
          fillCell(paperValue(ben.relationship)),
        ])
      : [[fillCell("—"), fillCell("—"), fillCell("—")]];
  blocks.push(space(4));
  blocks.push(
    table(
      3,
      beneRows,
      {
        widths: [0.5, 0.15, 0.35],
        head: ["Beneficiaries", "Age", "Relationship"],
      },
    ),
  );
  blocks.push(space(4));
  return blocks;
}

/* ------------------------------ property block ---------------------------- */

function propertyBlock(data: PurchasePaperData, is2026: boolean): PaperBlock[] {
  const p = data.prices;
  const rows: PaperCell[][] = [
    [cell("Classification", paperValue(data.classification), 4)],
  ];
  if (is2026) {
    rows.push(
      [cell("Block No.", paperValue(data.lot.block), 1), fillCell("", 1), cell("Lot No.", paperValue(data.lot.lotNumber), 1), fillCell("", 1)],
    );
  } else {
    rows.push(
      [cell("Block / Row No.", paperValue(data.lot.block), 1), fillCell("", 1), cell("Lot No.", paperValue(data.lot.lotNumber), 1), fillCell("", 1)],
    );
  }
  rows.push([cell("Basic price", pesoText(p.basic), 2), cell("Total contract price", pesoText(p.total), 2)]);
  rows.push([cell("Maintenance Care Fund (MCF)", pesoText(p.mcf), 2), cell("VAT", pesoText(p.vat), 2)]);
  rows.push([
    cell("Mode of payment", paperValue(data.modeOfPayment ? (MODE_LABEL[data.modeOfPayment] ?? data.modeOfPayment) : null), 2),
    cell(
      "Amortisation",
      data.amortizationValue !== null && data.amortizationUnit
        ? `${data.amortizationValue} ${data.amortizationUnit}`
        : "—",
      2,
    ),
  ]);
  if (is2026) {
    rows.push([
      cell(
        "Interment (1st) / Funeral bundle inclusion",
        data.intermentInclusion ? (INCLUSION_LABEL[data.intermentInclusion] ?? data.intermentInclusion) : "—",
        4,
      ),
    ]);
  } else {
    rows.push([cell("Others / Insurance", paperValue(data.othersInsurance), 4)]);
  }
  rows.push([
    cell("Section", paperValue(data.lot.section), 2),
    cell("Area", data.lot.areaSqm !== null ? `${data.lot.areaSqm} sqm` : "—", 2),
  ]);

  return [
    table(4, rows, { widths: [0.28, 0.22, 0.28, 0.22] }),
    space(4),
  ];
}

/* ------------------------------- agreement body --------------------------- */

const WHEREAS_2026 =
  "WHEREAS, the Buyer agrees to purchase and the SELLER, for and in consideration of the " +
  "payments to be made by the BUYER and the terms and conditions hereinafter set forth, agrees " +
  "to sell, transfer and convey the right for interment purposes only, the described memorial " +
  "lot (s) above, hereinafter referred to as “Property”, as per maps on file in the office of the SELLER.";

const WHEREAS_2025 =
  "WHEREAS, the Buyer agrees to purchase and the SELLER, for and in consideration of the " +
  "payments to be made by the BUYER and the terms and conditions hereinafter set forth, agrees " +
  "to sell, transfer and convey the right for interment purposes only, the following described " +
  "memorial lots, hereinafter referred to as “Property”, as per maps on file in the office of the SELLER.";

const NOW_THEREFORE =
  "NOW THEREFORE, for and in consideration of the agreement to sell the above-described " +
  "property, both parties agree as follows:";

const SELLER_INTRO_2026 =
  "AA VILLA MEMORIAL PARK DEVELOPMENT SERVICE, owner and developer of SANCTUARIO DE MERCEDES " +
  "Y GLORIA a company duly-organized and existing under and by virtue of the laws of the Republic " +
  "of the Philippines, with office at Capilla de San Jose Bldg., Sunrise, Isabela City, Basilan, " +
  "represented by its President, Armando A. Villa or his duly authorized representative, herein " +
  "referred to as the SELLER, and the BUYER, whose details are mentioned above, witnesseth:";

function agreementBody(
  terms: TermsRevision,
  is2026: boolean,
  data: PurchasePaperData,
): PaperBlock[] {
  const buyerName = paperValue(
    buyerFullName({ first_name: data.buyer.first, middle_name: data.buyer.middle, last_name: data.buyer.last }),
  );
  const blocks: PaperBlock[] = [];
  const body = (text: string, spaceAfter = 6) =>
    blocks.push(line(text, { align: "justify", size: 10.5, spaceAfter }));

  if (!is2026) {
    body("This contract made and entered into this ______________________________ in ______________________ and between:", 4);
    body(SELLER_INTRO_2026.replace(", and the BUYER, whose details are mentioned above, witnesseth:", ", herein referred to as the SELLER,"), 2);
    body(`— and — the BUYER:`);
    body(
      `${buyerName}, of legal age, ${data.buyer.civilStatus ? (CIVIL_STATUS_LABEL[data.buyer.civilStatus]?.toLowerCase() ?? "") + " and " : ""}a resident of ${paperValue(data.buyer.address)}, herein referred to as the BUYER.`,
      4,
    );
    body("WITNESSETH:", 2);
  }
  body(is2026 ? SELLER_INTRO_2026 : WHEREAS_2025, 4);
  if (!is2026) {
    body(is2026 ? "" : NOW_THEREFORE, 2);
  } else {
    body(WHEREAS_2026, 2);
    body(NOW_THEREFORE, 2);
  }

  // Operative terms — the versioned clauses from villa-terms.ts, numbered in order.
  terms.clauses.forEach((clause, index) => {
    body(`${index + 1}. ${clause}`, 5);
  });

  return blocks;
}

/* ------------------------------- signature --------------------------------- */

function signatureBlock(data: PurchasePaperData, is2026: boolean): PaperBlock[] {
  const buyerName = buyerFullName({
    first_name: data.buyer.first,
    middle_name: data.buyer.middle,
    last_name: data.buyer.last,
  }).trim();
  const blocks: PaperBlock[] = [];
  const twoCol: PaperCell[][] = [
    [
      { label: undefined, value: `SANCTUARIO DE MERCEDES Y GLORIA`, span: 2 },
      { label: undefined, value: `${buyerName}\n\nBUYER (Signature over Printed Name)`, span: 2 },
    ],
  ];
  blocks.push(space(2));
  blocks.push(line("IN WITNESS WHEREOF, both parties hereby place their hand on the place and date above written.", { align: "justify", size: 10.5, spaceAfter: 10 }));
  blocks.push(line("By:", { size: 10.5, spaceAfter: 2 }));
  blocks.push(
    table(4, twoCol, { widths: [0.5, 0.5] }),
  );
  blocks.push(space(2));
  blocks.push(line("TIN No. ______________ I.D. Type / No. ______________", { size: 9.5, spaceAfter: 4 }));
  if (!is2026) {
    blocks.push(line("Witnesses:", { size: 10.5, spaceAfter: 2 }));
    blocks.push(
      table(4, [[fillCell("____________________________", 2), fillCell("____________________________", 2)]], {
        widths: [0.5, 0.5],
      }),
    );
  }
  blocks.push(pageBreak());
  return blocks;
}

/* ------------------------------- notarial --------------------------------- */

function notarialBlock(is2026: boolean): PaperBlock[] {
  const blocks: PaperBlock[] = [];
  const line10 = (text: string, spaceAfter = 4, align: "left" | "center" | "justify" = "left") =>
    blocks.push(line(text, { size: 10.5, spaceAfter, align }));
  const centre = (text: string) =>
    blocks.push(line(text, { align: "center", size: 11, spaceAfter: 4 }));

  if (is2026) {
    line10("Republic of the Philippines");
    line10("City of Isabela, Basilan ----- ) S.S.", 8);
  } else {
    line10("Republic of the Philippines");
    line10("City of ________________ ) S.S.", 8);
  }
  centre("ACKNOWLEDGEMENT");
  line10(
    "BEFORE ME, appeared the above stated parties showing their Identification documents as " +
    "stated below their names and known to me as the parties who executed this Purchase Agreement " +
    "and they acknowledged to me as their free and voluntary act and deed.",
    5,
    "justify",
  );
  line10(
    "This document, consists of four (4) pages including this page where this acknowledgement is " +
    "written, with every page thereof duly signed by the parties including their instrumental " +
    "witnesses, at the bottom or left margin thereof and sealed with the notarial seal, refers to " +
    "a Purchase Agreement.",
    8,
    "justify",
  );
  line10(`Witness my hand and seal this day of __________ at ${is2026 ? "Isabela City" : "Zamboanga City"}, Philippines.`, 18);
  centre("NOTARY PUBLIC");
  line10("Doc No: ______________", 2);
  line10("Page No: _____________", 2);
  line10("Book No: _____________", 2);
  line10("Series of _____________", 10);
  return blocks;
}

/* ------------------------------- DPA consent ------------------------------ */

function dpaBlock(data: PurchasePaperData): PaperBlock[] {
  const blocks: PaperBlock[] = [];
  blocks.push(pageBreak());
  blocks.push(
    line(DPA_CONSENT_STATEMENT, {
      align: "justify",
      size: 10.5,
      spaceAfter: 16,
    }),
  );
  const buyerName = buyerFullName({
    first_name: data.buyer.first,
    middle_name: data.buyer.middle,
    last_name: data.buyer.last,
  }).trim();
  const agentName = (data.salesAgent ?? "").trim();
  blocks.push(
    table(4, [
      [
        { label: undefined, value: `${buyerName}\n\nSignature over Printed Name of Buyer`, span: 2 },
        { label: undefined, value: `${agentName}\n\nSignature over Printed Name of Sales Agent`, span: 2 },
      ],
    ], { widths: [0.5, 0.5] }),
  );
  blocks.push(space(6));
  return blocks;
}
