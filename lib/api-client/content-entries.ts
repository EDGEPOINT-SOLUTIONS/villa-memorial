/**
 * Service-entry store — the reader/writer behind the Services catalogue's guide
 * entries (content-catalogue Phase 3).
 *
 * WHAT LIVES HERE
 * The three guide pages the captain confirmed stay as service entries under
 * Funeraria Memorial Services (§10 answer 3): death-at-home · death-at-hospital ·
 * transport. Each is a CatalogueEntry of kind `service` — title, summary, hero
 * photograph, ordered content blocks and a price binding (all three are
 * `quoteOnly`: a guide publishes no amount). The seed is
 * lib/fixtures/content/service-entries.json, recorded from the pages' current
 * copy (see its `_provenance`).
 *
 * THE STORE PATTERN
 * The same seam as the landing content document and the page documents: demo
 * mutations live on globalThis so the BFF save route and the re-rendered public
 * pages agree within one server process. No upstream content service exists —
 * the platform has no content/CMS contract — so this is the app-authored CMS
 * seam; the write path is POST /api/content/entries (gated `catalog:write`
 * provisionally, like the landing and page-document routes).
 *
 * THE AUTHORITY
 * `validateCatalogueEntry` (lib/content-catalog.ts) is the save rule, run with
 * the LIVE catalogue SKUs and the pricing store's rate refs, so a price binding
 * that names a withdrawn SKU is refused rather than silently orphaned. Only the
 * three known service keys are writable here.
 *
 * PHASE 4 — ITEM ENTRIES. The same store also serves the casket and package
 * entries (lib/catalogue-content.ts owns which SKUs qualify and how the entry's
 * identity is DERIVED from the live catalogue record): the authored half
 * (long description · media · blocks) is kept here, keyed by SKU; the name,
 * group and price binding are re-derived from the catalogue on every read, so a
 * content edit can never rename a product or restate a price.
 */
import { ApiError } from "@/lib/api-client/api-error";
import { listCatalogItems } from "@/lib/api-client/commerce";
import {
  CONTENT_RATE_REFS,
  firstContentError,
  readCatalogueEntry,
  validateCatalogueEntry,
  type CatalogueEntry,
  type ContentValidationContext,
} from "@/lib/content-catalog";
import { SERVICE_ENTRY_DEFS, serviceEntryDef, serviceEntryView, type ServiceEntryView } from "@/lib/service-content";
import {
  catalogueEntryDefaults,
  isItemEntrySku,
  mergeItemEntry,
} from "@/lib/catalogue-content";
import seedFile from "@/lib/fixtures/content/service-entries.json";

type EntrySeed = { entries: unknown[] };

const SEED: CatalogueEntry[] = ((seedFile as unknown as EntrySeed).entries ?? [])
  .map((raw) => readCatalogueEntry(raw))
  .filter((entry, index, all) => all.findIndex((other) => other.key === entry.key) === index);

// One process-wide store, the landing/page-document pattern.
type EntryGlobal = typeof globalThis & {
  __imContentEntries?: CatalogueEntry[];
  __imContentItemEntries?: Record<string, CatalogueEntry>;
};
const entryGlobal = globalThis as EntryGlobal;

function stored(): CatalogueEntry[] {
  entryGlobal.__imContentEntries ??= SEED.map((entry) => structuredClone(entry));
  return entryGlobal.__imContentEntries;
}

function storedItemEntries(): Record<string, CatalogueEntry> {
  entryGlobal.__imContentItemEntries ??= {};
  return entryGlobal.__imContentItemEntries;
}

/** Every guide entry, in the captain's listing order. */
export async function listServiceEntries(): Promise<CatalogueEntry[]> {
  const entries = stored();
  return SERVICE_ENTRY_DEFS.flatMap((def) => {
    const found = entries.find((entry) => entry.key === def.key);
    return found ? [found] : [];
  });
}

/** One guide entry by key, or null for a key that is not one of the three. */
export async function getServiceEntry(key: string): Promise<CatalogueEntry | null> {
  if (!serviceEntryDef(key)) return null;
  return stored().find((entry) => entry.key === key) ?? null;
}

/** The guide page's values (entry + recorded fallbacks) for its route and head. */
export async function loadServiceGuideView(key: string): Promise<ServiceEntryView | null> {
  const def = serviceEntryDef(key);
  if (!def) return null;
  return serviceEntryView(await getServiceEntry(key), def);
}

