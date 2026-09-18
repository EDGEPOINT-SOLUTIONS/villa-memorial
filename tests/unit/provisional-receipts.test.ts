import { describe, expect, it } from "vitest";
import {
  PAYER_MAX_LENGTH,
  canReceiveProvisionalPayment,
  emptyProvisionalReceiptDraft,
  firstProvisionalReceiptError,
  provisionalReceiptAgainst,
  validateProvisionalReceiptDraft,
  validateProvisionalReceiptInput,
} from "@/lib/contracts/provisional-receipt-capture";
import {
  PROVISIONAL_RECEIPT_MARK,
  PROVISIONAL_RECEIPT_TITLE,
  buildProvisionalReceipt,
  officialReceiptForProvisional,
  provisionalReceiptFileStem,
  provisionalReceiptOffice,
} from "@/lib/contracts/provisional-receipt";
import { PROVISIONAL_RECEIPT_NOTE } from "@/lib/contracts/payment-capture";
import type { PaperBlock } from "@/lib/export/types";
import type { RecordedPayment } from "@/lib/billing-payments";

/**
 * The provisional receipt rules and paper — pure, shared by the form, the BFF route and the
 * store, and pinned here so a refusal is exact and the sheet stays honest:
 *  - the money/instrument/date half is the SHARED billing rule set (never re-declared);
 *  - the slip carries no receipt number and says plainly what it is not;
 *  - the official-receipt match decides display, never issuance.
 */

const NOW = new Date("2026-09-18T04:00:00Z"); // 2026-09-18 12:00 at the park

/** INV-2026-00003 as the recorded seed has it: ₱1,800.00 owed, nothing paid. */
const invoice = {
  invoice_number: "INV-2026-00003",
  customer_name: "Liwayway Cruz",
  order_number: null as string | null,
  total_cents: 180_000,
  paid_cents: 0,
  currency: "PHP",
  due_at: "2026-05-15T08:00:00Z",
};

function validInput(over: Record<string, unknown> = {}) {
  return {
    invoice_number: "INV-2026-00003",
    case_number: null,
    payer: "Liwayway Cruz",
    amount_cents: 50_000,
    instrument: "cash",
    reference: "",
    received_on: "2026-09-18",
    notes: "",
    ...over,
  };
}

function blockText(blocks: PaperBlock[]): string {
  return blocks
    .map((block) => {
      if (block.kind === "line") return block.text;
      if (block.kind === "table") {
        return block.rows
          .flat()
          .map((cell) => [cell.label, cell.value].filter(Boolean).join(": "))
          .join(" | ");
      }
      return "";
    })
    .join("\n");
}

