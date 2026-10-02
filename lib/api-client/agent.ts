/**
 * Typed data access for the AGENT portal (Sales Agent / Lot Sales Officer surfaces).
 *
 * ⚠ PROVISIONAL SHAPE — flagged loudly per web/AGENTS.md: there is NO agent-workspace
 * API contract yet. crm-families is unbuilt, the commission engine (finance-billing
 * §17) is deferred platform scope, and an agent-facing scheduling read does not exist.
 * This client therefore reads the recorded fixture `lib/fixtures/agent/workspace.json`,
 * folded with the DEMO-LOCAL stage-move journal (`lib/api-client/agent-store.ts`), and
 * never claims a live mode. The fixture header carries the provenance and the
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
 *
 * The lead record (app/(agent)/agent/prospects/[id]) reads each prospect's recorded
 * movement — `first_contact_at` and `stage_history` — through this client and never
 * invents a move at render time. The step-by-step acquisition is the one write: a move
 * is journalled by `app/api/agent/prospects/[id]/stage` and folded here, so the record,
 * the board, the dashboard and the client book all read this one effective record. The
 * enquiry-persistence / customer-sync / lead-assignment limits are stated on the screen
 * in one line.
 */
import workspaceFile from "@/lib/fixtures/agent/workspace.json";
import { ApiError } from "@/lib/api-client/api-error";
import { getFamilyHousehold } from "@/lib/api-client/family";
import { familyDocumentReleased } from "@/lib/family/family-view";
import { nextPaymentDue, nextPaymentDueLabel } from "@/lib/payment-schedule";
import { liveModeEnabled } from "@/lib/live-mode";
import {
  listAssignmentEvents,
  listBlastEvents,
  listProspectCaptureEvents,
  listStageMoveEvents,
} from "@/lib/api-client/agent-store";
import { listPlanEvents } from "@/lib/api-client/agent-plan-store";
import {
  applyPlanEvents,
  type AgentPlan,
} from "@/lib/agent/agent-plans";
import {
  applyAssignments,
  applyStageMoves,
  assignmentNotices,
  capturedProspects,
  conversionFromProspects,
  convertedClients,
  pipelineValueCents,
  soldTotals,
  type AssignmentNotice,
  type ProspectAssignment,
  type ProspectBlast,
} from "@/lib/agent/acquisition";

/** The agent's own day-planner record; the fold lives in `lib/agent/agent-plans.ts`. */
export type { AgentPlan } from "@/lib/agent/agent-plans";

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
  interest: "plan" | "lot" | "services" | "unsure";
  want: string;
  stage: string;
  owner: string;
  possible_value_cents: number;
  /** When the enquiry came in — the day the lead first reached us. */
  first_contact_at: string;
  last_contact_at: string;
  /** The recorded pipeline movement, oldest move first; the last move is `stage`. */
  stage_history: ProspectStageEvent[];
  next_action: string;
  urgency: string;
  best_time: string;
  notes: string;
};

/**
 * One recorded move of a lead through the PRD pipeline (commerce-catalog §33).
 * `at` is a true instant; `by` is who made the move, in the record's own words.
 */
export type ProspectStageEvent = {
  stage: string;
  at: string;
  by: string;
  note: string;
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

/**
 * One of the family's own visits, as the office's record shows it. Derived from the
 * family's appointment record (lib/fixtures/family/workspace.json) so the agent and
 * the family read the same day, time and place. `person` names the loved one the visit
 * is for — the agent record has no person switcher, so the name travels with the visit.
 * `state` is the family's own word.
 */
export type ClientVisit = {
  id: string;
  kind: string;
  person: string;
  day_label: string;
  time_label: string;
  title: string;
  reason: string;
  where: string;
  state: "confirmed" | "waiting" | "past";
};

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
  /** The family's own visits, when the office record carries them (lib/api-client/agent.ts). */
  visits?: ClientVisit[];
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
  /** The office's due day, when the record writes one (`yyyy-mm-dd` or an instant). */
  due_at?: string;
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
    /** The next thing the workbench names, when the record carries one. */
    next_action?: {
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
  /** The signed-in agent's own plans (demo-local journal), folded beside the recorded day. */
  plans: AgentPlan[];
  applications: Application[];
  commission: Commission;
  materials: Material[];
  lot_availability: LotAvailability[];
};

export function agentLiveModeEnabled(): boolean {
  // No agent-workspace API contract yet: declared in lib/live-mode.ts, cannot
  // enter live mode until the branch exists.
  return liveModeEnabled("agent");
}

/**
 * The lead's recorded movement. The fixture writes it oldest-first; a malformed
 * entry is dropped rather than rendered as a blank move. The record itself (its
 * dates, order and reach) is pinned by tests/fixture-contract/agent.test.ts, not
 * silently repaired here.
 */
function toStageHistory(raw: unknown): ProspectStageEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const row = entry as Record<string, unknown>;
    if (
      typeof row.stage !== "string" ||
      typeof row.at !== "string" ||
      typeof row.by !== "string" ||
      typeof row.note !== "string"
    ) {
      return [];
    }
    return [{ stage: row.stage, at: row.at, by: row.by, note: row.note }];
  });
}

