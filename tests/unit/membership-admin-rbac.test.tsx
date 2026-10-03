import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  getMembershipApplication,
  listMembershipApplications,
  MEMBERSHIP_ADMIN_NOT_WIRED,
} from "@/lib/api-client/membership-applications";
import { listMembershipApplications as listStoredApplications } from "@/lib/api-client/membership-store";
import { planRateOf } from "@/lib/pricing-model";
import { SEED_PRICING } from "@/lib/villa-pricing";
import type { Session } from "@/lib/auth/types";
/* --- test-only demo fixtures (clean start, captain 2026-10-02) --- */
vi.mock("@/lib/fixtures/commerce/membership-applications.json", async () => ({
  default: (await import("../fixtures/membership-demo.json")).default,
}));
/* --- end test-only demo fixtures --- */


/**
 * RBAC gating and server rendering for the Villa Memorial Plan membership folio:
 *  - the recording route needs `catalog:write` (the PROVISIONAL scope — no membership
 *    scope is frozen) and answers 401/403/400/422/503 honestly without writing;
 *  - the register, the new folio and the recorded application pages render under the
 *    scope, with the application-not-a-COC marking on every one of them;
 *  - a recorded application is read back from the durable store with the rate the
 *    pricing store published at record time.
 *
 * Cookies are mocked and every test gets its own throwaway store paths.
 */

const cookieJar = vi.hoisted(() => ({ values: {} as Record<string, string> }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieJar.values ? { name, value: cookieJar.values[name] } : undefined,
  }),
}));

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }),
}));

const route = await import("@/app/api/memberships/applications/route");
const { default: MembershipsPage } = await import("@/app/(staff)/staff/plans/membership/page");
const { default: NewMembershipPage } = await import(
  "@/app/(staff)/staff/plans/membership/new/page"
);
const { default: MembershipApplicationPage } = await import(
  "@/app/(staff)/staff/plans/membership/[id]/page"
);

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function accessToken(scopes: string[]): string {
  const now = Math.floor(Date.now() / 1000);
  return `${b64url({ alg: "none", kid: "fixture" })}.${b64url({
    sub: USER_ID,
    tenant_id: TENANT_ID,
    scopes,
    iat: now,
    exp: now + 900,
  })}.fixture-not-signed`;
}

function signInAs(scopes: string[], displayName = "Sam Staff") {
  cookieJar.values.im_at = accessToken(scopes);
  cookieJar.values.im_u = Buffer.from(
    JSON.stringify({
      id: USER_ID,
      tenant_id: TENANT_ID,
      email: "sam.staff@vm.demo",
      display_name: displayName,
    }),
    "utf8",
  ).toString("base64");
}

function setSession(scopes: string[]) {
  sessionHolder.current = {
    userId: USER_ID,
    tenantId: TENANT_ID,
    scopes,
    email: "sam.staff@vm.demo",
    displayName: "Sam Staff",
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
  };
}

/** The folio's POST body. */
function applicationBody(overrides: Record<string, unknown> = {}) {
  return {
    application_date: "2026-09-18",
    last_name: "Dela Cruz",
    first_name: "Maria",
    middle_name: "Santos",
    date_of_birth: "1980-05-02",
    contact_number: "0917-555-0142",
    email: null,
    address: "123 Rizal St., Isabela City",
    beneficiaries: [
      { name: "Juan Dela Cruz", relationship: "legal_spouse" },
      { name: "Ana Dela Cruz", relationship: "child_of_legal_age" },
    ],
    branch: "Isabela City",
    plan_tier: "silver1",
    plan_term: "monthly",
    senior: false,
    health_declaration: true,
    dpa_consent: true,
    ...overrides,
  };
}

