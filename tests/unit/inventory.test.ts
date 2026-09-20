import { describe, expect, it } from "vitest";
import {
  filterInventoryItems,
  inventoryState,
  inventorySummary,
  movementDelta,
  sortInventoryItems,
  sortMovements,
  type InventoryItem,
  type InventoryMovement,
} from "@/lib/inventory";

/**
 * The Inventory screen's pure rules: the derived stock state, the rollups, the
 * movement sign and the one filter. The fixture-contract suite proves the recorded
 * file obeys them; this suite proves the rules themselves, so the page cannot be
 * the only place a state or a total is decided.
 */

function item(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: "inv-1",
    sku: "SKU-1",
    name: "Item",
    category: "supply",
    unit: "piece",
    supplier: null,
    catalogue_sku: null,
    cost_cents: 100,
    price_cents: null,
    on_hand: 5,
    location: null,
    reorder_level: 0,
    ...overrides,
  };
}

function movement(overrides: Partial<InventoryMovement> = {}): InventoryMovement {
  return {
    id: "mov-1",
    item_id: "inv-1",
    at: "2026-08-01",
    kind: "received",
    quantity: 1,
    reference: null,
    by: null,
    ...overrides,
  };
}

describe("inventory stock state", () => {
  it("is out when nothing is on hand, whatever the reorder level", () => {
    expect(inventoryState(item({ on_hand: 0, reorder_level: 5 }))).toBe("out");
    expect(inventoryState(item({ on_hand: -1, reorder_level: 5 }))).toBe("out");
  });

  it("is low at or below a recorded reorder level, exactly on it too", () => {
    expect(inventoryState(item({ on_hand: 2, reorder_level: 2 }))).toBe("low");
    expect(inventoryState(item({ on_hand: 1, reorder_level: 2 }))).toBe("low");
  });

  it("is in stock above the reorder level", () => {
    expect(inventoryState(item({ on_hand: 3, reorder_level: 2 }))).toBe("in_stock");
  });

  it("never invents low from a missing reorder level (0 means none recorded)", () => {
    expect(inventoryState(item({ on_hand: 1, reorder_level: 0 }))).toBe("in_stock");
  });
});

describe("inventory sorting, filtering and rollups", () => {
  const items = [
    item({ id: "a", name: "Zeta", on_hand: 3, cost_cents: 100 }),
    item({ id: "b", name: "Alpha", on_hand: 0, cost_cents: 200 }),
    item({ id: "c", name: "Beta", on_hand: 1, reorder_level: 2, cost_cents: null }),
  ];

  it("leads with out-of-stock, then low, then in stock (alphabetical within a state)", () => {
    expect(sortInventoryItems(items).map((entry) => entry.id)).toEqual(["b", "c", "a"]);
  });

  it("summarises counts, units and the recorded-cost total", () => {
    const summary = inventorySummary(items);
    expect(summary.tracked).toBe(3);
    expect(summary.out).toBe(1);
    expect(summary.low).toBe(1);
    expect(summary.in_stock).toBe(1);
    expect(summary.units_on_hand).toBe(4);
    // Only the rows that carry a cost contribute; the missing one is counted, not zeroed.
    expect(summary.cost_cents).toBe(3 * 100 + 0 * 200);
    expect(summary.cost_missing).toBe(1);
  });

  it("filters by category, by the derived state and by name/SKU/supplier text", () => {
    expect(filterInventoryItems(items, { state: "out" }).map((entry) => entry.id)).toEqual(["b"]);
    expect(filterInventoryItems(items, { state: "low" }).map((entry) => entry.id)).toEqual(["c"]);
    expect(filterInventoryItems(items, { query: "alp" }).map((entry) => entry.id)).toEqual(["b"]);
    expect(filterInventoryItems(items, { category: "casket" })).toEqual([]);
    expect(filterInventoryItems(items, {})).toHaveLength(3);
  });

  it("prints the movement sign the office reads, never a bare negative", () => {
    expect(movementDelta(2)).toBe("+2");
    expect(movementDelta(-1)).toBe("−1");
    expect(movementDelta(0)).toBe("0");
  });

  it("orders the movement history newest first", () => {
    const sorted = sortMovements([
      movement({ id: "old", at: "2026-06-01" }),
      movement({ id: "new", at: "2026-09-01" }),
      movement({ id: "mid", at: "2026-08-01" }),
    ]);
    expect(sorted.map((entry) => entry.id)).toEqual(["new", "mid", "old"]);
  });
});
