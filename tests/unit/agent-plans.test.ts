import { describe, expect, it } from "vitest";
import {
  applyPlanEvents,
  applyPlanPatch,
  comparePlans,
  isPlanDay,
  newPlan,
  nextOpenPlan,
  planMinutes,
  planTimeLabel,
  plansForDay,
  readPlanDraft,
  readPlanPatch,
  type AgentPlan,
  type AgentPlanEvent,
} from "@/lib/agent/agent-plans";

/**
 * The agent's own day planner, pure logic (captain, 2026-10-02). The captain
 * asked the agent to plan a day: what to do, with an optional time and note, tick
 * it done, edit or remove it. This is the reading and the fold behind that — and
 * the honesty line that a plan is the agent's own note, never a booking.
 */

function plan(over: Partial<AgentPlan> = {}): AgentPlan {
  return {
    id: "plan-1",
    created_by: "Alex Agent",
    day: "2026-09-16",
    time: "",
    title: "Call Lorna",
    note: "",
    done: false,
    created_at: "2026-09-15T00:00:00.000Z",
    updated_at: "2026-09-15T00:00:00.000Z",
    ...over,
  };
}

describe("a plan day is a real calendar day", () => {
  it("accepts a real yyyy-mm-dd and refuses an impossible or malformed one", () => {
    expect(isPlanDay("2026-09-16")).toBe(true);
    expect(isPlanDay("2026-02-29")).toBe(false);
    expect(isPlanDay("2026-02-30")).toBe(false);
    expect(isPlanDay("2026-13-01")).toBe(false);
    expect(isPlanDay("2026-9-16")).toBe(false);
    expect(isPlanDay("")).toBe(false);
  });
});

describe("reading a new plan", () => {
  it("takes a day, a title, an optional time and an optional note", () => {
    const verdict = readPlanDraft({
      day: "2026-09-16",
      title: "  Call Lorna  ",
      time: "09:00",
      note: "Bring the sheet",
    });
    expect(verdict).toEqual({
      ok: true,
      value: { day: "2026-09-16", time: "09:00", title: "Call Lorna", note: "Bring the sheet" },
    });
  });

  it("allows an empty time and an empty note", () => {
    const verdict = readPlanDraft({ day: "2026-09-16", title: "Call Lorna", time: "", note: "" });
    expect(verdict.ok && verdict.value.time).toBe("");
  });

  it("names the field when the day, the title or the time is wrong", () => {
    const bad = readPlanDraft({ day: "2026-02-30", title: "   ", time: "25:00", note: "x".repeat(600) });
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.errors.day).toBeTruthy();
    expect(bad.errors.title).toBeTruthy();
    expect(bad.errors.time).toBeTruthy();
    expect(bad.errors.note).toBeTruthy();
  });
});

describe("reading an edit", () => {
  it("takes only the keys the caller sent", () => {
    const verdict = readPlanPatch({ done: true });
    expect(verdict).toEqual({ ok: true, value: { done: true } });
  });

  it("refuses an empty edit and a non-boolean done", () => {
    expect(readPlanPatch({}).ok).toBe(false);
    const bad = readPlanPatch({ done: "yes" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.done).toBeTruthy();
  });
});

describe("building and editing a plan", () => {
  it("mints a new plan not done, with one timestamp for both stamps", () => {
    const created = newPlan({
      id: "plan-x",
      draft: { day: "2026-09-16", time: "09:00", title: "Call Lorna", note: "" },
      by: "Alex Agent",
      nowIso: "2026-09-15T00:00:00.000Z",
    });
    expect(created.done).toBe(false);
    expect(created.created_at).toBe(created.updated_at);
    expect(created.created_by).toBe("Alex Agent");
  });

  it("changes only the patched fields and restamps updated_at", () => {
    const before = plan();
    const after = applyPlanPatch(before, { done: true, title: "Call Lorna again" }, "2026-09-16T00:00:00.000Z");
    expect(after.done).toBe(true);
    expect(after.title).toBe("Call Lorna again");
    expect(after.day).toBe(before.day);
    expect(after.updated_at).toBe("2026-09-16T00:00:00.000Z");
    expect(before.done).toBe(false);
  });
});

describe("ordering and the fold", () => {
  it("orders a day by time, an untimed plan last, then creation", () => {
    const timed = plan({ id: "b", time: "09:00" });
    const untimed = plan({ id: "c", time: "" });
    const early = plan({ id: "a", time: "08:00" });
    expect([timed, untimed, early].sort(comparePlans).map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(planMinutes("08:00")).toBe(480);
    expect(planMinutes("")).toBe(24 * 60);
    expect(planTimeLabel("14:30")).toBe("2:30 PM");
    expect(planTimeLabel("")).toBe("");
  });

  it("folds saves and removals oldest first, the last save winning", () => {
    const events: AgentPlanEvent[] = [
      { kind: "plan_saved", at: "t1", plan: plan({ title: "First" }) },
      { kind: "plan_saved", at: "t2", plan: plan({ title: "Edited", done: true }) },
      {
        kind: "plan_saved",
        at: "t3",
        plan: plan({ id: "plan-2", day: "2026-09-17", title: "Another" }),
      },
      { kind: "plan_removed", at: "t4", plan_id: "plan-1" },
    ];
    const folded = applyPlanEvents(events);
    expect(folded.map((p) => p.id)).toEqual(["plan-2"]);
    expect(folded[0].title).toBe("Another");
  });

  it("returns a day's plans and the next open one", () => {
    const plans = [
      plan({ id: "p1", day: "2026-09-16", time: "09:00" }),
      plan({ id: "p2", day: "2026-09-16", time: "16:00", done: true }),
      plan({ id: "p3", day: "2026-09-17", time: "10:00" }),
    ];
    expect(plansForDay(plans, "2026-09-16").map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(nextOpenPlan(plans, "2026-09-16")!.id).toBe("p1");
    // A done plan is never the next thing, and a different day is never returned.
    expect(nextOpenPlan(plans, "2026-09-17")!.id).toBe("p3");
    expect(nextOpenPlan([plan({ id: "done", done: true })], "2026-09-16")).toBeNull();
  });
});
