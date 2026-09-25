import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { StatCard } from "@/components/kit";
import { ApiError } from "@/lib/api-client/api-error";
import { loadDispatchBoard } from "@/lib/api-client/dispatch";
import { listCases } from "@/lib/api-client/operations";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { addDays, isCalendarDate } from "@/lib/chapel-booking";
import {
  dispatchSummary,
  driverDayState,
  driverOf,
  driversOnDay,
  recordedTripDays,
  TRIP_KIND_LABEL,
  TRIP_STATUSES,
  TRIP_STATUS_LABEL,
  TRIP_STATUS_TONE,
  tripsOnDay,
  vehicleOf,
  VEHICLE_STATE_LABEL,
  VEHICLE_STATE_TONE,
  VEHICLE_TYPE_LABEL,
  type DispatchBoard,
  type DispatchTrip,
} from "@/lib/dispatch";
import { hasAnyScope } from "@/lib/rbac/nav";
import { scheduleDayLabel, timeRangeLabel } from "@/lib/schedule-board";

export const metadata = { title: "Vehicle dispatch — Admin Portal" };

/**
 * Staff Vehicle dispatch (`/staff/dispatch`, PRD S13, blueprint §14/§36).
 *
 * The office's day of driving, as a real screen: the fleet and its state, the drivers
 * on duty, and the trips tied to cases — a day view (the sheet in time order) and an
 * assignment view (vehicle → driver → trips, then each driver's load). The records come
 * from the recorded dispatch sheet (`lib/api-client/dispatch.ts`, PROVISIONAL) because
 * dispatch belongs to D5 scheduling-resources and no dispatch contract exists; live mode
 * answers 503 and the page renders that honestly.
 *
 * The board is READ-ONLY by design: there is nothing to write through. Assigning or
 * moving a trip is the office's own decision on its sheet until the scheduling service
 * grows the dispatch endpoints — the page says so instead of showing controls that
 * cannot work.
 */
const READ_ONLY_NOTE =
  "Assigning or moving a trip needs the dispatch service — this board records what the office has decided, and nothing here can be edited.";

type DispatchSearchParams = {
  date?: string | string[];
  view?: string | string[];
  status?: string | string[];
  vehicle?: string | string[];
};

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/** The nearest recorded day on either side — the pointer an empty day renders. */
function nearestRecordedDay(
  days: readonly string[],
  day: string,
): { previous: string | null; next: string | null } {
  let previous: string | null = null;
  let next: string | null = null;
  for (const candidate of days) {
    if (candidate < day) previous = candidate;
    else if (candidate > day && next === null) next = candidate;
  }
  return { previous, next };
}

