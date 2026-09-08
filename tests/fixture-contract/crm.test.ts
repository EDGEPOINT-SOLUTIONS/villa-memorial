import { describe, expect, it } from "vitest";
import {
  getCustomer,
  listCustomers,
  listInquiries,
} from "@/lib/api-client/crm";
import customersFile from "@/lib/fixtures/crm/customers.json";
import inquiriesFile from "@/lib/fixtures/crm/inquiries.json";

/**
 * Module A fixture-contract tests. NO frozen API exists yet (crm-families is
 * unbuilt), so these pin the UI demo data to the documented domain shapes
 * (docs/04-modules/crm-cases.md blueprint §25–26 + commerce-catalog.md §33)
 * so screens can't drift silently from the spec vocabulary.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("crm fixtures follow the documented domain shapes", () => {
  it("customers carry identity + contact + family linkage fields", async () => {
    const customers = await listCustomers();
    expect(customers.length).toBeGreaterThan(0);
    for (const c of customers) {
      expect(c.id).toMatch(UUID_RE);
      expect(c.first_name.length).toBeGreaterThan(0);
      expect(c.last_name.length).toBeGreaterThan(0);
      expect(c.email).toContain("@");
      expect(["active", "inactive"]).toContain(c.status);
      expect(() => new Date(c.registered_at).toISOString()).not.toThrow();
    }
    expect(customersFile.tenant_id).toBe("00000000-0000-4000-8000-000000000001");
  });

  it("family accounts reference real members with relationship labels", async () => {
    const { customer, family } = await getCustomer(
      "00000000-0000-4000-8000-000000000101",
    );
    expect(customer.last_name).toBe("Santos");
    expect(family).not.toBeNull();
    expect(family!.members.length).toBeGreaterThan(0);
    for (const m of family!.members) {
      expect(m.customer_id).toMatch(UUID_RE);
      expect(m.relationship.length).toBeGreaterThan(0);
    }
  });

  it("unknown customer id → not_found error", async () => {
    await expect(getCustomer("00000000-0000-4000-8000-00000000dead")).rejects.toMatchObject({
      status: 404,
      message: "not_found",
    });
  });

  it("inquiry sources stay within the documented lead-source enum", async () => {
    const allowed = [
      "website",
      "facebook",
      "messenger",
      "walk_in",
      "referral",
      "phone",
      "agent",
      "event",
      "ads",
    ];
    const inquiries = await listInquiries();
    expect(inquiries.length).toBe(inquiriesFile.inquiries.length);
    for (const i of inquiries) {
      expect(allowed).toContain(i.source);
      expect(["new", "contacted", "qualified", "converted", "closed"]).toContain(i.status);
      expect(i.reference).toMatch(/^INQ-\d{4}-\d{5}$/);
    }
  });
});
