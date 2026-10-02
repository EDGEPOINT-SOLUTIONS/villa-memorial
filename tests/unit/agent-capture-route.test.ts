import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { listAgentProspects } from "@/lib/api-client/agent";
import { listProspectCaptureEvents } from "@/lib/api-client/agent-store";

/**
 * The agent capture BFF route — `POST /api/agent/prospects`.
 *
 * The clean start (captain, 2026-10-02) leaves the pipeline empty, so this is the
 * write that starts the workflow: a lead captured at /agent/new must reach every
 * agent surface on the next read. The route refuses an unauthenticated session and
 * an invalid capture, and a legal capture must be readable as a pipeline prospect.
 */
const cookieJar = vi.hoisted(() => ({ values: {} as Record<string, string> }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieJar.values ? { name, value: cookieJar.values[name] } : undefined,
  }),
}));

const captureRoute = await import("@/app/api/agent/prospects/route");

const USER_ID = "00000000-0000-4000-8000-000000000013";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const AGENT_SCOPES = ["tenancy:modules:read", "catalog:read", "orders:read", "orders:write", "property:read"];
const FAMILY_SCOPES = ["tenancy:modules:read", "catalog:read"];

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-agent-capture-"));
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

function post(body: unknown): Promise<Response> {
  return Promise.resolve(
    captureRoute.POST(
      new Request("http://localhost/api/agent/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
}

const VALID = {
  name: "Nena Bautista",
  phone: "+63 917 000 1111",
  need: "plan",
  source: "walk_in",
  callback: "After 4 PM",
  note: "Met at the door.",
};

describe("the capture route's gates", () => {
  it("401s without a session and writes nothing", async () => {
    expect((await post(VALID)).status).toBe(401);
    expect(await listProspectCaptureEvents()).toHaveLength(0);
  });

  it("403s a session outside the agent portal", async () => {
    signInAs(FAMILY_SCOPES);
    expect((await post(VALID)).status).toBe(403);
    expect(await listProspectCaptureEvents()).toHaveLength(0);
  });

  it("422s a missing phone or need, naming the field", async () => {
    signInAs(AGENT_SCOPES);
    const res = await post({ name: "Nena", source: "walk_in" });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { fieldErrors: Record<string, string> };
    expect(body.fieldErrors.phone).toBeTruthy();
    expect(body.fieldErrors.need).toBeTruthy();
    expect(await listProspectCaptureEvents()).toHaveLength(0);
  });
});

describe("a legal capture reaches the pipeline", () => {
  it("records the lead and reads it back as a New prospect", async () => {
    signInAs(AGENT_SCOPES);
    const res = await post(VALID);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { prospect: { id: string; name: string; stage: string } };
    expect(body.prospect.name).toBe("Nena Bautista");
    expect(body.prospect.stage).toBe("new");

    const prospects = await listAgentProspects();
    expect(prospects).toHaveLength(1);
    expect(prospects[0].owner).toBe("Alex Agent");
    expect(prospects[0].stage_history).toHaveLength(1);
    expect(prospects[0].stage_history[0].stage).toBe("new");
  });
});
