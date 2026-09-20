import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listLotInterments } from "@/lib/api-client/lot-lifecycle";
import { listDocuments } from "@/lib/api-client/documents";
import { getCase } from "@/lib/api-client/operations";
import { getLot } from "@/lib/api-client/property";
import {
  INTERMENT_STATE_LABEL,
  attentionSteps,
  formatRecordDay,
  officeStepLabel,
  officeStepTone,
  outstandingSteps,
} from "@/lib/lot-lifecycle";
import { LotRecordTabs } from "../lot-record-tabs";

export const metadata = { title: "Interments — Admin Portal" };

/**
 * Interments (captain checklist F-11) — the record of each interment in a lot:
 * who, when, which lot and section, the service it belongs to, and the checks
 * the office runs before the ground is opened (deceased identity, ownership,
 * payment standing — plus the permit the ground needs).
 *
 * Honest state, named once: interment is deferred in lot-events-v1 (`occupied`
 * is a status only), so the screen reads the office's recorded file. A record
 * marked "Ground opened" is the one final state here, and it is backed by a
 * completed case and a verified burial permit; every other record says which
 * check is still open rather than showing a plausible date.
 */

const GAP =
  "Interment workflows are deferred in lot-events-v1 — occupied is a status only. This is the office's recorded file: who, when, the service and the checks before the ground opens.";

