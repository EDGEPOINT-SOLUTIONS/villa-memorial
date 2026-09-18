import type { NavSection } from "@/lib/rbac/nav";
import { SidebarDisclosure } from "@/components/ui/sidebar-disclosure";
import { SidebarNav } from "@/components/ui/sidebar-nav";

/**
 * App shell: sky-blue sidebar (captain's 2026-09-17 brand call — the staff nav
 * is a light-sky surface carrying navy ink, styled by the .app-shell block in
 * styles/components.css) with brass accents on the active link; collapses to
 * stacked layout below 48rem (design-system.md). Generic by design — labels and
 * sections arrive as props.
 */
export function AppShell({
  brandEyebrow,
  brandTitle,
  sections,
  footer,
  topbar,
  children,
}: {
  brandEyebrow: string;
  brandTitle: string;
  sections: NavSection[];
  footer?: React.ReactNode;
  /** Optional top bar inside the main column (tenant switcher, bells…). */
  topbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar__brand">
          <p className="app-sidebar__eyebrow">{brandEyebrow}</p>
          <p className="app-sidebar__title">{brandTitle}</p>
        </div>
        <SidebarDisclosure>
          <SidebarNav sections={sections} />
        </SidebarDisclosure>
        <div className="app-sidebar__footer">{footer}</div>
      </aside>
      <main className="app-main">
        {topbar ? <div className="app-topbar">{topbar}</div> : null}
        <div className="app-main__content">{children}</div>
      </main>
    </div>
  );
}
