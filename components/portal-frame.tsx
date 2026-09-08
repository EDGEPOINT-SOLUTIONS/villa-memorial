"use client";

/**
 * PortalFrame — villa-memorial portal chrome on the KEB stack.
 *
 * Villa's agent/client portals use a fixed LEFT SIDEBAR on desktop (brand block,
 * icon navigation with a filled active state, logout at the bottom) and a top
 * bar + drawer on mobile. This is that design, re-implemented in Next.js with
 * tokens-only CSS and lucide icons (no Material-font dependency, no Tailwind).
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
import type { PortalNavItem } from "@/components/portal-nav";

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
  clients: Users,
  prospects: UserSearch,
  applications: FileText,
  sales: ChartNoAxesCombined,
  marketing: Megaphone,
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
  children,
}: {
  portal: "family" | "agent";
  brandLabel: string;
  email: string | null;
  logoutTo: string;
  nav: PortalNavItem[];
  bell?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const brand = (
    <>
      <span className="portal-sidebar__brand">In Memoriam</span>
      <span className="portal-sidebar__brand-sub">{brandLabel}</span>
    </>
  );

  const navList = (
    <>
      {nav.map((item) => {
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
      })}
    </>
  );

  return (
    <div className="portal-frame">
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

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="portal-drawer" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="portal-drawer__bar">
            <span className="portal-sidebar__brand">In Memoriam</span>
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
            <SignOutButton to={logoutTo} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
