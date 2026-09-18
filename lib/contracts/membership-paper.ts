/**
 * Villa Memorial Plan — the membership application as an artifact.
 *
 * Builds the ordered `PaperBlock[]` (lib/export/types.ts) that renders the SAME document
 * three ways: the on-screen sheet (`components/paper/paper-sheet.tsx`), a real .docx and a
 * real .pdf — the repo's shared paper/export kit, the same one the service contract and the
 * lot purchase application use.
 *
 * WHAT THIS PAPER IS, AND WHAT IT DELIBERATELY IS NOT
 * It is the office's working record of an enrolment: who is joining, who the plan protects,
 * which branch, which published tier × payment mode, and the declarations the plan's paper
 * carries. It is NOT the membership document: no COC number, no coverage start/end dates, no
 * clause wording — the signed membership/COC paper is not archived in this project (see
 * `lib/contracts/membership-application.ts`), so the app reproduces none of it. The honest
 * line is printed on the sheet's face, and the rate prints exactly as it was read from the
 * pricing store at save time (`rate_cents`) — never recomputed here.
 */
import type { MembershipApplication } from "@/lib/contracts/membership-application";
import {
  APPLICATION_NOT_A_COC_NOTE,
  DPA_CONSENT_STATEMENT,
  HEALTH_DECLARATION_STATEMENT,
  MEMBERSHIP_COVERAGE,
  MEMBERSHIP_RELATIONSHIP_LABEL,
  PAPER_AUTHORITY_NOTE,
  PLAN_RATE_CLASSES,
  planHolderAgeOn,
  planHolderFullName,
  planTermLabel,
  planTermPer,
} from "@/lib/contracts/membership-application";
import { PLAN_TIERS } from "@/lib/villa-pricing";
import {
  line,
  paperFileStem,
  paperValue,
  pesoText,
  space,
  table,
  type PaperBlock,
  type PaperCell,
} from "@/lib/export/types";

export const MEMBERSHIP_PAPER_TITLE = "Membership Application";

/**
 * What the paper prints: the recorded field set, without the store's own bookkeeping (`id`
 * is the app's record identity, `created_at` the save moment). A live preview before saving
 * passes the same shape; a recorded application is assignable as-is.
 */
export type MembershipPaperData = Omit<MembershipApplication, "id" | "created_at">;

/** Row of label/value pairs; each pair is two grid units (label cell + value cell). */
function pairsRow(pairs: Array<[string, string | null | undefined]>): PaperCell[] {
  const row: PaperCell[] = [];
  for (const [label, value] of pairs) {
    row.push({ label, value: "" });
    row.push({ label: undefined, value: paperValue(value) });
  }
  return row;
}

function planTierLabel(tier: MembershipPaperData["plan_tier"]): string {
  return PLAN_TIERS.find((t) => t.id === tier)?.name ?? tier;
}

/**
 * The membership application sheet for a recorded application. Everything prints from the
 * record's own values; a blank cell prints the repo's honest em dash, never a guess.
 */
