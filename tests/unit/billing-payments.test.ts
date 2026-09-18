import { describe, expect, it } from "vitest";
import {
  amountInputValue,
  emptyPaymentDraft,
  findInvoiceByReference,
  foldPaymentsIntoInvoice,
  normaliseReference,
  outstandingCents,
  receiptFiguresForPayment,
  validatePaymentDraft,
  validatePaymentInput,
  type PaymentDraft,
  type RecordedPayment,
} from "@/lib/billing-payments";

/**
 * The rules behind "the family just handed over ₱X" — pure, clock-explicit and shared by the
 * form, the BFF route and the store. The point of this suite is that the refusals are exact:
 * a rejected payment changes nothing and says what failed, so a counter clerk can never
 * believe money was recorded when it was not.
 */

const NOW = new Date("2026-09-18T04:00:00Z"); // 2026-09-18 12:00 at the park

/** INV-2026-00003 as the recorded seed has it: 180,000.00 unowed, nothing paid. */
const invoice = {
  invoice_number: "INV-2026-00003",
  customer_name: "Liwayway Cruz",
  order_number: null as string | null,
  total_cents: 18_000_000,
  paid_cents: 0,
  currency: "PHP",
  due_at: "2026-05-15T08:00:00Z",
};

function validInput(over: Record<string, unknown> = {}) {
  return {
    amount_cents: 500_000,
    method: "cash",
    reference: "",
    received_on: "2026-09-18",
    notes: "",
    ...over,
  };
}

function draft(over: Partial<PaymentDraft> = {}): PaymentDraft {
  return { ...emptyPaymentDraft("2026-09-18"), amount_text: "5,000.00", method: "cash", ...over };
}

describe("what an invoice still owes", () => {
  it("is the difference, and never a credit", () => {
    expect(outstandingCents({ total_cents: 1000, paid_cents: 400 })).toBe(600);
    expect(outstandingCents({ total_cents: 1000, paid_cents: 1000 })).toBe(0);
    expect(outstandingCents({ total_cents: 1000, paid_cents: 1200 })).toBe(0);
  });
});

