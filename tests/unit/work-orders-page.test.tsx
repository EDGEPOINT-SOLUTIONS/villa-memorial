import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";

/**
 * The Work orders list (`/staff/work-orders`), rendered over the recorded fixture.
 * What this pins:
 *  · the list leads with what needs doing, its asset, assignee, priority, due date and
 *    state, and the recorded date each movement happened;
 *  · overdue is read from the recorded due date against the recorded day — the overdue
 *    rows say how many days, and done rows never read overdue;
 *  · the filters (state, asset kind, search) narrow the list and an empty result gets
 *    the honest empty state;
 *  · the screen is read-only and names the missing service; the gate is `property:read`;
 *  · live mode renders the named 503; exactly one h1.
 */

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }),
}));

const { default: WorkOrdersPage } = await import("@/app/(staff)/staff/work-orders/page");

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const LOT_A_003 = "00000000-0000-4000-8000-000000000D03";

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
  return renderToStaticMarkup(await WorkOrdersPage({ searchParams: Promise.resolve(params) }));
}

beforeEach(() => {
  sessionHolder.current = null;
  vi.unstubAllEnvs();
});

describe("the recorded list leads with what needs doing", () => {
  it("shows the order, its asset, assignee, priority, due date and state", async () => {
    signInAs(["property:read"]);
    const html = await render();

    expect(html).toContain("Replace the front brake pads on Hearse 1");
    expect(html).toContain("Hearse 1");
    expect(html).toContain("Miguel Torres");
    expect(html).toContain("EMP-006");
    expect(html).toContain("Crew / contractor");
    expect(html).toContain("High");
    expect(html).toContain("Sep 4, 2026");
  });

  it("prints the recorded movement trail, opening first", async () => {
    signInAs(["property:read"]);
    const html = await render();
    expect(html).toContain("Opened Sep 1, 2026");
    expect(html).toContain("In hand Sep 3, 2026");
    expect(html).toContain("Done Sep 8, 2026");
  });

  it("reads overdue from the recorded dates and says how long", async () => {
    signInAs(["property:read"]);
    const html = await render();

    expect(html).toContain("Overdue");
    expect(html).toContain("6 days overdue");
    expect(html).toContain("1 day overdue");
    expect(html).toContain("Sep 10, 2026");
  });

  it("never reads a done order as overdue", async () => {
    signInAs(["property:read"]);
    const html = await render({ state: "done" });
    expect(html).toContain("Done");
    expect(html).toContain("Clear the grass growing over plot B-002");
    expect(html).not.toContain("days overdue");
  });

  it("links a plot order to its lot record", async () => {
    signInAs(["property:read"]);
    const html = await render();
    expect(html).toContain(`/staff/property/${LOT_A_003}`);
  });

  it("names the missing service and that the list is a record", async () => {
    signInAs(["property:read"]);
    const html = await render();
    expect(html).toContain("No work-order service is connected");
    expect(html).toContain("No wall clock and no SLA the office has not set takes part.");
  });
});

describe("the filters narrow the list", () => {
  it("filters by asset kind", async () => {
    signInAs(["property:read"]);
    const html = await render({ kind: "vehicle" });
    expect(html).toContain("Replace the front brake pads on Hearse 1");
    expect(html).not.toContain("leaking tap");
  });

  it("filters by state", async () => {
    signInAs(["property:read"]);
    const html = await render({ state: "open" });
    expect(html).toContain("Replace the failed light");
    expect(html).not.toContain("Clear the grass growing");
  });

  it("searches by title, asset or assignee", async () => {
    signInAs(["property:read"]);
    const html = await render({ q: "Chapel A" });
    expect(html).toContain("leaking tap");
    expect(html).toContain("Replace the failed light");
    expect(html).not.toContain("Replace the front brake pads");
  });

  it("gets an honest empty state when nothing matches", async () => {
    signInAs(["property:read"]);
    const html = await render({ q: "nothing like this exists" });
    expect(html).toContain("No work order matches those filters");
    expect(html).not.toContain("Replace the front brake pads");
  });
});

describe("the gate and the live state", () => {
  it("renders the designed forbidden state without property:read", async () => {
    signInAs(["cases:read"]);
    const html = await render();
    expect(html).toContain("have access to this area");
  });

  it("renders the named live 503 instead of demo records when an operations gateway is set", async () => {
    vi.stubEnv("OPERATIONS_BASE_URL", "http://gateway.invalid");
    vi.resetModules();
    signInAs(["property:read"]);
    const { default: LivePage } = await import("@/app/(staff)/staff/work-orders/page");
    const html = renderToStaticMarkup(await LivePage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("live work orders are not wired");
    expect(html).not.toContain("Replace the front brake pads");
  });

  it("renders exactly one h1", async () => {
    signInAs(["property:read"]);
    const html = await render();
    expect([...html.matchAll(/<h1/g)].length).toBe(1);
  });
});
