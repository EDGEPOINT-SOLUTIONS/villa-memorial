/**
 * The family visit calendar's PURE logic — the day an instant belongs to, the
 * events grouped by day, the state→tone colour role and the visit kinds a family
 * can ask the office for. (The month grid itself is portal-neutral and lives in
 * `lib/calendar-grid.ts`, re-exported below.)
 *
 * Not a service and not a data layer: every value here is derived from records
 * the pages already read (`lib/fixtures/family/workspace.json` through
 * `lib/api-client/family.ts`). The ONE way the portal prints a day stays
 * `lib/family/family-view.ts`; this module only decides which calendar cell a
 * recorded instant belongs to and how the month is laid out.
 *
 * Week starts on MONDAY: the park is in the Philippines, where the week reads
 * Monday→Sunday (the same rule `styles/…` and the office's own calendars use).
 * Dates are computed in UTC so a reader's timezone can never move a cell; the
 * day key an instant maps to is the Asia/Manila day (`familyInstantDay`).
 *
 * NOTHING IS INVENTED: a day with no recorded appointment is a plain day. There
 * is no availability, no free slot and no running office-hours calendar here —
 * the scheduling service does not exist, and the pages say so on the day.
 */
import type { FamilyAppointment } from "@/lib/api-client/family";
import {
  familyAppointmentState,
  familyInstantDateLabel,
  familyInstantDay,
  familyInstantTimeLabel,
  familyInstantWeekday,
} from "@/lib/family/family-view";
import { monthKeyFromDay, type CalendarMonthKey } from "@/lib/calendar-grid";

// The month arithmetic is portal-neutral — it lives in `lib/calendar-grid.ts` so
// the agent calendar reads the same Monday-first grid. Re-exported here so every
// existing family import (and its tests) keeps working unchanged.
export {
  addMonths,
  buildMonthGrid,
  monthKeyFromDay,
  monthKeyOf,
  monthLabel,
  parseMonthKey,
} from "@/lib/calendar-grid";
export type { CalendarDay, CalendarMonthKey, CalendarWeek } from "@/lib/calendar-grid";

/** One recorded appointment together with the loved one it belongs to. */
export type CalendarAppointment = FamilyAppointment & {
  person_id: string;
  person_name: string;
};

/** The state of a recorded visit → the colour role it carries (never colour alone). */
export type VisitTone = "ok" | "wait" | "neutral";

/** The recorded visits grouped by the Manila day they fall on. */
export function groupByDay(
  appointments: readonly CalendarAppointment[],
): Map<string, CalendarAppointment[]> {
  const byDay = new Map<string, CalendarAppointment[]>();
  for (const appointment of appointments) {
    const key = familyInstantDay(appointment.starts_at);
    if (!key) continue;
    const list = byDay.get(key);
    if (list) list.push(appointment);
    else byDay.set(key, [appointment]);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }
  return byDay;
}

/** The day keys that carry at least one visit, in order. */
export function eventDayKeys(byDay: Map<string, CalendarAppointment[]>): string[] {
  return [...byDay.keys()].sort();
}

/**
 * The first day in a month that carries a visit, or null. Used to open the
 * calendar on something real rather than always on the 1st.
 */
export function firstEventDay(
  byDay: Map<string, CalendarAppointment[]>,
  month: CalendarMonthKey,
): string | null {
  return eventDayKeys(byDay).find((key) => monthKeyFromDay(key) === month) ?? null;
}

/**
 * The month the calendar should open on: the month of the nearest visit that is
 * not behind the reader, else the month of the most recent one, else this month.
 * A page with no recorded visit opens on today's month, which is honest — the
 * calendar simply has nothing marked on it.
 */
export function defaultMonthKey(
  appointments: readonly Pick<FamilyAppointment, "starts_at">[],
  todayKey: string,
): CalendarMonthKey {
  const days = appointments
    .map((appointment) => familyInstantDay(appointment.starts_at))
    .filter(Boolean)
    .sort();
  if (days.length === 0) return monthKeyFromDay(todayKey);
  const upcoming = days.find((key) => key >= todayKey);
  return monthKeyFromDay(upcoming ?? days[days.length - 1]);
}

/** The colour role a state carries. The meaning is always also a word. */
export function visitTone(state: FamilyAppointment["state"]): VisitTone {
  if (state === "confirmed") return "ok";
  if (state === "waiting") return "wait";
  return "neutral";
}

/**
 * The one line a day cell announces to a screen reader: the day, then each
 * recorded visit with who it is for, what it is, the time and its state. The
 * calendar grid is a table of marks; this is the text behind a mark.
 */
export function dayAriaSummary(
  dayKey: string,
  events: readonly CalendarAppointment[],
): string {
  if (events.length === 0) return `${familyInstantWeekday(`${dayKey}T00:00:00+08:00`)} ${familyInstantDateLabel(`${dayKey}T00:00:00+08:00`)}, no visits`;
  const parts = events.map(
    (event) =>
      `${event.person_name}, ${event.title}, ${familyInstantTimeLabel(event.starts_at)}, ${familyAppointmentState(event.state)}`,
  );
  return `${familyInstantWeekday(`${dayKey}T00:00:00+08:00`)} ${familyInstantDateLabel(`${dayKey}T00:00:00+08:00`)}: ${parts.join("; ")}`;
}

/** One kind of visit a family can ask the office for. */
export type FamilyVisitKind = {
  key: "home_visit" | "park_visit" | "office_visit";
  /** The family's words for the visit. */
  label: string;
  /** One short line of what it is. */
  detail: string;
};

/**
 * The visit kinds the office can be asked for — the same three the recorded
 * appointments use (`home_visit` · `park_visit` · `office_visit`). This is not a
 * new taxonomy: it is the family's plain words for the kinds already in the
 * record, and every one of them still ends in a call, never a booked slot.
 */
export const FAMILY_VISIT_KINDS: readonly FamilyVisitKind[] = [
  {
    key: "home_visit",
    label: "A visit to your home",
    detail: "The office comes to you — we call before we set off.",
  },
  {
    key: "park_visit",
    label: "A walk to the lot with us",
    detail: "We meet you at the park and walk to your loved one's lot.",
  },
  {
    key: "office_visit",
    label: "A meeting at the office",
    detail: "Sit down with the office in Sunrise, Isabela City.",
  },
] as const;

/** One visit kind by its key, or undefined for anything else. */
export function familyVisitKind(key: string | undefined): FamilyVisitKind | undefined {
  return FAMILY_VISIT_KINDS.find((kind) => kind.key === key);
}
