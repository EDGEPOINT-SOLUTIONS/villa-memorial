import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import personas from "@/lib/fixtures/auth/personas.json";
import {
  getAgentCommission,
  getAgentProspect,
  getAgentToday,
  listAgentClients,
} from "@/lib/api-client/agent";
import { listStageMoveEvents } from "@/lib/api-client/agent-store";

/**
 * The agent acquisition BFF route — `POST /api/agent/prospects/:id/stage`.
 *
 * The route is the write behind the lead record's step-by-step acquisition. It
 * must refuse an unauthenticated session, a session outside the agent portal, an
 * agent who does not own the record, and an illegal move (unknown, backward, or
 * with no note) — and each refusal must change nothing. A legal move must be
 * readable by every agent surface on the next read: the record, the list, the
 * dashboard total and the conversion funnel, and a sale must appear in the book.
 */

const cookieJar = vi.hoisted(() => ({ values: {} as Record<string, string> }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieJar.values ? { name, value: cookieJar.values[name] } : undefined,
  }),
}));

const stageRoute = await import("@/app/api/agent/prospects/[id]/stage/route");

const USER_ID = "00000000-0000-4000-8000-000000000013";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const AGENT_SCOPES = ["tenancy:modules:read", "catalog:read", "orders:read", "orders:write", "property:read"];
const STAFF_SCOPES = ["cases:write"];
const FAMILY_SCOPES = ["tenancy:modules:read", "catalog:read"];

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-agent-route-"));
  process.env.AGENT_STORE_PATH = path.join(dir, "agent-pipeline.json");
  cookieJar.values = {};
});

