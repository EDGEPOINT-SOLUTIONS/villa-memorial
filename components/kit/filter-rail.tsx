"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { useModalFocus } from "@/components/ui/use-modal-focus";
import {
  clampRange,
  isDimmed,
  isSelected,
  resultSummary,
  selectedInGroup,
  totalSelected,
  type PriceBounds,
  type SelectedFilters,
} from "@/components/kit/filter-rail-model";

/**
 * FilterRail — the ONE filter panel for a result list.
 *
 * PRESENTATION ONLY. The rail owns no result data and performs no matching: it
 * is handed the groups, the current selection and a `onToggle` / `onPriceChange`
 * callback, and the caller re-renders its grid in place. There is deliberately no
 * `<form>` and no navigation here — a filter change updates the results WITHOUT a
 * page refresh, which is the requirement a top filter bar kept failing.
 *
 * WHAT IT SETTLES
 *   · **Grouped, collapsible sections** (`<details>`), so a long taxonomy does not
 *     become an unscannable wall.
 *   · **Per-option result counts**, dimmed at zero (`isDimmed`) but never hidden —
 *     the reader can see a value exists and currently matches nothing.
 *   · **A distinct price-range group** with its own Apply action, clamped to the
 *     data's own bounds; changing it does not fire until Apply, so dragging a
 *     slider does not thrash the grid.
 *   · **A phone mode that becomes a sheet.** Below 40rem the rail collapses
 *     behind a "Filters" button and opens as a modal sheet using the shared
 *     `useModalFocus` contract (focus in, Tab trapped, Escape closes, scroll
 *     locked, focus returned). Above 40rem it is a sticky sidebar and the button
 *     is hidden.
 *
 * HONESTY. Every option carries the count the caller computed from the real
 * result set; the rail never estimates or fills a zero with a plausible number.
 */
export type FilterOption = {
  value: string;
  label: ReactNode;
  /** How many results this value currently matches (already filtered by the others). */
  count: number;
};

export type FilterGroup = {
  key: string;
  label: ReactNode;
  /** Multi-select (checkbox, default) or single-select (radio). */
  mode?: "multi" | "single";
  options: ReadonlyArray<FilterOption>;
};

export type FilterRailPrice = {
  /** The full range of the data. */
  bounds: PriceBounds;
  /** The currently applied range. */
  value: PriceBounds;
  step?: number;
  label?: ReactNode;
  /** Formats a bound for display; the caller owns the currency. */
  format: (value: number) => string;
};

export type FilterRailProps = {
  /** The rail's heading and its accessible name. */
  title: string;
  groups: ReadonlyArray<FilterGroup>;
  selected: SelectedFilters;
  onToggle: (groupKey: string, value: string) => void;
  price?: FilterRailPrice;
  onPriceChange?: (value: PriceBounds) => void;
  onClear?: () => void;
  /** Results matching the current selection, and the unfiltered total. */
  resultCount: number;
  totalCount: number;
  /** Label for the phone trigger; defaults to "Filters". */
  triggerLabel?: string;
};

export function FilterRail({
  title,
  groups,
  selected,
  onToggle,
  price,
  onPriceChange,
  onClear,
  resultCount,
  totalCount,
  triggerLabel = "Filters",
}: FilterRailProps) {
  const [open, setOpen] = useState(false);
  const { panelRef } = useModalFocus<HTMLElement>(open, () => setOpen(false));
  const panelId = useId();

  // The applied range as a local draft so the price inputs do not fire on every
  // keystroke. Synced from the scalar props only, so an external Clear resets it
  // without an identity-churning effect.
  const valueMin = price?.value.min ?? 0;
  const valueMax = price?.value.max ?? 0;
  const [draftMin, setDraftMin] = useState(valueMin);
  const [draftMax, setDraftMax] = useState(valueMax);
  useEffect(() => {
    setDraftMin(valueMin);
    setDraftMax(valueMax);
  }, [valueMin, valueMax]);

  const activeCount = totalSelected(selected) + (price && (valueMin !== price.bounds.min || valueMax !== price.bounds.max) ? 1 : 0);

  return (
    <div className="filter-rail__root">
      <button
        type="button"
        className="btn btn--secondary btn--sm filter-rail__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {triggerLabel}
        {activeCount > 0 ? ` · ${activeCount}` : ""}
      </button>

      <div
        className="filter-rail__sheet"
        data-open={open ? "true" : "false"}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <aside
          id={panelId}
          ref={panelRef}
          className="filter-rail"
          role={open ? "dialog" : undefined}
          aria-modal={open ? true : undefined}
          aria-label={title}
          tabIndex={-1}
        >
          <div className="filter-rail__head">
            <h2 className="filter-rail__title">{title}</h2>
            <span className="filter-rail__count">
              {resultSummary(resultCount)} of {totalCount}
            </span>
          </div>

          <div className="filter-rail__groups">
            {groups.map((group) => {
              const chosen = selectedInGroup(selected, group.key);
              return (
                <details key={group.key} className="filter-rail__group" open>
                  <summary className="filter-rail__legend">
                    <span>{group.label}</span>
                    {chosen > 0 ? <span className="filter-rail__badge">{chosen}</span> : null}
                  </summary>
                  <ul className="filter-rail__options">
                    {group.options.map((option) => {
                      const checked = isSelected(selected, group.key, option.value);
                      const dimmed = isDimmed(option.count);
                      return (
                        <li key={option.value}>
                          <label
                            className={`filter-rail__option${dimmed ? " filter-rail__option--zero" : ""}`}
                          >
                            <input
                              type={group.mode === "single" ? "radio" : "checkbox"}
                              name={`filter-${group.key}`}
                              value={option.value}
                              checked={checked}
                              disabled={dimmed && !checked}
                              onChange={() => onToggle(group.key, option.value)}
                            />
                            <span className="filter-rail__option-label">{option.label}</span>
                            <span className="filter-rail__option-count">{option.count}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              );
            })}

            {price ? (
              <fieldset className="filter-rail__price">
                <legend className="filter-rail__legend">{price.label ?? "Price range"}</legend>
                <div className="filter-rail__price-row">
                  <label className="filter-rail__price-field">
                    <span className="filter-rail__price-label">From</span>
                    <input
                      className="input"
                      type="number"
                      inputMode="numeric"
                      min={price.bounds.min}
                      max={price.bounds.max}
                      step={price.step ?? 1}
                      value={draftMin}
                      onChange={(event) => setDraftMin(Number(event.target.value))}
                    />
                  </label>
                  <label className="filter-rail__price-field">
                    <span className="filter-rail__price-label">To</span>
                    <input
                      className="input"
                      type="number"
                      inputMode="numeric"
                      min={price.bounds.min}
                      max={price.bounds.max}
                      step={price.step ?? 1}
                      value={draftMax}
                      onChange={(event) => setDraftMax(Number(event.target.value))}
                    />
                  </label>
                </div>
                <p className="filter-rail__price-hint">
                  {price.format(price.bounds.min)} – {price.format(price.bounds.max)} recorded
                </p>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => onPriceChange?.(clampRange({ min: draftMin, max: draftMax }, price.bounds))}
                >
                  Apply price
                </button>
              </fieldset>
            ) : null}
          </div>

          <div className="filter-rail__actions">
            {onClear && activeCount > 0 ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={onClear}>
                Clear all
              </button>
            ) : (
              <span />
            )}
            <span className="filter-rail__result">{resultSummary(resultCount)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
