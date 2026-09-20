/**
 * Entry store — the reader/writer behind the Services catalogue's guide entries
 * AND the casket/package item entries (content-catalogue Phases 3–4; the PDP
 * fields pass).
 *
 * WHAT LIVES HERE
 *   · The three guide pages the captain confirmed stay as service entries under
 *     Funeraria Memorial Services: death-at-home · death-at-hospital ·
 *     transport. Each is a CatalogueEntry of kind `service`; the seed is
 *     lib/fixtures/content/service-entries.json, recorded from the pages' current
 *     copy (see its `_provenance`).
 *   · The item entries (casket models + packages): the authored half of the
 *     ecommerce-style page — a rich description, a PDP gallery, a specs table and
 *     ordered content blocks — keyed by catalogue SKU. The item's NAME, GROUP and
 *     PRICE are DERIVED from the live catalogue record on every read, so a
 *     content edit can never rename a product or move a price.
 *
 * THE STORE PATTERN — DURABLE (the PDP-gallery pass)
 * The authored half used to live on globalThis, which lost an uploaded gallery on
 * restart. It now persists as an append-only event journal on disk, the same
 * pattern as lib/api-client/catalog-store.ts:
 *   - the recorded service seed is read-only and folded with the journal on every
 *     read, so updating the seed never has to migrate old state;
 *   - each save appends one event; the whole journal is rewritten to a temp file,
 *     fsync'd, then renamed over the store path (atomic replace);
 *   - saves run through ONE in-process promise chain, so two requests cannot
 *     interleave a read-modify-write in the server process that owns the store;
 *   - path: `CONTENT_ENTRIES_STORE_PATH` when set (tests), otherwise
 *     `.data/content-entries.json` under the app's cwd (gitignored).
 *
 * THE AUTHORITY
 * `validateCatalogueEntry` (lib/content-catalog.ts) is the save rule, run with
 * the LIVE catalogue SKUs and the pricing store's rate refs, so a price binding
 * that names a withdrawn SKU is refused rather than silently orphaned. Only the
 * three known service keys and the casket/package SKUs are writable here.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
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

type PersistedEvent = { kind: "entry_saved"; at: string; entry: CatalogueEntry };
type PersistedStore = { version: 1; events: PersistedEvent[] };

export function contentEntriesStorePath(): string {
  const configured = process.env.CONTENT_ENTRIES_STORE_PATH?.trim();
  return configured && configured.length > 0
    ? configured
    : path.join(process.cwd(), ".data", "content-entries.json");
}

function malformed(what: string): never {
  throw new ApiError(`malformed content-entries store: ${what}`, 500);
}

function toPersistedEvent(raw: unknown): PersistedEvent {
  if (typeof raw !== "object" || raw === null) malformed("store event");
  const r = raw as Record<string, unknown>;
  if (r.kind !== "entry_saved" || typeof r.at !== "string" || r.at.trim().length === 0) {
    malformed(`store event kind ${String(r.kind)}`);
  }
  const entry = readCatalogueEntry(r.entry);
  if (!entry.key.trim()) malformed("an event entry has no key");
  return { kind: "entry_saved", at: r.at, entry };
}

async function readPersistedEvents(): Promise<PersistedEvent[]> {
  let raw: string;
  try {
    raw = await fs.readFile(contentEntriesStorePath(), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new ApiError("the entry store could not be read", 500);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ApiError("the entry store file is not valid JSON", 500);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new ApiError("the entry store file has an unexpected shape", 500);
  }
  const p = parsed as Record<string, unknown>;
  if (p.version !== 1 || !Array.isArray(p.events)) {
    throw new ApiError("the entry store file has an unexpected shape", 500);
  }
  return p.events.map(toPersistedEvent);
}

async function persistEvents(events: PersistedEvent[]): Promise<void> {
  const store = contentEntriesStorePath();
  await fs.mkdir(path.dirname(store), { recursive: true }).catch(() => {
    throw new ApiError("the entry store directory could not be created", 500);
  });
  const temp = `${store}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  const payload = JSON.stringify({ version: 1, events } satisfies PersistedStore, null, 2) + "\n";
  try {
    const handle = await fs.open(temp, "w");
    try {
      await handle.writeFile(payload, "utf8");
      // Flush before the rename so a crash cannot leave the renamed file empty.
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(temp, store);
  } catch {
    await fs.rm(temp, { force: true }).catch(() => undefined);
    throw new ApiError("the entry store could not be written", 500);
  }
}

// One in-process writer: every mutation chains onto the previous one, so a
// read-modify-write cycle is never interleaved by another request in this process.
let writeQueue: Promise<unknown> = Promise.resolve();

function withStoreLock<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

type StoreState = {
  services: Map<string, CatalogueEntry>;
  items: Map<string, CatalogueEntry>;
  events: PersistedEvent[];
};

/**
 * The seed + journal folded into the current entries. Service entries start from
 * the recorded seed; item entries start empty (their identity is always derived
 * from the live catalogue at read time).
 */
async function loadState(): Promise<StoreState> {
  const services = new Map(SEED.map((entry) => [entry.key, structuredClone(entry)]));
  const items = new Map<string, CatalogueEntry>();
  const events = await readPersistedEvents();
  for (const event of events) {
    const entry = event.entry;
    if (isItemEntrySku(entry.key)) items.set(entry.key, entry);
    else services.set(entry.key, entry);
  }
  return { services, items, events };
}

async function appendEntry(entry: CatalogueEntry): Promise<void> {
  await withStoreLock(async () => {
    const { events } = await loadState();
    await persistEvents([...events, { kind: "entry_saved", at: new Date().toISOString(), entry }]);
  });
}

/** Every guide entry, in the captain's listing order. */
export async function listServiceEntries(): Promise<CatalogueEntry[]> {
  const { services } = await loadState();
  return SERVICE_ENTRY_DEFS.flatMap((def) => {
    const found = services.get(def.key);
    return found ? [found] : [];
  });
}

/** One guide entry by key, or null for a key that is not one of the three. */
export async function getServiceEntry(key: string): Promise<CatalogueEntry | null> {
  if (!serviceEntryDef(key)) return null;
  return (await loadState()).services.get(key) ?? null;
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
  await appendEntry(saved);
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
 * the live record; only description/gallery/specs/summary/media/blocks come from
 * the store.
 */
export async function listItemEntries(): Promise<CatalogueEntry[]> {
  const [items, state] = [await listCatalogItems(), await loadState()];
  return items
    .filter((item) => isItemEntrySku(item.sku))
    .map((item) => mergeItemEntry(catalogueEntryDefaults(item), state.items.get(item.sku)));
}

/** One item entry by SKU, or null for a SKU this pass does not own. */
export async function getItemEntry(sku: string): Promise<CatalogueEntry | null> {
  const item = await itemForEntry(sku);
  if (!item) return null;
  const { items } = await loadState();
  return mergeItemEntry(catalogueEntryDefaults(item), items.get(item.sku));
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
  await appendEntry(saved);
  return saved;
}

/** Test helper: the authored item-entry store as it starts (empty). */
export function seedItemEntries(): Record<string, CatalogueEntry> {
  return {};
}
