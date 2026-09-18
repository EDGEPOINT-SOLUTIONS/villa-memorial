import { describe, expect, it, vi } from "vitest";
import {
  getPreparationRecord,
  toPreparationRecord,
  PREPARATION_STEP_KEYS,
} from "@/lib/api-client/preparation";
import {
  calendarDateLabel,
  orderedPreparationSteps,
  PREPARATION_STEP_LABEL,
  PREPARATION_STEP_ORDER,
  preparationMomentLabel,
  preparationStateLabel,
  preparationStateTone,
  preparationWindowLabel,
  preparationWorkLabel,
} from "@/lib/preparation-record";

/**
 * The preparation record's pure answers: step order and words, the honest "no time
 * recorded" states, the park-time labels, and the reader that refuses a record which
 * claims work without a recorded instant.
 */
describe("the preparation record's own vocabulary", () => {
  it("keeps the blueprint's four steps in work order", () => {
    expect(PREPARATION_STEP_ORDER).toEqual([
      "embalming",
      "dressing",
      "cosmetics",
      "casketing",
    ]);
    expect(PREPARATION_STEP_KEYS).toEqual(PREPARATION_STEP_ORDER);
    expect(PREPARATION_STEP_LABEL.embalming).toBe("Embalming");
    expect(PREPARATION_STEP_LABEL.casketing).toBe("Casketing");
  });

  it("has one label and tone per module status", () => {
    expect(preparationStateLabel("scheduled")).toBe("Scheduled");
    expect(preparationStateLabel("in_progress")).toBe("In progress");
    expect(preparationStateLabel("completed")).toBe("Completed");
    expect(preparationStateLabel("cancelled")).toBe("Cancelled");
    expect(preparationStateTone("scheduled")).toBe("neutral");
    expect(preparationStateTone("in_progress")).toBe("warning");
    expect(preparationStateTone("completed")).toBe("success");
    expect(preparationStateTone("cancelled")).toBe("danger");
  });

  it("orders whatever the record carries into the order the work happens", () => {
    const steps = [
      { key: "casketing" as const, state: "scheduled" as const, at: null, note: null },
      { key: "embalming" as const, state: "completed" as const, at: "2026-08-27T12:55:00Z", note: null },
      { key: "cosmetics" as const, state: "scheduled" as const, at: null, note: null },
      { key: "dressing" as const, state: "scheduled" as const, at: null, note: null },
    ];
    expect(orderedPreparationSteps(steps).map((s) => s.key)).toEqual([
      "embalming",
      "dressing",
      "cosmetics",
      "casketing",
    ]);
    // A record that carries no steps shows no invented ones.
    expect(orderedPreparationSteps([])).toEqual([]);
  });
});

describe("the record prints the park's own time", () => {
  it("formats a calendar date in UTC, never shifted", () => {
    expect(calendarDateLabel("2026-08-27")).toBe("27 Aug 2026");
    expect(calendarDateLabel(null)).toBeNull();
    expect(calendarDateLabel("2026-02-30")).toBeNull(); // not a real day
    expect(calendarDateLabel("27 August 2026")).toBeNull();
  });

  it("formats an instant in Asia/Manila", () => {
    expect(preparationMomentLabel("2026-08-27T13:30:00Z")).toBe("27 Aug 2026 · 9:30 PM");
    expect(preparationMomentLabel("2026-08-27T00:00:00Z")).toBe("27 Aug 2026 · 8:00 AM");
    expect(preparationMomentLabel(null)).toBeNull();
    expect(preparationMomentLabel("not a time")).toBeNull();
  });

  it("prints the worked window, collapsing a same-day range", () => {
    expect(
      preparationWindowLabel("2026-08-27T12:40:00Z", "2026-08-27T13:30:00Z"),
    ).toBe("27 Aug 2026 · 8:40 PM – 9:30 PM");
    expect(
      preparationWindowLabel("2026-08-27T12:40:00Z", "2026-08-28T01:00:00Z"),
    ).toBe("27 Aug 2026 · 8:40 PM – 28 Aug 2026 · 9:00 AM");
    expect(preparationWindowLabel("2026-08-27T12:40:00Z", null)).toBe("27 Aug 2026 · 8:40 PM");
    expect(preparationWindowLabel(null, null)).toBeNull();
  });

  it("says honestly when the record carries no time, and marks an unfinished start", () => {
    expect(preparationWorkLabel({ started_at: null, completed_at: null })).toBe("Not recorded yet");
    expect(
      preparationWorkLabel({ started_at: "2026-08-27T08:15:00Z", completed_at: null }),
    ).toBe("Started 27 Aug 2026 · 4:15 PM");
    expect(
      preparationWorkLabel({
        started_at: "2026-08-27T12:40:00Z",
        completed_at: "2026-08-27T13:30:00Z",
      }),
    ).toBe("27 Aug 2026 · 8:40 PM – 9:30 PM");
  });
});

