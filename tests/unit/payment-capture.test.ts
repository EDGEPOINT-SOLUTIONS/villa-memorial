import { describe, expect, it } from "vitest";
import {
  businessToday,
  emptyPaymentCaptureDraft,
  formatRecordedAt,
  INSTRUMENT_LABEL,
  instrumentNeedsReference,
  PAYMENT_INSTRUMENTS,
  paymentAmountCents,
  paymentCaptureFromDraft,
  PROVISIONAL_RECEIPT_NOTE,
  validatePaymentCapture,
  type PaymentCaptureDraft,
} from "@/lib/contracts/payment-capture";
import { buildProvisionalReceipt } from "@/lib/contracts/provisional-receipt";
import { formatMinorUnits } from "@/lib/money";
import type { PaperBlock } from "@/lib/export/types";

/**
 * Record payment → provisional receipt (FORMS_PLAN.md gap 3).
 *
 * These pin the two executable contracts: the capture validation (what a slip must carry
 * before it is recorded) and the receipt's validity note (the slip can never read as an
 * official receipt, and it carries no OR number — numbering and posting are finance's).
 * Nothing here exercises money maths: the model deliberately performs none.
 */

/** Noon in the park on 2026-09-16 (UTC+8). */
const NOW = new Date("2026-09-16T04:00:00Z");

function draft(over: Partial<PaymentCaptureDraft> = {}): PaymentCaptureDraft {
  return {
    amount_text: "12,500.50",
    instrument: "cash",
    reference: "",
    received_on: "2026-09-16",
    against: "CASE-2026-0001",
    notes: "",
    ...over,
  };
}

