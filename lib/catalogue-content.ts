/**
 * Catalogue item content — the ONE typed reading of the item entries caskets and
 * packages carry (content-catalogue Phase 4 of
 * data/villa-content-catalog-plan/report.md §9/§11 step 6).
 *
 * THE MODEL. The catalogue record stays the authority for NAME, PRICE, publish
 * state and the storefront card photo (lib/api-client/commerce.ts,
 * /staff/catalog). The content ENTRY adds the ecommerce-style half the captain
 * asked for: a long description (`summary`), photographs (`media`) and ordered
 * content blocks — specifications, dimension tables, inclusions, notes — with a
 * price block that can only ever carry a REFERENCE (a catalogue SKU), never an
 * amount. Editing the entry never moves a price or renames a product.
 *
 * WHICH ITEMS. Only the two families the captain named for this pass carry an
 * entry: the 24 casket models (`CSK-*`) and the three packages (`PKG-*`). Every
 * other catalogue line (a-la-carte services, embalming days, chapel per-day rows,
 * add-ons) keeps its own page and storefront actions; the service guide pages
 * already have their own entry editor (lib/service-content.ts).
 *
 * A DERIVED DEFAULT, NOT A SECOND RECORD. `catalogueEntryDefaults()` builds the
 * entry identity from the catalogue item itself, so a rename or a price edit on
 * /staff/catalog is reflected here on the next request — the entry can never hold
 * a stale name or amount. Only the authored half (summary · media · blocks) is
 * persisted (lib/api-client/content-entries.ts).
 *
 * Photography keeps the standing honesty rule: the default picture is the one
 * `catalogueItemPhoto()` already publishes for the SKU, and a stand-in sample is
 * marked `sample: true` so the editor forces its caption before it can be saved.
 */
import type { CatalogItem } from "@/lib/api-client/commerce";
import type {
  ContentBlock,
  ContentImage,
  ContentSpecs,
  EntryEditorTarget,
  CatalogueEntry,
  RichTextDoc,
} from "@/lib/content-catalog";
import { catalogueItemPhoto } from "@/lib/catalogue-imagery";
import { COFFIN_SKUS } from "@/lib/catalogue-skus";
import { CASKET_MODELS } from "@/lib/villa-pricing";

export type ItemEntryKind = "casket" | "package";

/** The item family an entry covers, or null for a line this pass does not own. */
export function itemEntryKind(sku: string): ItemEntryKind | null {
  if (COFFIN_SKUS.some((entry) => entry.sku === sku)) return "casket";
  if (sku.startsWith("PKG-")) return "package";
  return null;
}

/** Whether this catalogue SKU carries an editable page-content entry. */
export function isItemEntrySku(sku: string): boolean {
  return itemEntryKind(sku) !== null;
}

/** The public detail route the entry feeds. */
export function itemEntryRoute(sku: string): string {
  if (itemEntryKind(sku) === "casket") return `/products/${encodeURIComponent(sku)}`;
  // The packages share one page (captain, 2026-09-30): their SKU URLs redirect
  // to /plans/packages (next.config.ts), so every link points there directly.
  if (sku.startsWith("PKG-")) return "/plans/packages";
  return `/plans/${encodeURIComponent(sku)}`;
}

/** The entry's group label — the casket's collection, or the plan's name. */
export function itemEntryGroup(sku: string): string | null {
  const kind = itemEntryKind(sku);
  if (kind === "package") return "Villa Memorial Plan";
  const entry = COFFIN_SKUS.find((candidate) => candidate.sku === sku);
  if (!entry) return null;
  return CASKET_MODELS.find((model) => model.model === entry.model)?.collection ?? null;
}

type ItemIdentity = Pick<CatalogItem, "id" | "sku" | "name" | "description" | "image">;

/**
 * The entry identity derived from the catalogue record: title · group · sku ·
 * price binding · the default storefront photograph. Authored fields (summary,
 * media, blocks) start empty and are merged from the store.
 */
export function catalogueEntryDefaults(item: ItemIdentity): CatalogueEntry {
  const photo = catalogueItemPhoto(item.sku);
  // An admin's own catalogue photo wins; otherwise the one imagery rule home.
  const hero = item.image ?? photo?.src ?? null;
  const sample = !item.image && Boolean(photo?.sample);
  const gallery = hero
    ? [
        {
          id: `img-${item.sku}-hero`,
          src: hero,
          alt: photo?.alt?.trim() || `${item.name} — storefront photograph`,
          caption: photo?.caption ?? null,
          sample,
        },
      ]
    : [];
  return {
    id: `item-entry-${item.sku}`,
    kind: "product",
    sku: item.sku,
    key: item.sku,
    title: item.name,
    summary: item.description ?? "",
    description: null,
    group: itemEntryGroup(item.sku),
    media: { hero, gallery },
    gallery: [],
    specs: null,
    blocks: [],
    price: { kind: "sku", sku: item.sku },
    updated_at: null,
    updated_by: null,
  };
}

/**
 * The identity fields the catalogue record owns. A stored entry can never
 * override them, so an item rename or a withdrawn SKU is reflected immediately.
 */
export function mergeItemEntry(
  defaults: CatalogueEntry,
  stored: CatalogueEntry | null | undefined,
): CatalogueEntry {
  if (!stored) return defaults;
  return {
    ...defaults,
    // The authored half.
    summary: stored.summary,
    description: stored.description,
    media: stored.media,
    gallery: stored.gallery,
    specs: stored.specs,
    blocks: stored.blocks,
    updated_at: stored.updated_at,
    updated_by: stored.updated_by,
  };
}

/** The editor target for an item entry: identity locked to the catalogue record. */
export function itemEntryTarget(item: ItemIdentity): EntryEditorTarget {
  return {
    key: item.sku,
    route: itemEntryRoute(item.sku),
    kindLabel: itemEntryKind(item.sku) === "package" ? "Package entry" : "Casket entry",
    fallbackTitle: item.name,
    fallbackSummary: item.description ?? "",
    identityLocked: true,
    identityHref: `/staff/catalog/${item.id}/edit`,
    identityNote:
      "The name, collection and price stay on the catalogue record — edit them there. This page edits only what the item's own page prints.",
  };
}

/**
 * What the public detail page reads: the lead summary, the rich description, the
 * authored PDP gallery (empty means the page keeps its rule-derived sample
 * figure), the specs table, and the ordered detail blocks.
 */
export function itemEntryView(
  entry: CatalogueEntry | null,
  item: { description: string | null },
): {
  summary: string;
  description: RichTextDoc | null;
  gallery: ContentImage[];
  specs: ContentSpecs | null;
  blocks: ContentBlock[];
  hero: string | null;
} {
  return {
    summary: entry?.summary?.trim() || item.description?.trim() || "",
    description: entry?.description ?? null,
    gallery: entry?.gallery ?? [],
    specs: entry?.specs ?? null,
    blocks: entry?.blocks ?? [],
    hero: entry?.media.hero ?? null,
  };
}