describe("the payment rules", () => {
  it("accepts a peso amount that the invoice can absorb", () => {
    const result = validatePaymentInput(validInput(), invoice, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input).toEqual({
        amount_cents: 500_000,
        method: "cash",
        reference: "",
        received_on: "2026-09-18",
        notes: "",
      });
    }
  });

  it("refuses an amount that is not money, or not money at all", () => {
    expect(validatePaymentInput(validInput({ amount_cents: 0 }), invoice, NOW)).toMatchObject({
      ok: false,
      errors: { amount: expect.stringMatching(/more than zero/i) },
    });
    expect(validatePaymentInput(validInput({ amount_cents: -1 }), invoice, NOW)).toMatchObject({
      ok: false,
      errors: { amount: expect.stringMatching(/more than zero/i) },
    });
    expect(validatePaymentInput(validInput({ amount_cents: 1.5 }), invoice, NOW)).toMatchObject({
      ok: false,
      errors: { amount: expect.any(String) },
    });
    expect(validatePaymentInput(validInput({ amount_cents: "5000" }), invoice, NOW)).toMatchObject({
      ok: false,
      errors: { amount: expect.any(String) },
    });
  });

  it("refuses an overpayment and names the outstanding figure", () => {
    const result = validatePaymentInput(validInput({ amount_cents: 18_000_001 }), invoice, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.amount).toContain("₱180,000.00");
      expect(result.errors.amount).toContain("INV-2026-00003");
      expect(result.errors.amount).toMatch(/not credited/i);
    }
  });

  it("refuses any payment once the invoice is paid in full", () => {
    const settled = { ...invoice, paid_cents: invoice.total_cents };
    const result = validatePaymentInput(validInput(), settled, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.amount).toMatch(/paid in full/i);
    }
  });

  it("accepts exactly the outstanding balance — the last payment is legal", () => {
    expect(validatePaymentInput(validInput({ amount_cents: 18_000_000 }), invoice, NOW).ok).toBe(
      true,
    );
  });

  it("requires an instrument the slip offers, and the reference that instrument carries", () => {
    expect(validatePaymentInput(validInput({ method: "" }), invoice, NOW)).toMatchObject({
      ok: false,
      errors: { method: expect.stringMatching(/how the payment arrived/i) },
    });
    expect(validatePaymentInput(validInput({ method: "crypto" }), invoice, NOW)).toMatchObject({
      ok: false,
      errors: { method: expect.any(String) },
    });
    expect(
      validatePaymentInput(validInput({ method: "check", reference: "" }), invoice, NOW),
    ).toMatchObject({
      ok: false,
      errors: { reference: expect.stringMatching(/check payment needs the reference/i) },
    });
    expect(
      validatePaymentInput(validInput({ method: "check", reference: "CHK-004512" }), invoice, NOW)
        .ok,
    ).toBe(true);
    // Cash arrives without a reference and is not asked for one.
    expect(validatePaymentInput(validInput({ method: "cash", reference: "" }), invoice, NOW).ok).toBe(
      true,
    );
  });

  it("requires a real day that has already happened", () => {
    expect(validatePaymentInput(validInput({ received_on: "" }), invoice, NOW)).toMatchObject({
      ok: false,
      errors: { received_on: expect.stringMatching(/date/i) },
    });
    expect(validatePaymentInput(validInput({ received_on: "2026-02-30" }), invoice, NOW)).toMatchObject({
      ok: false,
      errors: { received_on: expect.stringMatching(/real date/i) },
    });
    expect(validatePaymentInput(validInput({ received_on: "2026-09-19" }), invoice, NOW)).toMatchObject({
      ok: false,
      errors: { received_on: expect.stringMatching(/future/i) },
    });
    // "Today" is the park's calendar day, not the browser's: 04:00Z is already the 18th in Manila.
    expect(validatePaymentInput(validInput({ received_on: "2026-09-18" }), invoice, NOW).ok).toBe(true);
    expect(validatePaymentInput(validInput({ received_on: "2026-09-17" }), invoice, NOW).ok).toBe(true);
  });

  it("returns every failing field at once, so the form can mark them all", () => {
    const result = validatePaymentInput(
      { amount_cents: 0, method: "", received_on: "", reference: "" },
      invoice,
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual([
        "amount",
        "method",
        "received_on",
      ]);
    }
  });
});

describe("the form's own draft", () => {
  it("parses the pesos the counter typed and then runs the same rules", () => {
    const result = validatePaymentDraft(draft({ amount_text: "12,500.50" }), invoice, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.input.amount_cents).toBe(1_250_050);
  });

  it("reports a blank or nonsensical amount on the amount control, not as a rule failure", () => {
    expect(validatePaymentDraft(draft({ amount_text: "" }), invoice, NOW)).toMatchObject({
      ok: false,
      errors: { amount: expect.stringMatching(/enter the amount received/i) },
    });
    expect(validatePaymentDraft(draft({ amount_text: "abc" }), invoice, NOW)).toMatchObject({
      ok: false,
      errors: { amount: expect.stringMatching(/pesos and centavos/i) },
    });
  });

  it("prefills the amount field from a figure the server reported", () => {
    expect(amountInputValue(18_000_000)).toBe("180000.00");
    expect(amountInputValue(1)).toBe("0.01");
    expect(amountInputValue(-5)).toBe("0.00");
  });
});

