import type { NavSection } from "@/lib/rbac/nav";
import { SidebarDisclosure } from "@/components/ui/sidebar-disclosure";
import { SidebarNav } from "@/components/ui/sidebar-nav";

/**
 * App shell: a white Admin Portal rail with a sky edge on the active item
 * (captain's 2026-09-25 UI/UX renovation — grounds are white product-wide and
 * the brand blue rides only controls), styled by the .app-shell block in
 * styles/components.css; the rail collapses to a disclosed menu below 48rem
 * (design-system.md). Generic by design — labels and sections arrive as props.
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
      <aside className="app-sidebar" aria-label="Portal sidebar">
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
