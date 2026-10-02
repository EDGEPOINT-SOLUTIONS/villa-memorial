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
 * - a sidebar help block (e.g. a coordinator's number);
 * - one extra top-bar action on phones (the family portal's always-visible
 *   Call button).
 * All four are opt-in through props. Both signed-in portals use this frame —
 * the agent portal and, since the captain's one-house-style call
 * (2026-09-17), the family portal too — so the two read as one product.
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
  Calculator,
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
  MessageSquare,
  Phone,
  Plus,
  ScrollText,
  ShieldCheck,
  TreePine,
  User,
  UserSearch,
  Users,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { PortalSwitch } from "@/components/portal-switch";
import { SkipLink } from "@/components/ui/skip-link";
import { useModalFocus } from "@/components/ui/use-modal-focus";
import { AccountBlock, AccountChip, type PortalAccount } from "@/components/portal/account-chip";
import { RailToggle } from "@/components/portal/rail-toggle";
import { BRAND_NAME } from "@/lib/brand";
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
  performance: TrendingUp,
  quote: Calculator,
  marketing: Megaphone,
  lots: TreePine,
  capture: Plus,
  messages: MessageSquare,
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
      <span className="portal-sidebar__logout-label">Log Out</span>
    </button>
  );
}

export function PortalFrame({
  portal,
  brandLabel,
  email,
  profileTo,
  logoutTo,
  nav,
  bell,
  headerAction,
  tabs,
  help,
  railCall,
  account,
  collapsible = false,
  children,
}: {
  portal: "family" | "agent";
  brandLabel: string;
  email: string | null;
  /** When set, the sidebar's user line links to the portal's own profile screen. */
  profileTo?: string;
  logoutTo: string;
  /** Grouped navigation (a single unnamed group renders exactly as before). */
  nav: PortalNavGroup[];
  bell?: ReactNode;
  /** One extra control in the phone top bar (family: the office number). */
  headerAction?: ReactNode;
  /** Optional phone bottom bar (any portal that needs pinned destinations). */
  tabs?: readonly PortalTab[];
  /** Optional sidebar help block (family portal: the coordinator's number). */
  help?: ReactNode;
  /**
   * The office number as a collapsed-rail icon (plan §7.3: the help block
   * collapses to a phone icon). Only rendered when the rail is collapsed.
   */
  railCall?: { href: string; label: string };
  /**
   * The account owner's own identity (plan §7.6). When set, the desktop content
   * column leads with a right-aligned account chip and the phone drawer carries
   * the account block; the agent portal (no account) renders exactly as before.
   */
  account?: PortalAccount;
  /**
   * Whether the rail collapses (plan §7.3). Family-only: the agent portal keeps
   * its always-expanded rail. When on, a persisted RailToggle appears and each
   * item carries a tooltip + `aria-label` so an icon-only rail is never unlabelled.
   */
  collapsible?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  // Drawer behaviour: focus in, Tab trapped, Escape closes, scroll locked,
  // focus returned to the More button (components/ui/use-modal-focus.ts).
  const { panelRef } = useModalFocus<HTMLDivElement>(menuOpen, () => setMenuOpen(false));

  // A sub-page (e.g. one receipt under /client/documents/receipts/…) still belongs
  // to its rail entry, so the active state follows the section, not the exact URL —
  // the same rule on the rail, the drawer and the phone tabs.
  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

  const brand = (
    <>
      <span className="portal-sidebar__brand">{BRAND_NAME}</span>
      <span className="portal-sidebar__brand-sub">{brandLabel}</span>
    </>
  );

  const renderItem = (item: PortalNavItem) => {
    const Icon = ICONS[item.key] ?? LayoutDashboard;
    const active = isActive(item.to);
    return (
      <Link
        key={item.key}
        href={item.to}
        className={`portal-nav__item${active ? " portal-nav__item--active" : ""}`}
        aria-current={active ? "page" : undefined}
        aria-label={collapsible ? item.label : undefined}
        title={collapsible ? item.label : undefined}
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
      <SkipLink target="#main" />
      {/* Mobile / tablet top bar */}
      <header className="portal-topbar">
        <div className="portal-topbar__brand">{brand}</div>
        <div className="row">
          {headerAction}
          {bell}
          {account ? <AccountChip account={account} variant="phone" /> : null}
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
        {collapsible ? <RailToggle /> : null}
        {email && !account ? (
          <p className="portal-sidebar__user">
            {profileTo ? (
              <Link href={profileTo} title="Your account">
                {email}
              </Link>
            ) : (
              email
            )}
          </p>
        ) : null}

        <nav id="portal-nav" className="portal-nav" aria-label={`${brandLabel} navigation`}>
          {navList}
        </nav>

        <div className="portal-sidebar__foot">
          {railCall ? (
            <a
              className="portal-rail-phone"
              href={railCall.href}
              aria-label={railCall.label}
              title={railCall.label}
            >
              <Phone size={18} aria-hidden="true" />
            </a>
          ) : null}
          {help}
          <div className="portal-sidebar__switcher">
            <PortalSwitch current={portal} />
          </div>
          <SignOutButton to={logoutTo} />
        </div>
      </aside>

      {/* Content */}
      <main className="portal-content" id="main">
        {account ? (
          <div className="portal-content__head">
            <AccountChip account={account} variant="desktop" />
          </div>
        ) : null}
        <div className="portal-content__inner">{children}</div>
      </main>

      {/* Mobile bottom tabs (family portal) */}
      {tabs && tabs.length > 0 ? (
        <nav className="portal-tabbar" aria-label={`${brandLabel} quick navigation`}>
          {tabs.map((tab) => {
            const Icon = ICONS[tab.key] ?? Menu;
            const active = !tab.more && isActive(tab.to);
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
        <div className="portal-drawer" role="dialog" aria-modal="true" aria-label="Menu" ref={panelRef} tabIndex={-1}>
          <div className="portal-drawer__bar">
            <span className="portal-sidebar__brand">{BRAND_NAME}</span>
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
          {account ? <AccountBlock account={account} /> : null}
          <div className="portal-sidebar__foot">
            {help}
            {!account ? <SignOutButton to={logoutTo} /> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
