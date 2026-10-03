import { describe, expect, it } from "vitest";
import { getCustomer, listCustomers, listInquiries } from "@/lib/api-client/crm";
import customersFile from "@/lib/fixtures/crm/customers.json";
import inquiriesFile from "@/lib/fixtures/crm/inquiries.json";

/**
 * Module A fixture-contract tests. NO frozen API exists yet (crm-families is
 * unbuilt — see lib/api-client/crm.ts). The customer master and the enquiry seed
 * start CLEAN (captain, 2026-10-02): the demo people and recorded front-desk
 * enquiries are removed, and the office board lists only what the public forms
 * and the family plan/lot gate actually recorded
 * (lib/api-client/inquiry-store.ts). These assertions pin that clean state and
 * the documented vocabulary (docs/04-modules/crm-cases.md blueprint §25–26 +
 * commerce-catalog.md §33).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("crm fixtures start clean", () => {
  it("carries no recorded customers or families", async () => {
    expect(await listCustomers()).toEqual([]);
    expect(customersFile.customers).toEqual([]);
    expect(customersFile.families).toEqual([]);
    expect(customersFile.tenant_id).toBe("00000000-0000-4000-8000-000000000001");
  });

  it("carries no recorded front-desk enquiries", async () => {
    expect(await listInquiries()).toEqual([]);
    expect(inquiriesFile.inquiries).toEqual([]);
  });

  it("unknown customer id → not_found error", async () => {
    await expect(getCustomer("00000000-0000-4000-8000-00000000dead")).rejects.toMatchObject({
      status: 404,
      message: "not_found",
    });
  });

  it("keeps the tenant id a deterministic UUID", () => {
    expect(UUID_RE.test(customersFile.tenant_id)).toBe(true);
  });
});
