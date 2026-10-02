import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState, ErrorState } from "@/components/ui/states";
import { DataTable, StatCard, StatusChip } from "@/components/kit";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listCases, type Case } from "@/lib/api-client/operations";
import { listPreparationRecords, type PreparationRecord } from "@/lib/api-client/preparation";
import {
  PREPARATION_STEP_LABEL,
  PREPARATION_STEP_ORDER,
  preparationStateLabel,
  preparationStateTone,
} from "@/lib/preparation-record";

export const metadata = { title: "Preparation — Admin Portal" };

/**
 * Staff Preparation (`/staff/preparation`) — the Park & services lane that gathers
 * every open case's embalming / preparation record on one screen (admin plan).
 *
 * The record itself is PROVISIONAL: no preparation contract is frozen, so this
 * reads the recorded fixture and says so; the per-case screen keeps its own view.
 * The office can see at a glance who is being prepared, by whom, and how many of
 * the four checklist steps are done — and open the full record on the case.
 */

export default async function PreparationPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Park & services" title="Preparation" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:read"]} />
        </PageSection>
      </>
    );
  }

  let records: PreparationRecord[];
  let cases: Case[];
  try {
    [records, cases] = await Promise.all([listPreparationRecords(), listCases()]);
  } catch {
    return (
      <>
        <PageHeader eyebrow="Park & services" title="Preparation" />
        <PageSection>
          <ErrorState message="Unable to load the preparation records." />
        </PageSection>
      </>
    );
  }

  const caseByNumber = new Map(cases.map((item) => [item.case_number, item]));
  const rows = records.map((record) => {
    const linked = caseByNumber.get(record.case_number);
    const done = record.steps.filter((step) => step.state === "completed").length;
    return {
      ...record,
      case_id: linked?.id ?? null,
      deceased_name: linked?.deceased_name ?? null,
      done,
    };
  });

  const active = rows.filter((row) => row.state === "in_progress").length;
  const scheduled = rows.filter((row) => row.state === "scheduled").length;
  const completed = rows.filter((row) => row.state === "completed").length;

  return (
    <>
      <PageHeader
        eyebrow="Park & services"
        title="Preparation"
        lead="Every case in the embalming and preparation lane, and its recorded steps."
        actions={<StatusChip tone="warning">Recorded fixture — no preparation contract</StatusChip>}
      />

      <div className="kpi-grid">
        <StatCard label="On file" value={rows.length} sub="recorded preparation records" />
        <StatCard label="In progress" value={active} sub="work underway" />
        <StatCard label="Scheduled" value={scheduled} sub="room booked" />
        <StatCard label="Completed" value={completed} sub="all four steps confirmed" />
      </div>

      <PageSection>
        <DataTable
          columns={[
            { key: "case", header: "Case" },
            { key: "state", header: "State" },
            { key: "embalmer", header: "Embalmer", className: "text-sm" },
            { key: "scheduled", header: "Scheduled", className: "text-sm" },
            { key: "steps", header: "Steps done" },
            { key: "open", header: "" },
          ]}
          rows={rows}
          rowKey={(row) => row.case_number}
          emptyTitle="No preparation records on file"
          emptyHint="Recorded preparation work appears here as the office files it."
          renderCell={(row, column) => {
            switch (column.key) {
              case "case":
                return (
                  <>
                    <div className="table__name">{row.deceased_name ?? row.case_number}</div>
                    <div className="table__sub">
                      <code>{row.case_number}</code>
                    </div>
                  </>
                );
              case "state":
                return (
                  <StatusChip tone={preparationStateTone(row.state)}>
                    {preparationStateLabel(row.state)}
                  </StatusChip>
                );
              case "embalmer":
                return row.embalmer + (row.assistant ? ` · ${row.assistant}` : "");
              case "scheduled":
                return row.scheduled_for
                  ? new Date(row.scheduled_for).toLocaleDateString()
                  : "Not recorded";
              case "steps":
                return (
                  <span className="text-sm">
                    {row.done}/{PREPARATION_STEP_ORDER.length} ·{" "}
                    {PREPARATION_STEP_ORDER.map((key) => PREPARATION_STEP_LABEL[key]).join(" · ")}
                  </span>
                );
              case "open":
                return row.case_id ? (
                  <Link
                    className="btn btn--secondary btn--sm"
                    href={`/staff/cases/${row.case_id}/preparation`}
                  >
                    Open
                  </Link>
                ) : null;
              default:
                return null;
            }
          }}
          caption={
            <>
              PROVISIONAL — the recorded demonstration records; no preparation contract is
              frozen, so live mode answers 503 rather than inventing an endpoint.
            </>
          }
        />
      </PageSection>
    </>
  );
}
