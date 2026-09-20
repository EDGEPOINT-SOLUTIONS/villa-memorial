"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  LOT_AREA_BUCKETS,
  lotFiltersCount,
  type FacetCounts,
  type LotFilters,
  type PriceQuickRange,
} from "@/lib/lot-listing";

/**
 * "Refine lots by" — the filter panel the captain pointed at Amazon's results
 * page for (2026-09-20 additions).
 *
 * One panel, rendered in two containers: the sticky desktop rail and the phone
 * sheet (which adds its own Show-results action). Every group collapses in
 * place; every option is a checkbox row with its live result count at the right
 * edge, kept visible but visibly dead at zero (never hidden); groups are
 * separated by hairlines; Area is bands, Price is a min/max pair plus quick
 * ranges read from the published figures — never a checkbox set.
 *
 * It is a client component with no fetch of its own: the listing owns the
 * filter state and hands the counts in, so the results, the counts and the URL
 * move together instantly.
 */
export type RefineOption = { id: string; label: string; color?: string };

type Props = {
  filters: LotFilters;
  counts: FacetCounts;
  parks: RefineOption[];
  statuses: RefineOption[];
  types: RefineOption[];
  sections: string[];
  priceRanges: PriceQuickRange[];
  onToggle: (group: "parks" | "statuses" | "types" | "sections" | "areas", id: string) => void;
  onClear: () => void;
  onPriceApply: (min: string, max: string) => void;
  onQuickRange: (range: PriceQuickRange) => void;
  /** The phone sheet's own closing action; the rail passes none. */
  onApply?: () => void;
  /** What the sheet's action says ("Show 34 lots" is built by the listing). */
  applyLabel?: string;
};

function Group({
  title,
  open,
  onToggleOpen,
  children,
}: {
  title: string;
  open: boolean;
  onToggleOpen: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="lot-filter">
      <button
        type="button"
        className="lot-filter__head"
        aria-expanded={open}
        onClick={onToggleOpen}
      >
        <span className="lot-filter__group">{title}</span>
        <ChevronDown
          className="lot-filter__chevron"
          size={16}
          aria-hidden="true"
          data-open={open ? "true" : "false"}
        />
      </button>
      {open ? <div className="lot-filter__body">{children}</div> : null}
    </div>
  );
}

function OptionRow({
  option,
  count,
  checked,
  onToggle,
}: {
  option: RefineOption;
  count: number;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="lot-filter__row" data-empty={count === 0 ? "true" : "false"}>
      <input type="checkbox" checked={checked} onChange={onToggle} />
      {option.color ? (
        <span className="type-dot" style={{ background: option.color }} aria-hidden="true" />
      ) : null}
      <span className="lot-filter__label">{option.label}</span>
      <span className="lot-filter__count">{count}</span>
    </label>
  );
}

