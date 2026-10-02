"use client";

/**
 * The family visit calendar — the month at a glance, and one tap on a day to see
 * what that day is for.
 *
 * WHY A CALENDAR (captain, 2026-09-30): the family stopped reading a list of
 * times and now reads the month, so a day that already holds something is
 * visible before a word is read. Every recorded appointment is marked on its own
 * day (its Asia/Manila day — `lib/family/family-calendar.ts`), and selecting the
 * day shows the detail: who it is for, what it is, the time, the place, the
 * state and the office's own words, with the way to ask for a new visit from
 * that same day.
 *
 * WHAT IT DOES NOT DO: it invents no availability. There is no scheduling
 * service behind this screen, so a day with nothing on it stays a plain day and
 * the request block says plainly that the office confirms the day by phone —
 * never that a slot is free.
 *
 * THE HOUSEHOLD (captain, 2026-09-30): one account looks after several loved
 * ones. The scope switcher on the page decides whose month is shown; when more
 * than one person is in view, every event names the loved one it belongs to.
 *
 * ACCESSIBILITY: the month is a real table (weekday headers + day cells), each
 * marked day is a button with a full text summary behind its mark, and the grid
 * carries the standard arrow-key movement (Left/Right a day, Up/Down a week,
 * Home/End the week's ends, PageUp/PageDown the month). Selection is announced
 * in the detail region, and colour never carries the meaning alone — every tone
 * is also a state word in the detail and in the mark's summary.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { FAMILY_HELP } from "@/lib/family/contact";
import {
  addMonths,
  buildMonthGrid,
  dayAriaSummary,
  defaultMonthKey,
  firstEventDay,
  groupByDay,
  monthKeyFromDay,
  monthLabel,
  visitTone,
  type CalendarAppointment,
} from "@/lib/family/family-calendar";
import {
  familyAppointmentState,
  familyInstantDateLabel,
  familyInstantTimeLabel,
  familyInstantWeekday,
} from "@/lib/family/family-view";
import { QuietAction } from "@/components/family/family-ui";
import { FamilyVisitRequest, type VisitRequestPerson } from "@/components/family/family-visit-request";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** The person the calendar can filter/attribute to (the household's own shape). */
export type CalendarPerson = VisitRequestPerson;

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

export function FamilyVisitCalendar({
  people,
  appointments,
  todayKey,
  scopePersonId,
}: {
  people: CalendarPerson[];
  appointments: CalendarAppointment[];
  /** The park's own today, computed on the server so SSR and the browser agree. */
  todayKey: string;
  /** The focused loved one's id from the address, if the family chose one. */
  scopePersonId?: string;
}) {
  const byDay = useMemo(() => groupByDay(appointments), [appointments]);
  const [month, setMonth] = useState(() => defaultMonthKey(appointments, todayKey));
  const [selectedDay, setSelectedDay] = useState<string | null>(() => {
    const key = defaultMonthKey(appointments, todayKey);
    return firstEventDay(groupByDay(appointments), key) ?? key + "-01";
  });
  const [focusDay, setFocusDay] = useState<string>(() => {
    const key = defaultMonthKey(appointments, todayKey);
    return firstEventDay(groupByDay(appointments), key) ?? key + "-01";
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
    const target = firstEventDay(byDay, next) ?? `${next}-01`;
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
              ? "A marked day holds something — tap it."
              : "Nothing is recorded for this month yet."}
          </span>
        </p>
      </div>

      <div className="fv-cal__columns">
        <div className="fv-cal__gridwrap">
          <table className="fv-cal__grid">
            <caption className="visually-hidden">
              {monthLabel(month)} — recorded visits
            </caption>
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
                    const events = byDay.get(day.key) ?? [];
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
                          aria-label={dayAriaSummary(day.key, events)}
                          onClick={() => selectDay(day.key)}
                          onKeyDown={(event) => onDayKeyDown(event, day.key)}
                        >
                          <span className="fv-cal__num" aria-hidden="true">
                            {day.day}
                          </span>
                          {events.length > 0 ? (
                            <span className="fv-cal__marks" aria-hidden="true">
                              {events.slice(0, 3).map((event) => (
                                <span
                                  key={event.id}
                                  className="fv-cal__dot"
                                  data-tone={visitTone(event.state)}
                                />
                              ))}
                              {events.length > 3 ? (
                                <span className="fv-cal__plus">+{events.length - 3}</span>
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
            <span className="fv-cal__key" data-tone="wait" /> Waiting for the office
            <span className="fv-cal__key" data-tone="neutral" /> Happened
          </p>
        </div>

        <div className="fv-cal__detail">
          <div className="fv-cal__daypanel" aria-live="polite">
            <p className="fv-cal__detail-date">
              {selectedDay
                ? `${familyInstantWeekday(`${selectedDay}T00:00:00+08:00`)} ${familyInstantDateLabel(
                    `${selectedDay}T00:00:00+08:00`,
                  )}`
                : "Pick a day"}
              {selectedDay === todayKey ? <span className="fv-cal__today-tag">Today</span> : null}
            </p>

            {selectedEvents.length > 0 ? (
              <ol className="fv-cal__events">
                {selectedEvents.map((event) => (
                  <li className="fv-cal__event" key={event.id} data-tone={visitTone(event.state)}>
                    {people.length > 1 ? (
                      <p className="fv-cal__event-who">{event.person_name}</p>
                    ) : null}
                    <p className="fv-cal__event-title">{event.title}</p>
                    <p className="fv-cal__event-meta">
                      {familyInstantTimeLabel(event.starts_at)} · {event.where}
                    </p>
                    {event.bring.length > 0 ? (
                      <p className="fv-cal__event-meta">Bring: {event.bring.join(", ")}</p>
                    ) : null}
                    <p className="fv-state">
                      <span
                        className={event.state === "waiting" ? "ag-stage ag-stage--warm" : "ag-stage"}
                      >
                        {familyAppointmentState(event.state)}
                      </span>
                      <span className="ag-stage">{event.reason}</span>
                    </p>
                    {event.next || event.discussed ? (
                      <p className="fv-cal__event-note">{event.next ?? event.discussed}</p>
                    ) : null}
                    <div className="fv-cal__event-action">
                      <QuietAction href={FAMILY_HELP.phoneHref} label={event.action_label} />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="fv-cal__empty">
                {showToday && selectedDay === todayKey
                  ? "Nothing is on today."
                  : "Nothing is on this day."}
              </p>
            )}
          </div>

          {selectedDay ? (
            <FamilyVisitRequest
              people={people}
              day={selectedDay}
              defaultPersonId={scopePersonId ?? people[0]?.id}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
