import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { DataTable, StatCard } from "@/components/kit";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listDocuments } from "@/lib/api-client/documents";

export const metadata = { title: "Documents — Admin Portal" };

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
        <StatCard label="Documents" value={documents.length} sub="in repository" />
        <StatCard label="Receipts" value={receipts} sub="official receipts" />
        <StatCard label="Contracts" value={contracts} sub="agreements" />
        <StatCard label="Certificates" value={certificates} sub="service certificates" />
      </div>

      <PageSection>
        <form className="filter-bar" role="search">
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
          {typeFilter || statusFilter ? (
            <Link className="btn btn--ghost btn--sm" href="/staff/documents">
              Clear
            </Link>
          ) : null}
        </form>

        <DataTable
          columns={[
            { key: "number", header: "Number" },
            { key: "title", header: "Title" },
            { key: "type", header: "Type" },
            { key: "case", header: "Case", className: "text-sm" },
            { key: "order", header: "Order", className: "text-sm" },
            { key: "status", header: "Status" },
            { key: "uploaded", header: "Uploaded by", className: "text-sm" },
            { key: "date", header: "Date", className: "text-sm" },
            { key: "size", header: "Size", className: "text-sm" },
            { key: "artifact", header: "Artifact", className: "text-sm" },
          ]}
          rows={filtered}
          rowKey={(doc) => doc.id}
          emptyTitle={
            typeFilter || statusFilter ? "No documents match your filter" : "No documents found"
          }
          emptyHint={
            typeFilter || statusFilter
              ? "Try a different filter."
              : "Generated receipts and certificates appear here as they are issued."
          }
          renderCell={(doc, column) => {
            switch (column.key) {
              case "number":
                return (
                  <Link href={`/staff/documents/${doc.id}`}>
                    <code>{doc.document_number}</code>
                  </Link>
                );
              case "title":
                return doc.title;
              case "type":
                return (
                  <Badge tone={TYPE_TONE[doc.document_type] ?? "neutral"}>
                    {doc.document_type}
                  </Badge>
                );
              case "case":
                return doc.related_case_number ?? "—";
              case "order":
                return doc.related_order_number ?? "—";
              case "status":
                return (
                  <Badge tone={STATUS_TONE[doc.status] ?? "neutral"}>
                    {doc.status.replace(/_/g, " ")}
                  </Badge>
                );
              case "uploaded":
                return doc.uploaded_by;
              case "date":
                return new Date(doc.uploaded_at).toLocaleDateString();
              case "size":
                return formatFileSize(doc.file_size_bytes);
              case "artifact":
                return doc.file_size_bytes > 0 ? (
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
                );
              default:
                return null;
            }
          }}
        />
      </PageSection>
    </>
  );
}
