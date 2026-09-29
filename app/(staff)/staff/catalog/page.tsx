import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { ApiError } from "@/lib/api-client/api-error";
import { listAdminCatalogItems, type AdminCatalogItem } from "@/lib/api-client/commerce";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import {
  CATALOG_ITEM_TYPES,
  CATALOG_ITEM_TYPE_LABEL,
  type CatalogItemType,
} from "@/lib/catalog-admin";
import { hasAnyScope } from "@/lib/rbac/nav";
import { isItemEntrySku } from "@/lib/catalogue-content";
import { CatalogPublishToggle } from "./publish-toggle";

export const metadata = { title: "Catalog — Admin Portal" };

/**
 * Staff Catalogue admin (ready phase of the admin-commerce plan): every item the
 * storefront sells, with server-driven search and type/published filters.
 *
 * Reads are gated on the frozen `catalog:read` scope; the create/edit routes and
 * the publish toggle need `catalog:write`, and a reader without it sees this
 * list read-only with the reason. Every row comes from the durable catalogue
 * store (lib/api-client/catalog-store.ts), which is the SAME fold the public
 * storefront, quote basket and the office read — so what an admin changes here is what a
 * visitor is offered on the next request.
 *
 * Live mode has no catalogue write API (the contract ask is in the PR): the
 * reader answers 503 and this screen shows the honest not-wired-yet reason
 * instead of a fake write.
 */

const STATES = ["published", "unpublished"] as const;
type PublishState = (typeof STATES)[number];

const PUBLISH_STATE_LABEL: Record<PublishState, string> = {
  published: "On the storefront",
  unpublished: "Off the storefront",
};

type CatalogSearch = {
  q?: string;
  type?: string;
  state?: string;
  created?: string;
  updated?: string;
};

function matchesFilters(record: AdminCatalogItem, filters: Required<Pick<CatalogSearch, "q" | "type" | "state">>): boolean {
  const item = record.item;
  if (filters.type && item.item_type !== filters.type) return false;
  if (filters.state === "published" && !record.published) return false;
  if (filters.state === "unpublished" && record.published) return false;
  if (filters.q) {
    const haystack = [item.sku, item.name, item.description ?? ""].join(" ").toLowerCase();
    if (!haystack.includes(filters.q.toLowerCase())) return false;
  }
  return true;
}

