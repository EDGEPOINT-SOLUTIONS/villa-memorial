import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { ApiError } from "@/lib/api-client/api-error";
import { INVENTORY_NOT_WIRED, loadInventory } from "@/lib/api-client/inventory";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { formatMinorUnits } from "@/lib/money";
import { hasAnyScope } from "@/lib/rbac/nav";
import {
  INVENTORY_CATEGORIES,
  INVENTORY_CATEGORY_LABEL,
  INVENTORY_STATE_LABEL,
  INVENTORY_STATE_TONE,
  MOVEMENT_KIND_LABEL,
  MOVEMENT_KIND_TONE,
  filterInventoryItems,
  inventoryState,
  inventorySummary,
  movementDelta,
  sortInventoryItems,
  sortMovements,
} from "@/lib/inventory";

export const metadata = { title: "Inventory — Admin Portal" };

/**
 * Staff Inventory (the stock room as a screen).
 *
 * WHY IT LOOKS LIKE RECORDS AND NOT LIKE A SERVICE: no inventory service exists —
 * no contract names one. This screen reads the office's recorded stock file
 * (`lib/api-client/inventory.ts`) through the same designed-screen-over-recorded-
 * data pattern as the commission, lot-record and guarantee screens, and names the
 * missing service in one line above the data. The items' prices are resolved from
 * the durable catalogue (the store the storefront sells from), so a price edit on
 * `/staff/catalog` is what this screen shows; a stock line the catalogue does not
 * carry prints "Not listed", never an invented amount. Movements are the record's
 * own; a row with no supplier, location, cost or movement reference prints the
 * missing state instead of a guess.
 *
 * READ-ONLY: purchasing and stock adjustments arrive with the inventory service;
 * nothing on this screen writes.
 */

type InventorySearch = {
  category?: string;
  state?: string;
  q?: string;
};

const STOCK_STATES = ["out", "low", "in_stock"] as const;

function isStockState(value: string): value is (typeof STOCK_STATES)[number] {
  return (STOCK_STATES as readonly string[]).includes(value);
}

