import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { ACCOUNTING_NOT_WIRED, loadAccountingLedger } from "@/lib/api-client/accounting";
import { ApiError } from "@/lib/api-client/api-error";
import {
  ACCOUNT_TYPE_LABEL,
  buildTrialBalance,
  entryTotalCents,
  filterEntriesByPeriod,
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
 */

type AccountingSearch = {
  from?: string;
  to?: string;
};

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

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Accounting"
        actions={<Badge tone="neutral">Read-only</Badge>}
      />

      <PageSection>
        <div className="alert alert--warning">
          <p className="mb-0">{ACCOUNTING_NOT_WIRED}</p>
        </div>
      </PageSection>

      <PageSection>
        <div className="kpi-grid">
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Entries in period</span>
              <span className="kpi-card__value">{entries.length}</span>
              <span className="kpi-card__sub">of {ledger.entries.length} recorded</span>
            </span>
          </span>
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Total debits</span>
              <span className="kpi-card__value">
                {formatMinorUnits(trialBalance.total_debit_cents)}
              </span>
              <span className="kpi-card__sub">over {trialBalance.rows.length} accounts</span>
            </span>
          </span>
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Total credits</span>
              <span className="kpi-card__value">
                {formatMinorUnits(trialBalance.total_credit_cents)}
              </span>
              <span className="kpi-card__sub">must equal debits</span>
            </span>
          </span>
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Books</span>
              <span className="kpi-card__value">
                {trialBalance.balanced ? (
                  <Badge tone="success">Balanced</Badge>
                ) : (
                  <Badge tone="danger">Out of balance</Badge>
                )}
              </span>
              <span className="kpi-card__sub">debits = credits, per entry</span>
            </span>
          </span>
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

        {entries.length === 0 ? (
          <EmptyState
            title="No entries in this period"
            hint="Widen the dates or clear the period to see the recorded ledger."
          />
        ) : (
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <caption>
                Trial balance derived from the journal below — debit, credit and the net
                balance with its side.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Account</th>
                  <th scope="col">Type</th>
                  <th scope="col" className="table__numeric">
                    Debit
                  </th>
                  <th scope="col" className="table__numeric">
                    Credit
                  </th>
                  <th scope="col" className="table__numeric">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.rows.map((row) => (
                  <tr key={row.code}>
                    <td>
                      <div className="table__name">{row.name}</div>
                      <div className="table__sub">
                        <code>{row.code}</code>
                      </div>
                    </td>
                    <td>{row.type ? ACCOUNT_TYPE_LABEL[row.type] : "—"}</td>
                    <td className="table__numeric">
                      {row.debit_cents > 0 ? formatMinorUnits(row.debit_cents) : "—"}
                    </td>
                    <td className="table__numeric">
                      {row.credit_cents > 0 ? formatMinorUnits(row.credit_cents) : "—"}
                    </td>
                    <td className="table__numeric nowrap">
                      {row.balance_side === null
                        ? "—"
                        : `${formatMinorUnits(Math.abs(row.balance_cents))} ${
                            row.balance_side === "debit" ? "Dr" : "Cr"
                          }`}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  <td />
                  <td className="table__numeric">{formatMinorUnits(trialBalance.total_debit_cents)}</td>
                  <td className="table__numeric">
                    {formatMinorUnits(trialBalance.total_credit_cents)}
                  </td>
                  <td className="table__numeric">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </PageSection>

      {entries.length > 0 ? (
        <PageSection>
          <h2 className="page-section-title">Journal entries</h2>
          <p className="text-sm text-muted">
            Every line the office recorded in the period, newest first, with what it was
            against.
          </p>
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <caption>
                Read-only: this product displays accounting, it does not post to it.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Reference</th>
                  <th scope="col">Description</th>
                  <th scope="col" className="table__numeric">
                    Amount
                  </th>
                  <th scope="col">Against</th>
                </tr>
              </thead>
              <tbody>
                {[...entries]
                  .sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : b.date.localeCompare(a.date)))
                  .map((entry) => (
                    <tr key={entry.id}>
                      <td className="nowrap">{formatDay(entry.date)}</td>
                      <td>
                        <code>{entry.reference}</code>
                      </td>
                      <td>{entry.description}</td>
                      <td className="table__numeric">{formatMinorUnits(entryTotalCents(entry))}</td>
                      <td>
                        {entry.case_number || entry.order_number ? (
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
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </PageSection>
      ) : null}
    </>
  );
}
