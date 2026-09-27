/**
 * SiteHeaderBar — the ONE public navigation bar (anchored grammar, blue/gold
 * folio), now a SINGLE row (captain 2026-09-21: the utility row was removed as
 * "so cheap" — its location, hours, Immediate Assistance link and the 24/7
 * number are carried by the footer, /contact and /immediate-assistance, and the
 * phone keeps its permanent bottom action bar):
 *
 *   main row      brand · the top-level page links (Home · Funeraria Memorial
 *                 Services · Villa Memorial Plan · Villa Memorial Park ·
 *                 Contact) · the grouped "Explore more" menu (Builder ·
 *                 Facilities · Gallery · Memorials · Price list) · quiet
 *                 Sign in · cart icon + count.
 *
 * Rendered by BOTH the premium home (LandingView, framework-free under the
 * repo's node tests) and every other public page (PublicShell). One component
 * + one class set is what keeps the bar identical when a visitor navigates:
 * same brand row, same destinations (Home first, Cart never a text link among
 * the pages).
 *
 * Framework-free on purpose (plain <a>/<button>, no next/link, no router): the
 * bar is also rendered by react-dom/server in unit tests and must never
 * require a Next router context. The two interactive parts — scroll
 * compression and the "Explore more" disclosure — live in the client-only
 * <HeaderBehavior />, which renders nothing. Active-page indication is purely
 * additive — pass currentPath from a client surface (PublicShell) and the
 * matching link gets aria-current; the home renders the same bar unhighlighted.
 */
/* eslint-disable @next/next/no-html-link-for-pages -- shared framework-free public bar (see landing-view.tsx rationale) */
import { ChevronDown, ShoppingCart } from "lucide-react";
import type { LogoConfig } from "@/lib/api-client/landing";
import { BrandMark } from "@/components/landing/brand-mark";
import { HeaderBehavior } from "@/components/landing/header-behavior";

/** Same order on every page — Home first, so visitors always know the way back.
 *
 * Captain's direction (2026-09-21): the bar keeps only the five top-level
 * destinations. Lots is gone (it lives inside Villa Memorial Park) and the
 * standalone Builder · Facilities · Gallery · Memorials chips move into the
 * grouped "Explore more" menu below, so the bar stays uncluttered on a phone. */
export const SITE_NAV_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Home", href: "/" },
  // The captain's full page names (2026-09-21 review): the bar shows the page
  // name itself, not a shorthand the visitor has to translate.
  { label: "Funeraria Memorial Services", href: "/services" },
  { label: "Villa Memorial Plan", href: "/plans" },
  { label: "Villa Memorial Park", href: "/map" },
  { label: "Contact", href: "/contact" },
];

/**
 * The grouped "Explore more" menu (captain, 2026-09-21): the secondary public
 * pages — now including the consolidated Price list — one tap away. Titles are
 * the captain's own short names; the notes are each page's own plain-language
 * summary, not new claims.
 */
export const EXPLORE_MORE_LINKS: ReadonlyArray<{ title: string; note: string; href: string }> = [
  { title: "Blog", note: "Photographs, films and notes from the grounds", href: "/blog" },
  { title: "Builder", note: "Build the arrangement and see the 2026 total", href: "/builder" },
  { title: "Facilities", note: "Chapels, viewing rooms and the grounds", href: "/facilities" },
  { title: "Gallery", note: "Photographs of the park and a walk-through", href: "/gallery" },
  { title: "Memorials", note: "Find a memorial families have published", href: "/memorials" },
  { title: "Price list", note: "Every published 2026 amount in one place", href: "/price-list" },
];

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function SiteHeaderBar({
  brand,
  currentPath,
  cartCount,
}: {
  brand: LogoConfig;
  /** Pathname of the rendered page; omit to render with no active link (home). */
  currentPath?: string;
  /** Live cart line count (client surfaces only); shown as the cart badge. */
  cartCount?: number;
}) {
  const hasCart = cartCount !== undefined && cartCount > 0;
  // A grouped page still shows its wayfinding cue: the trigger is marked
  // current while one of its four pages is open (the menu item itself carries
  // aria-current="page").
  const exploreCurrent =
    currentPath !== undefined && EXPLORE_MORE_LINKS.some((item) => isCurrent(currentPath, item.href));
  return (
    <>
      <a className="anchored-skip" href="#main">
        Skip to content
      </a>
      <header className="anchored-header">
        {/* Main row — brand · page links · grouped Explore more · actions. */}
        <div className="anchored-header__bar">
          <a className="anchored-header__brand" href="/">
            <BrandMark wordmark={brand.wordmark} markImage={brand.markImage} />
            <span className="anchored-header__wordmark">{brand.wordmark}</span>
          </a>
          <nav className="anchored-header__nav" aria-label="Sections">
            {/* The links scroll inside their own track so the chips can never
                paint under the brand on a narrow desktop; the dropdown trigger
                stays outside the track so its menu is never clipped. */}
            <div className="anchored-header__nav-track">
              {SITE_NAV_LINKS.map((link) => {
                const current = currentPath !== undefined && isCurrent(currentPath, link.href);
                return (
                  <a key={link.href} href={link.href} aria-current={current ? "page" : undefined}>
                    {link.label}
                  </a>
                );
              })}
            </div>
            <div className="anchored-header__explore">
              <button
                type="button"
                className="anchored-header__explore-trigger"
                data-anchored-explore-trigger
                aria-current={exploreCurrent ? "true" : undefined}
                aria-expanded="false"
                aria-haspopup="true"
              >
                Explore more
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              <div
                className="anchored-header__explore-menu"
                data-anchored-explore-menu
                hidden
                role="menu"
                aria-label="Explore more"
              >
                <p className="anchored-header__explore-heading">Explore more</p>
                {EXPLORE_MORE_LINKS.map((item) => {
                  const current = currentPath !== undefined && isCurrent(currentPath, item.href);
                  return (
                    <a
                      key={item.href}
                      className="anchored-header__explore-item"
                      role="menuitem"
                      href={item.href}
                      aria-current={current ? "page" : undefined}
                    >
                      <strong>{item.title}</strong>
                      <span>{item.note}</span>
                    </a>
                  );
                })}
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
