import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ProvisionalReceiptView,
  RecordPaymentScreen,
} from "@/app/(staff)/staff/billing/record-payment/record-payment-screen";
import {
  PROVISIONAL_RECEIPT_NOTE,
  paymentCaptureFromDraft,
} from "@/lib/contracts/payment-capture";

/**
 * The capture screen renders the shared shell AND its honesty copy. The validity note
 * must appear on the screen itself (not only on the printed slip), because AGENTS.md
 * rule 5 asks every async screen to be honest before merge and the note is the whole
 * point of a provisional receipt.
 */
describe("record-payment capture screen", () => {
  function render(props: Partial<Parameters<typeof RecordPaymentScreen>[0]> = {}) {
    return renderToStaticMarkup(
      <RecordPaymentScreen
        targets={[
          { reference: "INV-2026-00003", label: "INV-2026-00003 — Liwayway Cruz", kind: "invoice" },
          { reference: "CASE-2026-0001", label: "CASE-2026-0001 — Pedro Santos", kind: "case" },
        ]}
        prefill="INV-2026-00003"
        recordsUnavailable={false}
        {...props}
      />,
    );
  }

  it("renders the shared capture shell with the six field inventory", () => {
    const html = render();
    expect(html).toContain("capture-section");
    expect(html).toContain("peso-input");
    expect(html).toContain("field-grid--3");
    for (const id of ["pay-amount", "pay-instrument", "pay-date", "pay-reference", "pay-against", "pay-notes"]) {
      expect(html, id).toContain(`id="${id}"`);
    }
    expect(html).toContain("capture-actions");
  });

  it("states the provisional-receipt validity note plainly", () => {
    const html = render();
    expect(html).toContain(PROVISIONAL_RECEIPT_NOTE);
    expect(html).toContain("valid only when confirmed by an official receipt");
    // The capture writes nowhere yet and says so.
    expect(html).toContain("lives in this browser tab");
  });

  it("prefills the case or invoice from the link that opened it", () => {
    expect(render()).toContain('value="INV-2026-00003"');
    expect(render({ prefill: "CASE-2026-0001" })).toContain('value="CASE-2026-0001"');
    // The picker offers the real records it was handed, and never invents one.
    expect(render()).toContain("Liwayway Cruz");
  });

  it("keeps the slip typable when the record lists could not be loaded", () => {
    const html = render({ targets: [], recordsUnavailable: true, prefill: "" });
    expect(html).toContain("could not be loaded just now");
    expect(html).toContain('id="pay-against"');
  });
});

/**
 * The receipt the capture produces — what the counter hands over. It must read as a
 * provisional slip on screen exactly as it prints, note included.
 */
describe("provisional receipt view", () => {
  const capture = paymentCaptureFromDraft(
    {
      amount_text: "12,500.50",
      instrument: "cash",
      reference: "",
      received_on: "2026-09-16",
      against: "CASE-2026-0001",
      notes: "initial payment",
    },
    "session-payment-1",
    "2026-09-16T04:05:00Z",
  );

  function renderReceipt() {
    return renderToStaticMarkup(
      <ProvisionalReceiptView
        capture={capture}
        sessionCaptures={[capture]}
        onRecordAnother={() => {}}
        onOpenCapture={() => {}}
      />,
    );
  }

  it("prints what was captured and states its validity plainly", () => {
    const html = renderReceipt();
    expect(html).toContain("PROVISIONAL RECEIPT");
    expect(html).toContain("Not an official receipt");
    expect(html).toContain(PROVISIONAL_RECEIPT_NOTE);
    expect(html).toContain("₱12,500.50");
    expect(html).toContain("Instrument: Cash");
    expect(html).toContain("Reference no.: —");
    expect(html).toContain("Case or invoice: CASE-2026-0001");
    // No receipt number is ever minted here — that is finance's. Just the note that says so.
    expect(html).not.toMatch(/O\.?R\.?\s*(no\.?)?\s*\d/i);
  });

  it("says the record is session-only and offers the next action", () => {
    const html = renderReceipt();
    expect(html).toContain("lives in this browser tab");
    expect(html).toContain("Record another payment");
    expect(html).toContain("Back to billing");
    expect(html).toContain("Captured in this session");
  });
});
