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
 *  - A page document's hero is staff copy; its image, background and text colour
 *    reuse the home hero's own rules (the CSS colour check lives in
 *    lib/landing/hero-background.ts, the transparency is 0–100 with 100 = the
 *    clear photograph). The copy (eyebrow · headline · lead) is OPTIONAL: with
 *    none set the page renders the raw photo — no wash, scrim or gradient.
 *  - A price block NEVER carries an amount: `priceTable` / `priceList` bind to a
 *    catalogue SKU or a pricing-store rate row, and the validator refuses a
 *    binding that does not resolve against the stores it is handed.
 *  - A sample image requires its caption (the standing illustration-purposes
 *    rule); the gallery's images carry alt text like every published picture.
 *  - Every authored string passes the one glyph gate (lib/text-gate.ts): the
 *    product's two faces carry no emoji, so a published one is a missing glyph.
 *  - Reference lists (`tabs`, `entries`) are ordered and unique.
 *
 * THE PDP EXTENSION (P0 of data/villa-pdp-cms-plan/report.md). A catalogue
 * entry also carries the product-detail half the captain confirmed: a typed
 * rich-text `description` (a node tree, never HTML), an uncapped PDP `gallery`,
 * and a ≤15-column `specs` table. The same module owns the product-line record
 * whose shared specs merge with a variant's (`resolveSpecs` in
 * lib/product-line.ts). Money stays a `PriceBinding`; the seven withheld client
 * photographs remain unpublished.
 */

import { isValidCssColor } from "@/lib/landing/hero-background";
import { unrenderableGlyphs } from "@/lib/text-gate";

/* ------------------------------ page documents ----------------------------- */

export type PageDocumentKey = "home" | "park" | "services" | "plans" | "coffins" | "blog";

