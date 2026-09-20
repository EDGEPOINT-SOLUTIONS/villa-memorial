import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageSection } from "@/components/ui/page";
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
 */

const stepBadge = (index: number, label: string) => (
  <Badge key={label} tone="neutral">
    {index + 1}. {label}
  </Badge>
);

/** One record's row: where it is, what is next, and who carries it. */
function RecordRow({ record }: { record: InFlightRecord }) {
  return (
    <tr>
      <th scope="row">
        <div className="table__name">
          {record.href ? <Link href={record.href}>{record.label}</Link> : record.label}
        </div>
        {record.sublabel ? <div className="table__sub">{record.sublabel}</div> : null}
      </th>
      <td>
        <Badge tone="info">{record.step_label}</Badge>
      </td>
      <td className="text-sm">{record.next_step_label ?? "—"}</td>
      <td className={record.owner ? "text-sm" : "text-sm text-muted"}>
        {ownerLabel(record.owner)}
      </td>
    </tr>
  );
}

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
        <Badge tone={records.length > 0 ? "info" : "neutral"}>
          {records.length} in flight
        </Badge>
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
      ) : records.length === 0 ? (
        <EmptyState
          title="Nothing recorded in flight"
          hint="No record is currently moving through this process."
        />
      ) : (
        <div className="table-wrapper" tabIndex={0}>
          <table className="table">
            <caption>Recorded records in flight — each row is a real record at its recorded step.</caption>
            <thead>
              <tr>
                <th scope="col">Record</th>
                <th scope="col">At step</th>
                <th scope="col">Next step</th>
                <th scope="col">Owner of the next step</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <RecordRow key={record.id} record={record} />
              ))}
            </tbody>
          </table>
        </div>
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
        actions={<Badge tone="warning">Engine not built</Badge>}
      />

      <PageSection>
        <p className="text-md">The office&rsquo;s four processes, and where each recorded job stands.</p>
        <div className="alert alert--warning">
          <div>
            <p>
              <strong>The workflow engine is not built.</strong>
            </p>
            <p>{WORKFLOW_ENGINE_NOT_WIRED}</p>
            <p className="mb-0">{WORKFLOW_RECORDS_NOTE}</p>
          </div>
        </div>
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
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Processes</span>
              <span className="kpi-card__value">{view.workflows.length}</span>
              <span className="kpi-card__sub">recorded definitions</span>
            </span>
          </span>
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">In flight</span>
              <span className="kpi-card__value">{view.inFlight}</span>
              <span className="kpi-card__sub">recorded records moving</span>
            </span>
          </span>
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Owners recorded</span>
              <span className="kpi-card__value">{view.withOwner}</span>
              <span className="kpi-card__sub">named people on the next step</span>
            </span>
          </span>
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Sources readable</span>
              <span className="kpi-card__value">
                {readable} of {view.workflows.length}
              </span>
              <span className="kpi-card__sub">modules that answered</span>
            </span>
          </span>
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
