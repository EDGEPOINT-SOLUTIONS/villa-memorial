import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { listAgentPlans } from "@/lib/api-client/agent";
import { listPlanEvents } from "@/lib/api-client/agent-plan-store";

/**
 * The agent day-planner BFF routes — `POST/GET /api/agent/plans` and
 * `PATCH/DELETE /api/agent/plans/:id`.
 *
 * They are the write behind the calendar's planner. Each must refuse an
 * unauthenticated session and a session outside the agent portal, and refuse a
 * malformed plan (an impossible day, no title, a bad `HH:mm` time) without
 * writing — while a legal add · done · edit · remove must be readable by every
 * surface on the next read. No handler may invent a scope: the agent persona holds
 * no scheduling token, so the demo gates on portal membership alone.
 */

const cookieJar = vi.hoisted(() => ({ values: {} as Record<string, string> }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieJar.values ? { name, value: cookieJar.values[name] } : undefined,
  }),
}));

const plansRoute = await import("@/app/api/agent/plans/route");
const planRoute = await import("@/app/api/agent/plans/[id]/route");

const USER_ID = "00000000-0000-4000-8000-000000000013";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const AGENT_SCOPES = ["tenancy:modules:read", "catalog:read", "orders:read", "orders:write", "property:read"];
const STAFF_SCOPES = ["cases:write"];
const FAMILY_SCOPES = ["tenancy:modules:read", "catalog:read"];

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-agent-plan-route-"));
  process.env.AGENT_PLAN_STORE_PATH = path.join(dir, "agent-plans.json");
  cookieJar.values = {};
});

afterEach(async () => {
  delete process.env.AGENT_PLAN_STORE_PATH;
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

function request(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const CREATE = { day: "2026-09-16", time: "09:00", title: "Call Lorna", note: "Bring the sheet" };

describe("the planner route's session gate", () => {
  it("401s without a session and changes nothing", async () => {
    const res = await plansRoute.POST(request("POST", "http://localhost/api/agent/plans", CREATE));
    expect(res.status).toBe(401);
    expect(await listPlanEvents()).toHaveLength(0);
  });

  it("403s a session outside the agent portal", async () => {
    signInAs(FAMILY_SCOPES);
    const res = await plansRoute.POST(request("POST", "http://localhost/api/agent/plans", CREATE));
    expect(res.status).toBe(403);
    expect(await listPlanEvents()).toHaveLength(0);
  });
});

describe("the planner route's validation", () => {
  it("422s an impossible day, an empty title and a bad time, writing nothing", async () => {
    signInAs(AGENT_SCOPES);
    expect(
      (await plansRoute.POST(request("POST", "http://localhost/api/agent/plans", { ...CREATE, day: "2026-02-30" }))).status,
    ).toBe(422);
    expect(
      (await plansRoute.POST(request("POST", "http://localhost/api/agent/plans", { ...CREATE, title: "   " }))).status,
    ).toBe(422);
    expect(
      (await plansRoute.POST(request("POST", "http://localhost/api/agent/plans", { ...CREATE, time: "25:00" }))).status,
    ).toBe(422);
    expect(await listPlanEvents()).toHaveLength(0);
  });

  it("names the field in the error body", async () => {
    signInAs(AGENT_SCOPES);
    const res = await plansRoute.POST(
      request("POST", "http://localhost/api/agent/plans", { day: "", title: "", time: "x" }),
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { fieldErrors: Record<string, string> };
    expect(body.fieldErrors.day).toBeTruthy();
    expect(body.fieldErrors.title).toBeTruthy();
    expect(body.fieldErrors.time).toBeTruthy();
  });
});

describe("a legal plan reaches every agent surface", () => {
  it("creates with the signed-in agent's name and is read back by the fold", async () => {
    signInAs(AGENT_SCOPES);
    const res = await plansRoute.POST(request("POST", "http://localhost/api/agent/plans", CREATE));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { plan: { id: string; created_by: string; done: boolean } };
    expect(body.plan.created_by).toBe("Alex Agent");
    expect(body.plan.done).toBe(false);

    const plans = await listAgentPlans();
    expect(plans.map((p) => p.id)).toEqual([body.plan.id]);
    expect(plans[0].title).toBe("Call Lorna");
    expect(plans[0].time).toBe("09:00");
  });

  it("lists the plans for a signed-in agent", async () => {
    signInAs(AGENT_SCOPES);
    await plansRoute.POST(request("POST", "http://localhost/api/agent/plans", CREATE));
    const res = await plansRoute.GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { plans: unknown[] };
    expect(body.plans).toHaveLength(1);
  });

  it("marks a plan done, edits it, then removes it", async () => {
    signInAs(AGENT_SCOPES);
    const created = (await (
      await plansRoute.POST(request("POST", "http://localhost/api/agent/plans", CREATE))
    ).json()) as { plan: { id: string } };
    const id = created.plan.id;

    const params = { params: Promise.resolve({ id }) };
    const done = await planRoute.PATCH(
      request("PATCH", `http://localhost/api/agent/plans/${id}`, { done: true }),
      params,
    );
    expect(done.status).toBe(200);
    expect(((await done.json()) as { plan: { done: boolean } }).plan.done).toBe(true);

    const edited = await planRoute.PATCH(
      request("PATCH", `http://localhost/api/agent/plans/${id}`, { title: "Call Lorna again" }),
      params,
    );
    expect(((await edited.json()) as { plan: { title: string } }).plan.title).toBe("Call Lorna again");

    const removed = await planRoute.DELETE(
      request("DELETE", `http://localhost/api/agent/plans/${id}`),
      params,
    );
    expect(removed.status).toBe(200);
    expect(await listAgentPlans()).toHaveLength(0);
  });

  it("lets staff preview the planner", async () => {
    signInAs(STAFF_SCOPES, "Sam Staff");
    const res = await plansRoute.POST(request("POST", "http://localhost/api/agent/plans", CREATE));
    expect(res.status).toBe(201);
    expect((await listAgentPlans())[0].created_by).toBe("Sam Staff");
  });

  it("422s an empty edit and 404s an unknown plan, writing nothing", async () => {
    signInAs(AGENT_SCOPES);
    const created = (await (
      await plansRoute.POST(request("POST", "http://localhost/api/agent/plans", CREATE))
    ).json()) as { plan: { id: string } };

    const empty = await planRoute.PATCH(
      request("PATCH", "http://localhost/api/agent/plans/x", {}),
      { params: Promise.resolve({ id: created.plan.id }) },
    );
    expect(empty.status).toBe(422);

    const missing = await planRoute.PATCH(
      request("PATCH", "http://localhost/api/agent/plans/nobody", { done: true }),
      { params: Promise.resolve({ id: "plan-nobody" }) },
    );
    expect(missing.status).toBe(404);
    const missingDelete = await planRoute.DELETE(
      request("DELETE", "http://localhost/api/agent/plans/nobody"),
      { params: Promise.resolve({ id: "plan-nobody" }) },
    );
    expect(missingDelete.status).toBe(404);
    expect(await listAgentPlans()).toHaveLength(1);
  });
});
