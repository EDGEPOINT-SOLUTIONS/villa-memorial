import Link from "next/link";
import { DataTable, StatCard, StatusChip, type DataTableColumn } from "@/components/kit";
import { ReceivablesAging } from "@/components/staff/receivables-aging";
import { PageHeader } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listInvoices, type Invoice } from "@/lib/api-client/finance";
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_TONE } from "@/lib/api-client/billing-derive";
import { listFixturePayments } from "@/lib/api-client/billing-store";
import { outstandingCents } from "@/lib/billing-payments";
import { invoiceOverdue } from "@/lib/payment-alerts";
import {
  agingBucketFor,
  AGING_BUCKET_LABEL,
  duesAging,
  outstandingTotal,
  overdueTotal,
  receivedInPeriod,
} from "@/lib/receivables";
import { formatMinorUnits } from "@/lib/money";
import { monthBoundsOf } from "@/lib/period";
import { businessToday } from "@/lib/contracts/payment-capture";
import type { RecordedPayment } from "@/lib/billing-payments";

export const metadata = { title: "Billing & collections — Admin Portal" };

/**
 * Billing & collections — the office's collections desk.
 *
 * WHAT LEADS: the figures. What is owed (outstanding), what is late (overdue), what
 * the counter received this month, and how many invoices are open. The aging strip
 * answers "since when": each bucket is DERIVED from the invoice's own due date and
 * balance (`lib/receivables.ts`), the same rule Accounting prints, never the seed's
 * stored bucket.
 *
 * THE WORK LIST: every recorded invoice, newest money first, with ONE action per row
 * — record a payment against an open invoice when the session may write, open the
 * record otherwise. The customer name opens the invoice that names them.
 *
 * WHAT WAS RECEIVED: the counter payment journal with the official receipt each
 * payment issued. A receipt is printed only where one was recorded.
 *
 * HONESTY. A figure with no record prints "—", never "₱0.00" — an absent number must
 * not read as recorded money. Nothing here writes: recording is the record-payment
 * screen's own action, reached from the row.
 */

type BillingSearch = { status?: string };

type ReceiptRow = {
  document_number: string;
  document_id: string;
  received_on: string;
  payer: string;
  invoice_number: string;
  amount_cents: number;
};

/** One official receipt per recorded payment that issued one. */
function officialReceipts(
  payments: readonly RecordedPayment[],
  invoices: readonly Invoice[],
): ReceiptRow[] {
  const byNumber = new Map(invoices.map((invoice) => [invoice.invoice_number, invoice]));
  return payments
    .filter((payment) => payment.receipt_document !== null)
    .map((payment) => ({
      document_number: payment.receipt_document?.document_number ?? "",
      document_id: payment.receipt_document?.id ?? "",
      received_on: payment.received_on,
      payer: byNumber.get(payment.invoice_number)?.customer_name ?? "",
      invoice_number: payment.invoice_number,
      amount_cents: payment.amount_cents,
    }))
    .sort((a, b) => b.received_on.localeCompare(a.received_on));
}

const RECEIPT_COLUMNS: ReadonlyArray<DataTableColumn<ReceiptRow>> = [
  { key: "received", header: "Received", className: "nowrap" },
  { key: "payer", header: "Payer" },
  { key: "invoice", header: "Invoice" },
  { key: "receipt", header: "Receipt" },
  { key: "amount", header: "Amount", numeric: true },
];

