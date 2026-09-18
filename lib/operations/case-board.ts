/**
 * The ops board's vocabulary and rules — PURE, client + server.
 *
 * Why it exists beside `lib/api-client/operations.ts`: the board's mutations run in
 * client components, which must never import the api-client (it reads the session
 * cookie via `next/headers`). So the frozen enum members, their labels, the stage
 * order and the contract's per-stage task template live here, and the api-client
 * re-exports the types so every existing import keeps working.
 *
 * Authority: `docs/08-delivery/contracts/case-events-v1.md` (KEB-D3-02, FROZEN) —
 * §Stage model (ordered, forward moves to any later stage, backward moves allowed and
 * audited) and §Task templates per stage (advancing appends that stage's tasks if they
 * are not already present — idempotent). Nothing here invents a rule the contract does
 * not state; the service stays the only authority on whether a move is legal.
 */

export const CASE_STAGES = [
  "inquiry",
  "retrieval",
  "preparation",
  "viewing",
  "ceremony",
  "interment",
  "completed",
] as const;

export type CaseStage = (typeof CASE_STAGES)[number];

export const CASE_TASK_STATUSES = ["pending", "in_progress", "done"] as const;

export type CaseTaskStatus = (typeof CASE_TASK_STATUSES)[number];

/** One task row. `id` is the contract's `tasks[].id` — required to PATCH a single task. */
export type CaseTask = {
  id: string;
  title: string;
  status: CaseTaskStatus;
};

export const STAGE_LABEL: Record<CaseStage, string> = {
  inquiry: "Inquiry",
  retrieval: "Retrieval",
  preparation: "Preparation",
  viewing: "Viewing",
  ceremony: "Ceremony",
  interment: "Interment",
  completed: "Completed",
};

/** Badge tone per stage — the board's status palette. */
export const STAGE_TONE: Record<CaseStage, "info" | "warning" | "success" | "neutral"> = {
  inquiry: "info",
  retrieval: "warning",
  preparation: "warning",
  viewing: "info",
  ceremony: "info",
  interment: "warning",
  completed: "success",
};

export const TASK_STATUS_LABEL: Record<CaseTaskStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
};

export const TASK_STATUS_TONE: Record<CaseTaskStatus, "success" | "warning" | "neutral"> = {
  pending: "neutral",
  in_progress: "warning",
  done: "success",
};

/**
 * The per-stage task template the service seeds on a stage move (contract
 * §Task templates per stage). Fixture mode mirrors it so the demo exercises the
 * same behaviour; live mode never reads it — funeral-cases owns the append.
 */
export const STAGE_TASK_TEMPLATE: Record<CaseStage, string[]> = {
  inquiry: ["Confirm family contact details", "Record deceased details"],
  retrieval: ["Dispatch retrieval team", "Confirm location details"],
  preparation: ["Confirm embalming completion", "Prepare preparation room"],
  viewing: ["Set up viewing room", "Coordinate family arrival"],
  ceremony: ["Prepare ceremony program", "Confirm officiant"],
  interment: ["Confirm lot readiness", "Schedule interment crew"],
  completed: ["Return documents to family"],
};

export function isCaseStage(value: unknown): value is CaseStage {
  return typeof value === "string" && (CASE_STAGES as readonly string[]).includes(value);
}

export function isCaseTaskStatus(value: unknown): value is CaseTaskStatus {
  return typeof value === "string" && (CASE_TASK_STATUSES as readonly string[]).includes(value);
}

export function stageLabel(stage: string): string {
  return isCaseStage(stage) ? STAGE_LABEL[stage] : stage;
}

export function stageIndex(stage: CaseStage): number {
  return CASE_STAGES.indexOf(stage);
}

/**
 * The next stage forward, or null when the case is already `completed`.
 * Skipping is allowed by the contract, so callers may target any other stage —
 * this is only the board's default suggestion.
 */
export function nextStage(stage: CaseStage): CaseStage | null {
  const next = CASE_STAGES[stageIndex(stage) + 1];
  return next ?? null;
}

/** Tasks a move to `stage` still has to add — the titles in the template that are absent. */
export function stageTaskTitlesToAdd(stage: CaseStage, existing: CaseTask[]): string[] {
  const present = new Set(existing.map((task) => task.title));
  return STAGE_TASK_TEMPLATE[stage].filter((title) => !present.has(title));
}
