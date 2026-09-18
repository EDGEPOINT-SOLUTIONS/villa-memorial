/**
 * Pure lot-lifecycle view logic — the parts of the four lot-record screens
 * (Ownership · Transfers · Interments · Exhumations, captain checklist F-11,
 * 2026-09-18) that must be testable without a browser or a service.
 *
 * WHAT THE FROZEN CONTRACT SAYS (docs/08-delivery/contracts/lot-events-v1.md,
 * KEB-D3-01): the lot status model carries `occupied` and `for_transfer`, but
 * they are STATUS-ONLY — "Interment and transfer workflows ... do not [exist]" —
 * and the Lot resource has no ownership projection at all: no co-owners, no
 * authorised family, no right of interment, no papers. Every screen in this
 * module therefore names that gap once and shows the OFFICE'S OWN RECORDED FILE
 * (`lib/fixtures/property/lot-lifecycle.json`, app-authored example data with
 * provenance): what staff wrote down, not a service's answer.
 *
 * The record vocabulary is the office's own, fixed here so the fixture, the
 * pages and the tests cannot drift:
 *   · a transfer walks submitted → verified → approved → completed;
 *   · a step is `done` (with the day the office wrote it down, when one was
 *     recorded), `waiting`, or — where the office recorded a problem no later
 *     step can pass — `attention`.
 * Nothing here derives a date, a name or an amount: a datum the record does not
 * carry is printed by the page as a missing state, never guessed.
 */
import type { Lot } from "@/lib/api-client/property";
import { TERMS_REVISIONS, resolveTerms } from "@/lib/contracts/villa-terms";

export type OfficeStepState = "done" | "waiting" | "attention";

/**
 * One line of an office process. `on` is the calendar day the office wrote the
 * step down (yyyy-mm-dd) — only when a record carries one.
 */
export type OfficeStep = {
  key: string;
  label: string;
  state: OfficeStepState;
  on?: string;
  note?: string;
};

/* ------------------------------- transfers ------------------------------- */

/** The words a clerk uses, in the order a request moves through them. */
export const TRANSFER_STATES = ["submitted", "verified", "approved", "completed"] as const;
export type TransferState = (typeof TRANSFER_STATES)[number];

export const TRANSFER_STATE_LABEL: Record<TransferState, string> = {
  submitted: "Submitted",
  verified: "Verified",
  approved: "Approved",
  completed: "Completed",
};

export type LotTransfer = {
  id: string;
  lot_id: string;
  lot_number: string;
  /** The present owner, as the lot record names them. */
  from: string;
  to: string;
  /** How the new owner is related / where they are named, when recorded. */
  to_note?: string;
  asked_on: string;
  state: TransferState;
  steps: OfficeStep[];
  /** What verification still needs, in the office's words. */
  still_needed: string[];
  /** The fee / requirement notes the office applies to a transfer. */
  requirements: string[];
};

/* ------------------------------- interments ------------------------------ */

export type IntermentState = "interred" | "preparing";

export const INTERMENT_STATE_LABEL: Record<IntermentState, string> = {
  interred: "Ground opened",
  preparing: "Not opened",
};

export type LotIntermentPaper = { document_number: string; role: string };

export type LotInterment = {
  id: string;
  lot_id: string;
  lot_number: string;
  deceased_name: string;
  /** The service the interment belongs to: the case and its recorded services. */
  case_id: string;
  case_number: string;
  state: IntermentState;
  /** Calendar day the ground was opened — absent while the interment prepares. */
  interred_on?: string;
  /** The checks the office runs before the ground is opened. */
  checks: OfficeStep[];
  papers: LotIntermentPaper[];
};

/** The three checks the brief names, plus the permit line the ground needs. */
export const INTERMENT_CHECK_KEYS = ["identity", "ownership", "payment", "permits"] as const;

/* ------------------------------ exhumations ------------------------------ */

export type ExhumationState = "open" | "completed";

export const EXHUMATION_STATE_LABEL: Record<ExhumationState, string> = {
  open: "Requirements open",
  completed: "Work recorded",
};

export type LotExhumation = {
  id: string;
  lot_id: string;
  lot_number: string;
  /** The interment record this request would disturb. */
  interment_id: string;
  deceased_name: string;
  /** Who asked, and when the office wrote it down. */
  asked_by: string;
  asked_on: string;
  reason: string;
  /** Where the remains are to go. */
  destination: string;
  state: ExhumationState;
  steps: OfficeStep[];
  /** What has actually been done to the grave, as the record stands. */
  record: string;
};

/* -------------------------------- papers --------------------------------- */

/** A paper the office's file links to a lot, resolved against the repository. */
export type LotLifecyclePaper = {
  lot_id: string;
  document_number: string;
  /** What the paper backs, in the office's words. */
  backs: string;
};

export type ResolvedPaper = LotLifecyclePaper & {
  title: string | null;
  status: string | null;
  /** Calendar day of the repository row's upload, when one was read. */
  uploaded_on: string | null;
  document_id: string | null;
};

/* ------------------------------ small helpers ---------------------------- */

export function isTransferState(value: unknown): value is TransferState {
  return typeof value === "string" && (TRANSFER_STATES as readonly string[]).includes(value);
}

/** The badge tone for a step's state (design-system tones only). */
export function officeStepTone(state: OfficeStepState): "success" | "warning" | "danger" {
  if (state === "done") return "success";
  if (state === "attention") return "danger";
  return "warning";
}

