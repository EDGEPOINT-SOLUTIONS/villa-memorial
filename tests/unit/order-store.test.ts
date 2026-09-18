import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  availableTransitions,
  createOrder,
  getAdminOrder,
  listOrders,
  transitionOrder,
} from "@/lib/api-client/commerce";

/**
 * The durable fixture order store (lib/api-client/order-store.ts): create → list → fetch
 * round trips that survive a module reload, the operator transition rules, and the
 * cancellation reason gate. Every test points ORDERS_STORE_PATH at its own throwaway file,
 * so nothing here touches the repo's .data/ demo store.
 */

const customer = {
  name: "Test Buyer",
  email: "buyer@example.test",
  phone: "+63 900 000 0000",
};

const SEED_COUNT = 5;

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-orders-unit-"));
  process.env.ORDERS_STORE_PATH = path.join(dir, "orders.json");
});

afterEach(async () => {
  delete process.env.ORDERS_STORE_PATH;
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

describe("durable store round trip", () => {
  it("persists a checkout order and returns it from list and fetch — across a module reload", async () => {
    const order = await createOrder({
      customer,
      items: [{ sku: "PKG-BASIC", quantity: 1 }],
    });
    // The seed's highest number is ORD-2026-00007, so allocation must not collide.
    expect(order.number).toBe("ORD-2026-00008");

    const listed = await listOrders();
    expect(listed.map((record) => record.order.number)).toContain(order.number);

    const record = await getAdminOrder(order.number);
    expect(record).not.toBeNull();
    expect(record!.order).toEqual(order);
    expect(record!.customer).toEqual(customer);
    expect(record!.lifecycle_status).toBe("new");
    expect(record!.timeline).toHaveLength(1);

    // The event journal on disk is valid JSON with the created event.
    const persisted = JSON.parse(
      await readFile(process.env.ORDERS_STORE_PATH as string, "utf8"),
    ) as { version: number; events: Array<{ kind: string }> };
    expect(persisted.version).toBe(1);
    expect(persisted.events).toHaveLength(1);
    expect(persisted.events[0].kind).toBe("order_created");

    // A fresh module registry is the closest unit-test proxy for a server restart: the
    // order comes back because it is on disk, not because of in-process state.
    vi.resetModules();
    const fresh = await import("@/lib/api-client/commerce");
    const reread = await fresh.listOrders();
    expect(reread.map((entry) => entry.order.number)).toContain(order.number);
  });

  it("allocates distinct numbers under concurrent creates (serialized writer)", async () => {
    const created = await Promise.all(
      Array.from({ length: 4 }, () =>
        createOrder({ customer, items: [{ sku: "SRV-DELIVERY", quantity: 1 }] }),
      ),
    );
    const numbers = new Set(created.map((order) => order.number));
    expect(numbers.size).toBe(4);

    const listed = await listOrders();
    expect(listed).toHaveLength(SEED_COUNT + 4);
  });

  it("keeps the previous checkout validation: unknown SKU 404, bad quantity/customer 422", async () => {
    await expect(
      createOrder({ customer, items: [{ sku: "GHOST", quantity: 1 }] }),
    ).rejects.toMatchObject({ status: 404, message: "not_found" });
    await expect(
      createOrder({ customer, items: [{ sku: "SRV-DELIVERY", quantity: 0 }] }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      createOrder({
        customer: { name: "", email: "nope", phone: "" },
        items: [{ sku: "SRV-DELIVERY", quantity: 1 }],
      }),
    ).rejects.toMatchObject({ status: 422 });
  });
});

describe("operator lifecycle transitions", () => {
  it("offers exactly the allowed transitions per status", () => {
    expect(availableTransitions("new")).toEqual(["confirmed", "cancelled"]);
    expect(availableTransitions("confirmed")).toEqual(["fulfilled", "cancelled"]);
    expect(availableTransitions("fulfilled")).toEqual([]);
    expect(availableTransitions("cancelled")).toEqual([]);
  });

  it("walks new → confirmed → fulfilled with an actor-stamped timeline", async () => {
    await transitionOrder("ORD-2026-00001", "confirmed", { by: "Sam Staff" });
    const confirmed = await getAdminOrder("ORD-2026-00001");
    expect(confirmed!.lifecycle_status).toBe("confirmed");
    expect(confirmed!.timeline.map((event) => event.status)).toEqual(["new", "confirmed"]);
    expect(confirmed!.timeline.at(-1)?.by).toBe("Sam Staff");

    await transitionOrder("ORD-2026-00001", "fulfilled", { by: "Ada Admin" });
    const fulfilled = await getAdminOrder("ORD-2026-00001");
    expect(fulfilled!.lifecycle_status).toBe("fulfilled");
    expect(fulfilled!.timeline.map((event) => event.status)).toEqual([
      "new",
      "confirmed",
      "fulfilled",
    ]);
  });

  it("rejects transitions a state cannot make", async () => {
    // new → fulfilled skips confirmation.
    await expect(
      transitionOrder("ORD-2026-00001", "fulfilled", { by: "Sam Staff" }),
    ).rejects.toMatchObject({ status: 422 });
    // fulfilled is terminal.
    await expect(
      transitionOrder("ORD-2026-00004", "cancelled", { by: "Sam Staff", reason: "no" }),
    ).rejects.toMatchObject({ status: 422 });
    // cancelled is terminal.
    await expect(
      transitionOrder("ORD-2026-00006", "confirmed", { by: "Sam Staff" }),
    ).rejects.toMatchObject({ status: 422 });
    // unknown number.
    await expect(
      transitionOrder("ORD-1999-99999", "confirmed", { by: "Sam Staff" }),
    ).rejects.toMatchObject({ status: 404 });

    // Nothing above may have persisted a timeline change.
    const untouched = await getAdminOrder("ORD-2026-00001");
    expect(untouched!.lifecycle_status).toBe("new");
    expect(untouched!.timeline).toHaveLength(1);
  });

  it("requires a non-blank cancellation reason and records it on the timeline", async () => {
    await expect(
      transitionOrder("ORD-2026-00001", "cancelled", { by: "Sam Staff" }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      transitionOrder("ORD-2026-00001", "cancelled", { by: "Sam Staff", reason: "   " }),
    ).rejects.toMatchObject({ status: 422 });

    const cancelled = await transitionOrder("ORD-2026-00001", "cancelled", {
      by: "Sam Staff",
      reason: "Family moved the service to another provider.",
    });
    expect(cancelled.lifecycle_status).toBe("cancelled");
    expect(cancelled.timeline.at(-1)).toMatchObject({
      status: "cancelled",
      by: "Sam Staff",
      reason: "Family moved the service to another provider.",
    });

    // Persisted, including the reason.
    const reread = await getAdminOrder("ORD-2026-00001");
    expect(reread!.timeline.at(-1)?.reason).toBe("Family moved the service to another provider.");
  });

  it("survives a status change across a module reload (persisted event)", async () => {
    await transitionOrder("ORD-2026-00002", "fulfilled", { by: "Ada Admin" });
    vi.resetModules();
    const fresh = await import("@/lib/api-client/commerce");
    const record = await fresh.getAdminOrder("ORD-2026-00002");
    expect(record!.lifecycle_status).toBe("fulfilled");
  });
});

describe("live mode honesty", () => {
  it("refuses the admin surface with 503 instead of inventing a contract", async () => {
    vi.stubEnv("COMMERCE_BASE_URL", "http://gateway.example.test");
    vi.resetModules();
    const live = await import("@/lib/api-client/commerce");
    await expect(live.listOrders()).rejects.toMatchObject({ status: 503 });
    await expect(live.getAdminOrder("ORD-2026-00001")).rejects.toMatchObject({ status: 503 });
    await expect(
      live.transitionOrder("ORD-2026-00001", "confirmed", { by: "Sam Staff" }),
    ).rejects.toMatchObject({ status: 503 });
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
