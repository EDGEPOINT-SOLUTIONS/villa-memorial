import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  agentPlanStorePath,
  createPlan,
  listPlanEvents,
  removePlan,
  updatePlan,
} from "@/lib/api-client/agent-plan-store";
import { applyPlanEvents } from "@/lib/agent/agent-plans";
import { listAgentPlans } from "@/lib/api-client/agent";

/**
 * The agent day-planner store — the durable demo journal behind the calendar's
 * add · done · edit · remove. It follows the pipeline journal exactly: an
 * append-only file, one writer queue, a temp + fsync + rename write, and a named
 * 500 on a corrupt file rather than a silent reset. The read path folds it, so the
 * calendar and the sign-in notice read one source.
 */

let dir: string;
let storePath: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-agent-plan-store-"));
  storePath = path.join(dir, "agent-plans.json");
  process.env.AGENT_PLAN_STORE_PATH = storePath;
});

afterEach(async () => {
  delete process.env.AGENT_PLAN_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

const DRAFT = { day: "2026-09-16", time: "09:00", title: "Call Lorna", note: "Bring the sheet" };

describe("the planner journal", () => {
  it("creates a plan, appends it to the journal and folds it back", async () => {
    const created = await createPlan({ draft: DRAFT, by: "Alex Agent" });
    const events = await listPlanEvents();
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("plan_saved");
    if (events[0].kind === "plan_saved") {
      expect(events[0].plan.id).toBe(created.id);
      expect(events[0].plan.created_by).toBe("Alex Agent");
      expect(events[0].plan.done).toBe(false);
    }
    expect(applyPlanEvents(events)).toHaveLength(1);
  });

  it("writes a valid journal envelope atomically", async () => {
    await createPlan({ draft: DRAFT, by: "Alex Agent" });
    const raw = JSON.parse(await readFile(storePath, "utf8")) as { version: number; events: unknown[] };
    expect(raw.version).toBe(1);
    expect(raw.events).toHaveLength(1);
  });

  it("edits fields and marks a plan done", async () => {
    const created = await createPlan({ draft: DRAFT, by: "Alex Agent" });
    const done = await updatePlan({ id: created.id, patch: { done: true } });
    expect(done?.done).toBe(true);
    const edited = await updatePlan({ id: created.id, patch: { title: "Call Lorna again", time: "" } });
    expect(edited?.title).toBe("Call Lorna again");
    expect(edited?.time).toBe("");
    expect(edited?.done).toBe(true);
    // The fold reads the latest save for the id.
    const [folded] = applyPlanEvents(await listPlanEvents());
    expect(folded.title).toBe("Call Lorna again");
  });

  it("removes a plan and drops it from the fold", async () => {
    const created = await createPlan({ draft: DRAFT, by: "Alex Agent" });
    expect(await removePlan({ id: created.id })).toBe(true);
    expect(applyPlanEvents(await listPlanEvents())).toHaveLength(0);
    // Removing it again is a no-op, not a second event.
    expect(await removePlan({ id: created.id })).toBe(false);
    expect(await listPlanEvents()).toHaveLength(2);
  });

  it("returns null/false for an unknown id without writing", async () => {
    expect(await updatePlan({ id: "plan-nobody", patch: { done: true } })).toBeNull();
    expect(await removePlan({ id: "plan-nobody" })).toBe(false);
    expect(await listPlanEvents()).toHaveLength(0);
  });

  it("serializes concurrent writes so none is lost", async () => {
    await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        createPlan({ draft: { ...DRAFT, title: `Plan ${i}` }, by: "Alex Agent" }),
      ),
    );
    expect(await listPlanEvents()).toHaveLength(12);
  });

  it("refuses a corrupt store with a named 500 instead of starting from empty", async () => {
    await writeFile(storePath, "{ not json", "utf8");
    await expect(listPlanEvents()).rejects.toMatchObject({ status: 500 });
  });

  it("keeps the store path configurable, so tests never touch the repo store", () => {
    expect(agentPlanStorePath()).toBe(storePath);
  });
});

describe("the read path folds the planner journal", () => {
  it("listAgentPlans reads the same journal the calendar writes", async () => {
    const created = await createPlan({ draft: DRAFT, by: "Alex Agent" });
    const plans = await listAgentPlans();
    expect(plans.map((p) => p.id)).toEqual([created.id]);
    expect(plans[0].title).toBe("Call Lorna");
  });
});
