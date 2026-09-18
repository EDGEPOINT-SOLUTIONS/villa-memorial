/**
 * SiteHeaderBar — the ONE public navigation bar (anchored grammar, blue/gold
 * folio), now in TWO layers (captain-approved 2026-09-17 — Lavish review
 * "Public navigation", reference under docs/08-delivery/public-nav-design):
 *
 *   utility row   location · hours on the left, the 24/7 number as a real
 *                 call button on the right — the trust facts, always visible;
 *   main row      brand · short page links (Home · Services · Plans · Lots ·
 *                 Park · Facilities · Contact) · the grouped "Plan ahead" menu
 *                 carrying the client's full names · quiet Sign in · cart icon
 *                 + count.
 *
 * Rendered by BOTH the premium home (LandingView, framework-free under the
 * repo's node tests) and every other public page (PublicShell). One component
 * + one class set is what keeps the bar identical when a visitor navigates:
 * same brand row, same destinations (Home first, Cart never a text link among
 * the pages), same 24/7 number.
 *
 * Framework-free on purpose (plain <a>/<button>, no next/link, no router): the
 * bar is also rendered by react-dom/server in unit tests and must never
 * require a Next router context. The two interactive parts — scroll
 * compression and the "Plan ahead" disclosure — live in the client-only
 * <HeaderBehavior />, which renders nothing. Active-page indication is purely
 * additive — pass currentPath from a client surface (PublicShell) and the
 * matching link gets aria-current; the home renders the same bar unhighlighted.
 */
/* eslint-disable @next/next/no-html-link-for-pages -- shared framework-free public bar (see landing-view.tsx rationale) */
import { ChevronDown, Clock, LifeBuoy, MapPin, Phone, ShoppingCart } from "lucide-react";
import type { ContactInfo, LogoConfig } from "@/lib/api-client/landing";
import { BrandMark } from "@/components/landing/brand-mark";
import { HeaderBehavior } from "@/components/landing/header-behavior";

/** Same order on every page — Home first, so visitors always know the way back. */
export const SITE_NAV_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  // The Smart Service Builder (F-05) — the configurator, beside the price pages
  // it draws its figures from.
  { label: "Builder", href: "/builder" },
  { label: "Plans", href: "/plans" },
  { label: "Lots", href: "/lots" },
  { label: "Park", href: "/map" },
  // The park's rooms (chapels + grounds) — its own page beside the map, so a
  // family choosing where to hold a wake does not have to read /services.
  { label: "Facilities", href: "/facilities" },
  { label: "Gallery", href: "/gallery" },
  // The memorial surface (F-04) — the one public destination for finding a
  // person, kept to a single chip; its family path lives inside the page.
  { label: "Memorials", href: "/memorials" },
  { label: "Contact", href: "/contact" },
];

/**
 * The grouped "Plan ahead" menu (D1): the bar's short words stay short and the
 * client's full page names live here verbatim, one tap away. Notes are the
 * page's own plain-language summary, not new claims.
 */
export const PLAN_AHEAD_LINKS: ReadonlyArray<{ title: string; note: string; href: string }> = [
  { title: "Villa Memorial Plan", note: "Instalment plans, tiers and terms", href: "/plans" },
  { title: "Senior benefits", note: "Senior-citizen rates and requirements", href: "/plans/senior-benefits" },
  { title: "Funeraria Memorial Services", note: "At-need care, chapels and 2026 prices", href: "/services" },
  { title: "Smart Service Builder", note: "Build the arrangement and see the 2026 total", href: "/builder" },
  { title: "Villa Memorial Park", note: "Sections, lots and the park map", href: "/map" },
];

/**
 * The utility row's hours line — a plain restatement of the client's own 24/7
 * label (lib/fixtures/landing/content.json contact.phoneLabel), shown beside
 * the real location. Nothing here invents a schedule.
 */
