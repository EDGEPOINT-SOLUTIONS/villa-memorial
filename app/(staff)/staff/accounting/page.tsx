import Link from "next/link";
import {
  DataTable,
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
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { formatMinorUnits } from "@/lib/money";
import { datePeriod, periodIsAll, periodLabel } from "@/lib/period";
import { hasAnyScope } from "@/lib/rbac/nav";

export const metadata = { title: "Accounting — Admin Portal" };

/**
 * Staff Accounting — the ledger, read-only.
 *
 * WHY IT READS LIKE A BOOK AND NOT LIKE A SERVICE: the platform's accounting
 * service exists and its posting-rule contract is frozen, but no staff-facing
 * ledger API has frozen. This screen therefore shows the office's recorded ledger
 * (`lib/api-client/accounting.ts`) and names the missing API in one line. The
 * trial balance is DERIVED from the journal entries (`lib/accounting.ts`), never
 * stored beside them, so the two halves of the screen cannot disagree; each
 * amount prints exactly as the record carries it (integer centavos through
 * `formatMinorUnits`), and an entry with no case or order prints "—".
 *
 * POSTING IS NOT HERE, and must not be added: the app displays accounting, the
 * accounting service keeps it. No write control exists on this route.
 *
 * Layout renders through the component kit (`components/kit`) — the two tables are
 * `DataTable`, the tiles `StatCard`, the read-only chip `StatusChip` — with the
 * same markup as before, now from one home.
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

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Accounting"
        lead="The recorded journal, its trial balance and the current period."
        actions={<StatusChip tone="neutral">Read-only</StatusChip>}
      />

      <PageSection>
        <Alert tone="warning">
          <p className="mb-0">{ACCOUNTING_NOT_WIRED}</p>
        </Alert>
      </PageSection>

      <PageSection>
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
    </>
  );
}
