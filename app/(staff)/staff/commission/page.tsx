import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { ApiError } from "@/lib/api-client/api-error";
import { loadCommissionAdmin } from "@/lib/api-client/commission";
import {
  ORDER_LIFECYCLE_LABEL,
  type OrderLifecycleStatus,
} from "@/lib/api-client/commerce";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import {
  COMMISSION_BLANK_AMOUNT,
  COMMISSION_NOT_CONFIGURED,
  COMMISSION_REVERSAL,
} from "@/lib/commission";
import { FAMILY_HELP } from "@/lib/family/contact";
import { formatMinorUnits } from "@/lib/money";
import { hasAnyScope } from "@/lib/rbac/nav";

export const metadata = { title: "Commission — Staff Portal" };

/**
 * Staff Commission (P25 / S25 of the screen inventory, captain checklist F-12,
 * 2026-09-18) — the commission-engine admin screen the product was missing.
 *
 * WHY THE FIGURES ARE BLANK: the client has not fixed commission rules, rates
 * or targets (`docs/07-client-villa/open-questions.md` — "Commission rules and
 * rates"), and the engine itself is deferred platform scope
 * (`docs/04-modules/finance-billing.md` §Commissions). This screen therefore
 * does three honest things and nothing else:
 *   · states the shape of the information — which sales count, over which
 *     period, against which target, and how a commission would be calculated —
 *     so the screen becomes real without redesign once the office answers;
 *   · leaves every rate-derived amount blank, marked "Not configured" (never a
 *     zero, never a percentage the client did not give);
 *   · shows what the product does know from real records: the orders already in
 *     the durable order store, as the inputs to a commission, without a rate
 *     applied.
 *
 * The office number is read from `lib/family/contact.ts` (the one contact
 * module), never typed.
 */
const LIFECYCLE_TONE: Record<OrderLifecycleStatus, "info" | "warning" | "success" | "danger"> = {
  new: "info",
  confirmed: "warning",
  fulfilled: "success",
  cancelled: "danger",
};

/** One shape row of the future calculation: the decision, the promise, today's state. */
type ShapeRow = { key: string; decision: string; will: string; today: ReactNode };

/**
 * Every amount a rate would produce is blank and marked — never a zero, which
 * would read like a real figure. One component so the convention cannot drift.
 */
function BlankAmount() {
  return (
    <span className="commission-blank">
      <span className="commission-blank__amount">{COMMISSION_BLANK_AMOUNT}</span>
      <span className="text-sm text-muted">{COMMISSION_NOT_CONFIGURED}</span>
    </span>
  );
}

