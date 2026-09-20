/**
 * Content catalogue — the ONE model behind the Admin Portal's "Pages & content".
 *
 * Phase 0+1 of the content-catalogue plan (data/villa-content-catalog-plan/report.md):
 * the captain's review settled that Pages & content owns the page documents
 * (Home · Villa Memorial Park · Funeraria Memorial Services · Villa Memorial Plan ·
 * Coffins & caskets), that the Park page carries an editable hero and the Lots
 * listing as a tab, and that products/services/plans keep one shared entry model.
 *
 * This module is PURE (no I/O, no fixtures): it defines the document + entry
 * shapes, the shared block vocabulary (a plan tier's inclusion checklist is one
 * block, not a separate grammar), the field limits, the tolerant readers and the
 * save validators that the store, the BFF route and the editor all run. The
 * storage lives in lib/api-client/content-pages.ts; the editor lives in
 * components/content/*.
 *
 * THE RULES THIS MODULE ENFORCES
 *  - A page document's hero is staff copy; its image and background reuse the
 *    home hero's own rules (the CSS colour check lives in lib/landing/hero-background.ts,
 *    the transparency is 0–100 with 100 = absent).
 *  - A price block NEVER carries an amount: `priceTable` / `priceList` bind to a
 *    catalogue SKU or a pricing-store rate row, and the validator refuses a
 *    binding that does not resolve against the stores it is handed.
 *  - A sample image requires its caption (the standing illustration-purposes
 *    rule); the gallery's images carry alt text like every published picture.
 *  - Every authored string passes the one glyph gate (lib/text-gate.ts): the
 *    product's two faces carry no emoji, so a published one is a missing glyph.
 *  - Reference lists (`tabs`, `entries`) are ordered and unique.
 */

import { unrenderableGlyphs } from "@/lib/text-gate";

/* ------------------------------ page documents ----------------------------- */

export type PageDocumentKey = "home" | "park" | "services" | "plans" | "coffins";

export const PAGE_DOCUMENT_KEYS: readonly PageDocumentKey[] = [
  "home",
  "park",
  "services",
  "plans",
  "coffins",
] as const;

export type PageDocumentDef = {
  key: PageDocumentKey;
  /** The name staff see in Pages & content (the captain's full forms). */
  label: string;
  /** The public route this document feeds. */
  route: string;
  /**
   * `landing` → the document is the existing LandingPage/FAQ document, edited by
   * the full home editor. `page` → the document is stored here and edited by the
   * page-document editor.
   */
  editor: "landing" | "page";
  /** Whether the page-document editor exposes the block canvas in Phase 1. */
  blocks: boolean;
  hint: string;
};

/**
 * The five documents, in the order Pages & content lists them. Home is the
 * existing landing content document (the one editor that already worked);
 * the other four are page documents in this model.
 */
export const PAGE_DOCUMENTS: readonly PageDocumentDef[] = [
  {
    key: "home",
    label: "Home",
    route: "/",
    editor: "landing",
    blocks: false,
    hint: "The home page and the FAQ — the full editor that already runs this document.",
  },
  {
    key: "park",
    label: "Villa Memorial Park",
    route: "/map",
    editor: "page",
    blocks: true,
    hint: "The park page: an editable hero, then Map / 3D — with the Lots listing as a tab.",
  },
  {
    key: "services",
    label: "Funeraria Memorial Services",
    route: "/services",
    editor: "page",
    blocks: true,
    hint: "One hero, then straight to the services. The service descriptions and the guide service entries are edited here.",
  },
  {
    key: "plans",
    label: "Villa Memorial Plan",
    route: "/plans",
    editor: "page",
    blocks: true,
    hint: "The plan page: its five tiers and their inclusion checklists, the complete memorial package and the plan notes. Rates stay a live read of the pricing store.",
  },
  {
    key: "coffins",
    label: "Coffins & caskets",
    route: "/products",
    editor: "page",
    blocks: false,
    hint: "The casket catalogue hero. The per-model detail blocks arrive with the item-catalogue pass.",
  },
];

export function pageDocumentDef(key: string): PageDocumentDef | undefined {
  return PAGE_DOCUMENTS.find((doc) => doc.key === key);
}

export function isPageDocumentKey(value: string): value is PageDocumentKey {
  return (PAGE_DOCUMENT_KEYS as readonly string[]).includes(value);
}

/* --------------------------------- limits ---------------------------------- */

