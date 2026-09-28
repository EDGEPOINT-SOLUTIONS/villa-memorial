/**
 * Durable fixture-mode PRICING store — the persistence seam behind
 * `lib/api-client/pricing.ts`, the two staff screens (/staff/plans and
 * /staff/pricing) and every public page that prints a plan rate or a lot price.
 *
 * WHY A FILE STORE (same pattern as the Orders admin phase, order-store.ts)
 * Plan rates and lot prices are the office's published numbers: an edit must
 * survive a dev/prod restart and must be what the NEXT public render prints, not
 * a process-local value. The store folds an append-only journal onto the
 * recorded seed:
 *
 *   - The seed (`lib/fixtures/commerce/pricing.json`) is read-only, recorded
 *     from the client's own 2026 sheets, and validated on load.
 *   - Each save appends one `document_saved` event carrying the whole validated
 *     document. The journal is rewritten to a temp file, fsync'd, then
 *     `rename(2)`d over the store path — an atomic replace, so a crash or a
 *     concurrent reader can never observe a half-written file.
 *   - Mutations run through ONE in-process promise chain, so two Next requests
 *     cannot interleave a read-modify-write. Across processes the write is
 *     last-writer-wins, but the file itself is never corrupt.
 *   - Path: `PRICING_STORE_PATH` when set (tests), otherwise
 *     `.data/commerce-pricing.json` under the app's cwd (gitignored).
 *
 * The `questions` array (the client conflicts) is deliberately NOT in the
 * document: a save can never drop or rewrite a flagged question.
 *
 * This is demo persistence, not a service. No frozen contract names a
 * catalog-pricing read or write endpoint, so live mode keeps the recorded seed
 * for display and refuses admin writes with 503 (lib/api-client/pricing.ts).
 */
import {
  createJournalLock,
  journalPath,
  readJournalEvents,
  writeJournalEvents,
} from "@/lib/api-client/journal";
import { ApiError } from "@/lib/api-client/api-error";
import {
  assertPricingDocument,
  readPricingQuestions,
  type LotCategory,
  type PlanPricing,
  type PricingDocument,
  type PricingQuestion,
} from "@/lib/pricing-model";
import pricingFile from "@/lib/fixtures/commerce/pricing.json";

/* ------------------------------- seed facts ------------------------------- */

type PricingFixture = {
  plans: unknown;
  lotCategories: unknown;
  updated_at?: unknown;
  updated_by?: unknown;
  questions: unknown;
};

const FIXTURE = pricingFile as unknown as PricingFixture;

/** The recorded seed document, structurally read and semantically validated. */
export function seedPricingDocument(): PricingDocument {
  return assertPricingDocument({
    version: 1,
    updated_at: FIXTURE.updated_at,
    updated_by: FIXTURE.updated_by,
    plans: FIXTURE.plans,
    lotCategories: FIXTURE.lotCategories,
  });
}

/** The seed's read-only client questions. Never part of a saved document. */
export function seedPricingQuestions(): PricingQuestion[] {
  try {
    return readPricingQuestions(FIXTURE.questions);
  } catch (err) {
    throw new ApiError(`malformed pricing questions fixture: ${(err as Error).message}`, 500);
  }
}

/* ------------------------------- storage --------------------------------- */

type PersistedEvent = {
  kind: "document_saved";
  at: string;
  actor: string;
  document: PricingDocument;
};

export function pricingStorePath(): string {
  return journalPath("PRICING_STORE_PATH", "commerce-pricing.json");
}

const withStoreLock = createJournalLock();

/* ------------------------------- journal IO ------------------------------- */

function toPersistedEvent(raw: unknown): PersistedEvent {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("the pricing store has an unexpected shape", 500);
  }
  const r = raw as Record<string, unknown>;
  if (r.kind !== "document_saved") {
    throw new ApiError(`the pricing store carries an unknown event kind: ${String(r.kind)}`, 500);
  }
  if (typeof r.at !== "string" || typeof r.actor !== "string") {
    throw new ApiError("the pricing store has an unexpected shape", 500);
  }
  return {
    kind: "document_saved",
    at: r.at,
    actor: r.actor,
    // A journaled document is re-validated field by field, exactly like the seed.
    document: assertPricingDocument(r.document),
  };
}

async function readPersistedEvents(): Promise<PersistedEvent[]> {
  const events = await readJournalEvents(pricingStorePath(), "pricing");
  return events.map(toPersistedEvent);
}

function persistEvents(events: PersistedEvent[]): Promise<void> {
  return writeJournalEvents(pricingStorePath(), "pricing", events);
}

/* ------------------------------- store API -------------------------------- */

/** Seed + journal folded into the current pricing document. */
export async function loadFixturePricingDocument(): Promise<PricingDocument> {
  const events = await readPersistedEvents();
  const last = events[events.length - 1];
  return last ? last.document : seedPricingDocument();
}

/**
 * Merges one validated editable slice onto the current document and persists it.
 * `plans` or `lotCategories` — one at a time, because the two staff screens own
 * one each. The merged document is re-validated before it persists: the
 * untouched slice must still hold, and an invalid combination is refused rather
 * than written (the caller's draft validation turns a bad edit into a 422
 * BEFORE this point; this is the storage-level backstop).
 */
export function saveFixturePlanPricing(
  plans: PlanPricing,
  actor: string,
): Promise<PricingDocument> {
  return mergeAndPersist({ plans }, actor);
}

export function saveFixtureLotPricing(
  lotCategories: LotCategory[],
  actor: string,
): Promise<PricingDocument> {
  return mergeAndPersist({ lotCategories }, actor);
}

function mergeAndPersist(
  slice: { plans?: PlanPricing; lotCategories?: LotCategory[] },
  actor: string,
): Promise<PricingDocument> {
  return withStoreLock(async () => {
    const events = await readPersistedEvents();
    const current = events.length > 0 ? events[events.length - 1].document : seedPricingDocument();
    const saved = assertPricingDocument({
      version: 1,
      updated_at: new Date().toISOString(),
      updated_by: actor.trim() || "Staff",
      plans: slice.plans ?? current.plans,
      lotCategories: slice.lotCategories ?? current.lotCategories,
    });
    await persistEvents([
      ...events,
      { kind: "document_saved", at: saved.updated_at!, actor: saved.updated_by!, document: saved },
    ]);
    return saved;
  });
}