export function RefinePanel({
  filters,
  counts,
  parks,
  statuses,
  types,
  sections,
  priceRanges,
  onToggle,
  onClear,
  onPriceApply,
  onQuickRange,
  onApply,
  applyLabel,
}: Props) {
  // All groups start open ("default open for the groups that matter most" — for
  // a lot listing every group is a primary choice); a group collapses in place.
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const isOpen = (id: string) => !collapsed.includes(id);
  const toggleOpen = (id: string) =>
    setCollapsed((ids) => (ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id]));

  // The price inputs are a DRAFT until Go (a keystroke must not refilter the
  // grid); a quick range or a Clear syncs them back to the applied range.
  const [minDraft, setMinDraft] = useState(() => centsInput(filters.priceMinCents));
  const [maxDraft, setMaxDraft] = useState(() => centsInput(filters.priceMaxCents));
  useEffect(() => {
    setMinDraft(centsInput(filters.priceMinCents));
    setMaxDraft(centsInput(filters.priceMaxCents));
  }, [filters.priceMinCents, filters.priceMaxCents]);

  const activeCount = lotFiltersCount(filters);

  return (
    <div className="lot-refine">
      <div className="lot-refine__head">
        <p className="lot-refine__title">Refine lots by</p>
        {activeCount > 0 ? (
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClear}>
            Clear
          </button>
        ) : null}
      </div>

      {/* The park group is a refine facet only when there is more than one park.
          This product carries Villa Memorial Park alone, so the band names it and
          the filter would be a one-option group. */}
      {parks.length > 1 ? (
        <Group title="Park" open={isOpen("park")} onToggleOpen={() => toggleOpen("park")}>
          {parks.map((option) => (
            <OptionRow
              key={option.id}
              option={option}
              count={counts.parks[option.id] ?? 0}
              checked={filters.parks.includes(option.id)}
              onToggle={() => onToggle("parks", option.id)}
            />
          ))}
        </Group>
      ) : null}

      <Group title="Section" open={isOpen("section")} onToggleOpen={() => toggleOpen("section")}>
        {sections.map((section) => (
          <OptionRow
            key={section}
            option={{ id: section, label: `Section ${section}` }}
            count={counts.sections[section] ?? 0}
            checked={filters.sections.includes(section)}
            onToggle={() => onToggle("sections", section)}
          />
        ))}
      </Group>

      <Group
        title="Availability"
        open={isOpen("status")}
        onToggleOpen={() => toggleOpen("status")}
      >
        {statuses.map((option) => (
          <OptionRow
            key={option.id}
            option={option}
            count={counts.statuses[option.id] ?? 0}
            checked={filters.statuses.includes(option.id)}
            onToggle={() => onToggle("statuses", option.id)}
          />
        ))}
      </Group>

      <Group title="Lot type" open={isOpen("type")} onToggleOpen={() => toggleOpen("type")}>
        {types.map((option) => (
          <OptionRow
            key={option.id}
            option={option}
            count={counts.types[option.id] ?? 0}
            checked={filters.types.includes(option.id)}
            onToggle={() => onToggle("types", option.id)}
          />
        ))}
      </Group>

      <Group title="Area" open={isOpen("area")} onToggleOpen={() => toggleOpen("area")}>
        {LOT_AREA_BUCKETS.map((bucket) => (
          <OptionRow
            key={bucket.id}
            option={{ id: bucket.id, label: bucket.label }}
            count={counts.areas[bucket.id] ?? 0}
            checked={filters.areas.includes(bucket.id)}
            onToggle={() => onToggle("areas", bucket.id)}
          />
        ))}
      </Group>

      <Group title="Price" open={isOpen("price")} onToggleOpen={() => toggleOpen("price")}>
        <form
          className="lot-filter__price"
          onSubmit={(event) => {
            event.preventDefault();
            onPriceApply(minDraft, maxDraft);
          }}
        >
          <div className="lot-filter__price-inputs">
            <label className="lot-filter__price-field">
              <span>Min ₱</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={minDraft}
                onChange={(event) => setMinDraft(event.target.value)}
              />
            </label>
            <label className="lot-filter__price-field">
              <span>Max ₱</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={maxDraft}
                onChange={(event) => setMaxDraft(event.target.value)}
              />
            </label>
          </div>
          <button type="submit" className="btn btn--primary">
            Go
          </button>
        </form>
        {priceRanges.length > 0 ? (
          <div className="lot-filter__quick">
            {priceRanges.map((range) => {
              const active =
                filters.priceMinCents === range.minCents &&
                filters.priceMaxCents === range.maxCents;
              return (
                <button
                  key={range.id}
                  type="button"
                  className="btn btn--secondary btn--sm lot-filter__quick-link"
                  aria-pressed={active}
                  onClick={() => onQuickRange(range)}
                >
                  {range.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </Group>

      {onApply ? (
        <button type="button" className="btn btn--primary lot-sheet__apply" onClick={onApply}>
          {applyLabel ?? "Show results"}
        </button>
      ) : null}
    </div>
  );
}

/** Centavos → the pesos the input edits (blank for "no bound"). */
function centsInput(cents: number | null): string {
  if (cents === null) return "";
  return String(Math.round(cents / 100));
}