/** The live validation context: what a price binding may resolve against. */
async function validationContext(): Promise<ContentValidationContext> {
  let skus: ReadonlySet<string>;
  try {
    const items = await listCatalogItems();
    skus = new Set(items.map((item) => item.sku));
  } catch {
    throw new ApiError(
      "The catalogue is unavailable right now, so a price binding cannot be checked. Please try again shortly.",
      503,
    );
  }
  return { skus, rateRefs: new Set(CONTENT_RATE_REFS) };
}

/**
 * Validates and persists one service entry. The caller passes the key because
 * the entry body carries it; both must agree. Returns the saved entry so the
 * editor can confirm exactly what the pages render.
 */
export async function saveServiceEntry(
  key: string,
  raw: unknown,
  actor?: string,
): Promise<CatalogueEntry> {
  const def = serviceEntryDef(key);
  if (!def) throw new ApiError(`“${key}” is not one of the service entries.`, 422);
  const context = await validationContext();
  const verdict = validateCatalogueEntry(raw, context);
  if (!verdict.ok) throw new ApiError(firstContentError(verdict.errors), 422);
  if (verdict.value.key !== key) {
    throw new ApiError(`The entry says “${verdict.value.key}” but the save names “${key}”.`, 422);
  }
  const saved: CatalogueEntry = {
    ...verdict.value,
    kind: "service",
    updated_at: new Date().toISOString(),
    updated_by: actor ?? null,
  };
  const entries = stored();
  const index = entries.findIndex((entry) => entry.key === key);
  if (index >= 0) entries[index] = saved;
  else entries.push(saved);
  return saved;
}

/** Test helper: the seed as the store starts. */
export function seedServiceEntries(): CatalogueEntry[] {
  return SEED.map((entry) => structuredClone(entry));
}

/* ------------------------------ item entries ------------------------------- */

/**
 * The live catalogue item an entry belongs to, or null when the SKU is not a
 * casket/package (or not in the catalogue at all).
 */
async function itemForEntry(sku: string) {
  if (!isItemEntrySku(sku)) return null;
  const items = await listCatalogItems();
  return items.find((item) => item.sku === sku) ?? null;
}

/**
 * Every casket and package entry, in catalogue order. Identity is derived from
 * the live record; only summary/media/blocks come from the store.
 */
export async function listItemEntries(): Promise<CatalogueEntry[]> {
  const [items, overrides] = [await listCatalogItems(), storedItemEntries()];
  return items
    .filter((item) => isItemEntrySku(item.sku))
    .map((item) => mergeItemEntry(catalogueEntryDefaults(item), overrides[item.sku]));
}

/** One item entry by SKU, or null for a SKU this pass does not own. */
export async function getItemEntry(sku: string): Promise<CatalogueEntry | null> {
  const item = await itemForEntry(sku);
  if (!item) return null;
  return mergeItemEntry(catalogueEntryDefaults(item), storedItemEntries()[item.sku]);
}

/**
 * Validates and persists one item entry's authored half. The catalogue record
 * owns the identity, so whatever the body says about the name/group/price is
 * replaced before validation — a content save can never rename a product or
 * write an amount.
 */
export async function saveItemEntry(
  sku: string,
  raw: unknown,
  actor?: string,
): Promise<CatalogueEntry> {
  const item = await itemForEntry(sku);
  if (!item) throw new ApiError(`“${sku}” is not a casket or package in the catalogue.`, 422);
  const defaults = catalogueEntryDefaults(item);
  const candidate = mergeItemEntry(defaults, readCatalogueEntry(raw));
  const context = await validationContext();
  const verdict = validateCatalogueEntry(candidate, context);
  if (!verdict.ok) throw new ApiError(firstContentError(verdict.errors), 422);
  const saved: CatalogueEntry = {
    ...verdict.value,
    kind: "product",
    sku: item.sku,
    key: item.sku,
    title: item.name,
    group: defaults.group,
    price: defaults.price,
    updated_at: new Date().toISOString(),
    updated_by: actor ?? null,
  };
  storedItemEntries()[item.sku] = saved;
  return saved;
}

/** Test helper: the authored item-entry store as it starts (empty). */
export function seedItemEntries(): Record<string, CatalogueEntry> {
  return structuredClone(storedItemEntries());
}
