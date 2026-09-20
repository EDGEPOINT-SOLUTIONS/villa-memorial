/**
 * Typed read for the staff vehicle-dispatch board (`/staff/dispatch`).
 *
 * ⚠ PROVISIONAL — vehicle dispatch belongs to D5 scheduling-resources
 * (`dispatch.completed`, docs/02-architecture/microservices.md:51), which is unbuilt.
 * No dispatch contract exists, so there is nothing to read live: when
 * `SCHEDULING_BASE_URL` is set, `loadDispatchBoard` answers 503 with
 * `DISPATCH_NOT_WIRED` rather than dressing the recorded demo sheet up as service data.
 * Fixture mode (the default) serves `lib/fixtures/operations/dispatch.json` — the
 * office's own recorded fleet, drivers and trips.
 *
 * The reader is a tolerant reader (repo rule): field by field, extra keys ignored, a
 * malformed record is a 502, never a cast. It also refuses a trip that points at a
 * vehicle or driver the board does not carry — the board cannot render an orphan, and
 * "the row is missing" is exactly the class of defect a tolerant cast would hide.
 */
import dispatchFile from "@/lib/fixtures/operations/dispatch.json";
import { ApiError } from "@/lib/api-client/api-error";
import { schedulingLiveModeEnabled } from "@/lib/api-client/scheduling";
import { isCalendarDate } from "@/lib/chapel-booking";
import {
  isTripKind,
  isTripStatus,
  isVehicleState,
  isVehicleType,
  type DispatchBoard,
  type DispatchDriver,
  type DispatchTrip,
  type DispatchVehicle,
} from "@/lib/dispatch";

export const DISPATCH_NOT_WIRED =
  "live vehicle dispatch is not wired: D5 scheduling-resources owns dispatch and no " +
  "dispatch contract names a fleet, driver or trip record, so this board can only read " +
  "the office's recorded dispatch sheet";

/** Live mode: a scheduling service exists, but it has no dispatch surface to read. */
export function dispatchLiveModeEnabled(): boolean {
  return schedulingLiveModeEnabled();
}

/* ------------------------------------------------------------------ */
/* Tolerant field readers                                              */
/* ------------------------------------------------------------------ */

function text(raw: unknown): string | null {
  return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
}

function instant(raw: unknown): string | null {
  if (typeof raw !== "string" || raw === "") return null;
  return Number.isNaN(Date.parse(raw)) ? null : raw;
}

function wholeNumber(raw: unknown): number | null {
  return typeof raw === "number" && Number.isInteger(raw) && raw > 0 ? raw : null;
}

export function toDispatchVehicle(raw: unknown): DispatchVehicle {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed dispatch vehicle", 502);
  }
  const r = raw as Record<string, unknown>;
  const id = text(r.id);
  const name = text(r.name);
  const plate = text(r.plate);
  const capacity = wholeNumber(r.capacity);
  const resourceId = r.resource_id === null || r.resource_id === undefined ? null : text(r.resource_id);
  if (!id || !name || !plate || !capacity || !isVehicleType(r.type) || !isVehicleState(r.state)) {
    throw new ApiError("malformed dispatch vehicle", 502);
  }
  return {
    id,
    name,
    plate,
    type: r.type,
    capacity,
    state: r.state,
    resource_id: resourceId,
  };
}

export function toDispatchDriver(raw: unknown): DispatchDriver {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed dispatch driver", 502);
  }
  const r = raw as Record<string, unknown>;
  const id = text(r.id);
  const name = text(r.name);
  if (!id || !name) {
    throw new ApiError("malformed dispatch driver", 502);
  }
  return { id, name, employee_number: text(r.employee_number) };
}

export function toDispatchTrip(raw: unknown): DispatchTrip {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed dispatch trip", 502);
  }
  const r = raw as Record<string, unknown>;
  const id = text(r.id);
  const origin = text(r.origin);
  const destination = text(r.destination);
  const vehicleId = text(r.vehicle_id);
  const driverId = text(r.driver_id);
  const startsAt = instant(r.starts_at);
  const endsAt = instant(r.ends_at);
  if (
    !id ||
    !origin ||
    !destination ||
    !vehicleId ||
    !driverId ||
    !startsAt ||
    !endsAt ||
    !isTripKind(r.kind) ||
    !isTripStatus(r.status)
  ) {
    throw new ApiError("malformed dispatch trip", 502);
  }
  if (Date.parse(endsAt) < Date.parse(startsAt)) {
    throw new ApiError("malformed dispatch trip: it ends before it starts", 502);
  }
  return {
    id,
    case_number: text(r.case_number),
    kind: r.kind,
    origin,
    destination,
    starts_at: startsAt,
    ends_at: endsAt,
    status: r.status,
    vehicle_id: vehicleId,
    driver_id: driverId,
    note: text(r.note),
  };
}

/* ------------------------------------------------------------------ */
/* The board                                                           */
/* ------------------------------------------------------------------ */

/** The recorded dispatch sheet, validated. Synchronous so tests can call it directly. */
export function dispatchBoardFromFixture(): DispatchBoard {
  return dispatchBoardFrom(dispatchFile);
}

/** The same validation over any recorded store — the seam the reader's tests use. */
export function dispatchBoardFrom(store: unknown): DispatchBoard {
  const record = store as Record<string, unknown> | null;
  const asOf = record ? text(record.as_of) : null;
  if (!asOf || !isCalendarDate(asOf)) {
    throw new ApiError("malformed dispatch board: no recorded day", 502);
  }
  const vehicles = (Array.isArray(record?.vehicles) ? record.vehicles : []).map(toDispatchVehicle);
  const drivers = (Array.isArray(record?.drivers) ? record.drivers : []).map(toDispatchDriver);
  const trips = (Array.isArray(record?.trips) ? record.trips : []).map(toDispatchTrip);

  const vehicleIds = new Set(vehicles.map((vehicle) => vehicle.id));
  const driverIds = new Set(drivers.map((driver) => driver.id));
  for (const trip of trips) {
    if (!vehicleIds.has(trip.vehicle_id) || !driverIds.has(trip.driver_id)) {
      throw new ApiError(
        `malformed dispatch trip ${trip.id}: it names a vehicle or driver the fleet does not carry`,
        502,
      );
    }
  }
  return { as_of: asOf, vehicles, drivers, trips };
}

/** What the page calls: live mode says plainly that no dispatch surface exists. */
export async function loadDispatchBoard(): Promise<DispatchBoard> {
  if (dispatchLiveModeEnabled()) {
    throw new ApiError(DISPATCH_NOT_WIRED, 503);
  }
  return dispatchBoardFromFixture();
}
