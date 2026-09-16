/**
 * Typed data access for the AGENT portal (Sales Agent / Lot Sales Officer surfaces).
 *
 * ⚠ PROVISIONAL SHAPE — flagged loudly per web/AGENTS.md: there is NO agent-workspace
 * API contract yet. crm-families is unbuilt, the commission engine (finance-billing
 * §17) is deferred platform scope, and an agent-facing scheduling read does not exist.
 * This client therefore reads the recorded fixture `lib/fixtures/agent/workspace.json`
 * ONLY and never claims a live mode. The fixture header carries the provenance and the
 * hard rule that every commission amount is null until Villa configures rates
 * (docs/07-client-villa/open-questions.md:26).
 *
 * What the fixture reuses from recorded sources: customers 101–104 (crm/customers.json),
 * lots D01–D03 (property/lots.json), the inquiry people/sources (crm/inquiries.json),
 * the PRD pipeline stages (commerce-catalog §33), the seven appointment reasons
 * (facilities-scheduling §35), and the 2026 lot prices, which are read from
 * lib/villa-pricing.ts — never copied into the fixture.
 *
 * When the agent contract freezes, this file gains the live branch and the fixture's
 * provenance header is replaced by the contract reference. Until then, a screen that
 * needs something this fixture does not carry says so instead of faking it.
 */
import workspaceFile from "@/lib/fixtures/agent/workspace.json";
import { ApiError } from "@/lib/api-client/api-error";

export type AgentIdentity = {
  id: string;
  display_name: string;
  email: string;
  office_number: string;
};

export type WorkItem = {
  id: string;
  kind: "follow_up" | "send" | "document" | "call" | "first_call";
  contact_id: string;
  contact_name: string;
  title: string;
  detail: string;
  meta: string[];
  due_at: string;
  state: "open" | "waiting" | "done";
  primary_action: string;
  secondary_action: string | null;
  snooze: string | null;
};

export type Prospect = {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  interest: "plan" | "lot" | "services";
  want: string;
  stage: string;
  owner: string;
  possible_value_cents: number;
  last_contact_at: string;
  next_action: string;
  urgency: string;
  best_time: string;
  notes: string;
};

export type ProspectActivity = {
  id: string;
  kind: "call" | "visit" | "link" | "message" | "note";
  at: string;
  title: string;
  detail: string;
};

export type ProspectShare = {
  id: string;
  title: string;
  sent_at: string;
  opens: number;
  last_open: string;
};

export type ClientHolding = { kind: string; label: string; detail: string; lot_id?: string };

export type Client = {
  id: string;
  customer_id: string | null;
  name: string;
  household: string;
  phone: string;
  email: string;
  since: string;
  holdings: ClientHolding[];
  co_decider: { name: string; note: string } | null;
  next_amount: { amount_cents: number; due_at: string } | null;
  next_events: Array<{ label: string; value: string }>;
  check_in: string;
  ask: string | null;
  papers: string[];
};

export type Appointment = {
  id: string;
  day: "today" | "week";
  starts_at: string;
  time_label: string;
  time_note: string;
  title: string;
  reason: string;
  where: string;
  bring: string[];
  status: "confirmed" | "waiting";
  contact_id: string | null;
};

export type AgentTask = {
  id: string;
  title: string;
  meta: string;
  done: boolean;
};

export type Application = {
  id: string;
  client_id: string;
  client_name: string;
  product: string;
  detail: string;
  stage: "waiting_you" | "approved" | "office" | "waiting_family";
  stage_label: string;
  waits_on: string;
  owner: string;
  promised_by: string | null;
  action: string;
  secondary: string;
};

export type CommissionBasis = { key: string; label: string; detail: string };

export type CommissionLine = {
  id: string;
  title: string;
  detail: string;
  basis: string | null;
  basis_label: string | null;
  credited: string | null;
  state: "pending_approval" | "approved" | "reversed";
  state_label: string;
  amount_cents: number | null;
};

export type Commission = {
  configured: boolean;
  placeholder_note: string;
  pending_approval_cents: number | null;
  approved_cents: number | null;
  paid_this_year_cents: number | null;
  bases: CommissionBasis[];
  statement: CommissionLine[];
  target: { amount_cents: number | null; current_cents: number };
  conversion: { contacted: number; presentations: number; sales: number; example: boolean };
};

