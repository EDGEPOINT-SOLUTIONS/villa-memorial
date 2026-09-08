import { PageHeader, Card, KpiTile, Badge } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";

const MONTHS = [
  { m: "Apr", v: 62 },
  { m: "May", v: 71 },
  { m: "Jun", v: 68 },
  { m: "Jul", v: 84 },
  { m: "Aug", v: 92 },
  { m: "Sep", v: 88 },
];

const BRANCHES = [
  { name: "Isabela City", v: 78 },
  { name: "Zamboanga", v: 55 },
  { name: "Basilan", v: 40 },
];

type Row = { label: string; value: string; delta: string };

const opsColumns: Column<Row>[] = [
  { key: "label", label: "Service" },
  { key: "value", label: "Volume", numeric: true },
  { key: "delta", label: "Change", numeric: true },
];

const OPS_ROWS: Row[] = [
  { label: "Burial services", value: "42", delta: "+6%" },
  { label: "Cremation", value: "18", delta: "+2%" },
  { label: "Chapel viewings", value: "37", delta: "-1%" },
  { label: "Lot sales", value: "12", delta: "+4%" },
];

export function ReportsPage() {
  return (
    <>
      <PageHeader eyebrow="Overview" title="Executive reports" />

      <div className="grid grid--4">
        <KpiTile label="Revenue (month)" value="₱ 1.24M" delta="+8%" />
        <KpiTile label="Collections" value="₱ 918k" delta="+5%" />
        <KpiTile label="Active cases" value="14" />
        <KpiTile label="Receivables" value="₱ 412k" delta="-3%" down />
      </div>

      <div className="split" style={{ marginTop: "var(--space-6)" }}>
        <Card title="Revenue over time">
          <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-3)", height: "160px", padding: "var(--space-2)" }}>
            {MONTHS.map((m) => (
              <div key={m.m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-2)" }}>
                <div
                  style={{
                    width: "100%",
                    height: `${m.v}%`,
                    background: "var(--color-accent-soft)",
                    borderRadius: "var(--radius-sm)",
                  }}
                />
                <span className="small muted">{m.m}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Receivables by branch">
          <div className="stack" style={{ padding: "var(--space-2)" }}>
            {BRANCHES.map((b) => (
              <div key={b.name}>
                <div style={{ display: "flex", justifyContent: "space-between" }} className="small">
                  <span>{b.name}</span>
                  <span className="muted">{b.v}%</span>
                </div>
                <div style={{ height: 8, background: "var(--granite-100)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${b.v}%`, height: "100%", background: "var(--granite-500)" }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: "var(--space-6)" }}>
        <Card
          title="Utilization"
          actions={<Badge tone="accent">Drill-down enabled</Badge>}
        >
          <DataTable columns={opsColumns} rows={OPS_ROWS} rowKey={(r) => r.label} />
        </Card>
      </div>
    </>
  );
}
