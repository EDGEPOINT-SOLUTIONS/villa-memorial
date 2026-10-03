import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import ordersFile from "@/lib/fixtures/commerce/orders.json";
import {
  getAdminOrder,
  listOrders,
  ORDER_LIFECYCLE_LABEL,
  type OrderLifecycleStatus,
} from "@/lib/api-client/commerce";

/**
 * Fixture↔contract tests for the recorded order seed (`commerce/orders.json`).
 *
 * CLEAN START (captain, 2026-10-02): the recorded demo orders are removed. The
 * order admin and the storefront checkout begin empty; an order is written only
 * when a real checkout runs (lib/api-client/order-store.ts). The frozen
 * order-payment-api-v1 envelope and the catalogue-priced line rule are unchanged.
 */
process.env.ORDERS_STORE_PATH = path.join(
  mkdtempSync(path.join(os.tmpdir(), "vm-orders-seed-")),
  "orders.json",
);

const LIFECYCLE_STATUSES: OrderLifecycleStatus[] = [
  "new",
  "confirmed",
  "fulfilled",
  "cancelled",
];

describe("the recorded order seed starts clean", () => {
  it("carries no recorded orders", async () => {
    expect(ordersFile.orders).toEqual([]);
    expect(await listOrders()).toEqual([]);
  });

  it("keeps the lifecycle vocabulary the screen prints", () => {
    for (const status of LIFECYCLE_STATUSES) {
      expect(ORDER_LIFECYCLE_LABEL[status]).toBeTruthy();
    }
  });

  it("answers null for an unknown admin order", async () => {
    expect(await getAdminOrder("ORD-1999-99999")).toBeNull();
  });
});
