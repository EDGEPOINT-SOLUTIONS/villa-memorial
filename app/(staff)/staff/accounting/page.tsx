import Link from "next/link";
import {
  DataTable,
  EmptyState,
  StatCard,
  StatusChip,
  type DataTableColumn,
} from "@/components/kit";
import { PageHeader, PageSection } from "@/components/ui/page";
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
import {
  INSTRUMENT_LABEL,
  businessToday,
} from "@/lib/contracts/payment-capture";
import type { ProvisionalReceiptRecord } from "@/lib/contracts/provisional-receipt-capture";
import { duesAging, outstandingTotal, overdueTotal, receivedInPeriod } from "@/lib/receivables";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { formatMinorUnits } from "@/lib/money";
import { datePeriod, monthBoundsOf, periodIsAll, periodLabel } from "@/lib/period";
import { hasAnyScope } from "@/lib/rbac/nav";

export const metadata = { title: "Accounting — Admin Portal" };

/**
 * Staff Accounting — the ledger, read-only, plus the money the office is owed and has taken.
 *
 * WHY IT READS LIKE A BOOK AND NOT LIKE A SERVICE: the platform's accounting service exists
 * and its posting-rule contract is frozen, but no staff-facing ledger API has frozen. This
 * screen therefore shows the office's recorded ledger (`lib/api-client/accounting.ts`) and
 * names the missing API in one line. The trial balance is DERIVED from the journal entries
 * (`lib/accounting.ts`), never stored beside them, so the two halves of the screen cannot
 * disagree; each amount prints exactly as the record carries it (integer centavos through
 * `formatMinorUnits`), and an entry with no case or order prints "—".
 *
 * THE MONEY TILES ARE BILLING RECORDS. Received / outstanding / overdue / aging derive from
 * the counter's payment journal and the recorded invoices (`lib/receivables.ts` on top of
 * the ONE overdue rule in `lib/payment-alerts.ts`); they render only for a session that may
 * read billing, and each fails alone. A figure with no record is named, never a ₱0 that
 * reads as recorded money.
 *
 * POSTING IS NOT HERE, and must not be added: the app displays accounting, the accounting
 * service keeps it. No write control exists on this route.
 *
 * Layout renders through the component kit (`components/kit`) — the tables are `DataTable`,
 * the tiles `StatCard`, the read-only chip `StatusChip`.
 */

type AccountingSearch = {
  from?: string;
  to?: string;
};

