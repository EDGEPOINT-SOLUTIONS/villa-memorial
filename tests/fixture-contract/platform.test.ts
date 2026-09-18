import { describe, expect, it } from "vitest";
import tenantsFile from "@/lib/fixtures/platform/tenants.json";
import {
  platformLiveModeEnabled,
  readPlatformTenants,
  PLATFORM_NOT_WIRED,
} from "@/lib/api-client/platform";
import {
  SUBDOMAIN_PATTERN,
  TENANT_PLANS,
  TENANT_STATES,
  type PlatformTenant,
} from "@/lib/platform-admin";

/**
 * The platform tenant fixture is PROVISIONAL — no tenancy service or contract
 * exists (docs/02-architecture/platform-administration.md classifies the
 * surface; nothing is built platform-side). These assertions pin the one rule
 * that must never drift: a row that could be mistaken for a real business may
 * never reach a screen. Every record is a marked sample with a `.example`
 * address, the vocabulary stays inside the trial/plan words the classification
 * records, and the reader refuses an unmarked row.
 */
const fixture = tenantsFile as unknown as {
  _provenance: { status: string; note: string[] };
  service_state: string;
  sample_records: boolean;
  tenants: Array<Record<string, unknown>>;
};

function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

const tenants = fixture.tenants as unknown as PlatformTenant[];

describe("platform tenant fixture (provisional — no tenancy service)", () => {
  it("is fixture-only and names the missing service", () => {
    expect(platformLiveModeEnabled()).toBe(false);
    expect(PLATFORM_NOT_WIRED).toContain("no tenancy service");
    expect(fixture.service_state).toBe("not_wired");
    expect(fixture._provenance.status).toContain("PROVISIONAL");
  });

  it("marks every row as a sample — never a business that could be mistaken for real", () => {
    expect(fixture.sample_records).toBe(true);
    expect(tenants.length).toBeGreaterThan(0);
    const ids = new Set<string>();
    for (const tenant of tenants) {
      expect(tenant.sample, `${tenant.id} must be marked sample`).toBe(true);
      expect(ids.has(tenant.id), `duplicate tenant id ${tenant.id}`).toBe(false);
      ids.add(tenant.id);
      expect(
        /sample|example/i.test(tenant.name),
        `${tenant.id} name must read as a sample: ${tenant.name}`,
      ).toBe(true);
      expect(tenant.hostname.endsWith(".example"), `${tenant.id} hostname`).toBe(true);
      expect(tenant.administrator.email.includes("@")).toBe(true);
      expect(tenant.administrator.email.endsWith(".example"), `${tenant.id} admin email`).toBe(
        true,
      );
    }
  });

  it("keeps state and plan inside the recorded vocabulary", () => {
    for (const tenant of tenants) {
      expect(TENANT_STATES, `${tenant.id} state`).toContain(tenant.state);
      expect(TENANT_PLANS, `${tenant.id} plan`).toContain(tenant.plan);
      if (tenant.state === "active_trial") {
        expect(tenant.trial_days_remaining, `${tenant.id} plan days`).toBeGreaterThan(0);
      } else if (tenant.state === "trial_expired") {
        expect(tenant.trial_days_remaining).toBe(0);
      } else {
        expect(tenant.trial_days_remaining).toBeNull();
      }
    }
  });

  it("keeps the address coherent and the trial exactly 14 days", () => {
    for (const tenant of tenants) {
      expect(SUBDOMAIN_PATTERN.test(tenant.subdomain), `${tenant.id} subdomain`).toBe(true);
      expect(tenant.hostname, `${tenant.id} hostname`).toBe(`${tenant.subdomain}.example`);
      expect(tenant.provisioned_on, `${tenant.id} provisioned_on`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (tenant.trial_ends_on) {
        expect(tenant.trial_ends_on, `${tenant.id} trial length`).toBe(
          addDays(tenant.provisioned_on, 14),
        );
      }
    }
  });

  it("reads field by field and refuses an unmarked row", () => {
    const parsed = readPlatformTenants(fixture);
    expect(parsed).toHaveLength(tenants.length);
    expect(parsed.map((tenant) => tenant.id)).toEqual(tenants.map((tenant) => tenant.id));

    expect(() =>
      readPlatformTenants({
        ...fixture,
        tenants: [{ ...fixture.tenants[0], sample: false }],
      }),
    ).toThrowError(/not marked as a sample/);
    expect(() =>
      readPlatformTenants({
        ...fixture,
        tenants: [{ ...fixture.tenants[0], state: "paid_up" }],
      }),
    ).toThrowError(/unknown state/);
    expect(() =>
      readPlatformTenants({
        ...fixture,
        tenants: [{ ...fixture.tenants[0], plan: "premium" }],
      }),
    ).toThrowError(/unknown plan/);
  });
});
