"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The /price-list page's two small client reading aids (`villa-price-list-
 * redesign-plan`, captain approved 2026-09-30).
 *
 * Both take ONLY serialisable props: this page is a Server Component and a
 * function prop crossing into a `"use client"` component is the exact
 * production-only 500 this route shipped once (AGENTS.md, "a function prop from
 * a Server Component is a merge blocker"). Nothing here is a handler prop — the
 * page passes arrays and strings; the components own their own clicks.
 */

/**
 * PrintListButton — the page's one print action.
 *
 * The page's whole second form is a printed 2026 price list, and the global
 * print rule (`styles/components.css`, "body * { visibility: hidden }") only
 * reveals the paper layer, so the page prints blank unless the page's own
 * `@media print` block opts it back in. That block can reveal the disclosures'
 * grids but it CANNOT open a closed `<details>` (the browser hides its content
 * outside CSS reach), so the button opens every disclosure before printing.
 */
export function PrintListButton({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        document.querySelectorAll("details").forEach((detail) => {
          if (!detail.open) detail.open = true;
        });
        window.print();
      }}
    >
      {children}
    </button>
  );
}

/** One rail row: the family's name and the live “from” figure the page reads. */
export type PriceIndexItem = { id: string; label: string; figure: string };

/**
 * PriceIndexNav — the figure-bearing price index.
 *
 * THE STICKY RAIL IS REQUIRED BEHAVIOUR (captain's board round 1, 2026-09-30:
 * "Make this sticky when scrolling"). It renders inside `ListingShell`'s rail
 * slot, which is `position: sticky` under the public header at ≥64rem
 * (`styles/components.css`, `.listing-rail`), and collapses to the shell's phone
 * sheet below that. This component adds what the plain `ListingNav` lacked:
 * every family carries its live “from” figure, and a scroll-spy marks the
 * family the reader is in.
 *
 * The scroll-spy is progressive: with JS off (or no IntersectionObserver) the
 * anchors still navigate and nothing depends on the active state. The measured
 * band tops drive it, so a band taller than the viewport still activates.
 */
export function PriceIndexNav({
  label,
  items,
}: {
  /** Accessible name for the nav landmark ("Price list sections"). */
  label: string;
  items: ReadonlyArray<PriceIndexItem>;
}) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const ids = items.map((item) => item.id);
    if (ids.length === 0) return;
    const targets = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const pick = () => {
      frame.current = null;
      const line = window.innerHeight * 0.3;
      let best = targets[0];
      for (const target of targets) {
        if (target.getBoundingClientRect().top <= line) best = target;
      }
      setActive(best.id);
    };
    const onScroll = () => {
      if (frame.current !== null) return;
      frame.current = window.requestAnimationFrame(pick);
    };

    pick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, [items]);

  return (
    <nav className="listing-nav price-index__nav" aria-label={label}>
      <p className="listing-nav__title">Price index</p>
      <ul className="listing-nav__list">
        {items.map((item) => (
          <li key={item.id}>
            <a
              className="listing-nav__link price-index__link"
              href={`#${item.id}`}
              aria-current={active === item.id ? "true" : undefined}
            >
              <span className="price-index__link-label">{item.label}</span>
              <b className="price-index__link-figure">{item.figure}</b>
            </a>
          </li>
        ))}
      </ul>
      <div className="price-index__print">
        <PrintListButton className="btn btn--secondary btn--sm">
          Print the 2026 list
        </PrintListButton>
      </div>
    </nav>
  );
}
