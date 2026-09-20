import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { ApiError } from "@/lib/api-client/api-error";
import { loadWorkOrders } from "@/lib/api-client/work-orders";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { formatCalendarDate } from "@/lib/chapel-booking";
import { hasAnyScope } from "@/lib/rbac/nav";
import {
  WORK_ASSET_KINDS,
  WORK_ASSET_KIND_LABEL,
  workOrderAssetHref,
  workOrderList,
  workOrderStateLabel,
  workOrderStateTone,
  workOrderSummary,
  WORK_ORDER_PRIORITY_LABEL,
  WORK_ORDER_STATES,
  WORK_ORDER_STATE_LABEL,
  type WorkOrderView,
} from "@/lib/work-orders";

export const metadata = { title: "Work orders — Admin Portal" };

/**
 * Staff Work orders (`/staff/work-orders`, PRD S20, blueprint §38).
 *
 * The office's maintenance and repair list as a working screen: what needs doing, which
 * chapel/vehicle/plot/equipment it belongs to, who is assigned, the priority, the due
 * date and the recorded date each movement happened. The records come from the office's
 * recorded file (`lib/api-client/work-orders.ts`, PROVISIONAL) because work orders are a
 * deferred field-ops workflow and no contract names a work-order record; live mode
 * answers 503 and the page renders that honestly.
 *
 * OVERDUE: an order is overdue when it is not done and its recorded due date falls
 * before the day the list was recorded (`as_of`). No wall clock and no invented SLA takes
 * part — the page prints that basis under the list.
 *
 * The screen is read-only: no service carries a work-order write, so there is no
 * assignment control that could only fail.
 */

const PRIORITY_TONE: Record<string, "danger" | "warning" | "neutral"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

