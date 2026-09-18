import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { getCase } from "@/lib/api-client/operations";
import type { Session } from "@/lib/auth/types";

/**
 * RBAC + wiring for the ops board's two writes (F-07).
 *
 *  - both BFF routes answer 401/403 without `cases:write` and leave the store alone;
 *  - a `cases:write` session's task tick and stage move land in the SAME store the
 *    screens and the dashboard read, and the case page renders the result;
 *  - the case page offers the controls to a writer and shows the reason (with no
 *    control that could only fail) to a reader;
 *  - live mode posts the contract's own endpoints, so the screens are not fixture-only.
 *
 * Cookies are mocked and every test gets its own throwaway OPERATIONS_STORE_PATH.
 */

const cookieJar = vi.hoisted(() => ({ values: {} as Record<string, string> }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieJar.values ? { name, value: cookieJar.values[name] } : undefined,
  }),
}));

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }),
}));

const taskRoute = await import("@/app/api/cases/[number]/tasks/[taskId]/route");
const stageRoute = await import("@/app/api/cases/[number]/stage/route");
const { default: CaseDetailPage } = await import("@/app/(staff)/staff/cases/[id]/page");

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";
/** CASE-2026-0006 — an inquiry case, so a move forward and a task tick are both open. */
const CASE_ID = "00000000-0000-4000-8000-000000000C06";
const CASE_NUMBER = "CASE-2026-0006";

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function accessToken(scopes: string[]): string {
  const now = Math.floor(Date.now() / 1000);
  return `${b64url({ alg: "none", kid: "fixture" })}.${b64url({
    sub: USER_ID,
    tenant_id: TENANT_ID,
    scopes,
    iat: now,
    exp: now + 900,
  })}.fixture-not-signed`;
}

function signInAs(scopes: string[]) {
  cookieJar.values.im_at = accessToken(scopes);
  cookieJar.values.im_u = Buffer.from(
    JSON.stringify({
      id: USER_ID,
      tenant_id: TENANT_ID,
      email: "sam.staff@vm.demo",
      display_name: "Sam Staff",
    }),
    "utf8",
  ).toString("base64");
}

function setSession(scopes: string[]) {
  sessionHolder.current = {
    userId: USER_ID,
    tenantId: TENANT_ID,
    scopes,
    email: "sam.staff@vm.demo",
    displayName: "Sam Staff",
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
  };
}

function patchTask(number: string, taskId: string, body?: unknown): Promise<Response> {
  return Promise.resolve(
    taskRoute.PATCH(
      new Request(`http://localhost/api/cases/${number}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      { params: Promise.resolve({ number, taskId }) },
    ),
  );
}

function postStage(number: string, body?: unknown): Promise<Response> {
  return Promise.resolve(
    stageRoute.POST(
      new Request(`http://localhost/api/cases/${number}/stage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      { params: Promise.resolve({ number }) },
    ),
  );
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-ops-rbac-"));
  process.env.OPERATIONS_STORE_PATH = path.join(dir, "cases.json");
  delete cookieJar.values.im_at;
  delete cookieJar.values.im_u;
  sessionHolder.current = null;
});

