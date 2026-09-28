import { describe, expect, it } from "vitest";
import {
  MAX_BURIAL_TEXT,
  nextPickupState,
  parseBurialDraft,
  parsePickupUpdate,
  previousPickupState,
} from "@/lib/burial-admin";
import { LIGHT_PICKUP_STATES } from "@/lib/burial-calendar";

/**
 * The burial write rules (client minute 2026-09-21, item 2 — "record and manage burial
 * schedules"). The browser form, the BFF route and the store all run these, so the sentence a
 * clerk sees is the same everywhere.
 */

function draft(over: Record<string, unknown> = {}) {
  return {
    date: "2026-10-05",
    time: "10:00",
    case_number: "CASE-2026-0005",
    deceased_name: "Nena Bautista",
    lot_number: "B-002",
    section: "B",
    coordinator: "Elena Villanueva",
    note: "",
    light_pickup: { time: "", crew: "", note: "" },
    ...over,
  };
}

describe("recording a burial", () => {
  it("accepts a complete draft and normalises empty text", () => {
    const verdict = parseBurialDraft(draft());
    expect(verdict.ok).toBe(true);
    if (verdict.ok) {
      expect(verdict.value.date).toBe("2026-10-05");
      expect(verdict.value.note).toBeNull();
      expect(verdict.value.light_pickup).toBeNull();
    }
  });

  it("refuses a bad date, a bad clock and a missing field with plain sentences", () => {
    const badDate = parseBurialDraft(draft({ date: "2026-02-30" }));
    expect(badDate.ok).toBe(false);
    if (!badDate.ok) expect(badDate.fieldErrors.date).toMatch(/real burial date/i);

    const badTime = parseBurialDraft(draft({ time: "25:00" }));
    expect(badTime.ok).toBe(false);
    if (!badTime.ok) expect(badTime.fieldErrors.time).toMatch(/24-hour/i);

    const missing = parseBurialDraft(draft({ deceased_name: "  " }));
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.fieldErrors.deceased_name).toMatch(/required/i);
  });

  it("refuses half a light pickup (a time with no crew, or the reverse)", () => {
    const half = parseBurialDraft(
      draft({ light_pickup: { time: "15:00", crew: "", note: "" } }),
    );
    expect(half.ok).toBe(false);
    if (!half.ok) expect(half.fieldErrors["light_pickup.crew"]).toMatch(/crew/i);

    const noTime = parseBurialDraft(
      draft({ light_pickup: { time: "", crew: "Delivery crew", note: "" } }),
    );
    expect(noTime.ok).toBe(false);
    if (!noTime.ok) expect(noTime.fieldErrors["light_pickup.time"]).toMatch(/24-hour/i);
  });

  it("keeps a complete light pickup as part of the burial", () => {
    const verdict = parseBurialDraft(
      draft({ light_pickup: { time: "15:00", crew: "Delivery crew", note: "" } }),
    );
    expect(verdict.ok).toBe(true);
    if (verdict.ok) expect(verdict.value.light_pickup).toEqual({
      time: "15:00",
      crew: "Delivery crew",
      note: null,
    });
  });

  it("refuses an over-long field", () => {
    const long = parseBurialDraft(draft({ coordinator: "x".repeat(MAX_BURIAL_TEXT + 1) }));
    expect(long.ok).toBe(false);
    if (!long.ok) expect(long.fieldErrors.coordinator).toMatch(/too long/i);
  });
});

describe("the light pickup lifecycle", () => {
  it("moves forward scheduled → in_progress → done and stops there", () => {
    expect(nextPickupState("scheduled")).toBe("in_progress");
    expect(nextPickupState("in_progress")).toBe("done");
    expect(nextPickupState("done")).toBeNull();
  });

  it("moves back for a correction and stops at the start", () => {
    expect(previousPickupState("done")).toBe("in_progress");
    expect(previousPickupState("in_progress")).toBe("scheduled");
    expect(previousPickupState("scheduled")).toBeNull();
  });

  it("has exactly the three recorded states, in order", () => {
    expect([...LIGHT_PICKUP_STATES]).toEqual(["scheduled", "in_progress", "done"]);
  });

  it("accepts a state-only move and keeps time/crew optional", () => {
    const verdict = parsePickupUpdate({ state: "in_progress" });
    expect(verdict.ok).toBe(true);
    if (verdict.ok) expect(verdict.value).toEqual({ state: "in_progress" });
  });

  it("refuses an unknown state and a bad time", () => {
    expect(parsePickupUpdate({ state: "collected" }).ok).toBe(false);
    expect(parsePickupUpdate({ state: "done", time: "not-a-time" }).ok).toBe(false);
  });
});
