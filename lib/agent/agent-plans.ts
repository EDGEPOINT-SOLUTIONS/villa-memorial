/**
 * The agent's own day planner, in pure functions.
 *
 * WHY THIS MODULE EXISTS. The appointments calendar shows the office's recorded
 * day; the captain (2026-10-02) asked the agent to also PLAN their own day — pick
 * a day, write what to do on it with an optional time and note, tick it done, and
 * be told about today's plan when they sign in. This module is the fold and the
 * reading of that plan: an append-only journal of plan saves and removals
 * (persisted by `lib/api-client/agent-plan-store.ts`) applied to produce the one
 * effective plan list the calendar, the notices and the store all read.
 *
 * IT IS NOT THE OFFICE'S SCHEDULE. A plan is the agent's own note to themselves.
 * It is DEMO-LOCAL — no platform contract names an agent-plan endpoint — and it
 * borrows none of the office's language: a plan never says a slot is booked, never
 * promises a reminder, and never claims an office confirmation. The office's
 * recorded appointments stay exactly as they are, read-only beside the plans.
 *
 * THE RECORD SHAPE IS THE PLANNER'S OWN, flagged per web/AGENTS.md because it is
 * invented ahead of any contract. `AgentPlan` carries only what the captain asked
 * for: the day, an optional time, what to do, an optional note, and whether it is
 * done. It is not `Appointment` and must never be folded into it.
 *
 * THE VOCABULARY IS NOT RE-INVENTED. Times are 24-hour `HH:mm` keys; the display
 * label is formatted here so no surface hand-rolls a clock. The validation is the
 * SAME reading the route and the browser form use, so a store refusal and a
 * field-level refusal say the same thing.
 */

/** One day the agent planned for themselves. */
export type AgentPlan = {
  id: string;
  /** The signed-in agent who wrote it (display name, like a stage move's `by`). */
  created_by: string;
  /** The Asia/Manila day the plan is for, `yyyy-mm-dd`. */
  day: string;
  /** Optional time of day, `HH:mm` 24-hour, or "" when the plan has no time. */
  time: string;
  title: string;
  note: string;
  done: boolean;
  created_at: string;
  updated_at: string;
};

/** What the agent types to create a plan — the only input the form sends. */
export type PlanDraft = {
  day: string;
  time: string;
  title: string;
  note: string;
};

/** The fields an edit may change; an absent field is left as it was. */
export type PlanPatch = Partial<{
  day: string;
  time: string;
  title: string;
  note: string;
  done: boolean;
}>;

/** One journalled plan write: the full effective plan, or a removal by id. */
export type AgentPlanEvent =
  | { kind: "plan_saved"; at: string; plan: AgentPlan }
  | { kind: "plan_removed"; at: string; plan_id: string };

/** A validated reading: the value, or the field errors a form shows verbatim. */
export type PlanVerdict<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> };

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const PLAN_TITLE_MAX = 160;
export const PLAN_NOTE_MAX = 500;

