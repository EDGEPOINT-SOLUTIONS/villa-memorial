import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { addDays, formatCalendarDate } from "@/lib/chapel-booking";
import { monthOf } from "@/lib/chapel-admin";
import {
  BURIAL_WEEKDAY_LABELS,
  LIGHT_PICKUP_STATE_LABEL,
  LIGHT_PICKUP_STATE_TONE,
  burialConflicts,
  burialMonthView,
  burialWeekView,
  conflictedBurialIds,
  formatParkTime,
  nearestBurialDays,
  shiftMonthAnchor,
  upcomingBurials,
  type BurialEntry,
  type BurialSchedule,
} from "@/lib/burial-calendar";
import { BurialAdmin } from "./burial-admin";

export type BurialCalendarView = "month" | "week";

export type BurialHrefFor = (overrides: {
  view?: BurialCalendarView;
  calDate?: string;
}) => string;

/**
 * The staff burial calendar (client minutes 2026-09-21, item 2).
 *
 * One recorded burial is one entry, and its light pickup is printed on that
 * entry — never as a second calendar event. The mount has a month grid and a
 * week grid, a preparation list of what is next, and the conflict strip that
 * points at what the recorded times collide on. It is read-only: no platform
 * service owns a burial schedule, so there is nothing to write through (see
 * lib/api-client/burial-schedule.ts).
 */
