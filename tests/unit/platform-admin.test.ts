import { describe, expect, it } from "vitest";
import {
  PLATFORM_AUTH_REQUIREMENTS,
  PLATFORM_DEFERRED,
  PLATFORM_OPERATOR_ENTRY,
  PLATFORM_SCREENS,
  PLATFORM_SURFACE_ROBOTS,
  SUBDOMAIN_PATTERN,
  SUBDOMAIN_RESERVED,
  TENANT_ONBOARDING_STEPS,
  TENANT_PLANS,
  TENANT_PROVISIONING_REQUIREMENTS,
  TENANT_SIGN_UP_REQUIREMENTS,
  TENANT_STATES,
  TENANT_STATE_META,
  TENANT_TRIAL_NOTE,
  subdomainFromName,
  tenantSignUpDraftReady,
  tenantTrialLine,
  validateTenantSignUpDraft,
  type TenantSignUpDraft,
} from "@/lib/platform-admin";

/**
 * The platform surface's pure rules (lib/platform-admin.ts) — the vocabulary
 * the three screens render, the sign-up gate they run, and the trial line they
 * share. Nothing here talks to a service: no tenancy/identity contract exists,
 * so the honest-state copy is part of the contract.
 */
const VALID_DRAFT: TenantSignUpDraft = {
  business_name: "Sample Memorial Homes",
  business_email: "office@sample-memorial.example",
  subdomain: "sample-memorial",
  admin_name: "Ana Sample",
  admin_email: "owner@sample-memorial.example",
};

describe("platform surface vocabulary", () => {
  it("enters at the operator's own door and names the three screens", () => {
    expect(PLATFORM_OPERATOR_ENTRY).toBe("/platform/sign-in");
    expect(PLATFORM_SCREENS.map((screen) => screen.href)).toEqual([
      "/platform/tenants",
      "/platform/sign-up",
      "/platform/sign-in",
    ]);
  });

  it("closes the surface to crawlers in its own head rule", () => {
    expect(PLATFORM_SURFACE_ROBOTS).toEqual({ index: false, follow: false });
  });

  it("labels every recorded tenant state with its own tone and one line", () => {
    for (const state of TENANT_STATES) {
      const meta = TENANT_STATE_META[state];
      expect(meta.label.length).toBeGreaterThan(0);
      expect(["info", "warning", "neutral"]).toContain(meta.tone);
      expect(meta.detail.length).toBeGreaterThan(0);
    }
  });

  it("records exactly one plan — the free trial — because paid plans are deferred", () => {
    expect(TENANT_PLANS).toEqual(["free_trial"]);
    expect(TENANT_TRIAL_NOTE).toContain("14-day free trial");
    expect(TENANT_TRIAL_NOTE).toContain("deferred");
  });

  it("names what the platform must provide, never implying it exists", () => {
    for (const list of [
      TENANT_PROVISIONING_REQUIREMENTS,
      TENANT_SIGN_UP_REQUIREMENTS,
      TENANT_ONBOARDING_STEPS,
    ]) {
      expect(list.length).toBeGreaterThan(0);
      for (const item of list) {
        expect(item.title.length).toBeGreaterThan(0);
        expect(item.detail.length).toBeGreaterThan(0);
      }
    }
    expect(PLATFORM_AUTH_REQUIREMENTS.map((item) => item.title)).toContain(
      "A seeded first operator",
    );
    expect(PLATFORM_DEFERRED).toContain("Suspending or deleting a tenant.");
  });
});

describe("tenant sign-up gate", () => {
  it("accepts a complete draft", () => {
    expect(validateTenantSignUpDraft(VALID_DRAFT)).toEqual({});
    expect(tenantSignUpDraftReady(VALID_DRAFT)).toBe(true);
  });

  it("reports each missing field on the empty draft", () => {
    const errors = validateTenantSignUpDraft({
      business_name: "",
      business_email: "",
      subdomain: "",
      admin_name: "",
      admin_email: "",
    });
    expect(Object.keys(errors).sort()).toEqual([
      "admin_email",
      "admin_name",
      "business_email",
      "business_name",
      "subdomain",
    ]);
  });

  it("requests an @ in both email addresses", () => {
    const errors = validateTenantSignUpDraft({
      ...VALID_DRAFT,
      business_email: "office.sample-memorial.example",
      admin_email: "owner.sample-memorial.example",
    });
    expect(errors.business_email).toContain("@");
    expect(errors.admin_email).toContain("@");
  });

  it("keeps the subdomain to the platform's address rules", () => {
    for (const bad of ["ab", "Sample", "-sample", "sample-", "a".repeat(31), "sam ple"]) {
      const errors = validateTenantSignUpDraft({ ...VALID_DRAFT, subdomain: bad });
      expect(errors.subdomain, `${bad} must be refused`).toBeTruthy();
    }
    for (const good of ["sample", "sample-memorial", "sample2", "a1b"]) {
      expect(SUBDOMAIN_PATTERN.test(good), `${good} must be allowed`).toBe(true);
      expect(validateTenantSignUpDraft({ ...VALID_DRAFT, subdomain: good })).toEqual({});
    }
  });

  it("refuses an address the platform itself needs", () => {
    for (const reserved of SUBDOMAIN_RESERVED) {
      const errors = validateTenantSignUpDraft({ ...VALID_DRAFT, subdomain: reserved });
      expect(errors.subdomain, reserved).toContain("reserved");
    }
  });

  it("suggests an editable address from the business name", () => {
    expect(subdomainFromName("Sample Memorial Homes")).toBe("sample-memorial-homes");
    expect(subdomainFromName("  Café & Sons  ")).toBe("caf-sons");
    expect(subdomainFromName("A".repeat(40)).length).toBeLessThanOrEqual(30);
    expect(SUBDOMAIN_PATTERN.test(subdomainFromName("Sample Memorial Homes"))).toBe(true);
  });

  it("phrases the shared trial line per recorded state, never inventing a count", () => {
    expect(
      tenantTrialLine({
        state: "active_trial",
        trial_days_remaining: 9,
        trial_ends_on: "2026-09-27",
      }),
    ).toBe("9 days remaining");
    expect(
      tenantTrialLine({
        state: "trial_expired",
        trial_days_remaining: 0,
        trial_ends_on: "2026-08-28",
      }),
    ).toBe("Ended 2026-08-28");
    expect(
      tenantTrialLine({ state: "cancelled", trial_days_remaining: null, trial_ends_on: null }),
    ).toBe("Trial dates not recorded");
    expect(
      tenantTrialLine({
        state: "active_trial",
        trial_days_remaining: null,
        trial_ends_on: null,
      }),
    ).toBe("Days remaining not recorded");
  });
});
