import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { ApiError } from "@/lib/api-client/api-error";
import { listProvisionalReceiptViews } from "@/lib/api-client/provisional-receipts";
import { formatMinorUnits } from "@/lib/money";
import { formatRecordedAt } from "@/lib/contracts/payment-capture";
import { provisionalReceiptAgainst } from "@/lib/contracts/provisional-receipt-capture";

export const metadata = { title: "Provisional receipts — Staff Portal" };

/**
 * The office's list of provisional receipts — every slip the counter has issued, with the
 * official receipt that replaces each one when it exists.
 *
 * Answer at a glance: the count strip says how many wait on an official receipt; each row
 * carries the payment (payer · amount · date), what it settles and its state. A clerk finds
 * a slip by scanning the list, opens it, and either prints the provisional paper or goes
 * straight to the real receipt — one state or the other, never both.
 */
export default async function ProvisionalReceiptsPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["billing:read"])) {
    return (
      <>
        <PageHeader eyebrow="Finance" title="Provisional receipts" />
        <PageSection>
          <ForbiddenState requiredScopes={["billing:read"]} />
        </PageSection>
      </>
    );
  }

  const canIssue = hasAnyScope(session.scopes, ["billing:write"]);

  let views;
  try {
    views = await listProvisionalReceiptViews();
  } catch (err) {
    const message =
      err instanceof ApiError
        ? err.message
        : "Unable to load the provisional-receipt journal just now.";
    return (
      <>
        <PageHeader eyebrow="Finance" title="Provisional receipts" />
        <PageSection>
          <ErrorState message={message} />
        </PageSection>
      </>
    );
  }

  const awaiting = views.filter((view) => !view.official).length;
  const replaced = views.length - awaiting;

  return (
    <>
      <PageHeader
        eyebrow="Finance · Billing"
        title="Provisional receipts"
        actions={
          <>
            <Link href="/staff/billing" className="btn btn--secondary btn--sm">
              Billing &amp; collections
            </Link>
            {canIssue ? (
              <Link
                href="/staff/billing/provisional-receipts/new"
                className="btn btn--primary btn--sm"
              >
                Issue a provisional receipt
              </Link>
            ) : null}
          </>
        }
      />

      <div className="kpi-grid">
        <span className="card kpi-card">
          <span className="kpi-card__body">
            <span className="kpi-card__label">Issued</span>
            <span className="kpi-card__value">{views.length}</span>
            <span className="kpi-card__sub">counter slips on record</span>
          </span>
        </span>
        <span className="card kpi-card">
          <span className="kpi-card__body">
            <span className="kpi-card__label">Awaiting an official receipt</span>
            <span className="kpi-card__value">{awaiting}</span>
            <span className="kpi-card__sub">the family holds a provisional paper</span>
          </span>
        </span>
        <span className="card kpi-card">
          <span className="kpi-card__body">
            <span className="kpi-card__label">Official receipt on file</span>
            <span className="kpi-card__value">{replaced}</span>
            <span className="kpi-card__sub">the real receipt replaces the slip</span>
          </span>
        </span>
      </div>

      <PageSection>
        {views.length === 0 ? (
          <EmptyState
            title="No provisional receipts issued yet"
            hint="When the counter hands a family a provisional receipt, it appears here — with the official receipt that replaces it once finance issues one."
          />
        ) : (
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Received</th>
                  <th scope="col">Payer</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Settles</th>
                  <th scope="col">Received by</th>
                  <th scope="col">Official receipt</th>
                  <th scope="col">
                    <span className="text-sm text-muted">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {views.map(({ record, official }) => (
                  <tr key={record.id}>
                    <td className="text-sm">{record.received_on}</td>
                    <td>{record.payer}</td>
                    <td>{formatMinorUnits(record.amount_cents, "PHP")}</td>
                    <td className="text-sm">{provisionalReceiptAgainst(record)}</td>
                    <td className="text-sm">{record.received_by}</td>
                    <td>
                      {official ? (
                        <Badge tone="success">{official.document_number}</Badge>
                      ) : (
                        <Badge tone="warning">Awaiting official receipt</Badge>
                      )}
                    </td>
                    <td>
                      <Link
                        className="btn btn--ghost btn--sm"
                        href={`/staff/billing/provisional-receipts/${encodeURIComponent(record.id)}`}
                        aria-label={`Open the provisional receipt for ${record.payer} of ${formatMinorUnits(record.amount_cents, "PHP")}`}
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-sm text-muted">
          Slips issued in this journal carry no receipt number; the official receipt, when it
          exists, is the documents repository&apos;s own record.
          {views.length > 0
            ? ` Most recent issue: ${formatRecordedAt(views[views.length - 1].record.issued_at)}.`
            : ""}
        </p>
      </PageSection>
    </>
  );
}
