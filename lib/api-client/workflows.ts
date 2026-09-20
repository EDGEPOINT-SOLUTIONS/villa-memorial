/**
 * Typed data access for the Workflows screen (S31) — the recorded process
 * definitions plus the records currently moving through them.
 *
 * The process definitions are APP-AUTHORED records with provenance
 * (`lib/fixtures/operations/workflows.json`): no workflow engine or contract
 * exists, and the file records the four processes the shipped modules already
 * enforce. The in-flight rows are read LIVE from those modules on every
 * request — cases (`funeral-cases` / the operations store), lot transfers
 * (the office's recorded lot file), chapel bookings (scheduling + the chapel
 * store), purchase applications (plus the lot statuses) — so the screen shows
 * real work, never a diagram.
 *
 * Each process reads independently and honestly: a module that cannot answer
 * marks its workflow "unavailable" with one line; it never blanks the other
 * three. Nothing here invents a step, an owner or a move.
 */
import workflowsFile from "@/lib/fixtures/operations/workflows.json";
import { ApiError } from "@/lib/api-client/api-error";
import { getChapelAdminView } from "@/lib/api-client/chapel-admin";
import { listCases, type Case } from "@/lib/api-client/operations";
import { getPurchaseApplicationForLot } from "@/lib/api-client/purchase-applications";
import { listLots, propertyLiveModeEnabled } from "@/lib/api-client/property";
import { listLotTransfers } from "@/lib/api-client/lot-lifecycle";
import { parkDayOf } from "@/lib/operations/ops-board";
import { hasAnyScope } from "@/lib/rbac/nav";
import {
  WORKFLOW_NOT_READABLE,
  hasRecordedOwner,
  positionOfApplication,
  positionOfCase,
  positionOfChapelBooking,
  positionOfTransfer,
  stepLabelOf,
  stepsAfter,
  type RecordPosition,
  type WorkflowDefinition,
  type WorkflowKey,
} from "@/lib/workflows";

export const WORKFLOW_KEYS: ReadonlyArray<WorkflowKey> = [
  "service_contract",
  "purchase_application",
  "lot_transfer",
  "chapel_booking",
];

export type InFlightRecord = {
  id: string;
  label: string;
  sublabel: string | null;
  step_key: string;
  step_label: string;
  next_step_label: string | null;
  owner: string | null;
  href: string | null;
};

export type WorkflowInFlight = {
  workflow: WorkflowDefinition;
  state: "read" | "unavailable";
  records: InFlightRecord[];
};

export type WorkflowsView = {
  workflows: WorkflowInFlight[];
  inFlight: number;
  withOwner: number;
};

/* -------------------------------- reader --------------------------------- */

function malformed(what: string): never {
  throw new ApiError(`malformed workflows fixture: ${what}`, 500);
}

function record(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null) malformed(what);
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim().length === 0) malformed(what);
  return value;
}

/** Field-by-field reader; extra fields are ignored, missing ones fail loudly. */
export function readWorkflowDefinitions(raw: unknown): WorkflowDefinition[] {
  const root = record(raw, "workflows file");
  if (!Array.isArray(root.workflows)) malformed("workflows");

  return root.workflows.map((value, index) => {
    const row = record(value, `workflows[${index}]`);
    const key = requiredString(row.key, `workflows[${index}].key`);
    if (!(WORKFLOW_KEYS as readonly string[]).includes(key)) {
      malformed(`workflows[${index}].key (unknown workflow "${key}")`);
    }
    if (!Array.isArray(row.steps) || row.steps.length === 0) {
      malformed(`${key}.steps`);
    }
    const steps = row.steps.map((entry, stepIndex) => {
      const step = record(entry, `${key}.steps[${stepIndex}]`);
      return {
        key: requiredString(step.key, `${key}.steps[${stepIndex}].key`),
        label: requiredString(step.label, `${key}.steps[${stepIndex}].label`),
      };
    });
    return {
      key: key as WorkflowKey,
      name: requiredString(row.name, `${key}.name`),
      summary: requiredString(row.summary, `${key}.summary`),
      source: requiredString(row.source, `${key}.source`),
      steps,
    };
  });
}

/** Attach the workflow's own step words to a recorded position. */
function toRecord(workflow: WorkflowDefinition, position: RecordPosition): InFlightRecord {
  return {
    ...position,
    step_label: stepLabelOf(workflow, position.step_key) ?? position.step_key,
    next_step_label: stepsAfter(workflow, position.step_key)[0]?.label ?? null,
  };
}

