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
import {
  createCatalogRecord,
  getCatalogRecord,
  listCatalogRecords,
  listPublishedCatalogRecords,
  updateCatalogRecord,
  type AdminCatalogItem,
  type CatalogDraft,
  type CatalogDraftErrors,
  type CatalogItemRecord,
} from "@/lib/api-client/catalog-store";
import {
  createFixtureOrder,
  getFixtureAdminOrder,
  listFixtureAdminOrders,
  transitionFixtureOrder,
  type AdminOrder,
  type OrderTransition,
} from "@/lib/api-client/order-store";

export {
  availableTransitions,
  ORDER_LIFECYCLE_LABEL,
  type AdminOrder,
  type OrderLifecycleStatus,
  type OrderTimelineEvent,
  type OrderTransition,
} from "@/lib/api-client/order-store";

export type { AdminCatalogItem, CatalogDraft, CatalogDraftErrors, CatalogItemRecord };

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
  /** APP-AUTHORED storefront photo (the catalogue admin's media picker). NOT a
   * frozen contract field: live upstream never sends it → null, and the public
   * views fall back to their own recorded imagery. */
  image?: string | null;
  /**
   * APP-AUTHORED senior-citizen price, in minor units. NOT a frozen contract field
   * (the envelope names `unit_price_cents` and no senior figure) — live upstream omits
   * it, and a surface that needs a senior line falls back to the recorded sheet value.
   *
   * WHY IT IS HERE (2026-09-27). The 2026 casket sheet prints a senior price per model,
   * and it existed in exactly one place: the hardcoded `CASKET_MODELS` list. The staff
   * catalogue admin edits the durable catalogue, not that list, so **the senior price was
   * not editable at all** — and the regular price was editable in a way the storefront
   * ignored. The catalogue is the live selling record for both figures now, with the
   * sheet as the provenance of the seed
   * (`tests/fixture-contract/catalog-sources.test.ts` pins them together).
   *
   * Absent or null means "this item has no senior price", which is honest for a service
   * or a package — never 0, which would read as free.
   */
  senior_price_cents?: number | null;
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
    image: typeof r.image === "string" && r.image.trim().length > 0 ? r.image : null,
    // App-authored, and optional by design: a live upstream omits it, and so does every
    // item that genuinely has no senior price. Anything that is not a positive integer is
    // treated as "none" rather than coerced, so a malformed value cannot print as ₱0.
    senior_price_cents:
      typeof r.senior_price_cents === "number" &&
      Number.isInteger(r.senior_price_cents) &&
      r.senior_price_cents > 0
        ? r.senior_price_cents
        : null,
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

/* --------------------------- admin (staff) mode --------------------------- */

/**
 * Staff order administration (list · detail · lifecycle transitions).
 *
 * The frozen order-payment-api-v1 contract carries no admin list and no transition
 * endpoint, so LIVE MODE HONESTLY REFUSES (503) instead of inventing a contract — the same
 * posture as purchase-applications.ts. Fixture mode reads the durable store
 * (lib/api-client/order-store.ts), which folds the recorded seed with everything checkout
 * persisted. `orders:read` guards the screens, `orders:write` the transition route.
 */
export const ADMIN_ORDERS_NOT_WIRED =
  "order administration is fixture-mode only: no frozen contract names an order list or " +
  "status-transition endpoint yet.";

/** Every order for the staff admin screen, newest first. */
export async function listOrders(): Promise<AdminOrder[]> {
  if (commerceLiveModeEnabled()) {
    throw new ApiError(ADMIN_ORDERS_NOT_WIRED, 503);
  }
  return listFixtureAdminOrders();
}

/** One order for the staff admin detail screen, or null when the number is unknown. */
export async function getAdminOrder(number: string): Promise<AdminOrder | null> {
  if (commerceLiveModeEnabled()) {
    throw new ApiError(ADMIN_ORDERS_NOT_WIRED, 503);
  }
  return getFixtureAdminOrder(number);
}

