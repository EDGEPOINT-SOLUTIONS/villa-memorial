import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";
/* --- test-only demo fixtures (clean start, captain 2026-10-02) --- */
vi.mock("@/lib/fixtures/crm/lead-records.json", async () => ({
  default: (await import("../fixtures/crm-lead-records-demo.json")).default,
}));
/* --- end test-only demo fixtures --- */


/**
 * Staff Agents (`/staff/agents`) — the captain put "Agents" under Messages &
 * inquiries. crm-families (agents, assignment) is unbuilt, so the screen groups the
 * recorded lead file by owner: each agent and their book. This pins that the page
 * renders one section per recorded owner, links every lead to its record, and gates
 * gracefully.
 */

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
}));

const { default: AgentsPage } = await import("@/app/(staff)/staff/agents/page");

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";

function signIn(scopes: string[]) {
  sessionHolder.current = {
    userId: USER_ID,
    tenantId: TENANT_ID,
    scopes,
    email: "sam.staff@vm.demo",
    displayName: "Sam Staff",
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
  };
}

async function render(): Promise<string> {
  return renderToStaticMarkup(await AgentsPage());
}

beforeEach(() => {
  sessionHolder.current = null;
});

describe("the agents register", () => {
  it("gates without cases:read", async () => {
    signIn(["orders:read"]);
    const html = await render();
    expect(html).toContain("permissions this screen needs");
  });

  it("groups the recorded leads by their owner and links each lead", async () => {
    signIn(["cases:read"]);
    const html = await render();
    expect((html.match(/<h1[\s>]/g) ?? []).length).toBe(1);
    expect(html).toContain("Alex Agent"); // the recorded lead owner
    expect(html).toContain("prospect-cecilia"); // a lead, linked to its record
    expect(html).toContain('href="/staff/pipeline/prospect-cecilia"');
    // One link keeps the full pipeline reachable though it left the curated rail.
    expect(html).toContain('href="/staff/pipeline"');
  });
});
