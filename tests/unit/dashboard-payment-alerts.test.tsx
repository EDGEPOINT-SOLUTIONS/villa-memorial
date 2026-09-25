import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";
import type { DashboardSummary } from "@/lib/api-client/reporting";
import {
  buildPaymentAlerts,
  type PaymentAlertSource,
  type PaymentAlertSummary,
} from "@/lib/payment-alerts";

/**
 * The staff dashboard's payment alert band (client minute, 2026-09-21, item 4).
 *
 * The alert is driven by the shared two-day rule, so the cases here pass dates built
 * relative to the run: a payment two days out must be red “due soon”, a past one
 * “overdue”, and neither may appear when the record is settled or further out. The
 * band must also state the count in words and route to the payment details — red is
 * never the only signal.
 */

function isoOffset(offset: number): string {
  const now = new Date();
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset);
  return new Date(base).toISOString().slice(0, 10);
}

function source(
  partial: Partial<PaymentAlertSource> & { days: number },
): PaymentAlertSource {
  const { days, ...rest } = partial;
  return {
    id: rest.id ?? `inv-${days}`,
    reference: rest.reference ?? `INV-2026-${String(days).padStart(5, "0")}`,
    client: rest.client ?? "Test Client",
    amount_cents: rest.amount_cents ?? 100_000,
    due_at: rest.due_at ?? `${isoOffset(days)}T08:00:00Z`,
  };
}

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async (): Promise<Session> => ({
    userId: "00000000-0000-4000-8000-000000000012",
    tenantId: "00000000-0000-4000-8000-000000000001",
    scopes: ["billing:read"],
    email: "sam.staff@vm.demo",
    displayName: "Sam Staff",
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
  }),
}));

vi.mock("@/lib/api-client/scheduling", () => ({
  listBookings: async () => [],
}));

const state = vi.hoisted(() => ({ summary: undefined as DashboardSummary | undefined }));

vi.mock("@/lib/api-client/reporting", () => ({
  getDashboardSummary: async () => state.summary,
}));

const { default: StaffDashboardPage } = await import("@/app/(staff)/staff/dashboard/page");

function summaryWith(alerts: PaymentAlertSummary | null): DashboardSummary {
  return {
    cases: null,
    lots: null,
    finance: {
      total_invoices: 8,
      overdue_count: alerts?.overdue_count ?? 0,
      total_outstanding_cents: (alerts?.overdue_cents ?? 0) + (alerts?.due_soon_cents ?? 0),
      collections_this_month_cents: null,
      currency: "PHP",
    },
    payment_alerts: alerts,
    activity: { new_inquiries_this_month: null, orders_this_month: null },
  };
}

async function render(summary: DashboardSummary): Promise<string> {
  state.summary = summary;
  return renderToStaticMarkup(await StaffDashboardPage());
}

describe("the dashboard alert band", () => {
  it("shows the count, the upcoming-vs-overdue split and the route to the payment", async () => {
    const alerts = buildPaymentAlerts(
      [
        source({ days: 2, client: "Cory Customer", reference: "INV-2026-00042", amount_cents: 1_200_000 }),
        source({ days: -5, client: "Liwayway Cruz", reference: "INV-2026-00043", amount_cents: 500_000 }),
      ],
      new Date(),
    );
    const html = await render(summaryWith(alerts));

    expect(html).toContain("2 payments need attention");
    expect(html).toContain("1 overdue");
    expect(html).toContain("1 due within 2 days");
    expect(html).toContain("Review payments");
    expect(html).toContain('href="/staff/billing"');

    // The details: who, which reference, what is owed, and how near/late.
    expect(html).toContain("Cory Customer");
    expect(html).toContain("INV-2026-00042");
    expect(html).toContain("₱12,000");
    expect(html).toContain("Due soon");
    expect(html).toContain("due in 2 days");
    expect(html).toContain("Liwayway Cruz");
    expect(html).toContain("Overdue");
    expect(html).toContain("overdue by 5 days");
  });

  it("pairs red with text, never colour alone (role=alert + state words)", async () => {
    const alerts = buildPaymentAlerts([source({ days: -1 })], new Date());
    const html = await render(summaryWith(alerts));

    expect(html).toContain('role="alert"');
    expect(html).toContain("alert--danger");
    expect(html).toContain("Overdue");
  });

  it("says the count in singular when one payment needs attention", async () => {
    const alerts = buildPaymentAlerts([source({ days: 1 })], new Date());
    const html = await render(summaryWith(alerts));
    expect(html).toContain("1 payment needs attention");
  });

  it("caps the rows and points at the full list", async () => {
    const sources = Array.from({ length: 7 }, (_, i) => source({ id: `x${i}`, days: -1 - i }));
    const alerts = buildPaymentAlerts(sources, new Date());
    const html = await render(summaryWith(alerts));

    expect(html).toContain("7 payments need attention");
    expect(html).toContain("+2 more on the billing screen.");
  });
});

describe("the dashboard keeps an honest empty state", () => {
  it("renders no band when nothing is due or overdue", async () => {
    const alerts = buildPaymentAlerts([source({ days: 30 }), source({ days: -3, amount_cents: 0 })], new Date());
    const html = await render(summaryWith(alerts));

    expect(html).not.toContain("need attention");
    expect(html).not.toContain("Review payments");
  });

  it("renders no band when the billing source could not be read", async () => {
    const html = await render(summaryWith(null));
    expect(html).not.toContain("need attention");
  });
});
