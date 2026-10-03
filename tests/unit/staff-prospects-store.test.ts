import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  getAgentProspect,
  listAgentClients,
  listAgentProspects,
  listAssignmentNotices,
  listProspectAssignments,
  listProspectBlasts,
} from "@/lib/api-client/agent";
import {
  listAssignmentEvents,
  recordProspectAssignment,
  recordProspectBlast,
  recordProspectCapture,
  recordStageMove,
} from "@/lib/api-client/agent-store";
import { applyAssignments, assignmentNotices, capturedProspects, type CapturedLead } from "@/lib/agent/acquisition";
import {
  prospectCounts,
  readProspectAssignment,
  readProspectBlast,
  readProspectIntake,
  readProspectStateMove,
} from "@/lib/crm/prospect-actions";
import { prospectStateOf, prospectStateStage } from "@/lib/crm/prospect-view";

/**
 * The Prospects store fold and its pure readings.
 *
 * The office's Prospects screen and the agent's pipeline must read ONE record:
 * a prospect the office types reaches the agent, the office's state move appears
 * in the agent's stage, and an assignment changes the agent's `owner` and leaves
 * a durable notice. These assertions pin that fold and the four pure readings the
 * BFF routes run, because the journal mechanics themselves are pinned once in
 * `journal-single-source` and each store's own suite.
 */

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-prospects-store-"));
  process.env.AGENT_STORE_PATH = path.join(dir, "agent-pipeline.json");
});

