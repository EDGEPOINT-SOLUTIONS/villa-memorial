/**
 * Funeral Service Contract — paper content assembly for export.
 *
 * Produces the shared PaperBlock grammar (lib/export/types.ts) from the same data the
 * on-screen paper preview (`service-contract-paper.tsx`) renders, so the Word/PDF
 * exports match the paper form `docs/07-client-villa/paper-forms/Service Contract
 * Form.docx`: header block (deceased + client particulars), the services-vs-packaged
 * grid, the deductions lines, the totals block with the paper's nine-day due-date rule,
 * the versioned terms from `villa-terms.ts`, and the signature + notarial blocks.
 *
 * Money stays honest: amounts come only from a linked, server-priced order; otherwise
 * the cells print an em dash. Deduction/grand-total/balance figures belong to the
 * dev-owned guarantee sub-ledger and never appear here. No clause wording is authored
 * here — terms come from `villa-terms.ts` (versioned), the same rule as the purchase
 * papers.
 */
import type { Case } from "@/lib/api-client/operations";
import type { OrderResponse } from "@/lib/api-client/commerce";
import type { TermsRevision } from "@/lib/contracts/villa-terms";
import { formatMinorUnits } from "@/lib/money";
import { addDays, PAYMENT_TERM_DAYS } from "@/lib/contracts/service-contract";
import {
  appliedRows,
  CIVIL_STATUS_LETTER,
  GENDER_LETTER,
  type ServiceContractDraft,
} from "@/lib/contracts/service-contract-capture";
import {
  line,
  paperValue,
  pageBreak,
  space,
  table,
  type PaperBlock,
  type PaperCell,
} from "@/lib/export/types";
import { PAPER_PROFILES, type PaperProfile } from "@/lib/export/paper-profile";

function displayDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

/** Tick glyphs that render in Times across Word/PDF/browser. */
const tick = (on: boolean) => (on ? "[x]" : "[ ]");

type ServicePaperInput = {
  kase: Pick<Case, "case_number" | "deceased_name">;
  intake: Case["intake"];
  order: OrderResponse | null;
  draft: ServiceContractDraft;
  terms: TermsRevision | null;
  signedOn: string;
};

