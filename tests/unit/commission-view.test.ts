import { describe, expect, it } from "vitest";
import { commissionPool } from "@/lib/commission";
import type { AdminOrder, OrderLifecycleStatus } from "@/lib/api-client/order-store";

/**
 * The commission pool is the ONLY derivation between the recorded orders and
 * the Commission screen. It must split the records by their real fulfilment
 * state, sum the real sale value per currency, and add nothing rate-shaped.
 */
function order(
  number: string,
  lifecycle_status: OrderLifecycleStatus,
  total_cents: number,
  over: Partial<AdminOrder["order"]> = {},
): AdminOrder {
  return {
    order: {
      number,
      status: "paid",
      customer_name: `Customer ${number}`,
      total_cents,
      currency: "PHP",
      items: [
        {
          catalog_item_id: 1,
          item_type: "service",
          sku: "SRV-TEST",
          name: "A service",
          quantity: 1,
          unit_price_cents: total_cents,
        },
      ],
      placed_at: "2026-08-01T00:00:00Z",
      ...over,
    },
    customer: { name: `Customer ${number}`, email: "demo@example.test", phone: "+63 900 000 0000" },
    lifecycle_status,
    timeline: [{ status: lifecycle_status, at: "2026-08-01T00:00:00Z", by: "Online checkout" }],
  };
}

describe("commissionPool", () => {
  it("splits recorded orders by their real state and drops nothing", () => {
    const orders = [
      order("ORD-1", "fulfilled", 100_00),
      order("ORD-2", "confirmed", 200_00),
      order("ORD-3", "new", 300_00),
      order("ORD-4", "cancelled", 400_00),
    ];
    const pool = commissionPool(orders);
    expect(pool.sales.map((o) => o.order.number)).toEqual(["ORD-1", "ORD-2"]);
    expect(pool.awaiting.map((o) => o.order.number)).toEqual(["ORD-3"]);
    expect(pool.cancelled.map((o) => o.order.number)).toEqual(["ORD-4"]);
    expect(pool.sales.length + pool.awaiting.length + pool.cancelled.length).toBe(orders.length);
  });

  it("sums only the sales that happened, per currency, without converting", () => {
    const orders = [
      order("ORD-1", "fulfilled", 460_000),
      order("ORD-2", "confirmed", 350_000),
      order("ORD-3", "new", 999_999),
      order("ORD-4", "cancelled", 888_888),
      order("ORD-5", "confirmed", 1_000, { currency: "USD" }),
    ];
    const pool = commissionPool(orders);
    expect(pool.saleValueByCurrency).toEqual({ PHP: 810_000, USD: 1_000 });
  });

  it("returns only the records and their real sums — no rate-derived field exists", () => {
    const pool = commissionPool([order("ORD-1", "fulfilled", 100_00)]);
    expect(Object.keys(pool).sort()).toEqual([
      "awaiting",
      "cancelled",
      "saleValueByCurrency",
      "sales",
    ]);
  });

  it("is empty and honest when nothing has sold", () => {
    const pool = commissionPool([]);
    expect(pool.sales).toEqual([]);
    expect(pool.awaiting).toEqual([]);
    expect(pool.cancelled).toEqual([]);
    expect(pool.saleValueByCurrency).toEqual({});
  });
});