function updatedStamp(record: AdminCatalogItem): string {
  const iso = record.updated_at;
  if (!/^\d{4}-\d{2}-\d{2}T/.test(iso)) return "—";
  return new Date(iso).toLocaleDateString();
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearch>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["catalog:read"])) {
    return (
      <>
        <PageHeader eyebrow="Commerce" title="Catalog" />
        <PageSection>
          <ForbiddenState requiredScopes={["catalog:read"]} />
        </PageSection>
      </>
    );
  }

  let records: AdminCatalogItem[];
  try {
    records = await listAdminCatalogItems();
  } catch (err) {
    return (
      <>
        <PageHeader eyebrow="Commerce" title="Catalog" />
        <PageSection>
          <ErrorState
            message={err instanceof ApiError ? err.message : "Unable to load the catalog just now."}
          />
        </PageSection>
      </>
    );
  }

  const params = await searchParams;
  const filters = {
    q: (params.q ?? "").trim(),
    type: CATALOG_ITEM_TYPES.includes(params.type as CatalogItemType)
      ? (params.type as string)
      : "",
    state: STATES.includes(params.state as PublishState) ? (params.state as string) : "",
  };
  const hasFilter = Boolean(filters.q || filters.type || filters.state);
  const filtered = records.filter((record) => matchesFilters(record, filters));
  const canWrite = hasAnyScope(session.scopes, ["catalog:write"]);
  const publishedCount = records.filter((record) => record.published).length;
  const settled = params.updated ?? params.created;

  return (
    <>
      <PageHeader
        eyebrow="Commerce"
        title="Catalog"
        lead="Everything the storefront sells — models, packages and service lines."
        actions={
          <>
            <span className="text-sm text-muted">
              {records.length} items · {publishedCount} on the storefront
            </span>
            {canWrite ? (
              <Link href="/staff/catalog/new" className="btn btn--primary btn--sm">
                + New catalog item
              </Link>
            ) : null}
          </>
        }
      />

      <PageSection>
        {/* The type vocabulary is the UPSTREAM CONTRACT's, not ours: order-payment-api-v1
            names exactly `package | service | add_on`, so a casket has to be filed as an
            add-on on the wire. Saying so here is cheaper and more honest than renaming a
            frozen enum — the office should not have to guess why "Add-on" returns coffins.
            A first-class product type is a contract ask, recorded with this phase. */}
        <Alert tone="info" title="About the item types">
          The three types are the platform contract&rsquo;s own words. The 24 casket models
          are its <code>add_on</code> rows, so filtering by <strong>Add-on</strong> lists
          them; packages and service lines are named as they read.
        </Alert>

        {settled ? (
          <Alert tone="success" title="Catalog saved">
            <code>{settled}</code> {params.updated ? "was updated." : "was added to the catalog."}{" "}
            The storefront, quote basket and the office read it on their next request.
          </Alert>
        ) : null}

        {!canWrite ? (
          <Alert tone="info" title="Read-only">
            You can view the catalog but not change it. Creating, editing or taking an item
            off the storefront needs the <code>catalog:write</code> permission.
          </Alert>
        ) : null}

        <form className="filter-bar" role="search">
          <input
            className="input"
            type="search"
            name="q"
            placeholder="SKU, name or description"
            aria-label="Search catalog items"
            defaultValue={filters.q}
          />
          <select
            className="select"
            name="type"
            defaultValue={filters.type}
            aria-label="Filter by item type"
          >
            <option value="">All types</option>
            {CATALOG_ITEM_TYPES.map((type) => (
              <option key={type} value={type}>
                {CATALOG_ITEM_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
          <select
            className="select"
            name="state"
            defaultValue={filters.state}
            aria-label="Filter by storefront state"
          >
            <option value="">All states</option>
            {STATES.map((state) => (
              <option key={state} value={state}>
                {PUBLISH_STATE_LABEL[state]}
              </option>
            ))}
          </select>
          <button className="btn btn--primary btn--sm" type="submit">
            Filter
          </button>
          {hasFilter ? (
            <Link className="btn btn--ghost btn--sm" href="/staff/catalog">
              Clear
            </Link>
          ) : null}
        </form>

        {filtered.length === 0 ? (
          <EmptyState
            title={hasFilter ? "No catalog items match your filter" : "The catalog is empty"}
            hint={
              hasFilter
                ? "Try a different type, state or search term."
                : canWrite
                  ? "Add the first item the storefront should sell — the public catalogs read it immediately."
                  : "Items appear here as soon as the office adds them."
            }
          />
        ) : (
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">SKU</th>
                  <th scope="col">Name</th>
                  <th scope="col">Type</th>
                  <th scope="col">Unit price</th>
                  <th scope="col">Currency</th>
                  <th scope="col">Storefront</th>
                  <th scope="col">Updated</th>
                  {canWrite ? <th scope="col">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => (
                  <tr key={record.item.id}>
                    <td>
                      {canWrite ? (
                        <Link href={`/staff/catalog/${record.item.id}/edit`}>
                          <code>{record.item.sku}</code>
                        </Link>
                      ) : (
                        <code>{record.item.sku}</code>
                      )}
                    </td>
                    <td>
                      <strong>{record.item.name}</strong>
                      {record.item.description ? (
                        <>
                          <br />
                          <span className="text-sm text-muted">{record.item.description}</span>
                        </>
                      ) : null}
                    </td>
                    <td className="text-sm">{CATALOG_ITEM_TYPE_LABEL[record.item.item_type]}</td>
                    <td>{record.item.display_price}</td>
                    <td className="text-sm">{record.item.currency}</td>
                    <td>
                      <Badge tone={record.published ? "success" : "neutral"}>
                        {record.published ? "Published" : "Deactivated"}
                      </Badge>
                    </td>
                    <td className="text-sm">{updatedStamp(record)}</td>
                    {canWrite ? (
                      <td>
                        <div className="row row--wrap">
                          <Link
                            href={`/staff/catalog/${record.item.id}/edit`}
                            className="btn btn--secondary btn--sm"
                          >
                            Edit
                          </Link>
                          {isItemEntrySku(record.item.sku) ? (
                            <Link
                              href={`/staff/catalog/${record.item.id}/content`}
                              className="btn btn--secondary btn--sm"
                            >
                              Page content
                            </Link>
                          ) : null}
                          <CatalogPublishToggle record={record} />
                        </div>
                      </td>
                    ) : null}
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
