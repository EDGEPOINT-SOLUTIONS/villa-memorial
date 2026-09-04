import { useState } from "react";
import { PageHeader, Card, Button, Alert } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { ConfirmDialog } from "../components/Modal";
import { useToast } from "../components/toast";
import { JOURNAL, type JournalEntry } from "../lib/data";

const columns: Column<JournalEntry>[] = [
  { key: "date", label: "Date" },
  { key: "description", label: "Description" },
  { key: "account", label: "Account" },
  { key: "debit", label: "Debit", numeric: true },
  { key: "credit", label: "Credit", numeric: true },
  { key: "reference", label: "Reference" },
];

export function AccountingPage() {
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function post() {
    setConfirmOpen(false);
    toast("Journal entry posted to ledger", "success");
  }

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="General ledger"
        actions={<Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>Post entry</Button>}
      />

      <Alert tone="info">
        Posting to the ledger is irreversible. It is governed by configurable posting rules and
        always recorded in the audit trail.
      </Alert>

      <div style={{ marginTop: "var(--space-4)" }}>
        <Card title="Journal entries">
          <DataTable columns={columns} rows={JOURNAL} rowKey={(j) => j.id + j.account} />
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Post to ledger?"
        tone="danger"
        requireType="POST"
        message={
          <p>
            This posts the pending journal entry to the general ledger. This action{" "}
            <strong>cannot be undone</strong>. Type <strong>POST</strong> to continue.
          </p>
        }
        confirmLabel="Post to ledger"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={post}
      />
    </>
  );
}
