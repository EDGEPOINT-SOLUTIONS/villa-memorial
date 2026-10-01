/**
 * Durable fixture-mode store for the agent's own day planner — the demo journal
 * the calendar writes and every agent surface folds.
 *
 * WHY A FILE STORE. The planner is a write the captain asked for (2026-10-02):
 * an agent picks a day and plans what to do on it. That plan has to survive a
 * restart and reach every surface that reads the day — the calendar, the day
 * detail and the sign-in notice. This is that place, and it is DEMO-LOCAL by
 * construction: a local journal folded onto the recorded fixture, never a claim
 * of a live scheduling contract.
 *
 * THE REPO'S PATTERN, NOT A NEW ONE. Identical in shape to `agent-store.ts` (the
 * pipeline journal) and `inquiry-store.ts`:
 *   - append-only journal on disk; every read folds it, oldest first;
 *   - the whole journal is rewritten to a temp file, fsync'd, then `rename(2)`d
 *     over the store path, so a crash or a concurrent reader never sees a half
 *     file;
 *   - mutations run through ONE in-process promise chain (`createJournalLock`),
 *     so two edits at once cannot interleave a read-modify-write;
 *   - path: `AGENT_PLAN_STORE_PATH` when set (tests), else `.data/agent-plans.json`
 *     under the app's cwd (gitignored).
 *
 * WHAT IS *NOT* HERE. The record shape and the fold are the planner's own
 * (`lib/agent/agent-plans.ts`); the store owns only persistence, the id and the
 * timestamps. The validation is the SAME pure reading the route runs.
 *
 * LIVE MODE. No frozen contract names an agent-plan endpoint, so
 * `lib/api-client/agent.ts` never claims live mode (`live-mode.ts` state "none").
 * This store serves fixture mode only; there is no flag that can route a real
 * agent's plan into a local file.
 */
import { randomUUID } from "node:crypto";
import { ApiError } from "@/lib/api-client/api-error";
import {
  createJournalLock,
  journalPath,
  readJournalEvents,
  writeJournalEvents,
} from "@/lib/api-client/journal";
import {
  applyPlanEvents,
  applyPlanPatch,
  newPlan,
  type AgentPlan,
  type AgentPlanEvent,
  type PlanDraft,
  type PlanPatch,
} from "@/lib/agent/agent-plans";

export function agentPlanStorePath(): string {
  return journalPath("AGENT_PLAN_STORE_PATH", "agent-plans.json");
}

/* ------------------------------ readers --------------------------------- */

function malformed(what: string): never {
  throw new ApiError(`malformed agent plan store: ${what}`, 500);
}

function requiredString(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim().length === 0) malformed(what);
  return value;
}

/** Field-by-field reader for one persisted plan; extra keys are ignored. */
function toAgentPlan(raw: unknown): AgentPlan {
  if (typeof raw !== "object" || raw === null) malformed("plan row");
  const r = raw as Record<string, unknown>;
  return {
    id: requiredString(r.id, "plan id"),
    created_by: typeof r.created_by === "string" ? r.created_by : "",
    day: requiredString(r.day, "plan day"),
    time: typeof r.time === "string" ? r.time : "",
    title: requiredString(r.title, "plan title"),
    note: typeof r.note === "string" ? r.note : "",
    done: r.done === true,
    created_at: requiredString(r.created_at, "plan created_at"),
    updated_at: requiredString(r.updated_at, "plan updated_at"),
  };
}

function toAgentPlanEvent(raw: unknown): AgentPlanEvent {
  if (typeof raw !== "object" || raw === null) malformed("event row");
  const r = raw as Record<string, unknown>;
  if (r.kind === "plan_saved") {
    return { kind: "plan_saved", at: requiredString(r.at, "event timestamp"), plan: toAgentPlan(r.plan) };
  }
  if (r.kind === "plan_removed") {
    return { kind: "plan_removed", at: requiredString(r.at, "event timestamp"), plan_id: requiredString(r.plan_id, "removed plan id") };
  }
  malformed(`event kind ${String(r.kind)}`);
}

export async function listPlanEvents(): Promise<AgentPlanEvent[]> {
  const events = await readJournalEvents(agentPlanStorePath(), "agent plans");
  return events.map(toAgentPlanEvent);
}

/* ------------------------------ writers --------------------------------- */

const withStoreLock = createJournalLock();

function persist(events: AgentPlanEvent[]): Promise<void> {
  return writeJournalEvents(agentPlanStorePath(), "agent plans", events);
}

/** Create one plan and return it. Serialized with every other write to this store. */
export function createPlan(args: { draft: PlanDraft; by: string; now?: Date }): Promise<AgentPlan> {
  const now = args.now ?? new Date();
  return withStoreLock(async () => {
    const events = await listPlanEvents();
    const nowIso = now.toISOString();
    const plan = newPlan({ id: `plan-${randomUUID()}`, draft: args.draft, by: args.by, nowIso });
    await persist([...events, { kind: "plan_saved", at: nowIso, plan }]);
    return plan;
  });
}

/** Apply one validated edit; null when no plan carries the id. */
export function updatePlan(args: {
  id: string;
  patch: PlanPatch;
  now?: Date;
}): Promise<AgentPlan | null> {
  const now = args.now ?? new Date();
  return withStoreLock(async () => {
    const events = await listPlanEvents();
    const existing = applyPlanEvents(events).find((plan) => plan.id === args.id);
    if (!existing) return null;
    const nowIso = now.toISOString();
    const plan = applyPlanPatch(existing, args.patch, nowIso);
    await persist([...events, { kind: "plan_saved", at: nowIso, plan }]);
    return plan;
  });
}

/** Remove one plan; false when no plan carries the id. */
export function removePlan(args: { id: string; now?: Date }): Promise<boolean> {
  const now = args.now ?? new Date();
  return withStoreLock(async () => {
    const events = await listPlanEvents();
    const exists = applyPlanEvents(events).some((plan) => plan.id === args.id);
    if (!exists) return false;
    await persist([...events, { kind: "plan_removed", at: now.toISOString(), plan_id: args.id }]);
    return true;
  });
}
