import { describe, expect, it } from "vitest";
import personas from "@/lib/fixtures/auth/personas.json";
import customers from "@/lib/fixtures/crm/customers.json";
import lots from "@/lib/fixtures/property/lots.json";
import workspace from "@/lib/fixtures/agent/workspace.json";
import { agentLiveModeEnabled } from "@/lib/api-client/agent";
import { manilaTime } from "@/lib/agent/agent-view";
import { LOT_PRICE_CATEGORIES, SENIOR_PAYMENTS, VMP_PAYMENTS } from "@/lib/villa-pricing";

/**
 * The agent workspace fixture is PROVISIONAL (no agent/crm/commission contract
 * exists — see lib/api-client/agent.ts). These assertions pin the record so a
 * future contract freeze starts from a known state, and enforce the one rule
 * that must never drift: commission stays unconfigured with null amounts until
 * the client fixes rates (docs/07-client-villa/open-questions.md:26).
 */
const ws = workspace as unknown as typeof workspace & {
  agent: { id: string; display_name: string; email: string };
  prospects: Array<{ id: string; stage: string; possible_value_cents: number }>;
  clients: Array<{ id: string; customer_id: string | null; holdings: Array<{ lot_id?: string }> }>;
  work_items?: unknown;
  today: {
    work_items: Array<{ contact_id: string; kind: string; state: string }>;
    numbers: { pipeline_total_cents: number };
  };
  appointments: Array<{ id: string; day: string; starts_at: string; time_label: string }>;
  commission: {
    configured: boolean;
    pending_approval_cents: number | null;
    approved_cents: number | null;
    paid_this_year_cents: number | null;
    statement: Array<{ amount_cents: number | null }>;
    target: { amount_cents: number | null };
  };
  lot_availability: Array<{ key: string; product: string; available: number }>;
  applications: Array<{ client_id: string }>;
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

  it("references only customers and lots that exist in the recorded fixtures", () => {
    const customerIds = new Set((customers.customers as Array<{ id: string }>).map((c) => c.id));
    const lotIds = new Set((lots.lots as Array<{ id: string }>).map((l) => l.id));
    for (const client of ws.clients) {
      if (client.customer_id) expect(customerIds.has(client.customer_id)).toBe(true);
      for (const holding of client.holdings) {
        if (holding.lot_id) expect(lotIds.has(holding.lot_id)).toBe(true);
      }
    }
  });

  it("uses the PRD pipeline stages only", () => {
    const stages = new Set([
      "new",
      "contacted",
      "qualified",
      "presentation",
      "proposal",
      "reserved",
      "sold",
    ]);
    for (const p of ws.prospects) expect(stages.has(p.stage)).toBe(true);
  });

  it("keeps every work item pointed at a real prospect and honest state", () => {
    const ids = new Set(ws.prospects.map((p) => p.id));
    for (const w of ws.today.work_items) {
      expect(ids.has(w.contact_id)).toBe(true);
      expect(["open", "waiting", "done"]).toContain(w.state);
    }
  });

  it("keeps every application pointed at a real prospect or client", () => {
    const ids = new Set([...ws.prospects.map((p) => p.id), ...ws.clients.map((c) => c.id)]);
    for (const a of ws.applications) expect(ids.has(a.client_id)).toBe(true);
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

  it("prices plan prospects through the 2026 payment sheet — never a monthly quote as cents", () => {
    const monthly = VMP_PAYMENTS.find((r) => r.mode === "Monthly");
    const seniorMonthly = SENIOR_PAYMENTS.find((r) => r.mode === "Monthly");
    expect(monthly).toBeTruthy();
    expect(seniorMonthly).toBeTruthy();
    // Cecilia asked for Bronze 2 monthly; Jun for the senior Bronze 2 monthly.
    // Both are six-year totals (monthly × 72), the way every other pipeline value
    // is a contract value — the 55440/50400 factor-100 bug this pins is fixed.
    expect(ws.prospects.find((p) => p.id === "prospect-cecilia")?.possible_value_cents).toBe(
      (monthly?.bronze2 ?? 0) * 72 * 100,
    );
    expect(ws.prospects.find((p) => p.id === "prospect-jun")?.possible_value_cents).toBe(
      (seniorMonthly?.bronze2 ?? 0) * 72 * 100,
    );
  });

  it("keeps the dashboard pipeline total equal to the prospect values it summarises", () => {
    expect(ws.today.numbers.pipeline_total_cents).toBe(
      ws.prospects.reduce((sum, p) => sum + p.possible_value_cents, 0),
    );
  });

  it("stores today's appointment instants that render as the fixture's own Manila time", () => {
    for (const a of ws.appointments.filter((x) => x.day === "today")) {
      expect(manilaTime(a.starts_at)).toBe(a.time_label);
    }
  });
});
