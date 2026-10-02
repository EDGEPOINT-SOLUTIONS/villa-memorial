import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { recordStageMove } from "@/lib/api-client/agent-store";

/**
 * The acquisition end to end, at the surface level.
 *
 * The same demo store must drive the lead record, the dashboard stage flow, the
 * sales funnel and the client book, so no two screens can tell a different story:
 * a move is visible on the record the moment it is journalled; a sale puts the
 * person in Clients and takes their value out of the open pipeline. If a future
 * change lets one surface keep reading the raw fixture, this fails.
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
  usePathname: () => "/agent/prospects/prospect-rosa",
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
}));
vi.mock("@/lib/auth/portal-guard", () => ({
  requirePortalSessionOrRedirect: async () => ({ email: "agent@vm.demo", scopes: [] }),
}));

// The product fixture starts clean (captain, 2026-10-02); this suite still pins
// the acquisition fold against the recorded demo workspace (test-only copy).
vi.mock("@/lib/fixtures/agent/workspace.json", async () => ({
  default: (await import("../fixtures/agent-workspace-demo.json")).default,
}));

const { default: AgentLeadPage } = await import("@/app/(agent)/agent/prospects/[id]/page");
const { default: AgentClientsPage } = await import("@/app/(agent)/agent/clients/page");
const { default: AgentDashboardPage } = await import("@/app/(agent)/agent/dashboard/page");

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-agent-flow-"));
  process.env.AGENT_STORE_PATH = path.join(dir, "agent-pipeline.json");
});

afterEach(async () => {
  delete process.env.AGENT_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

function renderLead(id: string): Promise<string> {
  return (AgentLeadPage as (props: { params: Promise<{ id: string }> }) => Promise<React.ReactElement>)({
    params: Promise.resolve({ id }),
  }).then((element) => renderToStaticMarkup(element));
}

describe("prospect → client, end to end", () => {
  it("shows the move on the record and the dashboard, then the client in the book", async () => {
    // Before: Rosa stands at Proposal and is not a client.
    const beforeLead = await renderLead("prospect-rosa");
    expect(beforeLead).toContain("Ready to close");
    expect(beforeLead).not.toContain("now a client");
    expect(await renderToStaticMarkup(await AgentClientsPage({ searchParams: Promise.resolve({}) }))).not.toContain("Rosa Lim");

    // Reserve her, then sell: two steps, both journalled.
    await recordStageMove({
      prospectId: "prospect-rosa",
      stage: "reserved",
      by: "Alex Agent",
      note: "Reserved the plan for her.",
      now: new Date("2026-10-01T01:00:00Z"),
    });
    const reservedLead = await renderLead("prospect-rosa");
    expect(reservedLead).toContain("Moved to Reserved");
    expect(reservedLead).toContain("Reserved the plan for her.");

    await recordStageMove({
      prospectId: "prospect-rosa",
      stage: "sold",
      by: "Alex Agent",
      note: "Signed and paid the reservation.",
      now: new Date("2026-10-02T01:00:00Z"),
    });

    // The record is Sold and offers no further step — it shows the conversion.
    const soldLead = await renderLead("prospect-rosa");
    expect(soldLead).toContain("Moved to Sold");
    expect(soldLead).toContain("now a client");
    expect(soldLead).not.toContain('class="ag-move"');

    // The client book holds her; the linked record opens.
    const clients = await renderToStaticMarkup(await AgentClientsPage({ searchParams: Promise.resolve({}) }));
    expect(clients).toContain("Rosa Lim");
    expect(clients).toContain("client-prospect-rosa");

    // The dashboard's stage flow counts her under Sold and the open pipeline drops
    // by exactly her value: ₱543,040.00 − ₱91,200.00 = ₱451,840.00.
    const dashboard = await renderToStaticMarkup(await AgentDashboardPage());
    expect(dashboard).toContain("₱451,840.00");
    expect(dashboard).not.toContain("₱543,040.00");
    expect(dashboard).toContain("Sold");
    // The "Sold this month" vital reads the same sold set as the funnel: one.
    expect(dashboard).toContain('Sold this month</span><span class="wb-vital__value">1<');
  });
});