/** Applies one operator lifecycle transition (new → confirmed → fulfilled, or → cancelled). */
export async function transitionOrder(
  number: string,
  status: OrderTransition,
  actor: { by: string; reason?: string },
): Promise<AdminOrder> {
  if (commerceLiveModeEnabled()) {
    throw new ApiError(ADMIN_ORDERS_NOT_WIRED, 503);
  }
  return transitionFixtureOrder(number, status, actor);
}

/* --------------------------- admin (staff) mode --------------------------- */

/**
 * Staff catalogue administration (list · read · create · edit · deactivate).
 *
 * The frozen order-payment-api-v1 contract carries no catalogue write endpoint,
 * so LIVE MODE HONESTLY REFUSES (503) instead of inventing a contract — the
 * same posture as the orders admin. Fixture mode reads and writes the durable
 * store (lib/api-client/catalog-store.ts), which folds the recorded seed with
 * every admin edit; the storefront readers below read the SAME fold, so a
 * change here is what `/products`, `/plans`, `/services`, the cart and checkout
 * see on the next request. `catalog:read` guards the screens, `catalog:write`
 * the create/edit routes.
 *
 * CONTRACT ASK (recorded in the PR): the platform needs a catalog write API
 * (create/update/publish) before live mode can offer this screen.
 */
export const ADMIN_CATALOG_NOT_WIRED =
  "catalogue administration is fixture-mode only: the platform has no catalogue " +
  "write API yet, so creating, editing or deactivating an item would invent a contract.";

/** Every catalogue item for the staff admin screen, published or not. */
export async function listAdminCatalogItems(): Promise<AdminCatalogItem[]> {
  if (commerceLiveModeEnabled()) throw new ApiError(ADMIN_CATALOG_NOT_WIRED, 503);
  return listCatalogRecords();
}

/** One item for the admin edit screen, or null when the id/SKU is unknown. */
export async function getAdminCatalogItem(
  idOrSku: string,
): Promise<AdminCatalogItem | null> {
  if (commerceLiveModeEnabled()) throw new ApiError(ADMIN_CATALOG_NOT_WIRED, 503);
  return getCatalogRecord(idOrSku);
}

/** Creates an item from a draft; field errors arrive as an ApiError's fieldErrors. */
export async function createCatalogItem(raw: unknown): Promise<AdminCatalogItem> {
  if (commerceLiveModeEnabled()) throw new ApiError(ADMIN_CATALOG_NOT_WIRED, 503);
  return createCatalogRecord(raw);
}

/** Edits an item by id or SKU (uniqueness re-checked; items are never deleted). */
export async function updateCatalogItem(
  idOrSku: string,
  raw: unknown,
): Promise<AdminCatalogItem> {
  if (commerceLiveModeEnabled()) throw new ApiError(ADMIN_CATALOG_NOT_WIRED, 503);
  return updateCatalogRecord(idOrSku, raw);
}

/* ----------------------------- fixture mode ----------------------------- */

/**
 * The public storefront read: the durable store's PUBLISHED items only, so an
 * item created in the admin is offered and a deactivated one disappears on the
 * next request. App-authored extras (image) ride along; the frozen fields are
 * unchanged.
 */
async function fixtureListCatalogItems(
  itemType?: CatalogItem["item_type"],
): Promise<CatalogItem[]> {
  const records = await listPublishedCatalogRecords(itemType);
  return records.map((record) => record.item);
}

async function fixtureGetCatalogItem(idOrSku: string): Promise<CatalogItem> {
  const record = await getCatalogRecord(idOrSku);
  // Unpublished is invisible to the public reader — same 404 as an unknown SKU.
  if (!record || !record.published) throw new ApiError("not_found", 404);
  return record.item;
}

/**
 * Fixture checkout, persisted through the durable store. Kept as a named export so the
 * fixture seam (and its tests) stay where they were; the implementation lives in
 * lib/api-client/order-store.ts so POST /api/orders and the staff admin read one store.
 */
export function fixtureCreateOrder(input: CheckoutInput): Promise<OrderResponse> {
  return createFixtureOrder(input);
}

/** Fixture lookup returns the frozen envelope only — admin fields never leave this seam. */
export async function fixtureGetOrderByNumber(number: string): Promise<OrderResponse> {
  const found = await getFixtureAdminOrder(number);
  if (!found) throw new ApiError("not_found", 404);
  return found.order;
}
