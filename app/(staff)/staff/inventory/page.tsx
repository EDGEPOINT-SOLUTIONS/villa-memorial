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
  type InventoryItem,
  type InventoryMovement,
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
 *
 * Layout renders through the component kit (`components/kit`): the two tables are
 * `DataTable`, the KPI tiles `StatCard`, each state chip `StatusChip` — the same
 * markup the page rendered by hand, now from one home.
 */

type InventorySearch = {
  category?: string;
  state?: string;
  q?: string;
};

const STOCK_STATES = ["out", "low", "in_stock"] as const;

const ITEM_COLUMNS: ReadonlyArray<DataTableColumn<InventoryItem>> = [
  { key: "item", header: "Item" },
  { key: "category", header: "Category" },
  { key: "on_hand", header: "On hand" },
  { key: "state", header: "State" },
  { key: "reorder", header: "Reorder at", numeric: true },
  { key: "supplier", header: "Supplier" },
  { key: "location", header: "Location" },
  { key: "cost", header: "Cost", numeric: true },
  { key: "price", header: "Price", numeric: true },
];

const MOVEMENT_COLUMNS: ReadonlyArray<DataTableColumn<InventoryMovement>> = [
  { key: "date", header: "Date", className: "nowrap" },
  { key: "item", header: "Item" },
  { key: "movement", header: "Movement" },
  { key: "change", header: "Change", numeric: true },
  { key: "reference", header: "Reference" },
  { key: "by", header: "Recorded by" },
];

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
        lead="Stock on hand and the recorded movements that changed it."
        actions={
          <span className="text-sm text-muted">
            {summary.tracked} items · {summary.units_on_hand} units on hand
          </span>
        }
      />

      <PageSection>
        <Alert tone="warning">
          <p className="mb-0">{INVENTORY_NOT_WIRED}</p>
        </Alert>
      </PageSection>

      <PageSection>
        <div className="kpi-grid">
          <StatCard
            label="Items tracked"
            value={summary.tracked}
            sub={`${summary.in_stock} in stock`}
          />
          <StatCard
            href="/staff/inventory?state=out"
            label="Out of stock"
            value={summary.out}
            sub="reorder now"
          />
          <StatCard
            href="/staff/inventory?state=low"
            label="Low stock"
            value={summary.low}
            sub="at or below the reorder level"
          />
          <StatCard
            label="Stock value (at cost)"
            value={formatMinorUnits(summary.cost_cents)}
            sub={
              summary.cost_missing > 0
                ? `${summary.cost_missing} item${summary.cost_missing === 1 ? "" : "s"} ${summary.cost_missing === 1 ? "carries" : "carry"} no recorded cost`
                : "recorded cost × on hand"
            }
          />
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

        <DataTable<InventoryItem>
          columns={ITEM_COLUMNS}
          rows={items}
          rowKey={(item) => item.id}
          renderCell={(item, column) => {
            const state = inventoryState(item);
            switch (column.key) {
              case "item":
                return (
                  <>
                    <div className="table__name">{item.name}</div>
                    <div className="table__sub">
                      <code>{item.sku}</code>
                    </div>
                  </>
                );
              case "category":
                return INVENTORY_CATEGORY_LABEL[item.category];
              case "on_hand":
                return (
                  <>
                    {item.on_hand} <span className="text-muted text-sm">{item.unit}</span>
                  </>
                );
              case "state":
                return (
                  <StatusChip tone={INVENTORY_STATE_TONE[state]}>
                    {INVENTORY_STATE_LABEL[state]}
                  </StatusChip>
                );
              case "reorder":
                return item.reorder_level > 0 ? item.reorder_level : "—";
              case "supplier":
                return item.supplier ?? <span className="text-muted">Not recorded</span>;
              case "location":
                return item.location ?? <span className="text-muted">—</span>;
              case "cost":
                return item.cost_cents === null ? (
                  <span className="text-muted">—</span>
                ) : (
                  formatMinorUnits(item.cost_cents)
                );
              case "price":
                return item.price_cents === null ? (
                  <span className="text-muted">Not listed</span>
                ) : (
                  formatMinorUnits(item.price_cents)
                );
              default:
                return null;
            }
          }}
          caption={
            <>
              Out-of-stock and low rows lead; every amount is the recorded file, and a
              catalogue price is read live from the catalogue.
            </>
          }
          emptyTitle={hasFilter ? "No stock matches your filter" : "No stock recorded"}
          emptyHint={
            hasFilter
              ? "Try a different category, state or search."
              : "Stock lines appear here once the office records them."
          }
        />
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">Movement history</h2>
        <p className="text-sm text-muted">
          Newest first — what came in, what went to a case, and every stock adjustment on
          record. {movements.length} movement{movements.length === 1 ? "" : "s"}.
        </p>
        <DataTable<InventoryMovement>
          columns={MOVEMENT_COLUMNS}
          rows={movements}
          rowKey={(movement) => movement.id}
          renderCell={(movement, column) => {
            const item = itemsById.get(movement.item_id);
            switch (column.key) {
              case "date":
                return formatDay(movement.at);
              case "item":
                return (
                  <>
                    <div className="table__name">{item?.name ?? movement.item_id}</div>
                    <div className="table__sub">
                      <code>{item?.sku ?? movement.item_id}</code>
                    </div>
                  </>
                );
              case "movement":
                return (
                  <StatusChip tone={MOVEMENT_KIND_TONE[movement.kind]}>
                    {MOVEMENT_KIND_LABEL[movement.kind]}
                  </StatusChip>
                );
              case "change":
                return movementDelta(movement.quantity);
              case "reference":
                return movement.reference ? <code>{movement.reference}</code> : "—";
              case "by":
                return movement.by ?? <span className="text-muted">—</span>;
              default:
                return null;
            }
          }}
          caption={
            <>
              Every movement sums to the item&rsquo;s on-hand count — the stock file cannot
              carry a quantity its own history contradicts.
            </>
          }
          emptyTitle="No movements recorded"
          emptyHint="Received, allocated and adjusted rows appear here once the office records them."
        />
      </PageSection>
    </>
  );
}
