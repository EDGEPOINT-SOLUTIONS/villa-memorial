"use client";

import { useEffect, useMemo, useState } from "react";
import { CasketCard } from "@/components/villa/casket-catalogue";
import {
  EmptyState,
  ListingShell,
  PublicDisclosure,
  RefinePanel,
  ResultsGrid,
  type RefineGroup,
} from "@/components/kit";
import {
  casketFacetCounts,
  casketFacetIds,
  casketFiltersCount,
  casketListingQuery,
  casketPriceBands,
  matchesCasketFilters,
  parseCasketsSort,
  sortCaskets,
  type CasketFilters,
  type CasketListingItem,
  type CasketsSort,
} from "@/lib/casket-listing";
import { orderedPesoBounds, parsePesoCents } from "@/lib/listing-model";
import { gridVisibleCount } from "@/lib/public-layout";

/**
 * The /products catalogue as a product listing (captain 2026-09-25: the public
 * pages should read like a well-run product listing — "filters that stay in
 * view while scrolling (sticky rail on the left, a filter sheet on phones),
 * deliberate even columns").
 *
 * WHY IT IS A CLIENT COMPONENT: filtering and sorting happen in place — no
 * navigation, no server round trip, the counts and the grid update together and
 * the scroll position survives. The server page loads and binds the 24 models
 * once and passes them in; this component owns the view state and mirrors it
 * into the URL with `history.replaceState`, so a filtered view is shareable and
 * survives a hard reload. The initial state is parsed server-side from the
 * query string and passed in, so the first paint shows the view the URL names.
 *
 * The rail, the results bar and the grid are the shared kit shell
 * (`ListingShell` + `RefinePanel` + `ResultsGrid`), the same grammar /lots uses,
 * so a reader who scans one catalogue already knows the other.
 */
export function ProductsListing({
  items,
  initialFilters,
  initialSort,
}: {
  items: CasketListingItem[];
  initialFilters: CasketFilters;
  initialSort: CasketsSort;
}) {
  const [filters, setFilters] = useState<CasketFilters>(initialFilters);
  const [sort, setSort] = useState<CasketsSort>(initialSort);

  // The URL is the serialisation of the view state — never a navigation.
  useEffect(() => {
    window.history.replaceState(null, "", casketListingQuery(filters, sort));
  }, [filters, sort]);

  const visible = useMemo(
    () => sortCaskets(items.filter((item) => matchesCasketFilters(item, filters)), sort),
    [items, filters, sort],
  );
  const facetIds = useMemo(() => casketFacetIds(items), [items]);
  const counts = useMemo(() => casketFacetCounts(items, filters, facetIds), [items, filters, facetIds]);
  const bands = useMemo(() => casketPriceBands(items), [items]);
  const activeCount = casketFiltersCount(filters);

  const toggle = (groupKey: string, id: string) => {
    const key = groupKey === "collection" ? "collections" : "covers";
    setFilters((current) => {
      const values = current[key];
      return {
        ...current,
        [key]: values.includes(id) ? values.filter((v) => v !== id) : [...values, id],
      };
    });
  };
  const clear = () => setFilters({ collections: [], covers: [], priceMinCents: null, priceMaxCents: null });
  const applyPrice = (min: string, max: string) =>
    setFilters((current) => {
      const [lo, hi] = orderedPesoBounds(parsePesoCents(min), parsePesoCents(max));
      return { ...current, priceMinCents: lo, priceMaxCents: hi };
    });

  const groups: RefineGroup[] = [
    {
      key: "collection",
      title: "Collection",
      options: facetIds.collections.map((id) => ({ id, label: id })),
      counts: counts.collections,
      selected: filters.collections,
    },
    {
      key: "cover",
      title: "Cover",
      options: facetIds.covers.map((id) => ({
        id,
        label: id === "Unstated" ? "Cover not stated" : id,
      })),
      counts: counts.covers,
      selected: filters.covers,
    },
  ];

  const windowSize = gridVisibleCount(visible.length);
  const shown = visible.slice(0, windowSize);
  const rest = visible.slice(windowSize);

  return (
    <ListingShell
      railLabel="Refine coffins"
      railActiveCount={activeCount}
      sheetAction={
        {
          label: `Show ${visible.length} model${visible.length === 1 ? "" : "s"}`,
          onClick: () => {},
        }
      }
      rail={
        <RefinePanel
          title="Refine coffins by"
          groups={groups}
          onToggle={toggle}
          onClear={clear}
          activeCount={activeCount}
          price={{
            minCents: filters.priceMinCents,
            maxCents: filters.priceMaxCents,
            quickRanges: bands,
            onApply: applyPrice,
            onQuickRange: (range) =>
              setFilters((current) => ({
                ...current,
                priceMinCents: range.minCents,
                priceMaxCents: range.maxCents,
              })),
          }}
        />
      }
      bar={
        <>
          <p className="listing-bar__count">
            <strong>{visible.length}</strong> of {items.length} models
          </p>
          <label className="listing-sort">
            <span className="listing-sort__label">Sort</span>
            <select
              className="select listing-sort__select"
              value={sort}
              onChange={(event) => setSort(parseCasketsSort(event.target.value))}
            >
              <option value="">Catalogue order</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>
        </>
      }
    >
      {visible.length === 0 ? (
        <div className="stack-3">
          <EmptyState
            title="No models match those filters"
            hint="Clear a filter, or contact the office for a model not shown here."
          />
          <p>
            <button type="button" className="btn btn--secondary btn--sm" onClick={clear}>
              Clear all filters
            </button>
          </p>
        </div>
      ) : (
        <>
          <ResultsGrid
            items={shown}
            itemKey={(item) => item.sku}
            emptyTitle="No models in this catalogue yet"
            className="casket-grid"
            renderItem={(item) => <CasketCard item={item} />}
          />
          {rest.length > 0 ? (
            <PublicDisclosure count={visible.length} summary={`Show all ${visible.length} models`}>
              <ResultsGrid
                items={rest}
                itemKey={(item) => item.sku}
                emptyTitle="No models in this catalogue yet"
                className="casket-grid"
                renderItem={(item) => <CasketCard item={item} />}
              />
            </PublicDisclosure>
          ) : null}
        </>
      )}
    </ListingShell>
  );
}