export default async function LotIntermentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["property:read"])) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Interments" />
        <PageSection>
          <ForbiddenState requiredScopes={["property:read"]} />
        </PageSection>
      </>
    );
  }

  const { id } = await params;
  const canReadCases = hasAnyScope(session.scopes, ["cases:read"]);
  const canReadDocuments = hasAnyScope(session.scopes, ["documents:read"]);

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

  let interments;
  try {
    interments = await listLotInterments(lot.id);
  } catch {
    return (
      <>
        <PageHeader eyebrow={`Operations · Lot ${lot.lot_number}`} title="Interments" />
        <PageSection>
          <ErrorState message="Unable to load this lot's interment record." />
        </PageSection>
      </>
    );
  }

  // The service each interment belongs to: the case's own number and service lines,
  // read per record. A case this mode cannot read stays a number, never a guess.
  const serviceByCase = new Map<string, string[]>();
  await Promise.all(
    interments.map(async (record) => {
      try {
        const caseRecord = await getCase(record.case_id);
        serviceByCase.set(record.case_id, caseRecord.services);
      } catch {
        serviceByCase.set(record.case_id, []);
      }
    }),
  );

  // The papers a record names are linked to the repository row with the same number,
  // never re-titled here; a paper this mode cannot find stays a number.
  const documentIdByNumber = new Map<string, string>();
  try {
    const repository = await listDocuments();
    for (const doc of repository) documentIdByNumber.set(doc.document_number, doc.id);
  } catch {
    // An unreadable repository leaves every paper as its recorded number.
  }

  const opened = interments.filter((record) => record.state === "interred");
  const preparing = interments.filter((record) => record.state === "preparing");
  const openChecks = interments
    .map((record) => ({ record, open: outstandingSteps(record.checks) }))
    .filter((entry) => entry.open.length > 0);

  return (
    <>
      <PageHeader
        eyebrow={`Operations · Lot ${lot.lot_number}`}
        title="Interments"
        actions={
          <Link
            href={`/staff/property/${encodeURIComponent(lot.id)}`}
            className="btn btn--secondary btn--sm"
          >
            Back to lot
          </Link>
        }
      />
      <LotRecordTabs lotId={lot.id} current="interments" />
      <p className="lot-rec-gap">{GAP}</p>

      {interments.length > 0 ? (
        <PageSection>
          <Card header={<h2>The ground here</h2>}>
            <dl className="kv lot-rec-kv">
              <div>
                <dt>Records</dt>
                <dd>
                  {interments.length} — {opened.length} opened, {preparing.length} not opened
                </dd>
              </div>
              <div>
                <dt>Last opened</dt>
                <dd>
                  {opened.length > 0
                    ? formatRecordDay(opened[opened.length - 1].interred_on)
                    : "Never — no interment has happened here"}
                </dd>
              </div>
              <div>
                <dt>Open checks</dt>
                <dd>
                  {openChecks.length === 0 ? (
                    "None — every check is recorded for every record."
                  ) : (
                    <ul className="mb-0">
                      {openChecks.map(({ record, open }) => (
                        <li key={record.id}>
                          <a href={`#interment-${record.id}`}>{record.deceased_name}</a> —{" "}
                          {open.map((check) => check.label).join(", ")}
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            </dl>
          </Card>
        </PageSection>
      ) : null}

      {interments.length === 0 ? (
        <PageSection>
          <Card header={<h2>The ground here</h2>}>
            <EmptyState
              title="No interment is recorded for this lot"
              hint="The ground has not been opened here, as far as the office's file goes. An interment is recorded only against the lot it happens in."
            />
          </Card>
        </PageSection>
      ) : null}

      {interments.map((interment) => {
        const services = serviceByCase.get(interment.case_id) ?? [];
        const attention = attentionSteps(interment.checks);
        const open = outstandingSteps(interment.checks);
        return (
          <PageSection key={interment.id}>
            <Card
              header={
                <div className="row row--space row--wrap">
                  <h3>{interment.deceased_name}</h3>
                  <Badge tone={interment.state === "interred" ? "success" : "warning"}>
                    {INTERMENT_STATE_LABEL[interment.state]}
                  </Badge>
                </div>
              }
              footer={
                interment.state === "interred"
                  ? `Ground opened ${formatRecordDay(interment.interred_on)}`
                  : "No day set — the checks below come first"
              }
            >
              <div className="stack" id={`interment-${interment.id}`}>
                {attention.length > 0 ? (
                  <Alert
                    tone="warning"
                    title={`The ground stays closed: ${attention.map((check) => check.label).join(", ")}`}
                  >
                    {attention.map((check) => check.note).filter(Boolean).join(" ")}
                  </Alert>
                ) : null}

                <div className="table-wrapper" tabIndex={0}>
                  <table className="table">
                    <caption className="visually-hidden">
                      {interment.deceased_name}: the interment record
                    </caption>
                    <tbody>
                      <tr>
                        <th scope="row">Lot</th>
                        <td>
                          {interment.lot_number} · Section {lot.section} · Block {lot.block}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">Interred</th>
                        <td>
                          {interment.state === "interred"
                            ? formatRecordDay(interment.interred_on)
                            : "Not yet — no day is set"}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">Service</th>
                        <td>
                          {canReadCases ? (
                            <Link href={`/staff/cases/${encodeURIComponent(interment.case_id)}`}>
                              {interment.case_number}
                            </Link>
                          ) : (
                            interment.case_number
                          )}
                          {services.length > 0 ? ` · ${services.join(", ")}` : null}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">Papers</th>
                        <td>
                          {interment.papers.length === 0
                            ? "None on file yet"
                            : interment.papers.map((paper) => {
                                const documentId = documentIdByNumber.get(paper.document_number);
                                return (
                                  <div key={paper.document_number}>
                                    {paper.role} · <code>{paper.document_number}</code>
                                    {canReadDocuments && documentId ? (
                                      <>
                                        {" "}
                                        <Link
                                          href={`/staff/documents/${encodeURIComponent(documentId)}`}
                                        >
                                          Open the paper
                                        </Link>
                                      </>
                                    ) : null}
                                  </div>
                                );
                              })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="table-wrapper" tabIndex={0}>
                  <table className="table">
                    <caption className="visually-hidden">
                      The checks the office runs before the ground is opened
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Check</th>
                        <th scope="col">State</th>
                        <th scope="col">Recorded</th>
                        <th scope="col">What the office found</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interment.checks.map((check) => (
                        <tr key={check.key}>
                          <td>
                            <strong>{check.label}</strong>
                          </td>
                          <td>
                            <Badge tone={officeStepTone(check.state)}>
                              {officeStepLabel(check.state)}
                            </Badge>
                          </td>
                          <td className="text-sm">{formatRecordDay(check.on)}</td>
                          <td className="text-sm">{check.note ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {open.length === 0 ? (
                  <p className="text-sm text-muted mb-0">
                    Every check is recorded: {interment.checks.length} of {interment.checks.length}
                    . The office closes the record only when the burial permit is on file.
                  </p>
                ) : null}
              </div>
            </Card>
          </PageSection>
        );
      })}
    </>
  );
}
