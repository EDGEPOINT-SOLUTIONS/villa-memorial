"use client";

/**
 * FamilyFrame — the family portal shell of the approved 2026-09-16 redesign
 * (docs/08-delivery/family-portal-design).
 *
 * ONE GRAMMAR, TWO SIZES. Desktop: one plain bar with the household name, six
 * navigation names and the Call button. Phone: the same bar plus five bottom
 * tabs (four destinations + More) and the More sheet for everything else. The
 * portal's own content is the single 44rem reading column; the frame never adds
 * a rail of small links.
 *
 * The agent portal keeps `components/portal-frame.tsx` untouched.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  CalendarDays,
  FileText,
  HeartHandshake,
  Home,
  LayoutGrid,
  Lock,
  Phone,
  ScrollText,
  TreePine,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { FamilySignOut } from "@/components/family/family-signout";
import { FAMILY_MORE_NAV, FAMILY_PORTAL_TABS, FAMILY_PRIMARY_NAV } from "@/components/portal-nav";
import { FAMILY_HELP } from "@/lib/family/contact";

const ICONS: Record<string, LucideIcon> = {
  dashboard: Home,
  cases: CalendarDays,
  payments: ScrollText,
  documents: FileText,
  memorials: HeartHandshake,
  profile: User,
  support: Phone,
  appointments: CalendarDays,
  plans: ScrollText,
  property: TreePine,
  family: Users,
  notifications: Bell,
  privacy: Lock,
  more: LayoutGrid,
};

export function FamilyFrame({
  household,
  logoutTo,
  children,
}: {
  /** e.g. “Dela Cruz family” — shown under the brand and in the footer. */
  household: string;
  logoutTo: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const brand = (
    <>
      <span className="fv-brand__mark" aria-hidden="true">
        V
      </span>
      <span className="fv-brand__text">
        <span className="fv-brand__name">Villa Memorial</span>
        <span className="fv-brand__who">{household}</span>
      </span>
    </>
  );

  return (
    <div className="fv-body">
      <a className="fv-skip" href="#family-main">
        Skip to the main content
      </a>

      <header className="fv-topbar">
        <div className="fv-topbar__in">
          <Link className="fv-brand" href="/client/dashboard">
            {brand}
          </Link>
          <nav className="fv-nav" aria-label="Family portal">
            {FAMILY_PRIMARY_NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <Link key={item.key} href={item.to} aria-current={active ? "page" : undefined}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <span className="fv-hero-call">
            <a className="fv-call" href={FAMILY_HELP.phoneHref}>
              <Phone size={20} aria-hidden="true" />
              <span>Call us</span>
            </a>
          </span>
        </div>
      </header>

      <main className="fv-main" id="family-main">
        <div className="fv-wrap">{children}</div>
      </main>

      <footer className="fv-foot">
        <div className="fv-foot__in">
          <span>Villa Memorial · Isabela City</span>
          <span>Looking after {household}</span>
          <span>
            Call{" "}
            <a href={FAMILY_HELP.phoneHref}>
              {FAMILY_HELP.phone}
            </a>{" "}
            · {FAMILY_HELP.hours}
          </span>
        </div>
      </footer>

      <nav className="fv-tabbar" aria-label="Family portal quick navigation">
        {FAMILY_PORTAL_TABS.map((tab) => {
          const Icon = ICONS[tab.key] ?? Home;
          if (tab.more) {
            return (
              <button
                key={tab.key}
                type="button"
                aria-expanded={moreOpen}
                aria-controls="family-more"
                onClick={() => setMoreOpen(true)}
              >
                <Icon size={22} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          }
          const active = pathname === tab.to;
          return (
            <Link
              key={tab.key}
              href={tab.to}
              aria-current={active ? "page" : undefined}
              onClick={() => setMoreOpen(false)}
            >
              <Icon size={22} aria-hidden="true" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {moreOpen ? (
        <div className="fv-more" role="dialog" aria-modal="true" aria-label="More pages">
          <div className="fv-more__bar">
            <p className="fv-more__title">More</p>
            <button
              type="button"
              className="fv-more__close"
              aria-label="Close"
              onClick={() => setMoreOpen(false)}
            >
              <X size={24} aria-hidden="true" />
            </button>
          </div>
          <div className="fv-sheet" id="family-more">
            {FAMILY_MORE_NAV.map((item) => {
              const Icon = ICONS[item.key] ?? LayoutGrid;
              return (
                <Link key={item.key} href={item.to}>
                  <Icon size={22} aria-hidden="true" />
                  <span className="fv-sheet__text">
                    <strong>{item.label}</strong>
                    <em>{item.detail}</em>
                  </span>
                </Link>
              );
            })}
            <FamilySignOut to={logoutTo} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
