import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getAgentProspect, listAgentProspects, listProspectBlasts } from "@/lib/api-client/agent";
import { listAssignmentEvents } from "@/lib/api-client/agent-store";
import { getFixtureInquiry } from "@/lib/api-client/inquiry-store";
/* --- test-only demo fixtures (clean start, captain 2026-10-02) --- */
vi.mock("@/lib/fixtures/crm/inquiries.json", async () => ({
  default: (await import("../fixtures/inquiries-demo.json")).default,
}));
/* --- end test-only demo fixtures --- */


/**
 * The office's Prospect + Inquiry BFF routes.
 *
 * Every write is guarded by the staff scope (UX, not security — the store is the
 * demo authority) and every refusal must change nothing. A legal write must reach
 * BOTH boards: a created prospect appears in the agent pipeline, an advance moves
 * its stage, an assignment folds into the agent's owner and leaves the durable
 * notice, and a blast is recorded on the shared journal. The enquiry routes move
 * the board's own status and convert one enquiry into a prospect in one step.
 */

const cookieJar = vi.hoisted(() => ({ values: {} as Record<string, string> }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieJar.values ? { name, value: cookieJar.values[name] } : undefined,
  }),
}));

const createRoute = await import("@/app/api/staff/prospects/route");
const prospectRoute = await import("@/app/api/staff/prospects/[id]/route");
const blastRoute = await import("@/app/api/staff/prospects/blast/route");
const inquiryRoute = await import("@/app/api/staff/inquiries/[id]/route");

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const STAFF_READ = ["cases:read"];
const STAFF_WRITE = ["cases:write"];
const FAMILY = ["tenancy:modules:read", "catalog:read"];

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-prospects-route-"));
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

function signInAs(scopes: string[], displayName = "Sam Staff") {
  const now = Math.floor(Date.now() / 1000);
  cookieJar.values.im_at = `${b64url({ alg: "none", kid: "fixture" })}.${b64url({
    sub: USER_ID,
    tenant_id: TENANT_ID,
    scopes,
    iat: now,
    exp: now + 900,
  })}.fixture-not-signed`;
  cookieJar.values.im_u = Buffer.from(
    JSON.stringify({ id: USER_ID, tenant_id: TENANT_ID, email: "sam.staff@vm.demo", display_name: displayName }),
    "utf8",
  ).toString("base64");
}

