import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { getCase } from "@/lib/api-client/operations";
import {
  STAGE_LABEL,
  STAGE_TONE,
  TASK_STATUS_LABEL,
  TASK_STATUS_TONE,
  type CaseStage,
} from "@/lib/operations/case-board";
import {
  getPreparationRecord,
  type PreparationRecord,
} from "@/lib/api-client/preparation";
import { ApiError } from "@/lib/api-client/api-error";
import {
  calendarDateLabel,
  orderedPreparationSteps,
  PREPARATION_STEP_LABEL,
  preparationMomentLabel,
  preparationStateLabel,
  preparationStateTone,
  preparationWorkLabel,
} from "@/lib/preparation-record";

/**
 * The embalming / preparation record for one case.
 *
 * WHAT THIS SCREEN IS: the record a family's question about the preparation would be
 * answered from — who prepared the deceased, when, and where each of the office's four
 * checklist steps stands — reached from the case it belongs to. It reads the recorded
 * record (`lib/api-client/preparation.ts`, PROVISIONAL until a contract freezes) and the
 * case itself; it invents no identity, date or location, and marks nothing done that the
 * record does not confirm.
 *
 * WHAT IT IS NOT: a form. No service carries preparation writes yet, so the screen is
 * read-only and says so. Where the record does not exist, the case's own task lines —
 * what the office actually records today — are shown instead.
 */
export const metadata = { title: "Embalming & preparation — Staff Portal" };

function SummaryCard({
  item,
  deceasedName,
  children,
  recordBadge,
}: {
  item: { id: string; case_number: string; stage: CaseStage };
  deceasedName: string;
  children: React.ReactNode;
  recordBadge: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="card__body case-summary">
        <div>
          <p className="page-header__eyebrow">
            {item.case_number} · {STAGE_LABEL[item.stage] ?? item.stage} stage
          </p>
          <h2 className="case-summary__name">{deceasedName}</h2>
          {children}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "var(--space-2)",
          }}
        >
          {recordBadge}
          <Badge tone={STAGE_TONE[item.stage] ?? "neutral"}>
            {STAGE_LABEL[item.stage] ?? item.stage}
          </Badge>
        </div>
      </div>
      <div className="card__footer">
        <Link href={`/staff/cases/${item.id}`} className="btn btn--secondary btn--sm">
          Back to case
        </Link>
      </div>
    </div>
  );
}

