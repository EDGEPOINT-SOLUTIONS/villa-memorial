/**
 * Durable fixture-mode store for the loved ones a family adds to its account.
 *
 * WHY A FILE STORE. The family portal starts CLEAN (captain, 2026-10-02): the
 * demo household is removed, so the account begins with no loved ones and the
 * family adds its own. A person added here must survive a restart and must be
 * what the next read serves (the household reader, the memorial switch, the
 * visit calendar), exactly like the memorial-consent and image stores. This is
 * that place, and it is demo-local by construction — no frozen family API
 * contract names a loved-one write endpoint.
 *
 * THE REPO'S PATTERN, NOT A NEW ONE:
 *   - append-only journal on disk; every read folds it, oldest first;
 *   - the whole journal is rewritten to a temp file, fsync'd, then `rename(2)`d
 *     over the store path, so a crash or a concurrent reader never sees a half
 *     file;
 *   - mutations run through ONE in-process promise chain (`createJournalLock`),
 *     so two additions at once cannot interleave a read-modify-write;
 *   - path: `FAMILY_HOUSEHOLD_STORE_PATH` when set (tests), else
 *     `.data/family-household.json` under the app's cwd (gitignored).
 *
 * WHAT A RECORD IS. Only what the family knows: a name and, optionally, life
 * dates. The plan, balance, papers and lot are the office's records and are
 * absent until a family-facing service carries them, so the added person renders
 * the honest empty states on those screens rather than invented figures.
 */
import { randomUUID } from "node:crypto";
import {
  createJournalLock,
  journalPath,
  readJournalEvents,
  writeJournalEvents,
} from "@/lib/api-client/journal";
import { ApiError } from "@/lib/api-client/api-error";

/** One loved one the family added, as the store persists them. */
export type AddedLovedOne = {
  id: string;
  name: string;
  /** The recorded life-dates display, e.g. “1948 – 2026”; empty when unknown. */
  life_dates: string;
  added_at: string;
};

export function familyHouseholdStorePath(): string {
  return journalPath("FAMILY_HOUSEHOLD_STORE_PATH", "family-household.json");
}

function malformed(what: string): never {
  throw new ApiError(`malformed family household store: ${what}`, 500);
}

function requiredString(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim().length === 0) malformed(what);
  return value.trim();
}

/** Field-by-field reader for one persisted loved one; extra keys are ignored. */
function toAddedLovedOne(raw: unknown): AddedLovedOne {
  if (typeof raw !== "object" || raw === null) malformed("loved one row");
  const r = raw as Record<string, unknown>;
  return {
    id: requiredString(r.id, "loved one id"),
    name: requiredString(r.name, "loved one name"),
    life_dates: typeof r.life_dates === "string" ? r.life_dates : "",
    added_at: requiredString(r.added_at, "loved one added_at"),
  };
}

type PersistedEvent = { kind: "loved_one_added"; at: string; loved_one: AddedLovedOne };

function toPersistedEvent(raw: unknown): PersistedEvent {
  if (typeof raw !== "object" || raw === null) malformed("store event");
  const r = raw as Record<string, unknown>;
  if (r.kind !== "loved_one_added") malformed(`store event kind ${String(r.kind)}`);
  return {
    kind: "loved_one_added",
    at: requiredString(r.at, "event timestamp"),
    loved_one: toAddedLovedOne(r.loved_one),
  };
}

async function readPersistedEvents(): Promise<PersistedEvent[]> {
  const events = await readJournalEvents(familyHouseholdStorePath(), "family household");
  return events.map(toPersistedEvent);
}

const withStoreLock = createJournalLock();

/** Every loved one the family has added, oldest first. */
export async function listAddedLovedOnes(): Promise<AddedLovedOne[]> {
  const events = await readPersistedEvents();
  return events.map((event) => ({ ...event.loved_one }));
}

/**
 * Append one loved one and return them. Serialized with every other write to
 * this store, so two additions cannot interleave. The caller has already
 * validated the submission (`lib/family/loved-one-intake.ts`); this owns the id
 * and the timestamp.
 */
export function addLovedOne(args: {
  name: string;
  life_dates: string;
  now?: Date;
}): Promise<AddedLovedOne> {
  const now = args.now ?? new Date();
  return withStoreLock(async () => {
    const events = await readPersistedEvents();
    const at = now.toISOString();
    const lovedOne: AddedLovedOne = {
      id: `loved-one-${randomUUID()}`,
      name: args.name,
      life_dates: args.life_dates,
      added_at: at,
    };
    await writeJournalEvents(familyHouseholdStorePath(), "family household", [
      ...events,
      { kind: "loved_one_added", at, loved_one: lovedOne },
    ]);
    return { ...lovedOne };
  });
}