describe("folding recorded payments into an invoice", () => {
  function payment(amount_cents: number): RecordedPayment {
    return {
      id: `PAY-2026-${amount_cents}`,
      invoice_number: invoice.invoice_number,
      amount_cents,
      method: "cash",
      reference: "",
      received_on: "2026-09-18",
      notes: "",
      recorded_at: "2026-09-18T04:00:00.000Z",
      recorded_by: "Sam Staff",
      receipt_document: null,
    };
  }

  it("leaves an invoice no payment touched exactly as recorded", () => {
    const untouched = { ...invoice, status: "overdue" as const, aging_bucket: "61-90" as const };
    expect(foldPaymentsIntoInvoice(untouched, [], NOW)).toBe(untouched);
  });

  it("steps the balance and derives the status through the frozen rules", () => {
    const partial = foldPaymentsIntoInvoice(
      { ...invoice, status: "overdue" as const, aging_bucket: "61-90" as const },
      [payment(5_000_000)],
      NOW,
    );
    expect(partial.paid_cents).toBe(5_000_000);
    expect(partial.status).toBe("partial");

    const settled = foldPaymentsIntoInvoice(
      { ...invoice, status: "overdue" as const, aging_bucket: "61-90" as const },
      [payment(18_000_000)],
      NOW,
    );
    expect(settled.paid_cents).toBe(18_000_000);
    expect(settled.status).toBe("paid");
    // A paid invoice is not owed, so it cannot be aged.
    expect(settled.aging_bucket).toBe("current");
  });

  it("never lets a part-paid invoice read as overdue — its lateness is the aging bucket", () => {
    const folded = foldPaymentsIntoInvoice(
      { ...invoice, status: "overdue" as const, aging_bucket: "61-90" as const },
      [payment(1_000_000)],
      NOW,
    );
    expect(folded.status).toBe("partial");
    expect(["61-90", "91-120", "120+"]).toContain(folded.aging_bucket);
  });
});

describe("the receipt a recorded payment has", () => {
  const base: RecordedPayment = {
    id: "PAY-2026-00001",
    invoice_number: "INV-2026-00003",
    amount_cents: 500_000,
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
      related_order_number: null,
      status: "approved",
      uploaded_by: "Staff portal (Sam Staff)",
      uploaded_at: "2026-09-18T04:00:00.000Z",
      file_size_bytes: 0,
    },
  };

  const payer = { customer_name: "Liwayway Cruz", order_number: "ORD-2026-00003" };

  it("prints the recorded figures, and what it covers names the invoice and order", () => {
    const figures = receiptFiguresForPayment(base, payer);
    expect(figures).toMatchObject({
      number: "DOC-2026-00007",
      received_on: "2026-09-18",
      amount: "₱5,000.00",
      covers: "INV-2026-00003 · ORD-2026-00003",
      payer: "Liwayway Cruz",
      received_by: "Sam Staff",
      method: "GCash",
      reference: "GC-88213",
    });
  });

  it("has NO receipt when finance issued none — the null the screen prints honestly", () => {
    expect(receiptFiguresForPayment({ ...base, receipt_document: null }, payer)).toBeNull();
    expect(
      receiptFiguresForPayment(
        {
          ...base,
          receipt_document: { ...base.receipt_document!, document_number: "  " },
        },
        payer,
      ),
    ).toBeNull();
  });
});

describe("which invoice a counter reference means", () => {
  const invoices = [
    { invoice_number: "INV-2026-00001", order_number: "ORD-2026-00001" },
    { invoice_number: "INV-2026-00003", order_number: null as string | null },
  ];

  it("normalises what a link handed the screen", () => {
    expect(normaliseReference(" inv-2026-00003 ")).toBe("INV-2026-00003");
    expect(normaliseReference(undefined)).toBe("");
  });

  it("resolves an invoice number and an order number, and says nothing when neither matches", () => {
    expect(findInvoiceByReference(invoices, "INV-2026-00003")?.invoice_number).toBe(
      "INV-2026-00003",
    );
    expect(findInvoiceByReference(invoices, "ORD-2026-00001")?.invoice_number).toBe(
      "INV-2026-00001",
    );
    expect(findInvoiceByReference(invoices, "")).toBeNull();
    expect(findInvoiceByReference(invoices, "CASE-2026-0001")).toBeNull();
  });
});