export function officeStepLabel(state: OfficeStepState): string {
  if (state === "done") return "Done";
  if (state === "attention") return "Needs attention";
  return "Waiting";
}

/** Steps the office still has to record (waiting or needing attention). */
export function outstandingSteps(steps: ReadonlyArray<OfficeStep>): OfficeStep[] {
  return steps.filter((step) => step.state !== "done");
}

export function attentionSteps(steps: ReadonlyArray<OfficeStep>): OfficeStep[] {
  return steps.filter((step) => step.state === "attention");
}

export function stepProgress(steps: ReadonlyArray<OfficeStep>): {
  done: number;
  total: number;
} {
  return { done: steps.filter((step) => step.state === "done").length, total: steps.length };
}

/** The first step not yet done — the request's next move. */
export function nextStep(steps: ReadonlyArray<OfficeStep>): OfficeStep | undefined {
  return steps.find((step) => step.state !== "done");
}

/**
 * A recorded day printed deterministically: calendar dates format in UTC (so
 * the printed day is the day written on the paper, in every timezone), and an
 * instant is reduced to its own calendar day first.
 */
export function formatRecordDay(day?: string | null): string {
  if (!day) return "No date recorded";
  const calendar = day.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(calendar)) return day;
  const [y, m, d] = calendar.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-PH", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* --------------------------- right of interment -------------------------- */

const INTERMENT_RULE = /no interment shall be made/i;

/**
 * The client's own clause on interment, read from the lot-purchase revision that
 * governs a lot acquired on `acquiredOn` (never a paraphrase, never a clause from
 * the other revision). A lot with no recorded acquisition uses the current
 * revision; a date outside the revision table falls back to the current one
 * rather than crashing a screen over a demo record.
 */
export function intermentClauseFor(acquiredOn?: string | null): {
  /** The operative rule sentence, quoted from the clause. */
  rule: string;
  /** The clause as the paper prints it (offer only the rule to a glance card). */
  clause: string;
  revision: string;
} {
  const revisions = TERMS_REVISIONS.filter((revision) => revision.kind === "lot_purchase");
  let terms = revisions[revisions.length - 1];
  if (acquiredOn && /^\d{4}-\d{2}-\d{2}/.test(acquiredOn)) {
    try {
      terms = resolveTerms("lot_purchase", acquiredOn);
    } catch {
      // A date the revision table does not cover: the current revision still
      // carries the clause (it is common to both), so the screen keeps working.
    }
  }
  const clause = terms.clauses.find((entry) => INTERMENT_RULE.test(entry)) ?? "";
  const firstSentence = clause.match(/^[^.]*\./)?.[0]?.trim();
  return {
    rule: firstSentence || clause,
    clause,
    revision: terms.version,
  };
}

/* ------------------------- one-line entry summaries ----------------------- */

/** The transfer row on the lot record: state + who it moves between. */
export function transferSummary(transfers: ReadonlyArray<LotTransfer>): {
  lead: string;
  detail: string;
} {
  if (transfers.length === 0) {
    return { lead: "No request recorded", detail: "No one has asked to change hands." };
  }
  const current = transfers[0];
  return {
    lead: `${transfers.length} request${transfers.length === 1 ? "" : "s"}`,
    detail: `${TRANSFER_STATE_LABEL[current.state]} · ${current.from} → ${current.to}`,
  };
}

export function intermentSummary(interments: ReadonlyArray<LotInterment>): {
  lead: string;
  detail: string;
} {
  if (interments.length === 0) {
    return { lead: "No interment recorded", detail: "The ground has not been opened here." };
  }
  const opened = interments.filter((record) => record.state === "interred");
  const preparing = interments.length - opened.length;
  const detailParts: string[] = [];
  if (opened.length > 0) {
    detailParts.push(`Last opened ${formatRecordDay(opened[opened.length - 1].interred_on)}`);
  }
  if (preparing > 0) {
    detailParts.push(`${preparing} not opened — checks pending`);
  }
  return {
    lead: `${interments.length} record${interments.length === 1 ? "" : "s"}`,
    detail: detailParts.join(" · "),
  };
}

export function exhumationSummary(exhumations: ReadonlyArray<LotExhumation>): {
  lead: string;
  detail: string;
} {
  if (exhumations.length === 0) {
    return { lead: "No request recorded", detail: "No one has asked to move a remains." };
  }
  const current = exhumations[0];
  const progress = stepProgress(current.steps);
  return {
    lead: `${exhumations.length} request${exhumations.length === 1 ? "" : "s"}`,
    detail: `${EXHUMATION_STATE_LABEL[current.state]} · ${progress.done} of ${progress.total} steps recorded`,
  };
}

/**
 * The ownership row on the lot record: the name the papers stand in and the
 * day the lot was acquired, from the lot record alone (the projection gap the
 * ownership screen names means nothing richer exists upstream).
 */
export function ownershipSummary(lot: Lot): { lead: string; detail: string } {
  if (!lot.owner_name) {
    return {
      lead: "No owner recorded",
      detail:
        lot.status === "available"
          ? "The lot stands available — reserve it first."
          : `The lot reads ${lot.status.replace(/_/g, " ")} with no owner named.`,
    };
  }
  const detail =
    lot.status === "sold" && lot.sold_at
      ? `Sold · ${formatRecordDay(lot.sold_at)}`
      : lot.status === "reserved" && lot.reserved_at
        ? `Reserved · ${formatRecordDay(lot.reserved_at)}`
        : `Recorded as ${lot.status.replace(/_/g, " ")}`;
  return { lead: lot.owner_name, detail };
}
