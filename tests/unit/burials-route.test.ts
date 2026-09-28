import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { listStoredBurials } from "@/lib/api-client/burials-store";

/**
 * RBAC + write behaviour for the burial BFF routes (client minute 2026-09-21, item 2):
 * `POST /api/schedule/burials` and `PATCH /api/schedule/burials/:id/pickup`. Both need
 * `scheduling:write`; a refusal changes nothing.
 */

const cookieJar = vi.hoisted(() => ({ values: {} as Record<string, string> }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieJar.values ? { name, value: cookieJar.values[name] } : undefined,
  }),
}));

const burialsRoute = await import("@/app/api/schedule/burials/route");
const pickupRoute = await import("@/app/api/schedule/burials/[id]/pickup/route");
const burialRoute = await import("@/app/api/schedule/burials/[id]/route");

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-burials-route-"));
  process.env.BURIALS_STORE_PATH = path.join(dir, "burials.json");
  cookieJar.values = {};
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signInAs(scopes: string[]) {
  const now = Math.floor(Date.now() / 1000);
  cookieJar.values.im_at = `${b64url({ alg: "none", kid: "fixture" })}.${b64url({
    sub: USER_ID,
    tenant_id: TENANT_ID,
    scopes,
    iat: now,
    exp: now + 900,
  })}.fixture-not-signed`;
  cookieJar.values.im_u = Buffer.from(
    JSON.stringify({ id: USER_ID, tenant_id: TENANT_ID, email: "sam.staff@vm.demo", display_name: "Sam Staff" }),
    "utf8",
  ).toString("base64");
}

function draft(over: Record<string, unknown> = {}) {
  return {
    date: "2026-10-05",
    time: "10:00",
    case_number: "CASE-2026-0005",
    deceased_name: "Nena Bautista",
    lot_number: "B-002",
    section: "B",
    coordinator: "Elena Villanueva",
    note: "",
    light_pickup: { time: "", crew: "", note: "" },
    ...over,
  };
}

function post(body: unknown): Promise<Response> {
  return Promise.resolve(
    burialsRoute.POST(
      new Request("http://localhost/api/schedule/burials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
}

function patch(id: string, body: unknown): Promise<Response> {
  return Promise.resolve(
    pickupRoute.PATCH(
      new Request(`http://localhost/api/schedule/burials/${id}/pickup`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    ),
  );
}

describe("the burial write routes are scope-gated", () => {
  it("401s without a session", async () => {
    expect((await post(draft())).status).toBe(401);
    expect((await patch("bur-2026-0001-santos", { state: "done" })).status).toBe(401);
  });

  it("403s a read-only session and changes nothing", async () => {
    signInAs(["scheduling:read"]);
    expect((await post(draft())).status).toBe(403);
    expect((await patch("bur-2026-0001-santos", { state: "done" })).status).toBe(403);
    expect(await listStoredBurials()).toHaveLength(3);
  });
});

describe("recording a burial", () => {
  it("201s for a writer and the record appears on the next read", async () => {
    signInAs(["scheduling:write"]);
    const res = await post(draft());
    expect(res.status).toBe(201);
    const body = (await res.json()) as { burial: { id: string } };
    const after = await listStoredBurials();
    expect(after.map((b) => b.id)).toContain(body.burial.id);
  });

  it("422s a bad field, naming it, and writes nothing", async () => {
    signInAs(["scheduling:write"]);
    const res = await post(draft({ time: "nope" }));
    expect(res.status).toBe(422);
    const body = (await res.json()) as { fieldErrors: Record<string, string> };
    expect(body.fieldErrors.time).toBeTruthy();
    expect(await listStoredBurials()).toHaveLength(3);
  });

  it("422s a case that already has a burial", async () => {
    signInAs(["scheduling:write"]);
    const res = await post(draft({ case_number: "CASE-2026-0001" }));
    expect(res.status).toBe(422);
    expect(await listStoredBurials()).toHaveLength(3);
  });
});

describe("moving a light pickup", () => {
  it("moves the state and persists", async () => {
    signInAs(["scheduling:write"]);
    const res = await patch("bur-2026-0001-santos", { state: "in_progress" });
    expect(res.status).toBe(200);
    const reread = (await listStoredBurials()).find((b) => b.id === "bur-2026-0001-santos")!;
    expect(reread.light_pickup!.state).toBe("in_progress");
  });

  it("404s an unknown burial and 422s an unknown state", async () => {
    signInAs(["scheduling:write"]);
    expect((await patch("bur-nope", { state: "done" })).status).toBe(404);
    expect((await patch("bur-2026-0001-santos", { state: "collected" })).status).toBe(422);
  });
});

describe("editing and removing a recorded burial", () => {
  function editBurial(id: string, body: unknown): Promise<Response> {
    return Promise.resolve(
      burialRoute.PATCH(
        new Request(`http://localhost/api/schedule/burials/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ id }) },
      ),
    );
  }

  function removeBurial(id: string): Promise<Response> {
    return Promise.resolve(
      burialRoute.DELETE(
        new Request(`http://localhost/api/schedule/burials/${id}`, { method: "DELETE" }),
        { params: Promise.resolve({ id }) },
      ),
    );
  }

  const fields = {
    date: "2026-10-01",
    time: "09:00",
    case_number: "CASE-2026-0001",
    deceased_name: "Pedro Santos",
    lot_number: "A-003",
    section: "A",
    coordinator: "Elena Villanueva",
    note: "",
  };

  it("401s/403s without the write scope and changes nothing", async () => {
    expect((await editBurial("bur-2026-0001-santos", fields)).status).toBe(401);
    expect((await removeBurial("bur-2026-0001-santos")).status).toBe(401);

    signInAs(["scheduling:read"]);
    expect((await editBurial("bur-2026-0001-santos", fields)).status).toBe(403);
    expect((await removeBurial("bur-2026-0001-santos")).status).toBe(403);
    expect(await listStoredBurials()).toHaveLength(3);
  });

  it("edits a burial for a writer and the change persists", async () => {
    signInAs(["scheduling:write"]);
    const res = await editBurial("bur-2026-0001-santos", { ...fields, coordinator: "Jose Mendoza" });
    expect(res.status).toBe(200);
    const reread = (await listStoredBurials()).find((b) => b.id === "bur-2026-0001-santos")!;
    expect(reread.coordinator).toBe("Jose Mendoza");
  });

  it("422s an invalid edit and 404s an unknown burial", async () => {
    signInAs(["scheduling:write"]);
    expect((await editBurial("bur-2026-0001-santos", { ...fields, time: "nope" })).status).toBe(422);
    expect((await editBurial("bur-nope", fields)).status).toBe(404);
  });

  it("removes a burial for a writer", async () => {
    signInAs(["scheduling:write"]);
    expect((await removeBurial("bur-2026-0003-reyes")).status).toBe(204);
    expect((await listStoredBurials()).map((b) => b.id)).not.toContain("bur-2026-0003-reyes");
    expect((await removeBurial("bur-nope")).status).toBe(404);
  });
});
