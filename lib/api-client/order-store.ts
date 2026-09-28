/**
 * Durable fixture-mode order store — the persistence seam behind
 * `lib/api-client/commerce.ts` and the staff Orders admin.
 *
 * WHY A FILE STORE (replacing the per-process `globalThis` Map)
 * The old fixture order path only lived on `globalThis`, so a dev/prod restart dropped every
 * order and the staff admin had nothing durable to read. Orders now persist as a small
 * append-only event journal on disk:
 *
 *   - The recorded seed (`lib/fixtures/commerce/orders.json`) is read-only and folded with
 *     the journal on every read, so updating the seed never has to migrate old state.
 *   - Each mutation appends one event. The whole journal is rewritten to a temp file,
 *     fsync'd, then `rename(2)`d over the store path — an atomic replace, so a crash or a
 *     concurrent reader can never observe a half-written file.
 *   - Mutations run through ONE in-process promise chain, so two Next requests cannot
 *     interleave a read-modify-write (no lost update in the server process that owns the
 *     store). The write remains last-writer-wins if several server processes share one
 *     path, but the file itself is still never corrupt.
 *   - Path: `ORDERS_STORE_PATH` when set (tests), otherwise `.data/commerce-orders.json`
 *     under the app's cwd (gitignored). In the container the cwd is writable; a restart of
 *     the same container keeps its orders.
 *
 * Mirroring the fixture conventions: this is demo persistence, not a service. The frozen
 * `order-payment-api-v1` envelope is untouched — an `AdminOrder` merely WRAPS it with the
 * checkout contact captured at creation and an APP-AUTHORED fulfilment lifecycle
 * (`new → confirmed → fulfilled`, or `→ cancelled`). No service contract names an
 * order-admin list or transition endpoint, so live mode answers 503 honestly
 * (`lib/api-client/commerce.ts` NOT_WIRED) until one freezes; the lifecycle never rewrites
 * the frozen payment `status` (phase 1 processes no payments and issues no refunds).
 *
 * Pricing reads the DURABLE CATALOGUE (`lib/api-client/catalog-store.ts`), not the
 * recorded seed: an admin's price edit is what checkout charges, and a deactivated item
 * is no longer orderable.
 */
import {
  createJournalLock,
  journalPath,
  readJournalEvents,
  writeJournalEvents,
} from "@/lib/api-client/journal";
import { ApiError } from "@/lib/api-client/api-error";
import { listPublishedCatalogRecords } from "@/lib/api-client/catalog-store";
import ordersFile from "@/lib/fixtures/commerce/orders.json";
import type { CheckoutInput, OrderResponse } from "@/lib/api-client/commerce";

/* ----------------------------- admin record ----------------------------- */

/** The counter's fulfilment lifecycle. Distinct from the frozen payment `status`. */
export type OrderLifecycleStatus = "new" | "confirmed" | "fulfilled" | "cancelled";

/** The transitions an operator may perform from each state. Terminal states have none. */
export type OrderTransition = "confirmed" | "fulfilled" | "cancelled";

export type OrderTimelineEvent = {
  status: OrderLifecycleStatus;
  at: string;
  /** Display name of who performed it ("Online checkout" for creation). */
  by: string;
  /** Required on cancellation, absent otherwise. */
  reason?: string;
};

export type AdminOrder = {
  /** The frozen `order-payment-api-v1` envelope, byte-shape identical to the public API. */
  order: OrderResponse;
  /** Checkout contact details — captured at creation, not part of the frozen envelope. */
  customer: { name: string; email: string; phone: string };
  lifecycle_status: OrderLifecycleStatus;
  /** Oldest first; the last event's status always equals `lifecycle_status`. */
  timeline: OrderTimelineEvent[];
};

export const ORDER_LIFECYCLE_LABEL: Record<OrderLifecycleStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

const TRANSITIONS: Record<OrderLifecycleStatus, OrderTransition[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["fulfilled", "cancelled"],
  fulfilled: [],
  cancelled: [],
};

