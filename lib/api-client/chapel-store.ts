/**
 * Durable fixture-mode chapel store — the persistence seam behind the staff
 * Schedule's chapel screens and, through it, the customer booking step.
 *
 * WHY A FILE STORE (same reasoning as lib/api-client/order-store.ts)
 * The park's own chapel facts are edits an operator expects to survive a
 * restart: how many chapels exist, what they are called, the class they sell as,
 * whether they are active, their notes, the date ranges the park has closed, and
 * the app-authored confirmation/cancellation record for a booking. They are kept
 * as an append-only event journal on disk:
 *
 *   - The seed (`lib/fixtures/scheduling/chapel-admin.json`) is read-only and
 *     folded with the journal on every read, so updating the seed never has to
 *     migrate old state.
 *   - Each mutation appends one event; the journal is rewritten to a temp file,
 *     fsync'd, then renamed over the store path — a crash can never leave a
 *     half-written file.
 *   - Mutations run through ONE in-process promise chain (no lost update when
 *     two requests interleave a read-modify-write).
 *   - Path: `CHAPEL_STORE_PATH` when set (tests), otherwise
 *     `.data/scheduling-chapel-admin.json` under the app's cwd (gitignored).
 *
 * WHAT IS NOT HERE
 *  · The scheduling records themselves. `blocks` and `booking_states` are
 *    app-authored RECORDS ABOUT a booking (reason, linked order, actor); the
 *    booking stays the frozen booking-events-v1 row in the scheduling fixtures.
 *    Nothing here rewrites the frozen `status` — cancellation goes through the
 *    scheduling cancel endpoint first, then the reason is recorded here.
 *  · Any upstream contract. booking-events-v1 defers resource maintenance
 *    windows and has no resource write endpoint, so live mode refuses these
 *    writes with 503 (lib/api-client/chapel-admin.ts) rather than inventing one.
 */
import {
  createJournalLock,
  journalPath,
  logSkippedJournalEvents,
  readJournalEvents,
  writeJournalEvents,
  type SkippedJournalEvent,
} from "@/lib/api-client/journal";
import { ApiError } from "@/lib/api-client/api-error";
import chapelAdminFile from "@/lib/fixtures/scheduling/chapel-admin.json";
import {
  blockDates,
  type ChapelBlock,
  type ChapelBookingState,
  type ChapelRecord,
} from "@/lib/chapel-admin";

type SeedShape = {
  chapels: unknown[];
  blocks: unknown[];
  booking_states: unknown[];
};

type PersistedEvent =
  | { kind: "chapel_saved"; at: string; chapel: ChapelRecord }
  | { kind: "block_added"; at: string; block: ChapelBlock }
  | { kind: "block_removed"; at: string; id: string }
  | { kind: "booking_state_set"; at: string; state: ChapelBookingState };

export function chapelStorePath(): string {
  return journalPath("CHAPEL_STORE_PATH", "scheduling-chapel-admin.json");
}

/* ------------------------------ readers --------------------------------- */

function malformed(what: string): never {
  throw new ApiError(`malformed chapel fixture: ${what}`, 500);
}

function requiredString(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim().length === 0) malformed(what);
  return value;
}

/** Field-by-field reader for seed rows and journal events; extras are ignored. */
export function toChapelRecord(raw: unknown): ChapelRecord {
  if (typeof raw !== "object" || raw === null) malformed("chapel record");
  const r = raw as Record<string, unknown>;
  const chapelClass = r.chapel_class;
  if (chapelClass !== "common" && chapelClass !== "private") malformed("chapel class");
  const capacity = Number(r.capacity ?? 0);
  if (!Number.isInteger(capacity) || capacity < 0) malformed("chapel capacity");
  if (typeof r.active !== "boolean") malformed("chapel active flag");
  return {
    id: requiredString(r.id, "chapel id"),
    name: requiredString(r.name, "chapel name"),
    chapel_class: chapelClass,
    capacity,
    active: r.active,
    notes: typeof r.notes === "string" ? r.notes : "",
  };
}

export function toChapelBlock(raw: unknown): ChapelBlock {
  if (typeof raw !== "object" || raw === null) malformed("chapel block");
  const r = raw as Record<string, unknown>;
  const block: ChapelBlock = {
    id: requiredString(r.id, "block id"),
    resource_id: requiredString(r.resource_id, "block chapel id"),
    from: requiredString(r.from, "block from date"),
    to: requiredString(r.to, "block to date"),
    reason: requiredString(r.reason, "block reason"),
    created_by: typeof r.created_by === "string" ? r.created_by : "Staff",
    created_at: requiredString(r.created_at, "block timestamp"),
  };
  if (blockDates(block.from, block.to).length === 0) malformed("block range");
  return block;
}

export function toChapelBookingState(raw: unknown): ChapelBookingState {
  if (typeof raw !== "object" || raw === null) malformed("booking state");
  const r = raw as Record<string, unknown>;
  if (r.status !== "confirmed" && r.status !== "cancelled") malformed("booking state status");
  const state: ChapelBookingState = {
    booking_id: requiredString(r.booking_id, "booking state booking id"),
    status: r.status,
    by: typeof r.by === "string" && r.by.trim() ? r.by : "Staff",
    at: requiredString(r.at, "booking state timestamp"),
  };
  if (typeof r.reason === "string" && r.reason.trim()) state.reason = r.reason.trim();
  if (r.status === "cancelled" && !state.reason) malformed("cancelled booking state reason");
  if (typeof r.order_number === "string" && r.order_number.trim()) {
    state.order_number = r.order_number.trim();
  }
  return state;
}

