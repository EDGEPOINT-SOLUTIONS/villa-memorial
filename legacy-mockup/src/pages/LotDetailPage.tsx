import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { PageHeader, Card, Badge, Button, Tabs, KeyValue } from "../components/ui";
import { LOTS, type LotStatus } from "../lib/data";

type BadgeTone =
  | "neutral" | "success" | "warning" | "danger" | "info" | "accent"
  | "available" | "reserved" | "sold" | "occupied" | "maintenance" | "transferred";

const statusTone: Record<LotStatus, BadgeTone> = {
  Available: "available",
  Reserved: "reserved",
  Sold: "sold",
  Occupied: "occupied",
  Maintenance: "maintenance",
  Transferred: "transferred",
};

export function LotDetailPage() {
  const { id } = useParams();
  const lot = LOTS.find((l) => l.id === id);
  const [tab, setTab] = useState(0);

  if (!lot) {
    return (
      <>
        <PageHeader eyebrow="Property" title="Lot not found" />
        <p><Link to="/property">Back to property map</Link></p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={<Link to="/property">Property map</Link>}
        title={`Lot ${lot.code}`}
        actions={<Link to="/property"><Button size="sm">Manage lots</Button></Link>}
      />

      <div className="split">
        <Card title="Lot profile">
          <KeyValue
            items={[
              ["Status", <Badge key="s" tone={statusTone[lot.status]}>{lot.status}</Badge>],
              ["Section", lot.section],
              ["Block", lot.block],
              ["Price", lot.price],
              ["Owner", lot.owner ?? "—"],
            ]}
          />
        </Card>
        <Card title="Location">
          <p className="muted">
            GIS geometry and map coordinates. In the full system this links to PostGIS spatial
            data and the interactive map.
          </p>
          <div className="kv" style={{ marginTop: "var(--space-3)" }}>
            <div className="kv__k">Coordinates</div><div className="kv__v">x {lot.x} · y {lot.y}</div>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: "var(--space-6)" }}>
        <Tabs tabs={["Ownership", "Interment", "Maintenance", "Documents"]} active={tab} onChange={setTab} />
        <Card>
          {tab === 0 && <p className="muted">Ownership and transfer history for this lot.</p>}
          {tab === 1 && <p className="muted">Interment records linked to this lot.</p>}
          {tab === 2 && <p className="muted">Maintenance and work orders.</p>}
          {tab === 3 && <p className="muted">Certificates, agreements, and permits.</p>}
        </Card>
      </div>
    </>
  );
}
