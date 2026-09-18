import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  CASE_STAGES,
  STAGE_TASK_TEMPLATE,
  isCaseStage,
  isCaseTaskStatus,
  nextStage,
  stageIndex,
  stageTaskTitlesToAdd,
  type CaseTask,
} from "@/lib/operations/case-board";
import { moveCaseStage, setTaskStatus } from "@/lib/operations/board-api";
import { getCase, listCases, setCaseStage, setCaseTaskStatus } from "@/lib/api-client/operations";
import { ApiError } from "@/lib/api-client/api-error";

/**
 * The ops board's two writes (F-07): the board could see the work and not move it.
 *
 * What is pinned here:
 *  · the vocabulary the board offers is the frozen `case-events-v1` one — stage order,
 *    the per-stage task template, the three task statuses — so a drifted local copy
 *    cannot slip in unnoticed;
 *  · the fixture-mode write goes through the durable store (the journal is re-read on
 *    every call, so the assertions below are reading the file back, not a cache) and
 *    shows up in the very readers the screens and the dashboard use;
 *  · every refusal is specific and leaves the record alone (unknown case/task → 404, a
 *    move to the stage the case is already in → 422, corrupt journal → 500);
 *  · the browser side sends the contract's path and method, and a refused write throws
 *    the BFF's own message instead of a generic one.
 *
 * Every test points OPERATIONS_STORE_PATH at its own throwaway file, so nothing here
 * touches the repo's .data/ demo store.
 */

/* ------------------------- vocabulary (pure) ---------------------------- */

describe("ops board vocabulary (case-events-v1)", () => {
  it("keeps the frozen stage order", () => {
    expect(CASE_STAGES).toEqual([
      "inquiry",
      "retrieval",
      "preparation",
      "viewing",
      "ceremony",
      "interment",
      "completed",
    ]);
  });

  it("keeps the contract's per-stage task template", () => {
    // Transcribed from docs/08-delivery/contracts/case-events-v1.md §Task templates.
    expect(STAGE_TASK_TEMPLATE).toEqual({
      inquiry: ["Confirm family contact details", "Record deceased details"],
      retrieval: ["Dispatch retrieval team", "Confirm location details"],
      preparation: ["Confirm embalming completion", "Prepare preparation room"],
      viewing: ["Set up viewing room", "Coordinate family arrival"],
      ceremony: ["Prepare ceremony program", "Confirm officiant"],
      interment: ["Confirm lot readiness", "Schedule interment crew"],
      completed: ["Return documents to family"],
    });
  });

  it("accepts only the frozen stage and task-status members", () => {
    for (const stage of CASE_STAGES) expect(isCaseStage(stage)).toBe(true);
    for (const status of ["pending", "in_progress", "done"]) {
      expect(isCaseTaskStatus(status)).toBe(true);
    }
    for (const bad of ["", "Inquiry", "archived", 0, null, undefined, {}]) {
      expect(isCaseStage(bad)).toBe(false);
      expect(isCaseTaskStatus(bad)).toBe(false);
    }
  });

  it("allows skipping ahead and correcting backwards, and stops at completed", () => {
    expect(nextStage("inquiry")).toBe("retrieval");
    expect(nextStage("interment")).toBe("completed");
    expect(nextStage("completed")).toBeNull();
    // Any other stage is a legal target — the board does not narrow the contract.
    expect(stageIndex("ceremony") - stageIndex("inquiry")).toBe(4);
    expect(stageIndex("retrieval") - stageIndex("viewing")).toBeLessThan(0);
  });

  it("adds only the template tasks the case does not already have", () => {
    const existing: CaseTask[] = [{ id: "t1", title: "Set up viewing room", status: "done" }];
    expect(stageTaskTitlesToAdd("viewing", existing)).toEqual(["Coordinate family arrival"]);
    expect(stageTaskTitlesToAdd("interment", existing)).toEqual(STAGE_TASK_TEMPLATE.interment);
  });
});

/* ------------------ fixture store + the readers screens use -------------- */

