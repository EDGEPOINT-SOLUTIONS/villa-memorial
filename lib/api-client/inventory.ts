/**
 * Typed read for the Inventory screen (`/staff/inventory`).
 *
 * ⚠ NO INVENTORY SERVICE EXISTS — no contract names one. The screen therefore
 * reads the office's recorded stock file (`lib/fixtures/commerce/inventory.json`,
 * app-authored example records with provenance) through this module, the same
 * pattern as `lib/api-client/lot-lifecycle.ts`.
 *
 * The two rules this seam keeps:
 *  · A stock line's PRICE is never stored in the stock file. When the line names a
 *    catalogue SKU (`catalogue_sku`), the price is resolved from the durable
 *    catalogue — the same store the storefront sells from — so an office price
 *    edit on `/staff/catalog` is what the stock screen shows and the two cannot
 *    drift. A line the catalogue does not carry prices as null, which the screen
 *    prints as not listed rather than inventing an amount.
 *  · A malformed seed crashes loudly (500). The reader validates field by field
 *    and refuses a file whose movements do not sum to each item's on-hand count.
 *
 * LIVE PATH (unimplemented, named here so the branch can be written when a
 * contract freezes): with `INVENTORY_BASE_URL` set this module will read
 * `${INVENTORY_BASE_URL}/inventory/api/v1/items` and `/movements` through the edge
 * gateway; until then `inventoryLiveModeEnabled()` is always false and the screen
 * says what the service will keep. There is no write path in any mode.
 */
import inventoryFile from "@/lib/fixtures/commerce/inventory.json";
import { ApiError } from "@/lib/api-client/api-error";
import { liveModeEnabled } from "@/lib/live-mode";
import { getCatalogRecord } from "@/lib/api-client/catalog-store";
import {
  isInventoryCategory,
  isMovementKind,
  type InventoryItem,
  type InventoryMovement,
} from "@/lib/inventory";

/** No live branch exists: nothing under `docs/08-delivery/contracts/` names inventory. */
export function inventoryLiveModeEnabled(): boolean {
  return liveModeEnabled("inventory");
}

/** The one honest line the screen prints above the recorded stock. */
export const INVENTORY_NOT_WIRED =
  "No inventory service exists yet — this screen reads the office's recorded stock file. " +
  "The inventory service will keep quantities, movements and reorder levels.";

export type InventoryView = {
  items: InventoryItem[];
  movements: InventoryMovement[];
};

type RawStore = {
  items?: unknown;
  movements?: unknown;
};

function fail(what: string): never {
  throw new ApiError(`malformed inventory fixture: ${what}`, 500);
}

function requiredString(row: Record<string, unknown>, key: string, what: string): string {
  const value = row[key];
  if (typeof value !== "string" || value.trim() === "") fail(`${what} has no ${key}`);
  return value.trim();
}

function optionalString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function nonNegativeInteger(value: unknown, what: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) fail(what);
  return value;
}

function toItem(raw: unknown): InventoryItem {
  const what = "item row";
  if (typeof raw !== "object" || raw === null) fail(what);
  const row = raw as Record<string, unknown>;
  if (!isInventoryCategory(row.category)) fail(`${what} has an unknown category`);
  const cost = row.cost_cents;
  if (cost !== null && cost !== undefined && (typeof cost !== "number" || !Number.isInteger(cost) || cost < 0)) {
    fail(`${what} has a malformed cost`);
  }
  return {
    id: requiredString(row, "id", what),
    sku: requiredString(row, "sku", what),
    name: requiredString(row, "name", what),
    category: row.category,
    unit: requiredString(row, "unit", what),
    supplier: optionalString(row, "supplier"),
    catalogue_sku: optionalString(row, "catalogue_sku"),
    cost_cents: typeof cost === "number" ? cost : null,
    price_cents: null,
    on_hand: nonNegativeInteger(row.on_hand, `${what} has a malformed on_hand`),
    location: optionalString(row, "location"),
    reorder_level: nonNegativeInteger(row.reorder_level, `${what} has a malformed reorder_level`),
  };
}

function toMovement(raw: unknown): InventoryMovement {
  const what = "movement row";
  if (typeof raw !== "object" || raw === null) fail(what);
  const row = raw as Record<string, unknown>;
  if (!isMovementKind(row.kind)) fail(`${what} has an unknown kind`);
  const quantity = row.quantity;
  if (typeof quantity !== "number" || !Number.isInteger(quantity)) {
    fail(`${what} has a malformed quantity`);
  }
  return {
    id: requiredString(row, "id", what),
    item_id: requiredString(row, "item_id", what),
    at: requiredString(row, "at", what),
    kind: row.kind,
    quantity,
    reference: optionalString(row, "reference"),
    by: optionalString(row, "by"),
  };
}

/**
 * The recorded stock, with every catalogue-linked line's price resolved from the
 * CURRENT catalogue. Deliberately not cached: a price edit must be visible on the
 * next request, exactly as the storefront reads it.
 */
export async function loadInventory(): Promise<InventoryView> {
  const raw = inventoryFile as unknown;
  if (typeof raw !== "object" || raw === null) fail("no store");
  const store = raw as RawStore;
  if (!Array.isArray(store.items) || !Array.isArray(store.movements)) fail("no items or movements");

  const items = (store.items as unknown[]).map(toItem);
  const movements = (store.movements as unknown[]).map(toMovement);

  const itemIds = new Set(items.map((item) => item.id));
  const byItem = new Map<string, number>();
  for (const movement of movements) {
    if (!itemIds.has(movement.item_id)) {
      fail(`movement ${movement.id} names an unknown item`);
    }
    byItem.set(movement.item_id, (byItem.get(movement.item_id) ?? 0) + movement.quantity);
  }
  for (const item of items) {
    if ((byItem.get(item.id) ?? 0) !== item.on_hand) {
      fail(`${item.sku}'s movements do not sum to its on-hand count`);
    }
  }

  const priced = await Promise.all(
    items.map(async (item): Promise<InventoryItem> => {
      if (!item.catalogue_sku) return item;
      const record = await getCatalogRecord(item.catalogue_sku);
      return { ...item, price_cents: record?.item.unit_price_cents ?? null };
    }),
  );

  return { items: priced, movements };
}
