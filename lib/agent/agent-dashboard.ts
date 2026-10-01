/**
 * The agent workbench's derivations — pure, so the dashboard's structure and its
 * honest states are testable without a browser.
 *
 * WHAT THIS MODULE IS. The plan's workbench (data/villa-agent-portal-plan) turns
 * the agent's recorded workspace into the rows the page renders: the pipeline
 * stage-flow, the one real time series the records support, the attention strip
 * and the vitals. Every function here is a read of a recorded fact or a count of
 * one. Nothing invents a figure, a trend or a date.
 *
 * THE ONE TIME SERIES, AND WHY IT IS HONEST. The office's record keeps no dated
 * pipeline snapshots and orders carry no agent, so there is no "pipeline value on
 * day X" series (plan §7.1). What the record DOES carry is each lead's
 * `first_contact_at` and its `possible_value_cents`. `pipelineBuiltSeries` walks
 * those and returns the CUMULATIVE contract value that entered the agent's
 * pipeline on each recorded date — a real series, labelled for exactly what it
 * is. It is never presented as a daily pipeline valuation.
 */
import type {
  Application,
  Appointment,
  Client,
  Prospect,
  WorkItem,
} from "@/lib/api-client/agent";
import { FAMILY_HELP } from "@/lib/family/contact";
import {
  PIPELINE_STAGES,
  manilaDay,
  needsYou,
  stageMeta,
  todayAppointments,
  workState,
} from "@/lib/agent/agent-view";

/** One segment of the PRD stage-flow strip: a real recorded count per stage. */
export type StageFlowSegment = {
  stage: string;
  label: string;
  count: number;
  value_cents: number;
  /** A stage holding nobody is drawn as a dashed gap, never hidden. */
  empty: boolean;
};

export function pipelineStageFlow(prospects: readonly Prospect[]): StageFlowSegment[] {
  return PIPELINE_STAGES.map((stage) => {
    const inStage = prospects.filter((p) => p.stage === stage);
    return {
      stage,
      label: stageMeta(stage).label,
      count: inStage.length,
      value_cents: inStage.reduce((sum, p) => sum + p.possible_value_cents, 0),
      empty: inStage.length === 0,
    };
  });
}

/** One point of the dashboard's lead chart. `value` is minor units (cents). */
export type SeriesPoint = { label: string; value: number };

/**
 * The value that entered the pipeline, cumulative, at each recorded first-contact
 * date — the honest series the record supports. `value` is minor units.
 */
export function pipelineBuiltSeries(prospects: readonly Prospect[]): SeriesPoint[] {
  const sorted = [...prospects].sort((a, b) =>
    a.first_contact_at.localeCompare(b.first_contact_at),
  );
  const byDay = new Map<string, number>();
  let cumulative = 0;
  for (const prospect of sorted) {
    cumulative += prospect.possible_value_cents;
    byDay.set(prospect.first_contact_at.slice(0, 10), cumulative);
  }
  return [...byDay.entries()].map(([day, value]) => ({ label: manilaDay(`${day}T00:00:00Z`), value }));
}

export type AttentionTone = "danger" | "warning" | "info" | "neutral";

/** One row of the “what needs you now” strip, most urgent first. */
export type WorkbenchAlert = {
  key: string;
  label: string;
  meta?: string;
  state: string;
  tone: AttentionTone;
  href: string;
  actionLabel: string;
};

/**
 * The attention strip — up to four real needs, capped because a workbench is
 * read at a glance. An overdue follow-up uses the alarm tone; everything else is
 * a warning or an info, never red for a thing that is merely scheduled.
 */
