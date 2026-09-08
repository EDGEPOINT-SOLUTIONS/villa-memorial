/**
 * Typed client for the FROZEN order-payment-api-v1 surface
 * (docs/08-delivery/contracts/order-payment-api-v1.md):
 *   GET  /api/v1/catalog_items[?item_type=package|service|add_on]
 *   GET  /api/v1/catalog_items/:id_or_sku
 *   POST /api/v1/orders            {customer:{name,email,phone},items:[{sku,quantity}]}
 *   GET  /api/v1/orders/:number
 *
 * Those are the paths each SERVICE serves. Reaching them through the edge gateway means
 * prefixing the gateway's route name — `/catalog/...` for catalog-pricing, `/orders/...`
 * for commerce-ordering — which the gateway strips before proxying (ADR-004: routing by
 * prefix, nothing else). Two services behind one base URL is why the prefix cannot live in
 * COMMERCE_BASE_URL itself.
 *
 * Consumer rules honored here: tolerant reader (extra fields ignored); prices
 * NEVER sent by the client (server re-prices); totals taken from the server
 * response only; status polled by order number.
 *
 * Live mode: COMMERCE_BASE_URL set → requests hit the gateway. Fixture mode:
 * recorded mirrors of catalog-pricing seeds + a deterministic paid-order
 * response so the full buy flow demos standalone.
 */
import { ApiError } from "@/lib/api-client/api-error";
import catalogFile from "@/lib/fixtures/commerce/catalog-items.json";

const BASE_URL = process.env.COMMERCE_BASE_URL ?? "";

// Gateway route prefixes. Stripped by the gateway; services never see them.
const CATALOG_ROUTE = "/catalog";
const ORDERS_ROUTE = "/orders";

export function commerceLiveModeEnabled(): boolean {
  return BASE_URL.length > 0;
}

export type CatalogItem = {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  item_type: "package" | "service" | "add_on";
  unit_price_cents: number;
  currency: string;
  display_price: string;
};

export type OrderResponse = {
  number: string;
  status: "pending" | "paid" | "cancelled";
  customer_name: string;
  total_cents: number;
  currency: string;
  items: Array<{
    catalog_item_id: number;
    item_type: CatalogItem["item_type"];
    sku: string;
    name: string;
    quantity: number;
    unit_price_cents: number;
  }>;
  placed_at?: string;
  event_uuid?: string;
};

type CatalogStore = { items: CatalogItem[] };

async function getJson(path: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { cache: "no-store" });
  } catch {
    throw new ApiError("upstream unavailable", 502);
  }
  return handleResponse(res);
}

async function postJson(path: string, body: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("upstream unavailable", 502);
  }
  return handleResponse(res);
}

async function handleResponse(res: Response): Promise<unknown> {
  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload
        ? String((payload as { error: unknown }).error)
        : res.status === 404
          ? "not_found"
          : "request failed";
    throw new ApiError(message, res.status);
  }
  return payload;
}

function asCatalogItem(raw: unknown): CatalogItem {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("unexpected upstream response", 502);
  }
  const r = raw as Record<string, unknown>;
  for (const k of ["id", "sku", "name", "item_type", "unit_price_cents", "currency", "display_price"]) {
    if (r[k] == null) throw new ApiError("unexpected upstream response", 502);
  }
  return {
    id: Number(r.id),
    sku: String(r.sku),
    name: String(r.name),
    description: r.description == null ? null : String(r.description),
    item_type: r.item_type as CatalogItem["item_type"],
    unit_price_cents: Number(r.unit_price_cents),
    currency: String(r.currency),
    display_price: String(r.display_price),
  };
}

function asOrderResponse(raw: unknown): OrderResponse {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("unexpected upstream response", 502);
  }
  const r = raw as Record<string, unknown>;
  for (const k of ["number", "status", "customer_name", "total_cents", "currency", "items"]) {
    if (r[k] == null) throw new ApiError("unexpected upstream response", 502);
  }
  const items = Array.isArray(r.items)
    ? (r.items as unknown[]).map((it) => {
        const o = it as Record<string, unknown>;
        return {
          catalog_item_id: Number(o.catalog_item_id),
          item_type: o.item_type as CatalogItem["item_type"],
          sku: String(o.sku),
          name: String(o.name),
          quantity: Number(o.quantity),
          unit_price_cents: Number(o.unit_price_cents),
        };
      })
    : [];
  return {
    number: String(r.number),
    status: r.status as OrderResponse["status"],
    customer_name: String(r.customer_name),
    total_cents: Number(r.total_cents),
    currency: String(r.currency),
    items,
    placed_at: typeof r.placed_at === "string" ? r.placed_at : undefined,
    event_uuid: typeof r.event_uuid === "string" ? r.event_uuid : undefined,
  };
}

