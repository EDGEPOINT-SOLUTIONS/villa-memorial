import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";
import { recordProspectAssignment, recordProspectCapture } from "@/lib/api-client/agent-store";

/**
 * Staff Agents (`/staff/agents`) — the captain put "Agents" under Messages &
 * inquiries. crm-families (agents, assignment) is unbuilt, so the screen groups
 * the ONE shared lead journal by owner: each agent and their book. This pins that
 * the page reads the same record the Prospects board and the agent portal fold
 * (the old recorded lead file is retired), links each prospect to the pipeline,
 * and gates gracefully.
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

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-agents-page-"));
  process.env.AGENT_STORE_PATH = path.join(dir, "agent-pipeline.json");
  sessionHolder.current = null;
});

afterEach(async () => {
  delete process.env.AGENT_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe("the agents register", () => {
  it("gates without cases:read", async () => {
    signIn(["orders:read"]);
    const html = await render();
    expect(html).toContain("permissions this screen needs");
  });

  it("groups the shared prospect journal by owner and links to the one pipeline", async () => {
    signIn(["cases:read"]);
    await recordProspectCapture({
      capture: {
        id: "prospect-cecilia",
        name: "Cecilia Ramos",
        phone: "+63 917 654 0091",
        email: "cecilia.ramos@example.com",
        source: "walk_in",
        interest: "plan",
        want: "A pre-need plan",
        callback: "",
        note: "Walked in after the Sunday service.",
        captured_by: "Sam Staff",
      },
    });
    await recordProspectAssignment({
      prospectId: "prospect-cecilia",
      agent: "Alex Agent",
      by: "Sam Staff",
      note: "Please call.",
    });

    const html = await render();
    expect((html.match(/<h1[\s>]/g) ?? []).length).toBe(1);
    expect(html).toContain("Alex Agent"); // the assigned owner
    expect(html).toContain("Cecilia Ramos"); // the prospect
    expect(html).toContain("A pre-need plan");
    expect(html).toContain('href="/staff/prospects"');
    // The retired duplicate read must not come back.
    expect(html).not.toContain("/staff/pipeline");
  });

  it("shows the honest empty state when no prospect is on record", async () => {
    signIn(["cases:read"]);
    const html = await render();
    expect(html).toContain("No agents on record");
  });
});
