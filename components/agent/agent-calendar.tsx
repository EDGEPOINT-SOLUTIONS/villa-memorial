"use client";

/**
 * The agent appointments calendar — the month at a glance, and one tap on a day
 * to see what that day holds.
 *
 * WHY A CALENDAR (captain, 2026-10-02): the agent's own activity should be
 * readable the way the family's visits already are — the month first, then the
 * day. Every recorded appointment is marked on its Manila day and a task that
 * carries a due day is marked beside it, so a full day is visible before a word
 * is read. Selecting a day shows the detail: who the agent is meeting (when the
 * record names a contact), what it is, the time, the place, what to bring, and
 * the office's own confirmation state.
 *
 * THE ONE CALENDAR GRAMMAR. This screen reuses the family visit calendar's
 * shipped `.fv-cal*` grammar (the month grid, the state-coloured marks, the named
 * legend and the day detail beside the grid on a wide screen and under it on a
 * phone) so the product has ONE calendar pattern. The `.fv-cal` prefix is the
 * original family name for that shared grammar, not a family-only style.
 *
 * WHAT IT DOES NOT DO: it books nothing and invents nothing. A day with no
 * recorded entry stays a plain day, the booking actions stay disabled and named
 * exactly as the page names them today, and no availability is shown — there is
 * no agent-facing scheduling contract. The one write is the agent's OWN plan
 * (add · done · edit · remove), recorded in the demo planner journal; the
 * office's recorded appointments stay read-only beside it.
 *
 * ACCESSIBILITY: the month is a real table (weekday headers + day cells), each
 * marked day is a button with a full text summary behind its mark, and the grid
 * carries the standard arrow-key movement (Left/Right a day, Up/Down a week,
 * Home/End the week's ends, PageUp/PageDown the month). Colour never carries the
 * meaning alone — every tone is also a state word in the detail and in the
 * mark's summary.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { AgentTask, Appointment } from "@/lib/api-client/agent";
import { appointmentStateLabel, manilaTime } from "@/lib/agent/agent-view";
import { isPlanDay, type AgentPlan } from "@/lib/agent/agent-plans";
import { PlanComposer, PlanRow } from "@/components/agent/agent-day-planner";
import {
  agentDayAriaSummary,
  agentDayLabel,
  agentDayWeekday,
  buildAgentCalendarEvents,
  defaultAgentMonthKey,
  firstAgentEventDay,
  groupAgentEventsByDay,
} from "@/lib/agent/agent-calendar";
import {
  addMonths,
  buildMonthGrid,
  monthKeyFromDay,
  monthLabel,
} from "@/lib/calendar-grid";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** The one span in a month that changes with the reader's arrow keys. */
function shiftDay(dayKey: string, delta: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + delta));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(
    next.getUTCDate(),
  ).padStart(2, "0")}`;
}

function weekStart(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return shiftDay(dayKey, -dow);
}

export function AgentCalendar({
  appointments,
  tasks,
  plans,
  contactNames,
  todayKey,
  initialDay,
}: {
  appointments: Appointment[];
  tasks: AgentTask[];
  /** The signed-in agent's own plans, folded from the demo planner journal. */
  plans: AgentPlan[];
  /** The office's contact id → name, so the day detail can say who it is with. */
  contactNames: Record<string, string>;
  /** The recorded today's day (`yyyy-mm-dd`), passed in so SSR and the browser agree. */
  todayKey: string;
  /** A day the address asked to open on (the sign-in notice links here). */
  initialDay?: string;
}) {
  const events = useMemo(
    () => buildAgentCalendarEvents(appointments, tasks, plans, contactNames),
    [appointments, tasks, plans, contactNames],
  );
  const byDay = useMemo(() => groupAgentEventsByDay(events), [events]);
  const startDay = initialDay && isPlanDay(initialDay) ? initialDay : null;
  const [month, setMonth] = useState(() =>
    startDay ? monthKeyFromDay(startDay) : defaultAgentMonthKey(events, todayKey),
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(() => {
    if (startDay) return startDay;
    const key = defaultAgentMonthKey(events, todayKey);
    return firstAgentEventDay(groupAgentEventsByDay(events), key) ?? `${key}-01`;
  });
  const [focusDay, setFocusDay] = useState<string>(() => {
    if (startDay) return startDay;
    const key = defaultAgentMonthKey(events, todayKey);
    return firstAgentEventDay(groupAgentEventsByDay(events), key) ?? `${key}-01`;
  });
  const wantFocus = useRef(false);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());

  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const monthHasEvents = useMemo(
    () => [...byDay.keys()].some((key) => monthKeyFromDay(key) === month),
    [byDay, month],
  );
  const selectedEvents = selectedDay ? byDay.get(selectedDay) ?? [] : [];

  useEffect(() => {
    if (!wantFocus.current) return;
    wantFocus.current = false;
    dayRefs.current.get(focusDay)?.focus();
  }, [focusDay, month]);

  function showMonth(next: string, moveFocus: boolean) {
    setMonth(next);
    const target = firstAgentEventDay(byDay, next) ?? `${next}-01`;
    setSelectedDay(target);
    setFocusDay(target);
    if (moveFocus) wantFocus.current = true;
  }

  function selectDay(dayKey: string) {
    setSelectedDay(dayKey);
    setFocusDay(dayKey);
  }

  function onDayKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, dayKey: string) {
    let target: string | null = null;
    switch (event.key) {
      case "ArrowLeft":
        target = shiftDay(dayKey, -1);
        break;
      case "ArrowRight":
        target = shiftDay(dayKey, 1);
        break;
      case "ArrowUp":
        target = shiftDay(dayKey, -7);
        break;
      case "ArrowDown":
        target = shiftDay(dayKey, 7);
        break;
      case "Home":
        target = weekStart(dayKey);
        break;
      case "End":
        target = shiftDay(weekStart(dayKey), 6);
        break;
      case "PageUp":
      case "PageDown": {
        event.preventDefault();
        const next = addMonths(month, event.key === "PageUp" ? -1 : 1);
        const dayInMonth = dayKey.slice(8, 10);
        const candidate = `${next}-${dayInMonth}`;
        setMonth(next);
        setSelectedDay(candidate);
        setFocusDay(candidate);
        wantFocus.current = true;
        return;
      }
      default:
        return;
    }
    event.preventDefault();
    const targetMonth = monthKeyFromDay(target);
    if (targetMonth !== month) setMonth(targetMonth);
    setFocusDay(target);
    setSelectedDay(target);
    wantFocus.current = true;
  }

  const showToday = todayKey.slice(0, 7) === month;

  return (
    <div className="fv-cal">
      <div className="fv-cal__bar">
        <div className="fv-cal__nav">
          <button
            type="button"
            className="fv-cal__navbtn"
            aria-label="Previous month"
            onClick={() => showMonth(addMonths(month, -1), false)}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <p className="fv-cal__month" aria-live="polite">
            {monthLabel(month)}
          </p>
          <button
            type="button"
            className="fv-cal__navbtn"
            aria-label="Next month"
            onClick={() => showMonth(addMonths(month, 1), false)}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="fv-cal__today"
            onClick={() => showMonth(monthKeyFromDay(todayKey), false)}
          >
            This month
          </button>
        </div>
        <p className="fv-cal__hint">
          <CalendarDays size={16} aria-hidden="true" />
          <span>
            {monthHasEvents
              ? "A marked day already holds something — tap it to see what."
              : "Nothing is recorded for this month yet."}
          </span>
        </p>
      </div>

      <div className="fv-cal__columns">
        <div className="fv-cal__gridwrap">
          <table className="fv-cal__grid">
            <caption className="visually-hidden">{monthLabel(month)} — recorded activity</caption>
            <thead>
              <tr>
                {WEEKDAYS.map((day) => (
                  <th key={day} scope="col">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((week) => (
                <tr key={week.key}>
                  {week.days.map((day) => {
                    const dayEvents = byDay.get(day.key) ?? [];
                    const isToday = day.key === todayKey;
                    const isSelected = day.key === selectedDay;
                    return (
                      <td key={day.key}>
                        <button
                          type="button"
                          ref={(el) => {
                            if (el) dayRefs.current.set(day.key, el);
                            else dayRefs.current.delete(day.key);
                          }}
                          className="fv-cal__day"
                          data-today={isToday ? "yes" : undefined}
                          data-selected={isSelected ? "yes" : undefined}
                          data-in-month={day.inMonth ? "yes" : "no"}
                          tabIndex={day.key === focusDay ? 0 : -1}
                          aria-pressed={isSelected}
                          aria-label={agentDayAriaSummary(day.key, dayEvents)}
                          onClick={() => selectDay(day.key)}
                          onKeyDown={(event) => onDayKeyDown(event, day.key)}
                        >
                          <span className="fv-cal__num" aria-hidden="true">
                            {day.day}
                          </span>
                          {dayEvents.length > 0 ? (
                            <span className="fv-cal__marks" aria-hidden="true">
                              {dayEvents.slice(0, 3).map((event) => (
                                <span
                                  key={event.id}
                                  className="fv-cal__dot"
                                  data-tone={event.tone}
                                />
                              ))}
                              {dayEvents.length > 3 ? (
                                <span className="fv-cal__plus">+{dayEvents.length - 3}</span>
                              ) : null}
                            </span>
                          ) : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <p className="fv-cal__legend">
            <span className="fv-cal__key" data-tone="ok" /> Confirmed by the office
            <span className="fv-cal__key" data-tone="wait" /> Waiting for the office to confirm
            <span className="fv-cal__key" data-tone="neutral" /> A task due that day
            <span className="fv-cal__key" data-tone="plan" /> Your own plan
          </p>
        </div>

        <div className="fv-cal__detail">
          <div className="fv-cal__daypanel" aria-live="polite">
            <p className="fv-cal__detail-date">
              {selectedDay ? `${agentDayWeekday(selectedDay)} ${agentDayLabel(selectedDay)}` : "Pick a day"}
              {selectedDay === todayKey ? <span className="fv-cal__today-tag">Today</span> : null}
            </p>

            {selectedEvents.length > 0 ? (
              <ol className="fv-cal__events">
                {selectedEvents.map((event) =>
                  event.kind === "plan" && event.plan ? (
                    <PlanRow key={event.id} plan={event.plan} />
                  ) : (
                    <li className="fv-cal__event" key={event.id} data-tone={event.tone}>
                      {event.kind === "appointment" && event.appointment ? (
                        <>
                          {event.contact_name ? (
                            <p className="fv-cal__event-who">{event.contact_name}</p>
                          ) : null}
                          <p className="fv-cal__event-title">{event.appointment.title}</p>
                          <p className="fv-cal__event-meta">
                            {manilaTime(event.appointment.starts_at)} · {event.appointment.where}
                          </p>
                          {event.appointment.bring.length > 0 ? (
                            <p className="fv-cal__event-meta">
                              Bring: {event.appointment.bring.join(", ")}
                            </p>
                          ) : null}
                          <p className="fv-state">
                            <span
                              className={
                                event.appointment.status === "waiting"
                                  ? "ag-stage ag-stage--warm"
                                  : "ag-stage"
                              }
                            >
                              {appointmentStateLabel(event.appointment)}
                            </span>
                            <span className="ag-stage">{event.appointment.reason}</span>
                          </p>
                          {event.appointment.time_note ? (
                            <p className="fv-cal__event-note">{event.appointment.time_note}</p>
                          ) : null}
                        </>
                      ) : event.task ? (
                        <>
                          <p className="fv-cal__event-title">{event.task.title}</p>
                          <p className="fv-cal__event-meta">{event.task.meta}</p>
                          <p className="fv-state">
                            <span className="ag-stage">{event.task.done ? "Done" : "Task"}</span>
                          </p>
                        </>
                      ) : null}
                    </li>
                  ),
                )}
              </ol>
            ) : (
              <p className="fv-cal__empty">
                {showToday && selectedDay === todayKey
                  ? "Nothing is on today."
                  : "Nothing is on this day."}
              </p>
            )}
            {selectedDay ? <PlanComposer day={selectedDay} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