export default async function CommissionPage() {
  const session = await requireSessionOrRedirect();
  // No commission scope exists in rbac-scopes-v1; commission statements and
  // payouts are the finance module (finance-billing.md §Commissions), so the
  // screen reuses billing:read provisionally — the same precedent as Reports.
  if (!hasAnyScope(session.scopes, ["billing:read"])) {
    return (
      <>
        <PageHeader eyebrow="Finance" title="Commission" />
        <PageSection>
          <ForbiddenState requiredScopes={["billing:read"]} />
        </PageSection>
      </>
    );
  }

  let data;
  try {
    data = await loadCommissionAdmin();
  } catch (err) {
    return (
      <>
        <PageHeader eyebrow="Finance" title="Commission" />
        <PageSection>
          <ErrorState
            message={
              err instanceof ApiError
                ? err.message
                : "Unable to load commission records just now."
            }
          />
        </PageSection>
      </>
    );
  }

  const { pool, statement_period, target } = data;
  // Order links open the Orders admin, which gates on orders:read — a reader
  // without it sees the order number as plain text instead of a dead end.
  const canOpenOrders = hasAnyScope(session.scopes, ["orders:read"]);
  const saleValueLabel = Object.entries(pool.saleValueByCurrency)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, cents]) => formatMinorUnits(cents, currency))
    .join(" · ");

  const shape: ShapeRow[] = [
    {
      key: "sales",
      decision: "Which sales count",
      will: "Every sale the office attributes to an agent, in the states its rule counts. A cancellation stays visible instead of quietly dropping out.",
      today: <Badge tone="warning">{COMMISSION_NOT_CONFIGURED}</Badge>,
    },
    {
      key: "period",
      decision: "Over which period",
      will: "One statement per agent per period — the cycle the office names.",
      today: (
        <span className="commission-today">
          <Badge tone="warning">{COMMISSION_NOT_CONFIGURED}</Badge>
          <span className="text-sm text-muted">{statement_period.detail}</span>
        </span>
      ),
    },
    {
      key: "calculation",
      decision: "How the amount is worked out",
      will: "Real sale value × the configured basis, split between agents where the rule says so.",
      today: <BlankAmount />,
    },
    {
      key: "target",
      decision: "Against which target",
      will: "The target the office sets per agent and period; progress is measured on the recorded sales.",
      today: (
        <span className="commission-today">
          <Badge tone="warning">No target set</Badge>
          <span className="text-sm text-muted">{target.detail}</span>
        </span>
      ),
    },
    {
      key: "approval",
      decision: "How it is approved and paid",
      will: "Pending approval → approved → scheduled → paid, one line per sale. A reversal keeps its own line.",
      today: <Badge tone="warning">None issued yet</Badge>,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Commission"
        actions={<Badge tone="warning">Not configured</Badge>}
      />

      <PageSection>
        <div className="alert alert--warning">
          <div>
            <p>
              <strong>Rates and targets are not configured.</strong>
            </p>
            <p className="mb-0">
              {data.placeholder_note} A blank here means &ldquo;{COMMISSION_NOT_CONFIGURED}&rdquo;,
              never a zero — the figures the product does know are labelled as real records.
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <div className="kpi-grid">
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Commission payable</span>
              <span className="kpi-card__value">{COMMISSION_BLANK_AMOUNT}</span>
              <span className="kpi-card__sub">{COMMISSION_NOT_CONFIGURED}</span>
            </span>
          </span>
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Rate basis</span>
              <span className="kpi-card__value">—</span>
              <span className="kpi-card__sub">{COMMISSION_NOT_CONFIGURED}</span>
            </span>
          </span>
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Target</span>
              <span className="kpi-card__value">{COMMISSION_BLANK_AMOUNT}</span>
              <span className="kpi-card__sub">No target set</span>
            </span>
          </span>
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Sales on record</span>
              <span className="kpi-card__value">
                {pool.sales.length > 0 ? pool.sales.length : "—"}
              </span>
              <span className="kpi-card__sub">
                {saleValueLabel
                  ? `${saleValueLabel} · confirmed or fulfilled`
                  : "No sale on record yet"}
              </span>
            </span>
          </span>
        </div>
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">How a commission would be calculated</h2>
        <p className="text-sm text-muted">
          The office configures each decision below; this screen then fills in from that rule, not
          from anyone typing a rate here.
        </p>

        <div className="table-wrapper" tabIndex={0}>
          <table className="table">
            <caption>
              The shape of the eventual calculation — every rate-derived figure stays blank until
              the office answers.
            </caption>
            <thead>
              <tr>
                <th scope="col">The decision</th>
                <th scope="col">What the screen will show once it is configured</th>
                <th scope="col">Today</th>
              </tr>
            </thead>
            <tbody>
              {shape.map((row) => (
                <tr key={row.key}>
                  <th scope="row">{row.decision}</th>
                  <td>{row.will}</td>
                  <td>{row.today}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="stack-4 mt-4">
          <Card
            header={
              <div className="row row--space">
                <h3>The path every commission line walks</h3>
                <Badge tone="neutral">None issued yet</Badge>
              </div>
            }
          >
            <ul className="commission-list">
              {data.states.map((state) => (
                <li key={state.key}>
                  <div>
                    <p className="commission-list__label">{state.label}</p>
                    <p className="commission-list__detail">{state.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted mt-4">{COMMISSION_REVERSAL.detail}</p>
          </Card>

          <Card
            header={
              <div className="row row--space">
                <h3>The seven bases the office can choose from</h3>
                <Badge tone="neutral">None selected</Badge>
              </div>
            }
          >
            <ul className="commission-list">
              {data.bases.map((basis) => (
                <li key={basis.key}>
                  <div>
                    <p className="commission-list__label">{basis.label}</p>
                    <p className="commission-list__detail">{basis.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card
            header={
              <div className="row row--space">
                <h3>The rest of the engine the office will configure</h3>
                <Badge tone="neutral">{COMMISSION_NOT_CONFIGURED}</Badge>
              </div>
            }
          >
            <ul className="commission-list">
              {data.capabilities.map((capability) => (
                <li key={capability.key}>
                  <div>
                    <p className="commission-list__label">{capability.label}</p>
                    <p className="commission-list__detail">{capability.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">Sales on record</h2>
        <p className="text-sm text-muted">
          Every order the portal has recorded, newest first — the inputs a commission would use,
          with no rate applied. Which of these states the office counts is its rule, not this
          screen&rsquo;s.
        </p>
        <p className="row row--wrap">
          <Badge tone="success">{pool.sales.length} sales</Badge>
          <Badge tone="info">{pool.awaiting.length} awaiting confirmation</Badge>
          <Badge tone="danger">{pool.cancelled.length} cancelled</Badge>
          <span className="text-sm text-muted">Confirmed or fulfilled orders are the sales that have happened.</span>
        </p>

        {data.orders.length === 0 ? (
          <Card>
            <p className="mb-0 text-muted">
              No order has been recorded yet. A sale appears here as soon as checkout records one.
            </p>
          </Card>
        ) : (
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <caption>
                Real order records. The Commission column stays blank until the office configures
                rates.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Placed</th>
                  <th scope="col">Customer</th>
                  <th scope="col" className="table__numeric">
                    Sale value
                  </th>
                  <th scope="col">Fulfilment</th>
                  <th scope="col">Attributed to</th>
                  <th scope="col">Commission</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((record) => (
                  <tr key={record.order.number}>
                    <td>
                      {canOpenOrders ? (
                        <Link href={`/staff/orders/${encodeURIComponent(record.order.number)}`}>
                          <code>{record.order.number}</code>
                        </Link>
                      ) : (
                        <code>{record.order.number}</code>
                      )}
                    </td>
                    <td className="text-sm">
                      {record.order.placed_at
                        ? new Date(record.order.placed_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>{record.order.customer_name}</td>
                    <td className="table__numeric">
                      {formatMinorUnits(record.order.total_cents, record.order.currency)}
                    </td>
                    <td>
                      <Badge tone={LIFECYCLE_TONE[record.lifecycle_status]}>
                        {ORDER_LIFECYCLE_LABEL[record.lifecycle_status]}
                      </Badge>
                    </td>
                    <td className="text-sm text-muted">Not recorded</td>
                    <td>
                      <BlankAmount />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-sm text-muted mt-4">
          Attribution — which agent gets credit — is not recorded on an order yet; that input
          arrives with the engine. A cancelled order stays on this list and becomes a reversal line
          on the statement, never a silent deduction.
        </p>
      </PageSection>

      <PageSection>
        <Card header={<h2>Next step</h2>}>
          <p>
            Commission rates and targets are set by the office — not in this portal. Ask the office
            to publish the rule sheet; the figures on this screen fill in from that answer, and from
            nowhere else.
          </p>
          <p className="mb-0">
            <a className="btn btn--primary" href={FAMILY_HELP.phoneHref}>
              Ask the office about commission rates
            </a>
          </p>
        </Card>
      </PageSection>
    </>
  );
}