function capture(over: Partial<PaymentCaptureDraft> = {}) {
  return paymentCaptureFromDraft(
    draft(over),
    "session-payment-1",
    "2026-09-16T04:05:00Z",
  );
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

describe("the six-field slip is validated before a payment is recorded", () => {
  it("asks for the essentials on an untouched draft", () => {
    const errors = validatePaymentCapture(emptyPaymentCaptureDraft(), NOW);
    expect(Object.keys(errors).sort()).toEqual([
      "against",
      "amount_text",
      "instrument",
      "received_on",
    ]);
    // Notes are genuinely optional and the reference only matters for some instruments.
    expect(errors.notes).toBeUndefined();
    expect(errors.reference).toBeUndefined();
  });

  it("takes the amount only as pesos a counter would write", () => {
    expect(paymentAmountCents("12,500.50")).toBe(1_250_050);
    expect(paymentAmountCents("1500")).toBe(150_000);
    expect(paymentAmountCents("abc")).toBeNull();
    expect(paymentAmountCents("1.234")).toBeNull();

    expect(validatePaymentCapture(draft({ amount_text: "12,500.50" }), NOW).amount_text).toBeUndefined();
    expect(validatePaymentCapture(draft({ amount_text: "" }), NOW).amount_text).toMatch(/amount received/i);
    expect(validatePaymentCapture(draft({ amount_text: "0" }), NOW).amount_text).toMatch(/more than zero/i);
    expect(validatePaymentCapture(draft({ amount_text: "abc" }), NOW).amount_text).toMatch(/pesos and centavos/i);
  });

  it("requires the reference for every instrument except cash", () => {
    for (const instrument of PAYMENT_INSTRUMENTS) {
      const errors = validatePaymentCapture(draft({ instrument: instrument.value }), NOW);
      if (instrumentNeedsReference(instrument.value)) {
        expect(errors.reference, instrument.value).toMatch(/reference/i);
      } else {
        expect(errors.reference, instrument.value).toBeUndefined();
      }
    }
    expect(
      validatePaymentCapture(draft({ instrument: "check", reference: "CHK-004512" }), NOW).reference,
    ).toBeUndefined();
  });

  it("keeps the date received on the park's calendar, never the browser's", () => {
    // 07:00 on 16 Sep in Manila is still 15 Sep in UTC — "today" must still be the 16th.
    const earlyManilaMorning = new Date("2026-09-15T23:00:00Z");
    expect(businessToday(earlyManilaMorning)).toBe("2026-09-16");
    expect(validatePaymentCapture(draft(), earlyManilaMorning).received_on).toBeUndefined();

    expect(validatePaymentCapture(draft({ received_on: "" }), NOW).received_on).toMatch(/date/i);
    expect(validatePaymentCapture(draft({ received_on: "2026-02-30" }), NOW).received_on).toMatch(/real date/i);
    expect(validatePaymentCapture(draft({ received_on: "2026-09-17" }), NOW).received_on).toMatch(/future/i);
  });

  it("needs a case or invoice to capture against", () => {
    expect(validatePaymentCapture(draft({ against: "  " }), NOW).against).toMatch(/case or invoice/i);
    expect(validatePaymentCapture(draft({ against: "INV-2026-00003" }), NOW).against).toBeUndefined();
  });
});

describe("a capture is the slip and nothing more", () => {
  it("records the entered amount in minor units with no derived figure", () => {
    const recorded = capture();
    expect(recorded.amount_cents).toBe(1_250_050);
    expect(formatMinorUnits(recorded.amount_cents, "PHP")).toBe("₱12,500.50");
    // The record carries exactly the captured fields — no balance, allocation or posting.
    expect(Object.keys(recorded).sort()).toEqual([
      "against",
      "amount_cents",
      "id",
      "instrument",
      "notes",
      "received_on",
      "recorded_at",
      "reference",
    ]);
  });

  it("trims the written values and keeps the blank ones blank", () => {
    const recorded = capture({ against: " CASE-2026-0001 ", notes: " partial, balance on Friday " });
    expect(recorded.against).toBe("CASE-2026-0001");
    expect(recorded.notes).toBe("partial, balance on Friday");
    expect(recorded.reference).toBe("");
  });

  it("refuses a record that bypassed the form", () => {
    expect(() => capture({ instrument: "" })).toThrow(/instrument/i);
    expect(() => capture({ amount_text: "0" })).toThrow(/positive peso amount/i);
    expect(() => capture({ instrument: "gcash", reference: "" })).toThrow(/reference/i);
    expect(() => capture({ against: "" })).toThrow(/case or invoice/i);
    expect(() => capture({ received_on: "16/09/2026" })).toThrow(/calendar date/i);
  });

  it("stamps the capture at the park's local time", () => {
    expect(formatRecordedAt("2026-09-16T04:05:00Z")).toMatch(/Sep 16, 2026/);
  });
});

describe("the provisional receipt says plainly what it is", () => {
  it("carries the 'valid only when confirmed by an official receipt' note verbatim", () => {
    const receipt = buildProvisionalReceipt(capture());
    expect(PROVISIONAL_RECEIPT_NOTE).toMatch(/valid only when confirmed by an official receipt/i);
    expect(blockText(receipt.blocks)).toContain(PROVISIONAL_RECEIPT_NOTE);
    expect(blockText(receipt.blocks)).toContain("Not an official receipt");
  });

  it("never carries an official-receipt number", () => {
    const text = blockText(buildProvisionalReceipt(capture({ instrument: "cash" })).blocks);
    expect(text).not.toMatch(/O\.?R\.?\s*(no\.?)?\s*\d/i);
    expect(text).not.toMatch(/official receipt no/i);
    expect(text).toMatch(/carries no official receipt number/i);
  });

  it("prints exactly what was captured", () => {
    const text = blockText(buildProvisionalReceipt(capture()).blocks);
    expect(text).toContain("Amount received: ₱12,500.50");
    expect(text).toContain("Instrument: Cash");
    expect(text).toContain("Date received: 2026-09-16");
    expect(text).toContain("Case or invoice: CASE-2026-0001");
    // Cash leaves the reference blank — the receipt prints the honest em dash.
    expect(text).toContain("Reference no.: —");
  });

  it("prints a check's reference and names every instrument", () => {
    const text = blockText(
      buildProvisionalReceipt(capture({ instrument: "check", reference: "CHK-004512" })).blocks,
    );
    expect(text).toContain("Instrument: Check");
    expect(text).toContain("Reference no.: CHK-004512");
    expect(INSTRUMENT_LABEL.bank_transfer).toBe("Bank transfer");
    expect(INSTRUMENT_LABEL.gcash).toBe("GCash");
  });
});