export type Material = {
  id: string;
  title: string;
  description: string;
  href: string;
  cover: string;
  shares: number;
  opens: number;
  example: boolean;
};

export type LotAvailability = {
  key: string;
  category: string;
  product: string;
  area_sqm: number;
  available: number;
  section: string;
  photo: string;
};

export type TodayNumbers = {
  sales_count: number;
  sales_total_cents: number;
  pipeline_total_cents: number;
  example: boolean;
};

export type AgentWorkspace = {
  tenant_id: string;
  agent: AgentIdentity;
  today: {
    greeting: string;
    lead: string;
    next_action: {
      work_item_id: string;
      title: string;
      detail: string;
      primary_label: string;
      secondary_label: string;
      quiet_label: string;
    };
    work_items: WorkItem[];
    numbers: TodayNumbers;
    quick_actions: Array<{ key: string; label: string; hint: string; href: string; icon: string }>;
  };
  prospects: Prospect[];
  prospect_activity: Record<string, ProspectActivity[]>;
  prospect_shares: Record<string, ProspectShare[]>;
  clients: Client[];
  appointments: Appointment[];
  tasks: AgentTask[];
  applications: Application[];
  commission: Commission;
  materials: Material[];
  lot_availability: LotAvailability[];
};

export function agentLiveModeEnabled(): boolean {
  return false; // no agent-workspace API contract yet — fixture only until the dev freeze
}

/** Tolerant reader in the staff-client style: shape drift fails loudly, never silently. */
function readWorkspace(): AgentWorkspace {
  const raw = workspaceFile as unknown;
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("agent" in (raw as object)) ||
    !("today" in (raw as object))
  ) {
    throw new ApiError("agent workspace fixture is malformed", 500);
  }
  return raw as AgentWorkspace;
}

export async function getAgentWorkspace(): Promise<AgentWorkspace> {
  return readWorkspace();
}

export async function getAgentToday(): Promise<AgentWorkspace["today"] & { agent: AgentIdentity }> {
  const ws = readWorkspace();
  return { ...ws.today, agent: ws.agent };
}

export async function listAgentProspects(): Promise<Prospect[]> {
  return readWorkspace().prospects.map((p) => ({ ...p }));
}

export async function getAgentProspect(
  id: string,
): Promise<{
  prospect: Prospect;
  activity: ProspectActivity[];
  shares: ProspectShare[];
} | null> {
  const ws = readWorkspace();
  const prospect = ws.prospects.find((p) => p.id === id);
  if (!prospect) return null;
  return {
    prospect: { ...prospect },
    activity: (ws.prospect_activity[id] ?? []).map((a) => ({ ...a })),
    shares: (ws.prospect_shares[id] ?? []).map((s) => ({ ...s })),
  };
}

export async function listAgentClients(): Promise<Client[]> {
  return readWorkspace().clients.map((c) => ({ ...c, holdings: c.holdings.map((h) => ({ ...h })) }));
}

export async function getAgentClient(id: string): Promise<Client | null> {
  const client = readWorkspace().clients.find((c) => c.id === id);
  return client ? { ...client, holdings: client.holdings.map((h) => ({ ...h })) } : null;
}

export async function listAgentAppointments(): Promise<{
  appointments: Appointment[];
  tasks: AgentTask[];
}> {
  const ws = readWorkspace();
  return { appointments: ws.appointments.map((a) => ({ ...a })), tasks: ws.tasks.map((t) => ({ ...t })) };
}

export async function listAgentApplications(): Promise<Application[]> {
  return readWorkspace().applications.map((a) => ({ ...a }));
}

export async function getAgentCommission(): Promise<Commission> {
  const c = readWorkspace().commission;
  return {
    ...c,
    bases: c.bases.map((b) => ({ ...b })),
    statement: c.statement.map((l) => ({ ...l })),
    target: { ...c.target },
    conversion: { ...c.conversion },
  };
}

export async function listAgentMaterials(): Promise<Material[]> {
  return readWorkspace().materials.map((m) => ({ ...m }));
}

export async function listAgentLotAvailability(): Promise<LotAvailability[]> {
  return readWorkspace().lot_availability.map((l) => ({ ...l }));
}
