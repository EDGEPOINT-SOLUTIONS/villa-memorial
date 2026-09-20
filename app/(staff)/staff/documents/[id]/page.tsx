import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { getDocument, renderDocument, type DocumentStatus } from "@/lib/api-client/documents";

export const metadata = { title: "Document — Admin Portal" };

const STATUS_TONE: Record<DocumentStatus, "success" | "warning" | "info" | "neutral" | "danger"> = {
  uploaded: "info",
  pending_review: "warning",
  verified: "info",
  approved: "success",
  rejected: "danger",
};

const TYPE_LABEL: Record<string, string> = {
  receipt: "Official receipt",
  contract: "Contract",
  certificate: "Certificate",
  permit: "Permit",
  authorization: "Authorization",
  other: "Other",
};

/** Document detail — real data from the documents service + render artifact. */
export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["documents:read"])) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Document" />
        <PageSection>
          <ForbiddenState requiredScopes={["documents:read"]} />
        </PageSection>
      </>
    );
  }

  const { id } = await params;
  let doc;
  let body: string | null = null;
  try {
    doc = await getDocument(id);
  } catch {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Document" />
        <PageSection>
          <ErrorState message="We couldn't find that document." />
        </PageSection>
      </>
    );
  }

  // Generated docs carry a rendered body; uploads do not (no object store yet).
  try {
    body = await renderDocument(doc.id);
  } catch {
    body = null;
  }
  const hasBody = Boolean(body && body.trim().length > 0);

  return (
    <>
      <PageHeader
        eyebrow="Operations · Documents"
        title={doc.document_number ?? "Document"}
        actions={
          <Link href="/staff/documents" className="btn btn--secondary btn--sm">
            Back to repository
          </Link>
        }
      />

      <PageSection>
        <Card header={<h2>Details</h2>}>
          <div className="stack-3">
            <div className="row row--space">
              <span className="text-sm text-muted">Title</span>
              <strong>{doc.title}</strong>
            </div>
            <div className="row row--space">
              <span className="text-sm text-muted">Type</span>
              <span>{TYPE_LABEL[doc.document_type] ?? doc.document_type}</span>
            </div>
            <div className="row row--space">
              <span className="text-sm text-muted">Status</span>
              <Badge tone={STATUS_TONE[doc.status] ?? "neutral"}>{doc.status}</Badge>
            </div>
            <div className="row row--space">
              <span className="text-sm text-muted">Number</span>
              <span>{doc.document_number ?? "—"}</span>
            </div>
            {doc.related_case_number ? (
              <div className="row row--space">
                <span className="text-sm text-muted">Case</span>
                <span>{doc.related_case_number}</span>
              </div>
            ) : null}
            {doc.related_order_number ? (
              <div className="row row--space">
                <span className="text-sm text-muted">Order</span>
                <span>{doc.related_order_number}</span>
              </div>
            ) : null}
            <div className="row row--space">
              <span className="text-sm text-muted">Uploaded</span>
              <span>{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : "—"}</span>
            </div>
          </div>
        </Card>
      </PageSection>

      {hasBody ? (
        <PageSection>
          <Card header={<h2>Rendered artifact</h2>}>
            <p className="text-sm text-muted">
              Open the rendered document in a new tab (browser print → PDF).
            </p>
            <a
              href={`/api/documents/${encodeURIComponent(doc.id)}/render`}
              target="_blank"
              rel="noreferrer"
              className="btn btn--primary btn--sm"
            >
              Open rendered document
            </a>
          </Card>
        </PageSection>
      ) : (
        <PageSection>
          <p className="text-sm text-muted">
            No rendered body for this document (uploads have no stored artifact yet —
            the object store is a dev-authored item).
          </p>
        </PageSection>
      )}
    </>
  );
}