export const CONTENT_HEADING_MAX = 120;
export const CONTENT_LEAD_MAX = 400;
export const CONTENT_TEXT_MAX = 2000;
export const CONTENT_LINE_MAX = 240;
export const CONTENT_CAPTION_MAX = 300;
export const CONTENT_ALT_MAX = 240;
export const CONTENT_CELL_MAX = 240;
export const CONTENT_IMAGE_MAX_LENGTH = 4_000_000;
export const CONTENT_BLOCKS_MAX = 40;
export const CONTENT_TABS_MAX = 6;
export const CONTENT_ENTRIES_MAX = 60;
export const CONTENT_TABLE_COLUMNS_MAX = 12;
export const CONTENT_TABLE_ROWS_MAX = 40;
export const CONTENT_CHECKLIST_ITEMS_MAX = 30;
export const CONTENT_GALLERY_IMAGES_MAX = 12;
export const CONTENT_LINKS_MAX = 12;
export const CONTENT_STEPS_MAX = 10;

const IMAGE_SRC_PATTERN = /^(?:data:image\/|\/|https?:\/\/)/i;
const HREF_PATTERN = /^(?:\/|#|https?:\/\/|mailto:|tel:)/i;

/* ------------------------------- primitives -------------------------------- */

export type PageHero = {
  eyebrow: string;
  headline: string;
  lead: string;
  image: string | null;
  background: string | null;
  backgroundTransparency: number;
};

export type PageTab = {
  id: string;
  label: string;
  href: string;
  note: string | null;
};

export type PriceBinding =
  | { kind: "sku"; sku: string }
  | { kind: "ladder"; skus: string[] }
  | { kind: "matrix"; ref: string }
  | { kind: "quoteOnly" };

export type ContentImage = {
  id: string;
  src: string;
  alt: string;
  caption: string | null;
  /** A sample/illustrative picture — publishing one REQUIRES its caption. */
  sample: boolean;
};

export type ChecklistItem = { id: string; label: string; checked: boolean };
export type StepItem = { id: string; title: string; text: string };
export type PriceListRow = { id: string; sku: string; label: string; unit: string };
export type LinkItem = { id: string; label: string; href: string; note: string | null };

export type ContentBlock =
  | { id: string; type: "paragraph"; heading: string; body: string[] }
  | { id: string; type: "bullets"; heading: string; items: string[] }
  | {
      id: string;
      type: "checklist";
      heading: string;
      /** `printed` lists the inclusions open on the page (the premium tier card). */
      mode: "dropdown" | "printed";
      /** Optional one-line description a tier card prints under the name. */
      summary: string;
      /** Optional illustration; absent means the card renders text-only, no hole. */
      image: ContentImage | null;
      items: ChecklistItem[];
    }
  | { id: string; type: "steps"; heading: string; steps: StepItem[] }
  | { id: string; type: "gallery"; heading: string; images: ContentImage[] }
  | {
      id: string;
      type: "table";
      heading: string;
      caption: string | null;
      columns: string[];
      rows: string[][];
    }
  | { id: string; type: "priceTable"; heading: string; binding: PriceBinding; note: string | null }
  | { id: string; type: "priceList"; heading: string; rows: PriceListRow[]; note: string | null }
  | { id: string; type: "note"; heading: string; tone: "info" | "attention"; text: string }
  | { id: string; type: "links"; heading: string; items: LinkItem[] };

export type ContentBlockType = ContentBlock["type"];

export const CONTENT_BLOCK_TYPES: ReadonlyArray<{
  type: ContentBlockType;
  label: string;
  hint: string;
}> = [
  { type: "paragraph", label: "Paragraph", hint: "The description a family reads." },
  { type: "bullets", label: "Bullets", hint: "Eligibility, inclusions, notes." },
  { type: "checklist", label: "Checklist", hint: "A plan tier's inclusion list." },
  { type: "steps", label: "Steps", hint: "A process, numbered." },
  { type: "gallery", label: "Images", hint: "Photographs with alt text and captions." },
  { type: "table", label: "Table", hint: "Sizes, dimensions, specifications." },
  { type: "priceTable", label: "Price table", hint: "Priced from a live catalogue SKU or the rate store." },
  { type: "priceList", label: "Price list", hint: "A ladder of priced rows (e.g. embalming days)." },
  { type: "note", label: "Note", hint: "A sample label or an honest-state flag." },
  { type: "links", label: "Links", hint: "Related pages and next steps." },
];

export type PageDocument = {
  key: PageDocumentKey;
  title: string;
  hero: PageHero;
  tabs: PageTab[];
  blocks: ContentBlock[];
  /** Ordered references to catalogue entries shown on this page (keys/SKUs). */
  entries: string[];
  updated_at: string | null;
  updated_by: string | null;
};

export type CatalogueEntry = {
  id: string;
  kind: "product" | "service" | "planTier";
  sku: string | null;
  key: string;
  title: string;
  summary: string;
  group: string | null;
  media: { hero: string | null; gallery: ContentImage[] };
  blocks: ContentBlock[];
  price: PriceBinding;
  updated_at: string | null;
  updated_by: string | null;
};

/**
 * The pricing store references a price block may bind to. Two rate tables
 * exist today (lib/pricing-model.ts: `plans.regular` / `plans.senior`); the
 * validator refuses anything else so a typo can never look wired.
 */
export const CONTENT_RATE_REFS: readonly string[] = ["plans.regular", "plans.senior"];

/**
 * What a save must resolve against: the live catalogue SKUs and the pricing
 * store's rate-row references. The store supplies them; the validator never
 * reads a fixture itself (this module stays pure).
 */
export type ContentValidationContext = {
  skus: ReadonlySet<string>;
  rateRefs: ReadonlySet<string>;
};

export type ContentValidation<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

/* ------------------------------ small helpers ------------------------------ */

/** An editor-side stable id for a new block/item/image. */
export function contentId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

/** A fresh block of a type, ready for the editor (every field present). */
export function emptyBlock(type: ContentBlockType): ContentBlock {
  const id = contentId(type);
  switch (type) {
    case "paragraph":
      return { id, type, heading: "", body: [""] };
    case "bullets":
      return { id, type, heading: "", items: [""] };
    case "checklist":
      return {
        id,
        type,
        heading: "",
        mode: "printed",
        summary: "",
        image: null,
        items: [{ id: contentId("check"), label: "", checked: true }],
      };
    case "steps":
      return { id, type, heading: "", steps: [{ id: contentId("step"), title: "", text: "" }] };
    case "gallery":
      return { id, type, heading: "", images: [] };
    case "table":
      return { id, type, heading: "", caption: null, columns: ["Column 1", "Column 2"], rows: [["", ""]] };
    case "priceTable":
      return { id, type, heading: "", binding: { kind: "quoteOnly" }, note: null };
    case "priceList":
      return { id, type, heading: "", rows: [{ id: contentId("row"), sku: "", label: "", unit: "" }], note: null };
    case "note":
      return { id, type, heading: "", tone: "info", text: "" };
    case "links":
      return { id, type, heading: "", items: [{ id: contentId("link"), label: "", href: "", note: null }] };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readStr(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readTrimmed(value: unknown): string {
  return readStr(value).trim();
}

function readNullableStr(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNum(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

/* --------------------------- price-binding readers -------------------------- */

function readPriceBinding(value: unknown): PriceBinding {
  if (!isRecord(value)) return { kind: "quoteOnly" };
  switch (value.kind) {
    case "sku":
      return { kind: "sku", sku: readTrimmed(value.sku) };
    case "ladder":
      return { kind: "ladder", skus: readArray(value.skus).map((v) => readTrimmed(v)).filter(Boolean) };
    case "matrix":
      return { kind: "matrix", ref: readTrimmed(value.ref) };
    default:
      return { kind: "quoteOnly" };
  }
}

/* ----------------------------- tolerant reader ----------------------------- */

/**
 * Reads a page document defensively: extra fields are ignored, missing fields
 * take honest defaults, unknown block types are dropped. The public pages call
 * this on the seed; the editor calls it on the stored JSON. It never throws —
 * the save path runs `validatePageDocument` and refuses bad input.
 */
export function readPageDocument(raw: unknown): PageDocument {
  const r = isRecord(raw) ? raw : {};
  const keyRaw = readTrimmed(r.key);
  const key: PageDocumentKey = isPageDocumentKey(keyRaw) ? keyRaw : "park";
  const heroRaw = isRecord(r.hero) ? r.hero : {};
  return {
    key,
    title: readTrimmed(r.title) || pageDocumentDef(key)?.label || "Page",
    hero: {
      eyebrow: readTrimmed(heroRaw.eyebrow),
      headline: readTrimmed(heroRaw.headline),
      lead: readTrimmed(heroRaw.lead),
      image: readNullableStr(heroRaw.image),
      background: readNullableStr(heroRaw.background),
      backgroundTransparency: readNum(heroRaw.backgroundTransparency, 100),
    },
    tabs: readArray(r.tabs)
      .map((tab): PageTab | null => {
        if (!isRecord(tab)) return null;
        const label = readTrimmed(tab.label);
        const href = readTrimmed(tab.href);
        if (!label || !href) return null;
        return { id: readTrimmed(tab.id) || contentId("tab"), label, href, note: readNullableStr(tab.note) };
      })
      .filter((tab): tab is PageTab => tab !== null),
    blocks: readArray(r.blocks)
      .map((block) => readContentBlock(block).block)
      .filter((block): block is ContentBlock => block !== null),
    entries: readArray(r.entries).map((v) => readTrimmed(v)).filter(Boolean),
    updated_at: readNullableStr(r.updated_at),
    updated_by: readNullableStr(r.updated_by),
  };
}

export function readCatalogueEntry(raw: unknown): CatalogueEntry {
  const r = isRecord(raw) ? raw : {};
  const kind = r.kind === "product" || r.kind === "service" || r.kind === "planTier" ? r.kind : "product";
  const mediaRaw = isRecord(r.media) ? r.media : {};
  return {
    id: readTrimmed(r.id) || contentId("entry"),
    kind,
    sku: readNullableStr(r.sku),
    key: readTrimmed(r.key),
    title: readTrimmed(r.title),
    summary: readTrimmed(r.summary),
    group: readNullableStr(r.group),
    media: {
      hero: readNullableStr(mediaRaw.hero),
      gallery: readArray(mediaRaw.gallery)
        .map((image) => readContentImage(image))
        .filter((image): image is ContentImage => image !== null),
    },
    blocks: readArray(r.blocks)
      .map((block) => readContentBlock(block).block)
      .filter((block): block is ContentBlock => block !== null),
    price: readPriceBinding(r.price),
    updated_at: readNullableStr(r.updated_at),
    updated_by: readNullableStr(r.updated_by),
  };
}

function readContentImage(raw: unknown): ContentImage | null {
  if (!isRecord(raw)) return null;
  const src = readTrimmed(raw.src);
  if (!src) return null;
  return {
    id: readTrimmed(raw.id) || contentId("img"),
    src,
    alt: readTrimmed(raw.alt),
    caption: readNullableStr(raw.caption),
    sample: raw.sample === true,
  };
}

type ReadBlock = { block: ContentBlock | null; errors: string[] };

/**
 * Parses one block and reports the field-level problems. Unknown types return a
 * null block (dropped by the reader, refused by the validator).
 */
export function readContentBlock(raw: unknown): ReadBlock {
  const errors: string[] = [];
  if (!isRecord(raw)) return { block: null, errors: ["A content block must be an object."] };
  const type = raw.type;
  const id = readTrimmed(raw.id) || contentId(typeof type === "string" ? type : "block");
  const heading = readTrimmed(raw.heading);

  switch (type) {
    case "paragraph": {
      const body = readArray(raw.body).map((line) => readStr(line));
      return { block: { id, type, heading, body: body.length > 0 ? body : [""] }, errors };
    }
    case "bullets": {
      const items = readArray(raw.items).map((item) => readStr(item));
      return { block: { id, type, heading, items: items.length > 0 ? items : [""] }, errors };
    }
    case "checklist": {
      // `printed` is the default OLD records carried (a dropdown tier list); the
      // captain's 2026-09-21 direction is that inclusions show in the card, so a
      // missing/unknown mode reads as printed, never as a surprise disclosure.
      const mode = raw.mode === "dropdown" ? "dropdown" : "printed";
      const items = readArray(raw.items)
        .map((item): ChecklistItem | null => {
          if (!isRecord(item)) return null;
          return {
            id: readTrimmed(item.id) || contentId("check"),
            label: readStr(item.label),
            checked: item.checked !== false,
          };
        })
        .filter((item): item is ChecklistItem => item !== null);
      return {
        block: {
          id,
          type,
          heading,
          mode,
          summary: readTrimmed(raw.summary),
          image: readContentImage(raw.image),
          items: items.length > 0 ? items : [{ id: contentId("check"), label: "", checked: true }],
        },
        errors,
      };
    }
    case "steps": {
      const steps = readArray(raw.steps)
        .map((step): StepItem | null => {
          if (!isRecord(step)) return null;
          return {
            id: readTrimmed(step.id) || contentId("step"),
            title: readStr(step.title),
            text: readStr(step.text),
          };
        })
        .filter((step): step is StepItem => step !== null);
      return { block: { id, type, heading, steps }, errors };
    }
    case "gallery": {
      const images = readArray(raw.images)
        .map((image) => readContentImage(image))
        .filter((image): image is ContentImage => image !== null);
      return { block: { id, type, heading, images }, errors };
    }
    case "table": {
      const columns = readArray(raw.columns).map((column) => readStr(column));
      const rows = readArray(raw.rows).map((row) => readArray(row).map((cell) => readStr(cell)));
      return {
        block: { id, type, heading, caption: readNullableStr(raw.caption), columns, rows },
        errors,
      };
    }
    case "priceTable": {
      return { block: { id, type, heading, binding: readPriceBinding(raw.binding), note: readNullableStr(raw.note) }, errors };
    }
    case "priceList": {
      const rows = readArray(raw.rows)
        .map((row): PriceListRow | null => {
          if (!isRecord(row)) return null;
          return {
            id: readTrimmed(row.id) || contentId("row"),
            sku: readTrimmed(row.sku),
            label: readStr(row.label),
            unit: readStr(row.unit),
          };
        })
        .filter((row): row is PriceListRow => row !== null);
      return { block: { id, type, heading, rows, note: readNullableStr(raw.note) }, errors };
    }
    case "note": {
      const tone = raw.tone === "attention" ? "attention" : "info";
      return { block: { id, type, heading, tone, text: readStr(raw.text) }, errors };
    }
    case "links": {
      const items = readArray(raw.items)
        .map((item): LinkItem | null => {
          if (!isRecord(item)) return null;
          return {
            id: readTrimmed(item.id) || contentId("link"),
            label: readStr(item.label),
            href: readStr(item.href),
            note: readNullableStr(item.note),
          };
        })
        .filter((item): item is LinkItem => item !== null);
      return { block: { id, type, heading, items }, errors };
    }
    default:
      return { block: null, errors: [`"${String(type)}" is not one of the content block types.`] };
  }
}

/* ------------------------------- validation -------------------------------- */

function tooLong(value: string, max: number, what: string): string | null {
  return value.length > max ? `${what} must stay under ${max} characters.` : null;
}

function imageSrcError(src: string, what: string): string | null {
  if (!IMAGE_SRC_PATTERN.test(src)) {
    return `${what} must be a published /media path, an https URL or a device upload.`;
  }
  if (src.length > CONTENT_IMAGE_MAX_LENGTH) {
    return `${what} is too large to store — choose a smaller file.`;
  }
  return null;
}

/**
 * The one image check every authored picture runs (gallery · checklist tier
 * image · catalogue entry): a published source, real alt text, a bounded
 * caption and — the standing sample rule — a caption says what a sample shows.
 */
function validateContentImage(image: ContentImage, what: string, errors: string[]): void {
  const srcError = imageSrcError(image.src, what);
  if (srcError) errors.push(srcError);
  if (!image.alt.trim()) errors.push(`${what} needs alt text.`);
  const alt = tooLong(image.alt, CONTENT_ALT_MAX, `${what} alt text`);
  if (alt) errors.push(alt);
  if (image.caption) {
    const cap = tooLong(image.caption, CONTENT_CAPTION_MAX, `${what} caption`);
    if (cap) errors.push(cap);
  }
  if (image.sample && !image.caption) {
    errors.push(`${what} is marked a sample — samples need their caption saying what the picture shows.`);
  }
}

function validateBlock(raw: unknown, index: number, context: ContentValidationContext): { block: ContentBlock | null; errors: string[] } {
  const { block, errors } = readContentBlock(raw);
  const at = `Block ${index + 1}`;
  if (!block) return { block: null, errors };

  const headingError = tooLong(block.heading, CONTENT_HEADING_MAX, `${at} heading`);
  if (headingError) errors.push(headingError);

  switch (block.type) {
    case "paragraph":
      block.body.forEach((line, i) => {
        const err = tooLong(line, CONTENT_TEXT_MAX, `${at} paragraph ${i + 1}`);
        if (err) errors.push(err);
      });
      if (block.body.every((line) => line.trim().length === 0)) errors.push(`${at} needs at least one paragraph.`);
      break;
    case "bullets":
      block.items.forEach((item, i) => {
        const err = tooLong(item, CONTENT_LINE_MAX, `${at} bullet ${i + 1}`);
        if (err) errors.push(err);
      });
      if (block.items.every((item) => item.trim().length === 0)) errors.push(`${at} needs at least one bullet.`);
      break;
    case "checklist": {
      const summary = tooLong(block.summary, CONTENT_LINE_MAX, `${at} summary`);
      if (summary) errors.push(summary);
      if (block.image) validateContentImage(block.image, `${at} image`, errors);
      if (block.items.length > CONTENT_CHECKLIST_ITEMS_MAX) {
        errors.push(`${at} keeps at most ${CONTENT_CHECKLIST_ITEMS_MAX} checklist items.`);
      }
      block.items.forEach((item, i) => {
        if (!item.label.trim()) errors.push(`${at} checklist item ${i + 1} needs a label.`);
        const err = tooLong(item.label, CONTENT_LINE_MAX, `${at} checklist item ${i + 1}`);
        if (err) errors.push(err);
      });
      break;
    }
    case "steps": {
      if (block.steps.length > CONTENT_STEPS_MAX) errors.push(`${at} keeps at most ${CONTENT_STEPS_MAX} steps.`);
      block.steps.forEach((step, i) => {
        if (!step.title.trim()) errors.push(`${at} step ${i + 1} needs a title.`);
        const t = tooLong(step.title, CONTENT_LINE_MAX, `${at} step ${i + 1} title`);
        if (t) errors.push(t);
        const b = tooLong(step.text, CONTENT_TEXT_MAX, `${at} step ${i + 1} text`);
        if (b) errors.push(b);
      });
      break;
    }
    case "gallery": {
      if (block.images.length > CONTENT_GALLERY_IMAGES_MAX) {
        errors.push(`${at} keeps at most ${CONTENT_GALLERY_IMAGES_MAX} images.`);
      }
      block.images.forEach((image, i) => validateContentImage(image, `${at} image ${i + 1}`, errors));
      break;
    }
    case "table": {
      if (block.columns.length === 0) errors.push(`${at} needs at least one column.`);
      if (block.columns.length > CONTENT_TABLE_COLUMNS_MAX) {
        errors.push(`${at} keeps at most ${CONTENT_TABLE_COLUMNS_MAX} columns.`);
      }
      if (block.rows.length > CONTENT_TABLE_ROWS_MAX) {
        errors.push(`${at} keeps at most ${CONTENT_TABLE_ROWS_MAX} rows.`);
      }
      block.columns.forEach((column, i) => {
        const err = tooLong(column, CONTENT_CELL_MAX, `${at} column ${i + 1}`);
        if (err) errors.push(err);
      });
      block.rows.forEach((row, i) => {
        if (row.length !== block.columns.length) {
          errors.push(`${at} row ${i + 1} has ${row.length} cells but the table has ${block.columns.length} columns.`);
        }
        row.forEach((cell, c) => {
          const err = tooLong(cell, CONTENT_CELL_MAX, `${at} row ${i + 1} cell ${c + 1}`);
          if (err) errors.push(err);
        });
      });
      if (block.caption) {
        const cap = tooLong(block.caption, CONTENT_CAPTION_MAX, `${at} caption`);
        if (cap) errors.push(cap);
      }
      break;
    }
    case "priceTable": {
      const binding = block.binding;
      if (binding.kind === "sku") {
        if (!binding.sku) errors.push(`${at} needs a catalogue SKU for its price.`);
        else if (!context.skus.has(binding.sku)) errors.push(`${at} names the SKU “${binding.sku}”, which the catalogue does not carry.`);
      } else if (binding.kind === "ladder") {
        if (binding.skus.length === 0) errors.push(`${at} needs at least one catalogue SKU.`);
        for (const sku of binding.skus) {
          if (!context.skus.has(sku)) errors.push(`${at} names the SKU “${sku}”, which the catalogue does not carry.`);
        }
        const dup = binding.skus.filter((sku, i) => binding.skus.indexOf(sku) !== i);
        if (dup.length > 0) errors.push(`${at} repeats the SKU “${dup[0]}”.`);
      } else if (binding.kind === "matrix") {
        if (!binding.ref) errors.push(`${at} needs a rate-table reference.`);
        else if (!context.rateRefs.has(binding.ref)) {
          errors.push(`${at} names the rate table “${binding.ref}”, which the pricing store does not carry.`);
        }
      }
      if (block.note) {
        const note = tooLong(block.note, CONTENT_CAPTION_MAX, `${at} note`);
        if (note) errors.push(note);
      }
      break;
    }
    case "priceList": {
      if (block.rows.length === 0) errors.push(`${at} needs at least one priced row.`);
      block.rows.forEach((row, i) => {
        if (!row.sku.trim()) errors.push(`${at} row ${i + 1} needs a catalogue SKU.`);
        else if (!context.skus.has(row.sku)) errors.push(`${at} row ${i + 1} names the SKU “${row.sku}”, which the catalogue does not carry.`);
        const label = tooLong(row.label, CONTENT_LINE_MAX, `${at} row ${i + 1} label`);
        if (label) errors.push(label);
        const unit = tooLong(row.unit, 40, `${at} row ${i + 1} unit`);
        if (unit) errors.push(unit);
      });
      if (block.note) {
        const note = tooLong(block.note, CONTENT_CAPTION_MAX, `${at} note`);
        if (note) errors.push(note);
      }
      break;
    }
    case "note": {
      if (!block.text.trim()) errors.push(`${at} note needs its sentence.`);
      const err = tooLong(block.text, CONTENT_TEXT_MAX, `${at} note`);
      if (err) errors.push(err);
      break;
    }
    case "links": {
      if (block.items.length > CONTENT_LINKS_MAX) errors.push(`${at} keeps at most ${CONTENT_LINKS_MAX} links.`);
      block.items.forEach((item, i) => {
        if (!item.label.trim()) errors.push(`${at} link ${i + 1} needs a label.`);
        if (!HREF_PATTERN.test(item.href)) errors.push(`${at} link ${i + 1} needs a destination that starts with /, # or https://.`);
        const label = tooLong(item.label, CONTENT_LINE_MAX, `${at} link ${i + 1} label`);
        if (label) errors.push(label);
      });
      break;
    }
  }

  // The parsed block is the shape the validator checks field by field above.
  return { block, errors };
}

function authoredBlockTexts(blocks: readonly ContentBlock[]): string[] {
  const out: string[] = [];
  const push = (value: string | null | undefined) => {
    if (value) out.push(value);
  };
  for (const block of blocks) {
    push(block.heading);
    switch (block.type) {
      case "paragraph":
        block.body.forEach(push);
        break;
      case "bullets":
        block.items.forEach(push);
        break;
      case "checklist":
        push(block.summary);
        if (block.image) {
          push(block.image.alt);
          push(block.image.caption);
        }
        block.items.forEach((item) => push(item.label));
        break;
      case "steps":
        block.steps.forEach((step) => {
          push(step.title);
          push(step.text);
        });
        break;
      case "gallery":
        block.images.forEach((image) => {
          push(image.alt);
          push(image.caption);
        });
        break;
      case "table":
        if (block.caption) push(block.caption);
        block.columns.forEach(push);
        block.rows.forEach((row) => row.forEach(push));
        break;
      case "priceTable":
        if (block.note) push(block.note);
        break;
      case "priceList":
        block.rows.forEach((row) => {
          push(row.label);
          push(row.unit);
        });
        if (block.note) push(block.note);
        break;
      case "note":
        push(block.text);
        break;
      case "links":
        block.items.forEach((item) => {
          push(item.label);
          push(item.note);
        });
        break;
    }
  }
  return out;
}

function authoredTexts(document: PageDocument): string[] {
  return [
    document.title,
    document.hero.eyebrow,
    document.hero.headline,
    document.hero.lead,
    ...document.tabs.flatMap((tab) => [tab.label, tab.note ?? ""]),
    ...authoredBlockTexts(document.blocks),
  ].filter(Boolean);
}

function glyphErrors(texts: readonly string[]): string[] {
  for (const text of texts) {
    const bad = unrenderableGlyphs(text);
    if (bad.length > 0) {
      return [
        `“${bad.join("")}” can't be published: this product's typefaces (Alegreya and Source Sans 3) carry no emoji, so the page would show an empty box instead. Please write the thought in words.`,
      ];
    }
  }
  return [];
}

/**
 * The save authority for a page document. Returns the parsed document on
 * success; on failure every problem is named, so the editor can show them all.
 */
export function validatePageDocument(
  raw: unknown,
  context: ContentValidationContext,
): ContentValidation<PageDocument> {
  const document = readPageDocument(raw);
  const errors: string[] = [];

  const keyRaw = isRecord(raw) ? readTrimmed(raw.key) : "";
  if (!isPageDocumentKey(keyRaw)) {
    errors.push(`“${keyRaw || "This document"}” is not one of the page documents.`);
  }
  if (!document.title.trim()) errors.push("The page title can't be empty.");
  if (!document.hero.headline.trim()) errors.push("The hero headline can't be empty.");
  const lead = tooLong(document.hero.lead, CONTENT_LEAD_MAX, "The hero lead");
  if (lead) errors.push(lead);
  const eyebrow = tooLong(document.hero.eyebrow, CONTENT_HEADING_MAX, "The hero eyebrow");
  if (eyebrow) errors.push(eyebrow);
  if (document.hero.image) {
    const err = imageSrcError(document.hero.image, "The hero image");
    if (err) errors.push(err);
  }
  if (document.hero.background !== null && !/^#[0-9a-f]{3,8}$|^rgba?\(|^hsla?\(|^[a-z]+$/i.test(document.hero.background)) {
    // The precise CSS-colour check is lib/landing/hero-background.ts's
    // isValidCssColor; the model keeps a shape check so it stays dependency-free.
    errors.push("The hero background colour must be a valid CSS colour like #3f97d1.");
  }
  if (
    document.hero.backgroundTransparency < 0 ||
    document.hero.backgroundTransparency > 100 ||
    !Number.isInteger(document.hero.backgroundTransparency)
  ) {
    errors.push("The hero background transparency must be a whole number from 0 to 100.");
  }
  if (document.tabs.length > CONTENT_TABS_MAX) errors.push(`The page keeps at most ${CONTENT_TABS_MAX} tabs.`);
  document.tabs.forEach((tab, i) => {
    if (!tab.label.trim() || !tab.href.trim()) errors.push(`Tab ${i + 1} needs a label and a destination.`);
    if (!HREF_PATTERN.test(tab.href)) errors.push(`Tab ${i + 1}'s destination must start with /, # or https://.`);
  });
  if (!uniqueStrings(document.tabs.map((tab) => tab.id))) errors.push("Two tabs share an id.");
  if (document.blocks.length > CONTENT_BLOCKS_MAX) {
    errors.push(`A page keeps at most ${CONTENT_BLOCKS_MAX} content blocks.`);
  }
  const rawBlocks = isRecord(raw) ? readArray(raw.blocks) : [];
  document.blocks.forEach((_, i) => {
    const result = validateBlock(rawBlocks[i], i, context);
    errors.push(...result.errors);
  });
  const blockIds = document.blocks.map((block) => block.id);
  if (!uniqueStrings(blockIds)) errors.push("Two content blocks share an id.");
  if (document.entries.length > CONTENT_ENTRIES_MAX) errors.push(`A page keeps at most ${CONTENT_ENTRIES_MAX} entries.`);
  if (document.entries.some((entry) => entry.trim().length === 0)) errors.push("An entry reference can't be empty.");
  if (!uniqueStrings(document.entries)) errors.push("Two entries repeat.");

  errors.push(...glyphErrors(authoredTexts(document)));

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { ...document, key: keyRaw as PageDocumentKey } };
}

/**
 * The save authority for a catalogue entry (the item-level half of the model;
 * its editor ships with the item-catalogue pass).
 */
export function validateCatalogueEntry(
  raw: unknown,
  context: ContentValidationContext,
): ContentValidation<CatalogueEntry> {
  const entry = readCatalogueEntry(raw);
  const errors: string[] = [];
  if (!entry.key.trim()) errors.push("The entry key can't be empty.");
  if (!entry.title.trim()) errors.push("The entry title can't be empty.");
  const summary = tooLong(entry.summary, CONTENT_LEAD_MAX, "The summary");
  if (summary) errors.push(summary);
  if (entry.media.hero) {
    const err = imageSrcError(entry.media.hero, "The hero image");
    if (err) errors.push(err);
  }
  entry.media.gallery.forEach((image, i) => validateContentImage(image, `Image ${i + 1}`, errors));
  if (entry.blocks.length > CONTENT_BLOCKS_MAX) errors.push(`An entry keeps at most ${CONTENT_BLOCKS_MAX} content blocks.`);
  const rawBlocks = isRecord(raw) ? readArray(raw.blocks) : [];
  entry.blocks.forEach((_, i) => {
    const result = validateBlock(rawBlocks[i], i, context);
    errors.push(...result.errors);
  });
  if (entry.price.kind === "sku" && !context.skus.has(entry.price.sku)) {
    errors.push(`The entry binds to SKU “${entry.price.sku}”, which the catalogue does not carry.`);
  }
  if (entry.price.kind === "ladder") {
    for (const sku of entry.price.skus) {
      if (!context.skus.has(sku)) errors.push(`The entry binds to SKU “${sku}”, which the catalogue does not carry.`);
    }
  }
  if (entry.price.kind === "matrix" && !context.rateRefs.has(entry.price.ref)) {
    errors.push(`The entry binds to rate table “${entry.price.ref}”, which the pricing store does not carry.`);
  }
  errors.push(
    ...glyphErrors([
      entry.title,
      entry.summary,
      ...entry.media.gallery.map((image) => image.alt),
      ...entry.media.gallery.map((image) => image.caption ?? ""),
      ...authoredBlockTexts(entry.blocks),
    ]),
  );
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: entry };
}

/** A human sentence for the first problem — the BFF 422 body. */
export function firstContentError(errors: readonly string[]): string {
  return errors[0] ?? "The content could not be saved.";
}
