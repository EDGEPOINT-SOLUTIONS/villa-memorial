/**
 * Durable fixture-mode store for the burial calendar — the office's recorded sheet PLUS
 * what staff have scheduled or moved since.
 *
 * WHY A FILE STORE, AND WHY NOW
 * The client's minute (2026-09-21, item 2) says "record and manage burial schedules", and the
 * audit found the verb missing: a real month grid existed over a recorded sheet, but there was
 * no write path at all and the light pickup's `scheduled → in_progress → done` lifecycle had no
 * transition surface. This store is that write path for fixture mode.
 *
 * THE PATTERN IS THE REPO'S: the shared mechanics live in `lib/api-client/journal.ts`
 * (`journalPath` / `readJournalEvents` / `writeJournalEvents` / `createJournalLock`), the same
 * module Phase 2 introduced for page editing. This store owns only its record shape and its
 * events — the part that must not be generalised.
 *   - append-only events, folded oldest-first on every read;
 *   - `BURIALS_STORE_PATH` when set (tests redirect it), else `.data/scheduling-burials.json`;
 *   - one in-process writer, atomic temp-file + fsync + `rename(2)`.
 *
 * WHAT IS RECORDED
 *   `burial_scheduled` — one new burial, appended; `pickup_updated` — the light pickup on an
 *   existing burial set or moved. Nothing is ever deleted or rewritten: the seed stays the
 *   recorded sheet and the journal is the office's changes on top, exactly as the counter and
 *   the catalogue stores do it.
 *
 * LIVE MODE REFUSES. No contract names a burial-schedule or light-pickup record, so when
 * `SCHEDULING_BASE_URL` selects live mode every write answers 503 with
 * `BURIAL_SCHEDULE_NOT_WIRED` rather than filing a burial into a local file.
 */
import { ApiError } from "@/lib/api-client/api-error";
import { schedulingLiveModeEnabled } from "@/lib/api-client/scheduling";
import {
  createJournalLock,
  journalPath,
  readJournalEvents,
  writeJournalEvents,
} from "@/lib/api-client/journal";
import burialsFile from "@/lib/fixtures/scheduling/burials.json";
import { toBurialEntry, toLightPickup } from "@/lib/burial-records";
import type { BurialEntry, LightPickup } from "@/lib/burial-calendar";
import type { BurialDraft } from "@/lib/burial-admin";

const LABEL = "burials";

type PersistedEvent =
  | { kind: "burial_scheduled"; at: string; burial: BurialEntry }
  | { kind: "pickup_updated"; at: string; burial_id: string; pickup: LightPickup };

const lock = createJournalLock();

export function burialsStorePath(): string {
  return journalPath("BURIALS_STORE_PATH", "scheduling-burials.json");
}

function assertFixtureMode(): void {
  if (schedulingLiveModeEnabled()) {
    throw new ApiError(
      "live burial scheduling is not wired: no contract names a burial-schedule or " +
        "light-pickup record",
      503,
    );
  }
}

function malformed(what: string): never {
  throw new ApiError(`malformed burial store: ${what}`, 500);
}

function requiredString(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim() === "") malformed(what);
  return value;
}

/** Field-by-field reader for one persisted event; extra keys are ignored. */
function toPersistedEvent(raw: unknown): PersistedEvent {
  if (typeof raw !== "object" || raw === null) malformed("store event");
  const r = raw as Record<string, unknown>;
  const at = requiredString(r.at, "event timestamp");
  if (r.kind === "burial_scheduled") {
    return { kind: "burial_scheduled", at, burial: toBurialEntry(r.burial) };
  }
  if (r.kind === "pickup_updated") {
    return {
      kind: "pickup_updated",
      at,
      burial_id: requiredString(r.burial_id, "pickup burial id"),
      pickup: toLightPickup(r.pickup),
    };
  }
  malformed(`store event kind ${String(r.kind)}`);
}

/* ------------------------------ the seed -------------------------------- */

/** The recorded sheet's burials — the base every read folds the journal onto. */
export function seedBurials(): BurialEntry[] {
  return (burialsFile.burials as unknown[]).map((row) => toBurialEntry(row));
}

/* ------------------------------ readers --------------------------------- */

/**
 * The office's burials: the recorded seed, with every journal event folded in.
 * A pickup update for an id the seed does not carry (a removed/corrupt row) is ignored
 * rather than inventing a burial.
 */
