import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";

/**
 * Appointments & tasks as a CALENDAR (captain, 2026-10-02): the office's own
 * recorded appointments marked by day, the selected day's detail, and honest
 * plain days. Nothing is invented and no booking writes, so the disabled actions
 * keep the exact names the page already used.
 */
const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/portal-guard", () => ({
  requirePortalSessionOrRedirect: async () => sessionHolder.current,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/agent/appointments",
  useRouter: () => ({ replace: () => undefined, push: () => undefined }),
}));

const { default: AgentAppointmentsPage } = await import("@/app/(agent)/agent/appointments/page");

async function render(): Promise<string> {
  sessionHolder.current = {
    userId: "00000000-0000-4000-8000-000000000013",
    tenantId: "00000000-0000-4000-8000-000000000001",
    scopes: ["property:read"],
    email: "agent@vm.demo",
    displayName: "Alex Agent",
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
  };
  return renderToStaticMarkup(await AgentAppointmentsPage());
}

describe("the agent appointments calendar", () => {
  it("opens on the month that holds the recorded appointments", async () => {
    const html = await render();
    expect(html).toContain("September 2026");
    expect(html).toContain('class="fv-cal__grid"');
    expect(html).toContain("Mon");
    expect(html).toContain("Sun");
  });

  it("marks a recorded day and names what it holds behind the mark", async () => {
    const html = await render();
    // 16 September carries the three today stops; the mark's summary names each
    // one with its contact, time and state so a screen reader can read the day.
    expect(html).toContain("Cecilia Ramos");
    expect(html).toContain("Lot viewing · the Ramos family");
    expect(html).toContain("10:30 AM");
    expect(html).toContain("Confirmed by the office");
    expect(html).toContain("Waiting for the office to confirm");
    // The week's own stops are on the grid too.
    expect(html).toContain("Office day — pick up papers, file Jun&#x27;s application");
    expect(html).toContain("Rosa Lim");
  });

  it("shows the selected day's detail — time, place, who and what to bring", async () => {
    const html = await render();
    expect(html).toContain("Wednesday");
    expect(html).toContain("16 September");
    expect(html).toContain("Sanctuario de Mercedes y Gloria");
    expect(html).toContain("Their home");
    expect(html).toContain("Park map");
    expect(html).toContain("2026 lot price list");
    expect(html).toContain("Visit a memorial lot");
    expect(html).toContain("Today");
  });

  it("reads a plain day as plainly empty", async () => {
    const html = await render();
    expect(html).toContain("nothing recorded");
    // 15 September carries nothing, so its own announcement says so.
    expect(html).toMatch(/15 September, nothing recorded/);
  });

  it("prints the named legend for every marker role", async () => {
    const html = await render();
    expect(html).toContain("Confirmed by the office");
    expect(html).toContain("Waiting for the office to confirm");
    expect(html).toContain("A task due that day");
  });

  it("keeps the day's drive order, the small promises and the honest note", async () => {
    const html = await render();
    expect(html).toContain("3 stops today");
    expect(html).toContain("Small promises");
    expect(html).toContain("Send Paolo the 2026 price list");
    expect(html).toContain("Pick up the Ramos reservation form from the office");
    expect(html).toContain("seven appointment reasons");
  });

  it("keeps the booking controls disabled and named exactly as before", async () => {
    const html = await render();
    expect(html).toContain("Add a task");
    expect(html).toContain("Book a lot viewing");
    expect(html).toContain("Ask the office for a slot");
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Add a task/);
  });
});
