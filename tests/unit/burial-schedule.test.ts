import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client/api-error";
import {
  BURIAL_SCHEDULE_NOT_WIRED,
  burialScheduleFrom,
  burialScheduleFromFixture,
  burialScheduleLiveModeEnabled,
  loadBurialSchedule,
  toBurialEntry,
  toLightPickup,
} from "@/lib/api-client/burial-schedule";
import burialsFile from "@/lib/fixtures/scheduling/burials.json";

/**
 * The burial-schedule reader: a tolerant, field-by-field read that refuses a row
 * it cannot place (a missing identity, a half-written time, a bad date, a
 * duplicate id) and refuses LIVE mode with the named missing service rather than
 * dressing the recorded demo sheet up as service data.
 */

const RAW = burialsFile as unknown as Record<string, unknown>;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("the reader validates field by field", () => {
  it("reads the recorded sheet and its park-clock pickups", () => {
    const board = burialScheduleFromFixture();
    expect(board.as_of).toBe("2026-09-28");
    expect(board.burials).toHaveLength(3);
    const pickup = board.burials.find((b) => b.case_number === "CASE-2026-0001")?.light_pickup;
    expect(pickup).toEqual({
      time: "15:00",
      state: "scheduled",
      crew: "Delivery crew",
      note: null,
    });
  });

  it("refuses a light pickup with no time, no crew or an unknown state", () => {
    expect(() => toLightPickup({ time: "nope", state: "scheduled", crew: "Crew" })).toThrow(
      /light pickup time/,
    );
    expect(() => toLightPickup({ time: "09:00", state: "scheduled", crew: "" })).toThrow(
      /light pickup crew/,
    );
    expect(() => toLightPickup({ time: "09:00", state: "maybe", crew: "Crew" })).toThrow(
      /light pickup state/,
    );
  });

  it("refuses a burial it cannot place", () => {
    expect(() => toBurialEntry({ id: "b", date: "2026-02-30", time: "09:00" })).toThrow(ApiError);
    expect(() =>
      toBurialEntry({
        id: "b",
        date: "2026-09-30",
        time: "09:00",
        case_number: "CASE-2026-0001",
        deceased_name: "Someone",
        lot_number: "A-003",
        section: "A",
        coordinator: "Elena",
        light_pickup: null,
      }),
    ).not.toThrow();
  });

  it("refuses a store with no recorded day or a duplicate id", () => {
    expect(() => burialScheduleFrom({ as_of: "", burials: [] })).toThrow(/no recorded day/);
    expect(() =>
      burialScheduleFrom({
        as_of: "2026-09-28",
        burials: [
          {
            id: "dup",
            date: "2026-09-30",
            time: "09:00",
            case_number: "CASE-2026-0001",
            deceased_name: "One",
            lot_number: "A-003",
            section: "A",
            coordinator: "Elena",
            light_pickup: null,
          },
          {
            id: "dup",
            date: "2026-09-30",
            time: "10:00",
            case_number: "CASE-2026-0001",
            deceased_name: "Two",
            lot_number: "A-003",
            section: "A",
            coordinator: "Elena",
            light_pickup: null,
          },
        ],
      }),
    ).toThrow(/duplicate burial id/);
  });

  it("reads the same sheet through the generic seat", () => {
    expect(burialScheduleFrom(RAW).burials).toHaveLength(3);
  });
});

describe("live mode is an honest refusal", () => {
  it("answers 503 with the named missing service when a scheduling gateway is configured", async () => {
    vi.stubEnv("SCHEDULING_BASE_URL", "http://gateway.invalid");
    vi.resetModules();
    const live = await import("@/lib/api-client/burial-schedule");
    expect(live.burialScheduleLiveModeEnabled()).toBe(true);
    await expect(live.loadBurialSchedule()).rejects.toMatchObject({
      message: BURIAL_SCHEDULE_NOT_WIRED,
      status: 503,
    });
  });

  it("serves the recorded sheet in fixture mode", async () => {
    expect(burialScheduleLiveModeEnabled()).toBe(false);
    await expect(loadBurialSchedule()).resolves.toMatchObject({ as_of: "2026-09-28" });
  });
});
