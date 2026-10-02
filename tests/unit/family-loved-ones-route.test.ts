import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getFamilyHousehold } from "@/lib/api-client/family";
import { listAddedLovedOnes } from "@/lib/api-client/family-household-store";

/**
 * The family “add a loved one” route — `POST /api/family/loved-ones`.
 *
 * The family portal starts clean (captain, 2026-10-02): the account has nobody on
 * it, and this write is the one action that starts the workflow. A legal addition
 * must appear on every family screen on the next read; an invalid one changes
 * nothing, and a signed-out request is refused.
 */
const state = vi.hoisted(() => ({
  session: null as null | { userId: string; email: string; scopes: string[] },
}));

vi.mock("@/lib/auth/family-session", () => ({
  familySessionOrNull: async () => state.session,
}));

const { POST } = await import("@/app/api/family/loved-ones/route");

const FAMILY_USER = "00000000-0000-4000-8000-000000000014";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-family-household-"));
  process.env.FAMILY_HOUSEHOLD_STORE_PATH = path.join(dir, "family-household.json");
  state.session = { userId: FAMILY_USER, email: "customer@vm.demo", scopes: [] };
});

afterEach(async () => {
  delete process.env.FAMILY_HOUSEHOLD_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

function add(body: unknown): Promise<Response> {
  return Promise.resolve(
    POST(
      new Request("http://localhost/api/family/loved-ones", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
}

describe("POST /api/family/loved-ones", () => {
  it("refuses a signed-out request and writes nothing", async () => {
    state.session = null;
    expect((await add({ name: "Nena Bautista" })).status).toBe(401);
    expect(await listAddedLovedOnes()).toEqual([]);
  });

  it("422s a missing name, naming the field", async () => {
    const res = await add({ name: "   " });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { fieldErrors: Record<string, string> };
    expect(body.fieldErrors.name).toBeTruthy();
    expect(await listAddedLovedOnes()).toEqual([]);
  });

  it("adds the loved one and the whole household reads them", async () => {
    const res = await add({ name: "Nena Bautista", life_dates: "1948 – 2026" });
    expect(res.status).toBe(201);
    const household = await getFamilyHousehold();
    expect(household.people).toHaveLength(1);
    expect(household.people[0].name).toBe("Nena Bautista");
    expect(household.people[0].life_dates).toBe("1948 – 2026");
    // Nothing the office has not recorded is invented.
    expect(household.people[0].plan_summary.plan_name).toBe("");
    expect(household.people[0].recent_documents).toEqual([]);
  });
});
