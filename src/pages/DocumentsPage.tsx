import { Link } from "react-router-dom";
import { PageHeader, Badge, Button } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { DOCUMENTS, type Document } from "../lib/data";

const statusTone: Record<Document["status"], "neutral" | "info" | "warning" | "success"> = {
  Draft: "neutral",
  Generated: "info",
  Sent: "warning",
  Signed: "success",
};

const columns: Column<Document>[] = [
  {
    key: "name",
    label: "Document",
    render: (d) => (
      <Link to={`/documents/${d.id}`} className="table__name">
        {d.name}
      </Link>
    ),
  },
  { key: "type", label: "Type", render: (d) => <Badge tone="neutral">{d.type}</Badge> },
  { key: "related", label: "Related" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status", render: (d) => <Badge tone={statusTone[d.status]}>{d.status}</Badge> },
];

export function DocumentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Documents"
        actions={<Button size="sm">+ Generate document</Button>}
      />
      <p className="small muted" style={{ marginBottom: "var(--space-4)" }}>
        Contracts, certificates, and official receipts. Templates are configurable per tenant;
        generated artifacts carry a full status lifecycle.
      </p>
      <DataTable columns={columns} rows={DOCUMENTS} rowKey={(d) => d.id} />
    </>
  );
}
