import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/empty-state";
import { ForbiddenState, ErrorState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { getInvoiceByNumber, listPaymentsForInvoice } from "@/lib/api-client/finance";
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_TONE } from "@/lib/api-client/billing-derive";
import { outstandingCents } from "@/lib/billing-payments";
import { INSTRUMENT_LABEL } from "@/lib/contracts/payment-capture";
import { invoiceOverdue } from "@/lib/payment-alerts";
import { formatMinorUnits } from "@/lib/money";

export const metadata = { title: "Invoice — Admin Portal" };

/**
 * The read-only invoice (client minute 2026-09-21, item 4: "provide access to relevant
 * payment details"). The dashboard's red band names a payment; this is where that name
 * opens, for ANY billing:read session — recording a payment stays a billing:write action,
 * so a reader is no longer sent to a form they cannot use.
 *
 * It reads the invoice through the same client the billing list uses and the same
 * date-derived overdue rule (`invoiceOverdue`), so the state it prints is the state the
 * dashboard counted. Nothing is written here.
 */
export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["billing:read"])) {
    return (
      <>
        <PageHeader eyebrow="Finance" title="Invoice" />
        <PageSection>
          <ForbiddenState requiredScopes={["billing:read"]} />
        </PageSection>
      </>
    );
  }

  const { number } = await params;
  const now = new Date();

  let invoice;
  try {
    invoice = await getInvoiceByNumber(decodeURIComponent(number), now);
  } catch {
    return (
      <>
        <PageHeader eyebrow="Finance" title="Invoice" />
        <PageSection>
          <ErrorState message="Unable to load the invoice." />
        </PageSection>
      </>
    );
  }
  if (!invoice) notFound();

  const payments = await listPaymentsForInvoice(invoice.invoice_number);
  const canRecordPayments = hasAnyScope(session.scopes, ["billing:write"]);
  const overdue = invoiceOverdue(invoice, now);

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title={invoice.invoice_number}
        lead={invoice.customer_name}
        actions={
          <>
            <Link href="/staff/billing" className="btn btn--secondary btn--sm">
              Back to billing
            </Link>
            {canRecordPayments && outstandingCents(invoice) > 0 ? (
              <Link
                href={`/staff/billing/record-payment?invoice=${encodeURIComponent(invoice.invoice_number)}`}
                className="btn btn--primary btn--sm"
              >
                Record payment
              </Link>
            ) : null}
          </>
        }
      />

      <div className="kpi-grid">
        <Card>
          <div className="finance-glance">
            <div className="finance-glance__row">
              <span>Status</span>
              <strong>
                <Badge tone={overdue ? "danger" : INVOICE_STATUS_TONE[invoice.status]}>
                  {overdue ? "Overdue" : INVOICE_STATUS_LABEL[invoice.status]}
                </Badge>
              </strong>
            </div>
            <div className="finance-glance__row">
              <span>Total</span>
              <strong>{formatMinorUnits(invoice.total_cents, invoice.currency)}</strong>
            </div>
            <div className="finance-glance__row">
              <span>Paid</span>
              <strong>{formatMinorUnits(invoice.paid_cents, invoice.currency)}</strong>
            </div>
            <div className="finance-glance__row">
              <span>Outstanding</span>
              <strong>{formatMinorUnits(outstandingCents(invoice), invoice.currency)}</strong>
            </div>
          </div>
        </Card>

        <Card>
          <div className="finance-glance">
            <div className="finance-glance__row">
              <span>Issued</span>
              <strong>
                {invoice.issued_at
                  ? new Date(invoice.issued_at).toLocaleDateString()
                  : "—"}
              </strong>
            </div>
            <div className="finance-glance__row">
              <span>Due</span>
              <strong>{invoice.due_at ? new Date(invoice.due_at).toLocaleDateString() : "—"}</strong>
            </div>
            <div className="finance-glance__row">
              <span>Aging</span>
              <strong>{invoice.aging_bucket}</strong>
            </div>
            <div className="finance-glance__row">
              <span>Order</span>
              <strong>{invoice.order_number ?? "—"}</strong>
            </div>
          </div>
        </Card>
      </div>

      <PageSection>
        <Card header={<h2>Payments recorded</h2>}>
          {!payments.listed ? (
            <p className="text-sm text-muted">
              This mode cannot list an invoice&rsquo;s payments — receipts live in the
              documents repository.
            </p>
          ) : payments.payments.length === 0 ? (
            <EmptyState
              title="No payment recorded yet"
              hint="Payments recorded at the counter against this invoice will appear here."
            />
          ) : (
            <div className="table-wrapper" tabIndex={0}>
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Payment</th>
                    <th scope="col">Received</th>
                    <th scope="col">Method</th>
                    <th scope="col">Reference</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        <code>{payment.id}</code>
                      </td>
                      <td className="text-sm">{payment.received_on}</td>
                      <td className="text-sm">
                        {INSTRUMENT_LABEL[payment.method] ?? payment.method}
                      </td>
                      <td className="text-sm">{payment.reference || "—"}</td>
                      <td className="text-sm">
                        {formatMinorUnits(payment.amount_cents, invoice.currency)}
                      </td>
                      <td className="text-sm">
                        {payment.receipt_document ? (
                          <code>{payment.receipt_document.document_number}</code>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </PageSection>
    </>
  );
}