export function BurialCalendar({
  board,
  view,
  anchor,
  today,
  caseHrefs,
  hrefFor,
  canWrite = false,
}: {
  board: BurialSchedule;
  view: BurialCalendarView;
  anchor: string;
  today: string;
  caseHrefs: Map<string, string>;
  hrefFor: BurialHrefFor;
  /** A `scheduling:write` session gets the record/manage controls (item 2's missing verb). */
  canWrite?: boolean;
}) {
  const conflicts = burialConflicts(board.burials);
  const conflicted = conflictedBurialIds(conflicts);
  const withPickup = board.burials.filter((entry) => entry.light_pickup !== null).length;

  const monthView = burialMonthView(monthOf(anchor) || board.as_of, board.burials);
  const weekView = burialWeekView(anchor, board.burials);
  const upcoming = upcomingBurials(board.burials, anchor, 6);
  const nearest = nearestBurialDays(board.burials, anchor);

  const step = (delta: number): string =>
    view === "month"
      ? shiftMonthAnchor(anchor, delta)
      : addDays(anchor, delta * 7);

  const viewSwitch = (
    <nav className="btn-group" aria-label="Burial calendar view">
      {(["month", "week"] as const).map((option) => (
        <Link
          key={option}
          className={`btn btn--sm ${view === option ? "btn--primary" : "btn--secondary"}`}
          aria-current={view === option ? "true" : undefined}
          href={hrefFor({ view: option })}
        >
          {option === "month" ? "Month" : "Week"}
        </Link>
      ))}
    </nav>
  );

  const heading = view === "month" ? monthView.label : weekView.label;

  return (
    <div className="card" id="burial-calendar">
      <div className="card__header row row--space row--wrap">
        <div className="row row--wrap">
          <h2>Burial calendar</h2>
          <span className="text-sm text-muted">{heading}</span>
        </div>
        <div className="row row--wrap">
          {viewSwitch}
          <Link
            className="btn btn--ghost btn--sm"
            href={hrefFor({ calDate: step(-1) })}
            aria-label={view === "month" ? "Previous month" : "Previous week"}
          >
            ‹
          </Link>
          <Link
            className="btn btn--ghost btn--sm"
            href={hrefFor({ calDate: step(1) })}
            aria-label={view === "month" ? "Next month" : "Next week"}
          >
            ›
          </Link>
          <form method="get" action="/staff/schedule" className="row">
            <input type="hidden" name="cal" value={view} />
            <input
              type="date"
              name="calDate"
              aria-label="Jump to a burial day"
              defaultValue={anchor}
              className="text-sm"
            />
            <Button type="submit" variant="secondary" size="sm">
              Go
            </Button>
          </form>
        </div>
      </div>

      <div className="card__body stack-4">
        <p className="text-sm text-muted mb-0">
          {board.burials.length} burial{board.burials.length === 1 ? "" : "s"} recorded ·{" "}
          {withPickup} with a light pickup.{" "}
          {canWrite
            ? "Recorded here — a burial and its light pickup are the office's to add and move."
            : "Read-only for this session — records need the scheduling:write permission."}
        </p>

        {/* What the recorded times collide on: a shared burial slot, a crew set for
            two pickups at once, a pickup before its own burial. */}
        {conflicts.length > 0 ? (
          <Alert
            tone="danger"
            title={`Schedule conflict — ${conflicts.length} recorded`}
          >
            <ul className="sched-overlaps">
              {conflicts.map((conflict, index) => (
                <li key={`${conflict.kind}-${conflict.date}-${index}`}>
                  {conflict.kind === "burial_slot"
                    ? "Burial slot · "
                    : conflict.kind === "pickup_crew"
                      ? "Light pickup · "
                      : "Pickup order · "}
                  {conflict.message}
                </li>
              ))}
            </ul>
          </Alert>
        ) : null}

        {board.burials.length === 0 ? (
          <EmptyState
            title="No burial recorded"
            hint="The office has not scheduled a burial yet — the sheet will fill as cases reach interment."
          />
        ) : view === "month" ? (
          <div className="burial-month" aria-label={`Burials in ${monthView.label}`}>
            {BURIAL_WEEKDAY_LABELS.map((label) => (
              <div key={label} className="burial-month__head" aria-hidden="true">
                {label}
              </div>
            ))}
            {monthView.weeks.flat().map((cell) => {
              const dayConflicts = cell.burials.filter((entry) => conflicted.has(entry.id));
              return (
                <div
                  key={cell.date}
                  className={
                    "burial-day" +
                    (cell.inMonth ? "" : " burial-day--outside") +
                    (cell.date === today ? " burial-day--today" : "")
                  }
                  aria-label={
                    dayConflicts.length > 0
                      ? `${formatCalendarDate(cell.date)} · ${cell.burials.length} burials · conflict`
                      : undefined
                  }
                >
                  <span className="burial-day__num">{Number(cell.date.slice(8, 10))}</span>
                  {cell.burials.length > 0 ? (
                    <ul className="burial-events">
                      {cell.burials.map((entry) => (
                        <li key={entry.id}>
                          <BurialEvent
                            entry={entry}
                            conflicted={conflicted.has(entry.id)}
                            caseHrefs={caseHrefs}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="burial-week">
            {weekView.days.map((day) => (
              <div
                key={day.date}
                className={
                  "burial-week__day" + (day.date === today ? " burial-week__day--today" : "")
                }
              >
                <div className="burial-week__head">
                  <span className="burial-week__label">{day.label}</span>
                  {day.burials.length > 0 ? (
                    <Badge tone="neutral">{day.burials.length}</Badge>
                  ) : null}
                </div>
                {day.burials.length > 0 ? (
                  <ul className="burial-events">
                    {day.burials.map((entry) => (
                      <li key={entry.id}>
                        <BurialEvent
                          entry={entry}
                          conflicted={conflicted.has(entry.id)}
                          caseHrefs={caseHrefs}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="burial-week__empty">No burial</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="burial-prep">
          <div className="burial-prep__head row row--space row--wrap">
            <h3>Preparation list</h3>
            <span className="text-sm text-muted">next burials, earliest first</span>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted mb-0">
              No burial recorded on or after {formatCalendarDate(anchor)}.
              {nearest.previous ? (
                <>
                  {" "}
                  The last recorded burial was {formatCalendarDate(nearest.previous)}.
                </>
              ) : null}
            </p>
          ) : (
            <ul className="burial-prep__list">
              {upcoming.map((entry) => (
                <li key={entry.id} className="burial-prep__item">
                  <div className="burial-prep__when">
                    <strong>{formatCalendarDate(entry.date)}</strong>
                    <span>{formatParkTime(entry.time)}</span>
                  </div>
                  <div className="burial-prep__who">
                    <strong>
                      {caseHrefs.has(entry.case_number) ? (
                        <Link href={caseHrefs.get(entry.case_number) as string}>
                          {entry.deceased_name}
                        </Link>
                      ) : (
                        entry.deceased_name
                      )}
                    </strong>
                    <span className="text-sm text-muted">
                      {entry.lot_number} · Section {entry.section} · {entry.coordinator}
                    </span>
                  </div>
                  <div className="burial-prep__pickup">
                    {entry.light_pickup ? (
                      <>
                        <Badge tone={LIGHT_PICKUP_STATE_TONE[entry.light_pickup.state]}>
                          {LIGHT_PICKUP_STATE_LABEL[entry.light_pickup.state]}
                        </Badge>
                        <span>
                          Lights {formatParkTime(entry.light_pickup.time)} ·{" "}
                          {entry.light_pickup.crew}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-muted">No light pickup recorded</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* The missing verb (client minutes item 2): record a burial and move its light
            pickup through scheduled → in_progress → done. Write scope only. */}
        {canWrite ? <BurialAdmin burials={board.burials} defaultDate={anchor} /> : null}
      </div>
    </div>
  );
}

/** One burial's cell content — the pickup rides on its own burial, one record. */
function BurialEvent({
  entry,
  conflicted,
  caseHrefs,
}: {
  entry: BurialEntry;
  conflicted: boolean;
  caseHrefs: Map<string, string>;
}) {
  const href = caseHrefs.get(entry.case_number);
  return (
    <span className={"burial-event" + (conflicted ? " burial-event--conflict" : "")}>
      <span className="burial-event__name">
        {href ? <Link href={href}>{entry.deceased_name}</Link> : entry.deceased_name}
      </span>
      <span className="burial-event__time">{formatParkTime(entry.time)}</span>
      <span className="burial-event__lot">
        {entry.lot_number} · Section {entry.section}
      </span>
      {entry.light_pickup ? (
        <span className="burial-event__pickup">
          Lights {formatParkTime(entry.light_pickup.time)} · {entry.light_pickup.crew}
        </span>
      ) : (
        <span className="burial-event__nopickup">No light pickup recorded</span>
      )}
    </span>
  );
}
