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
import { inPhone, parseCss, readStyle, ruleFor } from "../helpers/css-rules";

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

    // The right-sized type roles (captain feedback, 2026-09-25).
    expect(html).toContain("payment-alerts__headline");
    expect(html).toContain("payment-alerts__figure");
    expect(html).toContain("payment-alerts__amount");
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

  it("still shows due-soon rows when five or more are overdue", async () => {
    // The old single cap concatenated overdue first, so with 5+ overdue the counted
    // upcoming payment's row could never render (2026-09-21 review).
    const sources = [
      ...Array.from({ length: 6 }, (_, i) =>
        source({ id: `o${i}`, reference: `INV-OVD-${i}`, days: -1 - i }),
      ),
      source({ id: "soon", reference: "INV-SOON-1", days: 1 }),
    ];
    const alerts = buildPaymentAlerts(sources, new Date());
    const html = await render(summaryWith(alerts));

    expect(alerts.overdue_count).toBe(6);
    expect(alerts.due_soon_count).toBe(1);
    expect(html).toContain("INV-SOON-1");
    expect(html).toContain("1 due within 2 days");
  });

  it("opens each row at the read-only invoice, so a reader can see the payment", async () => {
    const alerts = buildPaymentAlerts(
      [source({ days: -5, reference: "INV-2026-00043" })],
      new Date(),
    );
    const html = await render(summaryWith(alerts));
    expect(html).toContain('href="/staff/billing/invoices/INV-2026-00043"');
    // The due date is printed, not only the countdown.
    expect(html).toContain("due ");
  });
});

describe("the band's type is right-sized (captain feedback, 2026-09-25)", () => {
  const rules = parseCss(readStyle("styles/components.css"));

  it("keeps the headline on the card-title role (22px; 18px on a phone)", () => {
    const headline = ruleFor(rules, ".payment-alerts__headline");
    expect(headline, ".payment-alerts__headline is declared").toBeDefined();
    expect(headline!.body).toMatch(/font-size:\s*var\(--text-card-title\)/);
  });

  it("keeps the counts and amounts on the 18px ladder step", () => {
    const figure = ruleFor(rules, ".payment-alerts__figure");
    const amount = ruleFor(rules, ".payment-alerts__amount");
    expect(figure, ".payment-alerts__figure is declared").toBeDefined();
    expect(amount, ".payment-alerts__amount is declared").toBeDefined();
    expect(figure!.body).toMatch(/font-size:\s*var\(--text-lg\)/);
    expect(amount!.body).toMatch(/font-size:\s*var\(--text-lg\)/);
  });
});

describe("a phone is never widened by the band (design audit, 2026-09-28)", () => {
  const phone = inPhone(parseCss(readStyle("styles/components.css")));

  it("lets the band's rows wrap, so the nowrap run stops setting a 434px floor", () => {
    // Measured in Chromium: at 390 the row's nowrap run (due date + amount +
    // badge + countdown) gave the alert's own flex child a 434px min-content,
    // and `min-width: auto` refuses to shrink below it — so /staff/dashboard
    // scrolled 92px past the viewport. The phone block must stack the row and
    // let the run wrap.
    const row = phone.find((r) => r.selector === ".payment-alerts__list .row");
    const nowrap = phone.find((r) => r.selector === ".payment-alerts__list .nowrap");
    expect(row, ".payment-alerts__list .row is declared in a phone block").toBeDefined();
    expect(nowrap, ".payment-alerts__list .nowrap is declared in a phone block").toBeDefined();
    expect(row!.body).toMatch(/flex-wrap:\s*wrap/);
    expect(nowrap!.body).toMatch(/white-space:\s*normal/);
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
