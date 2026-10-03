import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { measureProse } from "@/tests/helpers/prose";
import { parkToday, scheduleDayLabel } from "@/lib/schedule-board";
import type { Session } from "@/lib/auth/types";
/* --- test-only demo fixtures (clean start, captain 2026-10-02) --- */
vi.mock("@/lib/fixtures/scheduling/bookings.json", async () => ({
  default: (await import("../fixtures/scheduling-bookings-demo.json")).default,
}));
/* --- end test-only demo fixtures --- */


/**
 * The staff Schedule screen (`/staff/schedule`), rendered as the real page over
 * the recorded scheduling fixture. What this pins:
 *  · the DAY BOARD leads the page (bookings before chapel administration) and
 *    the selected day lives in `?date=`, so a day is linkable;
 *  · the service's overlap flag is unmistakable — a strip above the board names
 *    every flagged booking and links to its day, and the row carries the badge;
 *  · an empty day is honest and points at the nearest booked day (fixture data
 *    sits in September 2026, so this is the state a demo actually lands on);
 *  · an unusable `?date` falls back to today instead of breaking;
 *  · the day board keeps the reading budget (short paragraphs, no prose wall);
 *  · the availability month grid keeps its own class (the public services
 *    stylesheet owns `.chapel-grid` — see styles/components.css).
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

async function render(date?: string): Promise<string> {
  return renderToStaticMarkup(
    await SchedulePage({ searchParams: Promise.resolve(date ? { date } : {}) }),
  );
}

beforeEach(() => {
  delete cookieJar.values.im_at;
  delete cookieJar.values.im_u;
  sessionHolder.current = null;
});

afterEach(() => {
  const mutated = (globalThis as { __imFixtureBookings?: unknown[] }).__imFixtureBookings;
  if (Array.isArray(mutated)) mutated.length = 0;
});

describe("the Schedule day board is the page's answer", () => {
  it("leads with the day board, before chapel administration", async () => {
    signInAs(["scheduling:read"]);
    const html = await render("2026-09-10");

    expect(html).toContain("Day board");
    expect(html).toContain("Thursday, 10 September 2026");
    expect(html).toContain("Wake — Day 1");
    expect(html).toContain("Memorial service");
    expect(html).toContain("CASE-2026-0001");
    expect(html).toContain("Confirmed");
    // The board comes first; the chapel surfaces follow it.
    expect(html.indexOf("Day board")).toBeLessThan(html.indexOf("Chapels on the books"));
  });

  it("navigates day by day through the URL", async () => {
    signInAs(["scheduling:read"]);
    const html = await render("2026-09-10");

    expect(html).toContain('href="/staff/schedule?date=2026-09-09"');
    expect(html).toContain('href="/staff/schedule?date=2026-09-11"');
    expect(html).toContain('value="2026-09-10"');
  });

  it("shows the cancelled booking's state, not just live bookings", async () => {
    signInAs(["scheduling:read"]);
    const html = await render("2026-09-12");
    expect(html).toContain("Preparation");
    expect(html).toContain("Cancelled");
  });

  it("makes the service's overlap flag unmistakable", async () => {
    signInAs(["scheduling:read"]);
    const html = await render("2026-09-10");

    // The strip names the flagged booking and links to its day.
    expect(html).toContain("Overlap warning — 1 flagged booking");
    expect(html).toContain('href="/staff/schedule?date=2026-09-10"');
    expect(html).toContain("Memorial service · Sep 10, 2026");
    expect(html.indexOf("Overlap warning")).toBeLessThan(html.indexOf("Day board"));
    // The row itself carries the badge.
    expect(html).toContain(">Overlap</span>");
  });

  it("turns an empty day into an honest pointer at the nearest booked day", async () => {
    signInAs(["scheduling:read"]);
    const html = await render("2026-09-13");

    expect(html).toContain("Nothing on this day");
    expect(html).toContain("Last booked day · Sat, Sep 12 (1)");
    expect(html).toContain('href="/staff/schedule?date=2026-09-12"');
    // A page-level overlap stays visible even while the selected day is clear.
    expect(html).toContain("Overlap warning");
  });

  it("falls back to today for an unusable ?date", async () => {
    signInAs(["scheduling:read"]);
    const html = await render("2026-02-30");
    expect(html).toContain(scheduleDayLabel(parkToday()));
    expect(html).toContain("Day board");
  });
});

describe("the day board's states and discipline", () => {
  it("gives a write session the day's cancel action and a read-only session none", async () => {
    signInAs(["scheduling:read", "scheduling:write"]);
    const writeHtml = await render("2026-09-10");
    expect(writeHtml).toContain(">Cancel</button>");

    signInAs(["scheduling:read"]);
    const readOnlyHtml = await render("2026-09-10");
    expect(readOnlyHtml).not.toContain(">Cancel</button>");
  });

  it("keeps the day board inside the reading budget", async () => {
    signInAs(["scheduling:read"]);
    for (const date of ["2026-09-10", "2026-09-13"]) {
      const html = await render(date);
      const board = html.slice(html.indexOf('id="sched-day-board"'), html.indexOf("Week at a glance"));
      expect(board.length, `${date}: no day board found`).toBeGreaterThan(0);
      const stats = measureProse(board);
      expect(
        stats.longest.words,
        `${date}: longest paragraph in the day board is ${stats.longest.words} words`,
      ).toBeLessThanOrEqual(30);
      expect(
        stats.paragraphWords,
        `${date}: the day board carries ${stats.paragraphWords} words of prose`,
      ).toBeLessThanOrEqual(60);
    }
  });

  it("keeps the availability month grid on its own class", async () => {
    signInAs(["scheduling:read", "scheduling:write"]);
    const html = await render("2026-09-10");
    expect(html).toContain("chapel-month");
    expect(html).not.toContain('class="chapel-grid"');
  });

  it("renders the graceful forbidden state without scheduling:read", async () => {
    signInAs(["catalog:read"]);
    const html = await render("2026-09-10");
    expect(html).toContain("permissions this screen needs");
    expect(html).not.toContain("Day board");
  });
});
