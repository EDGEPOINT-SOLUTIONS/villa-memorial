import { PageHeader, Badge, Button } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { INQUIRIES, type Inquiry } from "../lib/data";
import { useInbox } from "../lib/inbox";

const statusTone: Record<Inquiry["status"], "info" | "warning" | "success" | "neutral"> = {
  New: "info",
  Contacted: "warning",
  Consultation: "neutral",
  Arranged: "success",
};

const columns: Column<Inquiry>[] = [
  { key: "id", label: "Ref" },
  { key: "name", label: "Name", render: (i) => <span className="table__name">{i.name}</span> },
  { key: "channel", label: "Channel", render: (i) => <Badge tone="neutral">{i.channel}</Badge> },
  { key: "subject", label: "Subject" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status", render: (i) => <Badge tone={statusTone[i.status]}>{i.status}</Badge> },
];

export function InquiriesPage() {
  const { forms } = useInbox();
  // Public-site forms (register / contact / quote / appointment) surface at the
  // top of the queue as New "Website" inquiries so the demo round-trips.
  const webRows: Inquiry[] = forms.map((f) => ({
    id: f.id,
    name: f.name,
    channel: "Website",
    subject: f.subject,
    status: "New",
    date: f.date,
  }));
  return (
    <>
      <PageHeader
        eyebrow="Relationships"
        title="Inquiries"
        actions={<Button size="sm">+ New inquiry</Button>}
      />
      <p className="small muted" style={{ marginBottom: "var(--space-4)" }}>
        Lead → Inquiry → Consultation → Arrangement → Customer
      </p>
      <DataTable columns={columns} rows={[...webRows, ...INQUIRIES]} rowKey={(i) => i.id} />
    </>
  );
}