export async function listStoredBurials(): Promise<BurialEntry[]> {
  const seed = seedBurials();
  const byId = new Map(seed.map((entry) => [entry.id, entry]));
  const order = seed.map((entry) => entry.id);

  for (const event of await readPersistedEvents()) {
    if (event.kind === "burial_scheduled") {
      if (!byId.has(event.burial.id)) order.push(event.burial.id);
      byId.set(event.burial.id, event.burial);
    } else {
      const existing = byId.get(event.burial_id);
      if (existing) byId.set(event.burial_id, { ...existing, light_pickup: event.pickup });
    }
  }

  return order
    .map((id) => byId.get(id))
    .filter((entry): entry is BurialEntry => entry !== undefined)
    .map((entry) => structuredClone(entry));
}

async function readPersistedEvents(): Promise<PersistedEvent[]> {
  const events = await readJournalEvents(burialsStorePath(), LABEL);
  return events.map(toPersistedEvent);
}

/* ------------------------------ the writes ------------------------------- */

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

/** The next `bur-<year>-<NNNN>-<slug>` above every id the seed and journal carry. */
function nextBurialId(existing: readonly BurialEntry[], year: number, name: string): string {
  const prefix = `bur-${year}-`;
  let highest = 0;
  for (const entry of existing) {
    if (!entry.id.startsWith(prefix)) continue;
    const match = /^bur-\d{4}-(\d+)/.exec(entry.id);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  const n = String(highest + 1).padStart(4, "0");
  const tail = slug(name);
  return tail ? `${prefix}${n}-${tail}` : `${prefix}${n}`;
}

/**
 * Records one burial under the store lock. The caller has already validated the draft
 * (`parseBurialDraft` in `lib/burial-admin.ts`), which is the SAME reading the browser runs.
 * The store owns only the id, the timestamp and the one cross-row rule: a case can have only
 * one burial recorded.
 */
export async function scheduleBurial(args: {
  draft: BurialDraft;
  actor: string;
  now?: Date;
}): Promise<BurialEntry> {
  assertFixtureMode();
  const now = args.now ?? new Date();
  return lock(async () => {
    const existing = await listStoredBurials();
    if (existing.some((entry) => entry.case_number === args.draft.case_number)) {
      throw new ApiError(
        `a burial for case ${args.draft.case_number} is already recorded`,
        422,
      );
    }
    const at = now.toISOString();
    const burial: BurialEntry = {
      id: nextBurialId(existing, now.getUTCFullYear(), args.draft.deceased_name),
      date: args.draft.date,
      time: args.draft.time,
      case_number: args.draft.case_number,
      deceased_name: args.draft.deceased_name,
      lot_number: args.draft.lot_number,
      section: args.draft.section,
      coordinator: args.draft.coordinator,
      light_pickup: args.draft.light_pickup
        ? {
            time: args.draft.light_pickup.time,
            crew: args.draft.light_pickup.crew,
            state: "scheduled",
            note: args.draft.light_pickup.note,
          }
        : null,
      note: args.draft.note,
    };
    const events = await readPersistedEvents();
    await writeJournalEvents(burialsStorePath(), LABEL, [
      ...events,
      { kind: "burial_scheduled", at, burial },
    ]);
    return structuredClone(burial);
  });
}

/**
 * Sets or moves one burial's light pickup under the store lock.
 *
 * A burial with NO pickup needs a time and a crew in the update (there is nothing to keep);
 * an existing pickup takes a state move and keeps its time/crew unless the update names new
 * ones. The state is validated by the caller (`parsePickupUpdate`); the store owns only the
 * "there is no pickup to move yet" refusal.
 */
export async function updatePickup(args: {
  burialId: string;
  state: LightPickup["state"];
  time?: string;
  crew?: string;
  note?: string | null;
  actor: string;
  now?: Date;
}): Promise<BurialEntry> {
  assertFixtureMode();
  const now = args.now ?? new Date();
  return lock(async () => {
    const existing = (await listStoredBurials()).find((entry) => entry.id === args.burialId);
    if (!existing) {
      throw new ApiError("no such burial", 404);
    }
    if (existing.light_pickup === null && (!args.time || !args.crew)) {
      throw new ApiError("set the pickup time and crew first", 422);
    }
    const pickup: LightPickup = {
      time: args.time ?? existing.light_pickup?.time ?? "",
      crew: args.crew ?? existing.light_pickup?.crew ?? "",
      state: args.state,
      note: args.note !== undefined ? args.note : (existing.light_pickup?.note ?? null),
    };
    const at = now.toISOString();
    const events = await readPersistedEvents();
    await writeJournalEvents(burialsStorePath(), LABEL, [
      ...events,
      { kind: "pickup_updated", at, burial_id: args.burialId, pickup },
    ]);
    return structuredClone({ ...existing, light_pickup: pickup });
  });
}
