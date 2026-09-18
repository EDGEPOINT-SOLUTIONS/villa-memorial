/**
 * Official receipt — the ONE paper for money received, printed in two copies.
 *
 * WHY ONE MODULE
 * An official receipt reaches a family the same way it reaches the office: the money is
 * recorded once, and the sheet that leaves the counter and the sheet that opens in the
 * family's papers are the SAME document. Before this module two builders could describe
 * it (the family portal's copy and the counter's provisional slip), which is exactly how
 * a printed receipt drifts from the receipt the family sees. Everything about the sheet
 * now lives here: the heading, the four cells a receipt is (its own number, the day the
 * money was received, the amount, what it covers), the copy lines and the export filename.
 *
 * WHAT IS PRINTED, AND WHAT IS NOT
 * A cell prints only when the record carries it — a figure the record does not have never
 * becomes a plausible-looking cell (the shared `paperValue` em dash is the honest blank).
 * `receiptHasFigures` is the one gate that decides whether a sheet can be assembled at
 * all: no number, date and amount, no receipt. Callers that cannot satisfy it say so
 * plainly rather than printing a guess (see the billing screen's "no official receipt"
 * state, and `lib/family/family-documents.ts`'s getting-ready state).
 *
 * The AMOUNT arrives as written text, never as a number to compute from: finance owns the
 * figure, this module only prints what it is handed (repo money rule).
 *
 * The paper grammar is `lib/export/types.ts`, so the on-screen sheet, the .docx and the
 * .pdf are the same document (components/paper/*).
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

/** The park's own letterhead — the same institution the purchase papers carry. */
export const RECEIPT_PARK_NAME = "VILLA MEMORIAL";

export const RECEIPT_TITLE = "Official Receipt";

/** Which copy of the same receipt this is. The copy line is the only difference. */
export type OfficialReceiptCopy = "office" | "family";

/**
 * The family's copy line. It is their receipt by right: the office keeps the signed
 * original and re-issues on request, which is why the note offers that rather than a
 * request path (captain, family portal — the family's papers are never request-gated).
 */
export const FAMILY_RECEIPT_COPY_NOTE =
  "This is your family's copy of the official receipt recorded on your account. " +
  "The office keeps the signed original — call us at any time and we will send you " +
  "another copy, free of charge.";

/** The office's copy line for the same sheet. */
export const OFFICE_RECEIPT_COPY_NOTE =
  "This is the office copy of the official receipt issued for this payment. " +
  "The family holds their own copy of the same receipt.";

export const RECEIPT_COPY_LINE: Record<OfficialReceiptCopy, string> = {
  office: "Office copy",
  family: "Your family's copy",
};

export const RECEIPT_COPY_NOTE: Record<OfficialReceiptCopy, string> = {
  office: OFFICE_RECEIPT_COPY_NOTE,
  family: FAMILY_RECEIPT_COPY_NOTE,
};

/**
 * What the sheet prints. Everything except the number, the day received and the amount is
 * optional, and an absent optional never prints a cell.
 */
export type OfficialReceiptFigures = {
  /** The receipt's own number, exactly as issued. */
  number: string;
  /** The day the money was received (yyyy-mm-dd), as the record carries it. */
  received_on: string;
  /** The amount as written on the record — text, never parsed or computed here. */
  amount: string;
  /** What the payment is for, in the record's own words. */
  covers?: string | null;
  /** Who paid, when the record names them. */
  payer?: string | null;
  /** Who took the money at the counter, when the record names them. */
  received_by?: string | null;
  /** How it arrived (Cash, GCash…), when the record names it. */
  method?: string | null;
  /** The instrument's own reference (check no., transfer ref), when it carries one. */
  reference?: string | null;
};

export type OfficialReceipt = {
  title: string;
  blocks: PaperBlock[];
  /** No receipt paper is archived; the sheet follows the office's own legal stationery. */
  profile: PaperProfile;
};

/**
 * A receipt is its own number, the day the money was received and the amount. Anything
 * less has no sheet to print — callers surface the honest state instead.
 */
export function receiptHasFigures(
  figures: Pick<OfficialReceiptFigures, "number" | "received_on" | "amount">,
): boolean {
  return Boolean(figures.number && figures.received_on && figures.amount);
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * A recorded day in reading words (“12 September 2026”). Reads the recorded date as a
 * plain calendar day in UTC; text that is not a calendar date is printed as the record's
 * own words rather than guessed at.
 */
export function receiptDateWords(iso: string): string {
  if (typeof iso !== "string") return "";
  const trimmed = iso.trim();
  const match = ISO_DATE_RE.exec(trimmed);
  if (!match) return trimmed;
  const date = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== trimmed) {
    return trimmed;
  }
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** The instrument line: how it arrived, plus the reference when the record carries one. */
function methodLine(figures: OfficialReceiptFigures): string | null {
  const method = (figures.method ?? "").trim();
  const reference = (figures.reference ?? "").trim();
  if (method === "" && reference === "") return null;
  if (method === "") return `Reference ${reference}`;
  if (reference === "") return method;
  return `${method} · ${reference}`;
}

/**
 * The receipt sheet. It throws rather than assembling a half-receipt — every caller is
 * expected to have checked `receiptHasFigures` first and to render its own honest state
 * when that check fails.
 */
export function buildOfficialReceiptPaper(
  figures: OfficialReceiptFigures,
  copy: OfficialReceiptCopy,
): OfficialReceipt {
  if (!receiptHasFigures(figures)) {
    throw new Error("this receipt record has no number, date and amount to print");
  }

  const rows: PaperCell[][] = [
    [
      { label: "Receipt no.", value: figures.number },
      { label: "Date", value: receiptDateWords(figures.received_on) },
    ],
    [{ label: "Amount received", value: figures.amount, span: 2 }],
    [{ label: "For", value: paperValue(figures.covers), span: 2 }],
  ];

  const payer = (figures.payer ?? "").trim();
  if (payer !== "") {
    rows.push([{ label: "Received from", value: payer, span: 2 }]);
  }
  const method = methodLine(figures);
  if (method) {
    rows.push([{ label: "Payment method", value: method, span: 2 }]);
  }
  const receivedBy = (figures.received_by ?? "").trim();
  if (receivedBy !== "") {
    rows.push([{ label: "Received by", value: receivedBy, span: 2 }]);
  }

  const note = `${RECEIPT_COPY_NOTE[copy]}${
    copy === "office" && receivedBy !== ""
      ? ` Recorded at the counter by ${receivedBy}.`
      : ""
  }`;

  return {
    title: RECEIPT_TITLE,
    profile: PAPER_PROFILES["official-receipt"],
    blocks: [
      line(RECEIPT_PARK_NAME, { align: "center", bold: true, size: 13 }),
      line(RECEIPT_TITLE, { align: "center", bold: true, size: 11, caps: true }),
      line(RECEIPT_COPY_LINE[copy], { align: "center", size: 9 }),
      space(8),
      table(2, rows),
      space(6),
      line(note, { size: 9.5 }),
    ],
  };
}

/** Export filename stem for a receipt: what it is, its number, the day received. */
export function officialReceiptFileStem(number: string, received_on: string): string {
  return paperFileStem([RECEIPT_TITLE, number, received_on]);
}
