/**
 * The arrangement — pure view logic for the office's recorded case.
 *
 * WHAT THIS IS. The dashboard's arrangement panel and the funeral page show the
 * five moments of the family's own arrangement (arrangement · viewing · funeral ·
 * burial · papers), each with the time the office recorded, the place and its
 * state. This module turns the recorded `FamilyCase` into the labels, dates and
 * state words the pages render — no `FamilyCase` reading, no clock-derived
 * status, no invented value. `lib/api-client/family.ts::getFamilyCase` is the
 * one reader; `components/family/family-case.tsx` is the one renderer, so the
 * dashboard's chain and the panel behind it cannot drift.
 *
 * THE RULE. A step the record carries renders its recorded day and time from
 * the true instant (`lib/family/family-view.ts`, Asia/Manila) — the recorded
 * `day_label`/`time_label` style is never stored twice. A step the record does
 * not carry has no time: the page says so in a few words, never a guess.
 */
import type { FamilyCase, FamilyCaseStep, FamilyCaseStepKey } from "@/lib/api-client/family";
import {
  familyDayLabel,
  familyInstantDateLabel,
  familyInstantTimeLabel,
  familyInstantWeekday,
} from "@/lib/family/family-view";

/** The five family moments, in order, with the one word each shows. */
export const FAMILY_CASE_STEPS: ReadonlyArray<{ key: FamilyCaseStepKey; label: string }> = [
  { key: "arrangement", label: "Arrangement" },
  { key: "viewing", label: "Viewing" },
  { key: "funeral", label: "Funeral" },
  { key: "burial", label: "Burial" },
  { key: "papers", label: "Papers" },
];

/** The plain word for a step key — the chain and the table read this one map. */
export const FAMILY_CASE_STEP_LABELS: Record<FamilyCaseStepKey, string> = {
  arrangement: "Arrangement",
  viewing: "Viewing",
  funeral: "Funeral",
  burial: "Burial",
  papers: "Papers",
};

/**
 * The chain's five words, derived from the one step list above so the chain and
 * the schedule panel can never disagree.
 */
export const FAMILY_CHAIN_STEPS: readonly string[] = FAMILY_CASE_STEPS.map((step) => step.label);

export type FamilyCaseStepTone = "success" | "warning" | "neutral";

export type FamilyCaseStepView = {
  key: FamilyCaseStepKey;
  label: string;
  /** “Saturday, 19 September · 10:00 AM”, or “” when the record carries no time. */
  when: string;
  place?: string;
  person?: string;
  note?: string;
  /** The office's own state, for the row's chip. */
  state: FamilyCaseStep["status"];
  stateLabel: string;
  tone: FamilyCaseStepTone;
};

const STATE_WORDS: Record<FamilyCaseStep["status"], { label: string; tone: FamilyCaseStepTone }> = {
  done: { label: "Done", tone: "success" },
  now: { label: "Happening now", tone: "warning" },
  next: { label: "Next", tone: "neutral" },
  not_recorded: { label: "Not recorded yet", tone: "neutral" },
};

/** One recorded instant as the family reads it: weekday, day, month, time. */
export function familyCaseInstantLabel(startsAt: string): string {
  return `${familyInstantWeekday(startsAt)} ${familyInstantDateLabel(startsAt)} · ${familyInstantTimeLabel(startsAt)}`;
}

export function familyCaseStepView(step: FamilyCaseStep): FamilyCaseStepView {
  const when = step.starts_at
    ? familyCaseInstantLabel(step.starts_at)
    : step.on
      ? familyDayLabel(step.on)
      : "";
  const state = STATE_WORDS[step.status];
  return {
    key: step.key,
    label: FAMILY_CASE_STEP_LABELS[step.key],
    when,
    place: step.place,
    person: step.person,
    note: step.note,
    state: step.status,
    stateLabel: state.label,
    tone: state.tone,
  };
}

/** Every step as its render view, in chain order and always five rows. */
export function familyCaseRows(familyCase: FamilyCase): FamilyCaseStepView[] {
  const byKey = new Map(familyCase.steps.map((step) => [step.key, step]));
  return FAMILY_CASE_STEPS.map(({ key }) => {
    const step = byKey.get(key);
    return step
      ? familyCaseStepView(step)
      : {
          key,
          label: FAMILY_CASE_STEP_LABELS[key],
          when: "",
          state: "not_recorded" as const,
          stateLabel: STATE_WORDS.not_recorded.label,
          tone: STATE_WORDS.not_recorded.tone,
        };
  });
}

/**
 * The 1-based step the chain marks, derived from the recorded state and nothing
 * else:
 *   · a step the office marks `now` → that step;
 *   · else a step marked `next` → that step;
 *   · else every step done → one past the last (all five ticked, no “you are
 *     here” on a finished arrangement);
 *   · else — the case is not recorded enough to mark — the chain stays plain.
 */
export function caseChainCurrent(familyCase: FamilyCase): number | undefined {
  const nowIndex = familyCase.steps.findIndex((step) => step.status === "now");
  if (nowIndex >= 0) return nowIndex + 1;
  const nextIndex = familyCase.steps.findIndex((step) => step.status === "next");
  if (nextIndex >= 0) return nextIndex + 1;
  const allDone =
    familyCase.steps.length > 0 && familyCase.steps.every((step) => step.status === "done");
  return allDone ? familyCase.steps.length + 1 : undefined;
}

/** “Three of five done” — the panel's real count, never a decorative badge. */
export function familyCaseDoneCount(familyCase: FamilyCase): number {
  return familyCase.steps.filter((step) => step.status === "done").length;
}
