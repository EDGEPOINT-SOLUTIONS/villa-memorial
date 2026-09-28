/**
 * Durable fixture-mode catalogue store — the persistence seam behind the public
 * storefront readers in `lib/api-client/commerce.ts` AND the staff catalogue
 * admin (`app/(staff)/staff/catalog`, `/api/catalog/**`).
 *
 * WHY A FILE STORE (same reasoning as lib/api-client/order-store.ts)
 * Catalogue edits are the office's own facts — the SKU, name, type, price,
 * photo and published state of everything the storefront sells. They must
 * survive a restart and they must be what the storefront, cart and checkout
 * read on the next request, so they are persisted as a small append-only event
 * journal on disk:
 *
 *   - The recorded seed (`lib/fixtures/commerce/catalog-items.json`) is
 *     read-only and folded with the journal on every read, so updating the seed
 *     never has to migrate old state.
 *   - Each mutation appends one event. The whole journal is rewritten to a temp
 *     file, fsync'd, then `rename(2)`d over the store path — an atomic replace,
 *     so a crash or a concurrent reader can never observe a half-written file.
 *   - Mutations run through ONE in-process promise chain, so two Next requests
 *     cannot interleave a read-modify-write (no lost update, no duplicate SKU
 *     or duplicate id in the server process that owns the store). The write is
 *     last-writer-wins if several server processes share one path, but the file
 *     itself is still never corrupt.
 *   - Path: `CATALOG_STORE_PATH` when set (tests), otherwise
 *     `.data/commerce-catalog.json` under the app's cwd (gitignored). A restart
 *     of the same container keeps its catalogue.
 *
 * WHAT IS FROZEN, WHAT IS APP-AUTHORED
 * The envelope served for an item stays the frozen order-payment-api-v1 entry
 * (`id, sku, name, description, item_type, unit_price_cents, currency,
 * display_price`). `published`, `image` and `price_unit` are APP-AUTHORED
 * fields this store keeps beside it (lib/catalog-admin.ts documents them), and
 * `display_price` is DERIVED from the price + currency + the presentation-only
 * `price_unit` suffix, so editing a price can never leave a stale string on the
 * storefront. No frozen contract names a catalogue write endpoint, so live mode
 * answers 503 (`ADMIN_CATALOG_NOT_WIRED`) instead of inventing one.
 */
import {
  createJournalLock,
  journalPath,
  readJournalEvents,
  writeJournalEvents,
} from "@/lib/api-client/journal";
import { ApiError } from "@/lib/api-client/api-error";
import catalogFile from "@/lib/fixtures/commerce/catalog-items.json";
import {
  catalogDisplayPrice,
  catalogPriceUnit,
  validateCatalogDraft,
  type AdminCatalogItem,
  type CatalogDraftErrors,
  type CatalogItemRecord,
  type CatalogItemType,
} from "@/lib/catalog-admin";

export type {
  AdminCatalogItem,
  CatalogDraft,
  CatalogDraftErrors,
  CatalogItemRecord,
  CatalogItemType,
} from "@/lib/catalog-admin";

type SeedShape = { items: unknown[] };

type PersistedEvent =
  | { kind: "item_created"; at: string; item: AdminCatalogItem }
  | { kind: "item_updated"; at: string; item: AdminCatalogItem };

export function catalogStorePath(): string {
  return journalPath("CATALOG_STORE_PATH", "commerce-catalog.json");
}

/* ------------------------------ readers --------------------------------- */

function malformed(what: string): never {
  throw new ApiError(`malformed catalogue fixture: ${what}`, 500);
}

function requiredString(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim().length === 0) malformed(what);
  return value;
}

function requiredInteger(value: unknown, what: string, min = 0): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) malformed(what);
  return value;
}

function requiredItemType(value: unknown, what: string): CatalogItemType {
  if (value !== "package" && value !== "service" && value !== "add_on") malformed(what);
  return value;
}

/**
 * An app-authored SENIOR price, or null when the item has none.
 *
 * Absent and null both mean "no senior price" — a service or a package legitimately has
 * none, and the storefront must not print a senior line for it. A present value has to be
 * a positive whole number of centavos that does NOT exceed the regular price: a senior
 * price above the regular one is not a discount, and silently accepting it would publish a
 * contradiction. (The sheet's per-model discount is `regular - senior`, derived at the
 * surface — so there is one number to keep honest, not two.)
 */
function optionalSeniorPrice(value: unknown, unitPriceCents: number, what: string): number | null {
  if (value == null) return null;
  const cents = requiredInteger(value, `${what} senior price`, 1);
  if (cents > unitPriceCents) {
    malformed(`${what} senior price ${cents} exceeds its regular price ${unitPriceCents}`);
  }
  return cents;
}

/** The frozen envelope fields + the app-authored photo and senior price, read field by
 * field. `display_price` is DERIVED here from the wrapper's presentation unit. */