/** The transitions the operator may take next — the same table the store enforces. */
export function availableTransitions(status: OrderLifecycleStatus): OrderTransition[] {
  return [...TRANSITIONS[status]];
}

/* ------------------------------- storage -------------------------------- */

type PersistedEvent =
  | { kind: "order_created"; at: string; order: AdminOrder }
  | { kind: "status_changed"; at: string; number: string; event: OrderTimelineEvent };

export function orderStorePath(): string {
  return journalPath("ORDERS_STORE_PATH", "commerce-orders.json");
}

const withStoreLock = createJournalLock();

/* ------------------------------ readers --------------------------------- */

function malformed(what: string): never {
  throw new ApiError(`malformed order fixture: ${what}`, 500);
}

function requiredString(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim().length === 0) malformed(what);
  return value;
}

function requiredInteger(value: unknown, what: string, min = 0): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) malformed(what);
  return value;
}

function toOrderLine(raw: unknown): OrderResponse["items"][number] {
  if (typeof raw !== "object" || raw === null) malformed("order item");
  const r = raw as Record<string, unknown>;
  const itemType = requiredString(r.item_type, "order item type");
  if (itemType !== "package" && itemType !== "service" && itemType !== "add_on") {
    malformed(`order item type ${itemType}`);
  }
  return {
    catalog_item_id: requiredInteger(r.catalog_item_id, "order item id", 1),
    item_type: itemType,
    sku: requiredString(r.sku, "order item sku"),
    name: requiredString(r.name, "order item name"),
    quantity: requiredInteger(r.quantity, "order item quantity", 1),
    unit_price_cents: requiredInteger(r.unit_price_cents, "order item price"),
  };
}

function toOrderResponse(raw: unknown): OrderResponse {
  if (typeof raw !== "object" || raw === null) malformed("order envelope");
  const r = raw as Record<string, unknown>;
  for (const key of ["number", "status", "customer_name", "total_cents", "currency", "items"]) {
    if (r[key] == null) malformed(`order.${key}`);
  }
  const status = requiredString(r.status, "order status");
  if (status !== "pending" && status !== "paid" && status !== "cancelled") {
    malformed(`order status ${status}`);
  }
  if (!Array.isArray(r.items) || r.items.length === 0) malformed("order items");
  return {
    number: requiredString(r.number, "order number"),
    status,
    customer_name: requiredString(r.customer_name, "customer name"),
    total_cents: requiredInteger(r.total_cents, "order total"),
    currency: requiredString(r.currency, "currency"),
    items: r.items.map(toOrderLine),
    placed_at: typeof r.placed_at === "string" ? r.placed_at : undefined,
    event_uuid: typeof r.event_uuid === "string" ? r.event_uuid : undefined,
  };
}

function toLifecycleStatus(value: unknown): OrderLifecycleStatus {
  if (value !== "new" && value !== "confirmed" && value !== "fulfilled" && value !== "cancelled") {
    malformed(`lifecycle status ${String(value)}`);
  }
  return value;
}

function toTimelineEvent(raw: unknown): OrderTimelineEvent {
  if (typeof raw !== "object" || raw === null) malformed("timeline event");
  const r = raw as Record<string, unknown>;
  const event: OrderTimelineEvent = {
    status: toLifecycleStatus(r.status),
    at: requiredString(r.at, "timeline timestamp"),
    by: requiredString(r.by, "timeline actor"),
  };
  if (typeof r.reason === "string" && r.reason.trim().length > 0) {
    event.reason = r.reason;
  }
  return event;
}

