/**
 * Typed data access for Module H ops board / cases screens (cases, stages, tasks).
 *
 * Contract: docs/08-delivery/contracts/case-events-v1.md (KEB-D3-02, FROZEN).
 * The `Case` type below IS the frozen response shape — funeral-cases ratified it rather
 * than forcing a rewrite here. The service additionally returns `tasks[].id`; this reader
 * ignores it (tolerant reader rule), so the shape stays as the screens expect.
 *
 * Live mode: OPERATIONS_BASE_URL set → requests hit `${OPERATIONS_BASE_URL}/cases/api/v1/...`
 * through the edge gateway, authenticated with the staff session cookie. Unset → recorded
 * fixtures, so the app still demos standalone.
 *
 * Note: a case opened from a paid order shows `deceased_name: "Pending intake"` until staff
 * complete intake — order.fulfilled carries the purchaser, not the deceased. See the
 * contract's Known gap section.
 */
import casesFile from "@/lib/fixtures/operations/cases.json";
import { ApiError } from "@/lib/api-client/api-error";
import {
  loadStoredCases,
  setCaseStageRecord,
  setCaseTaskStatusRecord,
  type StoredCase,
} from "@/lib/api-client/operations-store";
import type { CaseStage, CaseTask, CaseTaskStatus } from "@/lib/operations/case-board";
import {
  getAuthedJson,
  itemsOf,
  patchAuthedJson,
  postAuthedJson,
} from "@/lib/api-client/staff-fetch";

const BASE_URL = process.env.OPERATIONS_BASE_URL ?? "";

export function operationsLiveModeEnabled(): boolean {
  return BASE_URL.length > 0;
}

/** The frozen enums live in the PURE board vocabulary (`lib/operations/case-board`) so
 * client components can read them without touching this cookie-reading module. */
export type { CaseStage, CaseTask, CaseTaskStatus } from "@/lib/operations/case-board";

/**
 * The counter's intake block, as Villa's Service Contract prints it. Additive to the
 * frozen `Case` shape and null until somebody captures it: a case born from
 * `order.fulfilled` carries the purchaser, never the deceased.
 *
 * The client-contact channel fields were extended additively (2026-09-08) to match the
 * paper's client block (gender/civil status/telephone numbers/Facebook/email) — see the
 * additive note in docs/08-delivery/contracts/case-events-v1.md. Consumers that predate
 * them ignore them (tolerant reader), exactly as they already ignore `tasks[].id`.
 */
export type CaseIntake = {
  date_of_death: string | null;
  deceased_date_of_birth: string | null;
  deceased_gender: string | null;
  deceased_civil_status: string | null;
  senior_citizen: boolean;
  client_name: string | null;
  client_gender: string | null;
  client_civil_status: string | null;
  client_address: string | null;
  client_contact: string | null;
  client_facebook: string | null;
  client_email: string | null;
  client_relationship: string | null;
  client_id_presented: string | null;
  client_id_number: string | null;
  co_maker_name: string | null;
  contract_date: string | null;
  completed_at: string | null;
};

export type Case = {
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
  intake: CaseIntake | null;
};

type CaseStore = {
  tenant_id: string;
  cases: Case[];
};

/** Tolerant reader: extra upstream fields are ignored; `tasks[].id` is the contract's
 * task identity and is the key `PATCH …/tasks/:id` addresses. A row without one still
 * renders, but the board shows it read-only rather than inventing an identifier. */
function toCase(raw: unknown): Case {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed case", 502);
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.case_number !== "string") {
    throw new ApiError("malformed case", 502);
  }
  const tasks = Array.isArray(r.tasks) ? r.tasks : [];
  return {
    id: r.id,
    case_number: r.case_number,
    deceased_name: String(r.deceased_name ?? ""),
    stage: r.stage as CaseStage,
    assigned_coordinator: String(r.assigned_coordinator ?? ""),
    linked_order_number:
      typeof r.linked_order_number === "string" ? r.linked_order_number : null,
    services: Array.isArray(r.services) ? r.services.map(String) : [],
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
    tasks: tasks.map((t) => {
      const task = (typeof t === "object" && t !== null ? t : {}) as Record<string, unknown>;
      return {
        id: typeof task.id === "string" ? task.id : "",
        title: String(task.title ?? ""),
        status: task.status as CaseTaskStatus,
      };
    }),
    intake: toIntake(r.intake),
  };
}

/** Absent, null or malformed intake is all the same answer: nobody has captured it. */
function toIntake(raw: unknown): CaseIntake | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const r = raw as Record<string, unknown>;
  const str = (k: string) => (typeof r[k] === "string" && r[k] !== "" ? (r[k] as string) : null);
  return {
    date_of_death: str("date_of_death"),
    deceased_date_of_birth: str("deceased_date_of_birth"),
    deceased_gender: str("deceased_gender"),
    deceased_civil_status: str("deceased_civil_status"),
    senior_citizen: r.senior_citizen === true,
    client_name: str("client_name"),
    client_gender: str("client_gender"),
    client_civil_status: str("client_civil_status"),
    client_address: str("client_address"),
    client_contact: str("client_contact"),
    client_facebook: str("client_facebook"),
    client_email: str("client_email"),
    client_relationship: str("client_relationship"),
    client_id_presented: str("client_id_presented"),
    client_id_number: str("client_id_number"),
    co_maker_name: str("co_maker_name"),
    contract_date: str("contract_date"),
    completed_at: str("completed_at"),
  };
}

