import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dispatchBoardFrom,
  dispatchBoardFromFixture,
  DISPATCH_NOT_WIRED,
  loadDispatchBoard,
  toDispatchTrip,
} from "@/lib/api-client/dispatch";
import dispatchFile from "@/lib/fixtures/operations/dispatch.json";
import {
  dispatchSummary,
  driverDayState,
  driversOnDay,
  orderedTrips,
  recordedTripDays,
  tripDay,
  tripsOnDay,
  TRIP_KIND_LABEL,
  TRIP_STATUS_LABEL,
  TRIP_STATUS_TONE,
  VEHICLE_STATE_LABEL,
  VEHICLE_TYPE_LABEL,
  type DispatchTrip,
} from "@/lib/dispatch";
import { ApiError } from "@/lib/api-client/api-error";
/* --- test-only demo fixtures (clean start, captain 2026-10-02) --- */
vi.mock("@/lib/fixtures/operations/dispatch.json", async () => ({
  default: (await import("../fixtures/operations-dispatch-demo.json")).default,
}));
/* --- end test-only demo fixtures --- */


/**
 * The dispatch board's pure answers: day grouping and order, the derived driver state,
 * the fleet summary, the vocabulary the screen prints, and the reader that refuses a
 * trip which cannot be rendered (a missing field, a reversed window, an orphaned
 * vehicle/driver) or a fixture with no recorded day.
 */

const RAW = dispatchFile as unknown as Record<string, unknown>;

const TRIPS: DispatchTrip[] = [
  {
    id: "t-late",
    case_number: "CASE-2026-0001",
    kind: "service",
    origin: "A",
    destination: "B",
    starts_at: "2026-09-10T05:00:00Z",
    ends_at: "2026-09-10T06:00:00Z",
    status: "scheduled",
    vehicle_id: "veh-hearse-1",
    driver_id: "driver-miguel-torres",
    note: null,
  },
  {
    id: "t-early",
    case_number: null,
    kind: "pickup",
    origin: "C",
    destination: "D",
    starts_at: "2026-09-10T00:00:00Z",
    ends_at: "2026-09-10T01:00:00Z",
    status: "completed",
    vehicle_id: "veh-hearse-2",
    driver_id: "driver-elena-villanueva",
    note: null,
  },
  {
    id: "t-next-day",
    case_number: null,
    kind: "transfer",
    origin: "E",
    destination: "F",
    starts_at: "2026-09-11T00:30:00Z",
    ends_at: "2026-09-11T01:00:00Z",
    status: "en_route",
    vehicle_id: "veh-hearse-1",
    driver_id: "driver-miguel-torres",
    note: null,
  },
];

describe("the dispatch board's own vocabulary", () => {
  it("labels every vehicle type, state, trip kind and status the board prints", () => {
    expect(Object.values(VEHICLE_TYPE_LABEL)).toEqual(["Hearse", "Service van", "Family car"]);
    expect(Object.values(VEHICLE_STATE_LABEL)).toEqual([
      "Available",
      "On a trip",
      "In maintenance",
    ]);
    expect(Object.values(TRIP_KIND_LABEL)).toEqual(["Pickup", "Transfer", "Service"]);
    expect(Object.values(TRIP_STATUS_LABEL)).toEqual(["Scheduled", "En route", "Completed"]);
    expect(TRIP_STATUS_TONE.en_route).toBe("warning");
    expect(TRIP_STATUS_TONE.completed).toBe("success");
  });
});

describe("a day is derived from the recording, never from a clock", () => {
  it("reads the park's calendar day of the start instant", () => {
    expect(tripDay(TRIPS[0])).toBe("2026-09-10");
    // 00:30 UTC on the 11th is 8:30 AM at the park on the 11th.
    expect(tripDay(TRIPS[2])).toBe("2026-09-11");
  });

  it("orders trips by start and groups them by day", () => {
    expect(orderedTrips(TRIPS).map((trip) => trip.id)).toEqual([
      "t-early",
      "t-late",
      "t-next-day",
    ]);
    expect(tripsOnDay(TRIPS, "2026-09-10").map((trip) => trip.id)).toEqual(["t-early", "t-late"]);
    expect(tripsOnDay(TRIPS, "2026-09-12")).toEqual([]);
    expect(recordedTripDays(TRIPS)).toEqual(["2026-09-10", "2026-09-11"]);
  });
});

describe("derived state", () => {
  it("gives a driver the strongest state his day's trips support", () => {
    expect(driverDayState(tripsOnDay(TRIPS, "2026-09-10")).label).toBe("On duty");
    expect(driverDayState(tripsOnDay(TRIPS, "2026-09-11")).label).toBe("On a trip");
    expect(driverDayState([]).label).toBe("Available");
  });

  it("summarises the fleet and the day", () => {
    const board = dispatchBoardFromFixture();
    const day = tripsOnDay(board.trips, board.as_of);
    const summary = dispatchSummary(board.vehicles, day);
    expect(summary).toEqual({ vehicles: 4, onTheRoad: 1, driversOnDuty: 2, trips: 4 });
    expect(driversOnDay(board.drivers, day).map((driver) => driver.name)).toEqual([
      "Miguel Torres",
      "Elena Villanueva",
    ]);
  });
});

describe("the reader refuses what the board cannot render", () => {
  it("serves the recorded sheet", () => {
    const board = dispatchBoardFromFixture();
    expect(board.as_of).toBe("2026-09-10");
    expect(board.trips).toHaveLength(5);
  });

  it("refuses a store with no recorded day", () => {
    expect(() => dispatchBoardFrom({ ...RAW, as_of: undefined })).toThrow(ApiError);
    expect(() => dispatchBoardFrom({ ...RAW, as_of: "10 September" })).toThrow(ApiError);
  });

  it("refuses a trip that names a vehicle or driver the fleet does not carry", () => {
    const orphan = structuredClone(RAW) as {
      trips: Array<Record<string, unknown>>;
    };
    orphan.trips[0].vehicle_id = "veh-nowhere";
    expect(() => dispatchBoardFrom(orphan)).toThrow(/vehicle or driver the fleet does not carry/);
  });

  it("refuses a trip that ends before it starts or misses a field", () => {
    expect(
      () =>
        toDispatchTrip({
          id: "t",
          kind: "pickup",
          origin: "A",
          destination: "B",
          starts_at: "2026-09-10T05:00:00Z",
          ends_at: "2026-09-10T04:00:00Z",
          status: "scheduled",
          vehicle_id: "v",
          driver_id: "d",
        }),
    ).toThrow(/ends before it starts/);
    expect(() => toDispatchTrip({ id: "t" })).toThrow(ApiError);
  });
});

describe("live mode is an honest refusal", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("answers 503 with the named missing service when a scheduling gateway is configured", async () => {
    vi.stubEnv("SCHEDULING_BASE_URL", "http://gateway.invalid");
    vi.resetModules();
    const live = await import("@/lib/api-client/dispatch");
    await expect(live.loadDispatchBoard()).rejects.toMatchObject({
      message: DISPATCH_NOT_WIRED,
      status: 503,
    });
  });

  it("serves the recorded sheet in fixture mode", async () => {
    await expect(loadDispatchBoard()).resolves.toMatchObject({ as_of: "2026-09-10" });
  });
});
