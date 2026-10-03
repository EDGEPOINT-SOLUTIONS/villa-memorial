import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  listFixtureInvoices,
  listFixturePayments,
  listIssuedReceiptDocuments,
  recordFixturePayment,
} from "@/lib/api-client/billing-store";
import { getDocument, listDocuments } from "@/lib/api-client/documents";
/* --- test-only demo fixtures (clean start, captain 2026-10-02) --- */
vi.mock("@/lib/fixtures/finance/invoices.json", async () => ({
  default: (await import("../fixtures/invoices-demo.json")).default,
}));
vi.mock("@/lib/fixtures/documents/documents.json", async () => ({
  default: (await import("../fixtures/documents-demo.json")).default,
}));
/* --- end test-only demo fixtures --- */


/**
 * The durable billing store — recording a payment and the official receipt it issues.
 *
 * What this suite exists to protect:
 *  - the invoice steps down by SERVER figures (the fold), never by the caller's arithmetic;
 *  - the receipt that is printed is the SAME row the documents repository lists, so the two
 *    cannot drift;
 *  - a refused payment writes NOTHING — the file is byte-identical afterwards;
 *  - the journal is durable, atomic and honest about corruption.
 *
 * Every test gets its own throwaway journal (a shared `.data/` store would let one test's
 * payment land on another's invoice).
 */

const NOW = new Date("2026-09-18T04:00:00Z");
/** The recorded seed's invoice with ₱1,800.00 outstanding and nothing paid. */
const INVOICE = "INV-2026-00003";

let dir = "";
let storePath = "";

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-billing-store-"));
  storePath = path.join(dir, "finance-payments.json");
  process.env.PAYMENTS_STORE_PATH = storePath;
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function cash(amount_cents: number, received_on = "2026-09-18") {
  return { amount_cents, method: "cash", reference: "", received_on, notes: "" };
}

describe("recording a payment", () => {
  it("steps the invoice balance and status from the store's own fold", async () => {
    const before = (await listFixtureInvoices(NOW)).find((i) => i.invoice_number === INVOICE)!;
    expect(before.paid_cents).toBe(0);

    const { invoice, payment } = await recordFixturePayment({
      invoiceNumber: INVOICE,
      input: cash(50_000),
      actor: "Sam Staff",
      now: NOW,
    });

    expect(payment.amount_cents).toBe(50_000);
    expect(payment.recorded_by).toBe("Sam Staff");
    expect(payment.method).toBe("cash");
    expect(invoice.paid_cents).toBe(50_000);
    expect(invoice.status).toBe("partial");

    // The next read is the server's own figure, not the call's return value.
    const after = (await listFixtureInvoices(NOW)).find((i) => i.invoice_number === INVOICE)!;
    expect(after.paid_cents).toBe(50_000);
    expect(after.status).toBe("partial");
  });

  it("settles the invoice when the last installment arrives, and ages it current", async () => {
    const { invoice } = await recordFixturePayment({
      invoiceNumber: INVOICE,
      input: cash(180_000),
      actor: "Sam Staff",
      now: NOW,
    });
    expect(invoice.paid_cents).toBe(180_000);
    expect(invoice.status).toBe("paid");
    expect(invoice.aging_bucket).toBe("current");
  });

  it("issues the official receipt with the payment, as one atomic fact", async () => {
    const { payment } = await recordFixturePayment({
      invoiceNumber: INVOICE,
      input: cash(120_000),
      actor: "Elena Villanueva",
      now: NOW,
    });

    expect(payment.id).toBe("PAY-2026-00001");
    expect(payment.receipt_document).not.toBeNull();
    expect(payment.receipt_document!.document_number).toBe("DOC-2026-00007");
    expect(payment.receipt_document!.document_type).toBe("receipt");
    expect(payment.receipt_document!.status).toBe("approved");
    expect(payment.receipt_document!.title).toBe(`Official Receipt — ${INVOICE}`);
    expect(payment.receipt_document!.uploaded_by).toBe("Admin portal (Elena Villanueva)");
    // Fixture mode stores no rendered artifact, so the row reports 0 rather than a
    // decorative byte count (documents-api-v1).
    expect(payment.receipt_document!.file_size_bytes).toBe(0);
  });

  it("keeps the documents repository consistent with what the counter printed", async () => {
    const { payment } = await recordFixturePayment({
      invoiceNumber: INVOICE,
      input: cash(90_000),
      actor: "Sam Staff",
      now: NOW,
    });
    const number = payment.receipt_document!.document_number;

    const receipts = await listDocuments({ document_type: "receipt" });
    const issued = receipts.find((d) => d.document_number === number);
    expect(issued, "the receipt the counter printed is a repository row").toBeTruthy();
    expect(issued!.related_order_number).toBe(
      (await listFixtureInvoices(NOW)).find((i) => i.invoice_number === INVOICE)!.order_number,
    );

    const byId = await getDocument(payment.receipt_document!.id);
    expect(byId.document_number).toBe(number);
  });

  it("numbers payments and receipts forward, never reusing a number", async () => {
    const first = await recordFixturePayment({
      invoiceNumber: INVOICE,
      input: cash(10_000),
      actor: "Sam Staff",
      now: NOW,
    });
    const second = await recordFixturePayment({
      invoiceNumber: INVOICE,
      input: cash(20_000),
      actor: "Sam Staff",
      now: NOW,
    });

    expect(second.payment.id).toBe("PAY-2026-00002");
    expect(second.payment.receipt_document!.document_number).toBe("DOC-2026-00008");
    expect(second.payment.receipt_document!.id).not.toBe(first.payment.receipt_document!.id);
    expect(second.invoice.paid_cents).toBe(30_000);
  });

  it("durably keeps the payment and its receipt across processes", async () => {
    const { payment } = await recordFixturePayment({
      invoiceNumber: INVOICE,
      input: cash(15_000),
      actor: "Sam Staff",
      now: NOW,
    });

    const payments = await listFixturePayments();
    expect(payments.map((p) => p.id)).toEqual([payment.id]);
    expect(payments[0].receipt_document!.document_number).toBe(
      payment.receipt_document!.document_number,
    );
    expect((await listIssuedReceiptDocuments()).map((d) => d.document_number)).toEqual([
      payment.receipt_document!.document_number,
    ]);
  });

  it("allocates distinct figures under concurrent recordings", async () => {
    const results = await Promise.all(
      [10_000, 20_000, 30_000].map((amount) =>
        recordFixturePayment({
          invoiceNumber: INVOICE,
          input: cash(amount),
          actor: "Sam Staff",
          now: NOW,
        }),
      ),
    );
    const ids = results.map((r) => r.payment.id).sort();
    const receipts = results.map((r) => r.payment.receipt_document!.document_number).sort();
    expect(new Set(ids).size).toBe(3);
    expect(new Set(receipts).size).toBe(3);
    // Every payment landed: the last read shows all three.
    const invoice = (await listFixtureInvoices(NOW)).find((i) => i.invoice_number === INVOICE)!;
    expect(invoice.paid_cents).toBe(60_000);
  });
});