function request(url: string, body: unknown): Request {
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const CREATE_BODY = {
  name: "Nena Bautista",
  phone: "+63 917 000 0001",
  email: "nena@example.com",
  source: "walk_in",
  need: "plan",
  want: "A pre-need plan",
  note: "Walked in after the service.",
};

describe("the staff gate", () => {
  it("401s without a session and writes nothing", async () => {
    expect((await createRoute.POST(request("/api/staff/prospects", CREATE_BODY))).status).toBe(401);
    expect(await listAgentProspects()).toHaveLength(0);
  });

  it("403s a session without cases:write", async () => {
    signInAs(FAMILY);
    expect((await createRoute.POST(request("/api/staff/prospects", CREATE_BODY))).status).toBe(403);
    expect(await listAgentProspects()).toHaveLength(0);
  });

  it("403s a staff read-only session on a write", async () => {
    signInAs(STAFF_READ);
    expect((await createRoute.POST(request("/api/staff/prospects", CREATE_BODY))).status).toBe(403);
  });
});

describe("creating a prospect", () => {
  it("422s an incomplete prospect and writes nothing", async () => {
    signInAs(STAFF_WRITE);
    const res = await createRoute.POST(request("/api/staff/prospects", { phone: "", need: "plan" }));
    expect(res.status).toBe(422);
    expect(await listAgentProspects()).toHaveLength(0);
  });

  it("201s a valid prospect that the agent pipeline reads immediately", async () => {
    signInAs(STAFF_WRITE);
    const res = await createRoute.POST(request("/api/staff/prospects", CREATE_BODY));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { prospect: { name: string; email: string; owner: string } };
    expect(body.prospect.name).toBe("Nena Bautista");
    expect(body.prospect.email).toBe("nena@example.com");
    expect(body.prospect.owner).toBe("Sam Staff");

    const agentSide = await listAgentProspects();
    expect(agentSide.map((p) => p.name)).toContain("Nena Bautista");
  });
});

describe("advancing and assigning", () => {
  it("404s an unknown prospect and 422s a backward state", async () => {
    signInAs(STAFF_WRITE);
    expect(
      (await prospectRoute.POST(request("/api/staff/prospects/nope", { action: "advance", state: "contacted" }), { params: Promise.resolve({ id: "nope" }) })).status,
    ).toBe(404);

    await createRoute.POST(request("/api/staff/prospects", CREATE_BODY));
    const before = (await listAgentProspects())[0];
    const backward = await prospectRoute.POST(
      request(`/api/staff/prospects/${before.id}`, { action: "advance", state: "new" }),
      { params: Promise.resolve({ id: before.id }) },
    );
    expect(backward.status).toBe(422);
    expect((await getAgentProspect(before.id))!.prospect.stage).toBe("new");
  });

  it("advances to Contacted and then Converted on the agent's own stage line", async () => {
    signInAs(STAFF_WRITE);
    await createRoute.POST(request("/api/staff/prospects", CREATE_BODY));
    const id = (await listAgentProspects())[0].id;

    expect(
      (await prospectRoute.POST(request(`/api/staff/prospects/${id}`, { action: "advance", state: "contacted" }), { params: Promise.resolve({ id }) })).status,
    ).toBe(201);
    expect((await getAgentProspect(id))!.prospect.stage).toBe("contacted");

    expect(
      (await prospectRoute.POST(request(`/api/staff/prospects/${id}`, { action: "advance", state: "converted" }), { params: Promise.resolve({ id }) })).status,
    ).toBe(201);
    expect((await getAgentProspect(id))!.prospect.stage).toBe("sold");
  });

  it("assigns to a recorded agent, folds the owner and leaves the notice", async () => {
    signInAs(STAFF_WRITE);
    await createRoute.POST(request("/api/staff/prospects", CREATE_BODY));
    const id = (await listAgentProspects())[0].id;

    const assigned = await prospectRoute.POST(
      request(`/api/staff/prospects/${id}`, { action: "assign", agent: "Alex Agent", note: "Please call today." }),
      { params: Promise.resolve({ id }) },
    );
    expect(assigned.status).toBe(201);
    expect((await getAgentProspect(id))!.prospect.owner).toBe("Alex Agent");

    const events = await listAssignmentEvents();
    expect(events).toHaveLength(1);
    expect(events[0].by).toBe("Sam Staff");
  });

  it("422s an assignment to somebody who is not an agent", async () => {
    signInAs(STAFF_WRITE);
    await createRoute.POST(request("/api/staff/prospects", CREATE_BODY));
    const id = (await listAgentProspects())[0].id;
    const res = await prospectRoute.POST(
      request(`/api/staff/prospects/${id}`, { action: "assign", agent: "Nobody At All", note: "" }),
      { params: Promise.resolve({ id }) },
    );
    expect(res.status).toBe(422);
    expect(await listAssignmentEvents()).toHaveLength(0);
  });
});

describe("the email blast", () => {
  it("422s a blast with no recipients and records a valid one", async () => {
    signInAs(STAFF_WRITE);
    await createRoute.POST(request("/api/staff/prospects", CREATE_BODY));
    const id = (await listAgentProspects())[0].id;

    const empty = await blastRoute.POST(
      request("/api/staff/prospects/blast", { subject: "Hello", message: "Body", prospectIds: [] }),
    );
    expect(empty.status).toBe(422);

    const sent = await blastRoute.POST(
      request("/api/staff/prospects/blast", {
        subject: "2026 price list",
        message: "Here is the sheet you asked for.",
        prospectIds: [id],
      }),
    );
    expect(sent.status).toBe(201);
    const blasts = await listProspectBlasts();
    expect(blasts).toHaveLength(1);
    expect(blasts[0].recipients).toEqual(["nena@example.com"]);
    expect(blasts[0].state).toBe("queued");
  });
});

describe("the enquiry moves", () => {
  const CECILIA = "00000000-0000-4000-8000-000000000301";
  const PAOLO = "00000000-0000-4000-8000-000000000302";

  it("moves an enquiry New → Contacted and folds the status back", async () => {
    signInAs(STAFF_WRITE);
    const res = await inquiryRoute.POST(
      request(`/api/staff/inquiries/${CECILIA}`, { action: "status", status: "contacted" }),
      { params: Promise.resolve({ id: CECILIA }) },
    );
    expect(res.status).toBe(201);
    expect((await getFixtureInquiry(CECILIA))!.status).toBe("contacted");

    const backward = await inquiryRoute.POST(
      request(`/api/staff/inquiries/${CECILIA}`, { action: "status", status: "contacted" }),
      { params: Promise.resolve({ id: CECILIA }) },
    );
    expect(backward.status).toBe(422);
  });

  it("converts an enquiry into a prospect in one step and marks it Converted", async () => {
    signInAs(STAFF_WRITE);
    const res = await inquiryRoute.POST(
      request(`/api/staff/inquiries/${PAOLO}`, { action: "convert", need: "services", agent: "Alex Agent", note: "Office hand-off." }),
      { params: Promise.resolve({ id: PAOLO }) },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { prospect: { name: string; stage: string; owner: string } };
    expect(body.prospect.name).toBe("Paolo Mendoza");
    // Paolo was Contacted, so the prospect lands Contacted (not New).
    expect(body.prospect.stage).toBe("contacted");
    expect(body.prospect.owner).toBe("Alex Agent");
    expect((await getFixtureInquiry(PAOLO))!.status).toBe("converted");

    const again = await inquiryRoute.POST(
      request(`/api/staff/inquiries/${PAOLO}`, { action: "convert", need: "services" }),
      { params: Promise.resolve({ id: PAOLO }) },
    );
    expect(again.status).toBe(422);
  });
});
