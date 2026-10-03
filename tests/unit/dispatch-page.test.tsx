import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";
/* --- test-only demo fixtures (clean start, captain 2026-10-02) --- */
vi.mock("@/lib/fixtures/operations/dispatch.json", async () => ({
  default: (await import("../fixtures/operations-dispatch-demo.json")).default,
}));
vi.mock("@/lib/fixtures/operations/cases.json", async () => ({
  default: (await import("../fixtures/operations-cases-demo.json")).default,
}));
/* --- end test-only demo fixtures --- */


/**
 * The Vehicle dispatch board (`/staff/dispatch`), rendered over the recorded fixture.
 * What this pins:
 *  · the day view opens on the recorded day and shows the trips in time order with
 *    their case, vehicle, driver, park-time window and state;
 *  · the assignment view shows the fleet's state and its driver/load, and says which
 *    vehicles are not scheduling resources yet;
 *  · a day with nothing recorded gets the honest empty state plus the nearest recorded
 *    day, never an invented trip;
 *  · the filters (state, vehicle) narrow the table without altering the summary;
 *  · the board is read-only and says so; the gate is `scheduling:read`;
 *  · live mode renders the named 503, not demo records; exactly one h1.
 */

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }),
}));

const { default: DispatchPage } = await import("@/app/(staff)/staff/dispatch/page");

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const CASE_1 = "00000000-0000-4000-8000-000000000C01";
const CASE_2 = "00000000-0000-4000-8000-000000000C02";

function signInAs(scopes: string[]) {
  sessionHolder.current = {
    userId: USER_ID,
    tenantId: TENANT_ID,
    scopes,
    email: "sam.staff@vm.demo",
    displayName: "Sam Staff",
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
  };
}

async function render(params: Record<string, string> = {}): Promise<string> {
  return renderToStaticMarkup(await DispatchPage({ searchParams: Promise.resolve(params) }));
}

beforeEach(() => {
  sessionHolder.current = null;
  vi.unstubAllEnvs();
});

describe("the day board leads with the recorded day", () => {
  it("shows the day's trips in time order with their case, vehicle, driver and state", async () => {
    signInAs(["scheduling:read"]);
    const html = await render();

    expect(html).toContain("Thursday, 10 September 2026");
    expect(html).toContain("8:00 AM – 9:00 AM");
    expect(html).toContain("10:00 AM – 11:30 AM");
    const casePositions = [CASE_2, CASE_1].map((number) => html.indexOf(number));
    expect(casePositions.every((position) => position > -1)).toBe(true);
    expect(casePositions).toEqual([...casePositions].sort((a, b) => a - b));
    expect(html).toContain("Hearse 1");
    expect(html).toContain("Miguel Torres");
    expect(html).toContain("En route");
    expect(html).toContain("Completed");
    expect(html).toContain("Scheduled");
  });

  it("links a trip's case to the real case record", async () => {
    signInAs(["scheduling:read"]);
    const html = await render();
    expect(html).toContain(`/staff/cases/${CASE_1}`);
    expect(html).toContain(`/staff/cases/${CASE_2}`);
  });

  it("states that the board is read-only and names the missing service", async () => {
    signInAs(["scheduling:read"]);
    const html = await render();
    expect(html).toContain("No dispatch service is connected");
    expect(html).toContain("nothing here can be edited");
  });
});

describe("the assignment view is the fleet and who is driving", () => {
  it("shows each vehicle's plate, type, state, driver and load", async () => {
    signInAs(["scheduling:read"]);
    const html = await render({ view: "assignments" });

    expect(html).toContain("Assignments");
    expect(html).toContain("CAB 1234");
    expect(html).toContain("Hearse 2");
    expect(html).toContain("On a trip");
    expect(html).toContain("In maintenance");
    expect(html).toContain("Not a scheduling resource yet");
    expect(html).toContain("Elena Villanueva");
    expect(html).toContain("EMP-006");
  });
});

describe("an unrecorded day gets the honest empty state", () => {
  it("says nothing is recorded and points at the nearest recorded day", async () => {
    signInAs(["scheduling:read"]);
    const html = await render({ date: "2026-09-12" });

    expect(html).toContain("No trip on this day");
    expect(html).toContain("/staff/dispatch?date=2026-09-11");
    expect(html).not.toContain("CASE-2026-0001");
    expect(html).not.toContain("CASE-2026-0002");
  });
});

describe("the filters narrow the table", () => {
  it("filters by trip state", async () => {
    signInAs(["scheduling:read"]);
    const html = await render({ status: "completed" });

    expect(html).toContain(CASE_2);
    expect(html).not.toContain(CASE_1);
  });

  it("filters by vehicle", async () => {
    signInAs(["scheduling:read"]);
    const html = await render({ vehicle: "veh-service-van" });

    expect(html).toContain("CASE-2026-0004");
    expect(html).not.toContain("CASE-2026-0001");
  });
});

describe("the gate and the live state", () => {
  it("renders the designed forbidden state without scheduling:read", async () => {
    signInAs(["cases:read"]);
    const html = await render();
    expect(html).toContain("have access to this area");
  });

  it("renders the named live 503 instead of demo records when a scheduling gateway is set", async () => {
    vi.stubEnv("SCHEDULING_BASE_URL", "http://gateway.invalid");
    vi.resetModules();
    signInAs(["scheduling:read"]);
    const { default: LivePage } = await import("@/app/(staff)/staff/dispatch/page");
    const html = renderToStaticMarkup(
      await LivePage({ searchParams: Promise.resolve({}) }),
    );
    expect(html).toContain("live vehicle dispatch is not wired");
    expect(html).not.toContain("CASE-2026-0001");
  });

  it("renders exactly one h1", async () => {
    signInAs(["scheduling:read"]);
    const html = await render();
    expect([...html.matchAll(/<h1/g)].length).toBe(1);
  });
});
