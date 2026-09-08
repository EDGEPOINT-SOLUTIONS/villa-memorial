import { useNavigate } from "react-router-dom";
import { useDemo } from "../lib/demo";
import { PageHeader, KpiTile, Card, Badge } from "../components/ui";
import { CASES, SCHEDULE, AUDIT } from "../lib/data";

type Kpi = { label: string; value: string; delta?: string; down?: boolean; to: string };

const KPIS: Record<string, Kpi[]> = {
  executive: [
    { label: "Revenue (month)", value: "₱ 1.24M", delta: "+8%", to: "/reports" },
    { label: "Active cases", value: "14", to: "/cases" },
    { label: "Completed services", value: "128", to: "/cases" },
    { label: "Receivables", value: "₱ 412k", delta: "-3%", down: true, to: "/billing" },
  ],
  manager: [
    { label: "Today's services", value: "5", to: "/schedule" },
    { label: "Pending cases", value: "7", to: "/cases" },
    { label: "Payments today", value: "₱ 86,000", to: "/billing" },
    { label: "Open tasks", value: "11", to: "/cases" },
  ],
  accountant: [
    { label: "Receivables", value: "₱ 412k", to: "/billing" },
    { label: "Overdue accounts", value: "23", to: "/billing" },
    { label: "Collected (month)", value: "₱ 918k", delta: "+5%", to: "/reports" },
    { label: "Unposted entries", value: "4", to: "/accounting" },
  ],
  embalmer: [
    { label: "My tasks today", value: "3", to: "/cases" },
    { label: "Preparation queue", value: "2", to: "/cases" },
    { label: "Scheduled this week", value: "9", to: "/schedule" },
  ],
  cashier: [
    { label: "Payments today", value: "₱ 86,000", to: "/billing" },
    { label: "Receipts issued", value: "17", to: "/documents" },
    { label: "Overdue", value: "23", to: "/billing" },
  ],
};

const DEFAULT_KPIS: Kpi[] = KPIS.executive;

export function DashboardPage() {
  const { role, tenant } = useDemo();
  const navigate = useNavigate();
  const kpis = KPIS[role.id] ?? DEFAULT_KPIS;

  return (
    <>
      <PageHeader
        eyebrow={`${tenant.name} · ${tenant.branch}`}
        title={`Good day, ${role.label}`}
        actions={<Badge tone="accent">Role view: {role.label}</Badge>}
      />

      <div className={`grid ${kpis.length === 3 ? "grid--3" : "grid--4"}`}>
        {kpis.map((k) => (
          <KpiTile key={k.label} {...k} onClick={() => navigate(k.to)} />
        ))}
      </div>

      <div className="split" style={{ marginTop: "var(--space-6)" }}>
        <Card title="Upcoming services">
          <table className="table" style={{ margin: "-1px" }}>
            <thead>
              <tr>
                <th>Service</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {SCHEDULE.slice(0, 4).map((b) => (
                <tr key={b.id}>
                  <td>
                    <div className="table__name">{b.title}</div>
                    <div className="table__sub">{b.resource}</div>
                  </td>
                  <td className="nowrap">
                    {b.date} · {b.time}
                  </td>
                  <td>
                    <Badge tone={b.status === "Booked" ? "info" : b.status === "Complete" ? "success" : "neutral"}>
                      {b.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Active cases">
          <table className="table" style={{ margin: "-1px" }}>
            <thead>
              <tr>
                <th>Deceased</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {CASES.slice(0, 4).map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="table__name" style={{ fontFamily: "var(--font-serif)" }}>
                      {c.deceased}
                    </div>
                    <div className="table__sub">{c.id}</div>
                  </td>
                  <td>{c.type}</td>
                  <td>
                    <Badge
                      tone={
                        c.status === "In service"
                          ? "info"
                          : c.status === "Completed"
                            ? "success"
                            : "warning"
                      }
                    >
                      {c.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div style={{ marginTop: "var(--space-6)" }}>
        <Card title="Recent activity">
          <table className="table" style={{ margin: "-1px" }}>
            <tbody>
              {AUDIT.slice(0, 4).map((a) => (
                <tr key={a.id}>
                  <td className="nowrap">{a.when}</td>
                  <td>
                    <span className="table__name">{a.actor}</span> {a.action}
                  </td>
                  <td className="table__sub">{a.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