function isCategory(value: string): value is (typeof INVENTORY_CATEGORIES)[number] {
  return (INVENTORY_CATEGORIES as readonly string[]).includes(value);
}

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

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<InventorySearch>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["catalog:write"])) {
    return (
      <>
        <PageHeader eyebrow="Commerce" title="Inventory" />
        <PageSection>
          <ForbiddenState requiredScopes={["catalog:write"]} />
        </PageSection>
      </>
    );
  }

  let view;
  try {
    view = await loadInventory();
  } catch (err) {
    return (
      <>
        <PageHeader eyebrow="Commerce" title="Inventory" />
        <PageSection>
          <ErrorState
            message={
              err instanceof ApiError ? err.message : "Unable to load the recorded stock file."
            }
          />
        </PageSection>
      </>
    );
  }

  const params = await searchParams;
  const category = (params.category ?? "").trim();
  const stateFilter = (params.state ?? "").trim();
  const query = (params.q ?? "").trim().toLowerCase();
  const hasFilter = Boolean(category || stateFilter || query);

  const summary = inventorySummary(view.items);
  const items = filterInventoryItems(sortInventoryItems(view.items), {
    category,
    state: stateFilter,
    query,
  });

  const itemsById = new Map(view.items.map((item) => [item.id, item]));
  const movements = sortMovements(view.movements);

  return (
    <>
      <PageHeader
        eyebrow="Commerce"
        title="Inventory"
        actions={
          <span className="text-sm text-muted">
            {summary.tracked} items · {summary.units_on_hand} units on hand
          </span>
        }
      />

      <PageSection>
        <div className="alert alert--warning">
          <p className="mb-0">{INVENTORY_NOT_WIRED}</p>
        </div>
      </PageSection>

      <PageSection>
        <div className="kpi-grid">
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Items tracked</span>
              <span className="kpi-card__value">{summary.tracked}</span>
              <span className="kpi-card__sub">{summary.in_stock} in stock</span>
            </span>
          </span>
          <Link href="/staff/inventory?state=out" className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Out of stock</span>
              <span className="kpi-card__value">{summary.out}</span>
              <span className="kpi-card__sub">reorder now</span>
            </span>
          </Link>
          <Link href="/staff/inventory?state=low" className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Low stock</span>
              <span className="kpi-card__value">{summary.low}</span>
              <span className="kpi-card__sub">at or below the reorder level</span>
            </span>
          </Link>
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Stock value (at cost)</span>
              <span className="kpi-card__value">{formatMinorUnits(summary.cost_cents)}</span>
              <span className="kpi-card__sub">
                {summary.cost_missing > 0
                  ? `${summary.cost_missing} item${summary.cost_missing === 1 ? "" : "s"} ${summary.cost_missing === 1 ? "carries" : "carry"} no recorded cost`
                  : "recorded cost × on hand"}
              </span>
            </span>
          </span>
        </div>
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">Items on the shelf</h2>
        <form className="filter-bar" role="search">
          <select
            className="select"
            name="category"
            defaultValue={isCategory(category) ? category : ""}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {INVENTORY_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {INVENTORY_CATEGORY_LABEL[value]}
              </option>
            ))}
          </select>
          <select
            className="select"
            name="state"
            defaultValue={isStockState(stateFilter) ? stateFilter : ""}
            aria-label="Filter by stock state"
          >
            <option value="">All stock states</option>
            {STOCK_STATES.map((value) => (
              <option key={value} value={value}>
                {INVENTORY_STATE_LABEL[value]}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search name or SKU"
            aria-label="Search by name or SKU"
          />
          <button className="btn btn--primary btn--sm" type="submit">
            Filter
          </button>
          {hasFilter ? (
            <Link className="btn btn--ghost btn--sm" href="/staff/inventory">
              Clear
            </Link>
          ) : null}
        </form>

        {items.length === 0 ? (
          <EmptyState
            title={hasFilter ? "No stock matches your filter" : "No stock recorded"}
            hint={
              hasFilter
                ? "Try a different category, state or search."
                : "Stock lines appear here once the office records them."
            }
          />
        ) : (
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <caption>
                Out-of-stock and low rows lead; every amount is the recorded file, and a
                catalogue price is read live from the catalogue.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Category</th>
                  <th scope="col">On hand</th>
                  <th scope="col">State</th>
                  <th scope="col" className="table__numeric">
                    Reorder at
                  </th>
                  <th scope="col">Supplier</th>
                  <th scope="col">Location</th>
                  <th scope="col" className="table__numeric">
                    Cost
                  </th>
                  <th scope="col" className="table__numeric">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const state = inventoryState(item);
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="table__name">{item.name}</div>
                        <div className="table__sub">
                          <code>{item.sku}</code>
                        </div>
                      </td>
                      <td>{INVENTORY_CATEGORY_LABEL[item.category]}</td>
                      <td>
                        {item.on_hand}{" "}
                        <span className="text-muted text-sm">{item.unit}</span>
                      </td>
                      <td>
                        <Badge tone={INVENTORY_STATE_TONE[state]}>
                          {INVENTORY_STATE_LABEL[state]}
                        </Badge>
                      </td>
                      <td className="table__numeric">
                        {item.reorder_level > 0 ? item.reorder_level : "—"}
                      </td>
                      <td>{item.supplier ?? <span className="text-muted">Not recorded</span>}</td>
                      <td>{item.location ?? <span className="text-muted">—</span>}</td>
                      <td className="table__numeric">
                        {item.cost_cents === null ? (
                          <span className="text-muted">—</span>
                        ) : (
                          formatMinorUnits(item.cost_cents)
                        )}
                      </td>
                      <td className="table__numeric">
                        {item.price_cents === null ? (
                          <span className="text-muted">Not listed</span>
                        ) : (
                          formatMinorUnits(item.price_cents)
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">Movement history</h2>
        <p className="text-sm text-muted">
          Newest first — what came in, what went to a case, and every stock adjustment on
          record. {movements.length} movement{movements.length === 1 ? "" : "s"}.
        </p>
        {movements.length === 0 ? (
          <EmptyState
            title="No movements recorded"
            hint="Received, allocated and adjusted rows appear here once the office records them."
          />
        ) : (
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <caption>
                Every movement sums to the item&rsquo;s on-hand count — the stock file cannot
                carry a quantity its own history contradicts.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Item</th>
                  <th scope="col">Movement</th>
                  <th scope="col" className="table__numeric">
                    Change
                  </th>
                  <th scope="col">Reference</th>
                  <th scope="col">Recorded by</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => {
                  const item = itemsById.get(movement.item_id);
                  return (
                    <tr key={movement.id}>
                      <td className="nowrap">{formatDay(movement.at)}</td>
                      <td>
                        <div className="table__name">{item?.name ?? movement.item_id}</div>
                        <div className="table__sub">
                          <code>{item?.sku ?? movement.item_id}</code>
                        </div>
                      </td>
                      <td>
                        <Badge tone={MOVEMENT_KIND_TONE[movement.kind]}>
                          {MOVEMENT_KIND_LABEL[movement.kind]}
                        </Badge>
                      </td>
                      <td className="table__numeric">{movementDelta(movement.quantity)}</td>
                      <td>
                        {movement.reference ? <code>{movement.reference}</code> : "—"}
                      </td>
                      <td>{movement.by ?? <span className="text-muted">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>
    </>
  );
}
