/**
 * Vehicle dispatch — the fleet, its drivers and the recorded day's trips (PURE).
 *
 * `/staff/dispatch` shows the office's dispatch sheet: who is driving what, where and
 * when, tied to the cases the trips belong to. This module is the whole vocabulary the
 * board is allowed to state and the one place a day is derived, so the page, the tests
 * and (later) a service-backed reader cannot disagree about what "on this day" means:
 *
 *  · vehicle types/states and trip kinds/statuses are the blueprint's own domain words
 *    (`docs/04-modules/facilities-scheduling.md` §14 — vehicle ID · plate · type ·
 *    capacity · driver · availability · maintenance; dispatches move through
 *    request → assign → dispatch → complete, which the three trip states mirror);
 *  · a trip's day is the park's own calendar day (Asia/Manila) of its `starts_at` —
 *    the same convention the Schedule board uses for bookings. Nothing here reads a
 *    wall clock;
 *  · driver state is DERIVED from the day's recorded trips, never stored twice.
 *
 * Dispatch itself belongs to D5 scheduling-resources (`dispatch.completed`,
 * docs/02-architecture/microservices.md:51) and no contract names a dispatch record:
 * this module holds no trip and no rule about what a caller may do, and the screen is
 * read-only because there is nothing to write through.
 */
import { parkDayOf } from "@/lib/operations/ops-board";

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

export const VEHICLE_TYPES = ["hearse", "van", "car"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  hearse: "Hearse",
  van: "Service van",
  car: "Family car",
};

export const VEHICLE_STATES = ["available", "on_trip", "maintenance"] as const;
export type VehicleState = (typeof VEHICLE_STATES)[number];

export const VEHICLE_STATE_LABEL: Record<VehicleState, string> = {
  available: "Available",
  on_trip: "On a trip",
  maintenance: "In maintenance",
};

export const VEHICLE_STATE_TONE: Record<VehicleState, "success" | "warning" | "danger"> = {
  available: "success",
  on_trip: "warning",
  maintenance: "danger",
};

export const TRIP_KINDS = ["pickup", "transfer", "service"] as const;
export type TripKind = (typeof TRIP_KINDS)[number];

export const TRIP_KIND_LABEL: Record<TripKind, string> = {
  pickup: "Pickup",
  transfer: "Transfer",
  service: "Service",
};

export const TRIP_STATUSES = ["scheduled", "en_route", "completed"] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  scheduled: "Scheduled",
  en_route: "En route",
  completed: "Completed",
};

export const TRIP_STATUS_TONE: Record<TripStatus, "info" | "warning" | "success"> = {
  scheduled: "info",
  en_route: "warning",
  completed: "success",
};

/* ------------------------------------------------------------------ */
/* Records the board reads                                             */
/* ------------------------------------------------------------------ */

export type DispatchVehicle = {
  id: string;
  name: string;
  plate: string;
  type: VehicleType;
  capacity: number;
  state: VehicleState;
  /** The scheduling resource this vehicle is, when one is recorded for it. */
  resource_id: string | null;
};

export type DispatchDriver = {
  id: string;
  name: string;
  /** The HR directory's employee number — the driver is a real staff member. */
  employee_number: string | null;
};

export type DispatchTrip = {
  id: string;
  /** The case the trip serves; null when the office recorded no case. */
  case_number: string | null;
  kind: TripKind;
  origin: string;
  destination: string;
  starts_at: string;
  ends_at: string;
  status: TripStatus;
  vehicle_id: string;
  driver_id: string;
  note: string | null;
};

export type DispatchBoard = {
  /** The recorded day the board opens on (yyyy-mm-dd, park time). */
  as_of: string;
  vehicles: DispatchVehicle[];
  drivers: DispatchDriver[];
  trips: DispatchTrip[];
};

/* ------------------------------------------------------------------ */
/* Guards (the readers validate field by field)                        */
/* ------------------------------------------------------------------ */