describe("the preparation reader", () => {
  it("returns the recorded record for a case that has one", async () => {
    const record = await getPreparationRecord("CASE-2026-0001");
    expect(record).not.toBeNull();
    expect(record!.state).toBe("completed");
    expect(record!.embalmer).toBe("Ricardo Bautista");
    expect(record!.assistant).toBe("Miguel Torres");
    expect(record!.steps.map((s) => s.key)).toEqual([...PREPARATION_STEP_ORDER]);
    expect(record!.notes).toContain("barong");
  });

  it("answers null for a case with no record — never a placeholder", async () => {
    expect(await getPreparationRecord("CASE-2026-0002")).toBeNull();
    expect(await getPreparationRecord("CASE-9999-9999")).toBeNull();
  });

  it("refuses a record that claims work without a recorded instant", () => {
    expect(() =>
      toPreparationRecord({
        case_number: "CASE-2026-0001",
        state: "in_progress",
        embalmer: "Ricardo Bautista",
        steps: [{ key: "embalming", state: "completed", at: null, note: null }],
      }),
    ).toThrowError(/completed step without a recorded time/);
    expect(() =>
      toPreparationRecord({
        case_number: "CASE-2026-0001",
        state: "completed",
        embalmer: "Ricardo Bautista",
        completed_at: null,
        steps: [],
      }),
    ).toThrowError(/completed without a recorded time/);
  });

  it("validates the record field by field instead of casting", () => {
    expect(() => toPreparationRecord(null)).toThrowError(/malformed preparation record/);
    expect(() => toPreparationRecord({ state: "completed" })).toThrowError(
      /malformed preparation record/,
    );
    expect(() =>
      toPreparationRecord({ case_number: "CASE-2026-0001", state: "finished", embalmer: "X" }),
    ).toThrowError(/malformed preparation record/);
  });

  it("ignores extra fields and reads a cancelled record as recorded", () => {
    const record = toPreparationRecord({
      case_number: "CASE-2026-0001",
      state: "cancelled",
      embalmer: "Ricardo Bautista",
      assistant: null,
      internal_reason: "never shown",
      steps: [{ key: "embalming", state: "cancelled", at: null, note: "family asked to wait" }],
    });
    expect(record.state).toBe("cancelled");
    expect(record.assistant).toBeNull();
    expect((record as unknown as Record<string, unknown>).internal_reason).toBeUndefined();
    expect(record.steps[0].note).toBe("family asked to wait");
  });

  it("answers 503 in live mode instead of inventing an endpoint", async () => {
    vi.stubEnv("OPERATIONS_BASE_URL", "https://gateway.example.com");
    vi.resetModules();
    try {
      const live = await import("@/lib/api-client/preparation");
      await expect(live.getPreparationRecord("CASE-2026-0001")).rejects.toMatchObject({
        status: 503,
        message: live.PREPARATION_NOT_WIRED,
      });
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
