"use client";

import { useEffect, useState } from "react";

/**
 * The services page's sticky "On this page" bar (approved 2026-09-16 design,
 * docs/08-delivery/services-design/). Five anchors plus "Back to top"; the chip
 * of the section in view carries aria-current, so the reader always knows where
 * they are without a second navigation pattern.
 *
 * Progressive enhancement: with no IntersectionObserver (or before hydration)
 * the bar is a plain list of anchors — the page works, nothing depends on JS.
 * The section list is authored by the page so this component stays generic.
 */
export type SubnavItem = { id: string; label: string };

export function ServicesSubnav({ items }: { items: ReadonlyArray<SubnavItem> }) {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const ids = items.map((item) => item.id);
    const links = new Map(ids.map((id) => [id, document.getElementById(id)]));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(entry.target.id);
        }
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    for (const el of links.values()) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className="sv-subnav" aria-label="On this page">
      <div className="sv-subnav__row">
        <span className="sv-subnav__label" aria-hidden="true">
          On this page
        </span>
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={current === item.id ? "true" : undefined}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <span className="sv-top">
          <a href="#top">Back to top ↑</a>
        </span>
      </div>
    </nav>
  );
}
