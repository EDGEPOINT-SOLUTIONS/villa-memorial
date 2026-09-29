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
 * THE STORE IS DURABLE (2026-09-27)
 * It used to keep the edited documents on `globalThis` with no file behind them, so a
 * staff edit survived only until the server process restarted, and in a multi-instance
 * or serverless deployment it was visible only to the instance that handled the save.
 * That is the exact failure mode "how every page can be edited" cannot have. Each save
 * now APPENDS one event to a journal on disk and every read folds it — the mechanics are
 * the shared `lib/api-client/journal.ts`, the same pattern as every commerce and ops
 * store. Path: `CONTENT_PAGES_STORE_PATH` when set (tests redirect it), otherwise
 * `.data/content-pages.json` under the app's cwd.
 *
 * No upstream content service exists — the platform has no content/CMS contract — so
 * this is an app-authored CMS seam exactly like landing content; the write path is
 * /api/content/pages (gated `catalog:write`, provisionally, like the landing route).
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
import {
  createJournalLock,
  journalPath,
  readJournalEvents,
  writeJournalEvents,
} from "@/lib/api-client/journal";
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

type PageEvent = { kind: "page_saved"; at: string; document: PageDocument };

export function contentPagesStorePath(): string {
  return journalPath("CONTENT_PAGES_STORE_PATH", "content-pages.json");
}

const withContentPagesLock = createJournalLock();

function toPageEvent(raw: unknown): PageEvent {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed page-documents store: event", 500);
  }
  const event = raw as Record<string, unknown>;
  if (event.kind !== "page_saved") {
    throw new ApiError(`malformed page-documents store: event kind ${String(event.kind)}`, 500);
  }
  if (typeof event.at !== "string") {
    throw new ApiError("malformed page-documents store: event timestamp", 500);
  }
  // The saved document goes through the SAME reader the seed does, so a hand-edited
  // journal cannot inject a block shape the page would then render.
  return { kind: "page_saved", at: event.at, document: readPageDocument(event.document) };
}

/**
 * The four stored documents as the journal leaves them: the recorded seed, with every
 * later save folded over its own key. A save REPLACES a document; it never accumulates a
 * second copy of the same page.
 */
async function stored(): Promise<PageDocument[]> {
  const events = (await readJournalEvents(contentPagesStorePath(), "page documents")).map(toPageEvent);
  const byKey = new Map(SEED.map((doc) => [doc.key, structuredClone(doc)]));
  for (const event of events) byKey.set(event.document.key, event.document);
  return [...byKey.values()];
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
    blog: null,
    updated_at: landing.updated_at,
    updated_by: null,
  };
}

/** Every document for the Pages & content index, in the captain's order. */
export async function listPageDocuments(): Promise<PageDocument[]> {
  const [home, storedDocs] = await Promise.all([
    homeDocument(),
    stored().then((docs) =>
      PAGE_DOCUMENTS.filter((def) => def.key !== "home").map((def) => {
        const found = docs.find((doc) => doc.key === def.key);
        return found ?? readPageDocument({ key: def.key, title: def.label });
      }),
    ),
  ]);
  return [home, ...storedDocs];
}

/** One document by key; null when the key names none of the five pages. */
export async function getPageDocument(key: string): Promise<PageDocument | null> {
  if (key === "home") return homeDocument();
  const docs = await stored();
  return docs.find((doc) => doc.key === key) ?? null;
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
 *
 * The append runs under the store's lock, so two saves at once cannot interleave a
 * read-modify-write and lose one of them.
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
  return withContentPagesLock(async () => {
    const store = contentPagesStorePath();
    const events = await readJournalEvents(store, "page documents");
    const at = saved.updated_at ?? new Date().toISOString();
    await writeJournalEvents(store, "page documents", [
      ...events,
      { kind: "page_saved", at, document: saved } satisfies PageEvent,
    ]);
    return structuredClone(saved);
  });
}

/** Test helper: the seed as the store starts. */
export function seedPageDocuments(): PageDocument[] {
  return SEED.map((doc) => structuredClone(doc));
}

/** All document keys the store can serve (home included). */
export function contentPageKeys(): PageDocumentKey[] {
  return PAGE_DOCUMENTS.map((def) => def.key);
}
