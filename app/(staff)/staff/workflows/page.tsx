import Link from "next/link";
import {
  DataTable,
  EmptyState,
  StatCard,
  StatusChip,
  type DataTableColumn,
} from "@/components/kit";
import { PageHeader, PageSection } from "@/components/ui/page";
import { Alert } from "@/components/ui/alert";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { loadWorkflowsView, type InFlightRecord } from "@/lib/api-client/workflows";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import {
  WORKFLOW_ENGINE_NOT_WIRED,
  WORKFLOW_NOT_READABLE,
  WORKFLOW_RECORDS_NOTE,
  ownerLabel,
  type WorkflowDefinition,
} from "@/lib/workflows";

export const metadata = { title: "Workflows — Admin Portal" };

/**
 * Workflows (S31) — the four processes this office runs, with the recorded
 * records moving through them.
 *
 * WHY THERE ARE NO + NEW BUTTONS: no workflow/config engine exists, so no
 * service can define a step, assign an owner or enforce an order. The processes
 * shown are the ones the shipped modules already enforce — the case stages of
 * `case-events-v1`, the office's own transfer states, the purchase-application
 * capture and the chapel booking flow — and the in-flight rows are read live
 * from those modules (`lib/api-client/workflows.ts`), so the screen is work,
 * not a diagram. The engine's missing half is named in one line above them.
 *
 * Layout renders through the component kit (`components/kit`) — the in-flight
 * tables are `DataTable`, the tiles `StatCard`, the step words `StatusChip`.
 */

const RECORD_COLUMNS: ReadonlyArray<DataTableColumn<InFlightRecord>> = [
  { key: "record", header: "Record" },
  { key: "step", header: "At step" },
  { key: "next", header: "Next step", className: "text-sm" },
  {
    key: "owner",
    header: "Owner of the next step",
    cellClassName: (record) => (record.owner ? "text-sm" : "text-sm text-muted"),
  },
];

const stepBadge = (index: number, label: string) => (
  <StatusChip key={label} tone="neutral">
    {index + 1}. {label}
  </StatusChip>
);

/** One process: its steps, its source, and the records inside it. */
function WorkflowSection({
  workflow,
  state,
  records,
}: {
  workflow: WorkflowDefinition;
  state: "read" | "unavailable";
  records: InFlightRecord[];
}) {
  return (
    <PageSection>
      <div className="row row--space">
        <h2 className="page-section-title">{workflow.name}</h2>
        <StatusChip tone={records.length > 0 ? "info" : "neutral"}>
          {records.length} in flight
        </StatusChip>
      </div>
      <p className="row row--wrap">
        <span className="text-sm text-muted">Steps:</span>
        {workflow.steps.map((step, index) => stepBadge(index, step.label))}
      </p>
      <p className="text-sm text-muted">
        {workflow.summary} Defined by {workflow.source}.
      </p>

      {state === "unavailable" ? (
        <EmptyState title="This process cannot be read right now" hint={WORKFLOW_NOT_READABLE} />
      ) : (
        <DataTable<InFlightRecord>
          columns={RECORD_COLUMNS}
          rows={records}
          rowKey={(record) => record.id}
          rowHeader
          renderCell={(record, column) => {
            switch (column.key) {
              case "record":
                return (
                  <>
                    <div className="table__name">
                      {record.href ? <Link href={record.href}>{record.label}</Link> : record.label}
                    </div>
                    {record.sublabel ? <div className="table__sub">{record.sublabel}</div> : null}
                  </>
                );
              case "step":
                return <StatusChip tone="info">{record.step_label}</StatusChip>;
              case "next":
                return record.next_step_label ?? "—";
              case "owner":
                return ownerLabel(record.owner);
              default:
                return null;
            }
          }}
          caption={
            <>Recorded records in flight — each row is a real record at its recorded step.</>
          }
          emptyTitle="Nothing recorded in flight"
          emptyHint="No record is currently moving through this process."
        />
      )}
    </PageSection>
  );
}

export default async function WorkflowsPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["tenancy:tenants:manage"])) {
    return (
      <>
        <PageHeader eyebrow="Administration" title="Workflows" />
        <PageSection>
          <ForbiddenState requiredScopes={["tenancy:tenants:manage"]} />
        </PageSection>
      </>
    );
  }

  let view;
  try {
    view = await loadWorkflowsView(session.scopes);
  } catch {
    return (
      <>
        <PageHeader eyebrow="Administration" title="Workflows" />
        <PageSection>
          <ErrorState message="Unable to load the recorded workflows." />
        </PageSection>
      </>
    );
  }

  const canOpenCases = hasAnyScope(session.scopes, ["cases:read"]);
  const readable = view.workflows.filter((entry) => entry.state === "read").length;

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Workflows"
        lead="The office's four processes, and where each recorded job stands."
        actions={<StatusChip tone="warning">Engine not built</StatusChip>}
      />

      <PageSection>
        <Alert tone="warning">
          <p>
            <strong>The workflow engine is not built.</strong>
          </p>
          <p>{WORKFLOW_ENGINE_NOT_WIRED}</p>
          <p className="mb-0">{WORKFLOW_RECORDS_NOTE}</p>
        </Alert>
        <p className="mt-4 mb-0">
          <Link
            className="btn btn--secondary btn--sm"
            href={canOpenCases ? "/staff/cases" : "/staff/dashboard"}
          >
            {canOpenCases ? "Open the case board" : "Go to the dashboard"}
          </Link>
        </p>
      </PageSection>

      <PageSection>
        <div className="kpi-grid">
          <StatCard
            label="Processes"
            value={view.workflows.length}
            sub="recorded definitions"
          />
          <StatCard label="In flight" value={view.inFlight} sub="recorded records moving" />
          <StatCard
            label="Owners recorded"
            value={view.withOwner}
            sub="named people on the next step"
          />
          <StatCard
            label="Sources readable"
            value={`${readable} of ${view.workflows.length}`}
            sub="modules that answered"
          />
        </div>
      </PageSection>

      {view.workflows.map((entry) => (
        <WorkflowSection
          key={entry.workflow.key}
          workflow={entry.workflow}
          state={entry.state}
          records={entry.records}
        />
      ))}
    </>
  );
}
