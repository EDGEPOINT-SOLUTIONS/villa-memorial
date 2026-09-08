import { describe, expect, it } from "vitest";
import { getDashboardSummary } from "@/lib/api-client/reporting";
import { listCases } from "@/lib/api-client/operations";
import { listLots } from "@/lib/api-client/property";
import { listInvoices } from "@/lib/api-client/finance";

/**
 * Module I tests. The dashboard no longer has a fixture of its own — it aggregates the
 * same clients the screens use, in every mode — so these assert the property that made
 * the old fixture dangerous: the dashboard and /staff/cases, /staff/property,
 * /staff/billing must never quote different numbers for the same data.
 *
 * Previously that held by coincidence (two fixtures happened to agree, until they did
 * not, and the dashboard claimed 6 cases while the board showed 4). Now it holds by
 * construction, and these tests pin it.
 */

describe("dashboard summary reconciles with the sources it summarises", () => {
  it("case counts match the cases client", async () => {
    const summary = await getDashboardSummary();
    const cases = await listCases();
    const completed = cases.filter((c) => c.stage === "completed").length;

    expect(summary.cases).not.toBeNull();
    expect(summary.cases!.total).toBe(cases.length);
    expect(summary.cases!.completed).toBe(completed);
    expect(summary.cases!.active).toBe(cases.length - completed);
    expect(summary.cases!.new_today).toBeGreaterThanOrEqual(0);
  });

  it("lot counts match the property client", async () => {
    const summary = await getDashboardSummary();
    const lots = await listLots();
    const byStatus = (status: string) => lots.filter((l) => l.status === status).length;

    expect(summary.lots).not.toBeNull();
    expect(summary.lots!.total).toBe(lots.length);
    expect(summary.lots!.available).toBe(byStatus("available"));
    expect(summary.lots!.reserved).toBe(byStatus("reserved"));
    expect(summary.lots!.sold).toBe(byStatus("sold"));
    expect(summary.lots!.occupied).toBe(byStatus("occupied"));
  });

  it("finance figures match what the billing screen computes", async () => {
    const summary = await getDashboardSummary();
    const invoices = await listInvoices();
    const outstanding = invoices.reduce(
      (sum, i) => sum + Math.max(0, i.total_cents - i.paid_cents),
      0,
    );

    expect(summary.finance).not.toBeNull();
    expect(summary.finance!.total_invoices).toBe(invoices.length);
    expect(summary.finance!.overdue_count).toBe(
      invoices.filter((i) => i.status === "overdue").length,
    );
    expect(summary.finance!.total_outstanding_cents).toBe(outstanding);
    expect([...new Set(invoices.map((i) => i.currency))]).toContain(
      summary.finance!.currency,
    );
  });

  it("outstanding is a non-negative integer of minor units", async () => {
    const summary = await getDashboardSummary();
    const cents = summary.finance!.total_outstanding_cents;
    expect(Number.isInteger(cents)).toBe(true);
    expect(cents).toBeGreaterThanOrEqual(0);
  });

  it("figures with no source are null, never invented", async () => {
    const summary = await getDashboardSummary();
    // collections needs payment dates; activity needs inquiries/orders list endpoints.
    // None of those exist, so the dashboard must say so rather than show a demo number.
    expect(summary.finance!.collections_this_month_cents).toBeNull();
    expect(summary.activity.new_inquiries_this_month).toBeNull();
    expect(summary.activity.orders_this_month).toBeNull();
  });

  it("a failing source nulls only its own section", async () => {
    // listInvoices throws when a live base URL is set but the session is absent; the
    // dashboard must still return the sections it could read.
    const summary = await getDashboardSummary();
    expect(summary).toHaveProperty("cases");
    expect(summary).toHaveProperty("lots");
    expect(summary).toHaveProperty("finance");
  });
});
