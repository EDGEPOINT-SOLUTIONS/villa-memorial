import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { PageHeader, Card, Badge, Button, Tabs, KeyValue, Alert } from "../components/ui";
import { CASES } from "../lib/data";

const CHECKLIST = [
  "Identity verified",
  "Authorization received",
  "Documents complete",
  "Preparation scheduled",
  "Chapel assigned",
  "Vehicle assigned",
];

export function CaseDetailPage() {
  const { id } = useParams();
  const kase = CASES.find((c) => c.id === id);
  const [tab, setTab] = useState(0);

  if (!kase) {
    return (
      <>
        <PageHeader eyebrow="Cases" title="Case not found" />
        <p><Link to="/cases">Back to cases</Link></p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={<Link to="/cases">Cases</Link>}
        title={
          <span style={{ fontFamily: "var(--font-serif)" }}>
            {kase.id} — {kase.deceased}
          </span>
        }
        actions={
          <>
            <Button variant="secondary" size="sm">Generate contract</Button>
            <Button size="sm">Update stage</Button>
          </>
        }
      />

      <div className="split">
        <Card title="Case details">
          <KeyValue
            items={[
              ["Deceased", <span key="d" style={{ fontFamily: "var(--font-serif)" }}>{kase.deceased}</span>],
              ["Service type", kase.type],
              ["Status", <Badge key="s" tone="info">{kase.status}</Badge>],
              ["Opened", kase.date],
              ["Location", kase.location],
              ["Assignee", kase.assignee],
            ]}
          />
        </Card>
        <Card title="Operational checklist">
          <div className="stack">
            {CHECKLIST.map((c, i) => (
              <label key={c} className="checkbox">
                <input type="checkbox" defaultChecked={i < 4} /> {c}
              </label>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: "var(--space-6)" }}>
        <Alert tone="info">
          Stage transitions are driven by the configurable workflow engine. This demo shows the
          current stage; approvals and escalations are defined per tenant.
        </Alert>
      </div>

      <div style={{ marginTop: "var(--space-6)" }}>
        <Tabs tabs={["Tasks", "Documents", "Billing", "Timeline"]} active={tab} onChange={setTab} />
        {tab === 0 && <Card title="Tasks"><p className="muted">Task list assigned to this case.</p></Card>}
        {tab === 1 && <Card title="Documents"><p className="muted">Contracts, permits, and certificates.</p></Card>}
        {tab === 2 && (
          <Card title="Billing">
            <KeyValue items={[["Estimated total", "₱ 42,000"], ["Balance", "₱ 22,000"]]} />
          </Card>
        )}
        {tab === 3 && <Card title="Timeline"><p className="muted">Case history and audit events.</p></Card>}
      </div>
    </>
  );
}
