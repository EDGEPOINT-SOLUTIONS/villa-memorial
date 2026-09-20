"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductCard, ResultsGrid } from "@/components/kit";
import type { LotStatus } from "@/lib/api-client/property";
import { formatMinorUnits } from "@/lib/money";
import { LOT_TONE, lotStatusLabel } from "@/lib/lot-labels";
import {
  EMPTY_LOT_FILTERS,
  facetCounts,
  lotFiltersCount,
  lotListingQuery,
  matchesListingFilters,
  parseLotsSort,
  pesoInputToCents,
  priceQuickRanges,
  sortListingItems,
  type LotFilters,
  type LotListingItem,
  type LotsSort,
  type PriceQuickRange,
} from "@/lib/lot-listing";
import { RefinePanel, type RefineOption } from "./lot-filters";

/**
 * The /lots listing surface (captain 2026-09-20).
 *
 * WHY IT IS A CLIENT COMPONENT: the second addition made filtering local — no
 * navigation, no server round trip, the results and the counts update in place
 * and the scroll position survives. So the server page loads the plots once and
 * this component owns the filter/sort state, mirroring it into the URL with
 * `history.replaceState` (shareable, reload-safe, no history spam). The initial
 * state is parsed server-side from the query string and passed in, so a hard
 * reload renders the filtered view it describes.
 *
 * The photograph, the caption and the href of every card are precomputed on the
 * server (lib/lot-imagery.ts) — the client only filters, sorts and renders the
 * shop card grammar.
 */