export const PAGE_DOCUMENT_KEYS: readonly PageDocumentKey[] = [
  "home",
  "park",
  "services",
  "plans",
  "coffins",
  "blog",
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
    hint: "The home page's own seven sections. Its former storefront sections are edited with /blog; the FAQ has its own editor at /staff/landing/faq.",
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
    blocks: true,
    hint: "The casket catalogue hero and its page copy. Each casket model's own description and detail blocks are edited on its catalogue entry.",
  },
  {
    key: "blog",
    label: "Blog",
    route: "/blog",
    editor: "page",
    blocks: false,
    hint: "The blog's own document — its heading, intro and posts (photographs, films and notes from the grounds). One row per post on the page.",
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
/**
 * The product-detail spreadsheet: the captain's ≤15 editable columns with an
 * UNCAPPED row count (the entry-level `specs`, distinct from the block table's
 * 12-column / 40-row `table` above).
 */
export const CONTENT_SPECS_COLUMNS_MAX = 15;
/** The rich-text read: a bounded node tree keeps a document parseable. */
export const CONTENT_RICHTEXT_NODES_MAX = 120;
/**
 * The stored-document size a product's authored gallery may reach (an uncapped
 * image COUNT is fine; the DOCUMENT may not grow without bound). Counts the
 * payload a data URL carries — a published path stores no bytes in the
 * document — so a device upload cannot silently bloat every read.
 */
export const CONTENT_ENTRY_GALLERY_BYTES_MAX = 40_000_000;

const IMAGE_SRC_PATTERN = /^(?:\/|https?:\/\/)/i;
const HREF_PATTERN = /^(?:\/|#|https?:\/\/|mailto:|tel:)/i;

/* ------------------------------- primitives -------------------------------- */

export type PageHero = {
  eyebrow: string;
  headline: string;
  lead: string;
  image: string | null;
  background: string | null;
  backgroundTransparency: number;
  /**
   * Author-settable hero copy colour (any CSS colour isValidCssColor accepts).
   * null = the shipped token ink, so legacy documents are untouched. Rendered as
   * the `--hero-text-colour` custom property the hero copy rules read.
   */
  textColour: string | null;
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

/* -------------------------------- rich text -------------------------------- */

/**
 * A product's rich description — a typed NODE TREE, never an HTML string
 * (captain's Q5: a zero-dependency model, not a WYSIWYG library). Bold and
 * italic are marks on a span; a link is a span's href; headings are levels 2
 * and 3 only (the page owns the h1). The renderer and the editor walk the same
 * nodes, so what is stored is exactly what prints.
 */
export type RichTextMark = "bold" | "italic";

export type RichTextSpan = {
  text: string;
  marks?: RichTextMark[];
  /** A destination the HREF_PATTERN accepts (/ or # or https:// or mailto:/tel:). */
  href?: string;
};

export type RichTextNode =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; spans: RichTextSpan[] }
  | { type: "bulletList"; items: RichTextSpan[][] }
  | { type: "orderedList"; items: RichTextSpan[][] };

export type RichTextDoc = { nodes: RichTextNode[] };

/* ---------------------------------- specs ---------------------------------- */

/**
 * The spreadsheet specifications: staff-typed column headers (≤15) and any
 * number of rows, each row carrying exactly one cell per column. A price is
 * never a cell value — money stays a live `PriceBinding`, never an amount.
 */
export type ContentSpecs = { columns: string[]; rows: string[][] };

/* ------------------------------- product line ------------------------------ */

/**
 * Where a product line draws its variants. `casketCollection` seeds the line
 * from the client sheet's own collection grouping (captain's Q4: the four
 * collections are the four lines); `manual` is an authored list for a family
 * the sheet does not group.
 */
export type ProductLineSource =
  | { kind: "casketCollection"; collection: string }
  | { kind: "manual" };

/**
 * The "choose a model" grouping behind a PDP: one line per collection, its
 * ordered variant SKUs, and the shared specs every variant inherits (captain's
 * Q1: per-variant specs with line-level shared defaults). A line is the
 * grouping; a variant (each casket model) keeps its own entry, gallery and
 * specs. `lib/product-line.ts` derives the four sheet lines and resolves the
 * merged table; the store keeps the authored overrides.
 */
export type ProductLine = {
  id: string;
  name: string;
  source: ProductLineSource;
  variantSkus: string[];
  sharedSpecs: ContentSpecs | null;
  updated_at: string | null;
  updated_by: string | null;
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

/** One photograph/video attached to a blog post. */
export type BlogMediaItem = {
  id: string;
  kind: "photo" | "video";
  src: string;
  alt: string;
  poster: string | null;
};

/** One blog post — the blog's own schema (office, 2026-09-29). */
export type BlogPostRecord = {
  id: string;
  author: string;
  /** The calendar day the post carries, ISO `YYYY-MM-DD`. */
  date: string;
  caption: string;
  media: BlogMediaItem[];
  /** The route the post's photograph/caption opens; null keeps it unclickable. */
  link: string | null;
};

/** The blog page's own document: a heading, an intro and the posts. */
export type BlogDocument = {
  heading: string;
  intro: string;
  posts: BlogPostRecord[];
};

export type PageDocument = {
  key: PageDocumentKey;
  title: string;
  hero: PageHero;
  tabs: PageTab[];
  blocks: ContentBlock[];
  /**
   * The blog's own posts, when this is the blog document. The landing content
   * document no longer owns posts (2026-09-29): the blog is its own page
   * document, so editing the home cannot change the blog and vice versa.
   */
  blog: BlogDocument | null;
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
  /** The short lead (the storefront card line); `description` is the long read. */
  summary: string;
  /** The rich-text long read; absent falls back to `summary`. */
  description: RichTextDoc | null;
  group: string | null;
  media: { hero: string | null; gallery: ContentImage[] };
  /**
   * The product-detail gallery: ordered and uncapped (validated by stored
   * payload, not by count). `media.gallery` stays the one storefront photo the
   * catalogue record owns; this is the PDP viewer + thumbnail rail.
   */
  gallery: ContentImage[];
  /** Per-variant specifications, merged with the line's shared defaults at render. */
  specs: ContentSpecs | null;
  blocks: ContentBlock[];
  price: PriceBinding;
  updated_at: string | null;
  updated_by: string | null;
};

/**
 * What the ONE entry editor needs to render any entry (a service guide, a casket
 * model, a package). An item entry locks the title/group to its catalogue record
 * (`identityLocked`) so a content edit can never rename a product or drift its
 * price; a service guide keeps them editable. Both build this shape at the call
 * site so the editor stays generic.
 */
export type EntryEditorTarget = {
  /** The entry identity a save is addressed by. */
  key: string;
  /** The public route the entry feeds (shown as a "View live page" link). */
  route: string;
  /** The small label above the title, e.g. "Service entry" / "Casket entry". */
  kindLabel: string;
  fallbackTitle: string;
  fallbackSummary: string;
  /** When true the title/group are read-only and point at their real home. */
  identityLocked?: boolean;
  /** Where the locked identity is edited (the catalogue form). */
  identityHref?: string;
  /** One sentence explaining why the identity is locked. */
  identityNote?: string;
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

/* --------------------------- rich-text readers ----------------------------- */

/** One span: a bare string is tolerated as text, marks are filtered to the vocabulary. */
function readRichTextSpan(raw: unknown): RichTextSpan {
  if (typeof raw === "string") return { text: raw };
  if (!isRecord(raw)) return { text: "" };
  const marks = readArray(raw.marks).filter((mark): mark is RichTextMark => mark === "bold" || mark === "italic");
  const uniqueMarks = [...new Set(marks)];
  const span: RichTextSpan = { text: readStr(raw.text) };
  if (uniqueMarks.length > 0) span.marks = uniqueMarks;
  const href = readNullableStr(raw.href);
  if (href) span.href = href;
  return span;
}

function readRichTextSpans(raw: unknown): RichTextSpan[] {
  return readArray(raw).map(readRichTextSpan);
}

function readRichTextNode(raw: unknown): RichTextNode | null {
  if (!isRecord(raw)) return null;
  switch (raw.type) {
    case "heading": {
      // The page owns the h1, so only levels 2 and 3 are legal; anything else is
      // dropped rather than guessed into a heading level.
      const level = raw.level === 3 ? 3 : raw.level === 2 ? 2 : null;
      if (level === null) return null;
      return { type: "heading", level, text: readStr(raw.text) };
    }
    case "paragraph":
      return { type: "paragraph", spans: readRichTextSpans(raw.spans) };
    case "bulletList":
      return { type: "bulletList", items: readArray(raw.items).map(readRichTextSpans) };
    case "orderedList":
      return { type: "orderedList", items: readArray(raw.items).map(readRichTextSpans) };
    default:
      return null;
  }
}

/** Reads a rich-text document defensively; unknown node types are dropped. */
export function readRichTextDoc(raw: unknown): RichTextDoc {
  const r = isRecord(raw) ? raw : {};
  return {
    nodes: readArray(r.nodes)
      .map(readRichTextNode)
      .filter((node): node is RichTextNode => node !== null),
  };
}

function readNullableRichTextDoc(raw: unknown): RichTextDoc | null {
  if (raw === null || raw === undefined) return null;
  const doc = readRichTextDoc(raw);
  return doc.nodes.length > 0 ? doc : null;
}

/* ----------------------------- specs readers ------------------------------ */

/** Reads a specs table defensively (every cell a string; shape checked by the validator). */
export function readContentSpecs(raw: unknown): ContentSpecs {
  const r = isRecord(raw) ? raw : {};
  return {
    columns: readArray(r.columns).map((column) => readStr(column)),
    rows: readArray(r.rows).map((row) => readArray(row).map((cell) => readStr(cell))),
  };
}

function readNullableContentSpecs(raw: unknown): ContentSpecs | null {
  if (raw === null || raw === undefined) return null;
  const specs = readContentSpecs(raw);
  return specs.columns.length > 0 || specs.rows.length > 0 ? specs : null;
}

/* --------------------------- product-line reader --------------------------- */

function readProductLineSource(raw: unknown): ProductLineSource {
  if (isRecord(raw) && raw.kind === "casketCollection") {
    return { kind: "casketCollection", collection: readTrimmed(raw.collection) };
  }
  return { kind: "manual" };
}

/**
 * Reads a product line defensively: missing fields take honest defaults (an
 * empty id is refused by the save rule, never guessed).
 */
export function readProductLine(raw: unknown): ProductLine {
  const r = isRecord(raw) ? raw : {};
  const source = readProductLineSource(r.source);
  return {
    id: readTrimmed(r.id),
    name: readTrimmed(r.name),
    source,
    variantSkus: readArray(r.variantSkus).map((sku) => readTrimmed(sku)).filter(Boolean),
    sharedSpecs: readNullableContentSpecs(r.sharedSpecs),
    updated_at: readNullableStr(r.updated_at),
    updated_by: readNullableStr(r.updated_by),
  };
}

/* ----------------------------- tolerant reader ----------------------------- */

/**
 * Reads a page document defensively: extra fields are ignored, missing fields
 * take honest defaults, unknown block types are dropped. The public pages call
 * this on the seed; the editor calls it on the stored JSON. It never throws —
 * the save path runs `validatePageDocument` and refuses bad input.
 */
function readBlogMedia(raw: unknown): BlogMediaItem | null {
  if (!isRecord(raw)) return null;
  const src = readTrimmed(raw.src);
  if (!src) return null;
  const kind = raw.kind === "video" ? "video" : "photo";
  return {
    id: readTrimmed(raw.id) || contentId("media"),
    kind,
    src,
    alt: readTrimmed(raw.alt),
    poster: readNullableStr(raw.poster),
  };
}

function readBlogPost(raw: unknown): BlogPostRecord | null {
  if (!isRecord(raw)) return null;
  const caption = readTrimmed(raw.caption);
  const media = readArray(raw.media)
    .map(readBlogMedia)
    .filter((item): item is BlogMediaItem => item !== null);
  // Drop only rows with no words and no picture at all; anything else is kept
  // so the validator names its problem rather than the post vanishing on save.
  if (!caption && media.length === 0) return null;
  return {
    id: readTrimmed(raw.id) || contentId("post"),
    author: readTrimmed(raw.author) || "Villa Memorial Park",
    date: readTrimmed(raw.date),
    caption,
    media,
    link: readNullableStr(raw.link),
  };
}

export function readBlogDocument(raw: unknown): BlogDocument | null {
  if (!isRecord(raw)) return null;
  return {
    heading: readTrimmed(raw.heading),
    intro: readTrimmed(raw.intro),
    posts: readArray(raw.posts)
      .map(readBlogPost)
      .filter((post): post is BlogPostRecord => post !== null),
  };
}

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
      textColour: readNullableStr(heroRaw.textColour),
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
    blog: readBlogDocument(r.blog),
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
    description: readNullableRichTextDoc(r.description),
    group: readNullableStr(r.group),
    media: {
      hero: readNullableStr(mediaRaw.hero),
      gallery: readArray(mediaRaw.gallery)
        .map((image) => readContentImage(image))
        .filter((image): image is ContentImage => image !== null),
    },
    gallery: readArray(r.gallery)
      .map((image) => readContentImage(image))
      .filter((image): image is ContentImage => image !== null),
    specs: readNullableContentSpecs(r.specs),
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
  // A stored document carries a reference, never the bytes (P4 of
  // data/villa-pdp-cms-plan/report.md §3.3). An embedded data URL is an
  // unmigrated device upload and is refused by name, not accepted as "a device
  // upload" — the referenced-bytes guard (lib/media-upload.ts) then proves the
  // short path it should carry really resolves to a file under MEDIA_UPLOAD_DIR.
  if (/^data:/i.test(src)) {
    return `${what} is stored as an embedded data URL. Upload it through the media route so it saves as a file.`;
  }
  if (!IMAGE_SRC_PATTERN.test(src)) {
    return `${what} must be a published /media path or an https URL.`;
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

/* ------------------------- rich-text validation ---------------------------- */

function validateRichTextSpan(span: RichTextSpan, what: string, errors: string[]): void {
  const text = tooLong(span.text, CONTENT_TEXT_MAX, what);
  if (text) errors.push(text);
  if (span.href) {
    if (!HREF_PATTERN.test(span.href)) {
      errors.push(`${what} has a link that must start with /, #, https://, mailto: or tel:.`);
    }
  }
}

function richTextHasText(doc: RichTextDoc): boolean {
  const spansHaveText = (spans: RichTextSpan[]) => spans.some((span) => span.text.trim().length > 0);
  return doc.nodes.some((node) => {
    if (node.type === "heading") return node.text.trim().length > 0;
    if (node.type === "paragraph") return spansHaveText(node.spans);
    return node.items.some(spansHaveText);
  });
}

/**
 * The rich-text rules the store, the editor and the BFF route all run: a bounded
 * node tree, the shared text limit on every span, real destinations on links and
 * at least one word of actual copy. It never sees HTML — the input is the typed
 * node tree (or an unknown value, which reads as an empty one).
 */
function richTextErrors(doc: RichTextDoc, what: string): string[] {
  const errors: string[] = [];
  if (doc.nodes.length > CONTENT_RICHTEXT_NODES_MAX) {
    errors.push(`${what} keeps at most ${CONTENT_RICHTEXT_NODES_MAX} blocks of text.`);
  }
  if (!richTextHasText(doc)) errors.push(`${what} has no text yet.`);
  doc.nodes.forEach((node, i) => {
    const at = `${what} — block ${i + 1}`;
    switch (node.type) {
      case "heading": {
        if (!node.text.trim()) errors.push(`${at} is an empty heading.`);
        const err = tooLong(node.text, CONTENT_HEADING_MAX, at);
        if (err) errors.push(err);
        break;
      }
      case "paragraph":
        node.spans.forEach((span) => validateRichTextSpan(span, at, errors));
        break;
      case "bulletList":
      case "orderedList":
        if (node.items.length === 0) errors.push(`${at} is an empty list.`);
        node.items.forEach((item) => item.forEach((span) => validateRichTextSpan(span, at, errors)));
        break;
    }
  });
  return errors;
}

/** Reads and validates one rich-text document (the description's own rule). */
export function validateRichText(
  raw: unknown,
  what = "The description",
): ContentValidation<RichTextDoc> {
  const doc = readRichTextDoc(raw);
  const errors = richTextErrors(doc, what);
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: doc };
}

function richTextTexts(doc: RichTextDoc | null): string[] {
  if (!doc) return [];
  const out: string[] = [];
  for (const node of doc.nodes) {
    if (node.type === "heading") {
      out.push(node.text);
      continue;
    }
    const items = node.type === "paragraph" ? [node.spans] : node.items;
    for (const spans of items) for (const span of spans) out.push(span.text);
  }
  return out;
}

/* --------------------------- specs validation ------------------------------ */

/**
 * The one specs rule: ≤15 columns (the refusal names the offending header),
 * any number of rows, and every row carrying exactly one cell per column.
 */
function specsErrors(specs: ContentSpecs, what: string): string[] {
  const errors: string[] = [];
  if (specs.columns.length === 0) errors.push(`${what} need at least one column.`);
  if (specs.columns.length > CONTENT_SPECS_COLUMNS_MAX) {
    const overflow = specs.columns[CONTENT_SPECS_COLUMNS_MAX]?.trim() || `column ${CONTENT_SPECS_COLUMNS_MAX + 1}`;
    errors.push(
      `${what} keep at most ${CONTENT_SPECS_COLUMNS_MAX} columns — “${overflow}” is the ${CONTENT_SPECS_COLUMNS_MAX + 1}th.`,
    );
  }
  specs.columns.forEach((column, i) => {
    if (!column.trim()) errors.push(`${what} column ${i + 1} needs a header.`);
    const err = tooLong(column, CONTENT_CELL_MAX, `${what} column ${i + 1}`);
    if (err) errors.push(err);
  });
  specs.rows.forEach((row, i) => {
    if (row.length !== specs.columns.length) {
      errors.push(`${what} row ${i + 1} has ${row.length} cells but the table has ${specs.columns.length} columns.`);
    }
    row.forEach((cell, c) => {
      const err = tooLong(cell, CONTENT_CELL_MAX, `${what} row ${i + 1} cell ${c + 1}`);
      if (err) errors.push(err);
    });
  });
  return errors;
}

/** Reads and validates one specs table (the entry's and the line's own rule). */
export function validateContentSpecs(
  raw: unknown,
  what = "The specifications",
): ContentValidation<ContentSpecs> {
  const specs = readContentSpecs(raw);
  const errors = specsErrors(specs, what);
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: specs };
}

/**
 * The bytes the stored document carries for its photographs. A published path
 * carries none; a device-upload data URL carries its base64 payload, which is
 * the only thing that can grow a gallery document without bound.
 */
export function referencedImageBytes(images: readonly ContentImage[]): number {
  let total = 0;
  for (const image of images) {
    if (/^data:/i.test(image.src)) total += image.src.length;
  }
  return total;
}

function specsTexts(specs: ContentSpecs | null): string[] {
  if (!specs) return [];
  return [...specs.columns, ...specs.rows.flat()];
}

/* ------------------------- product-line validation ------------------------- */

/**
 * The save rule for a product line: a stable id and name, at least one unique
 * variant that the live catalogue carries, and shared specs within the ≤15
 * cap. The line's variant MEMBERSHIP is derived in lib/product-line.ts; this
 * only checks that whatever the record names really exists.
 */
export function validateProductLine(
  raw: unknown,
  context: ContentValidationContext,
): ContentValidation<ProductLine> {
  const line = readProductLine(raw);
  const errors: string[] = [];
  if (!line.id.trim()) errors.push("The product line needs a stable id.");
  if (!line.name.trim()) errors.push("The product line needs a name.");
  const name = tooLong(line.name, CONTENT_HEADING_MAX, "The product line name");
  if (name) errors.push(name);
  if (line.source.kind === "casketCollection" && !line.source.collection.trim()) {
    errors.push("The product line names a casket collection but leaves it empty.");
  }
  if (line.variantSkus.length === 0) errors.push("The product line needs at least one variant.");
  if (!uniqueStrings(line.variantSkus)) errors.push("Two variants repeat in the product line.");
  line.variantSkus.forEach((sku, i) => {
    if (!context.skus.has(sku)) {
      errors.push(`Variant ${i + 1} names the SKU “${sku}”, which the catalogue does not carry.`);
    }
  });
  if (line.sharedSpecs) errors.push(...specsErrors(line.sharedSpecs, "The shared specifications"));
  errors.push(...glyphErrors([line.name, ...line.variantSkus]));
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: line };
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
    ...(document.blog
      ? [
          document.blog.heading,
          document.blog.intro,
          ...document.blog.posts.flatMap((post) => [
            post.author,
            post.caption,
            ...post.media.map((item) => item.alt),
          ]),
        ]
      : []),
    ...authoredBlockTexts(document.blocks),
  ].filter(Boolean);
}

function glyphErrors(texts: readonly string[]): string[] {
  for (const text of texts) {
    const bad = unrenderableGlyphs(text);
    if (bad.length > 0) {
      return [
        `“${bad.join("")}” can't be published: this product's typeface (Inter) carries no emoji, so the page would show an empty box instead. Please write the thought in words.`,
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
  // The hero copy is optional: an image-only hero (a photo and no eyebrow,
  // headline or lead) is a legal document — the page renders the raw photo.
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
  if (document.hero.textColour !== null && !isValidCssColor(document.hero.textColour)) {
    errors.push("The hero text colour must be a valid CSS colour like #ffffff.");
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

  if (document.blog) {
    const blog = document.blog;
    if (!blog.heading.trim()) errors.push("The blog heading can't be empty.");
    if (blog.posts.length === 0) errors.push("The blog needs at least one post.");
    blog.posts.forEach((post, i) => {
      if (!post.caption.trim()) errors.push(`Blog post ${i + 1} needs its caption.`);
      if (!post.author.trim()) errors.push(`Blog post ${i + 1} needs its author.`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date)) {
        errors.push(`Blog post ${i + 1} needs its date as YYYY-MM-DD.`);
      }
      if (post.link !== null && !HREF_PATTERN.test(post.link)) {
        errors.push(`Blog post ${i + 1}'s link must start with /, # or https://.`);
      }
      post.media.forEach((item, j) => {
        if (!item.src.trim()) errors.push(`Blog post ${i + 1}'s media ${j + 1} needs a source.`);
      });
    });
    if (!uniqueStrings(blog.posts.map((post) => post.id))) errors.push("Two blog posts share an id.");
  }

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
  if (entry.description) errors.push(...richTextErrors(entry.description, "The description"));
  if (entry.media.hero) {
    const err = imageSrcError(entry.media.hero, "The hero image");
    if (err) errors.push(err);
  }
  entry.media.gallery.forEach((image, i) => validateContentImage(image, `Image ${i + 1}`, errors));
  // The PDP gallery is uncapped by COUNT (validated by stored payload instead).
  entry.gallery.forEach((image, i) => validateContentImage(image, `Gallery image ${i + 1}`, errors));
  const galleryBytes = referencedImageBytes(entry.gallery);
  if (galleryBytes > CONTENT_ENTRY_GALLERY_BYTES_MAX) {
    errors.push(
      `The gallery's stored photographs total about ${Math.round(galleryBytes / 1_000_000)} MB — keep them under ${CONTENT_ENTRY_GALLERY_BYTES_MAX / 1_000_000} MB.`,
    );
  }
  if (entry.specs) errors.push(...specsErrors(entry.specs, "The specifications"));
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
      ...richTextTexts(entry.description),
      ...entry.media.gallery.map((image) => image.alt),
      ...entry.media.gallery.map((image) => image.caption ?? ""),
      ...entry.gallery.map((image) => image.alt),
      ...entry.gallery.map((image) => image.caption ?? ""),
      ...specsTexts(entry.specs),
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
