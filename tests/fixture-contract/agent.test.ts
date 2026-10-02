import { describe, expect, it } from "vitest";
import personas from "@/lib/fixtures/auth/personas.json";
import workspace from "@/lib/fixtures/agent/workspace.json";
import { agentLiveModeEnabled } from "@/lib/api-client/agent";
import { applyStageMoves, capturedProspects, type CapturedLead } from "@/lib/agent/acquisition";
import { LOT_PRICE_CATEGORIES } from "@/lib/villa-pricing";

/**
 * The agent workspace fixture is PROVISIONAL (no agent/crm/commission contract
 * exists — see lib/api-client/agent.ts). It starts CLEAN (captain, 2026-10-02):
 * the demo people and records are removed, so the pipeline begins empty and a
 * lead reaches it only through the capture journal. These assertions pin the
 * clean state, the capture fold and the one rule that must never drift:
 * commission stays unconfigured with null amounts until the client fixes rates
 * (docs/07-client-villa/open-questions.md:26).
 */
const ws = workspace as unknown as {
  agent: { id: string; display_name: string; email: string };
  prospects: unknown[];
  prospect_activity: Record<string, unknown[]>;
  prospect_shares: Record<string, unknown[]>;
  clients: unknown[];
  appointments: unknown[];
  tasks: unknown[];
  today: {
    work_items: unknown[];
    numbers: { pipeline_total_cents: number };
  };
  commission: {
    configured: boolean;
    pending_approval_cents: number | null;
    approved_cents: number | null;
    paid_this_year_cents: number | null;
    statement: Array<{ amount_cents: number | null }>;
    target: { amount_cents: number | null };
  };
  lot_availability: Array<{ key: string; product: string; available: number }>;
  applications: unknown[];
  materials: Array<{ href: string }>;
};

describe("agent workspace fixture", () => {
  it("is fixture-only until the agent workspace contract freezes", () => {
    expect(agentLiveModeEnabled()).toBe(false);
  });

  it("belongs to the seeded agent persona", () => {
    const persona = (personas.personas as Array<{ email: string; display_name: string; user_id: string }>).find(
      (p) => p.email === "agent@vm.demo",
    );
    expect(persona).toBeTruthy();
    expect(ws.agent.email).toBe(persona?.email);
    expect(ws.agent.display_name).toBe(persona?.display_name);
    expect(ws.agent.id).toBe(persona?.user_id);
  });

  it("starts clean: no demo prospects, clients, work items, appointments, tasks or applications", () => {
    expect(ws.prospects).toEqual([]);
    expect(ws.clients).toEqual([]);
    expect(ws.appointments).toEqual([]);
    expect(ws.tasks).toEqual([]);
    expect(ws.applications).toEqual([]);
    expect(Object.keys(ws.prospect_activity)).toEqual([]);
    expect(Object.keys(ws.prospect_shares)).toEqual([]);
    expect(ws.today.work_items).toEqual([]);
    expect(ws.today.numbers.pipeline_total_cents).toBe(0);
  });

  it("NEVER invents a commission figure — the engine is unconfigured and every amount is null", () => {
    expect(ws.commission.configured).toBe(false);
    expect(ws.commission.pending_approval_cents).toBeNull();
    expect(ws.commission.approved_cents).toBeNull();
    expect(ws.commission.paid_this_year_cents).toBeNull();
    expect(ws.commission.target.amount_cents).toBeNull();
    for (const line of ws.commission.statement) expect(line.amount_cents).toBeNull();
  });

  it("prices lot availability through the 2026 sheet, not through the fixture", () => {
    const lotOnly = LOT_PRICE_CATEGORIES.find((c) => c.title === "1. Lot Only");
    expect(lotOnly).toBeTruthy();
    for (const row of ws.lot_availability) {
      expect(lotOnly?.rows.some((r) => r.product === row.product)).toBe(true);
      expect(Number.isInteger(row.available)).toBe(true);
    }
  });

  it("points materials at office-owned public routes", () => {
    for (const m of ws.materials) {
      expect(m.href.startsWith("/")).toBe(true);
      expect(m.href.startsWith("/agent")).toBe(false);
    }
  });

  it("folds a captured lead into a pipeline prospect with an honest first move", () => {
    const capture: CapturedLead = {
      id: "prospect-captured-1",
      name: "  Nena Bautista  ",
      phone: "+63 917 000 0000",
      source: "walk_in",
      interest: "plan",
      want: "A pre-need plan",
      callback: "After 4 PM",
      note: "Met at the door.",
      captured_at: "2026-10-02T02:00:00Z",
      captured_by: "Alex Agent",
    };
    const [prospect] = capturedProspects([capture]);
    expect(prospect.name).toBe("Nena Bautista");
    expect(prospect.stage).toBe("new");
    expect(prospect.owner).toBe("Alex Agent");
    expect(prospect.possible_value_cents).toBe(0);
    expect(prospect.first_contact_at).toBe(capture.captured_at);
    expect(prospect.stage_history).toHaveLength(1);
    expect(prospect.stage_history[0]).toMatchObject({
      stage: "new",
      at: capture.captured_at,
      by: "Alex Agent",
    });
  });

  it("moves a captured lead forward with the stage-move fold", () => {
    const [prospect] = capturedProspects([
      {
        id: "prospect-captured-2",
        name: "",
        phone: "+63 917 111 1111",
        source: "referral",
        interest: "unsure",
        want: "Not sure yet — stay in touch",
        callback: "",
        note: "",
        captured_at: "2026-10-02T02:00:00Z",
        captured_by: "Alex Agent",
      },
    ]);
    // An unnamed lead is the phone number, never a blank row.
    expect(prospect.name).toBe("+63 917 111 1111");
    const [moved] = applyStageMoves([prospect], [
      {
        prospect_id: prospect.id,
        stage: "contacted",
        at: "2026-10-03T02:00:00Z",
        by: "Alex Agent",
        note: "First call done.",
      },
    ]);
    expect(moved.stage).toBe("contacted");
    expect(moved.stage_history.map((move) => move.stage)).toEqual(["new", "contacted"]);
    expect(moved.last_contact_at).toBe("2026-10-03T02:00:00Z");
  });
});
