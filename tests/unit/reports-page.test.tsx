import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";
/* --- test-only demo fixtures (clean start, captain 2026-10-02) --- */
vi.mock("@/lib/fixtures/finance/invoices.json", async () => ({
  default: (await import("../fixtures/invoices-demo.json")).default,
}));
vi.mock("@/lib/fixtures/operations/cases.json", async () => ({
  default: (await import("../fixtures/operations-cases-demo.json")).default,
}));
vi.mock("@/lib/fixtures/scheduling/bookings.json", async () => ({
  default: (await import("../fixtures/scheduling-bookings-demo.json")).default,
}));
vi.mock("@/lib/fixtures/commerce/orders.json", async () => ({
  default: (await import("../fixtures/orders-demo.json")).default,
}));
/* --- end test-only demo fixtures --- */


/**
 * The Reports screen.
 *
 * The four tabs answer from recorded data and never invent one: collections reads
 * the durable payment journal, sales shows the real orders with an honestly empty
 * agent column, occupancy counts lots and chapel days from the property/scheduling
 * records, and cases uses the ops board's own stage words. A period with no data
 * is the honest empty state; every tab names the service that produces it live.
 */

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

const { default: ReportsPage } = await import("@/app/(staff)/staff/reports/page");
const { recordFixturePayment } = await import("@/lib/api-client/billing-store");

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";

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

async function renderReports(
  params: { report?: string; from?: string; to?: string } = {},
): Promise<string> {
  return renderToStaticMarkup(await ReportsPage({ searchParams: Promise.resolve(params) }));
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-reports-page-"));
  process.env.PAYMENTS_STORE_PATH = path.join(dir, "payments.json");
  process.env.ORDERS_STORE_PATH = path.join(dir, "orders.json");
  process.env.CHAPEL_STORE_PATH = path.join(dir, "chapel.json");
  sessionHolder.current = null;
});

afterEach(async () => {
  delete process.env.PAYMENTS_STORE_PATH;
  delete process.env.ORDERS_STORE_PATH;
  delete process.env.CHAPEL_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe("staff Reports page gating", () => {
  it("renders the graceful forbidden state without a finance scope", async () => {
    setSession(["cases:read"]);
    const html = await renderReports();
    expect(html).toContain("permissions this screen needs");
    expect(html).not.toContain("Collected");
  });
});

describe("staff Reports page — tabs and the honest states", () => {
  beforeEach(() => setSession(["billing:read"]));

  it("opens on collections with the missing-source state named, not a fake figure", async () => {
    const html = await renderReports();
    expect(html).toContain("<h1>Reports</h1>");
    expect(html).toContain("No payments recorded in this period");
    expect(html).toContain(
      "Live: reporting-analytics produces this from the billing service",
    );
  });

  it("shows a recorded payment in its month once the counter records one", async () => {
    await recordFixturePayment({
      invoiceNumber: "INV-2026-00006",
      actor: "Test Clerk",
      now: new Date("2026-09-05T08:00:00Z"),
      input: {
        amount_cents: 100_000,
        method: "cash",
        reference: "",
        received_on: "2026-09-05",
        notes: "",
      },
    });
    const html = await renderReports({
      report: "collections",
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(html).toContain("September 2026");
    expect(html).toContain("₱1,000.00");
    expect(html).toContain("Ana Gonzales");
    expect(html).toContain("INV-2026-00006");
  });

  it("shows the real orders with an honestly empty agent column", async () => {
    const html = await renderReports({ report: "sales" });
    expect(html).toContain("ORD-2026-00001");
    expect(html).toContain("₱77,120.00"); // every recorded order's value
    expect(html).toContain("Not recorded");
    expect(html).toContain("crm-families");
    expect(html).toContain("Attributed sales");
  });

  it("answers an empty sales period with its own empty state", async () => {
    const html = await renderReports({
      report: "sales",
      from: "2030-01-01",
      to: "2030-01-31",
    });
    expect(html).toContain("No orders in this period");
  });

  it("counts lots and chapel days from the recorded property/scheduling data", async () => {
    const html = await renderReports({
      report: "occupancy",
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(html).toContain("Chapel A");
    expect(html).toContain("Chapel B");
    // One booked day over thirty open days on each seeded chapel.
    expect(html).toContain("3%");
    expect(html).toContain("Available");
    expect(html).toContain("property-gis");
  });

  it("counts cases opened in the period by the ops board's own stages", async () => {
    const html = await renderReports({ report: "cases" });
    expect(html).toContain("Cases opened");
    expect(html).toContain("Inquiry");
    expect(html).toContain("Completed");
    expect(html).toContain("29%"); // 2 of the 7 recorded cases opened at inquiry
    expect(html).toContain("funeral-cases");
  });

  it("answers an empty case period with its own empty state", async () => {
    const html = await renderReports({
      report: "cases",
      from: "2030-01-01",
      to: "2030-01-31",
    });
    expect(html).toContain("No cases opened in this period");
  });

  it("marks the active tab and keeps exactly one h1", async () => {
    const html = await renderReports({ report: "cases" });
    expect(html).toContain('aria-current="page"');
    expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
  });
});
