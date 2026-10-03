import Link from "next/link";
import {
  DataTable,
  EmptyState,
  StatCard,
  StatusChip,
  type DataTableColumn,
} from "@/components/kit";
import { ReceivablesAging } from "@/components/staff/receivables-aging";
import { PageHeader } from "@/components/ui/page";
import { Alert } from "@/components/ui/alert";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { ACCOUNTING_NOT_WIRED, loadAccountingLedger } from "@/lib/api-client/accounting";
import { ApiError } from "@/lib/api-client/api-error";
import {
  ACCOUNT_TYPE_LABEL,
  buildTrialBalance,
  entryTotalCents,
  filterEntriesByPeriod,
  type JournalEntry,
  type TrialBalanceRow,
} from "@/lib/accounting";
import { listFixturePayments } from "@/lib/api-client/billing-store";
import { listInvoices, type Invoice } from "@/lib/api-client/finance";
import { listProvisionalReceipts } from "@/lib/api-client/provisional-receipts";
import { listEngagementViews, type EngagementView } from "@/lib/api-client/lifecycle";
import { INSTRUMENT_LABEL, businessToday } from "@/lib/contracts/payment-capture";
import type { ProvisionalReceiptRecord } from "@/lib/contracts/provisional-receipt-capture";
import {
  agingBucketFor,
  AGING_BUCKET_LABEL,
  duesAging,
  outstandingCents,
  outstandingTotal,
  overdueTotal,
  receivedInPeriod,
} from "@/lib/receivables";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { formatMinorUnits } from "@/lib/money";
import { datePeriod, monthBoundsOf, periodIsAll, periodLabel } from "@/lib/period";
import {
  ENGAGEMENT_KIND_LABEL,
  balanceLine,
  engagementStateLabel,
  engagementTone,
  nextDueLine,
} from "@/lib/lifecycle";
import type { RecordedPayment } from "@/lib/billing-payments";

export const metadata = { title: "Accounting — Admin Portal" };

/**
 * Staff Accounting — the office's books as a working tool, not a display page.
 *
 * THREE READS, ONE HONESTY. Every figure comes from a recorded source: the ledger
 * (`lib/accounting.ts`, app-authored books with provenance), the counter payment
 * journal and the billing invoices, and the lifecycle store the member/client
 * registers fold. The trial balance and the chart of accounts are DERIVED from the
 * journal — never stored beside it — so the two halves cannot disagree. A figure
 * with no record prints "—", never "₱0.00".
 *
 * THE FOUR VIEWS (query-param tabs, server-rendered):
 *   · Books — the whole chart of accounts with the window's movement, the journal,
 *     and the period filter;
 *   · Receivables — dues aging derived from each invoice's due date, the open
 *     invoices, and every member/client whose own accounting opens from here
 *     (`/staff/lifecycle/[id]`: recorded payments + the amortization schedule);
 *   · Receipts — the official receipts a recorded payment issued, and the counter's
 *     provisional slips;
 *   · Reconciliation — the two flag types the office must look at, each naming the
 *     feed it needs; no flag is fabricated as ₱0.
 *
 * POSTING IS NOT HERE. No staff-facing ledger API has frozen, so there is no
 * posting control and the screen says so. The missing surfaces (expenses, statements)
 * are named rather than rendered as empty tables that read as ₱0.
 */

type AccountingTab = "books" | "receivables" | "receipts" | "reconciliation";

const TABS: ReadonlyArray<{ key: AccountingTab; label: string }> = [
  { key: "books", label: "Books" },
  { key: "receivables", label: "Receivables" },
  { key: "receipts", label: "Receipts" },
  { key: "reconciliation", label: "Reconciliation" },
];

function isTab(value: unknown): value is AccountingTab {
  return typeof value === "string" && TABS.some((tab) => tab.key === value);
}

type AccountingSearch = { view?: string; from?: string; to?: string };

const ACCOUNT_COLUMNS: ReadonlyArray<DataTableColumn<TrialBalanceRow>> = [
  { key: "account", header: "Account" },
  { key: "type", header: "Type" },
  { key: "debit", header: "Debit", numeric: true },
  { key: "credit", header: "Credit", numeric: true },
  { key: "balance", header: "Balance", numeric: true, className: "nowrap" },
];

