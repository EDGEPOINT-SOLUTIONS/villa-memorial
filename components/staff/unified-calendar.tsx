import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  CALENDAR_KINDS,
  CALENDAR_KIND_LABEL,
  CALENDAR_WEEKDAYS,
  calendarMonthGrid,
  formatMonthLabel,
  groupByDay,
  nextDayWithItems,
  type CalendarItem,
  type CalendarKind,
  type CalendarTone,
} from "@/lib/calendar-day";
import { formatParkTime } from "@/lib/burial-calendar";
import { formatCalendarDay } from "@/lib/chapel-booking";
import { addMonths } from "@/lib/chapel-admin";

/** The chip a day paints per kind: the type's NAME, never a bare dot. */
const CHIP_SHORT: Record<CalendarKind, string> = {
  burial: "Burial",
  light_pickup: "Light pickup",
  chapel: "Chapel",
  trip: "Vehicle trip",
  payment_due: "Payment due",
  work_order: "Work order",
};

const TONE_BADGE: Record<CalendarTone, "neutral" | "success" | "warning" | "danger" | "info"> = {
  neutral: "neutral",
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
};

export type CalendarHrefFor = (overrides: { month?: string; date?: string }) => string;

/**
 * The one labelled staff calendar (admin plan wave 1).
 *
 * A month grid where every mark is a NAMED day type, and a click opens the
 * day's whole detail in the panel beside it. Server-rendered and link-driven
 * (`?date=` / `?calDate=`), so the day is shareable and the screen works with
 * JavaScript off — the same grammar as the burial calendar it extends.
 */
export function UnifiedCalendar({
  month,
  selectedDate,
  items,
  today,
  hrefFor,
  heading = "The month",
}: {
  /** "YYYY-MM" the grid shows. */
  month: string;
  /** The day whose detail panel is open. */
  selectedDate: string;
  items: readonly CalendarItem[];
  /** Today at the park ("YYYY-MM-DD"). */
  today: string;
  hrefFor: CalendarHrefFor;
  heading?: string;
}) {
  const grid = calendarMonthGrid(month);
  const byDay = groupByDay(items);
  const selected = byDay.get(selectedDate) ?? [];
  const nearest = nextDayWithItems(items, selectedDate);
  const kindsPresent = CALENDAR_KINDS.filter((kind) => items.some((item) => item.kind === kind));

  return (
    <div className="unified-cal" id="calendar">
      <div className="unified-cal__head">
        <div className="unified-cal__title">
          <h2>{heading}</h2>
          <span className="text-sm text-muted">{formatMonthLabel(month)}</span>
        </div>
        <nav className="row row--wrap" aria-label="Calendar month">
          <Link className="btn btn--secondary btn--sm" href={hrefFor({ month: addMonths(month, -1) })} aria-label="Previous month">
            ‹
          </Link>
          <Link className="btn btn--secondary btn--sm" href={hrefFor({ month: addMonths(month, 1) })} aria-label="Next month">
            ›
          </Link>
          <Link className="btn btn--secondary btn--sm" href={hrefFor({ month: today.slice(0, 7), date: today })}>
            Today
          </Link>
        </nav>
      </div>

      <div className="unified-cal__body">
        <div className="unified-cal__grid" role="grid" aria-label={`${formatMonthLabel(month)} calendar`}>
          {CALENDAR_WEEKDAYS.map((day) => (
            <div key={day} className="unified-cal__dow" role="columnheader">
              {day}
            </div>
          ))}
          {grid.flat().map((date, index) => {
            if (!date) return <div key={`pad-${index}`} className="unified-cal__cell unified-cal__cell--pad" />;
            const dayItems = byDay.get(date) ?? [];
            const kinds = [...new Set(dayItems.map((item) => item.kind))];
            const isToday = date === today;
            const isSelected = date === selectedDate;
            return (
              <Link
                key={date}
                href={hrefFor({ date })}
                className={`unified-cal__cell${isToday ? " unified-cal__cell--today" : ""}${
                  isSelected ? " unified-cal__cell--selected" : ""
                }`}
                aria-current={isSelected ? "date" : undefined}
              >
                <span className="unified-cal__day">{Number(date.slice(8, 10))}</span>
                <span className="unified-cal__chips">
                  {kinds.slice(0, 2).map((kind) => (
                    <span key={kind} className={`unified-cal__chip unified-cal__chip--${kind}`}>
                      {dayItems.filter((item) => item.kind === kind).length > 1
                        ? `${CHIP_SHORT[kind]} ×${dayItems.filter((item) => item.kind === kind).length}`
                        : CHIP_SHORT[kind]}
                    </span>
                  ))}
                  {kinds.length > 2 ? <span className="unified-cal__more">+{kinds.length - 2}</span> : null}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="unified-cal__panel" aria-live="polite">
          <div className="unified-cal__panel-head">
            <div>
              <h3>{formatCalendarDay(selectedDate)}</h3>
              <span className="text-sm text-muted">
                {selected.length === 0
                  ? "Nothing recorded"
                  : `${selected.length} item${selected.length === 1 ? "" : "s"}`}
              </span>
            </div>
            <Link className="btn btn--ghost btn--sm" href={hrefFor({})}>
              Close
            </Link>
          </div>

          {selected.length === 0 ? (
            <p className="unified-cal__empty">
              Nothing is recorded on this day.
              {nearest ? (
                <>
                  {" "}
                  The nearest recorded day is{" "}
                  <Link className="link-muted" href={hrefFor({ date: nearest })}>
                    {formatCalendarDay(nearest)}
                  </Link>
                  .
                </>
              ) : null}
            </p>
          ) : (
            <ul className="unified-cal__items">
              {selected.map((item) => (
                <li key={item.id} className="cal-item">
                  <span className="cal-item__time">{item.time ? formatParkTime(item.time) : "—"}</span>
                  <div className="cal-item__body">
                    <Badge tone={TONE_BADGE[item.tone]}>{CALENDAR_KIND_LABEL[item.kind]}</Badge>
                    <div className="cal-item__title">{item.title}</div>
                    <div className="cal-item__detail">{item.detail}</div>
                  </div>
                  {item.href ? (
                    <Link className="btn btn--secondary btn--sm" href={item.href}>
                      Open
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {kindsPresent.length > 0 ? (
            <ul className="unified-cal__legend" aria-label="Day types">
              {kindsPresent.map((kind) => (
                <li key={kind}>
                  <i className={`unified-cal__dot unified-cal__dot--${kind}`} aria-hidden="true" />
                  {CALENDAR_KIND_LABEL[kind]}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
