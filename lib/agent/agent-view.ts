/**
 * Pure view logic for the agent portal — no React, no I/O, unit-tested.
 *
 * Everything here is presentation policy with one job: make the approved agent
 * design (docs/08-delivery/agent-portal-design) render the same decisions every
 * time, and make those decisions testable without a browser.
 */
import type { Appointment, Application, Client, Prospect, WorkItem } from "@/lib/api-client/agent";

/** The four words the work list uses, in evaluation order. */
export type WorkState = "overdue" | "today" | "waiting" | "future" | "done";

const ORDER: Record<WorkState, number> = { overdue: 0, today: 1, waiting: 2, future: 3, done: 4 };

function sameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/**
 * Trigger beats date: a waiting-on-the-family item is never "overdue" (the agent
 * cannot act), and a finished item is always done, whatever its date says.
 */
export function workState(item: WorkItem, now: Date): WorkState {
  if (item.state === "done") return "done";
  if (item.state === "waiting") return "waiting";
  const due = new Date(item.due_at);
  if (Number.isNaN(due.getTime())) return "future";
  if (sameUtcDay(due, now)) return "today";
  if (due.getTime() < now.getTime()) return "overdue";
  return "future";
}

/** Stable priority order: overdue (oldest first), today, waiting, future, done. */
export function orderWorkItems(items: WorkItem[], now: Date): WorkItem[] {
  return [...items].sort((a, b) => {
    const sa = ORDER[workState(a, now)];
    const sb = ORDER[workState(b, now)];
    if (sa !== sb) return sa - sb;
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  });
}

/** "OVERDUE · 2 DAYS" / "DUE TODAY" / "WAITING ON THE FAMILY" / "DONE THIS MORNING". */
export function workKindLabel(item: WorkItem, now: Date): string {
  const state = workState(item, now);
  if (state === "done") return "Done";
  if (state === "waiting") return "Waiting on the family";
  if (state === "today") return "Due today";
  const due = new Date(item.due_at);
  const days = Math.max(1, Math.round((now.getTime() - due.getTime()) / 86_400_000));
  return days === 1 ? "Overdue · 1 day" : `Overdue · ${days} days`;
}

export type StageMeta = { label: string; tone: "" | "warm" | "hot" | "won" };

/**
 * The PRD pipeline (commerce-catalog §33): New → Contacted → Qualified →
 * Presentation → Proposal → Reserved → Sold. The agent view uses its own words
 * for the same stages and a tone that never carries meaning by colour alone.
 */
const STAGES: Record<string, StageMeta> = {
  new: { label: "New", tone: "" },
  contacted: { label: "Contacted", tone: "warm" },
  qualified: { label: "Qualified", tone: "hot" },
  presentation: { label: "Meeting planned", tone: "" },
  proposal: { label: "Ready to close", tone: "warm" },
  reserved: { label: "Reserved", tone: "won" },
  sold: { label: "Sold", tone: "won" },
};

export function stageMeta(stage: string): StageMeta {
  return STAGES[stage] ?? { label: stage, tone: "" };
}

/**
 * The PRD pipeline in order (commerce-catalog §33). One home for the sequence:
 * the lead record draws its trail and its movement from this, never from a
 * second hard-coded list.
 */
export const PIPELINE_STAGES = [
  "new",
  "contacted",
  "qualified",
  "presentation",
  "proposal",
  "reserved",
  "sold",
] as const;

export type StageStep = { stage: string; label: string; reached: boolean; current: boolean };

/**
 * The pipeline as a trail: every stage up to and including the current one is
 * `reached`; the current stage is `current`. An unknown stage is not on the
 * PRD line, so only the current step is shown rather than a wrong position.
 */
export function stageTrail(stage: string): StageStep[] {
  const index = PIPELINE_STAGES.indexOf(stage as (typeof PIPELINE_STAGES)[number]);
  if (index === -1) return [{ stage, label: stageMeta(stage).label, reached: true, current: true }];
  return PIPELINE_STAGES.map((key, i) => ({
    stage: key,
    label: stageMeta(key).label,
    reached: i <= index,
    current: i === index,
  }));
}

/**
 * Where a lead came in, in the agent's words. The capture form's four source
 * values are the whole vocabulary (lib/demo-agent-captures.ts); an unknown one
 * stays as recorded rather than being dressed up as something it is not.
 */
const LEAD_SOURCE_LABELS: Record<string, string> = {
  walk_in: "Walk-in",
  referral: "Referral",
  facebook: "Facebook enquiry",
  event: "Community event",
};

export function leadSourceLabel(source: string): string {
  return LEAD_SOURCE_LABELS[source] ?? source;
}

/** The recorded kind of one contact entry, in plain words. */
const ACTIVITY_KINDS: Record<string, string> = {
  call: "Call",
  visit: "Visit",
  link: "Link opened",
  message: "Message",
  note: "Note",
};

export function activityKindLabel(kind: string): string {
  return ACTIVITY_KINDS[kind] ?? kind;
}

export function interestLabel(interest: Prospect["interest"]): string {
  if (interest === "plan") return "Plan";
  if (interest === "lot") return "Lot";
  return "Services";
}

export function prospectValueTotal(prospects: Prospect[]): number {
  return prospects.reduce((sum, p) => sum + p.possible_value_cents, 0);
}

export function needsYou(prospects: Prospect[]): Prospect[] {
  return prospects.filter((p) => p.urgency === "hot" || p.urgency === "today");
}

/** The fixture never invents a commission figure; the view keys off this one flag. */
export function commissionConfigured(commission: { configured: boolean }): boolean {
  return commission.configured;
}

export function applicationTone(stage: Application["stage"]): "" | "warm" | "won" {
  if (stage === "approved") return "won";
  if (stage === "waiting_you" || stage === "waiting_family") return "warm";
  return "";
}

/** Search by name, phone, email, or a holding label (lot / plan). */
export function findClients(clients: Client[], query: string): Client[] {
  const q = query.trim().toLowerCase();
  if (!q) return clients;
  return clients.filter((c) => {
    const haystack = [
      c.name,
      c.phone,
      c.email,
      ...c.holdings.map((h) => `${h.label} ${h.detail}`),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function todayAppointments(appointments: Appointment[]): Appointment[] {
  return appointments.filter((a) => a.day === "today");
}

/** Confirmation state in agent words; never green before a human confirms. */
export function appointmentStateLabel(a: Appointment): string {
  return a.status === "confirmed" ? "Confirmed by the office" : "Waiting for the office to confirm";
}

const DAY_FORMAT = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  day: "numeric",
  month: "short",
});
const TIME_FORMAT = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function manilaDay(iso: string): string {
  return DAY_FORMAT.format(new Date(iso));
}

export function manilaTime(iso: string): string {
  return TIME_FORMAT.format(new Date(iso));
}

export function nextActionItem(items: WorkItem[], now: Date): WorkItem | null {
  const first = orderWorkItems(items, now).find((i) => workState(i, now) !== "done");
  return first ?? null;
}
