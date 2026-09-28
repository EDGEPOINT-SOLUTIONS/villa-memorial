/**
 * Durable fixture-mode case store — the persistence seam behind the ops board
 * (`lib/api-client/operations.ts`) when `OPERATIONS_BASE_URL` is unset.
 *
 * WHY A FILE STORE (same reasoning as lib/api-client/order-store.ts and chapel-store.ts)
 * The two board writes are real operational facts — "this task is done", "this
 * case moved to preparation" — and staff expect them to survive a restart while the
 * demo runs without the platform. They are kept as an append-only event journal:
 *
 *   - The recorded seed (`lib/fixtures/operations/cases.json`) is read-only and folded
 *     with the journal on every read, so updating the seed never migrates old state.
 *   - Each mutation appends one event; the journal is rewritten to a temp file, fsync'd,
 *     then renamed over the store path — a crash cannot leave a half-written file.
 *   - Mutations run through ONE in-process promise chain, so a read-modify-write is
 *     never interleaved by another request in this server process.
 *   - Path: `OPERATIONS_STORE_PATH` when set (tests), otherwise
 *     `.data/operations-cases.json` under the app's cwd (gitignored).
 *
 * WHAT IS NOT HERE
 *  · Case creation and intake capture. Those write `deceased_name`/`assigned_coordinator`
 *    and the intake block, they are not the board's two actions, and their fixture path
 *    still answers 503 (`lib/api-client/operations.ts`). Adding them here would widen
 *    this change without a screen that needs it.
 *  · Any upstream contract. The frozen `case-events-v1` names both endpoints, so live
 *    mode calls the real ones — this store is never consulted when `OPERATIONS_BASE_URL`
 *    is set.
 *  · The service's own rules. The stage template mirror lives in
 *    `lib/operations/case-board.ts` next to the rest of the frozen vocabulary.
 */
import {
  createJournalLock,
  journalPath,
  readJournalEvents,
  writeJournalEvents,
} from "@/lib/api-client/journal";
import { ApiError } from "@/lib/api-client/api-error";
import casesFile from "@/lib/fixtures/operations/cases.json";
import {
  isCaseStage,
  isCaseTaskStatus,
  stageTaskTitlesToAdd,
  type CaseTask,
  type CaseTaskStatus,
  type CaseStage,
} from "@/lib/operations/case-board";

/** The case record as the seed and the journal carry it (the api-client adds `intake`). */
export type StoredCase = {
  id: string;
  case_number: string;
  deceased_name: string;
  stage: CaseStage;
  assigned_coordinator: string;
  linked_order_number: string | null;
  services: string[];
  created_at: string;
  updated_at: string;
  tasks: CaseTask[];
  /**
   * The counter's intake block, carried verbatim and NOT interpreted here: nothing in
   * this store writes intake (see WHAT IS NOT HERE above), and `lib/api-client/operations.ts`
   * is where it is read field by field into the typed `CaseIntake`.
   */
  intake: unknown;
};

type SeedStore = { tenant_id: string; cases: unknown[] };

type PersistedEvent =
  | {
      kind: "task_status_set";
      at: string;
      case_number: string;
      task_id: string;
      status: CaseTaskStatus;
    }
  | { kind: "stage_set"; at: string; case_number: string; stage: CaseStage; tasks: CaseTask[] };

export function operationsStorePath(): string {
  return journalPath("OPERATIONS_STORE_PATH", "operations-cases.json");
}

/* ------------------------------ readers --------------------------------- */

function malformed(what: string): never {
  throw new ApiError(`malformed case fixture: ${what}`, 500);
}

function requiredString(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim().length === 0) malformed(what);
  return value;
}

/** Field-by-field reader for seed rows and journal payloads; extra fields are ignored. */
export function toStoredCase(raw: unknown): StoredCase {
  if (typeof raw !== "object" || raw === null) malformed("case record");
  const r = raw as Record<string, unknown>;
  const rows = Array.isArray(r.tasks) ? r.tasks : [];
  return {
    id: requiredString(r.id, "case id"),
    case_number: requiredString(r.case_number, "case number"),
    deceased_name: typeof r.deceased_name === "string" ? r.deceased_name : "",
    stage: toStage(r.stage),
    assigned_coordinator: typeof r.assigned_coordinator === "string" ? r.assigned_coordinator : "",
    linked_order_number:
      typeof r.linked_order_number === "string" ? r.linked_order_number : null,
    services: Array.isArray(r.services) ? r.services.map(String) : [],
    created_at: requiredString(r.created_at, "case created_at"),
    updated_at: requiredString(r.updated_at, "case updated_at"),
    tasks: rows.map(toCaseTask),
    intake: r.intake ?? null,
  };
}

/**
 * A task row. `id` is required by the frozen contract because it is what
 * `PATCH /cases/:number/tasks/:id` addresses; a row without one cannot be written
 * and the board renders it read-only rather than inventing an identifier.
 */
export function toCaseTask(raw: unknown): CaseTask {
  if (typeof raw !== "object" || raw === null) malformed("task record");
  const r = raw as Record<string, unknown>;
  return {
    id: typeof r.id === "string" ? r.id : "",
    title: requiredString(r.title, "task title"),
    status: toStatus(r.status),
  };
}

function toStage(value: unknown): CaseStage {
  if (!isCaseStage(value)) malformed(`case stage ${String(value)}`);
  return value;
}

function toStatus(value: unknown): CaseTaskStatus {
  if (!isCaseTaskStatus(value)) malformed(`task status ${String(value)}`);
  return value;
}