/** Field-by-field reader for seed rows and journal events; extras are ignored. */
export function toAdminOrder(raw: unknown): AdminOrder {
  if (typeof raw !== "object" || raw === null) malformed("order record");
  const r = raw as Record<string, unknown>;
  const order = toOrderResponse(r.order);
  if (typeof r.customer !== "object" || r.customer === null) malformed("order customer");
  const c = r.customer as Record<string, unknown>;
  const lifecycle_status = toLifecycleStatus(r.lifecycle_status);
  if (!Array.isArray(r.timeline) || r.timeline.length === 0) malformed("order timeline");
  const timeline = r.timeline.map(toTimelineEvent);
  const last = timeline[timeline.length - 1];
  if (last.status !== lifecycle_status) {
    malformed(`timeline for ${order.number} does not end at its recorded status`);
  }
  if (
    lifecycle_status === "cancelled" &&
    !timeline.some((event) => event.status === "cancelled" && event.reason)
  ) {
    malformed(`cancelled order ${order.number} has no cancellation reason`);
  }
  return {
    order,
    customer: {
      name: requiredString(c.name, "customer name"),
      email: requiredString(c.email, "customer email"),
      phone: requiredString(c.phone, "customer phone"),
    },
    lifecycle_status,
    timeline,
  };
}

function toPersistedEvent(raw: unknown): PersistedEvent {
  if (typeof raw !== "object" || raw === null) malformed("store event");
  const r = raw as Record<string, unknown>;
  if (r.kind === "order_created") {
    return { kind: "order_created", at: requiredString(r.at, "event timestamp"), order: toAdminOrder(r.order) };
  }
  if (r.kind === "status_changed") {
    return {
      kind: "status_changed",
      at: requiredString(r.at, "event timestamp"),
      number: requiredString(r.number, "event order number"),
      event: toTimelineEvent(r.event),
    };
  }
  malformed(`store event kind ${String(r.kind)}`);
}

async function readPersistedEvents(): Promise<PersistedEvent[]> {
  const events = await readJournalEvents(orderStorePath(), "order");
  return events.map(toPersistedEvent);
}

function persistEvents(events: PersistedEvent[]): Promise<void> {
  return writeJournalEvents(orderStorePath(), "order", events);
}

/** Seed + journal folded into the current admin records, newest order first. */
async function loadState(): Promise<{ orders: AdminOrder[]; events: PersistedEvent[] }> {
  const seed = (ordersFile as unknown as { orders: unknown[] }).orders.map(toAdminOrder);
  const events = await readPersistedEvents();
  const byNumber = new Map(seed.map((order) => [order.order.number, structuredClone(order)]));
  for (const event of events) {
    if (event.kind === "order_created") {
      byNumber.set(event.order.order.number, structuredClone(event.order));
      continue;
    }
    const current = byNumber.get(event.number);
    if (!current) {
      throw new ApiError(`the order store references unknown order ${event.number}`, 500);
    }
    current.timeline = [...current.timeline, event.event];
    current.lifecycle_status = event.event.status;
  }
  const orders = [...byNumber.values()].sort((a, b) =>
    (b.order.placed_at ?? "").localeCompare(a.order.placed_at ?? ""),
  );
  return { orders, events };
}

/* ------------------------------ store API ------------------------------- */

/** Every admin order: recorded seed plus everything checkout persisted. */
export async function listFixtureAdminOrders(): Promise<AdminOrder[]> {
  return (await loadState()).orders;
}

/** One admin order, or null when no such number exists. */
export async function getFixtureAdminOrder(number: string): Promise<AdminOrder | null> {
  const { orders } = await loadState();
  return orders.find((record) => record.order.number === number) ?? null;
}