export function buildServicePaper(input: ServicePaperInput): {
  blocks: PaperBlock[];
  title: string;
  terms: TermsRevision | null;
  /** The client's own service-contract sheet (8.5 × 14 in Legal, Times New Roman 10.5 pt). */
  profile: PaperProfile;
} {
  const profile = PAPER_PROFILES["service-contract"];
  const { kase, intake, order, draft, terms, signedOn } = input;
  const contractDate = (intake?.contract_date || signedOn).slice(0, 10);
  const dueDate = addDays(contractDate, PAYMENT_TERM_DAYS);
  const seniorClaimed = intake?.senior_citizen === true;
  const blocks: PaperBlock[] = [];

  const push = (b: PaperBlock) => blocks.push(b);
  const body = (text: string, spaceAfter = 6) => push(line(text, { align: "justify", size: 10.5, spaceAfter }));

  push(line(`SERVICE CONTRACT No.: ${paperValue(kase.case_number)}`, { size: 11, bold: true, spaceAfter: 2 }));
  push(line(`Date: ${paperValue(contractDate)}`, { align: "right", size: 11, spaceAfter: 6 }));
  push(line("SERVICE CONTRACT", { align: "center", bold: true, size: 13, spaceAfter: 8 }));

  // ---- Particulars header block (the paper's own cells) ----
  const deceasedName = kase.deceased_name === "Pending intake" ? "" : kase.deceased_name;
  const genderTick = (letters: Record<string, string>, value?: string | null) =>
    Object.entries(letters)
      .map(([k, letter]) => `${tick(value === k)} ${letter}`)
      .join("   ");
  const particulars: PaperCell[][] = [
    [
      { label: undefined, value: `Name of Deceased:  ${deceasedName}`, span: 3 },
      { label: undefined, value: `Gender:  ${genderTick(GENDER_LETTER, intake?.deceased_gender)}`, span: 3 },
    ],
    [
      { label: undefined, value: `Date of Death:  ${displayDate(intake?.date_of_death)}`, span: 3 },
      {
        label: undefined,
        value: `Civil Status:  ${genderTick(CIVIL_STATUS_LETTER, intake?.deceased_civil_status)}`,
        span: 3,
      },
    ],
    [
      { label: undefined, value: `Date of Birth:  ${displayDate(intake?.deceased_date_of_birth)}`, span: 3 },
      { label: undefined, value: `Senior Citizen?  ${tick(seniorClaimed)} Yes   ${tick(false)} No`, span: 3 },
    ],
    [
      { label: undefined, value: `Name of Client:  ${intake?.client_name ?? ""}`, span: 3 },
      { label: undefined, value: `Gender:  ${genderTick(GENDER_LETTER, intake?.client_gender)}`, span: 3 },
    ],
    [{ label: undefined, value: `Address:  ${intake?.client_address ?? ""}`, span: 6 }],
    [
      { label: undefined, value: `Telephone Numbers:  ${intake?.client_contact ?? ""}`, span: 3 },
      { label: undefined, value: `Facebook:  ${intake?.client_facebook ?? ""}`, span: 3 },
    ],
    [
      { label: undefined, value: `Relationship to Deceased:  ${intake?.client_relationship ?? ""}`, span: 3 },
      { label: undefined, value: `Email:  ${intake?.client_email ?? ""}`, span: 3 },
    ],
    [
      { label: undefined, value: `ID Presented:  ${intake?.client_id_presented ?? ""}`, span: 3 },
      { label: undefined, value: `ID#:  ${intake?.client_id_number ?? ""}`, span: 3 },
    ],
  ];
  push(table(6, particulars, { widths: undefined }));
  push(space(6));

  // ---- Services rendered vs packaged deals ----
  const rows = appliedRows(draft);
  const orderTotal = order ? formatMinorUnits(order.total_cents, order.currency) : null;
  const grid: PaperCell[][] = [
    ...rows.map(({ row, label }) => {
      if (row.side === "service") {
        return [
          { label: undefined, value: label, span: 2 },
          { label: undefined, value: "—", span: 1 },
          { label: undefined, value: "", span: 2 },
          { label: undefined, value: "—", span: 1 },
        ];
      }
      return [
        { label: undefined, value: "", span: 2 },
        { label: undefined, value: "—", span: 1 },
        { label: undefined, value: label, span: 2 },
        { label: undefined, value: "—", span: 1 },
      ];
    }),
    [
      { label: undefined, value: "TOTAL COST OF SERVICES RENDERED", span: 4 },
      { label: undefined, value: orderTotal ?? "—", span: 2 },
    ],
  ];
  if (rows.length === 0) {
    grid.unshift([
      { label: undefined, value: "No services selected on this working draft yet.", span: 6 },
    ]);
  }
  push(
    table(
      6,
      grid,
      {
        head: [
          { text: "Services Rendered", span: 2 },
          { text: "Amount" },
          { text: "Packaged Deals", span: 2 },
          { text: "Amount" },
        ],
      },
    ),
  );
  push(space(2));
  push(
    line(
      order
        ? `Amounts shown are the linked order ${order.number}'s server-priced total.`
        : "Amounts print when the services are priced on a linked order; this screen never computes a figure.",
      { size: 8.5, spaceAfter: 6 },
    ),
  );

  // ---- Deductions block ----
  push(line("Less: LIFE PLANS / INSURANCES / BURIAL ASSISTANCE / GUARANTEES:", { bold: true, size: 10, spaceAfter: 4 }));
  const ded = draft.deductions;
  const deductionLines: string[] = [];
  if (ded.lgu.coffin || ded.lgu.embalming || ded.lgu.others) {
    const parts: string[] = [];
    if (ded.lgu.coffin) parts.push("coffin");
    if (ded.lgu.embalming) parts.push(`embalming (${ded.lgu.embalming_days.trim() || "___"} days)`);
    if (ded.lgu.others) parts.push(`Others: ${ded.lgu.others_detail.trim() || "___"}`);
    deductionLines.push(`LGU guarantee — ${parts.join(", ")}`);
  }
  if (ded.dswd_senior) deductionLines.push("DSWD / Senior Citizen");
  if (ded.sss_id.trim()) deductionLines.push(`SSS (ID# ${ded.sss_id.trim()})`);
  if (ded.gsis_id.trim()) deductionLines.push(`GSIS (ID# ${ded.gsis_id.trim()})`);
  if (ded.plan_number.trim()) deductionLines.push(`Life Plan / Insurance (Plan # ${ded.plan_number.trim()})`);

  if (deductionLines.length === 0) {
    push(line("None recorded on this working draft.", { size: 9.5, spaceAfter: 4 }));
  } else {
    deductionLines.forEach((d) => push(line(`— ${d}`, { size: 10, spaceAfter: 2 })));
  }
  push(space(2));

  // ---- Totals block: figures belong to finance, so every amount cell is honest '—' ----
  const totals: PaperCell[][] = [
    [{ label: undefined, value: "GRAND TOTAL AFTER DEDUCTIONS:", span: 4 }, { label: undefined, value: "—", span: 2 }],
    [{ label: undefined, value: "DOWNPAYMENT:", span: 4 }, { label: undefined, value: "—", span: 2 }],
    [{ label: undefined, value: `BALANCE & DUE DATE (${dueDate}):`, span: 4 }, { label: undefined, value: "—", span: 2 }],
  ];
  push(table(6, totals, { widths: undefined }));
  push(space(2));
  push(
    line(
      "Deduction amounts, the grand total and the balance belong to the guarantee sub-ledger and finance (dev-owned); the due date shown is the paper's nine (9) day rule from the contract date.",
      { size: 8.5, spaceAfter: 8 },
    ),
  );

  // ---- Versioned terms ----
  if (!terms) {
    push(line("The terms revision for this contract date could not be resolved; the printed terms are unavailable until it is.", { size: 10, spaceAfter: 6 }));
    return { blocks, title: "Service Contract", terms: null, profile };
  }
  push(line("KNOW ALL MEN BY THESE PRESENTS:", { bold: true, size: 10.5, spaceAfter: 4 }));
  body(
    `This Service Contract is made and entered into on the date written above between ${terms.partyFirst} and the CLIENT${
      intake?.co_maker_name ? `, together with Co-Maker ${intake.co_maker_name}` : ""
    }, jointly and solidarily liable, under the terms below.`,
  );

  // The paper's party block (Service Contract Form.docx): each party named over its
  // role. The roles are read from the terms revision (villa-terms.ts) — the same source
  // the signature labels below use — so the block and the signature area cannot name
  // different parties. No clause wording is authored here.
  push(line(terms.partyFirst, { bold: true, size: 10.5, spaceAfter: 1 }));
  push(line(terms.partyFirstRole.toUpperCase(), { size: 9, spaceAfter: 5 }));
  push(line("-and-", { align: "center", size: 10.5, spaceAfter: 5 }));
  push(
    line((intake?.client_name ?? "").trim() || "______________________________", {
      bold: true,
      size: 10.5,
      spaceAfter: 1,
    }),
  );
  push(line(terms.partySecondRole.toUpperCase(), { size: 9, spaceAfter: 4 }));
  if (intake?.co_maker_name) {
    push(line(`Co-Maker: ${intake.co_maker_name}`, { size: 10.5, spaceAfter: 1 }));
    if (terms.partyThirdRole) {
      push(line(terms.partyThirdRole.toUpperCase(), { size: 9, spaceAfter: 4 }));
    }
  }

  // The office's contract opens its provisions with WITNESSETH: (the form's own
  // heading); the numbered clauses below are the terms the revision carries.
  push(line("WITNESSETH:", { align: "center", bold: true, size: 10.5, spaceAfter: 5 }));
  terms.clauses.forEach((clause, index) => body(`${index + 1}. ${clause}`, 5));
  body(
    "The parties hereby indicate by their signatures below that they have read and agree with the terms and conditions of this contract in its entirety.",
  );

  // ---- Signature block (the form's three signatories, labels from the revision) ----
  push(space(6));
  push(line("IN WITNESS WHEREOF:", { bold: true, size: 10.5, spaceAfter: 8 }));
  const secondRole = terms.partySecondRole.toUpperCase();
  const thirdRole = (terms.partyThirdRole ?? "Co-Maker").toUpperCase();
  const signRows: PaperCell[][] = [
    [
      { label: undefined, value: `${intake?.client_name ?? ""}\n\n${secondRole} (Sign over Printed Name)`, span: 2 },
      { label: undefined, value: `${intake?.co_maker_name ?? ""}\n\n${thirdRole} (Sign over Printed Name)`, span: 2 },
      { label: undefined, value: `Armando A. Villa\n\nFuneraria Villa`, span: 2 },
    ],
  ];
  push(table(6, signRows, { widths: [0.333, 0.333, 0.334] }));
  push(space(4));

  // ---- Notarial ----
  push(pageBreak());
  push(line(terms.notarialNote, { size: 10, spaceAfter: 6 }));

  return { blocks, title: "Service Contract", terms, profile };
}