/* ----------------------------- the sources ------------------------------- */

async function serviceContractRecords(
  workflow: WorkflowDefinition,
  scopes: string[],
): Promise<InFlightRecord[]> {
  const cases = await listCases();
  const canOpenCases = hasAnyScope(scopes, ["cases:read"]);
  return cases
    .map((kase: Case) => positionOfCase(kase, canOpenCases ? `/staff/cases/${kase.id}` : null))
    .map((position) => toRecord(workflow, position))
    .sort((a, b) => a.label.localeCompare(b.label));
}

async function purchaseApplicationRecords(
  workflow: WorkflowDefinition,
  scopes: string[],
): Promise<InFlightRecord[]> {
  const lots = await listLots();
  const canOpenProperty = hasAnyScope(scopes, ["property:read"]);
  const records: InFlightRecord[] = [];
  for (const lot of lots) {
    const application = await getPurchaseApplicationForLot(lot.id);
    if (!application) continue;
    records.push(
      toRecord(
        workflow,
        positionOfApplication(
          application,
          lot,
          canOpenProperty ? `/staff/property/${lot.id}` : null,
        ),
      ),
    );
  }
  return records;
}

async function lotTransferRecords(
  workflow: WorkflowDefinition,
  scopes: string[],
): Promise<InFlightRecord[]> {
  const lots = await listLots();
  const canOpenProperty = hasAnyScope(scopes, ["property:read"]);
  const records: InFlightRecord[] = [];
  for (const lot of lots) {
    const transfers = await listLotTransfers(lot.id);
    for (const transfer of transfers) {
      records.push(
        toRecord(
          workflow,
          positionOfTransfer(
            transfer,
            canOpenProperty ? `/staff/property/${lot.id}/transfers` : null,
          ),
        ),
      );
    }
  }
  return records.sort((a, b) => a.label.localeCompare(b.label));
}

async function chapelBookingRecords(
  workflow: WorkflowDefinition,
  scopes: string[],
): Promise<InFlightRecord[]> {
  const [view, cases] = await Promise.all([
    getChapelAdminView(),
    hasAnyScope(scopes, ["cases:read"]) ? listCases() : Promise.resolve([]),
  ]);
  const coordinatorByCase = new Map(
    cases.map((kase) => [kase.case_number, kase.assigned_coordinator || null]),
  );
  const canOpenSchedule = hasAnyScope(scopes, ["scheduling:read"]);
  return view.bookings
    .filter((booking) => booking.status !== "cancelled")
    .map((booking) => {
      const day = parkDayOf(booking.starts_at);
      return toRecord(
        workflow,
        positionOfChapelBooking(
          booking,
          (booking.case_number && coordinatorByCase.get(booking.case_number)) || null,
          canOpenSchedule && day ? `/staff/schedule?date=${day}` : canOpenSchedule ? "/staff/schedule" : null,
        ),
      );
    });
}

/* ------------------------------ the composition --------------------------- */

/**
 * Every recorded process with its in-flight records. Each source is read
 * independently: a module that refuses (e.g. property live mode has no
 * purchase-application endpoint) marks only its own workflow unavailable.
 */
export async function loadWorkflowsView(scopes: string[]): Promise<WorkflowsView> {
  const definitions = readWorkflowDefinitions(workflowsFile);

  const sources: Record<
    WorkflowKey,
    (workflow: WorkflowDefinition, scopes: string[]) => Promise<InFlightRecord[]>
  > = {
    service_contract: serviceContractRecords,
    purchase_application: purchaseApplicationRecords,
    lot_transfer: lotTransferRecords,
    chapel_booking: chapelBookingRecords,
  };

  const workflows: WorkflowInFlight[] = [];
  for (const workflow of definitions) {
    if (workflow.key === "purchase_application" && propertyLiveModeEnabled()) {
      // The property service has no application endpoint in live mode; the
      // reader would refuse per call. Say it once, for that workflow only.
      workflows.push({ workflow, state: "unavailable", records: [] });
      continue;
    }
    try {
      const records = await sources[workflow.key](workflow, scopes);
      workflows.push({ workflow, state: "read", records });
    } catch {
      workflows.push({ workflow, state: "unavailable", records: [] });
    }
  }

  const all = workflows.flatMap((entry) => entry.records);
  return {
    workflows,
    inFlight: all.length,
    withOwner: all.filter((record) => hasRecordedOwner(record.owner)).length,
  };
}

export { WORKFLOW_NOT_READABLE };
