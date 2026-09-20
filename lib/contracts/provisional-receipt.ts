/**
 * Provisional receipt — the paper the counter hands the family, and the match to the real
 * official receipt that replaces it.
 *
 * WHY THIS PAPER IS SHAPED THIS WAY
 * The client's signed Provisional Receipt is NOT archived in `docs/07-client-villa/paper-forms/`
 * (the folder holds the service contract and the purchase papers only), and that folder's rule
 * is "the paper wins". So this sheet does not claim to reproduce that form: it records the same
 * information — payer, amount received, how it was paid, the invoice/order/case it is against,
 * who received it — and says plainly, at the top, what it is not. It carries NO receipt number:
 * numbering belongs to finance, and an invented number is exactly what this paper exists to
 * avoid.
 *
 * ONE CONTENT MODEL, THREE OUTPUTS
 * The sheet is assembled from the shared `PaperBlock` grammar (`lib/export/types.ts`), so the
 * on-screen sheet (`components/paper/paper-sheet.tsx`), the .docx and the .pdf are one document
 * — the same kit the service contract and purchase application print through.
 *
 * THE OFFICIAL-RECEIPT DISPLAY MATCH
 * `officialReceiptForProvisional` decides the display state: where a recorded payment for the
 * invoice already carries an official receipt, or the documents repository holds one that names
 * the invoice/order/case, the screen shows THAT receipt (with the way to open it) instead of the
 * provisional slip — one state or the other, never both. Matching is display-only; nothing here
 * issues, numbers or posts a receipt.
 */
import {
  INSTRUMENT_LABEL,
  PROVISIONAL_RECEIPT_NOTE,
  formatRecordedAt,
  type PaymentInstrument,
} from "@/lib/contracts/payment-capture";
import type { ProvisionalReceiptRecord } from "@/lib/contracts/provisional-receipt-capture";
import type { LandingContent } from "@/lib/api-client/landing";
import {
  receiptFiguresForPayment,
  type InvoiceForPayment,
  type RecordedPayment,
} from "@/lib/billing-payments";
import {
  receiptHasFigures,
  type OfficialReceiptFigures,
} from "@/lib/contracts/official-receipt";
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
import { PAPER_PROFILES, type PaperProfile } from "@/lib/export/paper-profile";

export const PROVISIONAL_RECEIPT_TITLE = "Provisional Receipt";

/**
 * The one short line the family reads before anything else on the sheet: what this paper is
 * and what will replace it. It prints directly under the title — never buried as a footnote.
 */
export const PROVISIONAL_RECEIPT_MARK =
  "Not an official receipt — the official receipt will replace this paper.";

/** The office's own details on the sheet's letterhead, read from the landing content doc. */
export type ProvisionalReceiptOffice = {
  name: string;
  location: string | null;
  phone: string | null;
};

/**
 * The letterhead the paper falls back to when no office document is available (tests and
 * builders without the landing content). The screens always pass the real details.
 */
export const FALLBACK_RECEIPT_OFFICE: ProvisionalReceiptOffice = {
  name: "Villa Memorial",
  location: null,
  phone: null,
};

/**
 * The office details the slip's letterhead prints — the SAME staff-editable landing content
 * the public pages read (wordmark · location · 24/7 line), so the paper never carries a
 * typed-in telephone or address that can drift from the site.
 */
export function provisionalReceiptOffice(
  content: Pick<LandingContent, "logo" | "contact">,
): ProvisionalReceiptOffice {
  return {
    name: content.logo.wordmark.trim() || FALLBACK_RECEIPT_OFFICE.name,
    location: content.contact.location.trim() || null,
    phone: content.contact.phoneDisplay.trim() || null,
  };
}

/** Everything the sheet prints about one receipt — the capture record and the legacy slip. */
export type ProvisionalPaperData = {
  payer?: string | null;
  amount_cents: number;
  instrument: PaymentInstrument;
  reference?: string | null;
  received_on: string;
  /** The invoice (or the reference the slip was written against). */
  against: string;
  order_number?: string | null;
  case_number?: string | null;
  notes?: string | null;
  received_by?: string | null;
  /** ISO instant the app stamped the record; not a document number. */
  recorded_at?: string | null;
};

export type ProvisionalReceipt = {
  title: string;
  blocks: PaperBlock[];
  /** The same sheet the official receipt prints on (no receipt paper is archived). */
  profile: PaperProfile;
};

/** The letterhead line: the office's place and its own telephone, when the document has them. */
function officeLine(office: ProvisionalReceiptOffice): string {
  return [office.location, office.phone ? `Tel. ${office.phone}` : ""]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" · ");
}

/**
 * The provisional sheet. Everything printed comes from `data`; a blank prints the shared
 * honest em dash (`paperValue`, `pesoText`), never a guess.
 */
