import { describe, expect, it } from "vitest";
import { activeNavHref, hasAnyScope, STAFF_NAV, visibleNav } from "@/lib/rbac/nav";

const STAFF_SCOPES = [
  "tenancy:modules:read",
  "catalog:read",
  "catalog:write",
  "orders:read",
  "orders:write",
  "billing:read",
  "billing:write",
  "cases:read",
  "cases:write",
  "scheduling:read",
  "scheduling:write",
  "property:read",
  "property:write",
  "hr:read",
  "hr:write",
  "documents:read",
  "documents:write",
  "accounting:read",
  "accounting:post",
  "tenancy:tenants:manage",
  "identity:roles:read",
];

const CUSTOMER_SCOPES = ["tenancy:modules:read", "catalog:read"];

function labels(sections: ReturnType<typeof visibleNav>): string[] {
  return sections.flatMap((s) => s.items.map((i) => i.label));
}

describe("visibleNav", () => {
  it("shows every item for a full-permission admin", () => {
    const all = labels(visibleNav(["identity:users:manage", "audit:events:read", ...STAFF_SCOPES]));
    for (const section of STAFF_NAV) {
      for (const item of section.items) {
        expect(all).toContain(item.label);
      }
    }
  });

  it("renders role-differentiated navs: staff vs customer", () => {
    const staff = labels(visibleNav(STAFF_SCOPES));
    expect(staff).toContain("Catalog");
    expect(staff).toContain("Orders");
    expect(staff).toContain("Billing & collections");
    expect(staff).toContain("Cases");
    expect(staff).toContain("Staff directory");
    expect(staff).toContain("Documents");
    expect(staff).toContain("Customers"); // Relationships section (cases:read)
    expect(staff).toContain("Inquiries");
    expect(staff).not.toContain("Users & roles");
    expect(staff).not.toContain("Audit trail");

    const customer = labels(visibleNav(CUSTOMER_SCOPES));
    expect(customer).toEqual(["Dashboard", "Catalog"]);
  });

  it("always shows scope-free items and hides empty sections", () => {
    const none = visibleNav([]);
    expect(labels(none)).toEqual(["Dashboard"]);
  });
});

describe("hasAnyScope", () => {
  it("any-of semantics; no requirement means always allowed", () => {
    expect(hasAnyScope(["orders:read"], ["orders:read", "orders:write"])).toBe(true);
    expect(hasAnyScope([], ["orders:read"])).toBe(false);
    expect(hasAnyScope([], [])).toBe(true);
  });
});

describe("activeNavHref — the one current entry", () => {
  it("lights a nested page's own entry, not its parent", () => {
    expect(activeNavHref("/staff/plans/membership", STAFF_NAV)).toBe(
      "/staff/plans/membership",
    );
  });

  it("keeps the nested section active through a drill-down", () => {
    expect(activeNavHref("/staff/plans/membership/3", STAFF_NAV)).toBe(
      "/staff/plans/membership",
    );
  });

  it("keeps the parent entry active for its own sub-pages", () => {
    expect(activeNavHref("/staff/cases/123", STAFF_NAV)).toBe("/staff/cases");
    expect(activeNavHref("/staff/landing/service-entry/transport", STAFF_NAV)).toBe(
      "/staff/landing",
    );
  });

  it("has retired the standalone Plans entry (Phase 4 nav consolidation)", () => {
    // The plan-rate editor merged into Pricing rules; /staff/plans redirects.
    expect(STAFF_NAV.flatMap((section) => section.items).some((item) => item.href === "/staff/plans")).toBe(
      false,
    );
    expect(activeNavHref("/staff/plans", STAFF_NAV)).toBeNull();
    expect(activeNavHref("/staff/plans/new", STAFF_NAV)).toBeNull();
  });

  it("returns null when nothing owns the pathname", () => {
    expect(activeNavHref("/", STAFF_NAV)).toBeNull();
    expect(activeNavHref("/staff/not-a-page", STAFF_NAV)).toBeNull();
  });
});