/** A day as the office writes it, or the raw value when it cannot be parsed. */
function shortDay(value: string): string {
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<BillingSearch>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["billing:read"])) {
    return (
      <>
        <PageHeader title="Billing & collections" />
        <ForbiddenState requiredScopes={["billing:read"]} />
      </>
    );
  }

  const now = new Date();
  const [invoicesResult, paymentsResult] = await Promise.allSettled([
    listInvoices(now),
    listFixturePayments(),
  ]);

  const invoices = invoicesResult.status === "fulfilled" ? invoicesResult.value : null;
  const payments = paymentsResult.status === "fulfilled" ? paymentsResult.value : null;

  if (invoices === null) {
    return (
      <>
        <PageHeader title="Billing & collections" />
        <ErrorState message="Unable to load the billing records." />
      </>
    );
  }

  const { status } = await searchParams;
  const statusFilter = (status ?? "").trim();
  const canRecordPayments = hasAnyScope(session.scopes, ["billing:write"]);

  const month = monthBoundsOf(businessToday(now));
  const balanceOf = (invoice: Invoice) => outstandingCents(invoice);
  const openInvoices = invoices.filter((invoice) => balanceOf(invoice) > 0);
  const aging = duesAging(invoices, now);
  const outstanding = outstandingTotal(invoices);
  const overdue = overdueTotal(invoices, now);
  const received = payments ? receivedInPeriod(payments, month) : null;
  const receipts = payments ? officialReceipts(payments, invoices) : null;

  const filtered = openInvoices
    .filter((invoice) => {
      if (statusFilter === "overdue") return invoiceOverdue(invoice, now);
      if (statusFilter) return invoice.status === statusFilter;
      return true;
    })
    .sort((a, b) => {
      const aOver = invoiceOverdue(a, now) ? 1 : 0;
      const bOver = invoiceOverdue(b, now) ? 1 : 0;
      if (aOver !== bOver) return bOver - aOver;
      return a.due_at.localeCompare(b.due_at);
    });

  return (
    <div className="stack-4">
      <PageHeader
        title="Billing & collections"
        lead="The collections desk."
        actions={
          <>
            <Link
              href="/staff/billing/provisional-receipts"
              className="btn btn--secondary btn--sm"
            >
              Provisional receipts
            </Link>
            {canRecordPayments ? (
              <Link href="/staff/billing/record-payment" className="btn btn--primary btn--sm">
                Record payment
              </Link>
            ) : null}
          </>
        }
      />

      <div className="kpi-grid">
        <StatCard
          label="Outstanding"
          value={
            invoices.length === 0 || openInvoices.length === 0
              ? "—"
              : formatMinorUnits(outstanding)
          }
          sub={
            invoices.length === 0
              ? "no invoice recorded"
              : openInvoices.length === 0
                ? "nothing owed"
                : `${openInvoices.length} open invoice${openInvoices.length === 1 ? "" : "s"}`
          }
        />
        <StatCard
          label="Overdue"
          value={overdue.count === 0 ? "—" : formatMinorUnits(overdue.amount_cents)}
          sub={
            invoices.length === 0
              ? "no invoice recorded"
              : overdue.count === 0
                ? "nothing past due"
                : `${overdue.count} account${overdue.count === 1 ? "" : "s"} past due`
          }
        />
        <StatCard
          label="Received this month"
          value={received === null || received.count === 0 ? "—" : formatMinorUnits(received.total_cents)}
          sub={
            received === null
              ? "the payment journal could not be read"
              : received.count === 0
                ? "no payment recorded this month"
                : `${received.count} payment${received.count === 1 ? "" : "s"} at the counter`
          }
        />
        <StatCard
          label="Open invoices"
          value={openInvoices.length}
          sub={`of ${invoices.length} on record`}
        />
      </div>

      <section className="card">
        <div className="card__header">
          <h2>Since when</h2>
        </div>
        <div className="card__body">
          <ReceivablesAging rows={aging} testId="billing-aging" />
        </div>
      </section>

      <section>
        <form className="filter-bar" role="search">
          <select
            className="select"
            name="status"
            defaultValue={statusFilter}
            aria-label="Filter open invoices"
          >
            <option value="">All open</option>
            <option value="overdue">Overdue</option>
            <option value="pending">Pending</option>
            <option value="partial">Part paid</option>
          </select>
          <button className="btn btn--primary btn--sm" type="submit">
            Filter
          </button>
          {statusFilter ? (
            <Link className="btn btn--ghost btn--sm" href="/staff/billing">
              Clear
            </Link>
          ) : null}
        </form>

        <DataTable<Invoice>
          label="Open invoices"
          columns={[
            { key: "customer", header: "Customer" },
            { key: "invoice", header: "Invoice" },
            { key: "order", header: "Order" },
            { key: "due", header: "Due", className: "nowrap" },
            { key: "age", header: "Age" },
            { key: "outstanding", header: "Outstanding", numeric: true },
            { key: "status", header: "Status" },
            { key: "action", header: "", className: "nowrap" },
          ]}
          rows={filtered}
          rowKey={(invoice) => invoice.id}
          renderCell={(invoice, column) => {
            switch (column.key) {
              case "customer":
                return invoice.customer_name || "—";
              case "invoice":
                return (
                  <Link
                    href={`/staff/billing/invoices/${encodeURIComponent(invoice.invoice_number)}`}
                    aria-label={`Open invoice ${invoice.invoice_number}`}
                  >
                    <code>{invoice.invoice_number}</code>
                  </Link>
                );
              case "order":
                return invoice.order_number ? (
                  <code>{invoice.order_number}</code>
                ) : (
                  <span className="text-muted">—</span>
                );
              case "due":
                return shortDay(invoice.due_at);
              case "age":
                return AGING_BUCKET_LABEL[agingBucketFor(invoice.due_at, now)];
              case "outstanding":
                return formatMinorUnits(balanceOf(invoice), invoice.currency);
              case "status":
                return (
                  <StatusChip tone={INVOICE_STATUS_TONE[invoice.status]}>
                    {INVOICE_STATUS_LABEL[invoice.status]}
                  </StatusChip>
                );
              case "action":
                return canRecordPayments ? (
                  <Link
                    href={`/staff/billing/record-payment?invoice=${encodeURIComponent(invoice.invoice_number)}`}
                    className="btn btn--primary btn--sm"
                  >
                    Record payment
                  </Link>
                ) : (
                  <Link
                    href={`/staff/billing/invoices/${encodeURIComponent(invoice.invoice_number)}`}
                    className="btn btn--secondary btn--sm"
                  >
                    Open
                  </Link>
                );
              default:
                return null;
            }
          }}
          caption={
            <>
              Every invoice that still owes money, past due first, then nearest due date.
              Aging is derived from the invoice&rsquo;s own due date.
            </>
          }
          emptyTitle={statusFilter ? "No open invoice matches" : "No invoice owes money"}
          emptyHint={
            statusFilter
              ? "Clear the filter to see every open invoice."
              : "An invoice appears here once an order is billed; a settled one leaves the list."
          }
        />
      </section>

      <section>
        <h2 className="page-section-title">Received</h2>
        {receipts === null ? (
          <ErrorState message="The counter payment journal could not be read." />
        ) : (
          <DataTable<ReceiptRow>
            label="Received payments"
            columns={RECEIPT_COLUMNS}
            rows={receipts}
            rowKey={(row) => row.document_id || `${row.invoice_number}-${row.received_on}`}
            renderCell={(row, column) => {
              switch (column.key) {
                case "received":
                  return shortDay(row.received_on);
                case "payer":
                  return row.payer || <span className="text-muted">—</span>;
                case "invoice":
                  return <code>{row.invoice_number}</code>;
                case "receipt":
                  return row.document_id ? (
                    <Link href={`/staff/documents/${encodeURIComponent(row.document_id)}`}>
                      <code>{row.document_number}</code>
                    </Link>
                  ) : (
                    <span className="text-muted">—</span>
                  );
                case "amount":
                  return formatMinorUnits(row.amount_cents);
                default:
                  return null;
              }
            }}
            caption={<>Every payment the counter recorded, with the official receipt it issued.</>}
            emptyTitle="No payment recorded yet"
            emptyHint="A payment taken at the counter appears here with its official receipt."
          />
        )}
      </section>
    </div>
  );
}
