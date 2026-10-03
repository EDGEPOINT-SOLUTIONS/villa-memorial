/**
 * The one reading of every office write on the Prospects screen (PURE).
 *
 * WHY THIS LIVES HERE. `web/AGENTS.md` rule 1 keeps BFF route handlers dumb: a
 * route reads a body, asks a pure function for a verdict and persists through the
 * owning store. The rules a prospect write must satisfy — creating a prospect,
 * advancing its state, assigning it to an agent, blasting it — are here, next to
 * the vocabulary they speak (`lib/crm/prospect-view.ts`), so the browser form and
 * the route run the SAME reading and a field error is the same sentence in both
 * places. Nothing here throws or persists.
 *
 * The shapes a write produces are the store's own: a prospect is the existing
 * `CapturedLead` the agent journal persists (so a prospect captured in the office
 * and a lead captured in the field are one record), and a state move is an
 * ordinary forward stage move, which is what makes it appear in the agent pipeline.
 */
import type { CapturedLead } from "@/lib/agent/acquisition";
import type { Prospect } from "@/lib/api-client/agent";
import { stageIndex } from "@/lib/agent/agent-view";
import {
  PROSPECT_STATES,
  prospectStateLabel,
  prospectStateOf,
  prospectStateStage,
  type ProspectState,
} from "@/lib/crm/prospect-view";

export const PROSPECT_SOURCES = [
  "website",
  "facebook",
  "messenger",
  "walk_in",
  "referral",
  "phone",
  "agent",
  "event",
  "ads",
] as const;
export type ProspectSource = (typeof PROSPECT_SOURCES)[number];

export const PROSPECT_INTERESTS = ["plan", "lot", "services", "unsure"] as const;

export const PROSPECT_NAME_MAX = 120;
export const PROSPECT_PHONE_MAX = 40;
export const PROSPECT_EMAIL_MAX = 160;
export const PROSPECT_TOPIC_MAX = 300;
export const PROSPECT_NOTE_MAX = 500;
export const PROSPECT_BLAST_SUBJECT_MAX = 150;
export const PROSPECT_BLAST_MESSAGE_MAX = 4000;
export const PROSPECT_ASSIGN_NOTE_MAX = 300;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isProspectSource(value: unknown): value is ProspectSource {
  return typeof value === "string" && (PROSPECT_SOURCES as readonly string[]).includes(value);
}

function isProspectInterest(value: unknown): value is Prospect["interest"] {
  return typeof value === "string" && (PROSPECT_INTERESTS as readonly string[]).includes(value);
}

/* ------------------------------ create ----------------------------------- */

export type ProspectIntake =
  | { ok: true; value: Omit<CapturedLead, "captured_at" | "captured_by" | "id"> }
  | { ok: false; errors: Record<string, string> };

/**
 * The office's own "add a prospect" reading. Phone is OPTIONAL (captain,
 * 2026-10-03): a family plan/lot ask arrives with the account's name and email
 * and no number, and the office must still be able to work it. The contact
 * requirement lands where it belongs — on the case, which is an arrangement with
 * a person — not on the prospect. A name is helpful; the source defaults to the
 * front desk's `walk_in` when none is chosen.
 */
export function readProspectIntake(values: unknown): ProspectIntake {
  const record =
    typeof values === "object" && values !== null ? (values as Record<string, unknown>) : {};
  const errors: Record<string, string> = {};

  const phone = text(record.phone, PROSPECT_PHONE_MAX);

  const need = record.need;
  if (!isProspectInterest(need)) {
    errors.need = "Choose what they are considering — even “not sure yet” counts.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name: text(record.name, PROSPECT_NAME_MAX),
      phone,
      email: text(record.email, PROSPECT_EMAIL_MAX),
      source: isProspectSource(record.source) ? record.source : "walk_in",
      interest: need as Prospect["interest"],
      want: text(record.want, PROSPECT_TOPIC_MAX),
      callback: text(record.callback, PROSPECT_PHONE_MAX),
      note: text(record.note, PROSPECT_NOTE_MAX),
    },
  };
}

/* ------------------------------- state ----------------------------------- */

export type ProspectStateMove =
  | { ok: true; state: ProspectState; stage: string; note: string }
  | { ok: false; errors: Record<string, string> };

