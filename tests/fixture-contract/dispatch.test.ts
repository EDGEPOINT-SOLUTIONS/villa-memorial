import { describe, expect, it } from "vitest";
import dispatchFile from "@/lib/fixtures/operations/dispatch.json";
import casesFile from "@/lib/fixtures/operations/cases.json";
import employeesFile from "@/lib/fixtures/hr/employees.json";
import resourcesFile from "@/lib/fixtures/scheduling/resources.json";
import { parkDayOf } from "@/lib/operations/ops-board";
import { isCalendarDate } from "@/lib/chapel-booking";
import {
  isTripKind,
  isTripStatus,
  isVehicleState,
  isVehicleType,
  recordedTripDays,
  TRIP_KINDS,
  TRIP_STATUSES,
  VEHICLE_STATES,
  VEHICLE_TYPES,
} from "@/lib/dispatch";

/**
 * The dispatch fixture is PROVISIONAL — no dispatch contract exists (D5
 * scheduling-resources is unbuilt), so this suite pins the promises the board screen
 * rests on:
 *
 *   1. every trip is tied to a real case record;
 *   2. every driver is a real HR directory employee, and the one scheduling vehicle is
 *      the scheduling fixture's own resource;
 *   3. a trip's day is derived from its `starts_at` in the park's time — the fixture has
 *      no second clock, and `as_of` is a real calendar day;
 *   4. the vocabulary the screen prints is the fixture's only vocabulary;
 *   5. no amount (fare, rate, fuel) appears anywhere — a trip is a movement, not a sale.
 */
const store = dispatchFile as unknown as {
  _provenance: { status?: string; note?: string[] | string };
  tenant_id: string;
  as_of: string;
  vehicles: Array<{
    id: string;
    name: string;
    plate: string;
    type: string;
    capacity: number;
    state: string;
    resource_id: string | null;
  }>;
  drivers: Array<{ id: string; name: string; employee_number: string | null }>;
  trips: Array<{
    id: string;
    case_number: string | null;
    kind: string;
    origin: string;
    destination: string;
    starts_at: string;
    ends_at: string;
    status: string;
    vehicle_id: string;
    driver_id: string;
  }>;
};

const CASES = casesFile as unknown as { cases: Array<{ case_number: string }> };
const EMPLOYEES = employeesFile as unknown as {
  employees: Array<{ employee_number: string; first_name: string; last_name: string }>;
};
const RESOURCES = resourcesFile as unknown as {
  resources: Array<{ id: string; name: string; resource_type: string }>;
};

function amountLikeKeys(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => amountLikeKeys(entry, `${path}[${index}]`));
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
      /amount|price|cost|fee|rate|cents|currency|fare|salary/i.test(key)
        ? [`${path}.${key}`]
        : amountLikeKeys(entry, `${path}.${key}`),
    );
  }
  return [];
}

describe("the dispatch fixture is the office's own recorded sheet", () => {
  it("carries provenance, a real recorded day and a clean trip list", () => {
    expect(store._provenance).toBeTruthy();
    expect(isCalendarDate(store.as_of)).toBe(true);
    expect(store.vehicles.length).toBeGreaterThanOrEqual(2);
    expect(store.drivers.length).toBeGreaterThanOrEqual(1);
    // Clean start (captain, 2026-10-02): the recorded demo trips are removed.
    expect(store.trips).toEqual([]);
    expect(TRIP_STATUSES.length).toBeGreaterThan(0);
    expect(TRIP_KINDS.length).toBeGreaterThan(0);
  });

  it("ties every trip to a case the office actually has", () => {
    const caseNumbers = new Set(CASES.cases.map((kase) => kase.case_number));
    for (const trip of store.trips) {
      expect(trip.case_number, `${trip.id} has no case`).toBeTruthy();
      expect(caseNumbers.has(trip.case_number!), `${trip.id} names ${trip.case_number}`).toBe(true);
    }
  });

  it("names only HR directory employees as drivers, by number and name together", () => {
    for (const driver of store.drivers) {
      const employee = EMPLOYEES.employees.find(
        (entry) => entry.employee_number === driver.employee_number,
      );
      expect(employee, `${driver.id} has no HR record`).toBeTruthy();
      expect(`${employee!.first_name} ${employee!.last_name}`).toBe(driver.name);
    }
  });

  it("binds the scheduling vehicle to the scheduling fixture's own Hearse 1", () => {
    const hearse = store.vehicles.find((vehicle) => vehicle.resource_id !== null);
    expect(hearse, "no vehicle is bound to a scheduling resource").toBeTruthy();
    const resource = RESOURCES.resources.find((entry) => entry.id === hearse!.resource_id);
    expect(resource, `${hearse!.id} names a resource the fixture does not carry`).toBeTruthy();
    expect(resource!.name).toBe(hearse!.name);
    expect(resource!.resource_type).toBe("vehicle");
  });

  it("derives every trip's day from starts_at in the park's time", () => {
    const days = recordedTripDays(store.trips as never);
    expect(days).toEqual([]);
    expect(isCalendarDate(store.as_of)).toBe(true);
    expect(parkDayOf("2026-09-10T01:00:00Z")).toBeTruthy();
  });

  it("keeps ids and plates unique", () => {
    expect(new Set(store.vehicles.map((vehicle) => vehicle.id)).size).toBe(store.vehicles.length);
    expect(new Set(store.vehicles.map((vehicle) => vehicle.plate)).size).toBe(store.vehicles.length);
    expect(new Set(store.drivers.map((driver) => driver.id)).size).toBe(store.drivers.length);
    expect(new Set(store.trips.map((trip) => trip.id)).size).toBe(store.trips.length);
  });

  it("uses only the vocabulary the screen prints", () => {
    for (const vehicle of store.vehicles) {
      expect(isVehicleType(vehicle.type), vehicle.id).toBe(true);
      expect(isVehicleState(vehicle.state), vehicle.id).toBe(true);
      expect(Number.isInteger(vehicle.capacity) && vehicle.capacity > 0, vehicle.id).toBe(true);
    }
    for (const trip of store.trips) {
      expect(isTripKind(trip.kind), trip.id).toBe(true);
      expect(isTripStatus(trip.status), trip.id).toBe(true);
      expect(Date.parse(trip.ends_at) >= Date.parse(trip.starts_at), trip.id).toBe(true);
    }
    expect(VEHICLE_TYPES.length).toBe(3);
    expect(VEHICLE_STATES.length).toBe(3);
    expect(TRIP_KINDS.length).toBe(3);
  });

  it("carries no amount, fare or fuel figure anywhere", () => {
    expect(amountLikeKeys(store)).toEqual([]);
  });
});