/** One lead as the surfaces read it; stage history never spreads a raw shape. */
function toProspect(raw: Prospect): Prospect {
  return { ...raw, stage_history: toStageHistory(raw.stage_history) };
}

/** Tolerant reader in the staff-client style: shape drift fails loudly, never silently. */
function readWorkspaceSeed(): AgentWorkspace {
  const raw = workspaceFile as unknown;
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("agent" in (raw as object)) ||
    !("today" in (raw as object))
  ) {
    throw new ApiError("agent workspace fixture is malformed", 500);
  }
  // The recorded fixture carries the office's day; the agent's own plans live only
  // in the demo journal, so a seed without them is an empty planner, never an error.
  const record = raw as AgentWorkspace;
  return { ...record, plans: Array.isArray(record.plans) ? record.plans : [] };
}

/**
 * The office-side projection of the DEMO HOUSEHOLD — the one client whose record is
 * the SAME family the family portal serves. Its row in the fixture carries only the
 * agent-only fields and a `household_ref`; every fact the family can also see (the
 * account holder, each loved one's plan and reference, the money, the lots, the papers
 * and the visits) is READ from the family's own recorded source at render time
 * (lib/fixtures/family/snapshot.json + workspace.json), so one fact lives in one
 * record and the two portals cannot describe two different funeral homes. The
 * non-household clients pass through untouched. Pinned by
 * tests/unit/demo-consistency.test.tsx.
 */
function householdRef(raw: Client): string | undefined {
  const ref = (raw as unknown as { household_ref?: unknown }).household_ref;
  return typeof ref === "string" && ref.trim() !== "" ? ref : undefined;
}

async function toClient(raw: Client): Promise<Client> {
  const base: Client = {
    ...raw,
    holdings: (raw.holdings ?? []).map((h) => ({ ...h })),
    visits: [],
  };
  if (!householdRef(raw)) return base;

  const household = await getFamilyHousehold();
  const people = household.people;

  // One plan holding and one lot holding per loved one, so the office record names every
  // plan and lot the family's portal can show.
  const holdings: ClientHolding[] = people.flatMap((person) => {
    const plan: ClientHolding = {
      kind: "plan",
      label: person.plan_summary.plan_name,
      detail: [
        person.payment_schedule?.reference,
        person.payment_schedule?.term,
        `${person.balance.remaining} still to pay`,
      ]
        .filter((part): part is string => Boolean(part))
        .join(" · "),
    };
    if (!person.lot) return [plan];
    return [
      plan,
      {
        kind: "lot",
        label: `Lot ${person.lot.lot_number}`,
        detail: `${person.plan_summary.plan_name} · Section ${person.lot.section} · ${person.lot.park}`,
      },
    ];
  });

  // The next amount is the household's earliest open instalment across every plan.
  const dues = people
    .map((person) => (person.payment_schedule ? nextPaymentDue(person.payment_schedule) : null))
    .filter((due): due is NonNullable<typeof due> => due !== null)
    .sort((a, b) => a.due_on.localeCompare(b.due_on));
  const due = dues[0] ?? null;

  // The visits carry the loved one's name — the agent record has no person switcher.
  const visits: ClientVisit[] = people.flatMap((person) =>
    person.appointments.map((appointment) => ({
      id: appointment.id,
      kind: appointment.kind,
      person: person.name,
      day_label: appointment.day_label,
      time_label: appointment.time_label,
      title: appointment.title,
      reason: appointment.reason,
      where: appointment.where,
      state: appointment.state,
    })),
  );
  const upcoming = visits.filter((visit) => visit.state !== "past");

  const next_events = [
    ...people.map((person) => ({
      label: person.name,
      value: `${person.plan_summary.plan_name} · ${person.plan_summary.term}`,
    })),
    ...(due ? [{ label: "Next payment", value: nextPaymentDueLabel(due) }] : []),
    ...upcoming.map((visit) => ({
      label: visit.title,
      value: `${visit.person} · ${visit.day_label} · ${visit.time_label} · ${visit.where}`,
    })),
  ];

  // Only the copies the office has actually released: a paper still being
  // checked (or rejected) is never presented as ready to hand over, matching the
  // status words the family portal prints for the same record.
  const papers = Array.from(
    new Set(
      people.flatMap((person) =>
        person.recent_documents
          .filter((document) => familyDocumentReleased(document.status))
          .map((document) => document.title),
      ),
    ),
  );

  return {
    ...base,
    name: household.family.display_name,
    phone: household.family.primary_contact,
    email: household.family.email,
    holdings,
    next_amount: due ? { amount_cents: due.due_cents, due_at: due.due_on } : null,
    next_events,
    papers,
    visits,
  };
}

/**
 * The ONE record every agent surface reads: the recorded workspace with the
 * durable stage-move journal folded onto it. A moved prospect's stage, history
 * and last contact change together; a sold one becomes a client here, so the
 * list, the record, the dashboard and the funnel can never disagree.
 *
 * The seed is read fresh each call and never mutated — the fixture on disk stays
 * the recorded state, and only this fold carries a demo edit.
 */
