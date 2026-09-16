"use client";

/**
 * PortalFrame — villa-memorial portal chrome on the KEB stack.
 *
 * Villa's agent/client portals use a fixed LEFT SIDEBAR on desktop (brand block,
 * icon navigation with a filled active state, logout at the bottom) and a top
 * bar + drawer on mobile. This is that design, re-implemented in Next.js with
 * tokens-only CSS and lucide icons (no Material-font dependency, no Tailwind).
 *
 * Optional additions for any portal:
 * - grouped sidebar navigation with plain-language headings;
 * - a phone bottom tab bar — pinned destinations plus More;
 * - a sidebar help block (e.g. a coordinator's number).
 * All three are opt-in through props. The family portal no longer uses this
 * frame — it has its own at-a-glance shell (components/family/family-frame.tsx,
 * docs/08-delivery/family-portal-design); this component is the agent portal's.
 *
 * Signed-in children render in the content column; sign-out posts to the real
 * auth BFF. The PortalSwitch keeps the four surfaces connected (one product).
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  CreditCard,
  FileText,
  Flower2,
  FolderOpen,
  HeartHandshake,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Megaphone,
  Menu,
  ScrollText,
  ShieldCheck,
  TreePine,
  User,
  UserSearch,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { PortalSwitch } from "@/components/portal-switch";
import type { PortalNavGroup, PortalNavItem } from "@/components/portal-nav";

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  profile: User,
  plans: ScrollText,
  property: TreePine,
  payments: CreditCard,
  memorials: HeartHandshake,
  cases: Flower2,
  documents: FolderOpen,
  appointments: CalendarDays,
  requests: ClipboardList,
  notifications: Bell,
  support: LifeBuoy,
  privacy: ShieldCheck,
  family: Users,
  clients: Users,
  prospects: UserSearch,
  applications: FileText,
  sales: ChartNoAxesCombined,
  marketing: Megaphone,
};

/** Mobile tab descriptor — `more` opens the drawer instead of navigating. */
export type PortalTab = {
  key: string;
  label: string;
  to: string;
  more?: boolean;
};

function SignOutButton({ to }: { to: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="portal-sidebar__logout"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
        router.replace(to);
      }}
    >
      <LogOut size={18} aria-hidden="true" />
      Log Out
    </button>
  );
}

export function PortalFrame({
  portal,
  brandLabel,
  email,
  logoutTo,
  nav,
  bell,
  tabs,
  help,
  children,
}: {
  portal: "family" | "agent";
  brandLabel: string;
  email: string | null;
  logoutTo: string;
  /** Grouped navigation (a single unnamed group renders exactly as before). */
  nav: PortalNavGroup[];
  bell?: ReactNode;
  /** Optional phone bottom bar (family portal). */
  tabs?: readonly PortalTab[];
  /** Optional sidebar help block (family portal: the coordinator's number). */
  help?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const brand = (
    <>
      <span className="portal-sidebar__brand">Villa Memorial</span>
      <span className="portal-sidebar__brand-sub">{brandLabel}</span>
    </>
  );

  const renderItem = (item: PortalNavItem) => {
    const Icon = ICONS[item.key] ?? LayoutDashboard;
    const active = pathname === item.to;
    return (
      <Link
        key={item.key}
        href={item.to}
        className={`portal-nav__item${active ? " portal-nav__item--active" : ""}`}
        aria-current={active ? "page" : undefined}
        onClick={() => setMenuOpen(false)}
      >
        <Icon size={18} aria-hidden="true" />
        <span>{item.label}</span>
      </Link>
    );
  };

  const navList = (
    <>
      {nav.map((group, index) => (
        <div className="portal-nav__group" key={group.label || `group-${index}`}>
          {group.label ? <p className="portal-nav__label">{group.label}</p> : null}
          {group.items.map(renderItem)}
        </div>
      ))}
    </>
  );

  return (
    <div className="portal-frame" data-portal={portal}>
      {/* Mobile / tablet top bar */}
      <header className="portal-topbar">
        <div className="portal-topbar__brand">{brand}</div>
        <div className="row">
          {bell}
          <button
            type="button"
            className="portal-topbar__icon"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="portal-sidebar">
        <div className="portal-sidebar__brand-row">
          <Link href="/" className="portal-sidebar__title">
            {brand}
          </Link>
          {bell}
        </div>
        {email ? <p className="portal-sidebar__user">{email}</p> : null}

        <nav className="portal-nav" aria-label={`${brandLabel} navigation`}>
          {navList}
        </nav>

        <div className="portal-sidebar__foot">
          {help}
          <div className="portal-sidebar__switcher">
            <PortalSwitch current={portal} />
          </div>
          <SignOutButton to={logoutTo} />
        </div>
      </aside>

      {/* Content */}
      <main className="portal-content">
        <div className="portal-content__inner">{children}</div>
      </main>

      {/* Mobile bottom tabs (family portal) */}
      {tabs && tabs.length > 0 ? (
        <nav className="portal-tabbar" aria-label={`${brandLabel} quick navigation`}>
          {tabs.map((tab) => {
            const Icon = ICONS[tab.key] ?? Menu;
            const active = !tab.more && pathname === tab.to;
            if (tab.more) {
              return (
                <button
                  key={tab.key}
                  type="button"
                  className="portal-tabbar__item"
                  onClick={() => setMenuOpen(true)}
                >
                  <Icon size={20} aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            }
            return (
              <Link
                key={tab.key}
                href={tab.to}
                className={`portal-tabbar__item${active ? " portal-tabbar__item--active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={20} aria-hidden="true" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="portal-drawer" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="portal-drawer__bar">
            <span className="portal-sidebar__brand">Villa Memorial</span>
            <button
              type="button"
              className="portal-topbar__icon"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          <nav className="portal-nav" aria-label={`${brandLabel} navigation`}>
            {navList}
          </nav>
          <div className="portal-sidebar__foot">
            {help}
            <SignOutButton to={logoutTo} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
