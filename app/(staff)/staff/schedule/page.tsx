import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { CancelBookingButton, NewBookingForm } from "@/components/schedule-actions";
import { BurialCalendar, type BurialCalendarView, type BurialHrefFor } from "./burial-calendar";
import { ChapelAvailability } from "./chapel-availability";
import { ChapelBookings } from "./chapel-bookings";
import { ChapelSettings } from "./chapel-settings";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { ApiError } from "@/lib/api-client/api-error";
import { loadBurialSchedule } from "@/lib/api-client/burial-schedule";
import { listCases } from "@/lib/api-client/operations";
import { getChapelAdminView } from "@/lib/api-client/chapel-admin";
import { addDays, formatCalendarDay, isCalendarDate } from "@/lib/chapel-booking";
import type { BurialSchedule } from "@/lib/burial-calendar";
import { monthOf } from "@/lib/chapel-admin";
import { listBookings, listResources, type Booking } from "@/lib/api-client/scheduling";
import {
  bookingDates,
  bookingStartDate,
  bookingTimeLabel,
  bookingWindowLabel,
  bookingsOnDay,
  conflictingBookings,
  nearestBookingDays,
  parkToday,
  scheduleDayLabel,
} from "@/lib/schedule-board";

export const metadata = { title: "Schedule — Admin Portal" };

/**
 * Staff Schedule — the day board first, then the week at a glance, then the
 * chapel surfaces that run the park's rooms (settings, availability, bookings).
 *
 * The board is ONE view of the bookings service (app/api/schedule/*, frozen
 * booking-events-v1): the selected day's bookings across every resource, with
 * the service's own overlap flag shown on the row and in the strip above. The
 * day lives in `?date=`, so a day is linkable and the screen is server-rendered.
 */

function bookingCountLabel(count: number): string {
  if (count === 0) return "";
  return ` · ${count} booking${count === 1 ? "" : "s"}`;
}