/** Same numbering as the old fixture path but derived from the store, so seed rows cannot collide. */
function nextSequence(orders: AdminOrder[]): number {
  let max = 0;
  for (const { order } of orders) {
    const match = /^ORD-\d{4}-(\d+)$/.exec(order.number);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

/**
 * Fixture-mode checkout: validates, re-prices from the recorded catalogue (never the
 * client), allocates the next `ORD-2026-NNNNN`, and persists the order before returning
 * the frozen envelope. Identical validation/pricing to the previous in-memory path.
 */
export async function createFixtureOrder(input: CheckoutInput): Promise<OrderResponse> {
  const { customer, items } = input;
  if (!customer?.name?.trim() || !customer?.email?.includes("@") || !customer?.phone?.trim()) {
    throw new ApiError("customer details are incomplete", 422);
  }

  // Merge duplicate SKUs; validate against the durable catalogue (server-priced).
  // Reading the STORE (not the recorded seed) is what makes an admin's price
  // edit the price checkout charges, and makes a deactivated item unorderable.
  const catalog = await listPublishedCatalogRecords();
  const merged = new Map<string, number>();
  for (const line of items ?? []) {
    const qty = Number(line.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new ApiError("quantities must be positive whole numbers", 422);
    }
    merged.set(line.sku, (merged.get(line.sku) ?? 0) + qty);
  }
  if (merged.size === 0) throw new ApiError("at least one item is required", 422);

  const lines = [...merged.entries()].map(([sku, quantity]) => {
    const record = catalog.find((entry) => entry.item.sku === sku);
    if (!record) throw new ApiError("not_found", 404); // contract: unknown SKU
    return { item: record.item, quantity };
  });

  return withStoreLock(async () => {
    const { orders, events } = await loadState();
    // The catalogue client uses ORD-2026-… everywhere (contract example, fixture, tests);
    // the demo year stays fixed so a clock rollover cannot split the sequence namespace.
    const seq = nextSequence(orders);
    const number = `ORD-2026-${String(seq).padStart(5, "0")}`;
    const now = new Date().toISOString();
    const order: OrderResponse = {
      number,
      status: "paid", // M0 sandbox adapter succeeds synchronously per contract
      customer_name: customer.name.trim(),
      total_cents: lines.reduce((sum, l) => sum + l.item.unit_price_cents * l.quantity, 0),
      currency: "PHP",
      items: lines.map(({ item, quantity }) => ({
        catalog_item_id: item.id,
        item_type: item.item_type,
        sku: item.sku,
        name: item.name,
        quantity,
        unit_price_cents: item.unit_price_cents,
      })),
      placed_at: now,
      event_uuid: `fixture-event-${String(seq).padStart(5, "0")}`,
    };
    const record: AdminOrder = {
      order,
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim(),
        phone: customer.phone.trim(),
      },
      lifecycle_status: "new",
      timeline: [{ status: "new", at: now, by: "Online checkout" }],
    };
    await persistEvents([
      ...events,
      { kind: "order_created", at: now, order: structuredClone(record) },
    ]);
    return order;
  });
}

/**
 * Applies an operator transition under the store lock: re-reads the latest state, checks
 * the transition with the same table the UI renders, records the timeline event and
 * persists it. Returns the updated admin record.
 */
export function transitionFixtureOrder(
  number: string,
  status: OrderTransition,
  actor: { by: string; reason?: string },
): Promise<AdminOrder> {
  return withStoreLock(async () => {
    const { orders, events } = await loadState();
    const found = orders.find((record) => record.order.number === number);
    if (!found) throw new ApiError("not_found", 404);
    if (!TRANSITIONS[found.lifecycle_status].includes(status)) {
      throw new ApiError(
        `an order that is ${ORDER_LIFECYCLE_LABEL[found.lifecycle_status].toLowerCase()} cannot be ${status}`,
        422,
      );
    }
    const reason = actor.reason?.trim() ?? "";
    if (status === "cancelled" && reason.length === 0) {
      throw new ApiError("a cancellation reason is required", 422);
    }
    const event: OrderTimelineEvent = {
      status,
      at: new Date().toISOString(),
      by: actor.by.trim() || "Staff",
      ...(reason.length > 0 ? { reason } : {}),
    };
    await persistEvents([...events, { kind: "status_changed", at: event.at, number, event }]);
    return {
      ...found,
      lifecycle_status: status,
      timeline: [...found.timeline, event],
    };
  });
}