async function readWorkspace(): Promise<AgentWorkspace> {
  const seed = readWorkspaceSeed();
  const [events, planEvents, captures, assignments] = await Promise.all([
    listStageMoveEvents(),
    listPlanEvents(),
    listProspectCaptureEvents(),
    listAssignmentEvents(),
  ]);
  // A lead captured at /agent/new is folded in beside the seed, then the stage
  // moves apply to both, so a captured person reaches the list, the board and
  // the funnel exactly like a recorded one. The office's assignments apply last,
  // so the agent reads the owner the office set — one record, two portals.
  const seedProspects = [...capturedProspects(captures), ...seed.prospects.map(toProspect)];
  const prospects = applyAssignments(applyStageMoves(seedProspects, events), assignments);
  const seedClients = seed.clients.map((c) => ({
    ...c,
    holdings: (c.holdings ?? []).map((h) => ({ ...h })),
  }));
  const clients = [...seedClients, ...convertedClients(prospects, seedClients)];
  const sold = soldTotals(prospects);
  return {
    ...seed,
    prospects,
    clients,
    // The planner journal folds here with the pipeline, so the calendar, the day
    // detail and the sign-in notice cannot disagree about what is planned.
    plans: applyPlanEvents(planEvents),
    today: {
      ...seed.today,
      numbers: {
        ...seed.today.numbers,
        sales_count: sold.count,
        sales_total_cents: sold.totalCents,
        pipeline_total_cents: pipelineValueCents(prospects),
      },
    },
    commission: {
      ...seed.commission,
      conversion: conversionFromProspects(prospects),
    },
  };
}

export async function getAgentWorkspace(): Promise<AgentWorkspace> {
  return readWorkspace();
}

export async function getAgentToday(): Promise<AgentWorkspace["today"] & { agent: AgentIdentity }> {
  const ws = await readWorkspace();
  return { ...ws.today, agent: ws.agent };
}

export async function listAgentProspects(): Promise<Prospect[]> {
  const ws = await readWorkspace();
  return ws.prospects.map(toProspect);
}

/**
 * Every assignment the office recorded, oldest first — the same journal the
 * pipeline folds. The staff Prospects screen reads this to show who assigned
 * what, and the agent portal reads it for the durable notice.
 */
export async function listProspectAssignments(): Promise<ProspectAssignment[]> {
  return listAssignmentEvents();
}

/** Every email blast the office recorded, oldest first. */
export async function listProspectBlasts(): Promise<ProspectBlast[]> {
  return listBlastEvents();
}

/** The assignments addressed to one agent, newest first — the agent's notices. */
export async function listAssignmentNotices(agentName: string): Promise<AssignmentNotice[]> {
  const ws = await readWorkspace();
  return assignmentNotices(ws.prospects, await listAssignmentEvents(), agentName);
}

export async function getAgentProspect(
  id: string,
): Promise<{
  prospect: Prospect;
  activity: ProspectActivity[];
  shares: ProspectShare[];
} | null> {
  const ws = await readWorkspace();
  const prospect = ws.prospects.find((p) => p.id === id);
  if (!prospect) return null;
  return {
    prospect: toProspect(prospect),
    activity: (ws.prospect_activity[id] ?? []).map((a) => ({ ...a })),
    shares: (ws.prospect_shares[id] ?? []).map((s) => ({ ...s })),
  };
}

export async function listAgentClients(): Promise<Client[]> {
  const ws = await readWorkspace();
  return Promise.all(ws.clients.map(toClient));
}

export async function getAgentClient(id: string): Promise<Client | null> {
  const ws = await readWorkspace();
  const client = ws.clients.find((c) => c.id === id);
  return client ? toClient(client) : null;
}

export async function listAgentAppointments(): Promise<{
  appointments: Appointment[];
  tasks: AgentTask[];
}> {
  const ws = await readWorkspace();
  return { appointments: ws.appointments.map((a) => ({ ...a })), tasks: ws.tasks.map((t) => ({ ...t })) };
}

/** The signed-in agent's own plan list, folded from the demo planner journal. */
export async function listAgentPlans(): Promise<AgentPlan[]> {
  const ws = await readWorkspace();
  return ws.plans.map((plan) => ({ ...plan }));
}

export async function listAgentApplications(): Promise<Application[]> {
  const ws = await readWorkspace();
  return ws.applications.map((a) => ({ ...a }));
}

export async function getAgentCommission(): Promise<Commission> {
  const c = (await readWorkspace()).commission;
  return {
    ...c,
    bases: c.bases.map((b) => ({ ...b })),
    statement: c.statement.map((l) => ({ ...l })),
    target: { ...c.target },
    conversion: { ...c.conversion },
  };
}

export async function listAgentMaterials(): Promise<Material[]> {
  const ws = await readWorkspace();
  return ws.materials.map((m) => ({ ...m }));
}

export async function listAgentLotAvailability(): Promise<LotAvailability[]> {
  const ws = await readWorkspace();
  return ws.lot_availability.map((l) => ({ ...l }));
}
