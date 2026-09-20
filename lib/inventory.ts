/**
 * The stock room's vocabulary and rules — PURE, client + server.
 *
 * Why it exists: the Inventory screen (`/staff/inventory`) waits on an inventory
 * service that does not exist. The screen still works over the office's recorded
 * stock file, so the words it uses — the item categories, the three stock states,
 * the three movement kinds and the arithmetic that derives one from a row — live
 * here once, testable without a store, a session or React.
 *
 * NOTHING HERE WRITES, PRICES OR INVENTS: an item's sale price is resolved by the
 * reader from the catalogue (the same store the storefront sells from), a cost the
 * stock file does not carry stays null, and a movement's quantity is exactly the
 * signed number the record holds. The state is DERIVED (out · low · in stock) so a
 * screen cannot disagree with the fixture-contract test about what "low" means.
 */

/* ------------------------------- categories ------------------------------ */

export const INVENTORY_CATEGORIES = ["casket", "urn", "flowers", "supply"] as const;

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export const INVENTORY_CATEGORY_LABEL: Record<InventoryCategory, string> = {
  casket: "Casket",
  urn: "Urn",
  flowers: "Flowers",
  supply: "Supply",
};

export function isInventoryCategory(value: unknown): value is InventoryCategory {
  return typeof value === "string" && (INVENTORY_CATEGORIES as readonly string[]).includes(value);
}

/* --------------------------------- states -------------------------------- */

export const INVENTORY_STATES = ["out", "low", "in_stock"] as const;

export type InventoryState = (typeof INVENTORY_STATES)[number];

export const INVENTORY_STATE_LABEL: Record<InventoryState, string> = {
  out: "Out of stock",
  low: "Low",
  in_stock: "In stock",
};

export const INVENTORY_STATE_TONE: Record<InventoryState, "danger" | "warning" | "success"> = {
  out: "danger",
  low: "warning",
  in_stock: "success",
};

/** Urgency order: an out-of-stock row leads, then low, then everything else. */
export const INVENTORY_STATE_ORDER: Record<InventoryState, number> = {
  out: 0,
  low: 1,
  in_stock: 2,
};

/**
 * The one stock state rule: nothing on hand is out; at or below the recorded
 * reorder level is low; otherwise in stock. A row with no reorder level recorded
 * is only ever out or in stock — never "invented low" from a missing number.
 */
export function inventoryState(
  item: Pick<InventoryItem, "on_hand" | "reorder_level">,
): InventoryState {
  if (item.on_hand <= 0) return "out";
  if (item.reorder_level > 0 && item.on_hand <= item.reorder_level) return "low";
  return "in_stock";
}

/* ------------------------------- movements ------------------------------- */

export const MOVEMENT_KINDS = ["received", "allocated", "adjusted"] as const;

export type MovementKind = (typeof MOVEMENT_KINDS)[number];

export const MOVEMENT_KIND_LABEL: Record<MovementKind, string> = {
  received: "Received",
  allocated: "Allocated",
  adjusted: "Adjusted",
};

export const MOVEMENT_KIND_TONE: Record<MovementKind, "success" | "info" | "warning"> = {
  received: "success",
  allocated: "info",
  adjusted: "warning",
};

export function isMovementKind(value: unknown): value is MovementKind {
  return typeof value === "string" && (MOVEMENT_KINDS as readonly string[]).includes(value);
}

/** "+2" / "−1" / "0" — the sign the office reads, never a bare negative. */
export function movementDelta(quantity: number): string {
  if (quantity > 0) return `+${quantity}`;
  if (quantity < 0) return `−${Math.abs(quantity)}`;
  return "0";
}

/* --------------------------------- shapes -------------------------------- */

export type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  /** The stock-room unit the count is in ("piece", "gallon", "box of 100"). */
  unit: string;
  /** Free text the stock file records; null when it records none. */
  supplier: string | null;
  /** The catalogue entry this stock line sells through, when one exists. */
  catalogue_sku: string | null;
  /** What was paid, integer centavos — null when the file carries no cost. */
  cost_cents: number | null;
  /**
   * The sale price resolved by the reader from the CURRENT catalogue for
   * `catalogue_sku`; null for a stock line the catalogue does not carry. Never
   * typed into a view.
   */
  price_cents: number | null;
  on_hand: number;
  /** Where the stock room keeps it; null when the file records no location. */
  location: string | null;
  reorder_level: number;
};

export type InventoryMovement = {
  id: string;
  item_id: string;
  /** Calendar date, yyyy-mm-dd. */
  at: string;
  kind: MovementKind;
  /** Signed: + received, − allocated, either way for an adjustment. */
  quantity: number;
  /** A delivery receipt, case number or count note; null when none was recorded. */
  reference: string | null;
  /** Who recorded it (an HR employee); null when the record does not say. */
  by: string | null;
};

/* ------------------------------ the rollups ------------------------------ */

/** Items at a glance: out first, then low (alphabetical within a state). */
export function sortInventoryItems(
  items: readonly InventoryItem[],
): InventoryItem[] {
  return [...items].sort((a, b) => {
    const byState = INVENTORY_STATE_ORDER[inventoryState(a)] - INVENTORY_STATE_ORDER[inventoryState(b)];
    if (byState !== 0) return byState;
    return a.name.localeCompare(b.name, "en");
  });
}

export type InventorySummary = {
  tracked: number;
  out: number;
  low: number;
  in_stock: number;
  units_on_hand: number;
  /** Recorded cost × quantity, over the rows that carry a cost. */
  cost_cents: number;
  /** How many tracked rows carry no cost — the total is partial and says so. */
  cost_missing: number;
};

export function inventorySummary(items: readonly InventoryItem[]): InventorySummary {
  const summary: InventorySummary = {
    tracked: items.length,
    out: 0,
    low: 0,
    in_stock: 0,
    units_on_hand: 0,
    cost_cents: 0,
    cost_missing: 0,
  };
  for (const item of items) {
    const state = inventoryState(item);
    if (state === "out") summary.out += 1;
    else if (state === "low") summary.low += 1;
    else summary.in_stock += 1;
    summary.units_on_hand += item.on_hand;
    if (item.cost_cents === null) summary.cost_missing += 1;
    else summary.cost_cents += item.cost_cents * item.on_hand;
  }
  return summary;
}

/** Newest first; the movement history's one order. */
export function sortMovements(
  movements: readonly InventoryMovement[],
): InventoryMovement[] {
  return [...movements].sort((a, b) => {
    if (a.at !== b.at) return b.at.localeCompare(a.at);
    return b.id.localeCompare(a.id);
  });
}

/* -------------------------------- filtering ------------------------------ */

export type InventoryFilter = {
  /** A category key, or empty/undefined for all. */
  category?: string;
  /** A state key, or empty/undefined for all. */
  state?: string;
  /** Free text matched against name, SKU and supplier (case-insensitive). */
  query?: string;
};

/** The screen's filter rule, pure: category, derived state and a text search. */
export function filterInventoryItems(
  items: readonly InventoryItem[],
  filter: InventoryFilter,
): InventoryItem[] {
  const category = filter.category?.trim() ?? "";
  const state = filter.state?.trim() ?? "";
  const query = filter.query?.trim().toLowerCase() ?? "";
  return items.filter((item) => {
    if (category && item.category !== category) return false;
    if (state && inventoryState(item) !== state) return false;
    if (query) {
      const haystack = `${item.name} ${item.sku} ${item.supplier ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}