function post(body?: unknown): Promise<Response> {
  return Promise.resolve(
    route.POST(
      new Request("http://localhost/api/memberships/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    ),
  );
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-membership-rbac-"));
  process.env.MEMBERSHIP_STORE_PATH = path.join(dir, "membership.json");
  process.env.PRICING_STORE_PATH = path.join(dir, "pricing.json");
  delete process.env.COMMERCE_BASE_URL;
  delete cookieJar.values.im_at;
  delete cookieJar.values.im_u;
  sessionHolder.current = null;
});

afterEach(async () => {
  delete process.env.MEMBERSHIP_STORE_PATH;
  delete process.env.PRICING_STORE_PATH;
  delete process.env.COMMERCE_BASE_URL;
  await rm(dir, { recursive: true, force: true });
});

describe("the recording route is scope-gated", () => {
  it("answers 401 for an anonymous caller and writes nothing", async () => {
    expect((await post(applicationBody())).status).toBe(401);
    expect(await listMembershipApplications()).toHaveLength(2); // the seed only
  });

  it("answers 403 for a read-only session and writes nothing", async () => {
    signInAs(["catalog:read"]);
    expect((await post(applicationBody())).status).toBe(403);
    expect(await listMembershipApplications()).toHaveLength(2);
  });

  it("rejects a non-JSON body with 400 for a writer", async () => {
    signInAs(["catalog:write"]);
    expect((await post(undefined)).status).toBe(400);
  });

  it("reports structural field errors as 422 without touching the store", async () => {
    signInAs(["catalog:write"]);
    const res = await post(
      applicationBody({ branch: "", beneficiaries: [], health_declaration: false }),
    );
    expect(res.status).toBe(422);
    const payload = (await res.json()) as { error: string; fieldErrors: Record<string, string> };
    expect(payload.error).toBeTruthy();
    expect(payload.fieldErrors.branch).toMatch(/branch/i);
    expect(payload.fieldErrors.beneficiaries).toMatch(/beneficiary/i);
    expect(payload.fieldErrors.health_declaration).toMatch(/good-health/i);
    expect(await listMembershipApplications()).toHaveLength(2);
  });

  it("answers 503 with the reason in live mode, never a fake partner integration", async () => {
    signInAs(["catalog:write"]);
    process.env.COMMERCE_BASE_URL = "http://gateway.test";
    const res = await post(applicationBody());
    expect(res.status).toBe(503);
    const payload = (await res.json()) as { error: string };
    expect(payload.error).toBe(MEMBERSHIP_ADMIN_NOT_WIRED);
    // The store reader bypasses the live guard so the absence of a write is provable.
    expect(await listStoredApplications()).toHaveLength(2);
  });

  it("refuses GET — the capture screen is not a read endpoint", async () => {
    expect((await route.GET()).status).toBe(405);
  });
});

describe("a catalog:write session records the application", () => {
  beforeEach(() => signInAs(["catalog:read", "catalog:write"], "Ada Admin"));

  it("answers 201 and the next read returns the recorded folio with the published rate", async () => {
    const res = await post(applicationBody());
    expect(res.status).toBe(201);
    const payload = (await res.json()) as { application: { id: number } };
    expect(payload.application.id).toBe(3);
    expect(await listMembershipApplications()).toHaveLength(3);

    const recorded = await getMembershipApplication(3);
    expect(recorded).not.toBeNull();
    expect(recorded!.rate_cents).toBe(
      planRateOf(SEED_PRICING.plans, "silver1", "monthly", false) * 100,
    );
    expect(recorded!.recorded_by).toBe("Ada Admin");
    expect(recorded!.dpa_consented_at).not.toBeNull();
  });

  it("refuses a relationship outside the client's list with 422, writing nothing", async () => {
    const res = await post(
      applicationBody({ beneficiaries: [{ name: "Cousin", relationship: "cousin" }] }),
    );
    expect(res.status).toBe(422);
    expect(await listMembershipApplications()).toHaveLength(2);
  });
});

describe("the membership screens render under their scopes", () => {
  it("renders the graceful forbidden state without catalog:write", async () => {
    setSession(["orders:read"]);
    const register = renderToStaticMarkup(await MembershipsPage());
    expect(register).toContain("permissions this screen needs");
    expect(register).not.toContain("Rosa");

    const newFolio = renderToStaticMarkup(await NewMembershipPage());
    expect(newFolio).toContain("permissions this screen needs");
    expect(newFolio).not.toContain("Enrol a plan member");

    const recorded = renderToStaticMarkup(
      await MembershipApplicationPage({ params: Promise.resolve({ id: "1" }) }),
    );
    expect(recorded).toContain("permissions this screen needs");
  });

  it("renders the register with the seed folios and the plan's published terms", async () => {
    setSession(["catalog:write"]);
    const html = renderToStaticMarkup(await MembershipsPage());
    expect(html).toContain("Membership applications");
    expect(html).toContain("Rosa Tan Lim");
    expect(html).toContain("Teodoro M. Cruz");
    expect(html).toContain("Silver 2 · Monthly");
    expect(html).toContain("Antonio Lim (Legal spouse)");
    expect(html).toContain("Sam Staff");
    expect(html).toContain("New application");
    expect(html).toContain("The plan&#x27;s published terms");
    expect(html).toContain("What the plan covers");
    expect(html).toContain("2026 rates — regular");
    // The honest state is on the register too.
    expect(html).toContain("application, not a certificate of coverage");
  });

  it("renders the new folio: glance first, the honest line, the rate READ from the store", async () => {
    setSession(["catalog:write"]);
    const html = renderToStaticMarkup(await NewMembershipPage());
    // One h1, and it is the folio's.
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("Enrol a plan member");
    expect(html).toContain("This application at a glance");
    expect(html).toContain("Being enrolled");
    expect(html).toContain("Published rate");
    expect(html).toContain("Plan holder not named yet");
    expect(html).toContain("Bronze 1");
    expect(html).toContain("₱600.00"); // bronze1 monthly, published
    expect(html).toContain("application, not a certificate of coverage");
    expect(html).toContain("Record application");
    expect(html).toContain("Preview application paper");
    expect(html).toContain("Legal spouse");
    expect(html).toContain("Child of legal age");
    expect(html).toContain("catalog:write");
    // The terms display travels with the folio for the family deciding.
    expect(html).toContain("What this plan publishes");
    // The folio never authors an amount field.
    expect(html).not.toMatch(/name="amount"|name="rate"/);
  });

  it("quotes the selected tier × payment mode from the pricing seed, never a typed amount", async () => {
    setSession(["catalog:write"]);
    const html = renderToStaticMarkup(await NewMembershipPage());
    const published = planRateOf(SEED_PRICING.plans, "bronze1", "monthly", false);
    const printed = `₱${published.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    expect(printed).toBe("₱600.00");
    expect(html).toContain(printed);
    expect(html).toContain(`${printed} / month`);
  });

  it("renders the recorded application with its paper and the honest marking", async () => {
    setSession(["catalog:write"]);
    const html = renderToStaticMarkup(
      await MembershipApplicationPage({ params: Promise.resolve({ id: "1" }) }),
    );
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("Rosa Tan Lim");
    expect(html).toContain("Silver 2 · Monthly");
    expect(html).toContain("₱1,120.00");
    expect(html).toContain("Isabela City");
    expect(html).toContain("application, not a certificate of coverage");
    expect(html).toContain("The office issues the membership document");
    expect(html).toContain("Antonio Lim");
    expect(html).toContain("Legal spouse");
    expect(html).toContain("Declared");
    expect(html).toContain("Given");
    // The paper preview and both exports are on the page.
    expect(html).toContain("Application paper");
    expect(html).toContain("Membership Application");
    expect(html).toContain("Word (.docx)");
    expect(html).toContain(">PDF<");
    // The paper prints the application number as a blank — never a COC number.
    expect(html).toContain("____________");
    expect(html).not.toMatch(/COC No\./);
  });

  it("renders an honest not-found state for an unrecorded id", async () => {
    setSession(["catalog:write"]);
    const html = renderToStaticMarkup(
      await MembershipApplicationPage({ params: Promise.resolve({ id: "999" }) }),
    );
    expect(html).toContain("No membership application is recorded under that number.");
  });

  it("renders an honest error state for a junk id instead of throwing", async () => {
    setSession(["catalog:write"]);
    const html = renderToStaticMarkup(
      await MembershipApplicationPage({ params: Promise.resolve({ id: "not-a-number" }) }),
    );
    expect(html).toContain("No membership application is recorded under that number.");
  });
});
