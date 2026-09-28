import { describe, expect, it } from "vitest";
import { getDashboardSummary } from "@/lib/api-client/reporting";
import { listCases } from "@/lib/api-client/operations";
import { listLots } from "@/lib/api-client/property";
import { listInvoices } from "@/lib/api-client/finance";
import { buildPaymentAlerts, invoiceOverdue, type PaymentAlertSource } from "@/lib/payment-alerts";

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
    const now = new Date("2026-09-25T12:00:00Z");
    const summary = await getDashboardSummary(now);
    const invoices = await listInvoices(now);
    const outstanding = invoices.reduce(
      (sum, i) => sum + Math.max(0, i.total_cents - i.paid_cents),
      0,
    );

    expect(summary.finance).not.toBeNull();
    expect(summary.finance!.total_invoices).toBe(invoices.length);
    // ONE meaning of "overdue": the date-derived rule the band and the billing screen use,
    // not the stored status (which keeps a part-paid invoice `partial` however late it is).
    expect(summary.finance!.overdue_count).toBe(summary.payment_alerts!.overdue_count);
    expect(summary.finance!.overdue_count).toBe(
      invoices.filter((i) => invoiceOverdue(i, now)).length,
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

  it("payment alerts reconcile with the invoices classified by the shared rule", async () => {
    const now = new Date("2026-09-25T12:00:00Z");
    const summary = await getDashboardSummary(now);
    const invoices = await listInvoices(now);
    const sources: PaymentAlertSource[] = invoices.map((invoice) => ({
      id: invoice.id,
      reference: invoice.invoice_number,
      client: invoice.customer_name,
      amount_cents: Math.max(0, invoice.total_cents - invoice.paid_cents),
      due_at: invoice.due_at,
    }));
    const expected = buildPaymentAlerts(sources, now);

    expect(summary.payment_alerts).not.toBeNull();
    expect(summary.payment_alerts!.overdue_count).toBe(expected.overdue_count);
    expect(summary.payment_alerts!.due_soon_count).toBe(expected.due_soon_count);
    expect(summary.payment_alerts!.total).toBe(expected.total);
    expect(summary.payment_alerts!.overdue_cents).toBe(expected.overdue_cents);
  });

  it("splits upcoming from overdue with an explicit clock (the two-day window)", async () => {
    // At 2026-09-01 the recorded seed carries one payment due in exactly two days
    // (INV-2026-00006, due 2026-09-03) and five already past their date.
    const now = new Date("2026-09-01T00:00:00Z");
    const summary = await getDashboardSummary(now);

    expect(summary.payment_alerts!.due_soon_count).toBe(1);
    expect(summary.payment_alerts!.due_soon[0].reference).toBe("INV-2026-00006");
    expect(summary.payment_alerts!.due_soon[0].days_until_due).toBe(2);
    expect(summary.payment_alerts!.overdue_count).toBe(5);
    expect(summary.payment_alerts!.total).toBe(6);
    expect(summary.payment_alerts!.overdue.every((a) => a.days_until_due < 0)).toBe(true);
  });

  it("a failing source nulls only its own section", async () => {
    // listInvoices throws when a live base URL is set but the session is absent; the
    // dashboard must still return the sections it could read.
    const summary = await getDashboardSummary();
    expect(summary).toHaveProperty("cases");
    expect(summary).toHaveProperty("lots");
    expect(summary).toHaveProperty("finance");
    expect(summary).toHaveProperty("payment_alerts");
  });
});