afterEach(async () => {
  delete process.env.OPERATIONS_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe("ops board write routes are scope-gated", () => {
  it("answers 401 for an anonymous caller and writes nothing", async () => {
    const before = await getCase(CASE_ID);
    expect((await patchTask(CASE_NUMBER, before.tasks[0].id, { status: "done" })).status).toBe(401);
    expect((await postStage(CASE_NUMBER, { stage: "preparation" })).status).toBe(401);
    const after = await getCase(CASE_ID);
    expect(after.tasks[0].status).toBe(before.tasks[0].status);
    expect(after.stage).toBe(before.stage);
  });

  it("answers 403 for a read-only session and writes nothing", async () => {
    signInAs(["cases:read"]);
    const before = await getCase(CASE_ID);
    expect((await patchTask(CASE_NUMBER, before.tasks[0].id, { status: "done" })).status).toBe(403);
    expect((await postStage(CASE_NUMBER, { stage: "preparation" })).status).toBe(403);
    expect((await getCase(CASE_ID)).stage).toBe(before.stage);
  });

  it("rejects a body outside the frozen vocabulary with 422", async () => {
    signInAs(["cases:write"]);
    const kase = await getCase(CASE_ID);
    expect((await patchTask(CASE_NUMBER, kase.tasks[0].id, { status: "archived" })).status).toBe(422);
    expect((await patchTask(CASE_NUMBER, kase.tasks[0].id, undefined)).status).toBe(422);
    expect((await postStage(CASE_NUMBER, { stage: "training" })).status).toBe(422);
    expect((await postStage(CASE_NUMBER, undefined)).status).toBe(422);
    expect((await getCase(CASE_ID)).stage).toBe("inquiry");
  });

  it("answers 404 for a task the case does not carry", async () => {
    signInAs(["cases:write"]);
    expect((await patchTask(CASE_NUMBER, "CASE-2026-0006-t99", { status: "done" })).status).toBe(404);
  });
});

describe("a cases:write session runs the board", () => {
  beforeEach(() => {
    signInAs(["cases:read", "cases:write"]);
    setSession(["cases:read", "cases:write"]);
  });

  it("ticks a task, and the case the screen re-reads shows it done", async () => {
    const kase = await getCase(CASE_ID);
    const res = await patchTask(CASE_NUMBER, kase.tasks[0].id, { status: "done" });
    expect(res.status).toBe(200);

    const reopened = await getCase(CASE_ID);
    expect(reopened.tasks[0].status).toBe("done");
    expect(reopened.tasks[1].status).toBe("pending");

    const html = renderToStaticMarkup(
      await CaseDetailPage({ params: Promise.resolve({ id: CASE_ID }) }),
    );
    expect(html).toContain("Tasks (1/2 done)");
  });

  it("moves the stage and the page renders the new stage with that stage's tasks", async () => {
    const res = await postStage(CASE_NUMBER, { stage: "preparation" });
    expect(res.status).toBe(200);

    const moved = await getCase(CASE_ID);
    expect(moved.stage).toBe("preparation");
    expect(moved.tasks.map((t) => t.title)).toContain("Confirm embalming completion");

    const html = renderToStaticMarkup(
      await CaseDetailPage({ params: Promise.resolve({ id: CASE_ID }) }),
    );
    expect(html).toContain(">Preparation<");
    expect(html).toContain("Confirm embalming completion");
    expect(html).toContain("Tasks (0/4 done)");
  });

  it("refuses a move to the stage the case is already in", async () => {
    const first = await postStage(CASE_NUMBER, { stage: "preparation" });
    expect(first.status).toBe(200);
    const again = await postStage(CASE_NUMBER, { stage: "preparation" });
    expect(again.status).toBe(422);
    expect(((await again.json()) as { error: string }).error).toBe(
      "the case is already at that stage",
    );
  });

  it("offers the task control and the stage move on the case page", async () => {
    setSession(["cases:read", "cases:write"]);
    const html = renderToStaticMarkup(
      await CaseDetailPage({ params: Promise.resolve({ id: CASE_ID }) }),
    );
    // One write control per task, addressed by the task's own id.
    expect(html).toContain('aria-label="Initial family consultation — status"');
    expect(html).toContain('aria-label="Service arrangement meeting — status"');
    expect(html).toContain('<option value="done">');
    // The stage move's trigger and its target list.
    expect(html).toContain("Move case…");
    expect(html).toContain('<option value="preparation">Preparation</option>');
    // The confirmation is NOT open on load — it is the second, deliberate step.
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain("Confirm move");
  });
});

describe("a read-only session sees the board, not the controls", () => {
  it("renders the statuses with the reason each write is unavailable", async () => {
    setSession(["cases:read"]);
    const html = renderToStaticMarkup(
      await CaseDetailPage({ params: Promise.resolve({ id: CASE_ID }) }),
    );
    expect(html).toContain("Initial family consultation");
    expect(html).toContain("Service arrangement meeting");
    expect(html).not.toContain("<select");
    expect(html).not.toContain("Move case…");
    expect(html).toContain("Changing a task needs <code>cases:write</code>");
    expect(html).toContain("Moving a case needs <code>cases:write</code>");
  });

  it("still renders the graceful forbidden state without cases:read", async () => {
    setSession(["orders:read"]);
    const html = renderToStaticMarkup(
      await CaseDetailPage({ params: Promise.resolve({ id: CASE_ID }) }),
    );
    expect(html).toContain("permissions this screen needs");
    expect(html).not.toContain("Initial family consultation");
  });
});

describe("live mode calls the contract's own endpoints", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("POSTs the stage and PATCHes the task through the gateway, with the session token", async () => {
    signInAs(["cases:write"]);
    const calls: Array<{ url: string; method: string; auth: string | null; body: unknown }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      const headers = new Headers(init.headers);
      calls.push({
        url,
        method: init.method ?? "",
        auth: headers.get("authorization"),
        body: JSON.parse(String(init.body)),
      });
      // The service answers the changed case, which is what the screen keeps.
      return new Response(
        JSON.stringify({ ...(await getCase(CASE_ID)), stage: "preparation" }),
        { status: 200 },
      );
    });

    vi.stubEnv("OPERATIONS_BASE_URL", "http://gateway.invalid");
    vi.resetModules();
    const live = await import("@/lib/api-client/operations");
    await live.setCaseStage(CASE_NUMBER, "preparation");
    await live.setCaseTaskStatus(CASE_NUMBER, "CASE-2026-0006-t1", "done");

    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      "POST http://gateway.invalid/cases/api/v1/cases/CASE-2026-0006/stage",
      "PATCH http://gateway.invalid/cases/api/v1/cases/CASE-2026-0006/tasks/CASE-2026-0006-t1",
    ]);
    expect(calls[0].body).toEqual({ stage: "preparation" });
    expect(calls[1].body).toEqual({ status: "done" });
    expect(calls.every((c) => c.auth === `Bearer ${cookieJar.values.im_at}`)).toBe(true);
  });
});
