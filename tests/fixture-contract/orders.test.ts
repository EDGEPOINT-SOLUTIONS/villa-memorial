import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import catalogFile from "@/lib/fixtures/commerce/catalog-items.json";
import invoicesFile from "@/lib/fixtures/finance/invoices.json";
import {
  getAdminOrder,
  getOrderByNumber,
  listOrders,
  ORDER_LIFECYCLE_LABEL,
  type OrderLifecycleStatus,
} from "@/lib/api-client/commerce";

/**
 * Fixture↔contract tests for the recorded order seed (`commerce/orders.json`).
 *
 * The seed's `order` halves must stay the FROZEN order-payment-api-v1 envelope, and its
 * line items must be the REAL catalogue's SKUs/prices — never invented amounts. The demo
 * coherence rule (the seed's numbers/customers/totals line up with the billing fixture's
 * invoices) is pinned too, so the two demo modules cannot drift apart silently.
 */
process.env.ORDERS_STORE_PATH = path.join(
  mkdtempSync(path.join(os.tmpdir(), "vm-orders-seed-")),
  "orders.json",
);

const CATALOG = catalogFile as unknown as {
  items: Array<{ id: number; sku: string; name: string; item_type: string; unit_price_cents: number }>;
};
const INVOICES = invoicesFile as unknown as {
  invoices: Array<{ invoice_number: string; order_number: string | null; customer_name: string; total_cents: number }>;
};

const LIFECYCLE_STATUSES: OrderLifecycleStatus[] = [
  "new",
  "confirmed",
  "fulfilled",
  "cancelled",
];

describe("the recorded order seed follows the frozen envelope and the real catalogue", () => {
  it("reads through the store's field-by-field reader (malformed rows would throw)", async () => {
    const orders = await listOrders();
    expect(orders.length).toBeGreaterThanOrEqual(4);
    for (const record of orders) {
      expect(record.order.number).toMatch(/^ORD-\d{4}-\d{5}$/);
      expect(record.order.status).toMatch(/^(pending|paid|cancelled)$/);
      expect(record.order.currency).toBe("PHP");
      expect(record.order.items.length).toBeGreaterThan(0);
      expect(Number.isInteger(record.order.total_cents)).toBe(true);
      expect(record.customer.name).toBe(record.order.customer_name);
      expect(record.customer.email).toContain("@");
    }
  });

  it("prices every line from commerce/catalog-items.json and totals the lines", async () => {
    for (const record of await listOrders()) {
      let total = 0;
      for (const item of record.order.items) {
        const catalogItem = CATALOG.items.find((entry) => entry.sku === item.sku);
        expect(catalogItem, `${record.order.number} line ${item.sku}`).toBeDefined();
        expect(item.name).toBe(catalogItem!.name);
        expect(item.item_type).toBe(catalogItem!.item_type);
        expect(item.unit_price_cents).toBe(catalogItem!.unit_price_cents);
        expect(item.catalog_item_id).toBe(catalogItem!.id);
        total += item.unit_price_cents * item.quantity;
      }
      expect(record.order.total_cents, `${record.order.number} total`).toBe(total);
    }
  });

  it("keeps the lifecycle timeline consistent and covers every filter status", async () => {
    const orders = await listOrders();
    for (const record of orders) {
      expect(record.timeline[0].status).toBe("new");
      expect(record.timeline[record.timeline.length - 1].status).toBe(record.lifecycle_status);
      expect(ORDER_LIFECYCLE_LABEL[record.lifecycle_status]).toBeTruthy();
      if (record.lifecycle_status === "cancelled") {
        expect(record.timeline.some((event) => event.status === "cancelled" && event.reason)).toBe(true);
      }
    }
    const present = new Set(orders.map((record) => record.lifecycle_status));
    for (const status of LIFECYCLE_STATUSES) {
      expect(present, `seed has a ${status} order`).toContain(status);
    }
  });

  it("lines up with the billing fixture's invoices (one demo story per order)", async () => {
    for (const record of await listOrders()) {
      const invoice = INVOICES.invoices.find(
        (entry) => entry.order_number === record.order.number,
      );
      expect(invoice, `invoice for ${record.order.number}`).toBeDefined();
      expect(invoice!.customer_name).toBe(record.order.customer_name);
      expect(invoice!.total_cents).toBe(record.order.total_cents);
    }
  });

  it("returns the frozen envelope from the public lookup, with no admin fields", async () => {
    const [first] = await listOrders();
    const fetched = await getOrderByNumber(first.order.number);
    expect(fetched).toEqual(first.order);
    const keys = Object.keys(fetched);
    expect(keys).not.toContain("lifecycle_status");
    expect(keys).not.toContain("customer");
    expect(keys).not.toContain("timeline");
  });

  it("answers null for an unknown admin order", async () => {
    expect(await getAdminOrder("ORD-1999-99999")).toBeNull();
  });
});
