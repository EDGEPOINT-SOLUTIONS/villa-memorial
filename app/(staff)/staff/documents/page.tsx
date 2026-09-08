import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageHeader, PageSection } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listDocuments } from "@/lib/api-client/documents";

export const metadata = { title: "Documents — Staff Portal" };

const TYPE_TONE: Record<string, "info" | "neutral"> = {
  receipt: "info",
  contract: "neutral",
  certificate: "info",
  permit: "neutral",
  authorization: "info",
  other: "neutral",
};

const STATUS_TONE: Record<string, "success" | "warning" | "info" | "danger"> = {
  approved: "success",
  verified: "success",
  pending_review: "warning",
  uploaded: "info",
  rejected: "danger",
};

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["documents:read"])) {
    return (
      <>
        <PageHeader
          eyebrow="Operations"
          title="Documents"
          actions={
            <Link href="/staff/documents/new" className="btn btn--primary btn--sm">
              + New document
            </Link>
          }
        />
        <PageSection>
          <ForbiddenState requiredScopes={["documents:read"]} />
        </PageSection>
      </>
    );
  }

  let documents;
  try {
    documents = await listDocuments();
  } catch {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Documents" />
        <PageSection>
          <ErrorState message="Unable to load document records." />
        </PageSection>
      </>
    );
  }

  const receipts = documents.filter((d) => d.document_type === "receipt").length;
  const contracts = documents.filter((d) => d.document_type === "contract").length;
  const certificates = documents.filter((d) => d.document_type === "certificate").length;
  const { type, status } = await searchParams;
  const typeFilter = (type ?? "").trim();
  const statusFilter = (status ?? "").trim();

  let filtered = documents;
  if (typeFilter) {
    filtered = filtered.filter((d) => d.document_type === typeFilter);
  }
  if (statusFilter) {
    filtered = filtered.filter((d) => d.status === statusFilter);
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Documents"
        actions={
          <button className="btn btn--primary btn--sm" disabled>
            Upload (not wired yet)
          </button>
        }
      />

      <div className="kpi-grid" style={{ marginBottom: "var(--space-5)" }}>
        <span className="card kpi-card"><span className="kpi-card__body"><span className="kpi-card__label">Documents</span><span className="kpi-card__value">{documents.length}</span><span className="kpi-card__sub">in repository</span></span></span>
        <span className="card kpi-card"><span className="kpi-card__body"><span className="kpi-card__label">Receipts</span><span className="kpi-card__value">{receipts}</span><span className="kpi-card__sub">official receipts</span></span></span>
        <span className="card kpi-card"><span className="kpi-card__body"><span className="kpi-card__label">Contracts</span><span className="kpi-card__value">{contracts}</span><span className="kpi-card__sub">agreements</span></span></span>
        <span className="card kpi-card"><span className="kpi-card__body"><span className="kpi-card__label">Certificates</span><span className="kpi-card__value">{certificates}</span><span className="kpi-card__sub">service certificates</span></span></span>
      </div>

      <PageSection>
        <form className="row mb-4" role="search">
          <select
            className="select"
            name="type"
            defaultValue={typeFilter}
            aria-label="Filter by type"
          >
            <option value="">All types</option>
            <option value="receipt">Receipt</option>
            <option value="contract">Contract</option>
            <option value="certificate">Certificate</option>
            <option value="permit">Permit</option>
            <option value="authorization">Authorization</option>
            <option value="other">Other</option>
          </select>
          <select
            className="select"
            name="status"
            defaultValue={statusFilter}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="uploaded">Uploaded</option>
            <option value="pending_review">Pending review</option>
            <option value="verified">Verified</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button className="btn btn--primary btn--sm" type="submit">
            Filter
          </button>
        </form>

        {filtered.length === 0 ? (
          <EmptyState
            title={typeFilter || statusFilter ? "No documents match your filter" : "No documents found"}
            hint={
              typeFilter || statusFilter
                ? "Try a different filter."
                : "Generated receipts and certificates appear here as they are issued."
            }
          />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Number</th>
                  <th scope="col">Title</th>
                  <th scope="col">Type</th>
                  <th scope="col">Case</th>
                  <th scope="col">Order</th>
                  <th scope="col">Status</th>
                  <th scope="col">Uploaded by</th>
                  <th scope="col">Date</th>
                  <th scope="col">Size</th>
                  <th scope="col">Artifact</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <Link href={`/staff/documents/${doc.id}`}>
                        <code>{doc.document_number}</code>
                      </Link>
                    </td>
                    <td>{doc.title}</td>
                    <td>
                      <Badge tone={TYPE_TONE[doc.document_type] ?? "neutral"}>
                        {doc.document_type}
                      </Badge>
                    </td>
                    <td className="text-sm">{doc.related_case_number ?? "—"}</td>
                    <td className="text-sm">{doc.related_order_number ?? "—"}</td>
                    <td>
                      <Badge tone={STATUS_TONE[doc.status] ?? "neutral"}>
                        {doc.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="text-sm">{doc.uploaded_by}</td>
                    <td className="text-sm">{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                    <td className="text-sm">{formatFileSize(doc.file_size_bytes)}</td>
                    <td className="text-sm">
                      {doc.file_size_bytes > 0 ? (
                        <a
                          href={`/api/documents/${doc.id}/render`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      ) : (
                        // No artifact to open: an uploaded file has no body in v1, and the
                        // service stores no binaries. Saying so beats a link that 404s.
                        <span className="text-muted">not stored</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>
    </>
  );
}
