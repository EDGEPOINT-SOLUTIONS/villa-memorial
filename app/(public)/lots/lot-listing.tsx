"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ListingShell,
  ProductCard,
  PublicDisclosure,
  RefinePanel,
  ResultsGrid,
  type RefineGroup,
} from "@/components/kit";
import { MonthlyPriceBlock } from "@/components/villa/monthly-price";
import { lotVisibleCount } from "@/lib/public-layout";
import type { LotStatus } from "@/lib/api-client/property";
import { formatMinorUnits } from "@/lib/money";
import { LOT_TONE, lotStatusLabel } from "@/lib/lot-labels";
import {
  EMPTY_LOT_FILTERS,
  LOT_AREA_BUCKETS,
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
 * THE FRAME IS THE SHARED KIT (2026-09-25): `ListingShell` owns the sticky rail,
 * the phone Filters sheet and the results bar; `RefinePanel` owns the grouped
 * refine controls. `/products` renders the same two, so the two catalogues read
 * as one grammar. The photograph, the caption and the href of every card are
 * precomputed on the server (lib/lot-imagery.ts) — the client only filters,
 * sorts and renders the shop card grammar.
 */
export function LotListing({
  items,
  parks,
  statuses,
  types,
  sections,
  initialFilters,
  initialSort,
  syncUrl = true,
}: {
  items: LotListingItem[];
  parks: Array<{ id: string; label: string }>;
  statuses: Array<{ id: string; label: string }>;
  types: Array<{ id: string; label: string; color?: string }>;
  sections: string[];
  initialFilters: LotFilters;
  initialSort: LotsSort;
  /**
   * When false the listing keeps its state local and never rewrites the URL.
   * The park page's Lots tab uses this: its query string belongs to the map
   * (`?park=`/`?plot=`), and the canonical filtered-listing URL stays /lots.
   */
  syncUrl?: boolean;
}) {
  const [filters, setFilters] = useState<LotFilters>(initialFilters);
  const [sort, setSort] = useState<LotsSort>(initialSort);

  // The URL is the serialisation of the view state — never a navigation.
  useEffect(() => {
    if (!syncUrl) return;
    window.history.replaceState(null, "", lotListingQuery(filters, sort));
  }, [filters, sort, syncUrl]);

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

  // The park group is a refine facet only when there is more than one park.
  // This product carries Villa Memorial Park alone, so the band names it and the
  // filter would be a one-option group.
  const groups: RefineGroup[] = [
    ...(parks.length > 1
      ? [
          {
            key: "parks",
            title: "Park",
            options: parks.map((option) => ({ id: option.id, label: option.label })),
            counts: counts.parks,
            selected: filters.parks,
          },
        ]
      : []),
    {
      key: "sections",
      title: "Section",
      options: sections.map((section) => ({ id: section, label: `Section ${section}` })),
      counts: counts.sections,
      selected: filters.sections,
    },
    {
      key: "statuses",
      title: "Availability",
      options: statuses.map((option) => ({ id: option.id, label: option.label })),
      counts: counts.statuses,
      selected: filters.statuses,
    },
    {
      key: "types",
      title: "Lot type",
      options: types.map((option) => ({ id: option.id, label: option.label, color: option.color })),
      counts: counts.types,
      selected: filters.types,
    },
    {
      key: "areas",
      title: "Area",
      options: LOT_AREA_BUCKETS.map((bucket) => ({ id: bucket.id, label: bucket.label })),
      counts: counts.areas,
      selected: filters.areas,
    },
  ];

  const available = visible.filter((item) => item.status === "available").length;

  return (
    <ListingShell
      railLabel="Refine lots"
      railActiveCount={activeCount}
      sheetAction={{
        label: `Show ${visible.length} lot${visible.length === 1 ? "" : "s"}`,
        onClick: () => {},
      }}
      rail={
        <RefinePanel
          title="Refine lots by"
          groups={groups}
          onToggle={toggle as (groupKey: string, optionId: string) => void}
          onClear={clear}
          activeCount={activeCount}
          price={{
            minCents: filters.priceMinCents,
            maxCents: filters.priceMaxCents,
            quickRanges,
            onApply: applyPrice,
            onQuickRange: applyQuickRange,
          }}
        />
      }
      bar={
        <>
          <p className="listing-bar__count">
            <strong>{visible.length}</strong> of {items.length} plots ·{" "}
            <strong>{available}</strong> available
          </p>
          <label className="listing-sort">
            <span className="listing-sort__label">Sort</span>
            <select
              className="select listing-sort__select"
              value={sort}
              onChange={(event) => setSort(parseLotsSort(event.target.value))}
            >
              <option value="">Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </label>
        </>
      }
    >
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
            const parkAvailable = parkItems.filter((item) => item.status === "available").length;
            return (
              <section key={park.id} className="cat-band" aria-label={park.label}>
                <header className="band-head">
                  <h2 className="band-head__title">{park.label}</h2>
                  <span className="band-head__count">
                    {parkItems.length} plot{parkItems.length === 1 ? "" : "s"} · {parkAvailable}{" "}
                    available · {parkItems[0]?.parkBranch}
                  </span>
                </header>
                {/* The card caption travels with every photograph, but on a
                    phone it is one template repeated 16 times. The honesty
                    line prints ONCE per band there and the per-card caption
                    (the same words, per plot) steps out — see the catalogue
                    block of styles/components.css. */}
                <p className="lot-grid__note">
                  Photographs show the section, not the individual plot — the park map marks it.
                </p>
                <ResultsGrid
                  items={parkItems.slice(0, lotVisibleCount(parkItems.length))}
                  itemKey={(item) => item.key}
                  emptyTitle="No plots to show"
                  className="lot-grid"
                  renderItem={(item) => <LotCard item={item} />}
                />
                {/* Above the plan's 6–8-tile window the rest sit in one
                    "Show all N" disclosure, so a phone reaches the next band
                    without scrolling every plot. Filtering re-renders the
                    window, so the label always counts what the view matches. */}
                {parkItems.length > lotVisibleCount(parkItems.length) ? (
                  <PublicDisclosure count={parkItems.length}>
                    <ResultsGrid
                      items={parkItems.slice(lotVisibleCount(parkItems.length))}
                      itemKey={(item) => item.key}
                      emptyTitle="No plots to show"
                      className="lot-grid"
                      renderItem={(item) => <LotCard item={item} />}
                    />
                  </PublicDisclosure>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </ListingShell>
  );
}

/**
 * One plot as a product card: photograph, number, facts, figure, status, one
 * action — the order the captain's brief names.
 *
 * MONTHLY LEADS (Villa Memorial minutes, 2026-09-21, item 8). A linked lot prints
 * its section family's monthly installment as the figure, with the recorded
 * 72-month term and the recorded total contract price under it. A map-only plot
 * the sheet does not price keeps the honest "Price on request" state.
 *
 * ONE CARD ACTION (captain follow-up, 2026-09-21). Every card dresses its one
 * action in the shop grammar's PRIMARY rung — `.btn--accent` (the gold the
 * catalogue already gives a card's main action: `Add to quote` on /products,
 * /plans, /packages) — instead of the page-level `.btn--primary` (sky) it used
 * before. There is no quote action on a lot, so the card's single action owns
 * the primary slot. The label keeps the two honest destinations (a published
 * lot page vs the park map) but reads as ONE grammar: the shared core "View
 * this lot", with the map destination spelled out only where that is where it
 * goes. See docs/08-delivery/lots-cta-consistency-design/README.md.
 */
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
        item.monthly ? (
          <MonthlyPriceBlock price={item.monthly} />
        ) : item.contractPriceCents !== null ? (
          formatMinorUnits(item.contractPriceCents, item.currency)
        ) : (
          "Price on request"
        )
      }
      priceNote={
        item.monthly
          ? undefined
          : item.hasLot
            ? "published plot price"
            : "the office quotes per plot"
      }
      status={{ tone: LOT_TONE[status] ?? "neutral", label: lotStatusLabel(status) }}
      caption={item.photo.caption}
      actions={
        <Link href={item.href} className="btn btn--accent btn--sm">
          {item.hasLot ? "View this lot" : "View this lot on the park map"}
        </Link>
      }
    />
  );
}
