import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listInvoices, type Invoice } from "@/lib/api-client/finance";
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_TONE } from "@/lib/api-client/billing-derive";
import { outstandingCents } from "@/lib/billing-payments";
import { formatMinorUnits } from "@/lib/money";

export const metadata = { title: "Billing & collections — Admin Portal" };

const AGING_BUCKETS: string[] = ["current", "1-30", "31-60", "61-90", "91-120", "120+"];

function agingTone(bucket: string): "success" | "warning" | "danger" {
  if (bucket === "current") return "success";
  if (bucket === "1-30" || bucket === "31-60") return "warning";
  return "danger";
}

function agingLabel(bucket: string): string {
  return bucket === "current" ? "Current" : bucket + " days";
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["billing:read"])) {
    return (
      <>
        <PageHeader eyebrow="Finance" title="Billing & collections" />
        <PageSection>
          <ForbiddenState requiredScopes={["billing:read"]} />
        </PageSection>
      </>
    );
  }

  let invoices;
  try {
    invoices = await listInvoices();
  } catch {
    return (
      <>
        <PageHeader eyebrow="Finance" title="Billing & collections" />
        <PageSection>
          <ErrorState message="Unable to load billing records." />
        </PageSection>
      </>
    );
  }

  const { status } = await searchParams;
  const statusFilter = (status ?? "").trim();

  // Recording a payment is a write: the entry points appear only for sessions holding the
  // frozen payments scope (billing:write), which the capture screen itself enforces.
  const canRecordPayments = hasAnyScope(session.scopes, ["billing:write"]);

  let filtered = invoices;
  if (statusFilter) {
    filtered = filtered.filter((i) => i.status === statusFilter);
  }

  // Outstanding means "still owed": an overpaid invoice (a credit) contributes
  // zero rather than a negative balance, which formatMinorUnits rejects by the
  // money-discipline rule. Totals are grouped by the invoice's own currency —
  // summing across currencies would produce a meaningless figure.
  const balanceOf = (i: Invoice) => outstandingCents(i);

  const unpaid = invoices.filter((i) => i.status !== "paid");

  const outstandingByCurrency = unpaid.reduce(
    (acc, i) => {
      acc[i.currency] = (acc[i.currency] ?? 0) + balanceOf(i);
      return acc;
    },
    {} as Record<string, number>,
  );

  const agingByCurrency = unpaid.reduce(
    (acc, i) => {
      const buckets = acc[i.currency] ?? {};
      buckets[i.aging_bucket] = (buckets[i.aging_bucket] ?? 0) + balanceOf(i);
      acc[i.currency] = buckets;
      return acc;
    },
    {} as Record<string, Record<string, number>>,
  );

  const currencies = Object.keys(outstandingByCurrency).sort();

  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Billing & collections"
        actions={
          <>
            <span className="text-sm text-muted">
              {invoices.length} invoices
            </span>
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
        <span className="card kpi-card">
          <span className="kpi-card__body">
            <span className="kpi-card__label">Invoices</span>
            <span className="kpi-card__value">{invoices.length}</span>
            <span className="kpi-card__sub">{invoices.filter((i) => i.status === "paid").length} paid</span>
          </span>
        </span>
        <Link href="/staff/billing?status=overdue" className="card kpi-card">
          <span className="kpi-card__body">
            <span className="kpi-card__label">Overdue accounts</span>
            <span className="kpi-card__value">{overdueCount}</span>
            <span className="kpi-card__sub">need attention</span>
          </span>
        </Link>
        {currencies.length > 0 ? (
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Outstanding</span>
              <span className="kpi-card__value">{formatMinorUnits(outstandingByCurrency[currencies[0]], currencies[0])}</span>
              <span className="kpi-card__sub">{currencies.length > 1 ? "see aging per currency below" : "total still owed"}</span>
            </span>
          </span>
        ) : (
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Outstanding</span>
              <span className="kpi-card__value">—</span>
              <span className="kpi-card__sub">nothing owed</span>
            </span>
          </span>
        )}
      </div>

      <PageSection>
        {currencies.length === 0 ? (
          <Card header={<h2>Aging at a glance</h2>}>
            <p className="text-sm text-muted">No outstanding balances.</p>
          </Card>
        ) : (
          currencies.map((c) => {
            const aging = agingByCurrency[c];
            const total: number = Object.values(aging).reduce((n: number, v: number) => n + v, 0);
            const width = (v: number) => (total > 0 ? Math.round((v / total) * 1000) / 10 : 0);
            return (
              <Card key={c} header={<h2>Aging at a glance{currencies.length > 1 ? ` — ${c}` : ""}</h2>}>
                <div className="stackbar" role="img" aria-label="Aging breakdown">
                  {AGING_BUCKETS.map((bk) => (
                    <span
                      key={bk}
                      className={"stackbar__seg seg--" + agingTone(bk)}
                      style={{ width: width(aging[bk] ?? 0) + "%" }}
                    />
                  ))}
                </div>
                <div className="legend">
                  {AGING_BUCKETS.filter((bk) => (aging[bk] ?? 0) > 0).map((bk) => (
                    <span key={bk} className="legend__item">
                      <i className={"dot dot--" + agingTone(bk)} />
                      {agingLabel(bk)} · {formatMinorUnits(aging[bk] ?? 0, c)}
                    </span>
                  ))}
                </div>
              </Card>
            );
          })
        )}
      </PageSection>

      <PageSection>
        <form className="filter-bar" role="search">
          <select
            className="select"
            name="status"
            defaultValue={statusFilter}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="overdue">Overdue</option>
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

        {filtered.length === 0 ? (
          <EmptyState
            title={statusFilter ? "No invoices match your filter" : "No invoices found"}
            hint={
              statusFilter
                ? "Try a different filter."
                : "Invoices will appear here once the finance-billing service is live."
            }
          />
        ) : (
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Invoice</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Order</th>
                  <th scope="col">Total</th>
                  <th scope="col">Paid</th>
                  <th scope="col">Outstanding</th>
                  <th scope="col">Status</th>
                  <th scope="col">Due</th>
                  <th scope="col">Aging</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      {canRecordPayments ? (
                        <Link
                          href={`/staff/billing/record-payment?invoice=${encodeURIComponent(inv.invoice_number)}`}
                          title={`Record a payment against ${inv.invoice_number}`}
                          aria-label={`Record a payment against ${inv.invoice_number}`}
                        >
                          <code>{inv.invoice_number}</code>
                        </Link>
                      ) : (
                        <code>{inv.invoice_number}</code>
                      )}
                    </td>
                    <td>{inv.customer_name}</td>
                    <td className="text-sm">{inv.order_number ?? "—"}</td>
                    <td className="text-sm">{formatMinorUnits(inv.total_cents, inv.currency)}</td>
                    <td className="text-sm">{formatMinorUnits(inv.paid_cents, inv.currency)}</td>
                    <td className="text-sm">
                      {formatMinorUnits(balanceOf(inv), inv.currency)}
                    </td>
                    <td>
                      <Badge tone={INVOICE_STATUS_TONE[inv.status]}>
                        {INVOICE_STATUS_LABEL[inv.status]}
                      </Badge>
                    </td>
                    <td className="text-sm">{new Date(inv.due_at).toLocaleDateString()}</td>
                    <td className="text-sm">{inv.aging_bucket}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>
    </>
  );
}
