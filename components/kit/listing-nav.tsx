import type { ReactNode } from "react";

/**
 * ListingNav — the rail for a content listing that browses rather than filters.
 *
 * A price list or a photo gallery has no facets to narrow; what it needs is the
 * Amazon category rail: the page's own sections, always in view, one tap away,
 * and a sheet on a phone. It renders inside `ListingShell`'s `rail` slot, so a
 * nav rail and a `RefinePanel` share the sticky/phone-sheet behaviour and the
 * two listings read as one grammar.
 *
 * A plain anchor list — no JS, no state. `ListingShell` closes its phone sheet
 * on the anchor's `hashchange`, so picking the section reveals it.
 */
export function ListingNav({
  label,
  items,
}: {
  /** Accessible name for the nav landmark ("Price list sections"). */
  label: string;
  items: ReadonlyArray<{ id: string; label: ReactNode }>;
}) {
  return (
    <nav className="listing-nav" aria-label={label}>
      <p className="listing-nav__title">On this page</p>
      <ul className="listing-nav__list">
        {items.map((item) => (
          <li key={item.id}>
            <a className="listing-nav__link" href={`#${item.id}`}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