afterEach(async () => {
  delete process.env.AGENT_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signInAs(scopes: string[], displayName = "Alex Agent") {
  const now = Math.floor(Date.now() / 1000);
  cookieJar.values.im_at = `${b64url({ alg: "none", kid: "fixture" })}.${b64url({
    sub: USER_ID,
    tenant_id: TENANT_ID,
    scopes,
    iat: now,
    exp: now + 900,
  })}.fixture-not-signed`;
  cookieJar.values.im_u = Buffer.from(
    JSON.stringify({ id: USER_ID, tenant_id: TENANT_ID, email: "agent@vm.demo", display_name: displayName }),
    "utf8",
  ).toString("base64");
}

function post(id: string, body: unknown): Promise<Response> {
  return Promise.resolve(
    stageRoute.POST(
      new Request(`http://localhost/api/agent/prospects/${id}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    ),
  );
}

describe("the stage route's session and ownership gate", () => {  it("401s without a session and changes nothing", async () => {
    expect((await post("prospect-cecilia", { stage: "presentation", note: "x" })).status).toBe(401);
    expect(await listStageMoveEvents()).toHaveLength(0);
  });

  it("403s a session outside the agent portal", async () => {
    signInAs(FAMILY_SCOPES);
    expect((await post("prospect-cecilia", { stage: "presentation", note: "x" })).status).toBe(403);
    expect(await listStageMoveEvents()).toHaveLength(0);
  });

  it("403s an agent who does not own the record", async () => {
    signInAs(AGENT_SCOPES, "Someone Else");
    expect((await post("prospect-cecilia", { stage: "presentation", note: "x" })).status).toBe(403);
    expect(await listStageMoveEvents()).toHaveLength(0);
  });

  it("404s an unknown lead", async () => {
    signInAs(AGENT_SCOPES);
    expect((await post("prospect-nobody", { stage: "presentation", note: "x" })).status).toBe(404);
  });
});

describe("the guard invents no scope", () => {
  it("the agent persona holds no crm:* token, so the demo gates on portal membership and ownership", () => {
    const persona = (personas.personas as Array<{ email: string; scopes: string[] }>).find(
      (p) => p.email === "agent@vm.demo",
    );
    expect(persona).toBeTruthy();
    expect(persona!.scopes.some((s) => s.startsWith("crm:"))).toBe(false);
  });
});

describe("the stage route's validation", () => {
  it("422s a word outside the pipeline, a backward move and an empty note, writing nothing", async () => {
    signInAs(AGENT_SCOPES);
    const before = (await getAgentProspect("prospect-cecilia"))!.prospect;

    expect((await post("prospect-cecilia", { stage: "wishlist", note: "x" })).status).toBe(422);
    expect((await post("prospect-cecilia", { stage: "new", note: "x" })).status).toBe(422);
    expect((await post("prospect-cecilia", { stage: "presentation", note: "   " })).status).toBe(422);

    expect(await listStageMoveEvents()).toHaveLength(0);
    expect((await getAgentProspect("prospect-cecilia"))!.prospect.stage).toBe(before.stage);
  });

  it("names the field in the error body", async () => {
    signInAs(AGENT_SCOPES);
    const res = await post("prospect-cecilia", { stage: "new", note: "" });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { fieldErrors: Record<string, string> };
    expect(body.fieldErrors.stage).toBeTruthy();
    expect(body.fieldErrors.note).toBeTruthy();
  });
});

describe("a legal move reaches every agent surface", () => {
  it("advances the record and its history with the signed-in agent's name", async () => {
    signInAs(AGENT_SCOPES);
    const res = await post("prospect-cecilia", { stage: "presentation", note: "Visit booked for Saturday." });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { prospect: { stage: string; stage_history: unknown[] } };
    expect(body.prospect.stage).toBe("presentation");

    const record = (await getAgentProspect("prospect-cecilia"))!.prospect;
    expect(record.stage).toBe("presentation");
    const last = record.stage_history[record.stage_history.length - 1];
    expect(last.stage).toBe("presentation");
    expect(last.by).toBe("Alex Agent");
    expect(last.note).toBe("Visit booked for Saturday.");
  });

  it("lets staff move a record they do not own", async () => {
    signInAs(STAFF_SCOPES, "Sam Staff");
    const res = await post("prospect-cecilia", { stage: "presentation", note: "Office corrected the stage." });
    expect(res.status).toBe(201);
    expect((await getAgentProspect("prospect-cecilia"))!.prospect.stage).toBe("presentation");
  });
});

describe("conversion at Sold", () => {
  it("puts a sold prospect in the client book and moves every figure with it", async () => {
    signInAs(AGENT_SCOPES);
    const before = await getAgentToday();
    // Rosa Lim stands at Proposal; reserve her, then sell.
    expect((await post("prospect-rosa", { stage: "reserved", note: "Reserved the plan for her." })).status).toBe(201);
    expect((await post("prospect-rosa", { stage: "sold", note: "Signed and paid the reservation." })).status).toBe(201);

    const record = (await getAgentProspect("prospect-rosa"))!.prospect;
    expect(record.stage).toBe("sold");

    // The client book holds her, once, and the client record is readable.
    const clients = await listAgentClients();
    const converted = clients.find((c) => c.id === "client-prospect-rosa");
    expect(converted, "a sold prospect must appear in the client book").toBeDefined();
    expect(converted!.name).toBe("Rosa Lim");
    expect(clients.filter((c) => c.id === "client-prospect-rosa")).toHaveLength(1);

    // The funnel and the open pipeline both read the same move, and the dashboard's
    // "Sold this month" vital reads the SAME sold set — no two surfaces can disagree.
    const commission = await getAgentCommission();
    expect(commission.conversion.sales).toBe(1);
    expect(commission.conversion.example).toBe(false);
    const after = await getAgentToday();
    expect(after.numbers.pipeline_total_cents).toBe(
      before.numbers.pipeline_total_cents - record.possible_value_cents,
    );
    expect(after.numbers.sales_count).toBe(commission.conversion.sales);
    expect(after.numbers.sales_total_cents).toBe(record.possible_value_cents);
  });
});

// Test-only demo seed: the product fixtures start clean (captain, 2026-10-02).
// This suite exercises the recorded records through a test-only copy, so the
// pages keep their content-bearing contract tests without restoring demo data.
vi.mock("@/lib/fixtures/agent/workspace.json", async () => ({
  default: (await import("../fixtures/agent-workspace-demo.json")).default,
}));
vi.mock("@/lib/fixtures/family/snapshot.json", async () => ({
  default: (await import("../fixtures/family-snapshot-demo.json")).default,
}));
vi.mock("@/lib/fixtures/family/workspace.json", async () => ({
  default: (await import("../fixtures/family-workspace-demo.json")).default,
}));
vi.mock("@/lib/fixtures/family/case.json", async () => ({
  default: (await import("../fixtures/family-case-demo.json")).default,
}));
