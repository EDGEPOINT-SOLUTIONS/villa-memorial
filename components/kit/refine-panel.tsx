"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * RefinePanel — the ONE Amazon-familiar refine panel for a storefront listing.
 *
 * Promoted from the captain-approved `/lots` panel (2026-09-20: "the filter is
 * in the left side it should be sticky… inspired by amazon product pages, but
 * the theme color is our theme"), so `/products` and every listing after it
 * read the same grammar instead of re-deriving one.
 *
 * WHAT IT SETTLES
 *   · **Grouped, collapsible sections** — a `<button>` head with a chevron,
 *     collapsed in place, so a long taxonomy never becomes an unscannable wall.
 *   · **Per-option result counts** under the current selection, dimmed at zero
 *     (`data-empty="true"`) but never hidden — the reader can see a value exists
 *     and currently matches nothing.
 *   · **A price range**, never a checkbox set: a min/max peso pair with one Go
 *     action, plus quick bands whose boundaries are the listing's own published
 *     figures. A keystroke never refilters the grid — Go does.
 *   · **One Clear** in the header, the same supporting control as a no-results
 *     recovery.
 *
 * PRESENTATION ONLY. The panel owns no results and performs no matching: the
 * listing hands it the groups, the counts and the callbacks and re-renders its
 * grid in place. The phone/desktop placement — the sticky rail, the one
 * Filters control — is `ListingShell`'s job, not this component's.
 */
export type RefineOption = {
  id: string;
  label: string;
  /** The legend type's colour dot, when the domain has one. */
  color?: string;
};

export type RefineGroup = {
  key: string;
  title: string;
  options: ReadonlyArray<RefineOption>;
  /** Live count per option id under the current selection. */
  counts: Record<string, number>;
  selected: ReadonlyArray<string>;
};

export type RefineQuickRange = {
  id: string;
  label: string;
  minCents: number | null;
  maxCents: number | null;
};

export type RefinePrice = {
  title?: string;
  minCents: number | null;
  maxCents: number | null;
  quickRanges?: ReadonlyArray<RefineQuickRange>;
  /** Receives the raw peso input strings; the listing parses and clamps them. */
  onApply: (min: string, max: string) => void;
  onQuickRange?: (range: RefineQuickRange) => void;
};

export type RefinePanelProps = {
  /** "Refine lots by", "Refine coffins by" — the caller owns the domain words. */
  title: string;
  groups: ReadonlyArray<RefineGroup>;
  /** (group key, option id) — the listing decides what toggling means. */
  onToggle: (groupKey: string, optionId: string) => void;
  onClear: () => void;
  /** How many choices are applied — pins the Clear state. */
  activeCount: number;
  price?: RefinePrice;
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
  children: ReactNode;
}) {
  return (
    <div className="refine-group">
      <button type="button" className="refine-group__head" aria-expanded={open} onClick={onToggleOpen}>
        <span className="refine-group__label">{title}</span>
        <ChevronDown
          className="refine-group__chevron"
          size={16}
          aria-hidden="true"
          data-open={open ? "true" : "false"}
        />
      </button>
      {open ? <div className="refine-group__body">{children}</div> : null}
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
    <label className="refine-option" data-empty={count === 0 ? "true" : "false"}>
      <input type="checkbox" checked={checked} onChange={onToggle} />
      {option.color ? (
        <span className="type-dot" style={{ background: option.color }} aria-hidden="true" />
      ) : null}
      <span className="refine-option__label">{option.label}</span>
      <span className="refine-option__count">{count}</span>
    </label>
  );
}

/** Centavos → the pesos the input edits (blank for "no bound"). */
function centsInput(cents: number | null): string {
  if (cents === null) return "";
  return String(Math.round(cents / 100));
}

export function RefinePanel({
  title,
  groups,
  onToggle,
  onClear,
  activeCount,
  price,
}: RefinePanelProps) {
  // Every group starts open; a group collapses in place.
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const isOpen = (id: string) => !collapsed.includes(id);
  const toggleOpen = (id: string) =>
    setCollapsed((ids) => (ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id]));

  // The price inputs are a DRAFT until Go; an applied band or a Clear syncs them.
  const [minDraft, setMinDraft] = useState(() => centsInput(price?.minCents ?? null));
  const [maxDraft, setMaxDraft] = useState(() => centsInput(price?.maxCents ?? null));
  useEffect(() => {
    setMinDraft(centsInput(price?.minCents ?? null));
    setMaxDraft(centsInput(price?.maxCents ?? null));
  }, [price?.minCents, price?.maxCents]);

  return (
    <div className="refine-panel">
      <div className="refine-panel__head">
        <p className="refine-panel__title">{title}</p>
        {activeCount > 0 ? (
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClear}>
            Clear
          </button>
        ) : null}
      </div>

      {groups.map((group) => (
        <Group
          key={group.key}
          title={group.title}
          open={isOpen(group.key)}
          onToggleOpen={() => toggleOpen(group.key)}
        >
          {group.options.map((option) => (
            <OptionRow
              key={option.id}
              option={option}
              count={group.counts[option.id] ?? 0}
              checked={group.selected.includes(option.id)}
              onToggle={() => onToggle(group.key, option.id)}
            />
          ))}
        </Group>
      ))}

      {price ? (
        <Group title={price.title ?? "Price"} open={isOpen("price")} onToggleOpen={() => toggleOpen("price")}>
          <form
            className="refine-price"
            onSubmit={(event) => {
              event.preventDefault();
              price.onApply(minDraft, maxDraft);
            }}
          >
            <div className="refine-price__inputs">
              <label className="refine-price__field">
                <span>Min ₱</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={minDraft}
                  onChange={(event) => setMinDraft(event.target.value)}
                />
              </label>
              <label className="refine-price__field">
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
          {price.quickRanges && price.quickRanges.length > 0 ? (
            <div className="refine-price__quick">
              {price.quickRanges.map((range) => {
                const active =
                  price.minCents === range.minCents && price.maxCents === range.maxCents;
                return (
                  <button
                    key={range.id}
                    type="button"
                    className="btn btn--secondary btn--sm refine-price__quick-link"
                    aria-pressed={active}
                    onClick={() => price.onQuickRange?.(range)}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </Group>
      ) : null}
    </div>
  );
}
