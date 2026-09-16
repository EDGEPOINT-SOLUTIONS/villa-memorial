import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { getCase } from "@/lib/api-client/operations";
import { PipelineDots } from "@/components/case-pipeline";
import { listDocuments, type Document } from "@/lib/api-client/documents";
import { GenerateContractForm } from "./generate-contract";
import { EditIntakeForm } from "./edit-intake";

export const metadata = { title: "Case detail — Staff Portal" };

const STAGE_TONE: Record<string, "info" | "warning" | "success" | "neutral"> = {
  inquiry: "info",
  retrieval: "warning",
  preparation: "warning",
  viewing: "info",
  ceremony: "info",
  interment: "warning",
  completed: "success",
};

const STAGE_LABEL: Record<string, string> = {
  inquiry: "Inquiry",
  retrieval: "Retrieval",
  preparation: "Preparation",
  viewing: "Viewing",
  ceremony: "Ceremony",
  interment: "Interment",
  completed: "Completed",
};

const TASK_STATUS_TONE: Record<string, "success" | "warning" | "neutral"> = {
  done: "success",
  in_progress: "warning",
  pending: "neutral",
};

const ALL_STAGES = ["inquiry", "retrieval", "preparation", "viewing", "ceremony", "interment", "completed"];

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Case not found" />
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
        <PageHeader eyebrow="Operations" title="Case not found" />
        <PageSection>
          <ErrorState message="We couldn't find that case record." />
        </PageSection>
      </>
    );
  }

  const stageIndex = ALL_STAGES.indexOf(item.stage);
  const doneTasks = item.tasks.filter((t) => t.status === "done").length;

  // Documents are a separate service and a separate scope: a session that cannot read them
  // still gets the case. A repository that is down costs this section, not the page.
  const canWriteCases = hasAnyScope(session.scopes, ["cases:write"]);
  // Recording a payment is a billing write: the card below links to the capture screen
  // only when this session holds the frozen payments scope (billing:write) — the same
  // scope the capture screen and the payments endpoint require.
  const canRecordPayments = hasAnyScope(session.scopes, ["billing:write"]);
  const canReadDocuments = hasAnyScope(session.scopes, ["documents:read"]);
  const canGenerateDocuments = hasAnyScope(session.scopes, ["documents:write"]);
  let caseDocuments: Document[] = [];
  let documentsUnavailable = false;
  if (canReadDocuments) {
    try {
      caseDocuments = await listDocuments({ case_number: item.case_number });
    } catch {
      documentsUnavailable = true;
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations · Case"
        title={item.case_number}
        actions={
          <Link href="/staff/cases" className="btn btn--secondary btn--sm">
            Back to cases
          </Link>
        }
      />

      <PageSection>
        <div className="card">
          <div className="card__body case-summary">
            <div>
              <p className="page-header__eyebrow">Case {item.case_number}</p>
              <h2 className="case-summary__name">{item.deceased_name === "Pending intake" ? "Awaiting intake" : item.deceased_name}</h2>
              <p className="case-summary__meta">
                Coordinator: {item.assigned_coordinator || "Unassigned"}
                {item.linked_order_number ? ` · Order ${item.linked_order_number}` : ""}
                {item.services.length > 0 ? ` · ${item.services.join(" · ")}` : ""}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--space-2)" }}>
              <Badge tone={STAGE_TONE[item.stage] ?? "neutral"}>{STAGE_LABEL[item.stage] ?? item.stage}</Badge>
              <PipelineDots stage={item.stage} />
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <Card header={<h3>Case details</h3>}>
          <div className="table-wrapper">
            <table className="table">
              <tbody>
                <tr>
                  <th scope="row">Case number</th>
                  <td><strong>{item.case_number}</strong></td>
                </tr>
                <tr>
                  <th scope="row">Deceased</th>
                  <td>{item.deceased_name}</td>
                </tr>
                <tr>
                  <th scope="row">Stage</th>
                  <td>
                    <Badge tone={STAGE_TONE[item.stage] ?? "neutral"}>
                      {STAGE_LABEL[item.stage] ?? item.stage}
                    </Badge>
                  </td>
                </tr>
                <tr>
                  <th scope="row">Coordinator</th>
                  <td>{item.assigned_coordinator}</td>
                </tr>
                <tr>
                  <th scope="row">Linked order</th>
                  <td>{item.linked_order_number ?? "—"}</td>
                </tr>
                <tr>
                  <th scope="row">Services</th>
                  <td>{item.services.length > 0 ? item.services.join(", ") : "—"}</td>
                </tr>
                <tr>
                  <th scope="row">Created</th>
                  <td>{new Date(item.created_at).toLocaleString()}</td>
                </tr>
                <tr>
                  <th scope="row">Last updated</th>
                  <td>{new Date(item.updated_at).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </PageSection>

      <PageSection>
        <Card
          header={
            <h3>
              Intake{" "}
              {item.intake?.completed_at ? null : (
                <Badge tone="warning">not captured</Badge>
              )}
            </h3>
          }
        >
          {item.intake ? (
            <div className="table-wrapper">
              <table className="table">
                <tbody>
                  <tr>
                    <th scope="row">Date of death</th>
                    <td>{item.intake.date_of_death ?? "—"}</td>
                  </tr>
                  <tr>
                    <th scope="row">Date of birth</th>
                    <td>{item.intake.deceased_date_of_birth ?? "—"}</td>
                  </tr>
                  <tr>
                    <th scope="row">Gender / civil status</th>
                    <td>
                      {item.intake.deceased_gender ?? "—"} ·{" "}
                      {item.intake.deceased_civil_status ?? "—"}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Senior citizen</th>
                    <td>
                      {item.intake.senior_citizen
                        ? "Yes"
                        : "—" /* claim-only: never assert a "No" nobody gave */}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Client</th>
                    <td>{item.intake.client_name ?? "—"}</td>
                  </tr>
                  <tr>
                    <th scope="row">Client gender / civil status</th>
                    <td>
                      {item.intake.client_gender ?? "—"} ·{" "}
                      {item.intake.client_civil_status ?? "—"}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Relationship</th>
                    <td>{item.intake.client_relationship ?? "—"}</td>
                  </tr>
                  <tr>
                    <th scope="row">Telephone</th>
                    <td>{item.intake.client_contact ?? "—"}</td>
                  </tr>
                  <tr>
                    <th scope="row">Facebook</th>
                    <td>{item.intake.client_facebook ?? "—"}</td>
                  </tr>
                  <tr>
                    <th scope="row">Email</th>
                    <td>{item.intake.client_email ?? "—"}</td>
                  </tr>
                  <tr>
                    <th scope="row">Address</th>
                    <td>{item.intake.client_address ?? "—"}</td>
                  </tr>
                  <tr>
                    <th scope="row">ID presented</th>
                    <td>
                      {[item.intake.client_id_presented, item.intake.client_id_number]
                        .filter(Boolean)
                        .join(" — ") || "—"}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Co-maker</th>
                    <td>{item.intake.co_maker_name ?? "—"}</td>
                  </tr>
                  <tr>
                    <th scope="row">Contract date</th>
                    <td>{item.intake.contract_date ?? "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted">
              Nothing captured yet. A case opened from a paid order carries the purchaser,
              never the deceased — the service contract prints an em dash for every field
              below until someone sits down with the family.
            </p>
          )}
          {canWriteCases ? null : (
            <p className="text-sm text-muted">
              Capturing intake needs <code>cases:write</code>.
            </p>
          )}
        </Card>
        {canWriteCases ? (
          <div style={{ marginTop: "var(--space-4)" }}>
            <EditIntakeForm kase={item} />
          </div>
        ) : null}
      </PageSection>

      <PageSection>
        <Card header={<h3>Service contract (paper form)</h3>}>
          <p className="text-sm text-muted">
            The capture screen mirrors the paper <strong>Service Contract Form</strong>{" "}
            — the deceased/client header from intake plus the services-vs-deals table, the
            deductions block and the contract terms, ready to print for signature.
          </p>
          <div style={{ marginTop: "1rem" }}>
            <Link href={`/staff/cases/${item.id}/service-contract`} className="btn btn--secondary btn--sm">
              {canWriteCases ? "Open the service contract form" : "View the service contract (read-only)"}
            </Link>
          </div>
          {canWriteCases ? null : (
            <p className="text-sm text-muted">
              Editing the service contract needs <code>cases:write</code>.
            </p>
          )}
        </Card>
      </PageSection>

      <PageSection>
        <Card header={<h3>Record a payment</h3>}>
          <p className="text-sm text-muted">
            Capture an initial or partial payment against this case and print the
            provisional receipt the counter hands over. Official receipt numbering,
            allocation and posting stay with finance — the slip says so outright.
          </p>
          <div style={{ marginTop: "1rem" }}>
            {canRecordPayments ? (
              <Link
                href={`/staff/billing/record-payment?case=${encodeURIComponent(item.case_number)}`}
                className="btn btn--secondary btn--sm"
              >
                Record a payment against {item.case_number}
              </Link>
            ) : null}
          </div>
          {canRecordPayments ? null : (
            <p className="text-sm text-muted">
              Recording a payment needs <code>billing:write</code>.
            </p>
          )}
        </Card>
      </PageSection>

      {canReadDocuments ? (
        <PageSection>
          <Card header={<h3>Contract &amp; documents</h3>}>
            {documentsUnavailable ? (
              <p className="text-sm text-muted">
                The document repository is unavailable; this case&rsquo;s documents could not
                be listed.
              </p>
            ) : caseDocuments.length === 0 ? (
              <p className="text-sm text-muted">
                No documents filed against this case yet.
              </p>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Document</th>
                      <th scope="col">Type</th>
                      <th scope="col">Filed</th>
                      <th scope="col">Artifact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caseDocuments.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <strong>{doc.document_number}</strong>
                          <br />
                          <span className="text-sm text-muted">{doc.title}</span>
                        </td>
                        <td>
                          <Badge tone="neutral">{doc.document_type}</Badge>
                        </td>
                        <td>{new Date(doc.uploaded_at).toLocaleString()}</td>
                        <td>
                          {doc.file_size_bytes > 0 ? (
                            <a
                              href={`/api/documents/${doc.id}/render`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open
                            </a>
                          ) : (
                            <span className="text-sm text-muted">no artifact</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {canGenerateDocuments ? (
              <div style={{ marginTop: "1rem" }}>
                <GenerateContractForm caseId={item.id} />
              </div>
            ) : (
              <p className="text-sm text-muted">
                Generating a contract needs <code>documents:write</code>.
              </p>
            )}
          </Card>
        </PageSection>
      ) : null}

      <PageSection>
        <Card header={<h3>Stage progression</h3>}>
          <div className="row row--wrap">
            {ALL_STAGES.map((s, idx) => (
              <Badge
                key={s}
                tone={idx < stageIndex ? "success" : idx === stageIndex ? "info" : "neutral"}
              >
                {idx < stageIndex ? "✓ " : ""}{STAGE_LABEL[s]}
              </Badge>
            ))}
          </div>
        </Card>
      </PageSection>

      <PageSection>
        <Card header={<h3>Tasks ({doneTasks}/{item.tasks.length} done)</h3>}>
          {item.tasks.length === 0 ? (
            <p className="text-sm text-muted">No tasks recorded.</p>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Task</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {item.tasks.map((t, idx) => (
                    <tr key={idx}>
                      <td>{t.title}</td>
                      <td>
                        <Badge tone={TASK_STATUS_TONE[t.status] ?? "neutral"}>
                          {t.status.replace(/_/g, " ")}
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
  );
}
