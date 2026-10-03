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
 * WHAT IS HERE NOW. Opening a case at the counter (`createCaseRecord`) — the captain's
 * follow-up needs an inquiry's "Send to case" to produce a real case, and the counter's
 * own `+ Open a case` form to work in fixture mode, not answer 503. It seats the record
 * at the `inquiry` stage with that stage's task template and no order, which is Villa's
 * real sequence (a death arrives before anything is paid).
 *
 * WHAT IS NOT HERE
 *  · Intake capture on an EXISTING case. That is a PATCH on the case and still waits on
 *    the live service (`lib/api-client/operations.ts`); a case opened here carries the
 *    intake the counter supplied at creation.
 *  · Any upstream contract. The frozen `case-events-v1` names both write endpoints, so
 *    live mode calls the real ones — this store is never consulted when
 *    `OPERATIONS_BASE_URL` is set.
 *  · The service's own rules. The stage template mirror lives in
 *    `lib/operations/case-board.ts` next to the rest of the frozen vocabulary.
 */
import { randomUUID } from "node:crypto";
import {
  createJournalLock,
  journalPath,
  logSkippedJournalEvents,
  readJournalEvents,
  writeJournalEvents,
  type SkippedJournalEvent,
} from "@/lib/api-client/journal";
import { ApiError } from "@/lib/api-client/api-error";
import casesFile from "@/lib/fixtures/operations/cases.json";
import {
  isCaseStage,
  isCaseTaskStatus,
  stageTaskTitlesToAdd,
  STAGE_TASK_TEMPLATE,
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
  /**
   * The enquiry a case was opened from, when it was opened from one (`Send to case`).
   * ADDITIVE and optional: the frozen `Case` shape names no enquiry, so the case screen
   * reads it when present and omits it otherwise — never defaults it.
   */
  inquiry_reference?: string | null;
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
  | { kind: "stage_set"; at: string; case_number: string; stage: CaseStage; tasks: CaseTask[] }
  /**
   * A case opened at the counter (or from an inquiry) in fixture mode. The whole
   * record is journalled — unlike the two writes above it is not a change to a seed
   * row, so there is no seed row to fold it onto.
   */
  | { kind: "case_created"; at: string; case: StoredCase };

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
    ...(typeof r.inquiry_reference === "string" && r.inquiry_reference.trim() !== ""
      ? { inquiry_reference: r.inquiry_reference }
      : {}),
  };
}

/** What the store needs to open a case; the api-client maps its own input onto this. */
export type NewCaseInput = {
  deceased_name?: string;
  assigned_coordinator?: string;
  intake?: unknown;
  inquiry_reference?: string | null;
};

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
  if (r.kind === "case_created") {
    return { kind: "case_created", at, case: toStoredCase(r.case) };
  }
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

/** Seed + journal folded into the current case records, tolerating orphan events. */
export type CaseFold = {
  cases: StoredCase[];
  /**
   * Events skipped because they named a case or task this fold does not have. Every one
   * is also named on the server log (`logSkippedJournalEvents`); the count is here for a
   * developer who reads it. The good records are still returned — that is the point.
   */
  skipped: SkippedJournalEvent[];
};

/**
 * Seed + journal folded into the current case records.
 *
 * An event naming a case (or a task inside one) the fold does not carry is an ORPHAN, not
 * a reason to kill the board: a write interrupted by a full disk, or a seed the journal
 * outlived, leaves one. The fold skips it, keeps every good record, names it on the server
 * log and counts it in `skipped`. The journal itself is never rewritten, so the orphan row
 * survives for diagnosis; a malformed event still refuses loudly in `toPersistedEvent`.
 */
export async function loadStoredCaseFold(): Promise<CaseFold> {
  const seed = casesFile as unknown as SeedStore;
  const cases = seed.cases.map(toStoredCase);
  const skipped: SkippedJournalEvent[] = [];

  for (const event of await readPersistedEvents()) {
    if (event.kind === "case_created") {
      cases.push(structuredClone(event.case));
      continue;
    }
    const kase = cases.find((c) => c.case_number === event.case_number);
    if (!kase) {
      // A journal that names an unknown case: seed and store drifted. Skip the event,
      // keep the cases we do have, and let the caller read the count.
      skipped.push({
        kind: event.kind,
        at: event.at,
        parent: "case_number",
        reference: event.case_number,
      });
      continue;
    }
    switch (event.kind) {
      case "task_status_set": {
        const task = kase.tasks.find((t) => t.id === event.task_id);
        if (!task) {
          // Same tolerance one level down: the case is here, the task is not.
          skipped.push({
            kind: event.kind,
            at: event.at,
            parent: "task_id",
            reference: event.task_id,
          });
          break;
        }
        task.status = event.status;
        // The fold's last word on when the record changed, so a reload cannot answer
        // the seed's `updated_at` for a case the board has since moved.
        kase.updated_at = event.at;
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
        kase.updated_at = event.at;
        break;
    }
  }

  if (skipped.length > 0) logSkippedJournalEvents("case", skipped);
  return { cases, skipped };
}

/** The case records only — the shape every screen and writer consumes. */
export async function loadStoredCases(): Promise<StoredCase[]> {
  return (await loadStoredCaseFold()).cases;
}

function caseByNumber(cases: StoredCase[], caseNumber: string): StoredCase {
  const kase = cases.find((c) => c.case_number === caseNumber);
  if (!kase) {
    throw new ApiError("not_found", 404);
  }
  return kase;
}

/**
 * Opens a case under the store lock. The counter's form and an inquiry's `Send to
 * case` both land here; ownership of the id, the case number and the timestamp is the
 * store's, exactly as `receiveInquiry` owns its own.
 *
 * Seeded at the `inquiry` stage with that stage's task template and no order: the
 * family's death is recorded before anything is paid, which is Villa's real sequence.
 */
export function createCaseRecord(
  input: NewCaseInput,
  at = new Date().toISOString(),
): Promise<StoredCase> {
  return withStoreLock(async () => {
    const cases = await loadStoredCases();
    const caseNumber = nextCaseNumber(cases);
    const kase: StoredCase = {
      id: `case-${randomUUID()}`,
      case_number: caseNumber,
      deceased_name: input.deceased_name?.trim() || "Pending intake",
      stage: "inquiry",
      assigned_coordinator: input.assigned_coordinator?.trim() || "",
      linked_order_number: null,
      services: [],
      created_at: at,
      updated_at: at,
      tasks: STAGE_TASK_TEMPLATE.inquiry.map((title, index) => ({
        id: `${caseNumber}-t${index + 1}`,
        title,
        status: "pending" as const,
      })),
      intake: input.intake ?? null,
      ...(input.inquiry_reference ? { inquiry_reference: input.inquiry_reference } : {}),
    };
    const events = await readPersistedEvents();
    await persistEvents([...events, { kind: "case_created", at, case: kase }]);
    return structuredClone(kase);
  });
}

/** The next free `CASE-<year>-<nnnn>` above every seed and journalled case. */
function nextCaseNumber(cases: ReadonlyArray<StoredCase>): string {
  const year = new Date().getUTCFullYear();
  const prefix = `CASE-${year}-`;
  let highest = 0;
  for (const kase of cases) {
    if (!kase.case_number.startsWith(prefix)) continue;
    const n = Number.parseInt(kase.case_number.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > highest) highest = n;
  }
  return `${prefix}${String(highest + 1).padStart(4, "0")}`;
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
