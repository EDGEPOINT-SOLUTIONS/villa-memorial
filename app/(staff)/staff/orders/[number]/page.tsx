import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { ApiError } from "@/lib/api-client/api-error";
import {
  availableTransitions,
  getAdminOrder,
  ORDER_LIFECYCLE_LABEL,
  type AdminOrder,
  type OrderLifecycleStatus,
} from "@/lib/api-client/commerce";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { formatMinorUnits } from "@/lib/money";
import { hasAnyScope } from "@/lib/rbac/nav";
import { OrderStatusActions } from "./order-status-actions";

export const metadata = { title: "Order detail — Admin Portal" };

/**
 * Staff order detail: the frozen order as created at checkout, the checkout contact the
 * admin record carries, the app-authored fulfilment timeline, and the operator transitions
 * (`new → confirmed → fulfilled`, or `→ cancelled`). A session holding `orders:read` but
 * not `orders:write` sees the record read-only; the transition route re-checks server-side.
 */

const STATUS_TONE: Record<OrderLifecycleStatus, "info" | "warning" | "success" | "danger"> = {
  new: "info",
  confirmed: "warning",
  fulfilled: "success",
  cancelled: "danger",
};

function timelineStamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["orders:read"])) {
    return (
      <>
        <PageHeader eyebrow="Commerce · Order" title="Order" />
        <PageSection>
          <ForbiddenState requiredScopes={["orders:read"]} />
        </PageSection>
      </>
    );
  }

  const { number } = await params;

  let record: AdminOrder | null;
  try {
    record = await getAdminOrder(number);
  } catch (err) {
    return (
      <>
        <PageHeader eyebrow="Commerce · Order" title="Order" />
        <PageSection>
          <ErrorState
            message={err instanceof ApiError ? err.message : "Unable to load that order."}
          />
        </PageSection>
      </>
    );
  }

  if (!record) {
    return (
      <>
        <PageHeader eyebrow="Commerce · Order" title="Order not found" />
        <PageSection>
          <EmptyState
            title={`No order ${number}`}
            hint="Check the number against the receipt or the Orders list."
          />
          <div className="mt-4">
            <Link href="/staff/orders" className="btn btn--secondary btn--sm">
              Back to orders
            </Link>
          </div>
        </PageSection>
      </>
    );
  }

  const order = record.order;
  const canWrite = hasAnyScope(session.scopes, ["orders:write"]);
  // Recording a payment is a billing write: the link appears only for sessions holding the
  // frozen payments scope, exactly as the case detail screen gates it.
  const canRecordPayments = hasAnyScope(session.scopes, ["billing:write"]);
  const transitions = availableTransitions(record.lifecycle_status);

  return (
    <>
      <PageHeader
        eyebrow="Commerce · Order"
        title={order.number}
        actions={
          <>
            <Link href="/staff/orders" className="btn btn--secondary btn--sm">
              Back to orders
            </Link>
            {canRecordPayments ? (
              <Link
                href={`/staff/billing/record-payment?order=${encodeURIComponent(order.number)}`}
                className="btn btn--primary btn--sm"
              >
                Record payment
              </Link>
            ) : null}
          </>
        }
      />

      <PageSection>
        <div className="card">
          <div className="card__body case-summary">
            <div>
              <p className="page-header__eyebrow">Placed at checkout</p>
              <h2 className="case-summary__name">{order.customer_name}</h2>
              <p className="case-summary__meta">
                {order.placed_at ? timelineStamp(order.placed_at) : "placement time unknown"} ·{" "}
                {order.items.reduce((sum, item) => sum + item.quantity, 0)} items ·{" "}
                {formatMinorUnits(order.total_cents, order.currency)}
              </p>
            </div>
            <Badge tone={STATUS_TONE[record.lifecycle_status]}>
              {ORDER_LIFECYCLE_LABEL[record.lifecycle_status]}
            </Badge>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <Card header={<h3>Items</h3>}>
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col" className="table__numeric">
                    Qty
                  </th>
                  <th scope="col" className="table__numeric">
                    Unit price
                  </th>
                  <th scope="col" className="table__numeric">
                    Line total
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.sku}>
                    <td>
                      <strong>{item.name}</strong> <code>{item.sku}</code>
                    </td>
                    <td className="table__numeric">{item.quantity}</td>
                    <td className="table__numeric">
                      {formatMinorUnits(item.unit_price_cents, order.currency)}
                    </td>
                    <td className="table__numeric">
                      {formatMinorUnits(item.unit_price_cents * item.quantity, order.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row mt-4" style={{ justifyContent: "space-between" }}>
            <span className="text-muted">Total (confirmed by the store)</span>
            <strong style={{ fontSize: "var(--text-lg)" }}>
              {formatMinorUnits(order.total_cents, order.currency)}
            </strong>
          </div>
        </Card>
      </PageSection>

      <PageSection>
        <Card header={<h3>Customer</h3>}>
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <tbody>
                <tr>
                  <th scope="row">Name</th>
                  <td>{record.customer.name}</td>
                </tr>
                <tr>
                  <th scope="row">Email</th>
                  <td>{record.customer.email}</td>
                </tr>
                <tr>
                  <th scope="row">Phone</th>
                  <td>{record.customer.phone}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </PageSection>

      <PageSection>
        <Card header={<h3>Status timeline</h3>}>
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Status</th>
                  <th scope="col">By</th>
                  <th scope="col">Note</th>
                </tr>
              </thead>
              <tbody>
                {record.timeline.map((event, index) => (
                  <tr key={`${event.at}-${index}`}>
                    <td className="text-sm">{timelineStamp(event.at)}</td>
                    <td>
                      <Badge tone={STATUS_TONE[event.status]}>
                        {ORDER_LIFECYCLE_LABEL[event.status]}
                      </Badge>
                    </td>
                    <td className="text-sm">{event.by}</td>
                    <td className="text-sm">{event.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </PageSection>

      <PageSection>
        <Card header={<h3>Actions</h3>}>
          {canWrite ? (
            <OrderStatusActions number={order.number} transitions={transitions} />
          ) : (
            <p className="text-sm text-muted" role="status">
              Your sign-in can view this order but not change it — status transitions need
              the <code>orders:write</code> permission.
            </p>
          )}
        </Card>
      </PageSection>
    </>
  );
}
