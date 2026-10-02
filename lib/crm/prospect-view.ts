/**
 * The office's PROSPECT lifecycle, in pure functions — one vocabulary for the
 * staff Prospects screen and the agent pipeline it reads.
 *
 * WHY THIS MODULE EXISTS. The captain (2026-10-02) asked for a dedicated
 * Prospects page: every enquiry becomes a prospect, the office works it
 * (call · email · assign), and the state moves New → Contacted → Converted.
 * The agent portal already owns a seven-rung acquisition
 * (`lib/agent/agent-view.ts`, commerce-catalog §33). The office's three words are
 * a COARSE view of that one line, not a second pipeline: a state is DERIVED from
 * the stage the prospect actually stands at, so the office and the agent can
 * never disagree about where a person is.
 *
 * ONE STORE. Nothing here persists. The state move is an ordinary forward stage
 * move (`lib/crm/prospect-lifecycle.ts` maps word → stage) recorded in the same
 * journal (`lib/api-client/agent-store.ts`) the agent portal folds, which is what
 * makes the office's change appear in the agent's pipeline for free.
 *
 * The source and interest words are the agent record's own (`leadSourceLabel`,
 * `interestLabel`) — never a second copy.
 */
import type { Prospect } from "@/lib/api-client/agent";
import { leadSourceLabel, stageIndex } from "@/lib/agent/agent-view";

/* ------------------------------- the words ------------------------------- */

export const PROSPECT_STATES = ["new", "contacted", "converted"] as const;
export type ProspectState = (typeof PROSPECT_STATES)[number];

const STATE_LABELS: Record<ProspectState, string> = {
  new: "New",
  contacted: "Contacted",
  converted: "Converted",
};

/** The office's word for a lifecycle state. */
export function prospectStateLabel(state: ProspectState): string {
  return STATE_LABELS[state];
}

/** A closed tone vocabulary, so a state never carries meaning by colour alone. */
const STATE_TONES: Record<ProspectState, "info" | "warning" | "success"> = {
  new: "info",
  contacted: "warning",
  converted: "success",
};

export function prospectStateTone(state: ProspectState): "info" | "warning" | "success" {
  return STATE_TONES[state];
}

/**
 * The stage a state records. `Converted` is the sale — the same point the agent
 * pipeline converts at (`lib/agent/acquisition.ts`, conversion at `sold`), so a
 * converted prospect becomes a client in the agent's book, exactly as if the
 * agent had moved it there.
 */
const STATE_STAGES: Record<ProspectState, string> = {
  new: "new",
  contacted: "contacted",
  converted: "sold",
};

export function prospectStateStage(state: ProspectState): string {
  return STATE_STAGES[state];
}

/**
 * The office's lifecycle word for a pipeline stage. New is the first rung; Sold
 * is Converted; every rung between (Contacted … Reserved) is Contacted — the
 * office's work is under way. An empty stage is New.
 */
export function prospectStateOf(stage: string): ProspectState {
  if (stage === "sold") return "converted";
  const index = stageIndex(stage);
  if (index <= 0) return "new";
  return "contacted";
}

/** The state after this one, or null at the end of the office's line. */
export function nextProspectState(state: ProspectState): ProspectState | null {
  const index = PROSPECT_STATES.indexOf(state);
  if (index === -1 || index === PROSPECT_STATES.length - 1) return null;
  return PROSPECT_STATES[index + 1];
}

/** The state a prospect currently stands at — the one reading every surface uses. */
export function prospectState(prospect: Pick<Prospect, "stage">): ProspectState {
  return prospectStateOf(prospect.stage);
}

/* ------------------------------ contact links ---------------------------- */

/** `tel:` target — the digits and a leading plus, nothing else. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}

/** `mailto:` target for one prospect; empty when no address is recorded. */
export function mailtoHref(email: string, subject?: string, body?: string): string {
  const address = email.trim();
  if (!address) return "";
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const query = params.toString();
  return `mailto:${address}${query ? `?${query}` : ""}`;
}

/** `mailto:` with every address BCC'd — the one-message email blast. */
export function mailtoBlastHref(
  emails: string[],
  subject: string,
  body: string,
): string {
  const addresses = Array.from(new Set(emails.map((e) => e.trim()).filter(Boolean)));
  if (addresses.length === 0) return "";
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const query = params.toString();
  return `mailto:?bcc=${addresses.join(",")}${query ? `&${query}` : ""}`;
}

/* ------------------------------- the reading ----------------------------- */

/** The person's contact line, source and interest — one reading for the list. */
export function prospectSourceLabel(source: string): string {
  return leadSourceLabel(source);
}

/**
 * The one honest line the screen stands on: the demo records the office's work
 * but no CRM service carries it, and no mail service sends the blast.
 */
export const PROSPECT_SERVICE_NOTE =
  "Prospects live on the office's demo journal — the customer-records service is unbuilt, so nothing here writes to a CRM. An email blast is recorded and handed to your own mail app; the platform's notification service (P4) is not connected.";
