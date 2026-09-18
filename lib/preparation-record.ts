/**
 * Pure view logic for the embalming / preparation record screen
 * (`/staff/cases/[id]/preparation`).
 *
 * WHY THIS MODULE: the record must answer "who prepared the deceased, when, and where
 * each checklist step stands" at a glance, and the same answers must hold in tests. The
 * four steps and their order are the blueprint's own (crm-cases.md §12 — embalming ·
 * dressing · cosmetics · casketing); the states are the module's statuses (scheduled /
 * in progress / completed / cancelled).
 *
 * WHAT IT NEVER DOES: derive a step's state, or a "done", from anything but the record.
 * A step reads completed only when the record says so, and a missing field reads as
 * missing — the screen then says "not recorded", never a plausible value.
 *
 * TIME: instants print in the park's own time (Asia/Manila), the same convention as
 * lib/schedule-board.ts and lib/family/family-view.ts. Calendar dates (the case's own
 * intake fields) print in UTC so a recorded day can never shift with the reader.
 */
import type {
  PreparationRecord,
  PreparationState,
  PreparationStep,
  PreparationStepKey,
} from "@/lib/api-client/preparation";

/** The park's own clock — a recorded instant is printed in it, never the reader's. */
export const PREPARATION_TIME_ZONE = "Asia/Manila";

/** The steps in the order the work happens; a record carrying none shows none. */
export const PREPARATION_STEP_ORDER: ReadonlyArray<PreparationStepKey> = [
  "embalming",
  "dressing",
  "cosmetics",
  "casketing",
];

export const PREPARATION_STEP_LABEL: Record<PreparationStepKey, string> = {
  embalming: "Embalming",
  dressing: "Dressing",
  cosmetics: "Cosmetics",
  casketing: "Casketing",
};

export type PreparationTone = "neutral" | "warning" | "success" | "danger";

const STATE_LABEL: Record<PreparationState, string> = {
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATE_TONE: Record<PreparationState, PreparationTone> = {
  scheduled: "neutral",
  in_progress: "warning",
  completed: "success",
  cancelled: "danger",
};

export function preparationStateLabel(state: PreparationState): string {
  return STATE_LABEL[state] ?? String(state);
}

export function preparationStateTone(state: PreparationState): PreparationTone {
  return STATE_TONE[state] ?? "neutral";
}

/** The record's steps in work order; a step the record does not carry is absent. */
export function orderedPreparationSteps(
  steps: ReadonlyArray<PreparationStep>,
): PreparationStep[] {
  const byKey = new Map(steps.map((step) => [step.key, step]));
  return PREPARATION_STEP_ORDER.flatMap((key) => {
    const step = byKey.get(key);
    return step ? [step] : [];
  });
}

/* ------------------------------ dates and times ------------------------------ */

const CALENDAR_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const CALENDAR_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const INSTANT_DAY_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: PREPARATION_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const INSTANT_TIME_FORMAT = new Intl.DateTimeFormat("en-PH", {
  timeZone: PREPARATION_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** A calendar date (the case's own intake value) → "27 Aug 2026"; UTC, never shifted. */
export function calendarDateLabel(date: string | null): string | null {
  if (!date || !CALENDAR_DATE_RE.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.toISOString().slice(0, 10) !== date) return null;
  return CALENDAR_FORMAT.format(parsed);
}

type Instant = { label: string; day: string; time: string };

function instant(iso: string | null): Instant | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    label: `${INSTANT_DAY_FORMAT.format(parsed)} · ${INSTANT_TIME_FORMAT.format(parsed)}`,
    day: INSTANT_DAY_FORMAT.format(parsed),
    time: INSTANT_TIME_FORMAT.format(parsed),
  };
}

/** One instant → "27 Aug 2026 · 9:30 PM" (park time); unusable → null. */
export function preparationMomentLabel(iso: string | null): string | null {
  return instant(iso)?.label ?? null;
}

/**
 * The worked window → "27 Aug 2026 · 8:40 PM – 9:30 PM" when start and finish fall on
 * the same park day, both full moments when they do not, the one moment there is, or
 * null when the record carries no time at all.
 */
export function preparationWindowLabel(
  startedAt: string | null,
  completedAt: string | null,
): string | null {
  const start = instant(startedAt);
  const done = instant(completedAt);
  if (start && done) {
    return start.day === done.day
      ? `${done.day} · ${start.time} – ${done.time}`
      : `${start.label} – ${done.label}`;
  }
  return done?.label ?? start?.label ?? null;
}

/** What the record says about when the work happened, in one honest phrase. */
export function preparationWorkLabel(
  record: Pick<PreparationRecord, "started_at" | "completed_at">,
): string {
  const window = preparationWindowLabel(record.started_at, record.completed_at);
  if (!window) return "Not recorded yet";
  return record.completed_at ? window : `Started ${window}`;
}