function toCatalogItemRecord(raw: unknown, priceUnit: string): CatalogItemRecord {
  if (typeof raw !== "object" || raw === null) malformed("catalogue item");
  const r = raw as Record<string, unknown>;
  const unit_price_cents = requiredInteger(r.unit_price_cents, "item unit price");
  const currency = requiredString(r.currency, "item currency");
  const image = r.image == null ? null : requiredString(r.image, "item image");
  return {
    id: requiredInteger(r.id, "item id", 1),
    sku: requiredString(r.sku, "item sku"),
    name: requiredString(r.name, "item name"),
    description: r.description == null ? null : requiredString(r.description, "item description"),
    item_type: requiredItemType(r.item_type, "item type"),
    unit_price_cents,
    currency,
    // Derived, never read back from the file: a price edit cannot publish a
    // stale display string.
    display_price: catalogDisplayPrice(unit_price_cents, currency, priceUnit),
    image,
    senior_price_cents: optionalSeniorPrice(r.senior_price_cents, unit_price_cents, "item"),
  };
}

/** The admin record a journal event carries: item + app-authored state. */
function toAdminCatalogItem(raw: unknown): AdminCatalogItem {
  if (typeof raw !== "object" || raw === null) malformed("catalogue record");
  const r = raw as Record<string, unknown>;
  if (typeof r.published !== "boolean") malformed("item published flag");
  const price_unit = typeof r.price_unit === "string" ? r.price_unit : "";
  return {
    item: toCatalogItemRecord(r.item, price_unit),
    published: r.published,
    price_unit,
    updated_at: requiredString(r.updated_at, "item updated_at"),
  };
}

/** One recorded seed row → an admin record, published by default, with the
 * recorded display string's suffix preserved as the presentation-only unit. */
function toSeedCatalogItem(raw: unknown): AdminCatalogItem {
  if (typeof raw !== "object" || raw === null) malformed("seed catalogue item");
  const r = raw as Record<string, unknown>;
  const display = requiredString(r.display_price, "seed display price");
  const price_unit = catalogPriceUnit(display);
  const unit_price_cents = requiredInteger(r.unit_price_cents, "seed unit price");
  const currency = requiredString(r.currency, "seed currency");
  if (catalogDisplayPrice(unit_price_cents, currency, price_unit) !== display.trim()) {
    malformed(`seed display price ${display} does not match its amount`);
  }
  return {
    item: {
      id: requiredInteger(r.id, "seed item id", 1),
      sku: requiredString(r.sku, "seed item sku"),
      name: requiredString(r.name, "seed item name"),
      description: r.description == null ? null : requiredString(r.description, "seed item description"),
      item_type: requiredItemType(r.item_type, "seed item type"),
      unit_price_cents,
      currency,
      display_price: display.trim(),
      image: null,
      // The 24 casket rows record the sheet's senior price; every other row omits it.
      senior_price_cents: optionalSeniorPrice(r.senior_price_cents, unit_price_cents, "seed"),
    },
    published: true,
    price_unit,
    updated_at: "recorded seed",
  };
}

function toPersistedEvent(raw: unknown): PersistedEvent {
  if (typeof raw !== "object" || raw === null) malformed("store event");
  const r = raw as Record<string, unknown>;
  if (r.kind === "item_created" || r.kind === "item_updated") {
    return {
      kind: r.kind,
      at: requiredString(r.at, "event timestamp"),
      item: toAdminCatalogItem(r.item),
    };
  }
  malformed(`store event kind ${String(r.kind)}`);
}

async function readPersistedEvents(): Promise<PersistedEvent[]> {
  const events = await readJournalEvents(catalogStorePath(), "catalogue");
  return events.map(toPersistedEvent);
}

function persistEvents(events: PersistedEvent[]): Promise<void> {
  return writeJournalEvents(catalogStorePath(), "catalogue", events);
}

const withStoreLock = createJournalLock();

/** Seed + journal folded into the current records, in recorded order. */
async function loadState(): Promise<{ records: AdminCatalogItem[]; events: PersistedEvent[] }> {
  const seed = (catalogFile as unknown as SeedShape).items.map(toSeedCatalogItem);
  const records: AdminCatalogItem[] = [];
  const indexById = new Map<number, number>();
  const skus = new Set<string>();
  for (const record of seed) {
    if (indexById.has(record.item.id)) malformed(`duplicate item id ${record.item.id}`);
    if (skus.has(record.item.sku.toLowerCase())) malformed(`duplicate item sku ${record.item.sku}`);
    indexById.set(record.item.id, records.length);
    skus.add(record.item.sku.toLowerCase());
    records.push(record);
  }

  const events = await readPersistedEvents();
  for (const event of events) {
    const id = event.item.item.id;
    const at = indexById.get(id);
    if (event.kind === "item_created") {
      if (at !== undefined) malformed(`duplicate item id ${id}`);
      if (skus.has(event.item.item.sku.toLowerCase())) {
        malformed(`duplicate item sku ${event.item.item.sku}`);
      }
      indexById.set(id, records.length);
      skus.add(event.item.item.sku.toLowerCase());
      records.push(event.item);
      continue;
    }
    if (at === undefined) {
      // A journal that updates an unknown id means the seed and store drifted.
      throw new ApiError(`the catalogue store references unknown item ${id}`, 500);
    }
    // A rename can only collide through a journal the store itself would not write.
    if (
      records[at].item.sku.toLowerCase() !== event.item.item.sku.toLowerCase() &&
      records.some(
        (record, i) =>
          i !== at && record.item.sku.toLowerCase() === event.item.item.sku.toLowerCase(),
      )
    ) {
      malformed(`duplicate item sku ${event.item.item.sku}`);
    }
    records[at] = event.item;
  }
  return { records, events };
}

