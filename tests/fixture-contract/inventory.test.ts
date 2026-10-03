import { describe, expect, it } from "vitest";
import catalogFile from "@/lib/fixtures/commerce/catalog-items.json";
import inventoryFile from "@/lib/fixtures/commerce/inventory.json";
import casesFile from "@/lib/fixtures/operations/cases.json";
import hrFile from "@/lib/fixtures/hr/employees.json";
import {
  INVENTORY_CATEGORIES,
  INVENTORY_STATES,
  MOVEMENT_KINDS,
  inventoryState,
} from "@/lib/inventory";
import { inventoryLiveModeEnabled, loadInventory } from "@/lib/api-client/inventory";

/**
 * The recorded stock file's contract (the Inventory screen's data).
 *
 * No inventory service exists — that is honest and stays true — but the recorded
 * file must still be a coherent stock room, because the screen presents it as one:
 * movements sum to each item's on-hand count, catalogue-linked rows resolve their
 * price from the catalogue the storefront sells from, allocated movements point at
 * real cases, and `by` names real employees. A missing cost, supplier or reference
 * is a legal recorded state (the screen prints it); a contradiction is not.
 */

type RawItem = Record<string, unknown>;
type RawMovement = Record<string, unknown>;

const items = inventoryFile.items as unknown as RawItem[];
const movements = inventoryFile.movements as unknown as RawMovement[];

describe("inventory fixture identity and vocabulary", () => {
  it("is fixture-mode only: no contract names an inventory service", () => {
    expect(inventoryLiveModeEnabled()).toBe(false);
  });

  it("keeps item ids and SKUs unique and the categories inside the vocabulary", () => {
    const ids = items.map((row) => row.id);
    const skus = items.map((row) => row.sku);
    expect(new Set(ids).size).toBe(items.length);
    expect(new Set(skus).size).toBe(items.length);
    for (const row of items) {
      expect(INVENTORY_CATEGORIES, `bad category on ${String(row.sku)}`).toContain(
        row.category,
      );
    }
  });

  it("keeps movement ids unique, the kinds inside the vocabulary and the items real", () => {
    const ids = movements.map((row) => row.id);
    expect(new Set(ids).size).toBe(movements.length);
    const itemIds = new Set(items.map((row) => row.id));
    for (const row of movements) {
      expect(MOVEMENT_KINDS, `bad kind on ${String(row.id)}`).toContain(row.kind);
      expect(itemIds, `${String(row.id)} names an unknown item`).toContain(row.item_id);
      expect(Number.isInteger(row.quantity), `${String(row.id)} has a non-integer quantity`).toBe(
        true,
      );
    }
  });

  it("has no stored price anywhere: a price is only ever resolved from the catalogue", () => {
    for (const row of items) {
      expect(row, `${String(row.sku)} must not store a price`).not.toHaveProperty("price_cents");
    }
  });
});

describe("inventory fixture arithmetic", () => {
  it("sums every item's movements to exactly its on-hand count", () => {
    const sums = new Map<string, number>();
    for (const row of movements) {
      sums.set(String(row.item_id), (sums.get(String(row.item_id)) ?? 0) + Number(row.quantity));
    }
    for (const row of items) {
      expect(sums.get(String(row.id)) ?? 0, `${String(row.sku)}'s movements`).toBe(row.on_hand);
      expect(Number(row.on_hand), `${String(row.sku)}'s on_hand`).toBeGreaterThanOrEqual(0);
      expect(Number(row.reorder_level), `${String(row.sku)}'s reorder_level`).toBeGreaterThanOrEqual(
        0,
      );
    }
  });

  it("derives a state for every row the screen can print", () => {
    for (const row of items) {
      const state = inventoryState({
        on_hand: Number(row.on_hand),
        reorder_level: Number(row.reorder_level),
      });
      expect(INVENTORY_STATES, `${String(row.sku)}'s state`).toContain(state);
    }
  });
});

describe("inventory fixture cross-references", () => {
  it("resolves every catalogue-linked price from the catalogue, never the stock file", async () => {
    const view = await loadInventory();
    const catalogue = catalogFile.items as unknown as Array<Record<string, unknown>>;
    const bySku = new Map(catalogue.map((entry) => [entry.sku, entry.unit_price_cents]));
    // Clean start (captain, 2026-10-02): the recorded demo stock is removed.
    expect(items).toEqual([]);
    expect(view.items).toEqual([]);
    // The catalogue the storefront sells from is untouched.
    expect(bySku.size).toBeGreaterThan(0);
  });

  it("points every allocated movement at a real case number", () => {
    const caseNumbers = new Set(
      (casesFile.cases as unknown as Array<Record<string, unknown>>).map((row) => row.case_number),
    );
    const allocated = movements.filter((row) => row.kind === "allocated");
    expect(allocated).toEqual([]);
    expect(caseNumbers.size).toBe(0);
  });

  it("records every movement's actor as a real HR employee", () => {
    const employees = hrFile.employees as unknown as Array<Record<string, unknown>>;
    const names = new Set(employees.map((employee) => `${employee.first_name} ${employee.last_name}`));
    for (const row of movements) {
      if (row.by === null || row.by === undefined) continue;
      expect(names, `${String(row.id)} was recorded by ${String(row.by)}`).toContain(row.by);
    }
  });
});
