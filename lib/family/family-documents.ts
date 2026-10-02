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
 * - All copy here is display copy for the family; the paper content is the SHARED official
 *   receipt sheet (`lib/contracts/official-receipt.ts`), so the copy the family opens and the
 *   copy the counter prints are the same document — the same number, the same cells and the
 *   same paper blocks the .docx and .pdf exports carry (see components/paper/*).
 */
import type { FamilyDocument, FamilyDocumentKind } from "@/lib/api-client/family";
import {
  FAMILY_RECEIPT_COPY_NOTE,
  buildOfficialReceiptPaper,
  officialReceiptFileStem,
  receiptDateWords,
} from "@/lib/contracts/official-receipt";
import { familyDocumentView } from "@/lib/family/family-view";
import { FAMILY_HELP } from "@/lib/family/contact";
import type { PaperBlock } from "@/lib/export/types";
import type { PaperProfile } from "@/lib/export/paper-profile";

/** The family's copy line for the shared receipt sheet (one wording, one module). */
export { FAMILY_RECEIPT_COPY_NOTE };

/* ------------------------------------------------------------------ */
/* Ownership                                                           */
/* ------------------------------------------------------------------ */

/** Papers the family owns outright: always shown, never requested. */
export function isOwnedPaper(doc: Pick<FamilyDocument, "kind">): boolean {
  return doc.kind === "service_contract" || doc.kind === "official_receipt";
}

/** The plain ownership sentence every owned paper carries. */
export const OWNED_PAPER_WORDS = "You never need to request it.";

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
 * A date on the paper, in the family's reading words (“12 September 2026”). The words come
 * from the one receipt module (`receiptDateWords`), so the family's copy and the counter's
 * copy cannot print the same recorded day two different ways.
 */
export function familyDate(iso: string): string {
  return receiptDateWords(iso);
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
      ? "Yours — always here."
      : "Yours — getting it ready for this page.";
  return [detail, copy, OWNED_PAPER_WORDS].filter(Boolean).join(" · ");
}

/* ------------------------------------------------------------------ */
/* The receipt copy, from the shared paper grammar                     */
/* ------------------------------------------------------------------ */

/**
 * Assemble the family's copy of one official receipt through the shared receipt sheet (so
 * the counter's copy, the repository row, the on-screen page, the .docx and the .pdf are the
 * same document). Only the recorded fields are printed; a record without them throws rather
 * than printing an invented receipt.
 */
export function buildFamilyReceiptPaper(receipt: FamilyDocument): {
  title: string;
  blocks: PaperBlock[];
  profile: PaperProfile;
} {
  if (!familyReceiptHasCopy(receipt) || !receipt.reference || !receipt.issued_on || !receipt.amount) {
    throw new Error("this receipt record has no copy to render");
  }
  return buildOfficialReceiptPaper(
    {
      number: receipt.reference,
      received_on: receipt.issued_on,
      amount: receipt.amount,
      covers: receipt.covers ?? null,
    },
    "family",
  );
}

/** Export filename stem for a receipt copy. */
export function familyReceiptFileStem(receipt: FamilyDocument): string {
  return officialReceiptFileStem(receipt.reference ?? "", receipt.issued_on ?? "");
}

/* ------------------------------------------------------------------ */
/* The Papers popup's rows (plan §6.7)                                 */
/* ------------------------------------------------------------------ */

/**
 * One row in the Papers popup. Serializable so a server page can hand it to the
 * client dialog. `paper` is present only when the record can be faithfully
 * rendered — the on-screen `PaperSheet` and the guarded PDF behind it. A record
 * with no copy carries its honest note and a person to call instead.
 */
export type FamilyPaperPopupItem = {
  key: string;
  title: string;
  typeLabel: string;
  dateLabel: string;
  statusLabel: string;
  tone: "success" | "warning" | "danger" | "neutral" | "info";
  owned: boolean;
  stateNote: string;
  paper?: {
    title: string;
    blocks: PaperBlock[];
    profile: PaperProfile;
    filename: string;
    /** The guarded family PDF route (inline by default). */
    pdfHref: string;
  };
  /** The request path for a paper the family does not own. */
  requestHref?: string;
  requestLabel?: string;
};

function familyPaperTypeLabel(kind: FamilyDocumentKind): string {
  if (kind === "service_contract") return "Contract";
  if (kind === "official_receipt") return "Receipt";
  return "Paper";
}

function ownedPopupItem(paper: FamilyDocument): FamilyPaperPopupItem {
  const receipt = paper.kind === "official_receipt";
  const canRender = receipt && familyReceiptHasCopy(paper) && Boolean(paper.reference);
  const item: FamilyPaperPopupItem = {
    key: paper.reference ?? paper.title,
    title: receipt && paper.reference ? `Official receipt ${paper.reference}` : paper.title,
    typeLabel: familyPaperTypeLabel(paper.kind),
    dateLabel: paper.issued_on ? familyDate(paper.issued_on) : "—",
    statusLabel: "Yours",
    tone: "success",
    owned: true,
    stateNote: ownedPaperNote(paper),
    requestHref: FAMILY_HELP.phoneHref,
    requestLabel: "Call if you need it today",
  };
  if (canRender && paper.reference) {
    const built = buildFamilyReceiptPaper(paper);
    item.paper = {
      title: built.title,
      blocks: built.blocks,
      profile: built.profile,
      filename: familyReceiptFileStem(paper),
      pdfHref: `/api/family/papers/receipt/${encodeURIComponent(paper.reference)}`,
    };
  }
  return item;
}

/** Every paper the family holds, ready for the popup: owned first, the request path after. */
export function familyPaperPopupItems(
  documents: readonly FamilyDocument[],
): FamilyPaperPopupItem[] {
  const { contract, receipts, requestable } = familyPapers(documents);
  const items: FamilyPaperPopupItem[] = [];
  if (contract) items.push(ownedPopupItem(contract));
  for (const receipt of receipts) items.push(ownedPopupItem(receipt));
  for (const paper of requestable) {
    const view = familyDocumentView(paper.title, paper.status);
    items.push({
      key: paper.title,
      title: view.title,
      typeLabel: familyPaperTypeLabel(paper.kind),
      dateLabel: paper.issued_on ? familyDate(paper.issued_on) : "—",
      statusLabel: view.status,
      tone: view.tone,
      owned: false,
      stateNote: view.note,
      requestHref: FAMILY_HELP.phoneHref,
      requestLabel: "Ask for a copy",
    });
  }
  return items;
}