describe("what the counter may record", () => {
  it("accepts a whole counter payment and normalises the references", () => {
    const checked = validateProvisionalReceiptInput(
      validInput({ invoice_number: "inv-2026-00003", payer: "  Liwayway Cruz  ", case_number: "case-2026-0001" }),
      invoice,
      NOW,
    );
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    expect(checked.input.invoice_number).toBe("INV-2026-00003");
    expect(checked.input.payer).toBe("Liwayway Cruz");
    expect(checked.input.case_number).toBe("CASE-2026-0001");
    expect(checked.input.amount_cents).toBe(50_000);
  });

  it("refuses without an invoice, or one the recorded data does not carry", () => {
    const missing = validateProvisionalReceiptInput(validInput({ invoice_number: "" }), null, NOW);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors.invoice).toContain("Choose the invoice");

    const unknown = validateProvisionalReceiptInput(validInput(), null, NOW);
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.errors.invoice).toContain("recorded billing data");
  });

  it("needs the payer named, within the paper's line", () => {
    const missing = validateProvisionalReceiptInput(validInput({ payer: "  " }), invoice, NOW);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors.payer).toContain("Name the person");

    const tooLong = validateProvisionalReceiptInput(
      validInput({ payer: "x".repeat(PAYER_MAX_LENGTH + 1) }),
      invoice,
      NOW,
    );
    expect(tooLong.ok).toBe(false);
    if (!tooLong.ok) expect(tooLong.errors.payer).toContain(String(PAYER_MAX_LENGTH));
  });

  it("runs the SHARED billing rules for amount, instrument, reference and date", () => {
    const over = validateProvisionalReceiptInput(
      validInput({ amount_cents: 180_001 }),
      invoice,
      NOW,
    );
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.errors.amount).toContain("still owed on INV-2026-00003");

    const paid = validateProvisionalReceiptInput(validInput(), { ...invoice, paid_cents: 180_000 }, NOW);
    expect(paid.ok).toBe(false);
    if (!paid.ok) expect(paid.errors.amount).toContain("already paid in full");

    const noInstrument = validateProvisionalReceiptInput(validInput({ instrument: "" }), invoice, NOW);
    expect(noInstrument.ok).toBe(false);
    if (!noInstrument.ok) expect(noInstrument.errors.method).toContain("how the payment arrived");

    const noReference = validateProvisionalReceiptInput(
      validInput({ instrument: "gcash", reference: "" }),
      invoice,
      NOW,
    );
    expect(noReference.ok).toBe(false);
    if (!noReference.ok) expect(noReference.errors.reference).toContain("reference printed on the slip");

    const cashNoReference = validateProvisionalReceiptInput(
      validInput({ instrument: "cash", reference: "" }),
      invoice,
      NOW,
    );
    expect(cashNoReference.ok).toBe(true);

    const future = validateProvisionalReceiptInput(
      validInput({ received_on: "2026-09-19" }),
      invoice,
      NOW,
    );
    expect(future.ok).toBe(false);
    if (!future.ok) expect(future.errors.received_on).toContain("cannot be in the future");
  });

  it("adapts the form's typed pesos through the same rule set", () => {
    const draft = emptyProvisionalReceiptDraft({
      invoiceNumber: "INV-2026-00003",
      payer: "Liwayway Cruz",
      receivedOn: "2026-09-18",
    });
    expect(draft.amount_text).toBe("");

    const missingAmount = validateProvisionalReceiptDraft(
      { ...draft, instrument: "cash" },
      invoice,
      NOW,
    );
    expect(missingAmount.ok).toBe(false);
    if (!missingAmount.ok) expect(missingAmount.errors.amount).toContain("Enter the amount received");

    const badText = validateProvisionalReceiptDraft(
      { ...draft, amount_text: "12.3.4", instrument: "cash" },
      invoice,
      NOW,
    );
    expect(badText.ok).toBe(false);
    if (!badText.ok) expect(badText.errors.amount).toContain("pesos and centavos");

    const ok = validateProvisionalReceiptDraft(
      { ...draft, amount_text: "500.00", instrument: "bank_transfer", reference: "BT-1" },
      invoice,
      NOW,
    );
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.input.amount_cents).toBe(50_000);
  });

  it("surfaces the first message for the banner and knows when an invoice can still take payment", () => {
    expect(firstProvisionalReceiptError({ payer: "Name the person who handed the money over." })).toContain(
      "Name the person",
    );
    expect(canReceiveProvisionalPayment(invoice)).toBe(true);
    expect(canReceiveProvisionalPayment({ ...invoice, paid_cents: 180_000 })).toBe(false);
    expect(canReceiveProvisionalPayment(null)).toBe(false);
    expect(provisionalReceiptAgainst({ invoice_number: "INV-1", order_number: "ORD-1", case_number: "CASE-1" })).toBe(
      "INV-1 · ORD-1 · CASE-1",
    );
  });
});

describe("the provisional sheet", () => {
  const office = { name: "Villa Memorial Park", location: "Isabela City, Basilan", phone: "0917 617 8489" };
  const slip = buildProvisionalReceipt(
    {
      payer: "Liwayway Cruz",
      amount_cents: 50_000,
      instrument: "cash",
      reference: "",
      received_on: "2026-09-18",
      against: "INV-2026-00003",
      order_number: "ORD-2026-00003",
      case_number: "CASE-2026-0001",
      notes: "initial payment",
      received_by: "Sam Staff",
      recorded_at: "2026-09-18T04:00:00Z",
    },
    office,
  );

  it("marks itself unmistakably before anything else", () => {
    const text = blockText(slip.blocks);
    expect(slip.title).toBe(PROVISIONAL_RECEIPT_TITLE);
    expect(text).toContain(PROVISIONAL_RECEIPT_TITLE);
    expect(text).toContain(PROVISIONAL_RECEIPT_MARK);
    expect(text).toContain(PROVISIONAL_RECEIPT_NOTE);
    // The title renders in caps on the sheet, above the mark (the renderers apply `caps`).
    const titleLine = slip.blocks.find(
      (block) => block.kind === "line" && block.text === PROVISIONAL_RECEIPT_TITLE,
    );
    expect(titleLine && titleLine.kind === "line" ? titleLine.caps : false).toBe(true);
  });

  it("carries the office's own details and every captured field", () => {
    const text = blockText(slip.blocks);
    expect(text).toContain("Villa Memorial Park");
    expect(text).toContain("Isabela City, Basilan · Tel. 0917 617 8489");
    expect(text).toContain("Received from: Liwayway Cruz");
    expect(text).toContain("Amount received: ₱500.00");
    expect(text).toContain("Date received: 2026-09-18");
    expect(text).toContain("Instrument: Cash");
    expect(text).toContain("Received by: Sam Staff");
    expect(text).toContain("Against: INV-2026-00003 · ORD-2026-00003 · CASE-2026-0001");
    expect(text).toContain("Notes: initial payment");
  });

  it("carries NO receipt number, and blanks print the honest em dash", () => {
    const text = blockText(slip.blocks);
    expect(text).not.toContain("Receipt no.");
    expect(text).not.toContain("OR-");
    expect(text).not.toContain("DOC-");
    expect(text).toContain("Reference no.: —");
  });

  it("names its export stem after what it is and what it settles", () => {
    const stem = provisionalReceiptFileStem({ against: "INV-2026-00003", received_on: "2026-09-18" });
    expect(stem).toBe("Provisional-Receipt-INV-2026-00003-2026-09-18");
    expect(stem).not.toContain("Official");
  });

  it("falls back to the office name alone when no landing document is available", () => {
    const bare = buildProvisionalReceipt({
      amount_cents: 1_000,
      instrument: "cash",
      received_on: "2026-09-18",
      against: "INV-2026-00003",
    });
    const text = blockText(bare.blocks);
    expect(text).toContain("Villa Memorial");
    expect(text).not.toContain("Tel.");
  });

  it("reads the letterhead from the staff-editable landing content", () => {
    const mapped = provisionalReceiptOffice({
      logo: { wordmark: "Villa Memorial Park", markImage: null },
      contact: {
        phoneLabel: "24/7 Assistance Line",
        phoneDisplay: "0917 617 8489",
        phoneHref: "tel:+639176178489",
        location: "Isabela City, Basilan",
      },
    });
    expect(mapped).toEqual(office);
  });
});