export function LotListing({
  items,
  parks,
  statuses,
  types,
  sections,
  initialFilters,
  initialSort,
}: {
  items: LotListingItem[];
  parks: RefineOption[];
  statuses: RefineOption[];
  types: RefineOption[];
  sections: string[];
  initialFilters: LotFilters;
  initialSort: LotsSort;
}) {
  const [filters, setFilters] = useState<LotFilters>(initialFilters);
  const [sort, setSort] = useState<LotsSort>(initialSort);
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetButtonRef = useRef<HTMLButtonElement | null>(null);
  const sheetId = useId();

  // The URL is the serialisation of the view state — never a navigation.
  useEffect(() => {
    window.history.replaceState(null, "", lotListingQuery(filters, sort));
  }, [filters, sort]);

  const visible = useMemo(
    () => sortListingItems(items.filter((item) => matchesListingFilters(item, filters)), sort),
    [items, filters, sort],
  );
  const counts = useMemo(
    () =>
      facetCounts(items, filters, {
        parks: parks.map((p) => p.id),
        statuses: statuses.map((s) => s.id),
        types: types.map((t) => t.id),
        sections,
      }),
    [items, filters, parks, statuses, types, sections],
  );
  const quickRanges = useMemo(() => priceQuickRanges(items), [items]);
  const activeCount = lotFiltersCount(filters);

  const toggle = (
    group: "parks" | "statuses" | "types" | "sections" | "areas",
    id: string,
  ) => {
    setFilters((current) => {
      const values = current[group];
      return {
        ...current,
        [group]: values.includes(id) ? values.filter((v) => v !== id) : [...values, id],
      };
    });
  };
  const clear = () => setFilters({ ...EMPTY_LOT_FILTERS });
  const applyPrice = (min: string, max: string) =>
    setFilters((current) => {
      let priceMinCents = pesoInputToCents(min);
      let priceMaxCents = pesoInputToCents(max);
      if (priceMinCents !== null && priceMaxCents !== null && priceMinCents > priceMaxCents) {
        [priceMinCents, priceMaxCents] = [priceMaxCents, priceMinCents];
      }
      return { ...current, priceMinCents, priceMaxCents };
    });
  const applyQuickRange = (range: PriceQuickRange) =>
    setFilters((current) => ({
      ...current,
      priceMinCents: range.minCents,
      priceMaxCents: range.maxCents,
    }));

  const panelProps = {
    filters,
    counts,
    parks,
    statuses,
    types,
    sections,
    priceRanges: quickRanges,
    onToggle: toggle,
    onClear: clear,
    onPriceApply: applyPrice,
    onQuickRange: applyQuickRange,
  };

  const available = visible.filter((item) => item.status === "available").length;

  return (
    <div className="lot-layout">
      <aside className="lot-rail" aria-label="Refine lots">
        <RefinePanel {...panelProps} />
      </aside>

      {/* Phone: the same panel behind one control, with its own Show-results
          action. It opens in place (never over a card, no focus trap). */}
      <div className="lot-sheet">
        <button
          type="button"
          className="lot-sheet__toggle"
          aria-expanded={sheetOpen}
          aria-controls={sheetId}
          ref={sheetButtonRef}
          onClick={() => setSheetOpen((open) => !open)}
        >
          <SlidersHorizontal size={18} aria-hidden="true" />
          <span className="lot-sheet__toggle-label">
            Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </span>
        </button>
        {sheetOpen ? (
          <div id={sheetId} className="lot-sheet__panel">
            <RefinePanel
              {...panelProps}
              applyLabel={`Show ${visible.length} lot${visible.length === 1 ? "" : "s"}`}
              onApply={() => {
                setSheetOpen(false);
                sheetButtonRef.current?.focus();
              }}
            />
          </div>
        ) : null}
      </div>

      <div className="lot-results">
        <div className="lot-results__bar">
          <p className="lot-results__count">
            <strong>{visible.length}</strong> of {items.length} plots ·{" "}
            <strong>{available}</strong> available
          </p>
          <label className="lot-sort">
            <span className="lot-sort__label">Sort</span>
            <select
              className="select lot-sort__select"
              value={sort}
              onChange={(event) => setSort(parseLotsSort(event.target.value))}
            >
              <option value="">Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </label>
        </div>

        {visible.length === 0 ? (
          <div className="stack-3">
            <EmptyState
              title="No plots match those filters"
              hint="Clear a filter, or contact the memorial park office."
            />
            <p>
              <button type="button" className="btn btn--secondary btn--sm" onClick={clear}>
                Clear all filters
              </button>
            </p>
          </div>
        ) : (
          <div className="catalogue-index">
            {parks.map((park) => {
              const parkItems = visible.filter((item) => item.parkId === park.id);
              if (parkItems.length === 0) return null;
              const parkAvailable = parkItems.filter(
                (item) => item.status === "available",
              ).length;
              return (
                <section key={park.id} className="cat-band" aria-label={park.label}>
                  <header className="band-head">
                    <h2 className="band-head__title">{park.label}</h2>
                    <span className="band-head__count">
                      {parkItems.length} plot{parkItems.length === 1 ? "" : "s"} · {parkAvailable}{" "}
                      available · {parkItems[0]?.parkBranch}
                    </span>
                  </header>
                  <ResultsGrid
                    items={parkItems}
                    itemKey={(item) => item.key}
                    emptyTitle="No plots to show"
                    className="lot-grid"
                    renderItem={(item) => <LotCard item={item} />}
                  />
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** One plot as a product card: photograph, number, facts, figure, status, one
 *  action — the order the captain's brief names. */
function LotCard({ item }: { item: LotListingItem }) {
  const status = item.status as LotStatus;
  return (
    <ProductCard
      href={item.href}
      photo={{
        src: item.photo.src,
        srcSet: item.photo.srcSet,
        /* The card column: 3–4 across beside the rail, 2 under it, 1 on a
           phone — the hint must match those. */
        sizes: "(min-width: 64rem) 25vw, (min-width: 40rem) 46vw, 92vw",
        width: item.photo.width,
        height: item.photo.height,
        alt: item.photo.caption,
      }}
      eyebrow={item.typeName}
      title={item.code}
      supporting={item.facts}
      price={
        item.priceCents !== null
          ? formatMinorUnits(item.priceCents, item.currency)
          : "Price on request"
      }
      priceNote={item.hasLot ? "published plot price" : "the office quotes per plot"}
      status={{ tone: LOT_TONE[status] ?? "neutral", label: lotStatusLabel(status) }}
      caption={item.photo.caption}
      actions={
        item.hasLot ? (
          <Link href={item.href} className="btn btn--primary btn--sm">
            View this lot
          </Link>
        ) : (
          <Link href={item.href} className="btn btn--primary btn--sm">
            View on the park map
          </Link>
        )
      }
    />
  );
}