type WorkOrderSearchParams = {
  state?: string | string[];
  kind?: string | string[];
  q?: string | string[];
};

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function matchesQuery(view: WorkOrderView, query: string): boolean {
  if (query === "") return true;
  const needle = query.toLowerCase();
  return [
    view.order.title,
    view.order.detail ?? "",
    view.order.asset.label,
    view.order.assignee.name,
    view.order.id,
  ]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

function MoveTrail({ view }: { view: WorkOrderView }) {
  return (
    <span className="text-sm text-muted">
      {view.order.history.map((move, index) => (
        <span key={`${move.state}-${move.on}`}>
          {index > 0 ? " → " : ""}
          {index === 0 && move.state === "open" ? "Opened" : WORK_ORDER_STATE_LABEL[move.state]}{" "}
          {formatCalendarDate(move.on)}
        </span>
      ))}
    </span>
  );
}

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<WorkOrderSearchParams>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["property:read"])) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Work orders" />
        <PageSection>
          <ForbiddenState requiredScopes={["property:read"]} />
        </PageSection>
      </>
    );
  }

  const params = (await searchParams) ?? {};
  const requestedState = firstParam(params.state);
  const requestedKind = firstParam(params.kind);
  const query = firstParam(params.q).trim().slice(0, 80);

  let list;
  try {
    list = await loadWorkOrders();
  } catch (error) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Work orders" />
        <PageSection>
          <ErrorState
            message={error instanceof ApiError ? error.message : "Unable to load the work orders."}
          />
        </PageSection>
      </>
    );
  }

  const views = workOrderList(list.work_orders, list.as_of);
  const summary = workOrderSummary(views);

  const state = ["open", "in_hand", "done", "overdue"].includes(requestedState)
    ? requestedState
    : "";
  const kind = (WORK_ASSET_KINDS as readonly string[]).includes(requestedKind)
    ? requestedKind
    : "";
  const filteredViews = views.filter((view) => {
    if (kind !== "" && view.order.asset.kind !== kind) return false;
    if (state === "overdue" && !view.overdue) return false;
    if (state === "open" && !(view.state === "open" && !view.overdue)) return false;
    if (state === "in_hand" && !(view.state === "in_hand" && !view.overdue)) return false;
    if (state === "done" && view.state !== "done") return false;
    return matchesQuery(view, query);
  });
  const filtered = state !== "" || kind !== "" || query !== "";

  const clearHref = "/staff/work-orders";

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Work orders"
        actions={<Badge tone="warning">Records only</Badge>}
      />

      <PageSection>
        <p className="ops-lead">Maintenance and repairs, by asset, state and due date.</p>
        <div className="row row--wrap">
          <a className="btn btn--primary" href="#work-orders">
            See the recorded list
          </a>
          <Link className="btn btn--secondary" href="/staff/property">
            Property map
          </Link>
        </div>
        <p className="text-sm text-muted">
          No work-order service is connected — field-ops owns maintenance and inspections, so
          this list reads the office&rsquo;s recorded file as of {formatCalendarDate(list.as_of)}.
        </p>
        <div className="kpi-grid">
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Open</span>
              <span className="kpi-card__value">{summary.open}</span>
              <span className="kpi-card__sub">not started</span>
            </span>
          </span>
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">In hand</span>
              <span className="kpi-card__value">{summary.in_hand}</span>
              <span className="kpi-card__sub">being worked on</span>
            </span>
          </span>
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Overdue</span>
              <span className="kpi-card__value">{summary.overdue}</span>
              <span className="kpi-card__sub">past the recorded due date</span>
            </span>
          </span>
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Done</span>
              <span className="kpi-card__value">{summary.done}</span>
              <span className="kpi-card__sub">closed</span>
            </span>
          </span>
        </div>
      </PageSection>

      <PageSection>
        <div className="card" id="work-orders">
          <div className="card__header row row--space row--wrap">
            <div className="row row--wrap">
              <h2>The recorded list</h2>
              <span className="text-sm text-muted">{views.length} orders</span>
            </div>
            <span className="text-sm text-muted">
              {summary.overdue > 0
                ? `${summary.overdue} past the recorded due date`
                : "Nothing past its recorded due date"}
            </span>
          </div>
          <div className="card__body stack-4">
            <form method="get" action="/staff/work-orders" className="ops-filters">
              <div className="field">
                <label htmlFor="wo-state">State</label>
                <select className="select" id="wo-state" name="state" defaultValue={state}>
                  <option value="">All states</option>
                  <option value="overdue">Overdue</option>
                  {WORK_ORDER_STATES.map((entry) => (
                    <option key={entry} value={entry}>
                      {WORK_ORDER_STATE_LABEL[entry]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="wo-kind">Asset</label>
                <select className="select" id="wo-kind" name="kind" defaultValue={kind}>
                  <option value="">All assets</option>
                  {WORK_ASSET_KINDS.map((entry) => (
                    <option key={entry} value={entry}>
                      {WORK_ASSET_KIND_LABEL[entry]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="wo-q">Search</label>
                <input
                  className="input"
                  id="wo-q"
                  name="q"
                  type="search"
                  placeholder="Order, asset or assignee"
                  defaultValue={query}
                />
              </div>
              <Button type="submit" variant="secondary">
                Show
              </Button>
              {filtered ? (
                <Link className="btn btn--ghost" href={clearHref}>
                  Clear
                </Link>
              ) : null}
            </form>

            {filteredViews.length === 0 ? (
              <EmptyState
                title={filtered ? "No work order matches those filters" : "No work order is recorded"}
                hint={
                  filtered
                    ? "Clear the filters to see the office's whole recorded list."
                    : "The office's recorded maintenance file is empty — the work-order service will fill it."
                }
              />
            ) : (
              <div className="table-wrapper" tabIndex={0}>
                <table className="table">
                  <caption>
                    The recorded maintenance list, overdue first. States and dates are the
                    office&rsquo;s own record.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">What</th>
                      <th scope="col">Asset</th>
                      <th scope="col">Assigned to</th>
                      <th scope="col">Priority</th>
                      <th scope="col">Due</th>
                      <th scope="col">State</th>
                      <th scope="col">Recorded moves</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredViews.map((view) => {
                      const href = workOrderAssetHref(view.order.asset);
                      return (
                        <tr key={view.order.id}>
                          <td>
                            <strong>{view.order.title}</strong>
                            <div className="text-sm text-muted">
                              {view.order.id}
                              {view.order.detail ? ` · ${view.order.detail}` : ""}
                            </div>
                          </td>
                          <td>
                            <span className="text-sm text-muted">
                              {WORK_ASSET_KIND_LABEL[view.order.asset.kind]}
                            </span>
                            <div>
                              {href ? (
                                <Link href={href}>{view.order.asset.label}</Link>
                              ) : (
                                view.order.asset.label
                              )}
                            </div>
                          </td>
                          <td>
                            {view.order.assignee.name}
                            <div className="text-sm text-muted">
                              {view.order.assignee.employee_number ?? "Crew / contractor"}
                            </div>
                          </td>
                          <td>
                            <Badge tone={PRIORITY_TONE[view.order.priority] ?? "neutral"}>
                              {WORK_ORDER_PRIORITY_LABEL[view.order.priority]}
                            </Badge>
                          </td>
                          <td className="text-sm">
                            {view.order.due_on ? (
                              <>
                                {formatCalendarDate(view.order.due_on)}
                                {view.overdue && view.days_overdue !== null ? (
                                  <div className="text-muted">
                                    {view.days_overdue} day{view.days_overdue === 1 ? "" : "s"} overdue
                                  </div>
                                ) : null}
                              </>
                            ) : (
                              "No due date recorded"
                            )}
                          </td>
                          <td>
                            <Badge tone={workOrderStateTone(view)}>
                              {workOrderStateLabel(view)}
                            </Badge>
                          </td>
                          <td>
                            <MoveTrail view={view} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <p className="text-sm text-muted">
              Overdue is read from the recorded due date against {formatCalendarDate(list.as_of)}, the
              day this list was recorded.
            </p>
            <p className="text-sm text-muted mb-0">
              No wall clock and no SLA the office has not set takes part.
            </p>
          </div>
        </div>
      </PageSection>
    </>
  );
}
