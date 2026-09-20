/**
 * The pure half of `FilterRail` (components/kit/filter-rail.tsx).
 *
 * The rail is presentation only: it holds no result data, it calls the caller's
 * `onToggle` / `onPriceChange`, and the caller re-renders the grid in place — no
 * page reload, no navigation. These helpers are the small decisions that would
 * otherwise be re-derived per screen: is an option on, how many are on in a
 * group, is a count dimmed, and how is a price range clamped to the data's own
 * bounds. Unit-tested here so the component test can stay about rendering.
 */

export type SelectedFilters = Readonly<Record<string, ReadonlyArray<string>>>;
export type PriceBounds = { min: number; max: number };

/** Whether a value is currently selected in a group. */
export function isSelected(selected: SelectedFilters, groupKey: string, value: string): boolean {
  return (selected[groupKey] ?? []).includes(value);
}

/** How many options are on in one group. */
export function selectedInGroup(selected: SelectedFilters, groupKey: string): number {
  return (selected[groupKey] ?? []).length;
}

/** How many options are on across every group. */
export function totalSelected(selected: SelectedFilters): number {
  return Object.values(selected).reduce((total, values) => total + values.length, 0);
}

/**
 * A zero-count option is dimmed, never hidden: the reader can see that a value
 * exists but currently matches nothing. A hidden zero-count option would lie
 * about the data; a full-strength one would imply a result.
 */
export function isDimmed(count: number): boolean {
  return count <= 0;
}

/** Clamp a min/max pair into the data's own bounds, keeping min ≤ max. */
export function clampRange(value: PriceBounds, bounds: PriceBounds): PriceBounds {
  const min = Math.min(Math.max(value.min, bounds.min), bounds.max);
  const max = Math.max(Math.min(value.max, bounds.max), min);
  return { min, max };
}

/** The result count as an honest sentence ("1 result" / "12 results"). */
export function resultSummary(count: number): string {
  return `${count} result${count === 1 ? "" : "s"}`;
}
