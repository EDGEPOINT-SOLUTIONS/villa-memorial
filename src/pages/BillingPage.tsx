import { useState } from "react";
import { PageHeader, Card, Badge, Button } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { ConfirmDialog } from "../components/Modal";
import { useToast } from "../components/toast";
import { INVOICES, type Invoice } from "../lib/data";

const agingTone: Record<Invoice["aging"], "success" | "warning" | "danger"> = {
  Current: "success",
  "1–30": "warning",
  "31–60": "warning",
  "61–90": "danger",
  "90+": "danger",
};

const columns: Column<Invoice>[] = [
  { key: "id", label: "Invoice", render: (i) => <span className="table__name">{i.id}</span> },
  { key: "customer", label: "Customer" },
  { key: "reference", label: "Reference" },
  { key: "total", label: "Total", numeric: true },
  { key: "balance", label: "Balance", numeric: true },
  { key: "aging", label: "Aging", render: (i) => <Badge tone={agingTone[i.aging]}>{i.aging}</Badge> },
];

type Installment = Invoice["installments"][number];

const instColumns: Column<Installment>[] = [
  { key: "n", label: "#", numeric: true },
  { key: "due", label: "Due" },
  { key: "amount", label: "Amount", numeric: true },
  { key: "paid", label: "Paid", numeric: true },
  { key: "balance", label: "Balance", numeric: true },
  {
    key: "status",
    label: "Status",
    render: (i) => (
      <Badge tone={i.status === "Paid" ? "success" : i.status === "Overdue" ? "danger" : "warning"}>
        {i.status}
      </Badge>
    ),
  },
];

export function BillingPage() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function recordPayment() {
    setConfirmOpen(false);
    setSelected(null);
    toast("Payment recorded · receipt issued", "success");
  }

  return (
    <>
      <PageHeader eyebrow="Finance" title="Billing & collections" />

      <div className="toolbar">
        <select className="select" style={{ width: "auto" }} defaultValue="">
          <option value="" disabled>Status</option>
          <option>All</option>
          <option>Overdue</option>
        </select>
        <select className="select" style={{ width: "auto" }} defaultValue="">
          <option value="" disabled>Branch</option>
          <option>Isabela City</option>
        </select>
        <input className="input" style={{ maxWidth: "16rem" }} placeholder="Search customer…" />
      </div>

      <DataTable columns={columns} rows={INVOICES} rowKey={(i) => i.id} />

      <div style={{ marginTop: "var(--space-6)" }}>
        <Card
          title={selected ? `Installments — ${selected.customer}` : "Installments"}
          actions={
            selected ? (
              <Button size="sm" variant="accent" onClick={() => setConfirmOpen(true)}>
                Record payment
              </Button>
            ) : undefined
          }
        >
          {selected ? (
            <>
              <div className="kv" style={{ marginBottom: "var(--space-4)" }}>
                <div className="kv__k">Invoice</div><div className="kv__v">{selected.id}</div>
                <div className="kv__k">Balance</div><div className="kv__v">{selected.balance}</div>
                <div className="kv__k">Aging</div><div className="kv__v"><Badge tone={agingTone[selected.aging]}>{selected.aging}</Badge></div>
              </div>
              <DataTable columns={instColumns} rows={selected.installments} rowKey={(i) => String(i.n)} />
            </>
          ) : (
            <p className="muted">
              Select an invoice above to see its installment schedule and record a payment.
            </p>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Record a payment?"
        message={
          <p>
            You're recording a payment on <strong>{selected?.id}</strong> for{" "}
            <strong>{selected?.customer}</strong>. This will generate an official receipt and post
            to the ledger. Please confirm the amount before continuing.
          </p>
        }
        confirmLabel="Record payment"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={recordPayment}
      />
    </>
  );
}
