import { Link, useParams } from "react-router-dom";
import { PageHeader, Card, Badge, Button, KeyValue } from "../components/ui";
import { DOCUMENTS } from "../lib/data";

export function DocumentDetailPage() {
  const { id } = useParams();
  const doc = DOCUMENTS.find((d) => d.id === id);

  if (!doc) {
    return (
      <>
        <PageHeader eyebrow="Documents" title="Document not found" />
        <p><Link to="/documents">Back to documents</Link></p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={<Link to="/documents">Documents</Link>}
        title={doc.name}
        actions={
          <>
            <Button variant="secondary" size="sm">Download</Button>
            <Button size="sm">Send</Button>
          </>
        }
      />

      <div className="split">
        <Card title="Preview">
          <div className="card card--memorial" style={{ padding: "var(--space-6)", border: "none" }}>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-xl)", color: "var(--brass-600)" }}>
              {doc.name}
            </div>
            <hr className="ornament-rule" />
            <p className="small muted">
              Rendered document preview. Template fields are merged from the related record —
              highlight a value to see its source field. (Illustrative in this demo.)
            </p>
            <div className="kv" style={{ marginTop: "var(--space-4)" }}>
              <div className="kv__k">Related</div><div className="kv__v">{doc.related}</div>
              <div className="kv__k">Type</div><div className="kv__v">{doc.type}</div>
              <div className="kv__k">Generated</div><div className="kv__v">{doc.date}</div>
            </div>
          </div>
        </Card>

        <Card title="Document details">
          <KeyValue
            items={[
              ["Status", <Badge key="s" tone={doc.status === "Signed" ? "success" : doc.status === "Sent" ? "warning" : "info"}>{doc.status}</Badge>],
              ["Type", doc.type],
              ["Related record", doc.related],
              ["Created", doc.date],
            ]}
          />
          <p className="small muted" style={{ marginTop: "var(--space-4)" }}>
            Field source map: each merged value maps back to the entity and field it came from, so
            operators can verify correctness before sending.
          </p>
        </Card>
      </div>
    </>
  );
}