/* ------------------------------ store API ------------------------------- */

/** Every catalogue item, published or not, in recorded order then newest. */
export async function listCatalogRecords(): Promise<AdminCatalogItem[]> {
  return (await loadState()).records;
}

/** Only what the storefront offers. Unpublished items never reach a public reader. */
export async function listPublishedCatalogRecords(
  itemType?: CatalogItemType,
): Promise<AdminCatalogItem[]> {
  return (await listCatalogRecords()).filter(
    (record) => record.published && (!itemType || record.item.item_type === itemType),
  );
}

/** Numeric id first (the stable identity), then exact SKU — unknown → null. */
export async function getCatalogRecord(idOrSku: string): Promise<AdminCatalogItem | null> {
  const { records } = await loadState();
  return findRecord(records, idOrSku);
}

function findRecord(records: AdminCatalogItem[], idOrSku: string): AdminCatalogItem | null {
  const numeric = /^\d+$/.test(idOrSku) ? Number(idOrSku) : null;
  return (
    records.find((record) => record.item.id === numeric) ??
    records.find((record) => record.item.sku === idOrSku) ??
    null
  );
}

function duplicateSkuError(records: AdminCatalogItem[], sku: string, exceptId?: number): void {
  const clash = records.find(
    (record) =>
      record.item.id !== exceptId && record.item.sku.toLowerCase() === sku.toLowerCase(),
  );
  if (clash) {
    const message = `SKU ${clash.item.sku} is already used — SKUs are unique, whatever the case.`;
    throw new ApiError(message, 422, { sku: message } satisfies CatalogDraftErrors);
  }
}

function validationError(errors: CatalogDraftErrors): never {
  throw new ApiError("Please fix the highlighted fields.", 422, errors);
}

/**
 * Create one item from a draft. Validates field by field, then checks SKU
 * uniqueness (case-insensitive) and allocates the next id under the store lock —
 * two concurrent creates can never collide.
 */
export function createCatalogRecord(raw: unknown): Promise<AdminCatalogItem> {
  const check = validateCatalogDraft(raw);
  if (!check.ok) validationError(check.errors);
  const draft = check.draft;
  return withStoreLock(async () => {
    const { records, events } = await loadState();
    duplicateSkuError(records, draft.sku);
    const now = new Date().toISOString();
    const record: AdminCatalogItem = {
      item: {
        id: records.reduce((max, current) => Math.max(max, current.item.id), 0) + 1,
        sku: draft.sku,
        name: draft.name,
        description: draft.description,
        item_type: draft.item_type,
        unit_price_cents: draft.unit_price_cents,
        currency: draft.currency,
        display_price: catalogDisplayPrice(draft.unit_price_cents, draft.currency, ""),
        image: draft.image,
        senior_price_cents: draft.senior_price_cents,
      },
      published: draft.published,
      // New items carry no unit suffix — the form does not invent "/ month".
      price_unit: "",
      updated_at: now,
    };
    await persistEvents([...events, { kind: "item_created", at: now, item: record }]);
    return record;
  });
}

/**
 * Edit one item by id or SKU. The id and the recorded presentation suffix are
 * kept; the SKU may be corrected (uniqueness is re-checked case-insensitively).
 * Deactivating is `published: false` — items are never deleted.
 */
export function updateCatalogRecord(idOrSku: string, raw: unknown): Promise<AdminCatalogItem> {
  const check = validateCatalogDraft(raw);
  if (!check.ok) validationError(check.errors);
  const draft = check.draft;
  return withStoreLock(async () => {
    const { records, events } = await loadState();
    const found = findRecord(records, idOrSku);
    if (!found) throw new ApiError("not_found", 404);
    duplicateSkuError(records, draft.sku, found.item.id);
    const now = new Date().toISOString();
    const record: AdminCatalogItem = {
      item: {
        ...found.item,
        sku: draft.sku,
        name: draft.name,
        description: draft.description,
        item_type: draft.item_type,
        unit_price_cents: draft.unit_price_cents,
        currency: draft.currency,
        display_price: catalogDisplayPrice(
          draft.unit_price_cents,
          draft.currency,
          found.price_unit,
        ),
        image: draft.image,
        senior_price_cents: draft.senior_price_cents,
      },
      published: draft.published,
      price_unit: found.price_unit,
      updated_at: now,
    };
    await persistEvents([...events, { kind: "item_updated", at: now, item: record }]);
    return record;
  });
}
