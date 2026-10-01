/**
 * The family request slip — the ONE paper a household's request to the office becomes.
 *
 * WHY THIS EXISTS (captain, 2026-09-30): a manager looking after several loved ones asks
 * the office for things — a visit, cleaning at a lot, a paper — and the request must
 * remember WHICH person and WHICH lot it is about. A free-text sentence loses that link;
 * this sheet carries it: the loved one's name and dates, their lot (section + number +
 * plan) and the park, and only then the family's own words.
 *
 * WHAT IT IS NOT: no service desk exists, so the app issues no ticket and books nothing.
 * The sheet says so plainly, and the office phone is the way it reaches a person. There is
 * no amount on it (the request is never a payment) and no figure is derived here.
 *
 * The paper grammar is `lib/export/types.ts`, so the on-screen sheet, the .docx and the
 * .pdf are the same document (components/paper/*). No request-slip paper is archived in
 * the client's file, so the sheet follows the office's legal stationery (see the
 * `family-request` profile's provenance).
 */
import {
  line,
  paperFileStem,
  paperValue,
  space,
  table,
  type PaperBlock,
  type PaperCell,
} from "@/lib/export/types";
import { PAPER_PROFILES, type PaperProfile } from "@/lib/export/paper-profile";
import { receiptDateWords } from "@/lib/contracts/official-receipt";

/** The park's own letterhead — the same institution every Villa paper carries. */
export const REQUEST_SLIP_PARK_NAME = "VILLA MEMORIAL";
export const REQUEST_SLIP_TITLE = "Request from the family";

/** What the family is asking for, in the office's own request taxonomy. */
export type FamilyRequestKind = {
  label: string;
  detail?: string;
};

/** Everything the slip prints. Only the recorded values are printed; a blank is an em dash. */
export type FamilyRequestSlipInput = {
  /** The loved one the request is about. */
  person_name: string;
  life_dates: string;
  /** Their lot — the stable link between the request and the place. */
  lot_number: string;
  lot_section: string;
  lot_plan: string;
  park: string;
  kind: FamilyRequestKind;
  /** The family's own words, optional. */
  note?: string;
  /**
   * The day the family is asking for (`yyyy-mm-dd`), when the request is for a
   * visit. The office confirms the day by phone; a requested day is never a
   * booked slot, and the sheet says so.
   */
  wanted_on?: string;
  /** The manager who looks after the household. */
  manager_name: string;
  manager_contact: string;
  manager_email?: string;
  /** The day the request was written down (yyyy-mm-dd). */
  written_on: string;
};

export type FamilyRequestSlip = {
  title: string;
  blocks: PaperBlock[];
  profile: PaperProfile;
};

export function buildFamilyRequestSlip(input: FamilyRequestSlipInput): FamilyRequestSlip {
  const rows: PaperCell[][] = [
    [{ label: "About", value: `${input.person_name} (${input.life_dates})`, span: 2 }],
    [
      { label: "Their lot", value: `Section ${input.lot_section} · Lot ${input.lot_number}` },
      { label: "The plan", value: input.lot_plan },
    ],
    [{ label: "The park", value: input.park, span: 2 }],
    [{ label: "The request", value: input.kind.label, span: 2 }],
  ];
  if (input.kind.detail) {
    rows.push([{ label: "What it covers", value: input.kind.detail, span: 2 }]);
  }
  if (input.wanted_on) {
    rows.push([{ label: "For the day", value: requestDateWords(input.wanted_on), span: 2 }]);
  }
  rows.push([{ label: "In the family's words", value: paperValue(input.note), span: 2 }]);
  rows.push([
    { label: "Who to call", value: input.manager_name },
    { label: "Phone", value: input.manager_contact },
  ]);
  if (input.manager_email) {
    rows.push([{ label: "Email", value: input.manager_email, span: 2 }]);
  }
  rows.push([{ label: "Written down", value: requestDateWords(input.written_on), span: 2 }]);

  return {
    title: REQUEST_SLIP_TITLE,
    profile: PAPER_PROFILES["family-request"],
    blocks: [
      line(REQUEST_SLIP_PARK_NAME, { align: "center", bold: true, size: 13 }),
      line(REQUEST_SLIP_TITLE, { align: "center", bold: true, size: 11, caps: true }),
      space(8),
      table(2, rows),
      space(6),
      line(
        input.wanted_on
          ? "This is a request, not a ticket — the office confirms the day by phone and " +
              "nothing is booked until they call you."
          : "This is a request, not a ticket — nothing is booked until the office confirms it. " +
              "Call the number above and we will write it down.",
        { size: 9.5 },
      ),
    ],
  };
}

/** A recorded day in reading words (“30 September 2026”); the shared receipt rule. */
export function requestDateWords(iso: string): string {
  return receiptDateWords(iso);
}

/** Export filename stem for a request slip: who it is about, and the day. */
export function familyRequestFileStem(personName: string, writtenOn: string): string {
  return paperFileStem([REQUEST_SLIP_TITLE, personName, writtenOn]);
}