function TripTable({
  trips,
  board,
  caseHrefs,
}: {
  trips: readonly DispatchTrip[];
  board: DispatchBoard;
  caseHrefs: Map<string, string>;
}) {
  return (
    <div className="table-wrapper" tabIndex={0}>
      <table className="table">
        <caption>
          The recorded trips, earliest first. Times are the park&rsquo;s own (Asia/Manila).
        </caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Trip</th>
            <th scope="col">Case</th>
            <th scope="col">Vehicle</th>
            <th scope="col">Driver</th>
            <th scope="col">Route</th>
            <th scope="col">State</th>
          </tr>
        </thead>
        <tbody>
          {trips.map((trip) => {
            const vehicle = vehicleOf(board.vehicles, trip.vehicle_id);
            const driver = driverOf(board.drivers, trip.driver_id);
            const href = trip.case_number ? caseHrefs.get(trip.case_number) : undefined;
            return (
              <tr key={trip.id}>
                <td className="text-sm nowrap">
                  {timeRangeLabel(trip.starts_at, trip.ends_at) ?? "—"}
                </td>
                <td>
                  <strong>{TRIP_KIND_LABEL[trip.kind]}</strong>
                  {trip.note ? <div className="text-sm text-muted">{trip.note}</div> : null}
                </td>
                <td className="text-sm">
                  {trip.case_number ? (
                    href ? (
                      <Link href={href}>
                        <code className="nowrap">{trip.case_number}</code>
                      </Link>
                    ) : (
                      <code className="nowrap">{trip.case_number}</code>
                    )
                  ) : (
                    "No case recorded"
                  )}
                </td>
                <td>
                  {vehicle ? <strong>{vehicle.name}</strong> : "Not on the fleet list"}
                  {vehicle ? <div className="text-sm text-muted">{vehicle.plate}</div> : null}
                </td>
                <td>{driver?.name ?? "No driver recorded"}</td>
                <td>
                  <span className="dispatch-route">
                    {trip.origin}
                    <span aria-hidden="true"> → </span>
                    {trip.destination}
                  </span>
                </td>
                <td>
                  <Badge tone={TRIP_STATUS_TONE[trip.status]}>
                    {TRIP_STATUS_LABEL[trip.status]}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function DispatchPage({
  searchParams,
}: {
  searchParams: Promise<DispatchSearchParams>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["scheduling:read"])) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Vehicle dispatch" />
        <PageSection>
          <ForbiddenState requiredScopes={["scheduling:read"]} />
        </PageSection>
      </>
    );
  }

  const params = (await searchParams) ?? {};
  const view = firstParam(params.view) === "assignments" ? "assignments" : "day";
  const requestedDate = firstParam(params.date);
  const requestedStatus = firstParam(params.status);
  const requestedVehicle = firstParam(params.vehicle);

  let board: DispatchBoard;
  try {
    board = await loadDispatchBoard();
  } catch (error) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Vehicle dispatch" />
        <PageSection>
          <ErrorState
            message={
              error instanceof ApiError ? error.message : "Unable to load the dispatch board."
            }
          />
        </PageSection>
      </>
    );
  }

  // Case links are best-effort: a case read that fails leaves the number as plain text,
  // never a dead end and never a fabricated id.
  const caseHrefs = new Map<string, string>();
  try {
    for (const kase of await listCases()) {
      caseHrefs.set(kase.case_number, `/staff/cases/${encodeURIComponent(kase.id)}`);
    }
  } catch {
    // The trip rows fall back to the case number without a link.
  }

  const recordedDays = recordedTripDays(board.trips);
  const day = isCalendarDate(requestedDate) ? requestedDate : board.as_of;
  const status = (TRIP_STATUSES as readonly string[]).includes(requestedStatus)
    ? requestedStatus
    : "";
  const vehicle = board.vehicles.some((entry) => entry.id === requestedVehicle)
    ? requestedVehicle
    : "";

  const allDayTrips = tripsOnDay(board.trips, day);
  const dayTrips = allDayTrips.filter(
    (trip) =>
      (status === "" || trip.status === status) && (vehicle === "" || trip.vehicle_id === vehicle),
  );
  const filtered = status !== "" || vehicle !== "";
  const summary = dispatchSummary(board.vehicles, allDayTrips);
  const { previous, next } = nearestRecordedDay(recordedDays, day);

  const hrefFor = (overrides: Record<string, string>): string => {
    const query = new URLSearchParams();
    query.set("date", overrides.date ?? day);
    if ((overrides.view ?? view) === "assignments") query.set("view", "assignments");
    const nextStatus = overrides.status ?? status;
    const nextVehicle = overrides.vehicle ?? vehicle;
    if (nextStatus) query.set("status", nextStatus);
    if (nextVehicle) query.set("vehicle", nextVehicle);
    return `/staff/dispatch?${query.toString()}`;
  };

  const viewSwitch = (
    <nav className="btn-group" aria-label="Dispatch view">
      <Link
        className={`btn btn--sm ${view === "day" ? "btn--primary" : "btn--secondary"}`}
        aria-current={view === "day" ? "true" : undefined}
        href={hrefFor({ view: "day" })}
      >
        Day board
      </Link>
      <Link
        className={`btn btn--sm ${view === "assignments" ? "btn--primary" : "btn--secondary"}`}
        aria-current={view === "assignments" ? "true" : undefined}
        href={hrefFor({ view: "assignments" })}
      >
        Assignments
      </Link>
    </nav>
  );

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Vehicle dispatch"
        lead="The fleet, its drivers and the recorded day's trips."
        actions={<Badge tone="warning">Records only</Badge>}
      />

      <PageSection>
        <div className="row row--wrap">
          <a className="btn btn--primary" href="#dispatch-board">
            Open the day board
          </a>
          <Link className="btn btn--secondary" href="/staff/schedule">
            Schedule
          </Link>
        </div>
        <p className="text-sm text-muted">
          No dispatch service is connected — D5 scheduling-resources owns assignment,
          dispatch and completion, so this board reads the office&rsquo;s recorded sheet.
        </p>
        <div className="kpi-grid">
          <StatCard label="Fleet" value={summary.vehicles} sub="vehicles recorded" />
          <StatCard
            label="On the road"
            value={summary.onTheRoad}
            sub="vehicles in a trip state"
          />
          <StatCard
            label="Drivers on duty"
            value={summary.driversOnDuty}
            sub="with a trip on this day"
          />
          <StatCard label="Trips" value={summary.trips} sub={scheduleDayLabel(day)} />
        </div>
      </PageSection>

      <PageSection>
        <div className="card" id="dispatch-board">
          <div className="card__header row row--space row--wrap">
            <div className="row row--wrap">
              <h2>{view === "day" ? "Day board" : "Assignments"}</h2>
              <span className="text-sm text-muted">{scheduleDayLabel(day)}</span>
            </div>
            <div className="row row--wrap">
              {viewSwitch}
              <Link
                className="btn btn--ghost btn--sm"
                href={hrefFor({ date: addDays(day, -1) })}
                aria-label="Previous day"
              >
                ‹
              </Link>
              <Link
                className="btn btn--ghost btn--sm"
                href={hrefFor({ date: addDays(day, 1) })}
                aria-label="Next day"
              >
                ›
              </Link>
              <form method="get" action="/staff/dispatch" className="row">
                {view === "assignments" ? <input type="hidden" name="view" value="assignments" /> : null}
                <input
                  type="date"
                  name="date"
                  aria-label="Jump to a day"
                  defaultValue={day}
                  className="text-sm"
                />
                <Button type="submit" variant="secondary" size="sm">
                  Go
                </Button>
              </form>
            </div>
          </div>
          <div className="card__body stack-4">
            <p className="text-sm text-muted mb-0">{READ_ONLY_NOTE}</p>

            <form method="get" action="/staff/dispatch" className="ops-filters">
              {view === "assignments" ? <input type="hidden" name="view" value="assignments" /> : null}
              <input type="hidden" name="date" value={day} />
              {view === "day" ? (
                <div className="field">
                  <label htmlFor="dispatch-status">State</label>
                  <select className="select" id="dispatch-status" name="status" defaultValue={status}>
                    <option value="">All states</option>
                    {TRIP_STATUSES.map((entry) => (
                      <option key={entry} value={entry}>
                        {TRIP_STATUS_LABEL[entry]}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="field">
                <label htmlFor="dispatch-vehicle">Vehicle</label>
                <select
                  className="select"
                  id="dispatch-vehicle"
                  name="vehicle"
                  defaultValue={vehicle}
                >
                  <option value="">All vehicles</option>
                  {board.vehicles.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name} · {entry.plate}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" variant="secondary">
                Show
              </Button>
              {filtered ? (
                <Link className="btn btn--ghost" href={hrefFor({ status: "", vehicle: "" })}>
                  Clear
                </Link>
              ) : null}
            </form>

            {view === "day" ? (
              dayTrips.length === 0 ? (
                <>
                  <EmptyState
                    title={filtered ? "No trip matches those filters" : "No trip on this day"}
                    hint={
                      filtered
                        ? "Clear the filters to see every recorded trip on this day."
                        : "Nothing was recorded on this day — every vehicle is where the office left it."
                    }
                  />
                  {!filtered && (previous || next) ? (
                    <div className="row row--wrap text-sm">
                      {previous ? (
                        <Link href={hrefFor({ date: previous })}>
                          Previous recorded day · {scheduleDayLabel(previous)}
                        </Link>
                      ) : null}
                      {next ? (
                        <Link href={hrefFor({ date: next })}>
                          Next recorded day · {scheduleDayLabel(next)}
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <TripTable trips={dayTrips} board={board} caseHrefs={caseHrefs} />
              )
            ) : (
              <AssignmentView
                board={board}
                dayTrips={dayTrips}
                allDayTrips={allDayTrips}
                day={day}
                vehicleFilter={vehicle}
              />
            )}
          </div>
        </div>
      </PageSection>
    </>
  );
}

function AssignmentView({
  board,
  dayTrips,
  allDayTrips,
  day,
  vehicleFilter,
}: {
  board: DispatchBoard;
  dayTrips: readonly DispatchTrip[];
  allDayTrips: readonly DispatchTrip[];
  day: string;
  vehicleFilter: string;
}) {
  const vehicles = board.vehicles.filter(
    (vehicle) => vehicleFilter === "" || vehicle.id === vehicleFilter,
  );
  const drivers = driversOnDay(board.drivers, allDayTrips).filter(
    (driver) =>
      vehicleFilter === "" || dayTrips.some((trip) => trip.driver_id === driver.id),
  );

  return (
    <div className="stack-4">
      <div className="table-wrapper" tabIndex={0}>
        <table className="table">
          <caption>
            The fleet on {scheduleDayLabel(day)} — its recorded state, driver and load.
          </caption>
          <thead>
            <tr>
              <th scope="col">Vehicle</th>
              <th scope="col">Plate</th>
              <th scope="col">Type</th>
              <th scope="col" className="table__numeric">
                Capacity
              </th>
              <th scope="col">State</th>
              <th scope="col">Driver</th>
              <th scope="col">Trips</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => {
              const trips = dayTrips.filter((trip) => trip.vehicle_id === vehicle.id);
              const names = [
                ...new Set(
                  trips
                    .map((trip) => driverOf(board.drivers, trip.driver_id)?.name)
                    .filter((name): name is string => Boolean(name)),
                ),
              ];
              return (
                <tr key={vehicle.id}>
                  <td>
                    <strong>{vehicle.name}</strong>
                    {vehicle.resource_id ? null : (
                      <div className="text-sm text-muted">Not a scheduling resource yet</div>
                    )}
                  </td>
                  <td>
                    <code>{vehicle.plate}</code>
                  </td>
                  <td>{VEHICLE_TYPE_LABEL[vehicle.type]}</td>
                  <td className="table__numeric">{vehicle.capacity}</td>
                  <td>
                    <Badge tone={VEHICLE_STATE_TONE[vehicle.state]}>
                      {VEHICLE_STATE_LABEL[vehicle.state]}
                    </Badge>
                  </td>
                  <td>{names.length > 0 ? names.join(" · ") : "No driver assigned"}</td>
                  <td className="text-sm">
                    {trips.length === 0
                      ? "None recorded"
                      : `${trips.length} trip${trips.length === 1 ? "" : "s"}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="table-wrapper" tabIndex={0}>
        <table className="table">
          <caption>Who is driving on {scheduleDayLabel(day)}.</caption>
          <thead>
            <tr>
              <th scope="col">Driver</th>
              <th scope="col">Employee</th>
              <th scope="col">State</th>
              <th scope="col">Trips</th>
              <th scope="col">Vehicles</th>
            </tr>
          </thead>
          <tbody>
            {drivers.length === 0 ? (
              <tr>
                <td colSpan={5}>No driver has a recorded trip on this day.</td>
              </tr>
            ) : (
              drivers.map((driver) => {
                const trips = dayTrips.filter((trip) => trip.driver_id === driver.id);
                const state = driverDayState(trips);
                const vehicleNames = [
                  ...new Set(
                    trips
                      .map((trip) => vehicleOf(board.vehicles, trip.vehicle_id)?.name)
                      .filter((name): name is string => Boolean(name)),
                  ),
                ];
                return (
                  <tr key={driver.id}>
                    <td>
                      <strong>{driver.name}</strong>
                    </td>
                    <td className="text-sm">{driver.employee_number ?? "Not an HR record"}</td>
                    <td>
                      <Badge tone={state.tone}>{state.label}</Badge>
                    </td>
                    <td className="text-sm">
                      {trips.length === 0
                        ? "None recorded"
                        : `${trips.length} trip${trips.length === 1 ? "" : "s"}`}
                    </td>
                    <td className="text-sm">
                      {vehicleNames.length > 0 ? vehicleNames.join(" · ") : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