const JOURNAL_COLUMNS: ReadonlyArray<DataTableColumn<JournalEntry>> = [
  { key: "date", header: "Date", className: "nowrap" },
  { key: "reference", header: "Reference" },
  { key: "description", header: "Description" },
  { key: "amount", header: "Amount", numeric: true },
  { key: "against", header: "Against" },
];

/** A calendar day or an ISO instant as the office writes it, or the raw value. */
function formatDay(date: string): string {
  const parsed = new Date(date.length === 10 ? `${date}T00:00:00Z` : date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

/** A money cell that names an absent figure instead of printing a zero. */
function moneyOrBlank(cents: number): string {
  return cents > 0 ? formatMinorUnits(cents) : "—";
}

/** One official receipt issued with a recorded payment: the payment's own document. */
type OfficialReceiptRow = {
  document_number: string;
  document_id: string;
  received_on: string;
  payer: string;
  invoice_number: string;
  amount_cents: number;
};

function officialReceipts(
  payments: readonly RecordedPayment[],
  invoices: readonly Invoice[],
): OfficialReceiptRow[] {
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

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<AccountingSearch>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["accounting:read"])) {
    return (
      <>
        <PageHeader title="Accounting" />
        <ForbiddenState requiredScopes={["accounting:read"]} />
      </>
    );
  }

  let ledger;
  try {
    ledger = await loadAccountingLedger();
  } catch (err) {
    return (
      <>
        <PageHeader title="Accounting" />
        <ErrorState
          message={err instanceof ApiError ? err.message : "Unable to load the recorded ledger."}
        />
      </>
    );
  }

  const params = await searchParams;
  const tab: AccountingTab = isTab(params.view) ? params.view : "books";
  const period = datePeriod(params.from, params.to);
  const entries = filterEntriesByPeriod(ledger.entries, period);
  // The chart lists EVERY account; the amount columns still derive from the entries.
  const chart = buildTrialBalance(ledger.accounts, entries, { includeZeroMovement: true });
  const journalEntries = [...entries].sort((a, b) =>
    a.date === b.date ? a.id.localeCompare(b.id) : b.date.localeCompare(a.date),
  );

  const canOpenCases = hasAnyScope(session.scopes, ["cases:read"]);
  const canOpenOrders = hasAnyScope(session.scopes, ["orders:read"]);
  const canSeeBilling = hasAnyScope(session.scopes, ["billing:read"]);
  const canSeeClients = hasAnyScope(session.scopes, ["cases:read"]);

  const now = new Date();
  const month = monthBoundsOf(businessToday(now));

  const [invoicesResult, paymentsResult, provisionalResult, clientsResult] = await Promise.allSettled([
    canSeeBilling ? listInvoices(now) : Promise.resolve(null),
    canSeeBilling ? listFixturePayments() : Promise.resolve(null),
    canSeeBilling ? listProvisionalReceipts() : Promise.resolve(null),
    canSeeClients ? listEngagementViews(now) : Promise.resolve(null),
  ]);

  const invoices = invoicesResult.status === "fulfilled" ? invoicesResult.value : null;
  const payments = paymentsResult.status === "fulfilled" ? paymentsResult.value : null;
  const provisional = provisionalResult.status === "fulfilled" ? provisionalResult.value : null;
  const clients = clientsResult.status === "fulfilled" ? clientsResult.value : null;

  const openInvoices = invoices ? invoices.filter((invoice) => outstandingCents(invoice) > 0) : null;
  const aging = invoices ? duesAging(invoices, now) : null;
  const outstanding = invoices ? outstandingTotal(invoices) : null;
  const overdue = invoices ? overdueTotal(invoices, now) : null;
  const received = payments ? receivedInPeriod(payments, month) : null;
  const receipts = payments && invoices ? officialReceipts(payments, invoices) : null;

  const tabHref = (key: AccountingTab) =>
    key === "books" ? "/staff/accounting" : `/staff/accounting?view=${key}`;
  const moved = entries.length > 0;

  return (
    <div className="stack-4">
      <PageHeader
        title="Accounting"
        lead="The office's books."
        actions={<StatusChip tone="neutral">Read-only</StatusChip>}
      />

      <p className="text-sm text-muted" style={{ margin: 0 }}>
        {ACCOUNTING_NOT_WIRED}
      </p>

      <nav className="lot-rec-tabs" aria-label="Accounting views">
        <ul>
          {TABS.map((item) => (
            <li key={item.key}>
              <Link href={tabHref(item.key)} aria-current={item.key === tab ? "page" : undefined}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {tab === "books" ? (
        <BooksView
          chart={chart}
          journalEntries={journalEntries}
          moved={moved}
          period={period}
          recordedPeriod={ledger.recorded_period}
          totalRecorded={ledger.entries.length}
          canOpenCases={canOpenCases}
          canOpenOrders={canOpenOrders}
        />
      ) : null}

      {tab === "receivables" ? (
        <ReceivablesView
          canSeeBilling={canSeeBilling}
          canSeeClients={canSeeClients}
          aging={aging}
          openInvoices={openInvoices}
          outstanding={outstanding}
          overdue={overdue}
          received={received}
          receivedCount={received?.count ?? null}
          clients={clients}
          now={now}
        />
      ) : null}

      {tab === "receipts" ? (
        <ReceiptsView
          canSeeBilling={canSeeBilling}
          receipts={receipts}
          provisional={provisional}
        />
      ) : null}

      {tab === "reconciliation" ? <ReconciliationView /> : null}
    </div>
  );
}

/* -------------------------------- Books ---------------------------------- */

function BooksView({
  chart,
  journalEntries,
  moved,
  period,
  recordedPeriod,
  totalRecorded,
  canOpenCases,
  canOpenOrders,
}: {
  chart: ReturnType<typeof buildTrialBalance>;
  journalEntries: JournalEntry[];
  moved: boolean;
  period: ReturnType<typeof datePeriod>;
  recordedPeriod: { from: string | null; to: string | null };
  totalRecorded: number;
  canOpenCases: boolean;
  canOpenOrders: boolean;
}) {
  return (
    <>
      <div className="kpi-grid">
        <StatCard
          label="Entries in period"
          value={journalEntries.length}
          sub={`of ${totalRecorded} recorded`}
        />
        <StatCard
          label="Total debits"
          value={moneyOrBlank(chart.total_debit_cents)}
          sub={`over ${chart.rows.filter((row) => row.debit_cents > 0 || row.credit_cents > 0).length} accounts moved`}
        />
        <StatCard
          label="Total credits"
          value={moneyOrBlank(chart.total_credit_cents)}
          sub="must equal debits"
        />
        <StatCard
          label="Books"
          value={
            !moved ? (
              <StatusChip tone="neutral">Nothing posted</StatusChip>
            ) : chart.balanced ? (
              <StatusChip tone="success">Balanced</StatusChip>
            ) : (
              <StatusChip tone="danger">Out of balance</StatusChip>
            )
          }
          sub="debits = credits, per entry"
        />
      </div>

      <section>
        <form className="filter-bar" role="search">
          <input
            className="input"
            type="date"
            name="from"
            defaultValue={period.from ?? ""}
            aria-label="From date"
          />
          <input
            className="input"
            type="date"
            name="to"
            defaultValue={period.to ?? ""}
            aria-label="To date"
          />
          <button className="btn btn--primary btn--sm" type="submit">
            Apply period
          </button>
          {!periodIsAll(period) ? (
            <Link className="btn btn--ghost btn--sm" href="/staff/accounting">
              Clear
            </Link>
          ) : null}
        </form>
        <p className="text-sm text-muted">
          Showing {periodLabel(period)}. The recorded books cover {periodLabel(recordedPeriod)}.
        </p>

        <h2 className="page-section-title">Chart of accounts</h2>
        <DataTable<TrialBalanceRow>
          label="Chart of accounts"
          columns={ACCOUNT_COLUMNS}
          rows={chart.rows}
          rowKey={(row) => row.code}
          renderCell={(row, column) => {
            switch (column.key) {
              case "account":
                return (
                  <>
                    <div className="table__name">{row.name}</div>
                    <div className="table__sub">
                      <code>{row.code}</code>
                    </div>
                  </>
                );
              case "type":
                return row.type ? ACCOUNT_TYPE_LABEL[row.type] : "—";
              case "debit":
                return moneyOrBlank(row.debit_cents);
              case "credit":
                return moneyOrBlank(row.credit_cents);
              case "balance":
                return row.balance_side === null
                  ? "—"
                  : `${formatMinorUnits(Math.abs(row.balance_cents))} ${
                      row.balance_side === "debit" ? "Dr" : "Cr"
                    }`;
              default:
                return null;
            }
          }}
          caption={<>Every account the chart defines; the amounts are the period&rsquo;s movement.</>}
          emptyTitle="No account in the chart"
          emptyHint="The chart of accounts is empty; there is nothing to balance."
          footer={
            <tr>
              <th scope="row">Total</th>
              <td />
              <td className="table__numeric">{moneyOrBlank(chart.total_debit_cents)}</td>
              <td className="table__numeric">{moneyOrBlank(chart.total_credit_cents)}</td>
              <td className="table__numeric">—</td>
            </tr>
          }
        />
      </section>

      {journalEntries.length > 0 ? (
        <section>
          <h2 className="page-section-title">Journal</h2>
          <DataTable<JournalEntry>
            label="Journal entries"
            columns={JOURNAL_COLUMNS}
            rows={journalEntries}
            rowKey={(entry) => entry.id}
            renderCell={(entry, column) => {
              switch (column.key) {
                case "date":
                  return formatDay(entry.date);
                case "reference":
                  return <code>{entry.reference}</code>;
                case "description":
                  return entry.description;
                case "amount":
                  return formatMinorUnits(entryTotalCents(entry));
                case "against":
                  return entry.case_number || entry.order_number ? (
                    <span className="nowrap">
                      {entry.case_number ? (
                        canOpenCases ? (
                          <Link href={`/staff/cases/${encodeURIComponent(entry.case_number)}`}>
                            <code>{entry.case_number}</code>
                          </Link>
                        ) : (
                          <code>{entry.case_number}</code>
                        )
                      ) : null}
                      {entry.case_number && entry.order_number ? " · " : null}
                      {entry.order_number ? (
                        canOpenOrders ? (
                          <Link href={`/staff/orders/${encodeURIComponent(entry.order_number)}`}>
                            <code>{entry.order_number}</code>
                          </Link>
                        ) : (
                          <code>{entry.order_number}</code>
                        )
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  );
                default:
                  return null;
              }
            }}
            caption={<>Read-only: this product displays accounting, it does not post to it.</>}
            emptyTitle="No entries in this period"
            emptyHint="Widen the dates or clear the period to see the recorded ledger."
          />
        </section>
      ) : null}
    </>
  );
}

/* ------------------------------ Receivables ------------------------------ */

function ReceivablesView({
  canSeeBilling,
  canSeeClients,
  aging,
  openInvoices,
  outstanding,
  overdue,
  received,
  receivedCount,
  clients,
  now,
}: {
  canSeeBilling: boolean;
  canSeeClients: boolean;
  aging: ReturnType<typeof duesAging> | null;
  openInvoices: Invoice[] | null;
  outstanding: number | null;
  overdue: ReturnType<typeof overdueTotal> | null;
  received: ReturnType<typeof receivedInPeriod> | null;
  receivedCount: number | null;
  clients: EngagementView[] | null;
  now: Date;
}) {
  return (
    <>
      <div className="kpi-grid">
        <StatCard
          label="Outstanding"
          value={outstanding === null || !openInvoices || openInvoices.length === 0 ? "—" : formatMinorUnits(outstanding)}
          sub={
            !canSeeBilling
              ? "needs billing:read"
              : openInvoices && openInvoices.length > 0
                ? `${openInvoices.length} open invoice${openInvoices.length === 1 ? "" : "s"}`
                : "nothing owed"
          }
        />
        <StatCard
          label="Overdue"
          value={overdue === null || overdue.count === 0 ? "—" : formatMinorUnits(overdue.amount_cents)}
          sub={
            !canSeeBilling
              ? "needs billing:read"
              : overdue && overdue.count > 0
                ? `${overdue.count} account${overdue.count === 1 ? "" : "s"} past due`
                : "nothing past due"
          }
        />
        <StatCard
          label="Received this month"
          value={received === null || receivedCount === 0 ? "—" : formatMinorUnits(received.total_cents)}
          sub={
            !canSeeBilling
              ? "needs billing:read"
              : receivedCount && receivedCount > 0
                ? `${receivedCount} payment${receivedCount === 1 ? "" : "s"} at the counter`
                : "no payment recorded this month"
          }
        />
        <StatCard
          label="Client accounts"
          value={clients?.length ?? "—"}
          sub={canSeeClients ? "open one for its schedule" : "needs cases:read"}
        />
      </div>

      <section className="card">
        <div className="card__header">
          <h2>Dues aging</h2>
        </div>
        <div className="card__body">
          {aging === null ? (
            <Alert tone="info">
              <p className="mb-0">
                {canSeeBilling
                  ? "The invoices could not be read just now, so aging is unavailable."
                  : "Aging needs billing:read — the invoices live in the billing records."}
              </p>
            </Alert>
          ) : (
            <ReceivablesAging rows={aging} testId="accounting-aging" />
          )}
        </div>
      </section>

      <section>
        <h2 className="page-section-title">Open invoices</h2>
        {openInvoices === null ? (
          <Alert tone="info">
            <p className="mb-0">
              {canSeeBilling
                ? "The invoices could not be read just now."
                : "Open invoices need billing:read."}
            </p>
          </Alert>
        ) : (
          <DataTable<Invoice>
            label="Open invoices"
            columns={[
              { key: "customer", header: "Client" },
              { key: "invoice", header: "Invoice" },
              { key: "due", header: "Due", className: "nowrap" },
              { key: "age", header: "Age" },
              { key: "outstanding", header: "Outstanding", numeric: true },
            ]}
            rows={openInvoices}
            rowKey={(invoice) => invoice.id}
            renderCell={(invoice, column) => {
              switch (column.key) {
                case "customer":
                  return (
                    <Link
                      href={`/staff/billing/invoices/${encodeURIComponent(invoice.invoice_number)}`}
                    >
                      {invoice.customer_name || invoice.invoice_number}
                    </Link>
                  );
                case "invoice":
                  return <code>{invoice.invoice_number}</code>;
                case "due":
                  return formatDay(invoice.due_at);
                case "age":
                  return AGING_BUCKET_LABEL[agingBucketFor(invoice.due_at, now)];
                case "outstanding":
                  return formatMinorUnits(outstandingCents(invoice), invoice.currency);
                default:
                  return null;
              }
            }}
            caption={<>Every invoice that still owes money. The client opens the invoice record.</>}
            emptyTitle="No invoice owes money"
            emptyHint="An invoice appears here once an order is billed; a settled one leaves the list."
          />
        )}
      </section>

      <section>
        <h2 className="page-section-title">Client accounts</h2>
        <p className="text-sm text-muted">
          Every recorded plan, service, lot and product buyer. Opening one shows every recorded
          payment and its amortization schedule.
        </p>
        {clients === null ? (
          <Alert tone="info">
            <p className="mb-0">
              {canSeeClients
                ? "The client records could not be read just now."
                : "Client accounts need cases:read — they live in the client register."}
            </p>
          </Alert>
        ) : (
          <DataTable<EngagementView>
            label="Client accounts"
            columns={[
              { key: "client", header: "Client" },
              { key: "kind", header: "Record" },
              { key: "balance", header: "Paid" },
              { key: "outstanding", header: "Outstanding", numeric: true },
              { key: "next", header: "Next" },
              { key: "state", header: "State" },
            ]}
            rows={clients}
            rowKey={(view) => view.engagement.id}
            renderCell={(view, column) => {
              switch (column.key) {
                case "client":
                  return (
                    <Link href={`/staff/lifecycle/${encodeURIComponent(view.engagement.id)}`}>
                      {view.engagement.client.name || view.engagement.reference}
                    </Link>
                  );
                case "kind":
                  return `${ENGAGEMENT_KIND_LABEL[view.engagement.kind]} · ${view.engagement.reference}`;
                case "balance":
                  return balanceLine(view.totals);
                case "outstanding":
                  return formatMinorUnits(view.totals.outstanding_cents);
                case "next":
                  return nextDueLine(view.totals);
                case "state":
                  return (
                    <StatusChip tone={engagementTone(view.totals)}>
                      {engagementStateLabel(view.totals)}
                    </StatusChip>
                  );
                default:
                  return null;
              }
            }}
            caption={<>One row per recorded client outcome; the client opens their own accounting.</>}
            emptyTitle="No client account recorded"
            emptyHint="A plan, service, lot or product recorded by the office appears here."
          />
        )}
      </section>
    </>
  );
}

/* -------------------------------- Receipts ------------------------------- */

function ReceiptsView({
  canSeeBilling,
  receipts,
  provisional,
}: {
  canSeeBilling: boolean;
  receipts: OfficialReceiptRow[] | null;
  provisional: ProvisionalReceiptRecord[] | null;
}) {
  return (
    <>
      <section>
        <h2 className="page-section-title">Official receipts</h2>
        {receipts === null ? (
          <Alert tone="info">
            <p className="mb-0">
              {canSeeBilling
                ? "The payment journal could not be read just now."
                : "Receipts need billing:read — they live in the billing records."}
            </p>
          </Alert>
        ) : (
          <DataTable<OfficialReceiptRow>
            label="Official receipts"
            columns={[
              { key: "number", header: "Receipt" },
              { key: "date", header: "Date", className: "nowrap" },
              { key: "payer", header: "Payer" },
              { key: "invoice", header: "Invoice" },
              { key: "amount", header: "Amount", numeric: true },
            ]}
            rows={receipts}
            rowKey={(row) => row.document_id || `${row.invoice_number}-${row.received_on}`}
            renderCell={(row, column) => {
              switch (column.key) {
                case "number":
                  return row.document_id ? (
                    <Link href={`/staff/documents/${encodeURIComponent(row.document_id)}`}>
                      <code>{row.document_number}</code>
                    </Link>
                  ) : (
                    <span className="text-muted">—</span>
                  );
                case "date":
                  return formatDay(row.received_on);
                case "payer":
                  return row.payer || <span className="text-muted">—</span>;
                case "invoice":
                  return <code>{row.invoice_number}</code>;
                case "amount":
                  return formatMinorUnits(row.amount_cents);
                default:
                  return null;
              }
            }}
            caption={<>Official receipts issued with a recorded payment — one event, one receipt.</>}
            emptyTitle="No official receipt recorded"
            emptyHint="An official receipt appears here with the payment that recorded it."
          />
        )}
      </section>

      <section>
        <h2 className="page-section-title">Provisional receipts</h2>
        {provisional === null ? (
          <Alert tone="info">
            <p className="mb-0">
              {canSeeBilling
                ? "The provisional-receipt journal could not be read just now."
                : "Provisional receipts need billing:read."}
            </p>
          </Alert>
        ) : (
          <DataTable<ProvisionalReceiptRecord>
            label="Provisional receipts"
            columns={[
              { key: "date", header: "Date", className: "nowrap" },
              { key: "payer", header: "Payer" },
              { key: "invoice", header: "Invoice" },
              { key: "instrument", header: "Instrument" },
              { key: "amount", header: "Amount", numeric: true },
            ]}
            rows={provisional}
            rowKey={(row) => row.id}
            renderCell={(row, column) => {
              switch (column.key) {
                case "date":
                  return formatDay(row.received_on);
                case "payer":
                  return row.payer;
                case "invoice":
                  return <code>{row.invoice_number}</code>;
                case "instrument":
                  return INSTRUMENT_LABEL[row.instrument] ?? row.instrument;
                case "amount":
                  return (
                    <Link
                      href={`/staff/billing/provisional-receipts/${encodeURIComponent(row.id)}`}
                    >
                      {formatMinorUnits(row.amount_cents)}
                    </Link>
                  );
                default:
                  return null;
              }
            }}
            caption={<>The counter&rsquo;s slips — the marked paper, never an official receipt.</>}
            emptyTitle="No provisional receipt recorded"
            emptyHint="A slip the counter issues before the official receipt appears here."
          />
        )}
      </section>
    </>
  );
}

/* ----------------------------- Reconciliation ---------------------------- */

function ReconciliationView() {
  return (
    <section>
      <div className="table-wrapper" tabIndex={0}>
        <table className="table">
          <caption>What must be reconciled, and the feed each flag needs.</caption>
          <thead>
            <tr>
              <th scope="col">Flag</th>
              <th scope="col">State</th>
              <th scope="col">Needs</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">
                <StatusChip tone="warning">unposted</StatusChip>
              </th>
              <td>
                <div className="table__name">Not available</div>
              </td>
              <td>
                <div className="table__sub">
                  The accounting service&rsquo;s posting API (posting-instruction-v1).
                </div>
              </td>
            </tr>
            <tr>
              <th scope="row">
                <StatusChip tone="danger">unmatched</StatusChip>
              </th>
              <td>
                <div className="table__name">Not available</div>
              </td>
              <td>
                <div className="table__sub">
                  A live bank/gateway feed naming the payment service.
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <EmptyState
        title="Expenses and statements are not recorded"
        hint="Expenses need the accounting service's expense write API; statements need E2 reporting-analytics. Neither renders an empty table that would read as ₱0."
      />
    </section>
  );
}