function toPersistedEvent(raw: unknown): PersistedEvent {
  if (typeof raw !== "object" || raw === null) malformed("store event");
  const r = raw as Record<string, unknown>;
  const at = requiredString(r.at, "event timestamp");
  const caseNumber = requiredString(r.case_number, "event case number");
  switch (r.kind) {
    case "task_status_set":
      return {
        kind: "task_status_set",
        at,
        case_number: caseNumber,
        task_id: requiredString(r.task_id, "event task id"),
        status: toStatus(r.status),
      };
    case "stage_set": {
      const rows = Array.isArray(r.tasks) ? r.tasks : [];
      return {
        kind: "stage_set",
        at,
        case_number: caseNumber,
        stage: toStage(r.stage),
        tasks: rows.map(toCaseTask),
      };
    }
    default:
      malformed(`store event kind ${String(r.kind)}`);
  }
}

async function readPersistedEvents(): Promise<PersistedEvent[]> {
  const events = await readJournalEvents(operationsStorePath(), "case");
  return events.map(toPersistedEvent);
}

function persistEvents(events: PersistedEvent[]): Promise<void> {
  return writeJournalEvents(operationsStorePath(), "case", events);
}

const withStoreLock = createJournalLock();

/* ------------------------------ store API ------------------------------- */

/** Seed + journal folded into the current case records. */
export async function loadStoredCases(): Promise<StoredCase[]> {
  const seed = casesFile as unknown as SeedStore;
  const cases = seed.cases.map(toStoredCase);

  for (const event of await readPersistedEvents()) {
    const kase = cases.find((c) => c.case_number === event.case_number);
    if (!kase) {
      // A journal that names an unknown case means seed and store drifted.
      throw new ApiError("the case store references an unknown case", 500);
    }
    // The fold's last word on when the record changed, so a reload cannot answer
    // the seed's `updated_at` for a case the board has since moved.
    kase.updated_at = event.at;
    switch (event.kind) {
      case "task_status_set": {
        const task = kase.tasks.find((t) => t.id === event.task_id);
        if (!task) {
          throw new ApiError("the case store references an unknown task", 500);
        }
        task.status = event.status;
        break;
      }
      case "stage_set":
        kase.stage = event.stage;
        // Idempotent, exactly as the contract's template append is: a title already
        // on the case is never duplicated, so a replay cannot double the checklist.
        for (const task of event.tasks) {
          if (!kase.tasks.some((existing) => existing.title === task.title)) {
            kase.tasks.push({ ...task });
          }
        }
        break;
    }
  }

  return cases;
}

function caseByNumber(cases: StoredCase[], caseNumber: string): StoredCase {
  const kase = cases.find((c) => c.case_number === caseNumber);
  if (!kase) {
    throw new ApiError("not_found", 404);
  }
  return kase;
}

/** Next free task id for a case — stable, greppable, and never re-used after an append. */
function nextTaskId(caseNumber: string, tasks: CaseTask[]): string {
  const taken = new Set(tasks.map((task) => task.id));
  for (let n = tasks.length + 1; ; n += 1) {
    const id = `${caseNumber}-t${n}`;
    if (!taken.has(id)) return id;
  }
}

/**
 * Sets one task's status. The task must exist on the case — a stale board PATCHing a
 * task the service no longer has is a 404, not a silent no-op.
 */
export function setCaseTaskStatusRecord(
  caseNumber: string,
  taskId: string,
  status: CaseTaskStatus,
  at = new Date().toISOString(),
): Promise<StoredCase> {
  return withStoreLock(async () => {
    // Defence in depth: the route already rejects these, and a journal entry nobody can
    // read back would poison every later read (the fold validates what it replays).
    if (!isCaseTaskStatus(status)) {
      throw new ApiError("unknown task status", 422);
    }
    const cases = await loadStoredCases();
    const kase = caseByNumber(cases, caseNumber);
    const task = kase.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new ApiError("not_found", 404);
    }
    const events = await readPersistedEvents();
    await persistEvents([
      ...events,
      { kind: "task_status_set", at, case_number: caseNumber, task_id: taskId, status },
    ]);
    task.status = status;
    kase.updated_at = at;
    return kase;
  });
}

/**
 * Moves a case to another stage and appends that stage's tasks. Forward moves to any
 * later stage and backward moves are both allowed (the contract audits the latter);
 * a move to the stage the case is already in is refused rather than journalled as a
 * no-op event — the board never offers it, so this only catches a hand-made request.
 */
export function setCaseStageRecord(
  caseNumber: string,
  stage: CaseStage,
  at = new Date().toISOString(),
): Promise<StoredCase> {
  return withStoreLock(async () => {
    // Same defence as the task write: a stage outside the frozen enum is refused before
    // anything is journalled.
    if (!isCaseStage(stage)) {
      throw new ApiError("unknown case stage", 422);
    }
    const cases = await loadStoredCases();
    const kase = caseByNumber(cases, caseNumber);
    if (kase.stage === stage) {
      throw new ApiError("the case is already at that stage", 422);
    }
    const additions: CaseTask[] = [];
    for (const title of stageTaskTitlesToAdd(stage, kase.tasks)) {
      additions.push({
        id: nextTaskId(caseNumber, [...kase.tasks, ...additions]),
        title,
        status: "pending",
      });
    }
    const events = await readPersistedEvents();
    await persistEvents([
      ...events,
      { kind: "stage_set", at, case_number: caseNumber, stage, tasks: additions },
    ]);
    kase.stage = stage;
    kase.tasks.push(...additions.map((task) => ({ ...task })));
    kase.updated_at = at;
    return kase;
  });
}
