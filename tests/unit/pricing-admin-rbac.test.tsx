import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { SEED_PRICING } from "@/lib/villa-pricing";
import type { Session } from "@/lib/auth/types";

/**
 * RBAC gating for the two pricing screens and their BFF route:
 *  - POST /api/pricing (the only write) needs `catalog:write`; GET needs the
 *    matching `catalog:read`. Both answer 401/403 before touching the store.
 *  - /staff/pricing (the consolidated rate home) renders both editors with the
 *    write scope and a ForbiddenState without it (the same provisional scope the
 *    nav entry uses); /staff/plans redirects there.
 *  - a write-scoped save lands in the SAME store the public pages read.
 *
 * Cookies and the server session gate are mocked; every test uses a throwaway
 * PRICING_STORE_PATH.
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

const redirectCalls = vi.hoisted(() => ({ hrefs: [] as string[] }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (href: string) => {
    redirectCalls.hrefs.push(href);
    throw new Error("NEXT_REDIRECT");
  },
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const pricingRoute = await import("@/app/api/pricing/route");
const { default: PlansStaffPage } = await import("@/app/(staff)/staff/plans/page");
const { default: PricingStaffPage } = await import("@/app/(staff)/staff/pricing/page");

const dir = mkdtempSync(path.join(os.tmpdir(), "villa-pricing-rbac-"));
process.env.PRICING_STORE_PATH = path.join(dir, "pricing.json");

afterAll(() => {
  delete process.env.PRICING_STORE_PATH;
  delete process.env.COMMERCE_BASE_URL;
  rmSync(dir, { recursive: true, force: true });
});

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

function post(body: unknown): Promise<Response> {
  return Promise.resolve(
    pricingRoute.POST(
      new Request("http://localhost/api/pricing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
}

/** A valid full plan edit: Bronze 1 monthly ₱619 (annual ₱7,428). */
function editedPlans() {
  const plans = structuredClone(SEED_PRICING.plans);
  plans.regular.find((r) => r.mode === "Monthly")!.bronze1 = 619;
  plans.regular.find((r) => r.mode === "Annual")!.bronze1 = 7428;
  plans.regular.find((r) => r.mode === "Semi-annual")!.bronze1 = 3714;
  plans.regular.find((r) => r.mode === "Quarterly")!.bronze1 = 1857;
  return plans;
}

beforeEach(() => {
  cookieJar.values = {};
  delete process.env.COMMERCE_BASE_URL;
});

describe("/api/pricing RBAC", () => {
  it("answers 401 without a session", async () => {
    expect((await pricingRoute.GET()).status).toBe(401);
    expect((await post({ section: "plans", plans: editedPlans() })).status).toBe(401);
  });

  it("reads with catalog:read and 403s the write without catalog:write", async () => {
    signInAs(["catalog:read"]);
    const read = await pricingRoute.GET();
    expect(read.status).toBe(200);
    const body = (await read.json()) as { pricing: { plans: unknown }; questions: unknown[] };
    expect(body.pricing.plans).toBeTruthy();
    expect(body.questions).toHaveLength(2);

    // catalog:read alone cannot write.
    expect((await post({ section: "plans", plans: editedPlans() })).status).toBe(403);
  });

  it("needs catalog:read for the read (catalog:write alone is not enough)", async () => {
    signInAs(["catalog:write"]);
    expect((await pricingRoute.GET()).status).toBe(403);
  });

  it("saves a valid edit with catalog:write and the store now serves it", async () => {
    signInAs(["catalog:write"]);
    const res = await post({ section: "plans", plans: editedPlans() });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      pricing: { plans: { regular: Array<{ mode: string; bronze1: number }> }; updated_by: string };
    };
    expect(body.ok).toBe(true);
    expect(body.pricing.updated_by).toBe("Sam Staff");
    expect(body.pricing.plans.regular.find((r) => r.mode === "Monthly")!.bronze1).toBe(619);

    const stored = await loadPricingDocument();
    expect(stored.plans.regular.find((r) => r.mode === "Monthly")!.bronze1).toBe(619);
  });

  it("refuses a broken edit with 422 and changes nothing", async () => {
    signInAs(["catalog:write"]);
    const broken = editedPlans();
    broken.regular.find((r) => r.mode === "Monthly")!.bronze1 = 500;
    const res = await post({ section: "plans", plans: broken });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: string }).error).toMatch(/must not exceed|× 12/);

    const stored = await loadPricingDocument();
    const monthly = stored.plans.regular.find((r) => r.mode === "Monthly")!.bronze1;
    expect(monthly).toBe(619); // the previous valid save, not the broken draft
  });

  it("rejects an unknown section with 422", async () => {
    signInAs(["catalog:write"]);
    expect((await post({ section: "catalogue" })).status).toBe(422);
  });

  it("refuses the write honestly with 503 in live mode", async () => {
    signInAs(["catalog:write"]);
    process.env.COMMERCE_BASE_URL = "https://gateway.example";
    const res = await post({ section: "plans", plans: editedPlans() });
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toMatch(/no frozen catalog-pricing/);
  });
});

describe("the staff pages gate on catalog:write", () => {
  it("/staff/pricing is the one rate home — plan rates AND lot prices", async () => {
    setSession(["catalog:write"]);
    const html = renderToStaticMarkup(await PricingStaffPage());
    expect(html).toContain("Pricing rules");
    // Plan rates half.
    expect(html).toContain("Plan rates");
    expect(html).toContain("Save plan rates");
    expect(html).toContain("Preview — exactly what the public pages print");
    // The senior-rate client question stays visible on the screen.
    expect(html).toContain("Open client question");
    expect(html).toContain("senior chapel sheet contradicts itself");
    // Lot prices half.
    expect(html).toContain("Lot prices");
    expect(html).toContain("Save lot prices");
    expect(html).toContain("Lot A-001");
    expect(html).not.toContain("don’t have access");
  });

  it("/staff/pricing denies a session without catalog:write", async () => {
    setSession([]);
    const html = renderToStaticMarkup(await PricingStaffPage());
    expect(html).toContain("don’t have access");
    expect(html).toContain("catalog:write");
    expect(html).not.toContain("Save lot prices");
    expect(html).not.toContain("Save plan rates");
  });

  it("/staff/plans redirects to the consolidated Pricing rules home", () => {
    redirectCalls.hrefs = [];
    expect(() => PlansStaffPage()).toThrow("NEXT_REDIRECT");
    expect(redirectCalls.hrefs).toEqual(["/staff/pricing"]);
  });
});
