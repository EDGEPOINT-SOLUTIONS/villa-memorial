import { describe, expect, it } from "vitest";
import { getInvoice, listInvoices } from "@/lib/api-client/finance";
import invoicesFile from "@/lib/fixtures/finance/invoices.json";

/**
 * Module E fixture-contract tests. The recorded invoice seed must stay in the documented
 * domain shapes (docs/04-modules/finance-billing.md), and the store's fold over it must keep
 * them: an invoice no payment touches is returned exactly as recorded, so these pins are
 * about the seed rather than about the derivation (which `billing-derive.test.ts` owns).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("finance fixtures follow the documented domain shapes", () => {
  it("invoices carry financial + aging fields", async () => {
    const invoices = await listInvoices();
    expect(invoices.length).toBeGreaterThan(0);
    for (const i of invoices) {
      expect(i.id).toMatch(UUID_RE);
      expect(i.invoice_number).toMatch(/^INV-\d{4}-\d{5}$/);
      expect(i.customer_name.length).toBeGreaterThan(0);
      expect(i.total_cents).toBeGreaterThan(0);
      expect(i.paid_cents).toBeGreaterThanOrEqual(0);
      expect(i.paid_cents).toBeLessThanOrEqual(i.total_cents);
      expect(i.currency).toBe("PHP");
      expect(["pending", "paid", "overdue", "partial"]).toContain(i.status);
      expect(["current", "1-30", "31-60", "61-90", "91-120", "120+"]).toContain(i.aging_bucket);
      expect(() => new Date(i.issued_at).toISOString()).not.toThrow();
      expect(() => new Date(i.due_at).toISOString()).not.toThrow();
    }
    expect(invoicesFile.tenant_id).toBe("00000000-0000-4000-8000-000000000001");
  });

  it("invoice by id returns a single record", async () => {
    const invoice = await getInvoice("00000000-0000-4000-8000-000000000E01");
    expect(invoice.invoice_number).toBe("INV-2026-00001");
    expect(invoice.status).toBe("paid");
  });

  it("unknown invoice id → not_found error", async () => {
    await expect(getInvoice("00000000-0000-4000-8000-00000000dead")).rejects.toMatchObject({
      status: 404,
      message: "not_found",
    });
  });

  it("paid invoices have paid_cents equal to total_cents", async () => {
    const invoices = await listInvoices();
    const paid = invoices.filter((i) => i.status === "paid");
    expect(paid.length).toBeGreaterThan(0);
    for (const i of paid) {
      expect(i.paid_cents).toBe(i.total_cents);
    }
  });

  it("overdue invoices have paid_cents less than total_cents", async () => {
    const invoices = await listInvoices();
    const overdue = invoices.filter((i) => i.status === "overdue");
    expect(overdue.length).toBeGreaterThan(0);
    for (const i of overdue) {
      expect(i.paid_cents).toBeLessThan(i.total_cents);
    }
  });
});