/** A stored (fixture) record as the screens see it — same shape, defensive copies. */
function toCaseRecord(stored: StoredCase): Case {
  return {
    id: stored.id,
    case_number: stored.case_number,
    deceased_name: stored.deceased_name,
    stage: stored.stage,
    assigned_coordinator: stored.assigned_coordinator,
    linked_order_number: stored.linked_order_number,
    services: [...stored.services],
    created_at: stored.created_at,
    updated_at: stored.updated_at,
    tasks: stored.tasks.map((t) => ({ ...t })),
    intake: toIntake(stored.intake),
  };
}

/**
 * The write endpoints answer the changed case. The contract pins their REQUEST shape and
 * the event they emit, not a response body — so a payload that is not a whole case (an
 * envelope, a 204-empty) is answered by re-reading the record instead of letting a
 * guessed shape into the screen. `tasks` must be present for the payload to count.
 */
async function caseFromWrite(payload: unknown, caseNumber: string): Promise<Case> {
  const r = (typeof payload === "object" && payload !== null ? payload : {}) as Record<
    string,
    unknown
  >;
  if (typeof r.case_number === "string" && Array.isArray(r.tasks)) {
    return toCase(payload);
  }
  return getCase(caseNumber);
}

export type CaseIntakeInput = Partial<Omit<CaseIntake, "completed_at">> & {
  deceased_name?: string;
  assigned_coordinator?: string;
};

/**
 * Opens a case at the counter, with no order in front of it — Villa's actual sequence,
 * where a family arrives with a death and the contract is written before anything is paid.
 */
export async function createCase(input: CaseIntakeInput): Promise<Case> {
  if (!operationsLiveModeEnabled()) {
    throw new ApiError("operations service not configured", 503);
  }
  return toCase(await postAuthedJson(BASE_URL, "/cases/api/v1/cases", input));
}

/** Completes (or corrects) intake on an existing case, addressed by its capability token. */
export async function updateCaseIntake(
  caseNumber: string,
  input: CaseIntakeInput,
): Promise<Case> {
  if (!operationsLiveModeEnabled()) {
    throw new ApiError("operations service not configured", 503);
  }
  return toCase(
    await patchAuthedJson(
      BASE_URL,
      `/cases/api/v1/cases/${encodeURIComponent(caseNumber)}`,
      input,
    ),
  );
}

/**
 * Moves a case to another stage (`POST /cases/api/v1/cases/:number/stage`) and returns the
 * case the server actually holds. The service appends that stage's task template and the
 * move is audited as `case.stage_changed`; the board deliberately owns no legality rule —
 * forward-to-any-later-stage and audited backward moves are funeral-cases' decisions.
 */
export async function setCaseStage(caseNumber: string, stage: CaseStage): Promise<Case> {
  if (operationsLiveModeEnabled()) {
    const payload = await postAuthedJson(
      BASE_URL,
      `/cases/api/v1/cases/${encodeURIComponent(caseNumber)}/stage`,
      { stage },
    );
    return caseFromWrite(payload, caseNumber);
  }
  return toCaseRecord(await setCaseStageRecord(caseNumber, stage));
}

/**
 * Sets one task's status (`PATCH /cases/api/v1/cases/:number/tasks/:id`) and returns the
 * updated case. The id comes from the case the board rendered — never a title or a row
 * index — so two tasks that share a title can never be confused for one another.
 */
export async function setCaseTaskStatus(
  caseNumber: string,
  taskId: string,
  status: CaseTaskStatus,
): Promise<Case> {
  if (operationsLiveModeEnabled()) {
    const payload = await patchAuthedJson(
      BASE_URL,
      `/cases/api/v1/cases/${encodeURIComponent(caseNumber)}/tasks/${encodeURIComponent(taskId)}`,
      { status },
    );
    return caseFromWrite(payload, caseNumber);
  }
  return toCaseRecord(await setCaseTaskStatusRecord(caseNumber, taskId, status));
}

export async function listCases(): Promise<Case[]> {
  if (operationsLiveModeEnabled()) {
    const payload = await getAuthedJson(BASE_URL, "/cases/api/v1/cases");
    return itemsOf(payload).map(toCase);
  }
  // Fixture mode reads the durable store, so a task tick or a stage move on the board
  // is what the list, the detail screen and the dashboard show next.
  return (await loadStoredCases()).map(toCaseRecord);
}

/**
 * Fetches one case. In fixture mode `id` is the record UUID; live, the service addresses
 * cases by their capability token (`case_number`), so the live branch resolves through the
 * list. A by-id endpoint would need a contract change — the screens only ever pass ids
 * they received from listCases(), so a single extra hop is the honest v1 answer.
 */
export async function getCase(id: string): Promise<Case> {
  if (operationsLiveModeEnabled()) {
    const found = (await listCases()).find((c) => c.id === id || c.case_number === id);
    if (!found) {
      throw new ApiError("not_found", 404);
    }
    return found;
  }
  const store = casesFile as unknown as CaseStore;
  if (!store.cases.some((c) => c.id === id)) {
    throw new ApiError("not_found", 404);
  }
  const stored = (await loadStoredCases()).find((c) => c.id === id);
  if (!stored) {
    throw new ApiError("not_found", 404);
  }
  return toCaseRecord(stored);
}