export function buildMembershipApplicationPaper(
  application: MembershipPaperData,
): { blocks: PaperBlock[]; title: string } {
  const holder = planHolderFullName(application);
  const age = planHolderAgeOn(application.date_of_birth, application.application_date);
  const per = planTermPer(application.plan_term);
  const classLabel = PLAN_RATE_CLASSES.find(
    (k) => (k.value === "senior") === application.senior,
  );

  const blocks: PaperBlock[] = [
    line("VILLA MEMORIAL PLAN", { align: "center", bold: true, caps: true, size: 14, spaceAfter: 1 }),
    line("MEMBERSHIP APPLICATION", { align: "center", bold: true, caps: true, size: 11.5, spaceAfter: 2 }),
    line(APPLICATION_NOT_A_COC_NOTE, { align: "center", size: 9.5, spaceAfter: 8 }),
    table(2, [
      [
        { label: "Application No.", value: "____________" },
        { label: "Date", value: paperValue(application.application_date) },
      ],
    ]),
    space(8),
  ];

  /* ------------------------------- plan holder ------------------------------ */
  blocks.push(line("THE PLAN HOLDER", { bold: true, size: 10.5, spaceAfter: 2 }));
  blocks.push(
    table(
      4,
      [
        pairsRow([["Last name", application.last_name], ["First name", application.first_name]]),
        pairsRow([["Middle name", application.middle_name], ["Date of birth", application.date_of_birth]]),
        pairsRow([
          ["Age", age === null ? null : String(age)],
          ["Contact no.", application.contact_number],
        ]),
        [ { label: "Email address", value: "" }, { label: undefined, value: paperValue(application.email) }, { label: "Branch", value: "" }, { label: undefined, value: paperValue(application.branch) } ],
        [ { label: "Address", value: paperValue(application.address), span: 4 } ],
      ],
      { widths: [0.17, 0.33, 0.17, 0.33] },
    ),
  );
  blocks.push(space(6));

  /* ----------------------------- who is protected --------------------------- */
  blocks.push(line("WHO THE PLAN PROTECTS", { bold: true, size: 10.5, spaceAfter: 2 }));
  const beneficiaryRows: PaperCell[][] =
    application.beneficiaries.length > 0
      ? application.beneficiaries.map((b) => [
          { label: undefined, value: paperValue(b.name) },
          { label: undefined, value: MEMBERSHIP_RELATIONSHIP_LABEL[b.relationship] },
        ])
      : [[{ label: undefined, value: "—" }, { label: undefined, value: "—" }]];
  blocks.push(table(2, beneficiaryRows, { widths: [0.6, 0.4], head: ["Beneficiary", "Relationship"] }));
  blocks.push(space(6));

  /* ------------------------------- plan applied ----------------------------- */
  blocks.push(line("THE PLAN APPLIED FOR", { bold: true, size: 10.5, spaceAfter: 2 }));
  blocks.push(
    table(
      4,
      [
        [{ label: "Coverage", value: MEMBERSHIP_COVERAGE, span: 4 }],
        [
          { label: "Plan", value: planTierLabel(application.plan_tier), span: 2 },
          { label: "Payment mode", value: `${planTermLabel(application.plan_term)} ${per}`.trim(), span: 2 },
        ],
        [
          { label: "Published rate", value: `${pesoText(application.rate_cents)} ${per}`.trim(), span: 2 },
          { label: "Rate class", value: classLabel ? `${classLabel.label} (${classLabel.eligibility})` : "—", span: 2 },
        ],
      ],
      { widths: [0.22, 0.28, 0.22, 0.28] },
    ),
  );
  blocks.push(space(2));
  blocks.push(
    line(
      "Rate as published on the office's 2026 plan rate card when this application was recorded; the plan's own schedule governs.",
      { size: 8.5, spaceAfter: 6 },
    ),
  );

  /* ------------------------------- declarations ----------------------------- */
  blocks.push(line("DECLARATIONS", { bold: true, size: 10.5, spaceAfter: 2 }));
  blocks.push(
    table(4, [
      [
        { label: "Health declaration", value: application.health_declaration ? "Declared" : "—", span: 1 },
        { label: undefined, value: HEALTH_DECLARATION_STATEMENT, span: 3 },
      ],
      [
        {
          label: "Data-privacy consent",
          value: application.dpa_consent
            ? application.dpa_consented_at
              ? `Given ${application.dpa_consented_at.slice(0, 10)}`
              : "Given"
            : "—",
          span: 1,
        },
        { label: undefined, value: DPA_CONSENT_STATEMENT, span: 3 },
      ],
    ], { widths: [0.25, 0.75, 0, 0] }),
  );
  blocks.push(space(10));

  /* -------------------------------- signatures ------------------------------ */
  blocks.push(
    line(
      "The plan holder signs below to confirm these enrolment details; the office confirms the plan itself.",
      { size: 10, spaceAfter: 18 },
    ),
  );
  blocks.push(
    table(4, [
      [
        { label: undefined, value: `${holder}\n\nPLAN HOLDER (Signature over Printed Name)`, span: 2 },
        { label: undefined, value: `\n\nRECEIVED BY (Branch officer)`, span: 2 },
      ],
    ], { widths: [0.5, 0.5] }),
  );
  blocks.push(space(8));
  blocks.push(line(PAPER_AUTHORITY_NOTE, { size: 9, spaceAfter: 0 }));

  return { blocks, title: MEMBERSHIP_PAPER_TITLE };
}

/** Export filename stem: what it is, whose application, the date on it. */
export function membershipPaperFileStem(
  application: Pick<
    MembershipPaperData,
    "first_name" | "middle_name" | "last_name" | "application_date"
  >,
): string {
  return paperFileStem([
    "Membership-Application",
    planHolderFullName(application),
    application.application_date,
  ]);
}
