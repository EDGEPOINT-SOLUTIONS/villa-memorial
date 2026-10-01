/**
 * The agent appointments calendar's PURE logic — the recorded activity grouped
 * by its Asia/Manila day, the state→tone colour role, and the month the calendar
 * should open on.
 *
 * Not a service and not a data layer: every value here is derived from the
 * office's recorded workspace (`lib/fixtures/agent/workspace.json` through
 * `lib/api-client/agent.ts`). The month arithmetic lives in
 * `lib/calendar-grid.ts` (shared with the family visit calendar); this module
 * decides which cell an appointment or a dated task belongs to and how it is
 * announced.
 *
 * NOTHING IS INVENTED. A day with no recorded appointment and no dated task is a
 * plain day; no availability, no free slot and no reminder is created here. The
 * office's own state words (confirmed · waiting) travel with every mark, and the
 * legend and the day detail always name the state in words, never colour alone.
 */
import type { AgentTask, Appointment } from "@/lib/api-client/agent";
import { appointmentStateLabel, manilaDayKey, manilaTime } from "@/lib/agent/agent-view";
import { monthKeyFromDay, type CalendarMonthKey } from "@/lib/calendar-grid";

/** The recorded state of one calendar entry → the colour role it carries. */
export type AgentCalendarTone = "ok" | "wait" | "neutral";

/** One recorded thing on the agent's calendar: an appointment, or a task with a due day. */
export type AgentCalendarEvent = {
  id: string;
  kind: "appointment" | "task";
  /** `yyyy-mm-dd`, the Asia/Manila day the entry falls on. */
  dayKey: string;
  /** The instant (an appointment) or calendar date (a task) the record carries. */
  at: string;
  tone: AgentCalendarTone;
  /** The appointment when `kind === "appointment"`, else null. */
  appointment: Appointment | null;
  /** The task when `kind === "task"`, else null. */
  task: AgentTask | null;
  /** Who the appointment is with, when the record names a contact. */
  contact_name: string | null;
};

/** An appointment is confirmed by the office, or still waiting for that confirmation. */
export function agentAppointmentTone(appointment: Pick<Appointment, "status">): AgentCalendarTone {
  return appointment.status === "confirmed" ? "ok" : "wait";
}

/**
 * Tasks carry a due day only when the record writes one; a task without a day is
 * never placed on a cell. A dated task is a neutral note (it is not the office's
 * confirmation), so it never borrows the confirmed/waiting colours.
 */
export function agentTaskDayKey(task: Pick<AgentTask, "due_at">): string {
  const due = task.due_at;
  if (!due) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : manilaDayKey(due);
}

/**
 * Every recorded appointment and every dated task, keyed to its Manila day.
 * `contactNames` resolves an appointment's `contact_id` to the name the office
 * record carries, so the day detail can say who the agent is meeting.
 */
export function buildAgentCalendarEvents(
  appointments: readonly Appointment[],
  tasks: readonly AgentTask[],
  contactNames: Readonly<Record<string, string>> = {},
): AgentCalendarEvent[] {
  const events: AgentCalendarEvent[] = [];
  for (const appointment of appointments) {
    const dayKey = manilaDayKey(appointment.starts_at);
    if (!dayKey) continue;
    events.push({
      id: appointment.id,
      kind: "appointment",
      dayKey,
      at: appointment.starts_at,
      tone: agentAppointmentTone(appointment),
      appointment,
      task: null,
      contact_name: appointment.contact_id ? contactNames[appointment.contact_id] ?? null : null,
    });
  }
  for (const task of tasks) {
    const dayKey = agentTaskDayKey(task);
    if (!dayKey) continue;
    events.push({
      id: task.id,
      kind: "task",
      dayKey,
      at: task.due_at ?? "",
      tone: "neutral",
      appointment: null,
      task,
      contact_name: null,
    });
  }
  return events;
}

/** The recorded activity grouped by the Manila day it falls on, in time order. */
export function groupAgentEventsByDay(
  events: readonly AgentCalendarEvent[],
): Map<string, AgentCalendarEvent[]> {
  const byDay = new Map<string, AgentCalendarEvent[]>();
  for (const event of events) {
    const list = byDay.get(event.dayKey);
    if (list) list.push(event);
    else byDay.set(event.dayKey, [event]);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  }
  return byDay;
}

/** The day keys that carry at least one recorded entry, in order. */
export function agentEventDayKeys(byDay: Map<string, AgentCalendarEvent[]>): string[] {
  return [...byDay.keys()].sort();
}

/** The first day in a month that carries recorded activity, or null. */
export function firstAgentEventDay(
  byDay: Map<string, AgentCalendarEvent[]>,
  month: CalendarMonthKey,
): string | null {
  return agentEventDayKeys(byDay).find((key) => monthKeyFromDay(key) === month) ?? null;
}

/**
 * The recorded “today” — the day of the appointments the fixture classifies as
 * today's stops. The demo workspace is a frozen scenario, so its own today is the
 * day the drive order belongs to; `fallback` (the real Manila day) is used only
 * when the record carries no today at all.
 */
export function recordedTodayKey(
  appointments: readonly Pick<Appointment, "day" | "starts_at">[],
  fallback: string,
): string {
  const days = appointments
    .filter((appointment) => appointment.day === "today")
    .map((appointment) => manilaDayKey(appointment.starts_at))
    .filter(Boolean)
    .sort();
  return days[0] ?? fallback;
}

/**
 * The month the calendar opens on: the nearest recorded day that is not behind
 * today, else the most recent one, else today's month. A calendar with nothing
 * recorded opens on today, which is honest — the month is simply plain.
 */
export function defaultAgentMonthKey(
  events: readonly AgentCalendarEvent[],
  todayKey: string,
): CalendarMonthKey {
  const days = events.map((event) => event.dayKey).filter(Boolean).sort();
  if (days.length === 0) return monthKeyFromDay(todayKey);
  const upcoming = days.find((key) => key >= todayKey);
  return monthKeyFromDay(upcoming ?? days[days.length - 1]);
}

const WEEKDAY_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Manila",
  weekday: "long",
});
const DAY_LABEL_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Manila",
  day: "numeric",
  month: "long",
});

function manilaNoon(dayKey: string): Date {
  return new Date(`${dayKey}T12:00:00+08:00`);
}

/** “Wednesday” for a `yyyy-mm-dd` day. */
export function agentDayWeekday(dayKey: string): string {
  return WEEKDAY_FORMAT.format(manilaNoon(dayKey));
}

/** “16 September” for a `yyyy-mm-dd` day. */
export function agentDayLabel(dayKey: string): string {
  return DAY_LABEL_FORMAT.format(manilaNoon(dayKey));
}

/**
 * The one line a day cell announces to a screen reader: the day, then each
 * recorded entry with who it is with, what it is, the time and its state. A day
 * with nothing recorded says exactly that.
 */
export function agentDayAriaSummary(
  dayKey: string,
  events: readonly AgentCalendarEvent[],
): string {
  const when = `${agentDayWeekday(dayKey)} ${agentDayLabel(dayKey)}`;
  if (events.length === 0) return `${when}, nothing recorded`;
  const parts = events.map((event) => {
    if (event.kind === "task" && event.task) return `${event.task.title} (task)`;
    const appointment = event.appointment!;
    return [event.contact_name, appointment.title, manilaTime(appointment.starts_at), appointmentStateLabel(appointment)]
      .filter((part): part is string => Boolean(part))
      .join(", ");
  });
  return `${when}: ${parts.join("; ")}`;
}