describe("ops board writes in fixture mode", () => {
  let dir: string;
  let store: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "vm-ops-board-"));
    store = path.join(dir, "cases.json");
    process.env.OPERATIONS_STORE_PATH = store;
  });

  afterEach(async () => {
    delete process.env.OPERATIONS_STORE_PATH;
    await rm(dir, { recursive: true, force: true });
  });

  it("seeds every task with the contract's id, unique inside its case", async () => {
    for (const kase of await listCases()) {
      const ids = kase.tasks.map((task) => task.id);
      expect(ids.every((id) => id.startsWith(kase.case_number))).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("records a task tick in the store and reads it back", async () => {
    const before = await getCase("00000000-0000-4000-8000-000000000C06");
    expect(before.stage).toBe("inquiry");
    expect(before.tasks[0].status).toBe("pending");

    const updated = await setCaseTaskStatus(before.case_number, before.tasks[0].id, "done");
    expect(updated.tasks[0].status).toBe("done");
    expect(updated.updated_at).not.toBe(before.updated_at);

    // The journal is the authority on the next read — and so is the LIST the cases
    // screen and the dashboard read.
    expect((await getCase(before.id)).tasks[0].status).toBe("done");
    const listed = (await listCases()).find((c) => c.id === before.id)!;
    expect(listed.tasks[0].status).toBe("done");
    expect(listed.updated_at).toBe(updated.updated_at);
    // Nothing else moved.
    expect(listed.tasks[1].status).toBe("pending");
  });

  it("refuses a task the case does not carry, and a case that does not exist", async () => {
    await expect(
      setCaseTaskStatus("CASE-2026-0006", "CASE-2026-0006-t99", "done"),
    ).rejects.toMatchObject({ status: 404, message: "not_found" });
    await expect(
      setCaseTaskStatus("CASE-2026-9999", "CASE-2026-9999-t1", "done"),
    ).rejects.toMatchObject({ status: 404, message: "not_found" });
  });

  it("moves a stage, appends that stage's tasks, and refuses a move to the same stage", async () => {
    const kase = await getCase("00000000-0000-4000-8000-000000000C06");
    const before = kase.tasks.map((t) => t.title);
    expect(before.length).toBeGreaterThan(0);

    const moved = await setCaseStage(kase.case_number, "preparation");
    expect(moved.stage).toBe("preparation");
    // The case keeps every task it had and gains this stage's template rows.
    expect(moved.tasks.map((t) => t.title)).toEqual([
      ...before,
      ...STAGE_TASK_TEMPLATE.preparation,
    ]);
    // The appended rows are addressable: fresh ids, unique inside the case.
    const appended = moved.tasks.slice(before.length);
    expect(appended.every((t) => t.id.startsWith(kase.case_number))).toBe(true);
    expect(new Set(moved.tasks.map((t) => t.id)).size).toBe(moved.tasks.length);
    expect(appended.every((t) => t.status === "pending")).toBe(true);

    await expect(setCaseStage(kase.case_number, "preparation")).rejects.toMatchObject({
      status: 422,
      message: "the case is already at that stage",
    });
  });

  it("refuses a stage outside the frozen enum before it reaches the journal", async () => {
    await expect(setCaseStage("CASE-2026-0006", "training" as never)).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining("unknown case stage"),
    });
  });

  it("allows a backward correction and never duplicates a stage's tasks", async () => {
    const kase = await getCase("00000000-0000-4000-8000-000000000C05");
    expect(kase.stage).toBe("ceremony");

    // Backwards (a correction) is a legal move, and it brings that stage's tasks.
    const back = await setCaseStage(kase.case_number, "interment");
    expect(back.stage).toBe("interment");
    expect(back.tasks.map((t) => t.title)).toEqual(
      expect.arrayContaining(STAGE_TASK_TEMPLATE.interment),
    );

    // There and back twice: a stage's tasks are appended once, never once per visit.
    const there = await setCaseStage(kase.case_number, "ceremony");
    await setCaseStage(kase.case_number, "interment");
    const backAgain = await setCaseStage(kase.case_number, "ceremony");
    expect(backAgain.tasks.length).toBe(there.tasks.length);
    expect(backAgain.tasks.filter((t) => t.title === "Confirm officiant")).toHaveLength(1);
    expect(backAgain.tasks.filter((t) => t.title === "Schedule interment crew")).toHaveLength(1);
  });

  it("shows both writes on the board the staff member re-opens", async () => {
    const kase = await getCase("00000000-0000-4000-8000-000000000C02");
    await setCaseTaskStatus(kase.case_number, kase.tasks[0].id, "done");
    await setCaseStage(kase.case_number, "interment");

    const reopened = (await listCases()).find((c) => c.id === kase.id)!;
    expect(reopened.tasks[0].status).toBe("done");
    expect(reopened.stage).toBe("interment");
    expect(await listCases()).toHaveLength(7);
  });

  it("fails loudly on a journal it cannot trust instead of guessing", async () => {
    await writeFile(store, "{ not json", "utf8");
    await expect(
      setCaseTaskStatus("CASE-2026-0006", "CASE-2026-0006-t1", "done"),
    ).rejects.toMatchObject({
      status: 500,
      message: expect.stringContaining("not valid JSON"),
    });
  });
});

/* --------------------------- client write API --------------------------- */

describe("board writes from the browser (lib/operations/board-api.ts)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch(handler: (url: string, init: RequestInit) => Response) {
    const calls: Array<{ url: string; method: string; body: unknown }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, method: init.method ?? "", body: JSON.parse(String(init.body)) });
      return handler(url, init);
    });
    return calls;
  }

  it("PATCHes the task path the contract names", async () => {
    const calls = stubFetch(() => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await setTaskStatus("CASE-2026-0006", "CASE-2026-0006-t1", "done");
    expect(calls).toEqual([
      {
        url: "/api/cases/CASE-2026-0006/tasks/CASE-2026-0006-t1",
        method: "PATCH",
        body: { status: "done" },
      },
    ]);
  });

  it("POSTs the stage move and carries the server's own refusal verbatim", async () => {
    const calls = stubFetch(() =>
      new Response(JSON.stringify({ error: "backward moves must be recorded by an admin" }), {
        status: 422,
      }),
    );
    await expect(moveCaseStage("CASE-2026-0006", "preparation")).rejects.toMatchObject({
      message: "backward moves must be recorded by an admin",
      status: 422,
    });
    expect(calls[0].url).toBe("/api/cases/CASE-2026-0006/stage");
    expect(calls[0].body).toEqual({ stage: "preparation" });
  });

  it("answers an unreachable route with a plain sentence, not a stack", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("ECONNREFUSED");
    });
    await expect(setTaskStatus("CASE-2026-0006", "t1", "done")).rejects.toBeInstanceOf(ApiError);
    await expect(setTaskStatus("CASE-2026-0006", "t1", "done")).rejects.toMatchObject({
      message: expect.stringContaining("Could not reach"),
    });
  });

  it("falls back to the route's generic sentence when the body carries no message", async () => {
    stubFetch(() => new Response("not json", { status: 502 }));
    await expect(moveCaseStage("CASE-2026-0006", "viewing")).rejects.toMatchObject({
      message: "The stage was not changed.",
    });
  });
});