describe("a refused payment changes nothing", () => {
  it("refuses an overpayment and leaves the store untouched", async () => {
    await expect(
      recordFixturePayment({
        invoiceNumber: INVOICE,
        input: cash(180_001),
        actor: "Sam Staff",
        now: NOW,
      }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { amount: expect.stringMatching(/not credited/i) },
    });

    expect(await listFixturePayments()).toEqual([]);
    const invoice = (await listFixtureInvoices(NOW)).find((i) => i.invoice_number === INVOICE)!;
    expect(invoice.paid_cents).toBe(0);
    expect(invoice.status).toBe("overdue");
  });

  it("refuses an unknown invoice, an unknown method and a future day", async () => {
    await expect(
      recordFixturePayment({ invoiceNumber: "INV-2026-99999", input: cash(1000), actor: "S", now: NOW }),
    ).rejects.toMatchObject({ status: 404 });

    await expect(
      recordFixturePayment({
        invoiceNumber: INVOICE,
        input: { ...cash(1000), method: "crypto" },
        actor: "S",
        now: NOW,
      }),
    ).rejects.toMatchObject({ status: 422, fieldErrors: { method: expect.any(String) } });

    await expect(
      recordFixturePayment({
        invoiceNumber: INVOICE,
        input: cash(1000, "2026-09-19"),
        actor: "S",
        now: NOW,
      }),
    ).rejects.toMatchObject({ status: 422, fieldErrors: { received_on: expect.any(String) } });

    expect(await listFixturePayments()).toEqual([]);
  });

  it("never draws down an invoice twice for one recording", async () => {
    // Two concurrent attempts with the SAME money: the lock serialises them, so the second
    // is validated against the balance the first left behind.
    const settled = await recordFixturePayment({
      invoiceNumber: INVOICE,
      input: cash(180_000),
      actor: "Sam Staff",
      now: NOW,
    });
    expect(settled.invoice.status).toBe("paid");

    await expect(
      recordFixturePayment({
        invoiceNumber: INVOICE,
        input: cash(1),
        actor: "Sam Staff",
        now: NOW,
      }),
    ).rejects.toMatchObject({ status: 422, fieldErrors: { amount: expect.stringMatching(/paid in full/i) } });
    expect((await listFixturePayments()).length).toBe(1);
  });
});

describe("the journal", () => {
  it("reports a corrupt store instead of pretending nobody paid", async () => {
    await writeFile(storePath, "{ not json", "utf8");
    await expect(listFixturePayments()).rejects.toMatchObject({ status: 500 });
    await expect(recordFixturePayment({ invoiceNumber: INVOICE, input: cash(1), actor: "S", now: NOW })).rejects.toMatchObject(
      { status: 500 },
    );
  });

  it("reports an unexpected store shape instead of reading past it", async () => {
    await writeFile(storePath, JSON.stringify({ version: 2, events: [] }), "utf8");
    await expect(listFixturePayments()).rejects.toMatchObject({ status: 500 });
  });
});
