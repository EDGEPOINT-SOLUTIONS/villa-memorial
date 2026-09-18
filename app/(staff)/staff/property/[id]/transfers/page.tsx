import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listLotTransfers } from "@/lib/api-client/lot-lifecycle";
import { getLot } from "@/lib/api-client/property";
import {
  TRANSFER_STATE_LABEL,
  formatRecordDay,
  nextStep,
  officeStepLabel,
  officeStepTone,
} from "@/lib/lot-lifecycle";
import { LotRecordTabs } from "../lot-record-tabs";

export const metadata = { title: "Transfers — Staff Portal" };

/**
 * Transfers (captain checklist F-11) — a request changing hands: who is
 * transferring to whom, the request's state in the words a clerk uses
 * (submitted · verified · approved · completed), what verification still needs,
 * and the fee / requirement notes the office applies. The history carries its
 * dates; a state is never a bare badge.
 *
 * Honest state: lot-events-v1 freezes `for_transfer` as a status only — no
 * transfer workflow or write path exists — so the screen reads the office's
 * recorded file and says once what waits on the service. The final step
 * ("Ownership updated") is exactly the deferred one, and the last step's note
 * says so.
 */

const GAP =
  "No transfer workflow exists yet — lot-events-v1 freezes for_transfer as a status only. What follows is the office's recorded file, in the words a clerk uses.";

export default async function LotTransfersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["property:read"])) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Transfers" />
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

  let transfers;
  try {
    transfers = await listLotTransfers(lot.id);
  } catch {
    return (
      <>
        <PageHeader eyebrow={`Operations · Lot ${lot.lot_number}`} title="Transfers" />
        <PageSection>
          <ErrorState message="Unable to load this lot's transfer record." />
        </PageSection>
      </>
    );
  }

  const current = transfers[0];
  const next = current ? nextStep(current.steps) : undefined;

  return (
    <>
      <PageHeader
        eyebrow={`Operations · Lot ${lot.lot_number}`}
        title="Transfers"
        actions={
          <Link
            href={`/staff/property/${encodeURIComponent(lot.id)}`}
            className="btn btn--secondary btn--sm"
          >
            Back to lot
          </Link>
        }
      />
      <LotRecordTabs lotId={lot.id} current="transfers" />
      <p className="lot-rec-gap">{GAP}</p>

      {current ? (
        <PageSection>
          <Card header={<h3>The request in progress</h3>}>
            <dl className="kv lot-rec-kv">
              <div>
                <dt>State</dt>
                <dd>
                  <Badge tone={current.state === "completed" ? "success" : "warning"}>
                    {TRANSFER_STATE_LABEL[current.state]}
                  </Badge>{" "}
                  <span className="text-sm text-muted">
                    {current.state === "completed"
                      ? "The last of the four words."
                      : `${current.steps.filter((step) => step.state === "done").length} of ${current.steps.length} steps recorded.`}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Who to whom</dt>
                <dd>
                  <strong>{current.from}</strong> → <strong>{current.to}</strong>
                  {current.to_note ? (
                    <>
                      <br />
                      <span className="text-sm text-muted">{current.to_note}</span>
                    </>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt>Requested</dt>
                <dd>{formatRecordDay(current.asked_on)}</dd>
              </div>
              <div>
                <dt>Next step</dt>
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
                    "Every step is recorded."
                  )}
                </dd>
              </div>
            </dl>
          </Card>
        </PageSection>
      ) : (
        <PageSection>
          <Card header={<h3>The request in progress</h3>}>
            <EmptyState
              title="No transfer request is recorded for this lot"
              hint="A transfer starts with a written request from the present owner. The purchase agreement allows it only with the office's written consent — and the platform's write path does not exist yet."
            />
          </Card>
        </PageSection>
      )}

      {transfers.map((transfer) => {
        const outstanding = transfer.steps.filter((step) => step.state !== "done");
        return (
          <PageSection key={transfer.id}>
            <Card
              header={
                <div className="row row--space row--wrap">
                  <h3>
                    {transfer.from} → {transfer.to}
                  </h3>
                  <Badge tone={transfer.state === "completed" ? "success" : "warning"}>
                    {TRANSFER_STATE_LABEL[transfer.state]}
                  </Badge>
                </div>
              }
              footer={`Requested ${formatRecordDay(transfer.asked_on)}`}
            >
              <div className="stack">
                <div className="table-wrapper">
                  <table className="table">
                    <caption className="visually-hidden">
                      {transfer.from} to {transfer.to}: the request&rsquo;s four words
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Step</th>
                        <th scope="col">State</th>
                        <th scope="col">Recorded</th>
                        <th scope="col">What it was / waits on</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfer.steps.map((step) => (
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

                <div>
                  <h4 className="mb-0">What verification still needs</h4>
                  {outstanding.length > 0 && transfer.still_needed.length > 0 ? (
                    <ul>
                      {transfer.still_needed.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted mb-0">
                      Nothing is outstanding — every step above is recorded.
                    </p>
                  )}
                </div>

                <div>
                  <h4 className="mb-0">The office&rsquo;s fee / requirement notes</h4>
                  <ul>
                    {transfer.requirements.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </PageSection>
        );
      })}
    </>
  );
}