export default async function CasePreparationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Preparation record" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:read"]} />
        </PageSection>
      </>
    );
  }

  const { id } = await params;

  let item;
  try {
    item = await getCase(id);
  } catch {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Preparation record" />
        <PageSection>
          <ErrorState message="We couldn't find that case record." />
        </PageSection>
      </>
    );
  }

  // The record is its own (provisional) read: a case without one is a normal answer,
  // and a live operations service without the endpoint is an honest unavailable state —
  // neither costs the case itself.
  let record: PreparationRecord | null = null;
  let recordUnavailable: string | null = null;
  try {
    record = await getPreparationRecord(item.case_number);
  } catch (error) {
    recordUnavailable =
      error instanceof ApiError && error.status === 503
        ? "The preparation record is not available from the live operations service — no preparation contract names the endpoint yet."
        : "The preparation record could not be read just now.";
  }

  const deceasedName =
    item.deceased_name === "Pending intake" ? "Awaiting intake" : item.deceased_name;

  return (
    <>
      <PageHeader
        eyebrow={`Operations · Case ${item.case_number}`}
        title="Embalming & preparation"
        actions={
          <Link href={`/staff/cases/${item.id}`} className="btn btn--secondary btn--sm">
            Back to case
          </Link>
        }
      />

      {record ? (
        <>
          <PageSection>
            <SummaryCard
              item={item}
              deceasedName={deceasedName}
              recordBadge={
                <Badge tone={preparationStateTone(record.state)}>
                  {preparationStateLabel(record.state)}
                </Badge>
              }
            >
              <p className="case-summary__meta">
                Embalmer · {record.embalmer}
                {record.assistant
                  ? ` · Assistant · ${record.assistant}`
                  : " · No assistant recorded"}
              </p>
              <p className="case-summary__meta">
                Work · {preparationWorkLabel(record)}
                {record.scheduled_for
                  ? ` · Scheduled · ${preparationMomentLabel(record.scheduled_for)}`
                  : " · No schedule recorded"}
              </p>
            </SummaryCard>
          </PageSection>

          <PageSection>
            <Card header={<h3>Preparation record</h3>}>
              <div className="table-wrapper" tabIndex={0}>
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Step</th>
                      <th scope="col">State</th>
                      <th scope="col">Recorded</th>
                      <th scope="col">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderedPreparationSteps(record.steps).map((step) => (
                      <tr key={step.key}>
                        <td>
                          <strong>{PREPARATION_STEP_LABEL[step.key]}</strong>
                        </td>
                        <td>
                          <Badge tone={preparationStateTone(step.state)}>
                            {preparationStateLabel(step.state)}
                          </Badge>
                        </td>
                        <td>{preparationMomentLabel(step.at) ?? "—"}</td>
                        <td>{step.note ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted mb-0" style={{ marginTop: "var(--space-4)" }}>
                Notes
              </p>
              <p className="mb-0">{record.notes ?? "No notes recorded on this record."}</p>
            </Card>
          </PageSection>
        </>
      ) : (
        <>
          <PageSection>
            <SummaryCard
              item={item}
              deceasedName={deceasedName}
              recordBadge={<Badge tone="neutral">No record</Badge>}
            >
              <p className="case-summary__meta">
                {recordUnavailable ?? "No preparation record is on file for this case."}
              </p>
            </SummaryCard>
          </PageSection>

          <PageSection>
            <Card header={<h3>What the case records today</h3>}>
              <p className="text-sm text-muted">
                No preparation write exists in the platform, so the case&rsquo;s task
                list is all there is — it says what is expected, not who did it or when.
              </p>
              {item.tasks.length === 0 ? (
                <p className="text-sm text-muted mb-0">
                  No tasks are recorded on this case.
                </p>
              ) : (
                <div className="table-wrapper" tabIndex={0}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">Task</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.tasks.map((task, index) => (
                        <tr key={index}>
                          <td>{task.title}</td>
                          <td>
                            <Badge tone={TASK_STATUS_TONE[task.status] ?? "neutral"}>
                              {TASK_STATUS_LABEL[task.status] ?? task.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </PageSection>
        </>
      )}

      <PageSection>
        <Card header={<h3>From the case record</h3>}>
          {item.intake ? (
            <dl className="kv">
              <div>
                <dt>Date of death</dt>
                <dd>{calendarDateLabel(item.intake.date_of_death) ?? "—"}</dd>
              </div>
              <div>
                <dt>Date of birth</dt>
                <dd>{calendarDateLabel(item.intake.deceased_date_of_birth) ?? "—"}</dd>
              </div>
              <div>
                <dt>Gender</dt>
                <dd>{item.intake.deceased_gender ?? "—"}</dd>
              </div>
              <div>
                <dt>Civil status</dt>
                <dd>{item.intake.deceased_civil_status ?? "—"}</dd>
              </div>
              <div>
                <dt>Senior citizen</dt>
                <dd>{item.intake.senior_citizen ? "Yes" : "—"}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted mb-0">
              The case records no intake yet — no date of death, date of birth, gender or
              civil status is on file. Open the case to capture it.
            </p>
          )}
          <p className="text-sm text-muted" style={{ marginTop: "var(--space-4)" }}>
            Only the facts the case itself holds appear here; the case records no place
            of death.
          </p>
        </Card>
      </PageSection>

      <PageSection>
        <p className="text-sm text-muted mb-0">
          Read-only record — no service carries preparation writes yet, so nothing on
          this screen can be changed.
        </p>
      </PageSection>
    </>
  );
}