function backHref(date: string): string {
  return `/staff/schedule?date=${date}`;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; cal?: string; calDate?: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["scheduling:read"])) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Schedule" />
        <PageSection>
          <ForbiddenState requiredScopes={["scheduling:read"]} />
        </PageSection>
      </>
    );
  }
  const canWrite = hasAnyScope(session.scopes, ["scheduling:write"]);

  let bookings: Booking[];
  let resources;
  let chapelAdmin: Awaited<ReturnType<typeof getChapelAdminView>>;
  try {
    [bookings, resources, chapelAdmin] = await Promise.all([
      listBookings(),
      listResources(),
      getChapelAdminView(),
    ]);
  } catch {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Schedule" />
        <PageSection>
          <ErrorState message="Unable to load the schedule." />
        </PageSection>
      </>
    );
  }

  const params = (await searchParams) ?? {};
  const today = parkToday();
  const requested = typeof params.date === "string" ? params.date : "";
  const selectedDate = isCalendarDate(requested) ? requested : today;

  // The burial calendar carries its own anchor (`calDate`) so moving it never moves
  // the day board. It reads the office's recorded sheet; live mode answers 503 and
  // the rest of the Schedule surface stays usable.
  let burialBoard: BurialSchedule | null = null;
  let burialError: string | null = null;
  try {
    burialBoard = await loadBurialSchedule();
  } catch (error) {
    burialError =
      error instanceof ApiError ? error.message : "Unable to load the burial calendar.";
  }

  // Case links are best-effort: a failed case read leaves the name as plain text.
  const caseHrefs = new Map<string, string>();
  if (burialBoard) {
    try {
      for (const kase of await listCases()) {
        caseHrefs.set(kase.case_number, `/staff/cases/${encodeURIComponent(kase.id)}`);
      }
    } catch {
      // The burial rows fall back to the deceased name without a link.
    }
  }

  const calView: BurialCalendarView = params.cal === "week" ? "week" : "month";
  const requestedCal = typeof params.calDate === "string" ? params.calDate : "";
  const burialAnchor = isCalendarDate(requestedCal)
    ? requestedCal
    : burialBoard && isCalendarDate(burialBoard.as_of)
      ? burialBoard.as_of
      : today;
  const burialHrefFor: BurialHrefFor = (overrides) => {
    const query = new URLSearchParams();
    query.set("date", selectedDate);
    if ((overrides.view ?? calView) === "week") query.set("cal", "week");
    query.set("calDate", overrides.calDate ?? burialAnchor);
    return `/staff/schedule?${query.toString()}`;
  };

  const dayBookings = bookingsOnDay(bookings, selectedDate);
  const conflicts = conflictingBookings(bookings);
  const { previous, next } = nearestBookingDays(bookings, selectedDate);
  const active = bookings.filter((b) => b.status === "confirmed").length;

  const chapelIds = new Set(chapelAdmin.chapels.map((chapel) => chapel.id));
  const todayMonth = monthOf(today);

  // Week at a glance: the same bookings, laid over the next seven days.
  const weekDays: string[] = [];
  for (let i = 0; i < 7; i++) weekDays.push(addDays(today, i));
  const weekBookings = bookings.filter(
    (b) => b.status === "confirmed" && bookingDates(b).some((day) => weekDays.includes(day)),
  );

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Schedule"
        actions={
          <span className="text-sm text-muted">
            {active} active · {conflicts.length} overlap{conflicts.length === 1 ? "" : "s"}
          </span>
        }
      />

      {/* Overlap strip: every booking the service has flagged, wherever it sits.
          The flag is booking-events-v1's (cut line #3) — shown, never recomputed. */}
      {conflicts.length > 0 ? (
        <PageSection>
          <Alert
            tone="danger"
            title={`Overlap warning — ${conflicts.length} flagged booking${
              conflicts.length === 1 ? "" : "s"
            }`}
          >
            <ul className="sched-overlaps">
              {conflicts.map((booking) => (
                <li key={booking.id}>
                  <Link href={backHref(bookingStartDate(booking))}>
                    {booking.resource_name} · {booking.title} · {bookingWindowLabel(booking)}
                  </Link>
                </li>
              ))}
            </ul>
          </Alert>
        </PageSection>
      ) : null}

      {/* The day board — the answer at a glance. */}
      <PageSection>
        <div className="card" id="sched-day-board">
          <div className="card__header row row--space row--wrap">
            <div className="row row--wrap">
              <h2>Day board</h2>
              {selectedDate === today ? <Badge tone="info">Today</Badge> : null}
              <span className="text-sm text-muted">
                {scheduleDayLabel(selectedDate)}
                {bookingCountLabel(dayBookings.length)}
              </span>
            </div>
            <div className="row row--wrap">
              <Link
                className="btn btn--ghost btn--sm"
                href={backHref(addDays(selectedDate, -1))}
                aria-label="Previous day"
              >
                ‹
              </Link>
              {selectedDate !== today ? (
                <Link className="btn btn--ghost btn--sm" href={backHref(today)}>
                  Today
                </Link>
              ) : null}
              <Link
                className="btn btn--ghost btn--sm"
                href={backHref(addDays(selectedDate, 1))}
                aria-label="Next day"
              >
                ›
              </Link>
              <form method="get" action="/staff/schedule" className="row">
                <input
                  type="date"
                  name="date"
                  aria-label="Jump to a day"
                  defaultValue={selectedDate}
                  className="text-sm"
                />
                <Button type="submit" variant="secondary" size="sm">
                  Go
                </Button>
              </form>
            </div>
          </div>
          <div className="card__body stack-4">
            {dayBookings.length === 0 ? (
              <>
                <EmptyState
                  title="Nothing on this day"
                  hint="No booking covers this date — every resource is free."
                />
                {previous || next ? (
                  <div className="row row--wrap text-sm">
                    {previous ? (
                      <Link href={backHref(previous.date)}>
                        Last booked day · {formatCalendarDay(previous.date)} ({previous.count})
                      </Link>
                    ) : null}
                    {next ? (
                      <Link href={backHref(next.date)}>
                        Next booked day · {formatCalendarDay(next.date)} ({next.count})
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="table-wrapper" tabIndex={0}>
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Time</th>
                      <th scope="col">Resource</th>
                      <th scope="col">Booking</th>
                      <th scope="col">Case</th>
                      <th scope="col">State</th>
                      {canWrite ? <th scope="col">Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {dayBookings.map((booking) => (
                      <tr key={booking.id}>
                        <td className="text-sm">{bookingTimeLabel(booking, selectedDate)}</td>
                        <td>
                          <strong>{booking.resource_name}</strong>
                        </td>
                        <td>
                          {booking.title}
                          {booking.status === "confirmed" && booking.conflicting ? (
                            <div>
                              <Badge tone="danger">Overlap</Badge>
                            </div>
                          ) : null}
                        </td>
                        <td className="text-sm">{booking.case_number ?? "—"}</td>
                        <td>
                          <Badge tone={booking.status === "confirmed" ? "success" : "neutral"}>
                            {booking.status === "confirmed" ? "Confirmed" : "Cancelled"}
                          </Badge>
                        </td>
                        {canWrite ? (
                          <td>
                            {booking.status === "confirmed" ? (
                              <CancelBookingButton
                                bookingId={booking.id}
                                chapel={chapelIds.has(booking.resource_id)}
                              />
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </PageSection>

      {/* Week at a glance: the same bookings over the next seven days. */}
      <PageSection>
        <div className="card">
          <div className="card__header row row--space">
            <h2>Week at a glance</h2>
            <span className="text-sm text-muted">next 7 days · confirmed only</span>
          </div>
          <div className="card__body">
            {weekBookings.length === 0 ? (
              <p className="text-sm text-muted">
                No confirmed booking in the next 7 days — the day board still shows any day.
              </p>
            ) : (
              <div className="week-matrix">
                <div className="week-matrix__row week-matrix__row--head">
                  <span className="week-matrix__resource">Resource</span>
                  {weekDays.map((day) => (
                    <span key={day} className="week-matrix__day">
                      {formatCalendarDay(day)}
                    </span>
                  ))}
                </div>
                {resources.map((resource) => (
                  <div key={resource.id} className="week-matrix__row">
                    <span className="week-matrix__resource">{resource.name}</span>
                    {weekDays.map((day) => {
                      const listed = weekBookings.filter(
                        (b) => b.resource_id === resource.id && bookingDates(b).includes(day),
                      );
                      // A flagged booking wins the cell, so an overlap is never the
                      // one a crowded day hides.
                      const booking = listed.find((b) => b.conflicting) ?? listed[0];
                      return (
                        <span key={day} className="week-matrix__cell">
                          {booking ? (
                            <span
                              className={
                                "week-matrix__chip" +
                                (booking.conflicting ? " week-matrix__chip--conflict" : "")
                              }
                              title={
                                booking.title +
                                " · " +
                                (bookingWindowLabel(booking) || "") +
                                (booking.conflicting ? " (overlap flagged)" : "")
                              }
                            >
                              {bookingTimeLabel(booking, day)}
                            </span>
                          ) : (
                            <span className="week-matrix__empty">—</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PageSection>

      {/* Burial calendar: the client's minutes item 2 — burial dates with each
          burial's light pickup, and the recorded conflicts between them. */}
      <PageSection>
        {burialBoard ? (
          <BurialCalendar
            board={burialBoard}
            view={calView}
            anchor={burialAnchor}
            today={today}
            caseHrefs={caseHrefs}
            hrefFor={burialHrefFor}
          />
        ) : (
          <div className="card" id="burial-calendar">
            <div className="card__header">
              <h2>Burial calendar</h2>
            </div>
            <div className="card__body">
              <Alert tone="warning" title="Burial calendar unavailable">
                {burialError ?? "Unable to load the burial calendar."}
              </Alert>
            </div>
          </div>
        )}
      </PageSection>

      {canWrite ? (
        <PageSection>
          <NewBookingForm resources={resources} />
        </PageSection>
      ) : null}

      {/* The park's chapel surfaces — same store the customer booking step reads. */}
      <PageSection>
        <ChapelSettings chapels={chapelAdmin.chapels} canWrite={canWrite} />
      </PageSection>

      <PageSection>
        <ChapelAvailability
          chapels={chapelAdmin.chapels}
          blocks={chapelAdmin.blocks}
          availability={chapelAdmin.availability}
          initialMonth={todayMonth}
          canWrite={canWrite}
        />
      </PageSection>

      <PageSection>
        <ChapelBookings bookings={chapelAdmin.bookings} canWrite={canWrite} />
      </PageSection>
    </>
  );
}