export function buildProvisionalReceipt(
  data: ProvisionalPaperData,
  office: ProvisionalReceiptOffice = FALLBACK_RECEIPT_OFFICE,
): ProvisionalReceipt {
  const against = [data.against, data.order_number, data.case_number]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" · ");

  const rows: PaperCell[][] = [
    [
      { label: "Received from", value: paperValue(data.payer) },
      { label: "Amount received", value: pesoText(data.amount_cents) },
    ],
    [
      { label: "Date received", value: paperValue(data.received_on) },
      { label: "Instrument", value: INSTRUMENT_LABEL[data.instrument] },
    ],
    [
      { label: "Reference no.", value: paperValue(data.reference) },
      { label: "Received by", value: paperValue(data.received_by) },
    ],
    [{ label: "Against", value: paperValue(against), span: 2 }],
    [{ label: "Notes", value: paperValue(data.notes), span: 2 }],
    [{ label: "Recorded", value: paperValue(formatRecordedAt(data.recorded_at ?? "")), span: 2 }],
  ];

  const blocks: PaperBlock[] = [
    line(office.name, { align: "center", bold: true, size: 13, caps: true }),
  ];
  const officePlace = officeLine(office);
  if (officePlace) blocks.push(line(officePlace, { align: "center", size: 9.5 }));
  blocks.push(
    line(PROVISIONAL_RECEIPT_TITLE, { align: "center", bold: true, size: 11, caps: true }),
    line(PROVISIONAL_RECEIPT_MARK, { align: "center", bold: true, size: 10 }),
    space(8),
    table(2, rows),
    space(6),
    line(PROVISIONAL_RECEIPT_NOTE, { size: 9.5 }),
    space(16),
    line("Signature: ______________________________", { size: 10 }),
  );

  return { title: PROVISIONAL_RECEIPT_TITLE, blocks, profile: PAPER_PROFILES["provisional-receipt"] };
}

/** Export filename stem: what it is, what it pays against, when it was received. */
export function provisionalReceiptFileStem(data: {
  against: string;
  received_on: string;
}): string {
  return paperFileStem(["Provisional-Receipt", data.against, data.received_on]);
}

/* ------------------------------------------------------------------ */
/* The official receipt that replaces the slip                         */
/* ------------------------------------------------------------------ */

/** The documents-repository row shape the match reads (a subset of `Document`). */
export type ProvisionalReceiptDocumentRow = {
  id: string;
  document_number: string;
  title: string;
  related_case_number: string | null;
  related_order_number: string | null;
  /** Optional additive field (PROPOSED, platform-contracts plan C0c): the invoice the row settles. */
  invoice_number?: string | null;
};

/** The display state that replaces the provisional slip once a real receipt exists. */
export type ProvisionalReceiptOfficial = {
  document_number: string;
  /** The repository row's id — the way the office opens the real receipt. */
  document_id: string;
  document_title: string;
  /**
   * Print-ready figures when the record behind the receipt carries them (a recorded payment).
   * A repository row alone carries no amount, so the state links to it rather than printing a
   * figure it never had.
   */
  figures: OfficialReceiptFigures | null;
};

/** Whether a repository receipt row names the invoice/order/case this slip settles. */
function documentCoversReceipt(
  doc: ProvisionalReceiptDocumentRow,
  invoiceNumber: string,
  record: Pick<ProvisionalReceiptRecord, "order_number" | "case_number">,
): boolean {
  // The strongest link, when the documents contract grows the additive invoice field.
  const invoice = (doc.invoice_number ?? "").trim().toUpperCase();
  if (invoice && invoice === invoiceNumber) return true;
  const order = (record.order_number ?? "").trim().toUpperCase();
  if (order && (doc.related_order_number ?? "").trim().toUpperCase() === order) return true;
  const kase = (record.case_number ?? "").trim().toUpperCase();
  if (kase && (doc.related_case_number ?? "").trim().toUpperCase() === kase) return true;
  // Until that field freezes, generated receipt rows name the invoice in their title
  // (`Official Receipt — INV-…`), which is the only recorded link left.
  return doc.title.trim().toUpperCase().includes(invoiceNumber);
}

/**
 * The official receipt that replaces this provisional slip, or null while none exists.
 *
 * A receipt recorded through billing (its payment carries a `receipt_document`) is the
 * strongest match — it can print the sheet. Otherwise the documents repository's own receipt
 * row counts when it names the invoice, order or case; that state links to the real receipt
 * instead of printing figures the row never carried.
 */
export function officialReceiptForProvisional(input: {
  record: Pick<ProvisionalReceiptRecord, "invoice_number" | "order_number" | "case_number">;
  /** The invoice's payments as this mode can read them (fixture mode; empty when unlisted). */
  payments: readonly RecordedPayment[];
  documents: readonly ProvisionalReceiptDocumentRow[];
  invoice: Pick<InvoiceForPayment, "customer_name" | "order_number"> | null;
}): ProvisionalReceiptOfficial | null {
  const invoiceNumber = input.record.invoice_number.trim().toUpperCase();

  const payment = input.payments.find(
    (p) => p.invoice_number.trim().toUpperCase() === invoiceNumber && p.receipt_document,
  );
  if (payment?.receipt_document) {
    const figures = input.invoice ? receiptFiguresForPayment(payment, input.invoice) : null;
    return {
      document_number: payment.receipt_document.document_number,
      document_id: payment.receipt_document.id,
      document_title: payment.receipt_document.title,
      figures: figures && receiptHasFigures(figures) ? figures : null,
    };
  }

  const document = input.documents.find((d) =>
    documentCoversReceipt(d, invoiceNumber, input.record),
  );
  if (document) {
    return {
      document_number: document.document_number,
      document_id: document.id,
      document_title: document.title,
      figures: null,
    };
  }
  return null;
}
