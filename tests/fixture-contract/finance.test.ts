import { describe, expect, it } from "vitest";
import { getInvoice, listInvoices } from "@/lib/api-client/finance";
import invoicesFile from "@/lib/fixtures/finance/invoices.json";

/**
 * Module E fixture-contract tests. The invoice seed starts CLEAN (captain,
 * 2026-10-02): the recorded demo invoices are removed, so the billing screens
 * begin empty and an invoice is recorded only when the office raises one. The
 * reader and its store fold are unchanged.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("finance fixtures start clean", () => {
  it("carries no recorded invoices", async () => {
    expect(await listInvoices()).toEqual([]);
    expect(invoicesFile.invoices).toEqual([]);
    expect(invoicesFile.tenant_id).toBe("00000000-0000-4000-8000-000000000001");
  });

  it("unknown invoice id → not_found error", async () => {
    await expect(getInvoice("00000000-0000-4000-8000-00000000dead")).rejects.toMatchObject({
      status: 404,
      message: "not_found",
    });
  });

  it("keeps the tenant id a deterministic UUID", () => {
    expect(UUID_RE.test(invoicesFile.tenant_id)).toBe(true);
  });
});
