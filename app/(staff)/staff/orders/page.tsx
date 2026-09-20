import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { ApiError } from "@/lib/api-client/api-error";
import {
  listOrders,
  ORDER_LIFECYCLE_LABEL,
  type AdminOrder,
  type OrderLifecycleStatus,
} from "@/lib/api-client/commerce";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { formatMinorUnits } from "@/lib/money";
import { hasAnyScope } from "@/lib/rbac/nav";

export const metadata = { title: "Orders — Admin Portal" };

/**
 * Staff Orders admin (phase 1 of the admin-commerce plan): the durable order list with
 * server-driven status/date/search filters. Reads are gated on the frozen `orders:read`
 * scope the same way billing gates on `billing:read`; the detail screen holds the writes.
 */

const LIFECYCLE_STATUSES: OrderLifecycleStatus[] = [
  "new",
  "confirmed",
  "fulfilled",
  "cancelled",
];

const STATUS_TONE: Record<OrderLifecycleStatus, "info" | "warning" | "success" | "danger"> = {
  new: "info",
  confirmed: "warning",
  fulfilled: "success",
  cancelled: "danger",
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type OrdersSearch = {
  status?: string;
  q?: string;
  from?: string;
  to?: string;
};

/** `yyyy-mm-dd` filters compare against the ISO date part — the filters are calendar days. */
function datePart(iso: string | undefined): string {
  return (iso ?? "").slice(0, 10);
}

function matchesFilters(record: AdminOrder, filters: Required<OrdersSearch>): boolean {
  const order = record.order;
  if (filters.status && record.lifecycle_status !== filters.status) return false;
  if (filters.from && datePart(order.placed_at) < filters.from) return false;
  if (filters.to && datePart(order.placed_at) > filters.to) return false;
  if (filters.q) {
    const haystack = [order.number, order.customer_name, record.customer.email]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(filters.q.toLowerCase())) return false;
  }
  return true;
}

function itemsSummary(record: AdminOrder): string {
  const items = record.order.items;
  const units = items.reduce((sum, item) => sum + item.quantity, 0);
  const count = units === 1 ? "1 item" : `${units} items`;
  return items.length > 1
    ? `${count} · ${items[0].name} +${items.length - 1} more`
    : `${count} · ${items[0].name}`;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<OrdersSearch>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["orders:read"])) {
    return (
      <>
        <PageHeader eyebrow="Commerce" title="Orders" />
        <PageSection>
          <ForbiddenState requiredScopes={["orders:read"]} />
        </PageSection>
      </>
    );
  }

  let orders: AdminOrder[];
  try {
    orders = await listOrders();
  } catch (err) {
    return (
      <>
        <PageHeader eyebrow="Commerce" title="Orders" />
        <PageSection>
          <ErrorState
            message={
              err instanceof ApiError ? err.message : "Unable to load orders just now."
            }
          />
        </PageSection>
      </>
    );
  }

  const params = await searchParams;
  const filters: Required<OrdersSearch> = {
    status: LIFECYCLE_STATUSES.includes(params.status as OrderLifecycleStatus)
      ? (params.status ?? "")
      : "",
    q: (params.q ?? "").trim(),
    from: ISO_DATE_RE.test(params.from ?? "") ? (params.from ?? "") : "",
    to: ISO_DATE_RE.test(params.to ?? "") ? (params.to ?? "") : "",
  };
  const hasFilter = Boolean(filters.status || filters.q || filters.from || filters.to);
  const filtered = orders.filter((record) => matchesFilters(record, filters));

  return (
    <>
      <PageHeader
        eyebrow="Commerce"
        title="Orders"
        actions={
          <span className="text-sm text-muted">
            {filtered.length === orders.length
              ? `${orders.length} orders`
              : `${filtered.length} of ${orders.length} orders`}
          </span>
        }
      />

      <PageSection>
        <form className="filter-bar" role="search">
          <input
            className="input"
            type="search"
            name="q"
            placeholder="Order number, customer or email"
            aria-label="Search orders"
            defaultValue={filters.q}
          />
          <select
            className="select"
            name="status"
            defaultValue={filters.status}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {LIFECYCLE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ORDER_LIFECYCLE_LABEL[status]}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="date"
            name="from"
            aria-label="Placed on or after"
            defaultValue={filters.from}
          />
          <input
            className="input"
            type="date"
            name="to"
            aria-label="Placed on or before"
            defaultValue={filters.to}
          />
          <button className="btn btn--primary btn--sm" type="submit">
            Filter
          </button>
          {hasFilter ? (
            <Link className="btn btn--ghost btn--sm" href="/staff/orders">
              Clear
            </Link>
          ) : null}
        </form>

        {filtered.length === 0 ? (
          <EmptyState
            title={hasFilter ? "No orders match your filter" : "No orders yet"}
            hint={
              hasFilter
                ? "Try a different status, date range or search."
                : "Orders placed at checkout appear here as soon as they are created."
            }
          />
        ) : (
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Placed</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Items</th>
                  <th scope="col" className="table__numeric">
                    Total
                  </th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => (
                  <tr key={record.order.number}>
                    <td>
                      <Link href={`/staff/orders/${encodeURIComponent(record.order.number)}`}>
                        <code>{record.order.number}</code>
                      </Link>
                    </td>
                    <td className="text-sm">
                      {record.order.placed_at
                        ? new Date(record.order.placed_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      {record.order.customer_name}
                      <br />
                      <span className="text-sm text-muted">{record.customer.email}</span>
                    </td>
                    <td className="text-sm">{itemsSummary(record)}</td>
                    <td className="table__numeric">
                      {formatMinorUnits(record.order.total_cents, record.order.currency)}
                    </td>
                    <td>
                      <Badge tone={STATUS_TONE[record.lifecycle_status]}>
                        {ORDER_LIFECYCLE_LABEL[record.lifecycle_status]}
                      </Badge>
                    </td>
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
