/**
 * Durable fixture-mode product-line store — the persistence seam behind the
 * PDP's "choose a model" selector (P2 of data/villa-pdp-cms-plan/report.md §4.3).
 *
 * THE MODEL. A PRODUCT LINE is the captain-confirmed grouping behind a PDP's
 * variant selector (Q4: line = the sheet's collection, variant = each model).
 * `lib/product-line.ts` DERIVES the four sheet lines and resolves the merged
 * specs table; this module keeps the authored overrides — the staff-editable
 * line name, the ordered variant membership and the shared specifications.
 * Nothing here can move a price: a live variant is a catalogue SKU.
 *
 * THE STORE PATTERN — DURABLE (same as lib/api-client/content-entries.ts):
 *   - the four derived lines are the read-only seed; the journal folds over
 *     them, so updating the sheet never has to migrate old state;
 *   - each save appends one `line_saved` event; the whole journal is rewritten
 *     to a temp file, fsync'd, then renamed over the store path (atomic);
 *   - saves run through ONE in-process promise chain, so two requests cannot
 *     interleave a read-modify-write in the server process that owns the store;
 *   - path: `PRODUCT_LINES_STORE_PATH` when set (tests), otherwise
 *     `.data/content-product-lines.json` under the app's cwd (gitignored).
 *
 * THE AUTHORITY. `validateProductLine` (lib/content-catalog.ts) is the save
 * rule, run against the LIVE catalogue SKUs, so a line can never name a variant
 * the storefront does not carry.
 */
import {
  createJournalLock,
  journalPath,
  readJournalEvents,
  writeJournalEvents,
} from "@/lib/api-client/journal";
import { ApiError } from "@/lib/api-client/api-error";
import { listCatalogItems } from "@/lib/api-client/commerce";
import {
  firstContentError,
  readProductLine,
  validateProductLine,
  type ContentValidationContext,
  type ProductLine,
} from "@/lib/content-catalog";
import { CASKET_PRODUCT_LINES } from "@/lib/product-line";

type PersistedEvent = { kind: "line_saved"; at: string; line: ProductLine };
export function productLinesStorePath(): string {
  return journalPath("PRODUCT_LINES_STORE_PATH", "content-product-lines.json");
}

function malformed(what: string): never {
  throw new ApiError(`malformed product-lines store: ${what}`, 500);
}

function toPersistedEvent(raw: unknown): PersistedEvent {
  if (typeof raw !== "object" || raw === null) malformed("store event");
  const r = raw as Record<string, unknown>;
  if (r.kind !== "line_saved" || typeof r.at !== "string" || r.at.trim().length === 0) {
    malformed(`store event kind ${String(r.kind)}`);
  }
  const line = readProductLine(r.line);
  if (!line.id.trim()) malformed("an event line has no id");
  return { kind: "line_saved", at: r.at, line };
}

async function readPersistedEvents(): Promise<PersistedEvent[]> {
  const events = await readJournalEvents(productLinesStorePath(), "product-line");
  return events.map(toPersistedEvent);
}

function persistEvents(events: PersistedEvent[]): Promise<void> {
  return writeJournalEvents(productLinesStorePath(), "product-line", events);
}

const withStoreLock = createJournalLock();

/** The four derived lines folded with the journal, keyed by line id. */
async function loadLines(): Promise<Map<string, ProductLine>> {
  const byId = new Map(CASKET_PRODUCT_LINES.map((line) => [line.id, structuredClone(line)]));
  for (const event of await readPersistedEvents()) {
    byId.set(event.line.id, event.line);
  }
  return byId;
}

/** Every line, in the sheet's collection order (a line the seed does not know is appended). */
export async function listProductLines(): Promise<ProductLine[]> {
  const byId = await loadLines();
  const seeded = CASKET_PRODUCT_LINES.flatMap((line) => {
    const found = byId.get(line.id);
    return found ? [found] : [];
  });
  const extra = [...byId.values()].filter(
    (line) => !CASKET_PRODUCT_LINES.some((seededLine) => seededLine.id === line.id),
  );
  return [...seeded, ...extra];
}

/** One line by id, or null for an id the store does not carry. */
export async function getProductLine(id: string): Promise<ProductLine | null> {
  const key = id.trim().toLowerCase();
  if (!key) return null;
  return (await loadLines()).get(key) ?? null;
}

/**
 * The line a SKU belongs to among the STORED lines, or null when no line names
 * it. Membership is the line's own `variantSkus`, so a variant staff excluded
 * resolves to no line and its PDP renders standalone.
 */
export async function getProductLineForSku(sku: string): Promise<ProductLine | null> {
  const wanted = sku.trim().toUpperCase();
  if (!wanted) return null;
  for (const line of await listProductLines()) {
    if (line.variantSkus.some((candidate) => candidate.toUpperCase() === wanted)) return line;
  }
  return null;
}

/** The live validation context: what a variant may resolve against. */
async function validationContext(): Promise<ContentValidationContext> {
  let skus: ReadonlySet<string>;
  try {
    const items = await listCatalogItems();
    skus = new Set(items.map((item) => item.sku));
  } catch {
    throw new ApiError(
      "The catalogue is unavailable right now, so a line's variants cannot be checked. Please try again shortly.",
      503,
    );
  }
  return { skus, rateRefs: new Set<string>() };
}

/**
 * Validates and persists one product line. The caller passes the id because the
 * line body carries it; both must agree. Returns the saved line so the editor
 * can confirm exactly what the PDP selector renders.
 */
export async function saveProductLine(
  id: string,
  raw: unknown,
  actor?: string,
): Promise<ProductLine> {
  const key = id.trim().toLowerCase();
  if (!key) throw new ApiError("The save must name the product line.", 422);
  const context = await validationContext();
  const verdict = validateProductLine(raw, context);
  if (!verdict.ok) throw new ApiError(firstContentError(verdict.errors), 422);
  if (verdict.value.id.trim().toLowerCase() !== key) {
    throw new ApiError(`The line says “${verdict.value.id}” but the save names “${id}”.`, 422);
  }
  const saved: ProductLine = {
    ...verdict.value,
    updated_at: new Date().toISOString(),
    updated_by: actor ?? null,
  };
  await withStoreLock(async () => {
    const events = await readPersistedEvents();
    await persistEvents([
      ...events,
      { kind: "line_saved", at: saved.updated_at ?? new Date().toISOString(), line: saved },
    ]);
  });
  return saved;
}

/** Test helper: the four derived lines as the store starts. */
export function seedProductLines(): ProductLine[] {
  return CASKET_PRODUCT_LINES.map((line) => structuredClone(line));
}