export function agentAttention(
  workItems: readonly WorkItem[],
  applications: readonly Application[],
  appointments: readonly Appointment[],
  clients: readonly Client[],
  now: Date,
): WorkbenchAlert[] {
  const alerts: WorkbenchAlert[] = [];

  const overdue = [...workItems]
    .filter((item) => workState(item, now) === "overdue")
    .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
  for (const item of overdue) {
    alerts.push({
      key: `overdue-${item.id}`,
      label: item.title,
      meta: item.detail,
      state: item.state === "waiting" ? "Waiting" : "Overdue",
      tone: item.state === "waiting" ? "warning" : "danger",
      href: `/agent/prospects/${item.contact_id}`,
      actionLabel: "Open",
    });
  }

  for (const application of applications.filter((a) => a.stage === "waiting_you")) {
    alerts.push({
      key: `application-${application.id}`,
      label: `${application.client_name} — ${application.product}`,
      meta: application.waits_on,
      state: application.stage_label,
      tone: "warning",
      href: "/agent/applications",
      actionLabel: "Open",
    });
  }

  for (const appointment of todayAppointments([...appointments]).filter((a) => a.status === "waiting")) {
    alerts.push({
      key: `appointment-${appointment.id}`,
      label: appointment.title,
      meta: `${appointment.time_label} · ${appointment.where}`,
      state: "Awaiting the office",
      tone: "info",
      href: "/agent/appointments",
      actionLabel: "Open the day",
    });
  }

  for (const client of clients.filter((c) => c.check_in === "Check-in this month")) {
    alerts.push({
      key: `checkin-${client.id}`,
      label: `${client.name} is due a check-in`,
      meta: client.holdings.map((h) => h.label).join(" · ") || undefined,
      state: "This month",
      tone: "neutral",
      href: `/agent/clients/${client.id}`,
      actionLabel: "Open",
    });
  }

  return alerts.slice(0, 4);
}

/** Today's stops in drive order. */
export function stopsToday(appointments: readonly Appointment[]): Appointment[] {
  return [...todayAppointments([...appointments])].sort((a, b) =>
    a.starts_at.localeCompare(b.starts_at),
  );
}

/** The families due a check-in this month. */
export function clientsDueCheckIn(clients: readonly Client[]): Client[] {
  return clients.filter((client) => client.check_in === "Check-in this month");
}

/**
 * The prospect list's order (plan §8.2): needs-you first (hot / today), then
 * everyone by last contact, oldest first — the person going cold rises to the
 * top. A stable tiebreak on id keeps the order deterministic.
 */
export function orderProspects(prospects: readonly Prospect[]): Prospect[] {
  return [...prospects].sort((a, b) => {
    const aNeeds = needsYou([a]).length > 0 ? 0 : 1;
    const bNeeds = needsYou([b]).length > 0 ? 0 : 1;
    if (aNeeds !== bNeeds) return aNeeds - bNeeds;
    const byContact = a.last_contact_at.localeCompare(b.last_contact_at);
    if (byContact !== 0) return byContact;
    return a.id.localeCompare(b.id);
  });
}

/** The one office line every “ask the office” action uses. */
export const WORKBENCH_HELP = FAMILY_HELP;

/** The analytics page's window — a real filter over the recorded first-contact dates. */
export const ANALYTICS_PERIODS = ["month", "quarter", "year"] as const;
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

export function isAnalyticsPeriod(value: string | undefined): value is AnalyticsPeriod {
  return ANALYTICS_PERIODS.includes(value as AnalyticsPeriod);
}

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  month: "This month",
  quarter: "This quarter",
  year: "This year",
};

export function analyticsPeriodLabel(period: AnalyticsPeriod): string {
  return PERIOD_LABELS[period];
}

/** The first instant of the period, in UTC — the same clock the records carry. */
export function periodStart(period: AnalyticsPeriod, now: Date): Date {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  if (period === "month") {
    start.setUTCDate(1);
  } else if (period === "quarter") {
    start.setUTCMonth(Math.floor(start.getUTCMonth() / 3) * 3);
    start.setUTCDate(1);
  } else {
    start.setUTCMonth(0);
    start.setUTCDate(1);
  }
  return start;
}

/**
 * The value that entered the pipeline within the window, cumulative — the same
 * honest series as `pipelineBuiltSeries`, narrowed to the leads first contacted
 * in the period. An empty window is a real zero, never a fabricated line.
 */
export function pipelineBuiltSeriesWithin(
  prospects: readonly Prospect[],
  period: AnalyticsPeriod,
  now: Date,
): SeriesPoint[] {
  const start = periodStart(period, now).getTime();
  const inWindow = prospects.filter(
    (p) => new Date(p.first_contact_at).getTime() >= start,
  );
  return pipelineBuiltSeries(inWindow);
}
