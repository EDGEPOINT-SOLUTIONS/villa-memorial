import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";

/**
 * The agent's sign-in day notice (captain, 2026-10-02): “that should notify them
 * also whenever logged in in the agent portal.” Today's plan and the office's
 * activity surface as a count and the next thing, with a link to the day, built
 * from the SAME fold as the calendar. It is a quiet band, never a modal, and it
 * can be dismissed.
 */
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/agent/dashboard",
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
}));

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/portal-guard", () => ({
  requirePortalSessionOrRedirect: async () => sessionHolder.current,
}));

const { AgentDayNotice } = await import("@/components/agent/agent-day-notice");
const { createPlan } = await import("@/lib/api-client/agent-plan-store");
const { default: AgentDashboardPage } = await import("@/app/(agent)/agent/dashboard/page");

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-agent-notice-"));
  process.env.AGENT_PLAN_STORE_PATH = path.join(dir, "agent-plans.json");
  sessionHolder.current = {
    userId: "00000000-0000-4000-8000-000000000013",
    tenantId: "00000000-0000-4000-8000-000000000001",
    scopes: ["property:read"],
    email: "agent@vm.demo",
    displayName: "Alex Agent",
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
  };
});

afterEach(async () => {
  delete process.env.AGENT_PLAN_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe("the sign-in notice's contents", () => {
  it("names the count, the next thing and the day link", () => {
    const html = renderToStaticMarkup(
      <AgentDayNotice
        dayKey="2026-09-16"
        notice={{
          planCount: 3,
          openPlanCount: 2,
          stopCount: 2,
          next: { kind: "plan", id: "plan-1", title: "Call Lorna", timeLabel: "9:00 AM" },
        }}
      />,
    );
    expect(html).toContain("2 of 3 plans still to do.");
    expect(html).toContain("2 office stops recorded.");
    expect(html).toContain("Next: Call Lorna · 9:00 AM");
    expect(html).toContain('href="/agent/appointments?day=2026-09-16"');
    expect(html).toContain("Open the day");
    // A quiet dismiss control with a name, not a modal.
    expect(html).toContain("aria-label=\"Dismiss today&#x27;s plan\"");
    expect(html).toContain("aria-label=\"Today&#x27;s plan\"");
  });

  it("says a day with nothing open is open", () => {
    const html = renderToStaticMarkup(
      <AgentDayNotice dayKey="2026-09-16" notice={{ planCount: 0, openPlanCount: 0, stopCount: 0, next: null }} />,
    );
    expect(html).toContain("No plans yet for today.");
    expect(html).toContain("Nothing else is open today.");
  });
});

describe("the notice reads the same store as the calendar", () => {
  it("surfaces a plan written through the planner journal on the dashboard", async () => {
    await createPlan({
      draft: { day: "2026-09-16", time: "09:00", title: "Call Lorna about the lawn lot", note: "" },
      by: "Alex Agent",
    });
    const html = renderToStaticMarkup(await AgentDashboardPage());
    expect(html).toContain("Today\u2019s plan");
    expect(html).toContain("1 of 1 plan still to do.");
    expect(html).toContain("3 office stops recorded.");
    expect(html).toContain("Next: Call Lorna about the lawn lot · 9:00 AM");
    expect(html).toContain('href="/agent/appointments?day=2026-09-16"');
  });

  it("does not surface a plan written for another day", async () => {
    await createPlan({
      draft: { day: "2026-09-17", time: "09:00", title: "A different day", note: "" },
      by: "Alex Agent",
    });
    const html = renderToStaticMarkup(await AgentDashboardPage());
    expect(html).not.toContain("A different day");
    expect(html).toContain("No plans yet for today.");
  });
});

// Test-only demo seed: the product fixtures start clean (captain, 2026-10-02).
// This suite exercises the recorded records through a test-only copy, so the
// pages keep their content-bearing contract tests without restoring demo data.
vi.mock("@/lib/fixtures/agent/workspace.json", async () => ({
  default: (await import("../fixtures/agent-workspace-demo.json")).default,
}));
vi.mock("@/lib/fixtures/family/snapshot.json", async () => ({
  default: (await import("../fixtures/family-snapshot-demo.json")).default,
}));
vi.mock("@/lib/fixtures/family/workspace.json", async () => ({
  default: (await import("../fixtures/family-workspace-demo.json")).default,
}));
vi.mock("@/lib/fixtures/family/case.json", async () => ({
  default: (await import("../fixtures/family-case-demo.json")).default,
}));