export function isVehicleType(value: unknown): value is VehicleType {
  return typeof value === "string" && (VEHICLE_TYPES as readonly string[]).includes(value);
}

export function isVehicleState(value: unknown): value is VehicleState {
  return typeof value === "string" && (VEHICLE_STATES as readonly string[]).includes(value);
}

export function isTripKind(value: unknown): value is TripKind {
  return typeof value === "string" && (TRIP_KINDS as readonly string[]).includes(value);
}

export function isTripStatus(value: unknown): value is TripStatus {
  return typeof value === "string" && (TRIP_STATUSES as readonly string[]).includes(value);
}

/* ------------------------------------------------------------------ */
/* The day                                                             */
/* ------------------------------------------------------------------ */

/** The park calendar day (Asia/Manila) a trip belongs to. */
export function tripDay(trip: DispatchTrip): string {
  return parkDayOf(trip.starts_at) ?? "";
}

/** Earliest first — the order a dispatch sheet is read in. */
export function orderedTrips(trips: readonly DispatchTrip[]): DispatchTrip[] {
  return [...trips].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

/** The trips recorded on one park calendar day, earliest first. */
export function tripsOnDay(trips: readonly DispatchTrip[], day: string): DispatchTrip[] {
  return orderedTrips(trips.filter((trip) => tripDay(trip) === day));
}

/** Every park calendar day the fixture records a trip on, oldest first. */
export function recordedTripDays(trips: readonly DispatchTrip[]): string[] {
  return [...new Set(trips.map(tripDay).filter((day) => day !== ""))].sort();
}

export function vehicleOf(
  vehicles: readonly DispatchVehicle[],
  id: string,
): DispatchVehicle | null {
  return vehicles.find((vehicle) => vehicle.id === id) ?? null;
}

export function driverOf(drivers: readonly DispatchDriver[], id: string): DispatchDriver | null {
  return drivers.find((driver) => driver.id === id) ?? null;
}

/* ------------------------------------------------------------------ */
/* Derived states                                                      */
/* ------------------------------------------------------------------ */

export type DriverDayState = {
  key: "on_trip" | "on_duty" | "available";
  label: string;
  tone: "success" | "warning" | "info";
};

/**
 * A driver's state on one recorded day, derived from that day's trips: en route
 * outranks a scheduled/completed run, and no trip is simply "Available". Storing
 * this on the driver would let the two drift; deriving it cannot.
 */
export function driverDayState(dayTrips: readonly DispatchTrip[]): DriverDayState {
  if (dayTrips.some((trip) => trip.status === "en_route")) {
    return { key: "on_trip", label: "On a trip", tone: "warning" };
  }
  if (dayTrips.length > 0) {
    return { key: "on_duty", label: "On duty", tone: "info" };
  }
  return { key: "available", label: "Available", tone: "success" };
}

export type DispatchSummary = {
  vehicles: number;
  onTheRoad: number;
  driversOnDuty: number;
  trips: number;
};

/** The glance tiles: the fleet, what is moving, who is driving, what runs today. */
export function dispatchSummary(
  vehicles: readonly DispatchVehicle[],
  dayTrips: readonly DispatchTrip[],
): DispatchSummary {
  const driverIds = new Set(dayTrips.map((trip) => trip.driver_id));
  return {
    vehicles: vehicles.length,
    onTheRoad: vehicles.filter((vehicle) => vehicle.state === "on_trip").length,
    driversOnDuty: driverIds.size,
    trips: dayTrips.length,
  };
}

/** The drivers with at least one trip on the day, in the board's own driver order. */
export function driversOnDay(
  drivers: readonly DispatchDriver[],
  dayTrips: readonly DispatchTrip[],
): DispatchDriver[] {
  const ids = new Set(dayTrips.map((trip) => trip.driver_id));
  return drivers.filter((driver) => ids.has(driver.id));
}
