import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";

/**
 * The staff Schedule screen's BURIAL CALENDAR (`/staff/schedule`) — the client's
 * minutes 2026-09-21 item 2. What this pins against the recorded sheet:
 *  · the calendar opens on the recorded day (September 2026) and shows each
 *    burial's date and the light pickup printed ON that burial (one record);
 *  · the month and week views are a URL selection (`?cal=`), and navigation
 *    keeps the day board's own `?date=`;
 *  · the conflict strip names the recorded crew clash and the cell is flagged;
 *  · the preparation list leads on what is next;
 *  · the gate is `scheduling:read` and the route keeps exactly one h1.
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
  usePathname: () => "/staff/schedule",
}));

const { default: SchedulePage } = await import("@/app/(staff)/staff/schedule/page");

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const CASE_1 = "00000000-0000-4000-8000-000000000C01";

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
  return renderToStaticMarkup(await SchedulePage({ searchParams: Promise.resolve(params) }));
}

beforeEach(() => {
  sessionHolder.current = null;
  vi.unstubAllEnvs();
});

describe("the burial calendar opens on the recorded sheet", () => {
  it("renders the month grid with each burial and its light pickup tied on", async () => {
    signInAs(["scheduling:read"]);
    const html = await render();

    expect(html).toContain("Burial calendar");
    expect(html).toContain("September 2026");
    expect(html).toContain("Pedro Santos");
    expect(html).toContain("Rosario Gonzales");
    // The burial's own clock and the pickup's clock both print.
    expect(html).toContain("9:00 AM");
    expect(html).toContain("2:00 PM");
    expect(html).toContain("Lights 3:00 PM · Delivery crew");
    // The month grid is whole weeks, Monday-first.
    expect(html).toContain("burial-month");
    expect(html).toContain(">Mon</div>");
    expect(html).toContain("3 burials recorded");
    expect(html).toContain("3 with a light pickup");
  });

  it("links a burial to its real case record", async () => {
    signInAs(["scheduling:read"]);
    const html = await render();
    expect(html).toContain(`/staff/cases/${CASE_1}`);
  });

  it("prints the conflict the recorded times collide on and flags the cell", async () => {
    signInAs(["scheduling:read"]);
    const html = await render();
    expect(html).toContain("Schedule conflict — 1 recorded");
    expect(html).toContain("Delivery crew");
    // The conflicted day cell carries the flag for a screen reader too.
    expect(html).toContain("conflict");
    expect(html).toContain("burial-event--conflict");
  });

  it("leads the preparation list with what is next", async () => {
    signInAs(["scheduling:read"]);
    const html = await render();
    expect(html).toContain("Preparation list");
    const list = html.slice(html.indexOf("burial-prep__list"));
    expect(list.indexOf("Pedro Santos")).toBeGreaterThan(-1);
    expect(list.indexOf("Pedro Santos")).toBeLessThan(list.indexOf("Rosario Gonzales"));
  });
});

describe("the view is a URL selection", () => {
  it("defaults to the month view with Month current", async () => {
    signInAs(["scheduling:read"]);
    const html = await render();
    expect(html).toContain(">Month</a>");
    expect(html).toContain(">Week</a>");
    expect(html).toContain('aria-current="true" href="/staff/schedule?date=');
    expect(html).toContain("September 2026");
    // The switch to the other view is a link carrying `cal=week`.
    expect(html).toContain("cal=week");
  });

  it("renders the week grid when `?cal=week` is selected", async () => {
    signInAs(["scheduling:read"]);
    const html = await render({ cal: "week" });

    expect(html).toContain("Sep 28, 2026 → Oct 4, 2026");
    expect(html).toContain("burial-week");
    expect(html).toContain("Wed, Sep 30");
    // The week view's burials sit on their own weekday.
    expect(html).toContain("burial-week__day");
  });

  it("keeps the day board's ?date while the calendar moves", async () => {
    signInAs(["scheduling:read"]);
    const html = await render({ date: "2026-09-10" });

    // Month navigation steps a whole month, not a day.
    expect(html).toContain("calDate=2026-08-01");
    expect(html).toContain("calDate=2026-10-01");
    // The day board keeps its own day.
    expect(html).toContain('href="/staff/schedule?date=2026-09-10"');
  });

  it("falls back to the recorded day for an unusable ?calDate", async () => {
    signInAs(["scheduling:read"]);
    const html = await render({ cal: "week", calDate: "2026-02-30" });
    expect(html).toContain("Sep 28, 2026 → Oct 4, 2026");
  });
});

describe("the calendar's place and gates", () => {
  it("renders the burial calendar after the week at a glance", async () => {
    signInAs(["scheduling:read"]);
    const html = await render();
    expect(html.indexOf("Week at a glance")).toBeLessThan(html.indexOf("Burial calendar"));
    expect(html.indexOf("Burial calendar")).toBeLessThan(html.indexOf("Chapels on the books"));
  });

  it("renders the designed forbidden state without scheduling:read", async () => {
    signInAs(["cases:read"]);
    const html = await render();
    expect(html).toContain("have access to this area");
    expect(html).not.toContain("Burial calendar");
  });

  it("keeps exactly one h1", async () => {
    signInAs(["scheduling:read"]);
    const html = await render({ cal: "week" });
    expect(html.match(/<h1/g) ?? []).toHaveLength(1);
  });
});

describe("the write surface follows the scope (client minutes item 2)", () => {
  it("gives a scheduling:write session the record/manage controls", async () => {
    signInAs(["scheduling:read", "scheduling:write"]);
    const html = await render();

    expect(html).toContain("Record a burial");
    expect(html).toContain("Light pickups");
    expect(html).toContain("Scheduled");
    expect(html).toContain("In progress");
    expect(html).toContain("Collected");
    // The read-only note is gone for a writer.
    expect(html).not.toContain("Read-only for this session");
  });

  it("keeps a read-only session's calendar read-only", async () => {
    signInAs(["scheduling:read"]);
    const html = await render();

    expect(html).toContain("Read-only for this session");
    expect(html).not.toContain("Record a burial");
    expect(html).not.toContain("Light pickups");
  });
});