const TRIAL_BALANCE_COLUMNS: ReadonlyArray<DataTableColumn<TrialBalanceRow>> = [
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

function formatDay(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

/** One official receipt issued with a recorded payment: the payment's own document row. */
type OfficialReceiptRow = {
  document_number: string;
  document_id: string;
  received_on: string;
  payer: string;
  amount_cents: number;
};

function officialReceipts(
  payments: Awaited<ReturnType<typeof listFixturePayments>>,
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
        <PageHeader eyebrow="Finance" title="Accounting" />
        <PageSection>
          <ForbiddenState requiredScopes={["accounting:read"]} />
        </PageSection>
      </>
    );
  }

  let ledger;
  try {
    ledger = await loadAccountingLedger();
  } catch (err) {
    return (
      <>
        <PageHeader eyebrow="Finance" title="Accounting" />
        <PageSection>
          <ErrorState
            message={
              err instanceof ApiError ? err.message : "Unable to load the recorded ledger."
            }
          />
        </PageSection>
      </>
    );
  }

  const params = await searchParams;
  const period = datePeriod(params.from, params.to);
  const entries = filterEntriesByPeriod(ledger.entries, period);
  const trialBalance = buildTrialBalance(ledger.accounts, entries);

  // A case/order link opens a screen gated on its own scope; without it the
  // reference stays plain text rather than a dead end.
  const canOpenCases = hasAnyScope(session.scopes, ["cases:read"]);
  const canOpenOrders = hasAnyScope(session.scopes, ["orders:read"]);

  const journalEntries = [...entries].sort((a, b) =>
    a.date === b.date ? a.id.localeCompare(b.id) : b.date.localeCompare(a.date),
  );

  // ---- the money the office is owed and has taken (billing records) ----
  const now = new Date();
  const canSeeBilling = hasAnyScope(session.scopes, ["billing:read"]);
  const currentMonth = monthBoundsOf(businessToday(now));

  const [invoicesResult, paymentsResult, provisionalResult] = canSeeBilling
    ? await Promise.allSettled([
        listInvoices(now),
        listFixturePayments(),
        listProvisionalReceipts(),
      ])
    : ([null, null, null] as const);

  const invoices = invoicesResult?.status === "fulfilled" ? invoicesResult.value : null;
  const payments = paymentsResult?.status === "fulfilled" ? paymentsResult.value : null;
  const provisional =
    provisionalResult?.status === "fulfilled" ? provisionalResult.value : null;

  const received = payments ? receivedInPeriod(payments, currentMonth) : null;
  const hasRecordedPayments = payments !== null && payments.length > 0;
  const outstanding = invoices ? outstandingTotal(invoices) : null;
  const overdue = invoices ? overdueTotal(invoices, now) : null;
  const aging = invoices ? duesAging(invoices, now) : null;
  const receipts = payments && invoices ? officialReceipts(payments, invoices) : null;

  const moneyUnavailable = "unavailable — this session cannot read billing";

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Accounting"
        lead="The recorded journal, its trial balance, and the money received, owed and outstanding."
        actions={<StatusChip tone="neutral">Read-only</StatusChip>}
      />

      <PageSection>
        <Alert tone="warning">
          <p className="mb-0">{ACCOUNTING_NOT_WIRED}</p>
        </Alert>
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">Money at a glance</h2>
        <div className="kpi-grid">
          <StatCard
            label="Received this month"
            value={
              received === null
                ? "—"
                : hasRecordedPayments
                  ? formatMinorUnits(received.total_cents)
                  : "—"
            }
            sub={
              received === null
                ? moneyUnavailable
                : hasRecordedPayments
                  ? `${received.count} payments from the counter journal`
                  : "no payment recorded yet"
            }
          />
          <StatCard
            label="Outstanding"
            value={outstanding === null ? "—" : formatMinorUnits(outstanding)}
            sub={invoices ? `${invoices.length} recorded invoices` : moneyUnavailable}
          />
          <StatCard
            label="Overdue"
            value={overdue === null ? "—" : formatMinorUnits(overdue.amount_cents)}
            sub={overdue ? `${overdue.count} accounts past due` : moneyUnavailable}
          />
          <StatCard
            label="Reconciliation flags"
            value="—"
            sub="not available — needs a bank/gateway feed"
          />
        </div>
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">The recorded ledger</h2>
        <div className="kpi-grid">
          <StatCard
            label="Entries in period"
            value={entries.length}
            sub={`of ${ledger.entries.length} recorded`}
          />
          <StatCard
            label="Total debits"
            value={formatMinorUnits(trialBalance.total_debit_cents)}
            sub={`over ${trialBalance.rows.length} accounts`}
          />
          <StatCard
            label="Total credits"
            value={formatMinorUnits(trialBalance.total_credit_cents)}
            sub="must equal debits"
          />
          <StatCard
            label="Books"
            value={
              trialBalance.balanced ? (
                <StatusChip tone="success">Balanced</StatusChip>
              ) : (
                <StatusChip tone="danger">Out of balance</StatusChip>
              )
            }
            sub="debits = credits, per entry"
          />
        </div>
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">Dues aging</h2>
        <p className="text-sm text-muted">
          Derived from each invoice&rsquo;s due date and balance — never a stored bucket.
        </p>
        {aging === null ? (
          <Alert tone="info">
            <p className="mb-0">
              {canSeeBilling
                ? "The invoices could not be read just now, so aging is unavailable."
                : "Aging needs billing:read — the invoices live in the billing records."}
            </p>
          </Alert>
        ) : (
          <ul className="aging" data-testid="accounting-aging">
            {aging.map((row) => (
              <li key={row.bucket} className="aging__row">
                <span className="aging__label">{row.label}</span>
                <strong className="aging__amount">{formatMinorUnits(row.amount_cents)}</strong>
                <span className="aging__count">
                  {row.count} {row.count === 1 ? "account" : "accounts"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">Trial balance</h2>
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
          Showing {periodLabel(period)}. The recorded books cover{" "}
          {periodLabel(ledger.recorded_period)} and every balance below is the sum of the
          entries shown.
        </p>

        <DataTable<TrialBalanceRow>
          columns={TRIAL_BALANCE_COLUMNS}
          rows={trialBalance.rows}
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
                return row.debit_cents > 0 ? formatMinorUnits(row.debit_cents) : "—";
              case "credit":
                return row.credit_cents > 0 ? formatMinorUnits(row.credit_cents) : "—";
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
          caption={
            <>
              Trial balance derived from the journal below — debit, credit and the net
              balance with its side.
            </>
          }
          emptyTitle="No entries in this period"
          emptyHint="Widen the dates or clear the period to see the recorded ledger."
          footer={
            <tr>
              <th scope="row">Total</th>
              <td />
              <td className="table__numeric">
                {formatMinorUnits(trialBalance.total_debit_cents)}
              </td>
              <td className="table__numeric">
                {formatMinorUnits(trialBalance.total_credit_cents)}
              </td>
              <td className="table__numeric">—</td>
            </tr>
          }
        />
      </PageSection>

      {entries.length > 0 ? (
        <PageSection>
          <h2 className="page-section-title">Journal entries</h2>
          <p className="text-sm text-muted">
            Every line the office recorded in the period, newest first, with what it was
            against.
          </p>
          <DataTable<JournalEntry>
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
        </PageSection>
      ) : null}

      <PageSection>
        <h2 className="page-section-title">Receipts</h2>
        <p className="text-sm text-muted">
          Official receipts the counter issued with each recorded payment, and the provisional
          slips that have not yet become one.
        </p>
        {receipts === null ? (
          <Alert tone="info">
            <p className="mb-0">
              {canSeeBilling
                ? "The payment journal could not be read just now."
                : "Receipts need billing:read — they live in the billing records."}
            </p>
          </Alert>
        ) : receipts.length === 0 ? (
          <EmptyState
            title="No official receipt recorded"
            hint="An official receipt appears here with the payment that recorded it."
          />
        ) : (
          <DataTable<OfficialReceiptRow>
            columns={[
              { key: "number", header: "Receipt" },
              { key: "date", header: "Date", className: "nowrap" },
              { key: "payer", header: "Payer" },
              { key: "amount", header: "Amount", numeric: true },
            ]}
            rows={receipts}
            rowKey={(row) => row.document_id}
            renderCell={(row, column) => {
              switch (column.key) {
                case "number":
                  return (
                    <Link href={`/staff/documents/${encodeURIComponent(row.document_id)}`}>
                      <code>{row.document_number}</code>
                    </Link>
                  );
                case "date":
                  return formatDay(row.received_on);
                case "payer":
                  return row.payer || <span className="text-muted">—</span>;
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

        <h3 className="page-section-title mt-4">Provisional receipts</h3>
        {provisional === null ? (
          <Alert tone="info">
            <p className="mb-0">
              {canSeeBilling
                ? "The provisional-receipt journal could not be read just now."
                : "Provisional receipts need billing:read."}
            </p>
          </Alert>
        ) : provisional.length === 0 ? (
          <EmptyState
            title="No provisional receipt recorded"
            hint="A slip the counter issues before the official receipt appears here."
          />
        ) : (
          <DataTable<ProvisionalReceiptRecord>
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
                    <Link href={`/staff/billing/provisional-receipts/${encodeURIComponent(row.id)}`}>
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
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">Reconciliation flags</h2>
        <p className="text-sm text-muted">
          What the office must look at, each with the exact gap. No flag can be listed until a
          feed exists, so none is shown as ₱0.
        </p>
        <div className="table-wrapper" tabIndex={0}>
          <table className="table">
            <caption>Reconciliation is not available — the two flag types and their missing feed.</caption>
            <tbody>
              <tr>
                <th scope="row">
                  <StatusChip tone="warning">unposted</StatusChip>
                </th>
                <td>
                  <div className="table__name">Not available</div>
                  <div className="table__sub">
                    Needs the accounting service&rsquo;s posting API (posting-instruction-v1).
                  </div>
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <StatusChip tone="danger">unmatched</StatusChip>
                </th>
                <td>
                  <div className="table__name">Not available</div>
                  <div className="table__sub">
                    Needs a live bank/gateway feed — name the payment gateway and accounting
                    service.
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <Alert tone="danger" title="Not built (named, not zeroed)">
          <p className="mb-0">
            <strong>Expenses</strong> and <strong>statements</strong> have no record shape here.
            Expenses need the accounting service&rsquo;s expense/journal write API; statements need
            E2 reporting-analytics. Neither renders an empty table that reads as ₱0.
          </p>
        </Alert>
      </PageSection>
    </>
  );
}
