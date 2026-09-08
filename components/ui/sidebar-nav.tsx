"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavSection } from "@/lib/rbac/nav";

/** Sidebar links with active-state detection (client-only concern). */
export function SidebarNav({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  return (
    <nav className="app-sidebar__nav" aria-label="Primary">
      {sections.map((section) => (
        <div key={section.label} className="app-sidebar__section">
          <span className="app-sidebar__label">{section.label}</span>
          {section.items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`app-sidebar__link${active ? " app-sidebar__link--active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
