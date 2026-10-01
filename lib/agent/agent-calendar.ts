/**
 * The agent appointments calendar's PURE logic — the recorded activity and the
 * agent's own plans grouped by their Asia/Manila day, the state→tone colour role,
 * and the month the calendar should open on.
 *
 * Not a service and not a data layer: the recorded values here are derived from
 * the office's recorded workspace (`lib/fixtures/agent/workspace.json` through
 * `lib/api-client/agent.ts`), and the agent's own plans are the demo-local journal
 * (`lib/api-client/agent-plan-store.ts` → `lib/agent/agent-plans.ts`). The month
 * arithmetic lives in `lib/calendar-grid.ts` (shared with the family visit
 * calendar); this module decides which cell an appointment, a dated task or a plan
 * belongs to and how it is announced.
 *
 * NOTHING IS INVENTED. A day with no recorded appointment, no dated task and no
 * plan is a plain day; no availability, no free slot and no reminder is created
 * here. The office's own state words (confirmed · waiting) travel with every mark,
 * the agent's plan is its own named role, and the legend and the day detail always
 * name the state in words, never colour alone.
 */
import type { AgentTask, Appointment } from "@/lib/api-client/agent";
import {
  appointmentStateLabel,
  manilaDayKey,
  manilaMinutes,
  manilaTime,
} from "@/lib/agent/agent-view";
import {
  planMinutes,
  planTimeLabel,
  type AgentPlan,
} from "@/lib/agent/agent-plans";
import { monthKeyFromDay, type CalendarMonthKey } from "@/lib/calendar-grid";

/** The recorded state of one calendar entry → the colour role it carries. */
export type AgentCalendarTone = "ok" | "wait" | "neutral" | "plan";

/**
 * One thing on the agent's calendar: an office appointment, a task with a due
 * day, or the agent's own plan. The plan is not the office's diary — it is the
 * agent's note to themselves, kept beside the recorded day.
 */
export type AgentCalendarEvent = {
  id: string;
  kind: "appointment" | "task" | "plan";
  /** `yyyy-mm-dd`, the Asia/Manila day the entry falls on. */
  dayKey: string;
  /** The instant (an appointment), the due day (a task) or `dayTtime` (a plan). */
  at: string;
  /** Minutes after midnight, so a day's mixed entries order by one clock. */
  minutes: number;
  tone: AgentCalendarTone;
  /** The appointment when `kind === "appointment"`, else null. */
  appointment: Appointment | null;
  /** The task when `kind === "task"`, else null. */
  task: AgentTask | null;
  /** The agent's own plan when `kind === "plan"`, else null. */
  plan: AgentPlan | null;
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
 * Every recorded appointment, every dated task and every one of the agent's plans,
 * keyed to its Manila day. `contactNames` resolves an appointment's `contact_id`
 * to the name the office record carries, so the day detail can say who the agent
 * is meeting.
 */
export function buildAgentCalendarEvents(
  appointments: readonly Appointment[],
  tasks: readonly AgentTask[],
  plans: readonly AgentPlan[] = [],
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
      minutes: manilaMinutes(appointment.starts_at),
      tone: agentAppointmentTone(appointment),
      appointment,
      task: null,
      plan: null,
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
      // A dated task has no clock; it sits after the timed entries of its day.
      minutes: 24 * 60,
      tone: "neutral",
      appointment: null,
      task,
      plan: null,
      contact_name: null,
    });
  }
  for (const plan of plans) {
    if (!plan.day) continue;
    events.push({
      id: plan.id,
      kind: "plan",
      dayKey: plan.day,
      at: plan.time ? `${plan.day}T${plan.time}` : plan.day,
      minutes: planMinutes(plan.time),
      tone: "plan",
      appointment: null,
      task: null,
      plan,
      contact_name: null,
    });
  }
  return events;
}

/** The day's entries grouped by Manila day, ordered by time then id. */
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
    list.sort((a, b) => a.minutes - b.minutes || a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  }
  return byDay;
}

/** The day keys that carry at least one entry (recorded or planned), in order. */
export function agentEventDayKeys(byDay: Map<string, AgentCalendarEvent[]>): string[] {
  return [...byDay.keys()].sort();
}

/** The first day in a month that carries an entry, or null. */
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
 * The month the calendar opens on: the nearest entry day that is not behind
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
 * The one line a day cell announces to a screen reader: the day, then each entry
 * with who it is with, what it is, the time and its state. A day with nothing
 * says exactly that.
 */
export function agentDayAriaSummary(
  dayKey: string,
  events: readonly AgentCalendarEvent[],
): string {
  const when = `${agentDayWeekday(dayKey)} ${agentDayLabel(dayKey)}`;
  if (events.length === 0) return `${when}, nothing recorded`;
  const parts = events.map((event) => {
    if (event.kind === "plan" && event.plan) {
      const time = event.plan.time ? `, ${planTimeLabel(event.plan.time)}` : "";
      return `${event.plan.title} (your plan${time}${event.plan.done ? ", done" : ""})`;
    }
    if (event.kind === "task" && event.task) return `${event.task.title} (task)`;
    const appointment = event.appointment!;
    return [event.contact_name, appointment.title, manilaTime(appointment.starts_at), appointmentStateLabel(appointment)]
      .filter((part): part is string => Boolean(part))
      .join(", ");
  });
  return `${when}: ${parts.join("; ")}`;
}

/** What the sign-in notice says about one day, built from the same events. */
export type DayNotice = {
  /** How many plans the agent wrote for the day. */
  planCount: number;
  /** How many are not done yet. */
  openPlanCount: number;
  /** The office's recorded stops that day. */
  stopCount: number;
  /** The earliest entry still to do, or null when the day holds nothing open. */
  next: { kind: "plan" | "appointment" | "task"; id: string; title: string; timeLabel: string } | null;
};

/**
 * The one reading behind both the calendar's day detail and the dashboard's
 * sign-in notice, so the count and the next thing can never disagree.
 */
export function dayNotice(events: readonly AgentCalendarEvent[], dayKey: string): DayNotice {
  const day = events
    .filter((event) => event.dayKey === dayKey)
    .sort((a, b) => a.minutes - b.minutes || a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  const plans = day.filter((event) => event.kind === "plan" && event.plan);
  const stops = day.filter((event) => event.kind === "appointment");
  // The next thing is the earliest entry that is not already finished: a done
  // plan and a done task are both behind the agent, so neither is announced.
  const candidate = day.find((event) => {
    if (event.kind === "plan") return event.plan ? !event.plan.done : false;
    if (event.kind === "task") return event.task ? !event.task.done : false;
    return true;
  });
  let next: DayNotice["next"] = null;
  if (candidate) {
    if (candidate.kind === "plan" && candidate.plan) {
      next = {
        kind: "plan",
        id: candidate.id,
        title: candidate.plan.title,
        timeLabel: candidate.plan.time ? planTimeLabel(candidate.plan.time) : "",
      };
    } else if (candidate.kind === "appointment" && candidate.appointment) {
      next = {
        kind: "appointment",
        id: candidate.id,
        title: candidate.appointment.title,
        timeLabel: manilaTime(candidate.appointment.starts_at),
      };
    } else if (candidate.task) {
      next = { kind: "task", id: candidate.id, title: candidate.task.title, timeLabel: "" };
    }
  }
  return {
    planCount: plans.length,
    openPlanCount: plans.filter((event) => !event.plan!.done).length,
    stopCount: stops.length,
    next,
  };
}
