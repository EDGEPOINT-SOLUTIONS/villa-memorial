/**
 * The workflow vocabulary the Workflows screen (S31) reads and prints — pure,
 * client + server.
 *
 * WHAT IS AND IS NOT HERE: no workflow engine exists. There is no service that
 * lets the office define a process, its steps, its owners or its order, and no
 * contract names one — so this module holds the shape of the four processes the
 * SHIPPED MODULES already enforce, and the record builders that read each
 * module's own vocabulary. The definitions are recorded in
 * `lib/fixtures/operations/workflows.json`; the in-flight records are composed
 * live by `lib/api-client/workflows.ts`.
 *
 * The step vocabularies are never re-declared: the service-contract steps are
 * `case-events-v1`'s stage order (`lib/operations/case-board.ts`), the transfer
 * steps are the office's own four states (`lib/lot-lifecycle.ts`), and the
 * chapel steps read the online booking flow's hold/confirm states
 * (`lib/chapel-admin.ts`). `tests/fixture-contract/workflows.test.ts` fails on
 * any drift.
 */
import type { ChapelAdminBooking } from "@/lib/api-client/chapel-admin";
import type { Case } from "@/lib/api-client/operations";
import type { Lot } from "@/lib/api-client/property";
import type { PurchaseApplication } from "@/lib/contracts/purchase-application";
import type { LotTransfer } from "@/lib/lot-lifecycle";

export type WorkflowKey =
  | "service_contract"
  | "purchase_application"
  | "lot_transfer"
  | "chapel_booking";

export type WorkflowStep = {
  key: string;
  label: string;
};

export type WorkflowDefinition = {
  key: WorkflowKey;
  name: string;
  /** One line: what the process is for. */
  summary: string;
  /** Which module or contract owns the steps today. */
  source: string;
  steps: WorkflowStep[];
};

/* ------------------------------- the words ------------------------------- */

/** The missing engine, in one line — printed on the screen. */
export const WORKFLOW_ENGINE_NOT_WIRED =
  "No service lets the office define steps, assign owners or enforce order — the engine is a deferred platform layer.";

/** What the in-flight tables are. */
export const WORKFLOW_RECORDS_NOTE =
  "Every row is a recorded record at its current step; the module that owns it, not this screen, makes the moves.";

/** Why a workflow has no records to show. */
export const WORKFLOW_NOT_READABLE =
  "This process's records cannot be read in the current mode; the modules that own them answer with their own state.";

/* ----------------------------- record builders ---------------------------- */

/**
 * One recorded record's position in its process, before the workflow's own step
 * labels are attached. Exactly one place per workflow reads its module's
 * vocabulary, so a step word can never be typed twice.
 */
export type RecordPosition = {
  id: string;
  /** The record's reference — a case number, a lot number, a booking. */
  label: string;
  /** The person or subject beside the reference, when recorded. */
  sublabel: string | null;
  /** The workflow step key this record currently sits at. */
  step_key: string;
  /** The recorded owner of the NEXT step, or null when none is recorded. */
  owner: string | null;
  /** The record's own screen, when the reader holds its scope. */
  href: string | null;
};

/** A case sits at its stage; its next step is its first open task. */
export function positionOfCase(kase: Case, href: string | null): RecordPosition {
  return {
    id: kase.id,
    label: kase.case_number,
    sublabel: kase.deceased_name === "Pending intake" ? null : kase.deceased_name,
    step_key: kase.stage,
    owner: kase.assigned_coordinator || null,
    href,
  };
}

/**
 * The lot statuses that take a lot off the available list. `for_transfer` and
 * `occupied` are status-only states of the same family (lot-events-v1 decides
 * no workflow for them), so both read as "reserved" here.
 */
const RESERVED_LOT_STATUSES: ReadonlyArray<string> = ["reserved", "for_transfer", "occupied"];

/** The application's recorded position: captured, or as far as the lot's status shows. */
export function positionOfApplication(
  application: PurchaseApplication,
  lot: Lot,
  href: string | null,
): RecordPosition {
  const stepKey =
    lot.status === "sold"
      ? "sold"
      : RESERVED_LOT_STATUSES.includes(lot.status)
        ? "reserved"
        : "captured";
  const name = [application.first_name, application.last_name].filter(Boolean).join(" ");
  return {
    id: lot.id,
    label: `${lot.lot_number}${name ? ` · ${name}` : ""}`,
    sublabel: null,
    step_key: stepKey,
    owner: application.sales_agent_name || null,
    href,
  };
}

/** A transfer sits at its recorded office state. */
export function positionOfTransfer(
  transfer: LotTransfer,
  href: string | null,
): RecordPosition {
  return {
    id: transfer.id,
    label: `${transfer.lot_number} · ${transfer.from} → ${transfer.to}`,
    sublabel: null,
    step_key: transfer.state,
    owner: null,
    href,
  };
}

/** A chapel booking sits held-in-quote or confirmed (cancelled is not in flight). */
export function positionOfChapelBooking(
  booking: ChapelAdminBooking,
  owner: string | null,
  href: string | null,
): RecordPosition {
  return {
    id: booking.id,
    label: `${booking.resource_name} · ${booking.title}`,
    sublabel: booking.case_number,
    step_key: booking.status === "hold" ? "held" : "confirmed",
    owner,
    href,
  };
}

/* ------------------------------ step helpers ------------------------------ */

/**
 * The listed positions the workflow still has ahead of `stepKey`, in order —
 * the NEXT step's label is the first entry. A workflow whose steps are the
 * contract's stage order never re-letters them here.
 */
export function stepsAfter(workflow: WorkflowDefinition, stepKey: string): WorkflowStep[] {
  const index = workflow.steps.findIndex((step) => step.key === stepKey);
  return index < 0 ? [] : workflow.steps.slice(index + 1);
}

/** True when the position's step is one of the workflow's own steps. */
export function stepLabelOf(workflow: WorkflowDefinition, stepKey: string): string | null {
  return workflow.steps.find((step) => step.key === stepKey)?.label ?? null;
}

/** The owner column's text: the recorded person, or the missing state. */
export function ownerLabel(owner: string | null): string {
  return owner && owner.trim() !== "" ? owner : "Not recorded";
}

/** A record is owned when a named person is on the next step (never "Unassigned"). */
export function hasRecordedOwner(owner: string | null): boolean {
  return owner !== null && owner.trim() !== "" && owner !== "Unassigned";
}
