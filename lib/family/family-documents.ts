/**
 * The family's own papers — pure view logic for the family portal.
 *
 * THE RULE THIS MODULE ENFORCES (captain, family portal):
 * the service contract and every official receipt belong to the family. They are
 * always presented as the family's own copies and are NEVER behind a request. Only
 * the remaining document types (certificates, permits and the rest) keep the
 * "ask us for a copy" path.
 *
 * What it derives, and what it refuses to:
 * - Classification comes from the record's `kind` (projected family-safely in
 *   `lib/api-client/family.ts`); anything unknown is REQUESTABLE, never owned.
 * - A receipt is rendered as a real sheet only when the record carries its own
 *   number, the date received and the amount. A half-record gets the honest
 *   "being prepared" state — this module never assembles a plausible-looking
 *   receipt from missing fields, and never numbers, totals or derives a figure.
 * - All copy here is display copy for the family; the paper content uses the
 *   shared PaperBlock grammar (lib/export/types.ts), so the on-screen sheet,
 *   the .docx and the .pdf are the same document (see components/paper/*).
 */
import type { FamilyDocument } from "@/lib/api-client/family";
import {
  line,
  paperFileStem,
  paperValue,
  space,
  table,
  type PaperBlock,
  type PaperCell,
} from "@/lib/export/types";

/* ------------------------------------------------------------------ */
/* Ownership                                                           */
/* ------------------------------------------------------------------ */

/** Papers the family owns outright: always shown, never requested. */
export function isOwnedPaper(doc: Pick<FamilyDocument, "kind">): boolean {
  return doc.kind === "service_contract" || doc.kind === "official_receipt";
}

/** The plain ownership sentence every owned paper carries. */
export const OWNED_PAPER_WORDS = "It is yours — you never need to request it.";

export type FamilyPapers = {
  /** The family's service contract, when the record carries one. */
  contract: FamilyDocument | null;
  /** Every official receipt the record lists, in record order. */
  receipts: FamilyDocument[];
  /** Everything else — certificates, permits, applications: the request path. */
  requestable: FamilyDocument[];
};

export function familyPapers(documents: readonly FamilyDocument[]): FamilyPapers {
  const contract = documents.find((doc) => doc.kind === "service_contract") ?? null;
  return {
    contract,
    receipts: documents.filter((doc) => doc.kind === "official_receipt"),
    requestable: documents.filter((doc) => !isOwnedPaper(doc)),
  };
}

/* ------------------------------------------------------------------ */
/* Dates and receipt words                                             */
/* ------------------------------------------------------------------ */

/**
 * A date on the paper, in the family's reading words (“12 September 2026”). Reads the
 * recorded date as a plain day in UTC; when it is not a calendar date the record's own
 * words are shown instead of a guess.
 */
export function familyDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso;
  const date = new Date(`${match[0]}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== match[0]) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * The one-line receipt summary: amount, the day it was received, what it covers — each
 * part shown only when the record carries it. Never a placeholder figure.
 */
export function receiptSummary(receipt: Pick<FamilyDocument, "amount" | "issued_on" | "covers">): string {
  const parts: string[] = [];
  if (receipt.amount) parts.push(receipt.amount);
  if (receipt.issued_on) parts.push(`received ${familyDate(receipt.issued_on)}`);
  if (receipt.covers) parts.push(`for ${receipt.covers}`);
  return parts.join(" · ");
}

/**
 * Whether the app can show the family a real copy of this receipt. It can only when the
 * record carries the receipt's own number, the date received and the amount — the three
 * things a receipt is. Anything less is the honest state, never a sheet with invented cells.
 */
export function familyReceiptHasCopy(
  receipt: Pick<FamilyDocument, "kind" | "reference" | "issued_on" | "amount">,
): boolean {
  return (
    receipt.kind === "official_receipt" &&
    Boolean(receipt.reference && receipt.issued_on && receipt.amount)
  );
}

/** The family route that opens a receipt copy, or null when there is nothing to open. */
export function familyReceiptHref(receipt: FamilyDocument): string | null {
  if (!familyReceiptHasCopy(receipt) || !receipt.reference) return null;
  return `/client/documents/receipts/${encodeURIComponent(receipt.reference)}`;
}

/**
 * The family-facing line under an owned paper: the recorded detail (when there is any)
 * plus whose copy it is. A paper whose copy the app cannot render yet says so plainly
 * and keeps the ownership sentence — it is never presented as something to request.
 */
export function ownedPaperNote(paper: FamilyDocument): string {
  const detail =
    paper.kind === "official_receipt"
      ? receiptSummary(paper)
      : paper.issued_on
        ? `Dated ${familyDate(paper.issued_on)}`
        : "";
  const copy =
    paper.kind === "official_receipt" && familyReceiptHasCopy(paper)
      ? "Your family's own copy — always here."
      : "Your family's own copy; we are getting it ready for this page.";
  return [detail, copy, OWNED_PAPER_WORDS].filter(Boolean).join(" · ");
}

/* ------------------------------------------------------------------ */
/* The receipt copy, from the shared paper grammar                     */
/* ------------------------------------------------------------------ */

export const FAMILY_RECEIPT_COPY_NOTE =
  "This is your family's copy of the official receipt recorded on your account. " +
  "The office keeps the signed original — call us at any time and we will send you " +
  "another copy, free of charge.";

/**
 * Assemble the family's copy of one official receipt through the shared PaperBlock
 * grammar (so Print / .docx / .pdf are the same sheet). Only the three recorded fields
 * are printed; a record without them throws rather than printing an invented receipt.
 */
export function buildFamilyReceiptPaper(receipt: FamilyDocument): {
  title: string;
  blocks: PaperBlock[];
} {
  if (!familyReceiptHasCopy(receipt) || !receipt.reference || !receipt.issued_on || !receipt.amount) {
    throw new Error("this receipt record has no copy to render");
  }
  const rows: PaperCell[][] = [
    [
      { label: "Receipt no.", value: receipt.reference },
      { label: "Date", value: familyDate(receipt.issued_on) },
    ],
    [{ label: "Amount received", value: receipt.amount, span: 2 }],
    [{ label: "For", value: paperValue(receipt.covers), span: 2 }],
  ];

  return {
    title: "Official Receipt",
    blocks: [
      line("VILLA MEMORIAL", { align: "center", bold: true, size: 13 }),
      line("OFFICIAL RECEIPT", { align: "center", bold: true, size: 11, caps: true }),
      line("Your family's copy", { align: "center", size: 9 }),
      space(8),
      table(2, rows),
      space(6),
      line(FAMILY_RECEIPT_COPY_NOTE, { size: 9.5 }),
    ],
  };
}

/** Export filename stem for a receipt copy. */
export function familyReceiptFileStem(receipt: FamilyDocument): string {
  return paperFileStem(["Official-Receipt", receipt.reference, receipt.issued_on]);
}
