import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";
/* --- test-only demo fixtures (clean start, captain 2026-10-02) --- */
vi.mock("@/lib/fixtures/commerce/orders.json", async () => ({
  default: (await import("../fixtures/orders-demo.json")).default,
}));
vi.mock("@/lib/fixtures/finance/invoices.json", async () => ({
  default: (await import("../fixtures/invoices-demo.json")).default,
}));
vi.mock("@/lib/fixtures/crm/inquiries.json", async () => ({
  default: (await import("../fixtures/inquiries-demo.json")).default,
}));
/* --- end test-only demo fixtures --- */


/**
 * The Analytics screen — how the business is doing, at a glance.
 *
 * FOUR figures and TWO charts, nothing else. The sales line is a REAL recorded series
 * (the durable order store's own months); the collections line plots the counter's
 * payment journal and shows the journal's named empty state when no payment exists —
 * never a zero line. The screen carries no source table and no rules note: the figure
 * and the chart say what they are.
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

const { default: AnalyticsPage } = await import("@/app/(staff)/staff/analytics/page");
const { recordFixturePayment } = await import("@/lib/api-client/billing-store");

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";

function setSession(scopes: string[]) {
  sessionHolder.current = {
    userId: USER_ID,
    tenantId: TENANT_ID,
    scopes,
    email: "ada.admin@vm.demo",
    displayName: "Ada Admin",
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
  };
}

async function renderAnalytics(params: { range?: string } = {}): Promise<string> {
  return renderToStaticMarkup(await AnalyticsPage({ searchParams: Promise.resolve(params) }));
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-analytics-page-"));
  process.env.PAYMENTS_STORE_PATH = path.join(dir, "payments.json");
  process.env.ORDERS_STORE_PATH = path.join(dir, "orders.json");
  process.env.INQUIRIES_STORE_PATH = path.join(dir, "inquiries.json");
  sessionHolder.current = null;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-25T12:00:00Z"));
});

afterEach(async () => {
  vi.useRealTimers();
  delete process.env.PAYMENTS_STORE_PATH;
  delete process.env.ORDERS_STORE_PATH;
  delete process.env.INQUIRIES_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

const FULL_SCOPES = [
  "accounting:read",
  "billing:read",
  "orders:read",
  "cases:read",
  "property:read",
];

describe("staff Analytics page gating", () => {
  it("renders the graceful forbidden state without a finance scope", async () => {
    setSession(["cases:read"]);
    const html = await renderAnalytics();
    expect(html).toContain("permissions this screen needs");
    expect(html).not.toContain("Collections");
  });
});

describe("staff Analytics page — the figures and the line", () => {
  beforeEach(() => setSession(FULL_SCOPES));

  it("leads with the four figures and one h1", async () => {
    const html = await renderAnalytics();
    expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
    expect(html).toContain("<h1>Analytics</h1>");
    for (const label of ["Collections", "Sales", "Outstanding", "Overdue"]) {
      expect(html, label).toContain(label);
    }
  });

  it("carries no source table, no rules note and no second heading", async () => {
    const html = await renderAnalytics();
    expect(html).not.toContain("Where every number comes from");
    expect(html).not.toContain("The chart rules");
    expect(html).not.toContain("Trends");
    expect(html).not.toContain("Lots available");
    expect(html).not.toContain("Inquiry → order");
  });

  it("draws sales as a real recorded series from the order store", async () => {
    const html = await renderAnalytics();
    expect(html).toContain('data-testid="analytics-sales-chart"');
    expect(html).toContain("chart__line");
    expect(html).toContain("Sales · last 6 months");
    // The seed orders span June–August 2026, all inside the trailing window.
    expect(html).toContain(">Jun<");
    expect(html).toContain(">Aug<");
  });

  it("names the missing payment record instead of drawing a zero line", async () => {
    const html = await renderAnalytics();
    expect(html).toContain('data-testid="analytics-collections-chart"');
    expect(html).toContain("chart--empty");
    expect(html).toContain("No payment recorded yet");
    expect(html).not.toContain('data-testid="analytics-collections-chart" data-drawn');
  });

  it("draws the collections line once the counter records payments", async () => {
    await recordFixturePayment({
      invoiceNumber: "INV-2026-00005",
      actor: "Test Clerk",
      now: new Date("2026-08-20T08:00:00Z"),
      input: {
        amount_cents: 200_000,
        method: "cash",
        reference: "",
        received_on: "2026-08-20",
        notes: "",
      },
    });
    await recordFixturePayment({
      invoiceNumber: "INV-2026-00006",
      actor: "Test Clerk",
      now: new Date("2026-09-10T08:00:00Z"),
      input: {
        amount_cents: 100_000,
        method: "cash",
        reference: "",
        received_on: "2026-09-10",
        notes: "",
      },
    });
    const html = await renderAnalytics();
    const collections = html.slice(html.indexOf('data-testid="analytics-collections-chart"'));
    expect(collections).toContain("chart__line");
    expect(html).toContain("₱1,000.00");
  });

  it("sums the selected range", async () => {
    const html = await renderAnalytics({ range: "year" });
    expect(html).toContain("₱77,120.00"); // the year's recorded orders
    expect(html).toContain("5 orders in the period");
    expect(html).toContain('aria-current="page"');
  });
});
