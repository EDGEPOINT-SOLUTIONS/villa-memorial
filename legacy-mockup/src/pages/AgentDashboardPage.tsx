import { Link } from "react-router-dom";
import { PageHeader, Card, Badge, Button, KpiTile } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { INQUIRIES, PLANS, type Inquiry } from "../lib/data";

const inquiryTone: Record<Inquiry["status"], "info" | "warning" | "neutral" | "success"> = {
  New: "info",
  Contacted: "warning",
  Consultation: "neutral",
  Arranged: "success",
};

const inquiryColumns: Column<Inquiry>[] = [
  { key: "name", label: "Lead", render: (i) => <span className="table__name">{i.name}</span> },
  { key: "channel", label: "Channel", render: (i) => <Badge tone="neutral">{i.channel}</Badge> },
  { key: "subject", label: "Interest" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status", render: (i) => <Badge tone={inquiryTone[i.status]}>{i.status}</Badge> },
];

export function AgentDashboardPage() {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar__brand">
          <p className="app-sidebar__eyebrow">Villa Memorial</p>
          <p className="app-sidebar__title">Agent portal</p>
        </div>
        <nav className="app-sidebar__nav" aria-label="Agent">
          <div className="app-sidebar__section">
            <span className="app-sidebar__label">Sales</span>
            <Link to="/agent/dashboard" className="app-sidebar__link app-sidebar__link--active">
              Dashboard
            </Link>
            <Link to="/site/plans" className="app-sidebar__link">Plan catalog</Link>
            <Link to="/site/lots" className="app-sidebar__link">Lot catalog</Link>
            <Link to="/site/map" className="app-sidebar__link">Park map</Link>
          </div>
        </nav>
        <div className="app-sidebar__footer">
          <Link to="/login" className="btn btn--ghost btn--sm" style={{ color: "#fff" }}>
            Switch to staff
          </Link>
        </div>
      </aside>

      <div className="app-main">
        <div className="topbar">
          <div className="topbar__context">
            <span className="topbar__tenant">Villa Memorial</span>
            <span className="topbar__branch">Sales agent · Maria Fernandez</span>
          </div>
          <span className="chip">Demo · no backend</span>
        </div>

        <div className="content">
          <PageHeader eyebrow="Agent portal" title="Good day, Maria" />

          <div className="grid grid--4">
            <KpiTile label="My active leads" value="12" />
            <KpiTile label="Sales this month" value="₱ 214,000" delta="+6%" />
            <KpiTile label="Commission earned" value="₱ 10,700" />
            <KpiTile label="Mature plans" value="3" />
          </div>

          <div style={{ marginTop: "var(--space-6)" }}>
            <Card title="My leads" actions={<Button size="sm">+ New lead</Button>}>
              <DataTable columns={inquiryColumns} rows={INQUIRIES} rowKey={(i) => i.id} />
            </Card>
          </div>

          <div style={{ marginTop: "var(--space-6)" }}>
            <Card title="Plans I can offer">
              <table className="table" style={{ margin: "-1px" }}>
                <thead>
                  <tr><th>Plan</th><th className="table__numeric">Price</th><th className="table__numeric">Commission</th></tr>
                </thead>
                <tbody>
                  {PLANS.slice(0, 4).map((p) => (
                    <tr key={p.id}>
                      <td className="table__name">{p.name}</td>
                      <td className="table__numeric">{p.price}</td>
                      <td className="table__numeric">5%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
