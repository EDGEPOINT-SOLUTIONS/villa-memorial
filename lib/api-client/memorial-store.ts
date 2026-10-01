/**
 * Durable fixture-mode MEMORIAL CONSENT store — the switch behind
 * `/client/memorials` and the public memorial surface (F-04).
 *
 * WHY A FILE STORE. A family's decision to make a loved one visible is the one
 * record on this surface that MUST survive a restart and MUST be what the next
 * public render reads (web/AGENTS.md, the pricing-store pattern). The store folds
 * an append-only journal onto the recorded seed:
 *
 *   - The seed (`lib/fixtures/memorials/memorials.json`) records the honest
 *     starting state: no consent, every field off, nothing published.
 *   - Each save appends one `consent_saved` event carrying the whole validated
 *     record for ONE person. The journal is rewritten atomically, so a crash or a
 *     concurrent reader never sees a half file; mutations run through one
 *     in-process promise chain, so two Next requests cannot interleave a
 *     read-modify-write.
 *   - Path: `MEMORIAL_STORE_PATH` when set (tests), otherwise
 *     `.data/family-memorials.json` under the app's cwd (gitignored).
 *
 * NOTHING IS PUBLISHED BY DEFAULT: a person with no journal event reads the safe
 * default (switch OFF, every field OFF). The public reader (`lib/api-client/memorials.ts`)
 * is the only consumer that turns a consent into a public shape, and it only ever
 * does so when `visible` is true.
 *
 * This is demo persistence, not a service. No frozen contract names a
 * digital-memorial read or write endpoint (`lib/live-mode.ts` keeps the memorials
 * switch in state "none"), so live mode is impossible by construction.
 */
import {
  createJournalLock,
  journalPath,
  readJournalEvents,
  writeJournalEvents,
} from "@/lib/api-client/journal";
import { ApiError } from "@/lib/api-client/api-error";
import {
  normalizeMemorialConsent,
  type MemorialConsent,
  type MemorialConsentRecord,
} from "@/lib/memorials";
import memorialsFile from "@/lib/fixtures/memorials/memorials.json";

export function memorialStorePath(): string {
  return journalPath("MEMORIAL_STORE_PATH", "family-memorials.json");
}

/* ------------------------------- readers --------------------------------- */

function malformed(what: string): never {
  throw new ApiError(`malformed memorial consent store: ${what}`, 500);
}

function requiredString(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim().length === 0) malformed(what);
  return value.trim();
}

function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean === "" ? null : clean;
}

/**
 * Field-by-field reader for one stored record. The five booleans are read through
 * `normalizeMemorialConsent` (missing → OFF), the person id is required, and the
 * owner/timestamp are optional — a hand-edited store can never invent a published
 * memorial.
 */
function toConsentRecord(raw: unknown): MemorialConsentRecord {
  if (typeof raw !== "object" || raw === null) malformed("record");
  const r = raw as Record<string, unknown>;
  return {
    person_id: requiredString(r.person_id, "person id"),
    owner_user_id: optionalString(r.owner_user_id),
    updated_at: optionalString(r.updated_at),
    ...normalizeMemorialConsent(r),
  };
}

type PersistedEvent = {
  kind: "consent_saved";
  at: string;
  actor: string;
  record: MemorialConsentRecord;
};

function toPersistedEvent(raw: unknown): PersistedEvent {
  if (typeof raw !== "object" || raw === null) malformed("event");
  const r = raw as Record<string, unknown>;
  if (r.kind !== "consent_saved") malformed(`event kind ${String(r.kind)}`);
  return {
    kind: "consent_saved",
    at: requiredString(r.at, "event timestamp"),
    actor: typeof r.actor === "string" ? r.actor : "",
    record: toConsentRecord(r.record),
  };
}

async function readPersistedEvents(): Promise<PersistedEvent[]> {
  const events = await readJournalEvents(memorialStorePath(), "memorial");
  return events.map(toPersistedEvent);
}

const withStoreLock = createJournalLock();

/* ------------------------------- the seed -------------------------------- */

/** The recorded seed's own consents (deliberately none — nothing is published). */
function seedRecords(): MemorialConsentRecord[] {
  const raw = (memorialsFile as { consents?: unknown }).consents;
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) malformed("seed consents");
  return raw.map(toConsentRecord);
}

/* ------------------------------ store API ------------------------------- */

/** One loved one's consent, or null when the family has never saved one. */
export async function getMemorialConsent(personId: string): Promise<MemorialConsentRecord | null> {
  const wanted = personId.trim();
  if (!wanted) return null;
  const records = await readMemorialConsents();
  return records.find((record) => record.person_id === wanted) ?? null;
}

/**
 * Every saved consent, one per person, folded seed-then-journal. The LAST event
 * for a person wins; a person without any record is simply absent (the caller
 * applies the safe default).
 */
export async function readMemorialConsents(): Promise<MemorialConsentRecord[]> {
  const events = await readPersistedEvents();
  const byPerson = new Map<string, MemorialConsentRecord>();
  for (const record of seedRecords()) byPerson.set(record.person_id, record);
  for (const event of events) byPerson.set(event.record.person_id, event.record);
  return [...byPerson.values()];
}

/**
 * Save one loved one's switch and field choices. The caller has already checked
 * that the person belongs to the family household (the route owns that rule);
 * this function owns only the record, the timestamp and the append.
 */
export async function saveMemorialConsent(args: {
  personId: string;
  ownerUserId: string | null;
  consent: MemorialConsent;
  actor: string;
  now?: Date;
}): Promise<MemorialConsentRecord> {
  const personId = args.personId.trim();
  if (!personId) throw new ApiError("a memorial needs a person", 422);
  const consent = normalizeMemorialConsent(args.consent);
  const now = args.now ?? new Date();
  return withStoreLock(async () => {
    const events = await readPersistedEvents();
    const record: MemorialConsentRecord = {
      person_id: personId,
      owner_user_id: args.ownerUserId?.trim() || null,
      updated_at: now.toISOString(),
      ...consent,
    };
    await writeJournalEvents(memorialStorePath(), "memorial", [
      ...events,
      { kind: "consent_saved", at: record.updated_at!, actor: args.actor, record },
    ]);
    return record;
  });
}
