import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listLotExhumations } from "@/lib/api-client/lot-lifecycle";
import { getLot } from "@/lib/api-client/property";
import {
  EXHUMATION_STATE_LABEL,
  formatRecordDay,
  nextStep,
  officeStepLabel,
  officeStepTone,
  stepProgress,
} from "@/lib/lot-lifecycle";
import { LotRecordTabs } from "../lot-record-tabs";

export const metadata = { title: "Exhumations — Staff Portal" };

/**
 * Exhumations (captain checklist F-11) — the deliberate, careful process: the
 * request, its document requirements, the approvals, and the record of what was
 * done. This is the one place where a missing step is a serious matter, so the
 * screen leads with the warning that nothing is opened while a requirement is
 * open, names exactly which requirement is next, and shows the "what was done"
 * record even when — especially when — it says nothing has been done.
 *
 * Honest state, named once: no exhumation workflow exists in lot-events-v1 (its
 * contract defers this family entirely) and nothing in the recorded file
 * confirms a completed exhumation, so NO request is presented as done.
 */

const GAP =
  "No exhumation workflow exists yet — and nothing in the recorded file confirms one being done. This is the office's recorded request, with every requirement it still needs.";

export default async function LotExhumationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["property:read"])) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Exhumations" />
        <PageSection>
          <ForbiddenState requiredScopes={["property:read"]} />
        </PageSection>
      </>
    );
  }

  const { id } = await params;

  let lot;
  try {
    lot = await getLot(id);
  } catch {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Lot not found" />
        <PageSection>
          <ErrorState message="We couldn't find that lot record." />
        </PageSection>
      </>
    );
  }

  let exhumations;
  try {
    exhumations = await listLotExhumations(lot.id);
  } catch {
    return (
      <>
        <PageHeader eyebrow={`Operations · Lot ${lot.lot_number}`} title="Exhumations" />
        <PageSection>
          <ErrorState message="Unable to load this lot's exhumation record." />
        </PageSection>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={`Operations · Lot ${lot.lot_number}`}
        title="Exhumations"
        actions={
          <Link
            href={`/staff/property/${encodeURIComponent(lot.id)}`}
            className="btn btn--secondary btn--sm"
          >
            Back to lot
          </Link>
        }
      />
      <LotRecordTabs lotId={lot.id} current="exhumations" />
      <p className="lot-rec-gap">{GAP}</p>

      {exhumations.length === 0 ? (
        <PageSection>
          <Alert tone="warning" title="Nothing is moved while a requirement is open">
            Every requirement is recorded before anything is opened. A missing step stops the
            work.
          </Alert>
        </PageSection>
      ) : null}

      {exhumations.length === 0 ? (
        <PageSection>
          <Card header={<h2>The request</h2>}>
            <EmptyState
              title="No exhumation has been recorded for this lot"
              hint="An exhumation is not a move: the office records a request, the lot holder's consent, the permit and the destination before anything is opened."
            />
          </Card>
        </PageSection>
      ) : null}

      {exhumations.map((exhumation) => {
        const progress = stepProgress(exhumation.steps);
        const next = nextStep(exhumation.steps);
        return (
          <div key={exhumation.id}>
            <PageSection>
              <Alert tone="warning" title="Nothing is moved while a requirement is open">
                Every requirement below is recorded before anything is opened. A missing step
                stops the work.
              </Alert>
            </PageSection>

            <PageSection>
              <Card
                header={
                  <div className="row row--space row--wrap">
                    <h3>The request — {exhumation.deceased_name}</h3>
                    <Badge tone={exhumation.state === "open" ? "warning" : "success"}>
                      {EXHUMATION_STATE_LABEL[exhumation.state]}
                    </Badge>
                  </div>
                }
                footer={`${progress.done} of ${progress.total} steps recorded`}
              >
                <dl className="kv lot-rec-kv">
                  <div>
                    <dt>Who</dt>
                    <dd>
                      <strong>{exhumation.deceased_name}</strong>
                      <br />
                      <span className="text-sm text-muted">
                        From lot {exhumation.lot_number} · Section {lot.section} · Block{" "}
                        {lot.block}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Asked by</dt>
                    <dd>
                      {exhumation.asked_by} · {formatRecordDay(exhumation.asked_on)}
                    </dd>
                  </div>
                  <div>
                    <dt>Reason</dt>
                    <dd>{exhumation.reason}</dd>
                  </div>
                  <div>
                    <dt>Destination</dt>
                    <dd>{exhumation.destination}</dd>
                  </div>
                  <div>
                    <dt>Next requirement</dt>
                    <dd>
                      {next ? (
                        <>
                          <strong>{next.label}</strong>
                          {next.note ? (
                            <>
                              <br />
                              <span className="text-sm text-muted">{next.note}</span>
                            </>
                          ) : null}
                        </>
                      ) : (
                        "Every requirement is recorded."
                      )}
                    </dd>
                  </div>
                </dl>
              </Card>
            </PageSection>

            <PageSection>
              <Card header={<h2>Every requirement, in order</h2>}>
                <div className="table-wrapper" tabIndex={0}>
                  <table className="table">
                    <caption className="visually-hidden">
                      The requirements recorded for moving {exhumation.deceased_name}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Requirement</th>
                        <th scope="col">State</th>
                        <th scope="col">Recorded</th>
                        <th scope="col">What it needs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exhumation.steps.map((step) => (
                        <tr key={step.key}>
                          <td>
                            <strong>{step.label}</strong>
                          </td>
                          <td>
                            <Badge tone={officeStepTone(step.state)}>
                              {officeStepLabel(step.state)}
                            </Badge>
                          </td>
                          <td className="text-sm">{formatRecordDay(step.on)}</td>
                          <td className="text-sm">{step.note ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </PageSection>

            <PageSection>
              <Card
                header={<h2>The record of what was done</h2>}
                footer={
                  exhumation.state === "open"
                    ? "Recorded only when the work is complete"
                    : "Recorded by the office"
                }
              >
                <p className="mb-0">{exhumation.record}</p>
              </Card>
            </PageSection>
          </div>
        );
      })}
    </>
  );
}
