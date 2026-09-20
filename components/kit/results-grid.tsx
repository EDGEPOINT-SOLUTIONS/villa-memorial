import { Fragment, type ReactNode } from "react";
import { EmptyState } from "@/components/kit/empty-state";

/**
 * ResultsGrid — the ONE responsive card grid for a list of results.
 *
 * The storefront's `.shop-grid` is the settled grid: `auto-fill minmax(min(100%,
 * 26rem), 1fr)` gives three columns at 1440, two on a tablet and one at 390 with
 * no second media query — the reason a phone is a rendering contract and not a
 * smaller desktop. Every card grid that holds a `ProductCard` renders through
 * this component so the breakpoints cannot drift between surfaces.
 *
 * EMPTY vs NO-MATCH. A grid is never blank: it renders the kit `EmptyState`,
 * choosing between the two honest states by `filtered`:
 *   · not filtered → "nothing has been recorded/published yet";
 *   · filtered → "nothing matches these filters" (the caller names them).
 * The caller supplies both wordings because the domain owns the vocabulary.
 *
 * `renderItem` returns the grid child — a `ProductCard` (`<li>`) — and the grid
 * owns the keying, so a caller cannot forget one.
 */
export function ResultsGrid<Item>({
  items,
  itemKey,
  renderItem,
  label,
  emptyTitle,
  emptyHint,
  filtered = false,
  noMatchTitle,
  noMatchHint,
  className,
}: {
  items: ReadonlyArray<Item>;
  itemKey: (item: Item, index: number) => string;
  renderItem: (item: Item, index: number) => ReactNode;
  /**
   * Accessible name for the list ("Lots", "Plans", "Coffins"). Optional — like
   * `DataTable.label` — so a grid already inside a labelled `<section>` (the
   * storefront bands) does not carry a duplicate name and its DOM stays
   * byte-identical to the pre-kit markup.
   */
  label?: string;
  emptyTitle: ReactNode;
  emptyHint?: ReactNode;
  /** Set when a filter/search is active, so the empty state reads as a no-match. */
  filtered?: boolean;
  noMatchTitle?: ReactNode;
  noMatchHint?: ReactNode;
  className?: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title={filtered ? (noMatchTitle ?? emptyTitle) : emptyTitle}
        hint={filtered ? (noMatchHint ?? emptyHint) : emptyHint}
      />
    );
  }

  return (
    <ul className={`shop-grid${className ? ` ${className}` : ""}`} aria-label={label}>
      {items.map((item, index) => (
        <Fragment key={itemKey(item, index)}>{renderItem(item, index)}</Fragment>
      ))}
    </ul>
  );
}
