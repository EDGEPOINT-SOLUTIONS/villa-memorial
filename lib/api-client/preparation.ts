/**
 * Typed data access for the embalming / preparation record (Module H, crm-cases.md §12).
 *
 * ⚠ PROVISIONAL SHAPE — flagged loudly per web/AGENTS.md. NO preparation contract
 * exists: funeral-cases is unbuilt and the frozen `case-events-v1` (KEB-D3-02) names no
 * embalming/preparation endpoint, so this reader serves the recorded demo records in
 * `lib/fixtures/operations/preparation-records.json` and never claims a live mode. The
 * record's fields follow the blueprint's own module list — embalmer assignment ·
 * schedule · embalming record · dressing · cosmetics · completion checklist · staff
 * notes; statuses scheduled / in progress / completed / cancelled — which is a DOMAIN
 * VOCABULARY, not a service contract.
 *
 * Live mode (`OPERATIONS_BASE_URL` set): the operations service has nothing to read
 * from, so `getPreparationRecord` answers 503 with `PREPARATION_NOT_WIRED` rather than
 * inventing an endpoint. The screen renders that as an honest state; this is not a stub
 * behind a flag that something else flips on.
 *
 * Tolerant reader (`toPreparationRecord`): the recorded JSON is validated field by
 * field, extra fields are ignored, and a malformed record is a 502 — never a cast. One
 * invariant is deliberate and loud: work is only ever `completed` with the instant it
 * was recorded, so nothing the office did not confirm can read as done.
 */
import preparationFile from "@/lib/fixtures/operations/preparation-records.json";
import { ApiError } from "@/lib/api-client/api-error";
import { operationsLiveModeEnabled } from "@/lib/api-client/operations";

export const PREPARATION_NOT_WIRED =
  "no preparation record contract is frozen: the operations service names no embalming/" +
  "preparation endpoint, so this screen can only read the recorded demo records";

/** The four steps, in the order the work happens (blueprint §12). */
export const PREPARATION_STEP_KEYS = ["embalming", "dressing", "cosmetics", "casketing"] as const;
export type PreparationStepKey = (typeof PREPARATION_STEP_KEYS)[number];

/** The module's own statuses (blueprint §12). */
export const PREPARATION_STATES = ["scheduled", "in_progress", "completed", "cancelled"] as const;
export type PreparationState = (typeof PREPARATION_STATES)[number];

export type PreparationStep = {
  key: PreparationStepKey;
  state: PreparationState;
  /** The instant the step was recorded done — non-null exactly when `state` is completed. */
  at: string | null;
  /** The step's own note, when the record carries one. */
  note: string | null;
};

export type PreparationRecord = {
  case_number: string;
  state: PreparationState;
  /** When the preparation room was booked, an instant. */
  scheduled_for: string | null;
  /** Who did the work — the embalmer, plus an assistant when one is recorded. */
  embalmer: string;
  assistant: string | null;
  started_at: string | null;
  completed_at: string | null;
  steps: PreparationStep[];
  notes: string | null;
};

type PreparationStore = { tenant_id: string; records: unknown[] };

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function stateOf(value: unknown): PreparationState | null {
  return typeof value === "string" && (PREPARATION_STATES as readonly string[]).includes(value)
    ? (value as PreparationState)
    : null;
}

function stepKeyOf(value: unknown): PreparationStepKey | null {
  return typeof value === "string" && (PREPARATION_STEP_KEYS as readonly string[]).includes(value)
    ? (value as PreparationStepKey)
    : null;
}

/** An unusable timestamp reads as absent — the screen then says "not recorded". */
function instantOf(value: unknown): string | null {
  if (typeof value !== "string" || value === "") return null;
  return Number.isNaN(new Date(value).getTime()) ? null : value;
}

function toPreparationStep(raw: unknown): PreparationStep | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const key = stepKeyOf(r.key);
  const state = stateOf(r.state);
  if (!key || !state) return null;
  const at = instantOf(r.at);
  // The honest-state invariant: completed work carries a recorded instant.
  if (state === "completed" && !at) {
    throw new ApiError("malformed preparation record: completed step without a recorded time", 502);
  }
  return { key, state, at: state === "completed" ? at : null, note: text(r.note) };
}

/** Tolerant reader: extra upstream fields are ignored; a malformed record is a 502. */
export function toPreparationRecord(raw: unknown): PreparationRecord {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed preparation record", 502);
  }
  const r = raw as Record<string, unknown>;
  const caseNumber = text(r.case_number);
  const state = stateOf(r.state);
  const embalmer = text(r.embalmer);
  if (!caseNumber || !state || !embalmer) {
    throw new ApiError("malformed preparation record", 502);
  }
  const steps = (Array.isArray(r.steps) ? r.steps : [])
    .map(toPreparationStep)
    .filter((step): step is PreparationStep => step !== null);
  const completedAt = instantOf(r.completed_at);
  // A completed record must name the instant the work finished.
  if (state === "completed" && !completedAt) {
    throw new ApiError("malformed preparation record: completed without a recorded time", 502);
  }
  return {
    case_number: caseNumber,
    state,
    scheduled_for: instantOf(r.scheduled_for),
    embalmer,
    assistant: text(r.assistant),
    started_at: instantOf(r.started_at),
    completed_at: completedAt,
    steps,
    notes: text(r.notes),
  };
}

/**
 * The preparation record for one case, or `null` when the case has none on file.
 * Addressed by `case_number` (the case records' own key, as every other fixture
 * cross-reference uses). Live mode has nothing to read: 503.
 */
export async function getPreparationRecord(caseNumber: string): Promise<PreparationRecord | null> {
  if (operationsLiveModeEnabled()) {
    throw new ApiError(PREPARATION_NOT_WIRED, 503);
  }
  const store = preparationFile as unknown as PreparationStore;
  const raw = (Array.isArray(store.records) ? store.records : []).find(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      (entry as Record<string, unknown>).case_number === caseNumber,
  );
  return raw ? toPreparationRecord(raw) : null;
}

/**
 * Every recorded preparation record, in the store's own order. This is the read
 * the staff Preparation list uses; it is the same tolerant reader as the per-case
 * screen and the same PROVISIONAL fixture, and live mode answers 503 for the same
 * reason (no preparation contract is frozen).
 */
export async function listPreparationRecords(): Promise<PreparationRecord[]> {
  if (operationsLiveModeEnabled()) {
    throw new ApiError(PREPARATION_NOT_WIRED, 503);
  }
  const store = preparationFile as unknown as PreparationStore;
  return (Array.isArray(store.records) ? store.records : []).map(toPreparationRecord);
}
