/**
 * Content pages store — the reader/writer behind Pages & content.
 *
 * WHAT LIVES HERE
 * The four page documents that are NOT the home (Home is the landing content
 * document, lib/fixtures/landing/content.json — the existing full editor). The
 * seed is lib/fixtures/content/pages.json, recorded from the pages' current copy
 * (see its `_provenance` block): Park · Funeraria Memorial Services · Villa
 * Memorial Plan · Coffins & caskets. Home is composed from the landing document
 * so the Pages & content list can show all five without storing it twice.
 *
 * THE STORE PATTERN
 * The same seam as the landing content document: demo mutations live on
 * globalThis so the BFF save route and the re-rendered public pages agree within
 * one server process (Next compiles route handlers into separate bundles, so a
 * module-level variable would not be shared). No upstream content service exists
 * — the platform has no content/CMS contract — so this is an app-authored CMS
 * seam exactly like landing content; the write path is /api/content/pages
 * (gated `catalog:write`, provisionally, like the landing route).
 *
 * THE AUTHORITY
 * `validatePageDocument` (lib/content-catalog.ts) is the save rule, run here
 * with the LIVE catalogue SKUs and the pricing store's rate refs — so a price
 * block that names a withdrawn SKU or a renamed rate table is refused rather
 * than silently orphaned. The editor runs the same validator client-side for
 * field-level feedback; this store is the server's veto.
 */
import { ApiError } from "@/lib/api-client/api-error";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { listLandingContent } from "@/lib/api-client/landing";
import {
  CONTENT_RATE_REFS,
  PAGE_DOCUMENTS,
  firstContentError,
  readPageDocument,
  validatePageDocument,
  type ContentValidationContext,
  type PageDocument,
  type PageDocumentKey,
} from "@/lib/content-catalog";
import seedFile from "@/lib/fixtures/content/pages.json";

type ContentSeed = { pages: unknown[] };

const SEED: PageDocument[] = ((seedFile as unknown as ContentSeed).pages ?? [])
  .map((raw) => readPageDocument(raw))
  .filter((doc, index, all) => all.findIndex((d) => d.key === doc.key) === index);

// One process-wide store, the landing pattern.
type ContentGlobal = typeof globalThis & { __imContentPages?: PageDocument[] };
const contentGlobal = globalThis as ContentGlobal;

function stored(): PageDocument[] {
  // Copy the seed the first time so a later save can never mutate the module seed.
  contentGlobal.__imContentPages ??= SEED.map((doc) => structuredClone(doc));
  return contentGlobal.__imContentPages;
}

/** Home is the landing content document — composed, never stored twice. */
async function homeDocument(): Promise<PageDocument> {
  const landing = await listLandingContent();
  const hero = landing.hero;
  return {
    key: "home",
    title: "Home",
    hero: {
      eyebrow: hero.eyebrow,
      headline: hero.headline,
      lead: hero.subline,
      image: hero.image,
      background: hero.background,
      backgroundTransparency: hero.backgroundTransparency,
      textColour: hero.textColour,
    },
    tabs: [],
    blocks: [],
    entries: [],
    updated_at: landing.updated_at,
    updated_by: null,
  };
}

/** Every document for the Pages & content index, in the captain's order. */
export async function listPageDocuments(): Promise<PageDocument[]> {
  const [home, storedDocs] = await Promise.all([
    homeDocument(),
    Promise.resolve(
      PAGE_DOCUMENTS.filter((def) => def.key !== "home").map((def) => {
        const found = stored().find((doc) => doc.key === def.key);
        return found ?? readPageDocument({ key: def.key, title: def.label });
      }),
    ),
  ]);
  return [home, ...storedDocs];
}

/** One document by key; null when the key names none of the five pages. */
export async function getPageDocument(key: string): Promise<PageDocument | null> {
  if (key === "home") return homeDocument();
  const found = stored().find((doc) => doc.key === key);
  return found ?? null;
}

/** The live validation context: what a price binding may resolve against. */
async function validationContext(): Promise<ContentValidationContext> {
  let skus: ReadonlySet<string>;
  try {
    const items = await listCatalogItems();
    skus = new Set(items.map((item) => item.sku));
  } catch {
    throw new ApiError(
      "The catalogue is unavailable right now, so a price block cannot be checked. Please try again shortly.",
      503,
    );
  }
  return { skus, rateRefs: new Set(CONTENT_RATE_REFS) };
}

/**
 * Validates and persists one page document. The caller passes the key because
 * the document body carries it; both must agree. Returns the saved document so
 * the editor can confirm exactly what the pages render.
 */
export async function savePageDocument(
  key: string,
  raw: unknown,
  actor?: string,
): Promise<PageDocument> {
  const context = await validationContext();
  const verdict = validatePageDocument(raw, context);
  if (!verdict.ok) throw new ApiError(firstContentError(verdict.errors), 422);
  if (verdict.value.key !== key) {
    throw new ApiError(`The document says “${verdict.value.key}” but the save names “${key}”.`, 422);
  }
  if (key === "home") {
    throw new ApiError("The home page is edited in its own full editor, not the page-document editor.", 422);
  }
  const saved: PageDocument = {
    ...verdict.value,
    updated_at: new Date().toISOString(),
    updated_by: actor ?? null,
  };
  const documents = stored();
  const index = documents.findIndex((doc) => doc.key === key);
  if (index >= 0) documents[index] = saved;
  else documents.push(saved);
  return saved;
}

/** Test helper: the seed as the store starts. */
export function seedPageDocuments(): PageDocument[] {
  return SEED.map((doc) => structuredClone(doc));
}

/** All document keys the store can serve (home included). */
export function contentPageKeys(): PageDocumentKey[] {
  return PAGE_DOCUMENTS.map((def) => def.key);
}