afterEach(async () => {
  delete process.env.AGENT_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

function capture(over: Partial<CapturedLead> = {}): Omit<CapturedLead, "captured_at"> {
  return {
    id: "prospect-one",
    name: "Nena Bautista",
    phone: "+63 917 000 0001",
    email: "nena@example.com",
    source: "walk_in",
    interest: "plan",
    want: "A pre-need plan for a parent",
    callback: "after 6pm",
    note: "Walked in after the Sunday service.",
    captured_by: "Sam Staff",
    ...over,
  };
}

describe("the pure prospect readings", () => {
  it("reads a new prospect, defaulting the source and keeping a missing email empty", () => {
    const verdict = readProspectIntake({ phone: "+63 917 000 0002", need: "lot" });
    expect(verdict.ok).toBe(true);
    if (!verdict.ok) return;
    expect(verdict.value.source).toBe("walk_in");
    expect(verdict.value.email).toBe("");
    expect(verdict.value.interest).toBe("lot");
  });

  it("accepts a prospect with no phone but refuses an unknown need", () => {
    // 2026-10-03 flow audit: phone is optional now; the case is where a
    // reachable contact is required.
    const noPhone = readProspectIntake({ phone: "", need: "plan" });
    expect(noPhone.ok).toBe(true);
    if (!noPhone.ok) return;
    expect(noPhone.value.phone).toBe("");

    const noNeed = readProspectIntake({ phone: "0917", need: "wishlist" });
    expect(noNeed.ok).toBe(false);
    if (noNeed.ok) return;
    expect(noNeed.errors.need).toBeTruthy();
  });

  it("maps each office state to a pipeline stage and refuses a backward move", () => {
    expect(prospectStateStage("new")).toBe("new");
    expect(prospectStateStage("contacted")).toBe("contacted");
    expect(prospectStateStage("converted")).toBe("sold");

    const forward = readProspectStateMove({ state: "contacted", currentStage: "new" });
    expect(forward.ok).toBe(true);
    if (forward.ok) expect(forward.stage).toBe("contacted");

    const backward = readProspectStateMove({ state: "contacted", currentStage: "qualified" });
    expect(backward.ok).toBe(false);
    if (backward.ok) return;
    expect(backward.errors.state).toBeTruthy();
  });

  it("derives the office state from the one pipeline stage", () => {
    expect(prospectStateOf("new")).toBe("new");
    expect(prospectStateOf("contacted")).toBe("contacted");
    expect(prospectStateOf("reserved")).toBe("contacted");
    expect(prospectStateOf("sold")).toBe("converted");
  });

  it("accepts only a recorded agent for an assignment", () => {
    const good = readProspectAssignment({ agent: "Alex Agent", note: "", agents: ["Alex Agent"] });
    expect(good.ok).toBe(true);
    const bad = readProspectAssignment({ agent: "Nobody", note: "", agents: ["Alex Agent"] });
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.errors.agent).toBeTruthy();
  });

  it("requires a subject, a body and at least one prospect with an address", () => {
    const prospects = [
      { id: "p1", email: "a@example.com" },
      { id: "p2", email: "" },
    ];
    expect(readProspectBlast({ subject: "", message: "x", prospectIds: ["p1"] }, prospects).ok).toBe(false);
    expect(readProspectBlast({ subject: "s", message: "", prospectIds: ["p1"] }, prospects).ok).toBe(false);
    expect(readProspectBlast({ subject: "s", message: "x", prospectIds: [] }, prospects).ok).toBe(false);
    expect(readProspectBlast({ subject: "s", message: "x", prospectIds: ["p2"] }, prospects).ok).toBe(false);

    const good = readProspectBlast({ subject: "s", message: "x", prospectIds: ["p1"] }, prospects);
    expect(good.ok).toBe(true);
    if (good.ok) expect(good.recipients).toEqual(["a@example.com"]);
  });

  it("counts the three office states off the one record", () => {
    const counts = prospectCounts([{ stage: "new" }, { stage: "contacted" }, { stage: "sold" }]);
    expect(counts).toEqual({ total: 3, new: 1, contacted: 1, converted: 1 });
  });
});

describe("the shared store fold", () => {
  it("folds an office capture into the agent's pipeline and keeps the email", async () => {
    await recordProspectCapture({ capture: capture() });
    const prospects = await listAgentProspects();
    expect(prospects).toHaveLength(1);
    expect(prospects[0].email).toBe("nena@example.com");
    expect(prospects[0].stage).toBe("new");

    const folded = capturedProspects([{ ...capture(), captured_at: "2026-10-02T02:00:00Z" }]);
    expect(folded[0].email).toBe("nena@example.com");
  });

  it("applies the LAST assignment as the owner and leaves the agent a durable notice", async () => {
    await recordProspectCapture({ capture: capture() });
    await recordProspectAssignment({ prospectId: "prospect-one", agent: "Alex Agent", by: "Sam Staff", note: "Please call." });
    await recordProspectAssignment({ prospectId: "prospect-one", agent: "Jose Mendoza", by: "Ada Admin", note: "Hand over." });

    const record = (await getAgentProspect("prospect-one"))!.prospect;
    expect(record.owner).toBe("Jose Mendoza");

    const assignments = await listAssignmentEvents();
    expect(assignments).toHaveLength(2);

    const notices = await listAssignmentNotices("Jose Mendoza");
    expect(notices).toHaveLength(1);
    expect(notices[0].name).toBe("Nena Bautista");
    expect(notices[0].by).toBe("Ada Admin");
    expect(await listAssignmentNotices("Alex Agent")).toHaveLength(1);

    // The pure fold agrees with the client read.
    const pure = applyAssignments(await listAgentProspects(), assignments);
    expect(pure[0].owner).toBe("Jose Mendoza");
    expect(assignmentNotices(pure, assignments, "Jose Mendoza")).toHaveLength(1);
  });

  it("moves the office state through the agent's stage line and converts at Sold", async () => {
    await recordProspectCapture({ capture: capture() });
    await recordStageMove({ prospectId: "prospect-one", stage: "contacted", by: "Sam Staff", note: "Marked Contacted by the office." });
    expect(prospectStateOf((await getAgentProspect("prospect-one"))!.prospect.stage)).toBe("contacted");

    await recordStageMove({ prospectId: "prospect-one", stage: "sold", by: "Sam Staff", note: "Marked Converted by the office." });
    const record = (await getAgentProspect("prospect-one"))!.prospect;
    expect(prospectStateOf(record.stage)).toBe("converted");

    const clients = await listAgentClients();
    expect(clients.map((c) => c.name)).toContain("Nena Bautista");
  });

  it("records an email blast on the same journal", async () => {
    await recordProspectCapture({ capture: capture() });
    const blast = await recordProspectBlast({
      blast: {
        id: "blast-one",
        subject: "2026 price list",
        message: "Here is the sheet you asked for.",
        channel: "email",
        prospect_ids: ["prospect-one"],
        recipients: ["nena@example.com"],
        by: "Sam Staff",
      },
    });
    expect(blast.state).toBe("queued");
    const blasts = await listProspectBlasts();
    expect(blasts).toHaveLength(1);
    expect(blasts[0].recipients).toEqual(["nena@example.com"]);
    expect(await listProspectAssignments()).toHaveLength(0);
  });
});