function toPersistedEvent(raw: unknown): PersistedEvent {
  if (typeof raw !== "object" || raw === null) malformed("store event");
  const r = raw as Record<string, unknown>;
  switch (r.kind) {
    case "chapel_saved":
      return { kind: "chapel_saved", at: requiredString(r.at, "event timestamp"), chapel: toChapelRecord(r.chapel) };
    case "block_added":
      return { kind: "block_added", at: requiredString(r.at, "event timestamp"), block: toChapelBlock(r.block) };
    case "block_removed":
      return { kind: "block_removed", at: requiredString(r.at, "event timestamp"), id: requiredString(r.id, "block id") };
    case "booking_state_set":
      return {
        kind: "booking_state_set",
        at: requiredString(r.at, "event timestamp"),
        state: toChapelBookingState(r.state),
      };
    default:
      malformed(`store event kind ${String(r.kind)}`);
  }
}

async function readPersistedEvents(): Promise<PersistedEvent[]> {
  const events = await readJournalEvents(chapelStorePath(), "chapel");
  return events.map(toPersistedEvent);
}

function persistEvents(events: PersistedEvent[]): Promise<void> {
  return writeJournalEvents(chapelStorePath(), "chapel", events);
}

const withStoreLock = createJournalLock();

/* ------------------------------ store API ------------------------------- */

export type ChapelAdminState = {
  chapels: ChapelRecord[];
  blocks: ChapelBlock[];
  /** Keyed by scheduling booking id. */
  bookingStates: Map<string, ChapelBookingState>;
  /**
   * Orphan events the fold skipped — a removal naming a block that is not there. Named
   * on the server log; here for a developer who reads the count.
   */
  skipped: SkippedJournalEvent[];
};

/**
 * Seed + journal folded into the current chapel administration state.
 *
 * A `block_removed` naming a block the fold does not carry is an ORPHAN (a write cut off,
 * or a seed that outlived its journal): it is skipped, named on the server log and counted
 * rather than killing every chapel read. Added/saved rows are upserts and cannot orphan.
 */
export async function loadChapelAdminState(): Promise<ChapelAdminState> {
  const seed = chapelAdminFile as unknown as SeedShape;
  const chapels = new Map<string, ChapelRecord>();
  for (const row of seed.chapels) {
    const record = toChapelRecord(row);
    chapels.set(record.id, record);
  }
  const blocks = new Map<string, ChapelBlock>();
  for (const row of seed.blocks) {
    const block = toChapelBlock(row);
    blocks.set(block.id, block);
  }
  const bookingStates = new Map<string, ChapelBookingState>();
  for (const row of seed.booking_states) {
    const state = toChapelBookingState(row);
    bookingStates.set(state.booking_id, state);
  }

  const skipped: SkippedJournalEvent[] = [];
  for (const event of await readPersistedEvents()) {
    switch (event.kind) {
      case "chapel_saved":
        chapels.set(event.chapel.id, event.chapel);
        break;
      case "block_added":
        blocks.set(event.block.id, event.block);
        break;
      case "block_removed":
        if (!blocks.delete(event.id)) {
          // Seed and store drifted: skip the removal, keep every other block.
          skipped.push({ kind: event.kind, at: event.at, parent: "block_id", reference: event.id });
        }
        break;
      case "booking_state_set":
        bookingStates.set(event.state.booking_id, event.state);
        break;
    }
  }

  if (skipped.length > 0) logSkippedJournalEvents("chapel", skipped);
  return { chapels: [...chapels.values()], blocks: [...blocks.values()], bookingStates, skipped };
}

/** Just the chapel records (the customer schedule's class/active filter). */
export async function listChapelRecords(): Promise<ChapelRecord[]> {
  return (await loadChapelAdminState()).chapels;
}

/** The per-date blocks the availability rule reads (expanded from the ranges). */
export async function listChapelBlocks(): Promise<ChapelBlock[]> {
  return (await loadChapelAdminState()).blocks;
}

/**
 * Insert or replace one chapel record under the store lock (the caller — the
 * orchestration layer — has already validated the draft and checked for a
 * duplicate name).
 */
export function saveChapelRecord(record: ChapelRecord, at = new Date().toISOString()): Promise<ChapelRecord> {
  return withStoreLock(async () => {
    const events = await readPersistedEvents();
    await persistEvents([...events, { kind: "chapel_saved", at, chapel: record }]);
    return record;
  });
}

export function addChapelBlockRecord(block: ChapelBlock): Promise<ChapelBlock> {
  return withStoreLock(async () => {
    const events = await readPersistedEvents();
    await persistEvents([...events, { kind: "block_added", at: block.created_at, block }]);
    return block;
  });
}

/** Remove one closure. Unknown ids are a 404 — unblocking twice is not silently ignored. */
export function removeChapelBlockRecord(id: string, at = new Date().toISOString()): Promise<void> {
  return withStoreLock(async () => {
    const state = await loadChapelAdminState();
    if (!state.blocks.some((block) => block.id === id)) {
      throw new ApiError("not_found", 404);
    }
    const events = await readPersistedEvents();
    await persistEvents([...events, { kind: "block_removed", at, id }]);
  });
}

export function setChapelBookingStateRecord(state: ChapelBookingState): Promise<ChapelBookingState> {
  return withStoreLock(async () => {
    const events = await readPersistedEvents();
    await persistEvents([...events, { kind: "booking_state_set", at: state.at, state }]);
    return state;
  });
}