describe("the official receipt that replaces the slip", () => {
  const record = {
    invoice_number: "INV-2026-00002",
    order_number: "ORD-2026-00002",
    case_number: null,
  };
  const invoiceForMatch = {
    customer_name: "Roberto Santos",
    order_number: "ORD-2026-00002",
  };

  const paidPayment: RecordedPayment = {
    id: "PAY-2026-00001",
    invoice_number: "INV-2026-00002",
    amount_cents: 2_000,
    method: "gcash",
    reference: "GC-1",
    received_on: "2026-09-18",
    notes: "",
    recorded_at: "2026-09-18T04:00:00Z",
    recorded_by: "Sam Staff",
    receipt_document: {
      id: "00000000-0000-4000-8000-900000000001",
      document_number: "DOC-2026-00007",
      title: "Official Receipt — INV-2026-00002",
      document_type: "receipt",
      related_case_number: null,
      related_order_number: "ORD-2026-00002",
      status: "approved",
      uploaded_by: "Staff portal (Sam Staff)",
      uploaded_at: "2026-09-18T04:00:00Z",
      file_size_bytes: 0,
    },
  };

  it("prefers a recorded payment's receipt and prints its figures", () => {
    const match = officialReceiptForProvisional({
      record,
      payments: [paidPayment],
      documents: [],
      invoice: invoiceForMatch,
    });
    expect(match?.document_number).toBe("DOC-2026-00007");
    expect(match?.document_id).toBe(paidPayment.receipt_document?.id);
    expect(match?.figures?.number).toBe("DOC-2026-00007");
    expect(match?.figures?.payer).toBe("Roberto Santos");
    expect(match?.figures?.amount).toBe("₱20.00");
  });

  it("accepts a repository receipt row that names the invoice in its title", () => {
    const match = officialReceiptForProvisional({
      record: { invoice_number: "INV-2026-00001", order_number: "ORD-2026-00001", case_number: null },
      payments: [],
      documents: [
        {
          id: "00000000-0000-4000-8000-000000000F02",
          document_number: "DOC-2026-00002",
          title: "Official Receipt — INV-2026-00001",
          related_case_number: null,
          related_order_number: "ORD-2026-00001",
          },
      ],
      invoice: { customer_name: "Marites Santos", order_number: "ORD-2026-00001" },
    });
    expect(match?.document_number).toBe("DOC-2026-00002");
    // A repository row carries no amount: the state links to it rather than printing a figure.
    expect(match?.figures).toBeNull();
  });

  it("stays provisional while no receipt names the record", () => {
    expect(
      officialReceiptForProvisional({
        record,
        payments: [{ ...paidPayment, receipt_document: null }],
        documents: [],
        invoice: invoiceForMatch,
      }),
    ).toBeNull();
    expect(
      officialReceiptForProvisional({
        record,
        payments: [],
        documents: [],
        invoice: invoiceForMatch,
      }),
    ).toBeNull();
  });
});