/**
 * The one reading of a state advance. The target is one of the office's three
 * words and it must be AHEAD of where the prospect stands on the pipeline line;
 * the recorded stage-move note is written here, so every office advance leaves
 * the same short trail the agent's own moves do.
 */
export function readProspectStateMove(input: {
  state: unknown;
  currentStage: string;
}): ProspectStateMove {
  const state = input.state;
  if (typeof state !== "string" || !(PROSPECT_STATES as readonly string[]).includes(state)) {
    return { ok: false, errors: { state: "That is not one of the prospect states." } };
  }
  const target = prospectStateStage(state as ProspectState);
  const current = stageIndex(input.currentStage);
  const targetIndex = stageIndex(target);
  if (current !== -1 && targetIndex <= current) {
    return {
      ok: false,
      errors: { state: "The prospect only moves forward — choose a later state." },
    };
  }
  return {
    ok: true,
    state: state as ProspectState,
    stage: target,
    note: `Marked ${prospectStateLabel(state as ProspectState)} by the office.`,
  };
}

/* ----------------------------- assignment -------------------------------- */

export type ProspectAssignmentIntake =
  | { ok: true; agent: string; note: string }
  | { ok: false; errors: Record<string, string> };

/**
 * The one reading of an assignment. The agent must be a recorded agent in the
 * office's roster — a name typed at the counter must not become an assignment to
 * nobody — and the note is bounded.
 */
export function readProspectAssignment(input: {
  agent: unknown;
  note: unknown;
  agents: readonly string[];
}): ProspectAssignmentIntake {
  const errors: Record<string, string> = {};
  const agent = text(input.agent, PROSPECT_NAME_MAX);
  if (agent.length === 0) {
    errors.agent = "Choose the agent who will handle this prospect.";
  } else if (!input.agents.includes(agent)) {
    errors.agent = "That is not one of the office's agents.";
  }
  const note = text(input.note, PROSPECT_ASSIGN_NOTE_MAX);
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, agent, note };
}

/* ------------------------------- blast ----------------------------------- */

export type ProspectBlastIntake =
  | {
      ok: true;
      subject: string;
      message: string;
      prospect_ids: string[];
      recipients: string[];
    }
  | { ok: false; errors: Record<string, string> };

/**
 * The one reading of an email blast. The recipients are prospects the office
 * selected; every one must exist and carry an address, so a blast can never be
 * recorded as sent to nobody or to a person the office does not hold.
 */
export function readProspectBlast(
  input: { subject: unknown; message: unknown; prospectIds: unknown },
  prospects: readonly Pick<Prospect, "id" | "email">[],
): ProspectBlastIntake {
  const errors: Record<string, string> = {};
  const subject = text(input.subject, PROSPECT_BLAST_SUBJECT_MAX);
  if (subject.length === 0) errors.subject = "Give the message a subject.";
  const message = text(input.message, PROSPECT_BLAST_MESSAGE_MAX);
  if (message.length === 0) errors.message = "Write the message.";

  const raw = Array.isArray(input.prospectIds) ? input.prospectIds : [];
  const ids = raw
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
  const uniqueIds = Array.from(new Set(ids));
  const byId = new Map(prospects.map((p) => [p.id, p]));
  const recipients: string[] = [];
  if (uniqueIds.length === 0) {
    errors.prospectIds = "Select at least one prospect to email.";
  } else {
    for (const id of uniqueIds) {
      const prospect = byId.get(id);
      if (!prospect) {
        errors.prospectIds = "One of the selected prospects no longer exists.";
        break;
      }
      if (!prospect.email.trim()) {
        errors.prospectIds = "One of the selected prospects has no email address recorded.";
        break;
      }
      recipients.push(prospect.email.trim());
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, subject, message, prospect_ids: uniqueIds, recipients };
}

/* ---------------------------- derived counts ----------------------------- */

export type ProspectCounts = { total: number; new: number; contacted: number; converted: number };

/** The KPI figures the list leads with, read off the one record. */
export function prospectCounts(prospects: readonly Pick<Prospect, "stage">[]): ProspectCounts {
  const base: ProspectCounts = { total: prospects.length, new: 0, contacted: 0, converted: 0 };
  for (const prospect of prospects) {
    base[prospectStateOf(prospect.stage)] += 1;
  }
  return base;
}