/** A real calendar day in `yyyy-mm-dd` (not merely a four-digit shape). */
export function isPlanDay(value: string): boolean {
  if (!DAY_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * The minute of the day a plan starts at; an untimed plan sorts AFTER every
 * timed one, so a day reads its clock first and its notes last.
 */
export function planMinutes(time: string): number {
  if (!TIME_RE.test(time)) return 24 * 60;
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

const PLAN_TIME_FORMAT = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** “2:30 PM” for a `HH:mm` key; an empty string when the plan has no time. */
export function planTimeLabel(time: string): string {
  if (!TIME_RE.test(time)) return "";
  const [hour, minute] = time.split(":").map(Number);
  return PLAN_TIME_FORMAT.format(new Date(Date.UTC(2026, 0, 1, hour, minute)));
}

/** The order a day reads in: by day, then time (untimed last), then creation. */
export function comparePlans(a: AgentPlan, b: AgentPlan): number {
  return (
    a.day.localeCompare(b.day) ||
    planMinutes(a.time) - planMinutes(b.time) ||
    a.created_at.localeCompare(b.created_at) ||
    a.id.localeCompare(b.id)
  );
}

/* ------------------------------ validation ------------------------------- */

function requireObject(raw: unknown): Record<string, unknown> | null {
  return typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : null;
}

function readDay(value: unknown, errors: Record<string, string>): string {
  const day = typeof value === "string" ? value.trim() : "";
  if (!isPlanDay(day)) errors.day = "Choose a real day.";
  return day;
}

function readTitle(value: unknown, errors: Record<string, string>): string {
  const title = typeof value === "string" ? value.trim() : "";
  if (title.length === 0) errors.title = "Write what you plan to do.";
  else if (title.length > PLAN_TITLE_MAX) errors.title = `Keep the plan under ${PLAN_TITLE_MAX} characters.`;
  return title;
}

function readTime(value: unknown, errors: Record<string, string>): string {
  const time = typeof value === "string" ? value.trim() : "";
  if (time !== "" && !TIME_RE.test(time)) errors.time = "Use a 24-hour time like 14:30, or leave it blank.";
  return time;
}

function readNote(value: unknown, errors: Record<string, string>): string {
  const note = typeof value === "string" ? value.trim() : "";
  if (note.length > PLAN_NOTE_MAX) errors.note = `Keep the note under ${PLAN_NOTE_MAX} characters.`;
  return note;
}

/**
 * The reading a NEW plan must pass: a real day, a title, an optional `HH:mm` and
 * an optional note. Extra keys are ignored; a missing field is an error, never a
 * silent default, because the day and what-to-do are the whole plan.
 */
export function readPlanDraft(raw: unknown): PlanVerdict<PlanDraft> {
  const record = requireObject(raw);
  if (!record) return { ok: false, errors: { form: "Send the plan as a JSON object." } };
  const errors: Record<string, string> = {};
  const draft: PlanDraft = {
    day: readDay(record.day, errors),
    time: readTime(record.time, errors),
    title: readTitle(record.title, errors),
    note: readNote(record.note, errors),
  };
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: draft };
}

/**
 * The reading an EDIT must pass. Only the keys the caller sent are validated and
 * returned; an empty edit is refused rather than appending a no-op save.
 */
export function readPlanPatch(raw: unknown): PlanVerdict<PlanPatch> {
  const record = requireObject(raw);
  if (!record) return { ok: false, errors: { form: "Send the change as a JSON object." } };
  const errors: Record<string, string> = {};
  const patch: PlanPatch = {};
  if ("day" in record) patch.day = readDay(record.day, errors);
  if ("time" in record) patch.time = readTime(record.time, errors);
  if ("title" in record) patch.title = readTitle(record.title, errors);
  if ("note" in record) patch.note = readNote(record.note, errors);
  if ("done" in record) {
    if (typeof record.done !== "boolean") errors.done = "Done must be true or false.";
    else patch.done = record.done;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  if (Object.keys(patch).length === 0) return { ok: false, errors: { form: "Nothing was changed." } };
  return { ok: true, value: patch };
}

/* ------------------------------- the fold -------------------------------- */

/** One plan the agent just created; the store owns the id and the timestamps. */
export function newPlan(args: { id: string; draft: PlanDraft; by: string; nowIso: string }): AgentPlan {
  return {
    id: args.id,
    created_by: args.by,
    day: args.draft.day,
    time: args.draft.time,
    title: args.draft.title,
    note: args.draft.note,
    done: false,
    created_at: args.nowIso,
    updated_at: args.nowIso,
  };
}

/** Apply a validated edit to an existing plan; `updated_at` is the one mutation. */
export function applyPlanPatch(plan: AgentPlan, patch: PlanPatch, nowIso: string): AgentPlan {
  return {
    ...plan,
    day: patch.day ?? plan.day,
    time: patch.time ?? plan.time,
    title: patch.title ?? plan.title,
    note: patch.note ?? plan.note,
    done: patch.done ?? plan.done,
    updated_at: nowIso,
  };
}

/**
 * Fold the journal, oldest first: the last save for an id wins, and a removal
 * drops the id entirely. The result is ordered by day and time so every surface
 * reads the same list.
 */
export function applyPlanEvents(events: readonly AgentPlanEvent[]): AgentPlan[] {
  const byId = new Map<string, AgentPlan>();
  for (const event of events) {
    if (event.kind === "plan_removed") {
      byId.delete(event.plan_id);
      continue;
    }
    byId.set(event.plan.id, { ...event.plan });
  }
  return [...byId.values()].sort(comparePlans);
}

/** Every plan for one `yyyy-mm-dd` day, in reading order. */
export function plansForDay(plans: readonly AgentPlan[], day: string): AgentPlan[] {
  return plans.filter((plan) => plan.day === day).sort(comparePlans);
}

/**
 * The next plan the agent has not finished, at or after `afterMinutes` when the
 * caller has a clock. An untimed plan is only “next” when nothing timed is left.
 */
export function nextOpenPlan(
  plans: readonly AgentPlan[],
  day: string,
  afterMinutes = 0,
): AgentPlan | null {
  const open = plansForDay(plans, day).filter((plan) => !plan.done);
  return open.find((plan) => planMinutes(plan.time) >= afterMinutes) ?? null;
}
