"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeNavHref, type NavSection } from "@/lib/rbac/nav";

/** Sidebar links with active-state detection (client-only concern). */
export function SidebarNav({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  // The longest matching href wins, so a nested route such as
  // /staff/plans/membership does not light (and aria-current) its parent too.
  const activeHref = activeNavHref(pathname, sections);
  return (
    <nav className="app-sidebar__nav" aria-label="Primary">
      {sections.map((section) => (
        <div key={section.label} className="app-sidebar__section">
          <span className="app-sidebar__label">{section.label}</span>
          {section.items.map((item) => {
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`app-sidebar__link${active ? " app-sidebar__link--active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="app-sidebar__link-label">{item.label}</span>
                {typeof item.badge === "number" && item.badge > 0 ? (
                  <span
                    className="app-sidebar__badge"
                    aria-label={`${item.badge} unread`}
                  >
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