export const UTILITY_HOURS = "every hour, every day";

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function SiteHeaderBar({
  brand,
  contact,
  currentPath,
  cartCount,
}: {
  brand: LogoConfig;
  contact: ContactInfo;
  /** Pathname of the rendered page; omit to render with no active link (home). */
  currentPath?: string;
  /** Live cart line count (client surfaces only); shown as the cart badge. */
  cartCount?: number;
}) {
  const hasCart = cartCount !== undefined && cartCount > 0;
  return (
    <>
      <a className="anchored-skip" href="#main">
        Skip to content
      </a>
      <header className="anchored-header">
        {/* Utility row — location · hours, then the 24/7 number as a real
            call button. On phones the button moves to the bottom action bar
            so the number is never shown twice. */}
        <div className="anchored-header__utility">
          <div className="anchored-header__utility-bar">
            <p className="anchored-header__utility-meta">
              <MapPin size={14} aria-hidden="true" />
              <span>{contact.location}</span>
              <span className="anchored-header__utility-sep" aria-hidden="true">
                ·
              </span>
              <Clock size={14} aria-hidden="true" />
              <span>{UTILITY_HOURS}</span>
            </p>
            <div className="anchored-header__utility-actions">
              {/* The way into the Immediate Assistance screen (F-01). Desktop
                  only — on phones the same target lives in the bottom phone
                  bar, never twice on one screen. */}
              <a className="anchored-header__assist" href="/immediate-assistance">
                <LifeBuoy size={15} aria-hidden="true" />
                <span>Immediate assistance</span>
              </a>
              <a className="anchored-header__call" href={contact.phoneHref}>
                <Phone size={17} aria-hidden="true" />
                <span className="anchored-header__call-text">
                  <span className="anchored-header__call-label">{contact.phoneLabel}</span>
                  <span className="anchored-header__call-number">{contact.phoneDisplay}</span>
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Main row — brand · page links · grouped Plan ahead · actions. */}
        <div className="anchored-header__bar">
          <a className="anchored-header__brand" href="/">
            <BrandMark wordmark={brand.wordmark} markImage={brand.markImage} />
            <span className="anchored-header__wordmark">{brand.wordmark}</span>
          </a>
          <nav className="anchored-header__nav" aria-label="Sections">
            {SITE_NAV_LINKS.map((link) => {
              const current = currentPath !== undefined && isCurrent(currentPath, link.href);
              return (
                <a key={link.href} href={link.href} aria-current={current ? "page" : undefined}>
                  {link.label}
                </a>
              );
            })}
            <div className="anchored-header__plan">
              <button
                type="button"
                className="anchored-header__plan-trigger"
                data-anchored-plan-trigger
                aria-expanded="false"
                aria-haspopup="true"
              >
                Plan ahead
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              <div
                className="anchored-header__plan-menu"
                data-anchored-plan-menu
                hidden
                role="menu"
                aria-label="Plan ahead"
              >
                <p className="anchored-header__plan-heading">Plan ahead</p>
                {PLAN_AHEAD_LINKS.map((item) => (
                  <a
                    key={item.href}
                    className="anchored-header__plan-item"
                    role="menuitem"
                    href={item.href}
                  >
                    <strong>{item.title}</strong>
                    <span>{item.note}</span>
                  </a>
                ))}
              </div>
            </div>
          </nav>
          <div className="anchored-header__actions">
            <a className="anchored-header__signin" href="/login">
              Sign in
            </a>
            {/* The cart is a place you return to, not a page you browse: an
                icon with its count beside Sign in (D2). */}
            <a
              className="anchored-header__cart"
              href="/cart"
              aria-label={hasCart ? `Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}` : "Cart"}
            >
              <ShoppingCart size={21} aria-hidden="true" />
              {hasCart ? (
                <span className="anchored-header__cart-count" aria-hidden="true">
                  {cartCount}
                </span>
              ) : null}
            </a>
            {/* One atomic status line for a cart that changes while the visitor
                is on the page (WCAG 2.4.6 contextual updates): the visible badge
                is aria-hidden, this is what a screen reader hears. */}
            <span className="visually-hidden" role="status">
              {hasCart ? `${cartCount} item${cartCount === 1 ? "" : "s"} in cart` : ""}
            </span>
          </div>
        </div>
        <HeaderBehavior />
      </header>
    </>
  );
}