/* ------------------------------ live mode ------------------------------ */

export async function listCatalogItems(
  itemType?: CatalogItem["item_type"],
): Promise<CatalogItem[]> {
  if (commerceLiveModeEnabled()) {
    const q = itemType ? `?item_type=${encodeURIComponent(itemType)}` : "";
    const raw = await getJson(`${CATALOG_ROUTE}/api/v1/catalog_items${q}`);
    if (!Array.isArray(raw)) throw new ApiError("unexpected upstream response", 502);
    return raw.map(asCatalogItem);
  }
  return fixtureListCatalogItems(itemType);
}

export async function getCatalogItem(idOrSku: string): Promise<CatalogItem> {
  if (commerceLiveModeEnabled()) {
    return asCatalogItem(
      await getJson(`${CATALOG_ROUTE}/api/v1/catalog_items/${encodeURIComponent(idOrSku)}`),
    );
  }
  return fixtureGetCatalogItem(idOrSku);
}

export type CheckoutInput = {
  customer: { name: string; email: string; phone: string };
  items: Array<{ sku: string; quantity: number }>;
};

export async function createOrder(input: CheckoutInput): Promise<OrderResponse> {
  if (commerceLiveModeEnabled()) {
    return asOrderResponse(await postJson(`${ORDERS_ROUTE}/api/v1/orders`, input));
  }
  return fixtureCreateOrder(input);
}

export async function getOrderByNumber(number: string): Promise<OrderResponse> {
  if (commerceLiveModeEnabled()) {
    return asOrderResponse(
      await getJson(`${ORDERS_ROUTE}/api/v1/orders/${encodeURIComponent(number)}`),
    );
  }
  return fixtureGetOrderByNumber(number);
}

/* ----------------------------- fixture mode ----------------------------- */

const STORE = catalogFile as unknown as CatalogStore;

// Next.js compiles route handlers into separate bundles — module-level
// variables are NOT shared across them. Demo order state must live on
// globalThis so POST /api/orders and GET /api/orders/:number see the same
// store within one server process (fixtures mode is demo-only anyway).
type FixtureGlobal = typeof globalThis & {
  __imFixtureOrders?: Map<string, OrderResponse>;
  __imFixtureOrderSeq?: number;
};
const fixtureGlobal = globalThis as FixtureGlobal;
const recordedOrders = (fixtureGlobal.__imFixtureOrders ??= new Map<string, OrderResponse>());

function findFixture(sku: string): CatalogItem | undefined {
  return STORE.items.find((i) => i.sku === sku);
}

function fixtureListCatalogItems(
  itemType?: CatalogItem["item_type"],
): CatalogItem[] {
  return STORE.items.filter((i) => !itemType || i.item_type === itemType);
}

function fixtureGetCatalogItem(idOrSku: string): CatalogItem {
  const item =
    STORE.items.find((i) => i.sku === idOrSku) ||
    (/^\d+$/.test(idOrSku)
      ? STORE.items.find((i) => i.id === Number(idOrSku))
      : undefined);
  if (!item) throw new ApiError("not_found", 404);
  return item;
}

export function fixtureCreateOrder(input: CheckoutInput): OrderResponse {
  const { customer, items } = input;
  if (
    !customer?.name?.trim() ||
    !customer?.email?.includes("@") ||
    !customer?.phone?.trim()
  ) {
    throw new ApiError("customer details are incomplete", 422);
  }

  // Merge duplicate SKUs; validate against the seeded catalog (server-priced).
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
    const item = findFixture(sku);
    if (!item) throw new ApiError("not_found", 404); // contract: unknown SKU
    return { item, quantity };
  });

  fixtureGlobal.__imFixtureOrderSeq = (fixtureGlobal.__imFixtureOrderSeq ?? 0) + 1;
  const seq = fixtureGlobal.__imFixtureOrderSeq;
  const now = new Date().toISOString();
  const order: OrderResponse = {
    number: `ORD-2026-${String(seq).padStart(5, "0")}`,
    status: "paid", // M0 sandbox adapter succeeds synchronously per contract
    customer_name: customer.name.trim(),
    total_cents: lines.reduce((s, l) => s + l.item.unit_price_cents * l.quantity, 0),
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
    event_uuid: `fixture-event-${seq}`,
  };
  // Fixture-mode persistence (in-memory): GET /orders/:number works right
  // after creation, mirroring live capability-token semantics.
  recordedOrders.set(order.number, order);
  return order;
}

export function fixtureGetOrderByNumber(number: string): OrderResponse {
  const found = recordedOrders.get(number);
  if (!found) throw new ApiError("not_found", 404);
  return found;
}
