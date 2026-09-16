/**
 * Provisional receipt — paper content assembly for a captured payment.
 *
 * Produces the shared PaperBlock grammar (lib/export/types.ts) so the receipt renders
 * three ways from ONE description: the on-screen sheet (components/paper/paper-sheet.tsx),
 * a real .docx and a real .pdf (components/paper/paper-export-actions.tsx) — the repo's
 * existing print/paper pattern, which is why the receipt is not a bespoke screen.
 *
 * The receipt is a presentational record of what was captured: the six fields of
 * `lib/contracts/payment-capture.ts` and the moment of capture. It carries the validity
 * note verbatim and NO official-receipt number, no allocation and no balance — those are
 * finance-owned (FORMS_PLAN.md non-negotiables). Unfilled blanks print the honest em dash
 * (`paperValue`), never a guess.
 */
import {
  INSTRUMENT_LABEL,
  PROVISIONAL_RECEIPT_NOTE,
  formatRecordedAt,
  type PaymentCapture,
} from "@/lib/contracts/payment-capture";
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

export const PROVISIONAL_RECEIPT_TITLE = "Provisional Receipt";

export type ProvisionalReceipt = {
  title: string;
  blocks: PaperBlock[];
};

/** The park's own name on the slip — the same institution the purchase papers letterhead. */
const PARK_NAME = "VILLA MEMORIAL";

export function buildProvisionalReceipt(capture: PaymentCapture): ProvisionalReceipt {
  const rows: PaperCell[][] = [
    [
      { label: "Amount received", value: pesoText(capture.amount_cents) },
      { label: "Date received", value: paperValue(capture.received_on) },
    ],
    [
      { label: "Instrument", value: INSTRUMENT_LABEL[capture.instrument] },
      { label: "Reference no.", value: paperValue(capture.reference) },
    ],
    [{ label: "Case or invoice", value: paperValue(capture.against), span: 2 }],
    [{ label: "Notes", value: paperValue(capture.notes), span: 2 }],
    [{ label: "Recorded", value: paperValue(formatRecordedAt(capture.recorded_at)), span: 2 }],
  ];

  const blocks: PaperBlock[] = [
    line(PARK_NAME, { align: "center", bold: true, size: 13 }),
    line(PROVISIONAL_RECEIPT_TITLE, { align: "center", bold: true, size: 11, caps: true }),
    line("Not an official receipt", { align: "center", size: 9 }),
    space(8),
    table(2, rows),
    space(6),
    line(PROVISIONAL_RECEIPT_NOTE, { size: 9.5 }),
    space(16),
    line("Received by: ______________________________", { size: 10 }),
  ];

  return { title: PROVISIONAL_RECEIPT_TITLE, blocks };
}

/** Export filename stem: what it is, what it pays against, when it was received. */
export function provisionalReceiptFileStem(capture: PaymentCapture): string {
  return paperFileStem(["Provisional-Receipt", capture.against, capture.received_on]);
}
