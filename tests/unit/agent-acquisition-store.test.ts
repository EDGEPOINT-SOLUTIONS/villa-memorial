import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  agentPipelineStorePath,
  listStageMoveEvents,
  recordStageMove,
} from "@/lib/api-client/agent-store";
import { applyStageMoves, convertedClients, pipelineValueCents, soldTotals } from "@/lib/agent/acquisition";
import type { Client, Prospect } from "@/lib/api-client/agent";

/**
 * The agent acquisition store — the durable demo journal behind the lead record's
 * stage moves.
 *
 * The store must survive a restart (append-only journal), never lose a concurrent
 * write (one promise chain), and never serve a half file (temp + fsync + rename).
 * The fold is pure: a move changes the standing stage, appends to the record's own
 * history and moves the last-contact stamp, and a sold prospect becomes a client.
 */

let dir: string;
let storePath: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-agent-store-"));
  storePath = path.join(dir, "agent-pipeline.json");
  process.env.AGENT_STORE_PATH = storePath;
});

afterEach(async () => {
  delete process.env.AGENT_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

function prospect(over: Partial<Prospect> = {}): Prospect {
  return {
    id: "prospect-test",
    name: "Test Person",
    phone: "+63 900 000 0000",
    email: "test@example.com",
    source: "walk_in",
    interest: "plan",
    want: "Test plan",
    stage: "contacted",
    owner: "Alex Agent",
    possible_value_cents: 100_000,
    first_contact_at: "2026-09-01T01:00:00.000Z",
    last_contact_at: "2026-09-05T01:00:00.000Z",
    stage_history: [{ stage: "new", at: "2026-09-01T01:00:00.000Z", by: "Alex Agent", note: "Enquiry." }],
    next_action: "Call back",
    urgency: "warm",
    best_time: "After 4 PM",
    notes: "",
    ...over,
  };
}

describe("the acquisition journal", () => {
  it("appends moves oldest first and reads them back", async () => {
    await recordStageMove({ prospectId: "p1", stage: "qualified", by: "Alex Agent", note: "A", now: new Date("2026-10-01T01:00:00Z") });
    await recordStageMove({ prospectId: "p2", stage: "contacted", by: "Alex Agent", note: "B", now: new Date("2026-10-01T02:00:00Z") });

    const events = await listStageMoveEvents();
    expect(events.map((e) => e.prospect_id)).toEqual(["p1", "p2"]);
    expect(events.map((e) => e.note)).toEqual(["A", "B"]);
  });

  it("writes a valid journal envelope atomically", async () => {
    await recordStageMove({ prospectId: "p1", stage: "qualified", by: "Alex Agent", note: "A" });
    const raw = JSON.parse(await readFile(storePath, "utf8")) as { version: number; events: unknown[] };
    expect(raw.version).toBe(1);
    expect(raw.events).toHaveLength(1);
  });

  it("serializes concurrent writes so none is lost", async () => {
    await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        recordStageMove({ prospectId: `p${i}`, stage: "qualified", by: "Alex Agent", note: `move ${i}` }),
      ),
    );
    expect(await listStageMoveEvents()).toHaveLength(12);
  });

  it("refuses a corrupt store with a named 500 instead of starting from the seed", async () => {
    await writeFile(storePath, "{ not json", "utf8");
    await expect(listStageMoveEvents()).rejects.toMatchObject({ status: 500 });
  });

  it("keeps the store path configurable, so tests never touch the repo store", () => {
    expect(agentPipelineStorePath()).toBe(storePath);
  });
});

describe("the fold", () => {
  const events = [
    { prospect_id: "prospect-test", stage: "qualified", at: "2026-10-01T01:00:00.000Z", by: "Alex Agent", note: "Qualified." },
    { prospect_id: "prospect-test", stage: "presentation", at: "2026-10-02T01:00:00.000Z", by: "Alex Agent", note: "Visit booked." },
  ];

  it("moves the stage, appends the history and advances last contact", () => {
    const [folded] = applyStageMoves([prospect()], events);
    expect(folded.stage).toBe("presentation");
    expect(folded.stage_history.map((e) => e.stage)).toEqual([
      "new",
      "qualified",
      "presentation",
    ]);
    expect(folded.stage_history[2].note).toBe("Visit booked.");
    expect(folded.last_contact_at).toBe("2026-10-02T01:00:00.000Z");
  });

  it("leaves an untouched prospect and the seed itself unchanged", () => {
    const seed = prospect({ id: "prospect-untouched" });
    const [folded] = applyStageMoves([seed], events);
    expect(folded.stage).toBe("contacted");
    expect(seed.stage_history).toHaveLength(1);
  });

  it("converts a sold prospect into one client, once", () => {
    const sold = applyStageMoves(
      [prospect({ stage: "reserved" })],
      [{ prospect_id: "prospect-test", stage: "sold", at: "2026-10-03T01:00:00.000Z", by: "Alex Agent", note: "Paid." }],
    );
    const existing: Client[] = [];
    const created = convertedClients(sold, existing);
    expect(created).toHaveLength(1);
    expect(created[0].name).toBe("Test Person");
    expect(created[0].since).toBe("2026");
    expect(created[0].holdings[0].label).toBe("Test plan");
    // A second fold does not mint a duplicate: the client id is the record.
    expect(convertedClients(sold, created)).toHaveLength(0);
  });

  it("takes a sold prospect out of the open pipeline value", () => {
    const open = [prospect({ id: "a", possible_value_cents: 100 }), prospect({ id: "b", possible_value_cents: 200 })];
    expect(pipelineValueCents(open)).toBe(300);
    const sold = applyStageMoves(open, [
      { prospect_id: "b", stage: "sold", at: "2026-10-03T01:00:00.000Z", by: "Alex Agent", note: "Paid." },
    ]);
    expect(pipelineValueCents(sold)).toBe(100);
    // The sold count and value are the ONE source the vital and the funnel read.
    expect(soldTotals(sold)).toEqual({ count: 1, totalCents: 200 });
  });
});
