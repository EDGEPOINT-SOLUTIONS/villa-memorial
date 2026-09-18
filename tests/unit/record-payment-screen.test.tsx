import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RecordPaymentScreen } from "@/app/(staff)/staff/billing/record-payment/record-payment-screen";
import { NO_RECEIPT_NOTE } from "@/lib/billing-payments";
import { PROVISIONAL_RECEIPT_NOTE } from "@/lib/contracts/payment-capture";
import { provisionalReceiptFileStem } from "@/lib/contracts/provisional-receipt";
import type { Invoice } from "@/lib/api-client/finance";
import type { RecordedPayment } from "@/lib/billing-payments";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }),
}));

/**
 * The counter screen answers at a glance — the invoice's state, what is owed, and the action
 * — and it prints the OFFICIAL receipt of a recorded payment from the recorded figures only.
 * Where there is no receipt to print it says so in those words rather than printing a guess.
 */

const invoice: Invoice = {
  id: "00000000-0000-4000-8000-000000000E03",
  invoice_number: "INV-2026-00003",
  customer_name: "Liwayway Cruz",
  order_number: "ORD-2026-00003",
  total_cents: 180_000,
  paid_cents: 80_000,
  currency: "PHP",
  status: "partial",
  issued_at: "2026-05-01T08:00:00Z",
  due_at: "2026-05-15T08:00:00Z",
  aging_bucket: "91-120",
};

function paid(over: Partial<RecordedPayment> = {}): RecordedPayment {
  return {
    id: "PAY-2026-00001",
    invoice_number: invoice.invoice_number,
    amount_cents: 80_000,
    method: "gcash",
    reference: "GC-88213",
    received_on: "2026-09-18",
    notes: "",
    recorded_at: "2026-09-18T04:00:00.000Z",
    recorded_by: "Sam Staff",
    receipt_document: {
      id: "00000000-0000-4000-8000-900000000000",
      document_number: "DOC-2026-00007",
      title: "Official Receipt — INV-2026-00003",
      document_type: "receipt",
      related_case_number: null,
      related_order_number: "ORD-2026-00003",
      status: "approved",
      uploaded_by: "Staff portal (Sam Staff)",
      uploaded_at: "2026-09-18T04:00:00.000Z",
      file_size_bytes: 0,
    },
    ...over,
  };
}

function render(props: Partial<Parameters<typeof RecordPaymentScreen>[0]> = {}) {
  return renderToStaticMarkup(
    <RecordPaymentScreen
      invoice={invoice}
      reference="INV-2026-00003"
      choices={[invoice]}
      payments={[]}
      paymentsListed
      today="2026-09-18"
      {...props}
    />,
  );
}

describe("the invoice at a glance", () => {
  it("shows the state, what is owed and the action in the first screenful", () => {
    const html = render();
    expect(html).toContain("Outstanding");
    expect(html).toContain("₱1,000.00"); // 1,800.00 total less 800.00 paid
    expect(html).toContain("₱800.00"); // paid so far
    expect(html).toContain("Part paid");
    expect(html).toContain("Liwayway Cruz");
    expect(html).toContain("ORD-2026-00003");
    // The form that records it, prefilled with the balance the server reported.
    expect(html).toContain('id="pay-amount"');
    expect(html).toContain('value="1000.00"');
    expect(html).toContain('id="pay-method"');
    expect(html).toContain('id="pay-date"');
    expect(html).toContain('value="2026-09-18"');
    expect(html).toContain("Record payment");
  });

  it("says an invoice is settled instead of offering a dead form", () => {
    const settled = { ...invoice, paid_cents: invoice.total_cents, status: "paid" as const };
    const html = render({ invoice: settled });
    expect(html).toContain("paid in full");
    expect(html).not.toContain('id="pay-amount"');
  });
});

describe("nothing chosen yet", () => {
  it("says plainly that a reference matched nothing, and offers the unpaid invoices", () => {
    const html = render({ invoice: null, reference: "INV-2026-99999", choices: [invoice] });
    expect(html).toContain("No invoice matches that reference");
    expect(html).toContain("INV-2026-99999");
    expect(html).toContain("Record a payment against INV-2026-00003");
    expect(html).not.toContain('id="pay-amount"');
  });

  it("says there is nothing outstanding when every invoice is paid", () => {
    const html = render({ invoice: null, reference: "", choices: [] });
    expect(html).toContain("Every invoice is paid in full");
    expect(html).not.toContain("No invoice matches that reference");
  });
});

describe("the receipt of a recorded payment", () => {
  it("prints the official receipt from the recorded figures", () => {
    const html = render({ payments: [paid()] });
    expect(html).toContain("OFFICIAL RECEIPT");
    expect(html).toContain("Office copy");
    expect(html).toContain("DOC-2026-00007");
    expect(html).toContain("18 September 2026");
    expect(html).toContain("₱800.00");
    expect(html).toContain("Received from: Liwayway Cruz");
    expect(html).toContain("GCash · GC-88213");
    // The repository and the family hold the same receipt number.
    expect(html).toContain("documents repository lists the same receipt number");
  });

  it("says plainly when there is no official receipt, and prints no receipt number", () => {
    const html = render({ payments: [paid({ receipt_document: null })] });
    expect(html).toContain("No official receipt for this payment");
    expect(html).toContain(NO_RECEIPT_NOTE);
    // The counter still gets the clearly-labelled slip — which says what it is not.
    expect(html).toContain("Not an official receipt");
    expect(html).toContain(PROVISIONAL_RECEIPT_NOTE);
    expect(html).not.toContain("Receipt no.:");
    expect(html).toContain("No receipt issued");
    // The slip carries the payer and the receiver the recorded data holds — no blank rows.
    expect(html).toContain("Received from: Liwayway Cruz");
    expect(html).toContain("Received by: Sam Staff");
    expect(html).toContain("Against: INV-2026-00003 · ORD-2026-00003");
  });

  it("downloads the fallback slip as a provisional slip, never as an official receipt", () => {
    // The screen picks the filename; a slip that says "not an official receipt" on its face
    // must not leave the counter named like one.
    const stem = provisionalReceiptFileStem({
      against: "INV-2026-00003",
      received_on: "2026-09-18",
    });
    expect(stem).toBe("Provisional-Receipt-INV-2026-00003-2026-09-18");
    expect(stem).not.toContain("Official-Receipt");
  });

  it("lists what was recorded, with the instrument and who took it", () => {
    const html = render({ payments: [paid()] });
    expect(html).toContain("Payments recorded");
    expect(html).toContain("GCash");
    expect(html).toContain("GC-88213");
    expect(html).toContain("Showing DOC-2026-00007");
  });

  it("does not claim the family paid nothing when the mode cannot list payments", () => {
    const html = render({ payments: [], paymentsListed: false });
    expect(html).toContain("does not list an invoice&#x27;s payments");
    expect(html).not.toContain("Nothing has been recorded against");
  });

  it("does not confuse a settled balance with a payment this screen recorded", () => {
    const settled = { ...invoice, paid_cents: invoice.total_cents, status: "paid" as const };
    const html = render({ invoice: settled, payments: [] });
    expect(html).toContain("the balance came to us already settled");
    expect(html).not.toContain("Nothing has been recorded against");
  });
});
