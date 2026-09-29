/**
 * SiteHeaderBar — the ONE public header (anchored grammar, blue/gold folio),
 * now TWO ROWS inside one <header> (office, inbox 035):
 *
 *   upper row (NOT sticky — it scrolls away; desktop only)
 *                 the three doorways Contact · Blog · Memorials on the left;
 *                 quiet Login and the grouped "Explore more" menu
 *                 (Builder · Facilities · Gallery · Price list) on the right.
 *   main row      (sticky) brand · the four top-level page links (Home ·
 *                 Funeraria Memorial Services · Villa Memorial Plan · Villa
 *                 Memorial Park) · the two labelled basket actions,
 *                 "Your Cart" + count and "Your Quote" + count, both
 *                 sky/outline — gold stays the office's phone number.
 *
 * ONE header, TWO rows, ONE sticky layer: the header's sticky `top` is offset
 * by the upper row's height (`--anchored-topbar-h`), so the upper row scrolls
 * away and the main bar pins at the viewport top and keeps its existing
 * compressed state. `--anchored-header-h` remains the MAIN bar's height only,
 * because that is what the sticky panels below measure against.
 *
 * Below 74.999rem (where the main nav gives way to the quick-menu FAB) the
 * upper row is hidden with it: every one of its destinations stays reachable
 * on a phone — Contact · Memorials in the quick menu, Blog in the quick menu
 * and the bottom action bar, Login in the quick menu's portal doors.
 *
 * Rendered by BOTH the premium home (LandingView, framework-free under the
 * repo's node tests) and every other public page (PublicShell). One component
 * + one class set is what keeps the bar identical when a visitor navigates:
 * same brand row, same destinations (Home first, the basket actions never text
 * links among the pages).
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
import { ChevronDown } from "lucide-react";
import type { LogoConfig } from "@/lib/api-client/landing";
import { BrandMark } from "@/components/landing/brand-mark";
import { HeaderBehavior } from "@/components/landing/header-behavior";

/**
 * The upper row's doorways (office, inbox 035): the three pages that no longer
 * sit among the main bar's destinations. They are still top-level pages — they
 * simply moved up one row.
 */
export const SITE_TOP_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Contact", href: "/contact" },
  { label: "Blog", href: "/blog" },
  { label: "Memorials", href: "/memorials" },
];

/**
 * The MAIN bar's destinations (office, inbox 035 — Blog and Contact moved up
 * to the upper row, so the bar keeps the four ground-floor pages). Home first,
 * so visitors always know the way back; the captain's full page names, not a
 * shorthand the visitor has to translate.
 */
export const SITE_NAV_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Home", href: "/" },
  { label: "Funeraria Memorial Services", href: "/services" },
  { label: "Villa Memorial Plan", href: "/plans" },
  { label: "Villa Memorial Park", href: "/map" },
];

/**
 * The grouped "Explore more" menu (captain, 2026-09-21; trimmed by inbox 035:
 * Memorials moved up to the upper row, so the menu keeps the four remaining
 * secondary pages). Titles are the captain's own short names; the notes are
 * each page's own plain-language summary, not new claims.
 */
export const EXPLORE_MORE_LINKS: ReadonlyArray<{ title: string; note: string; href: string }> = [
  { title: "Builder", note: "Build the arrangement and see the 2026 total", href: "/builder" },
  { title: "Facilities", note: "Chapels, viewing rooms and the grounds", href: "/facilities" },
  { title: "Gallery", note: "Photographs of the park and a walk-through", href: "/gallery" },
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
  quoteCount,
}: {
  brand: LogoConfig;
  /** Pathname of the rendered page; omit to render with no active link (home). */
  currentPath?: string;
  /** Live CART line count (priced items) — the cart action's count. */
  cartCount?: number;
  /** Live quote-basket line count (quote-only items) — the quote action's count. */
  quoteCount?: number;
}) {
  const hasCartLines = cartCount !== undefined && cartCount > 0;
  const hasQuoteLines = quoteCount !== undefined && quoteCount > 0;
  // A grouped page still shows its wayfinding cue: the trigger is marked
  // current while one of ITS pages is open (the open menu item carries
  // aria-current="page"). Memorials is no longer in this menu, so /memorials
  // marks its own link in the upper row instead.
  const exploreCurrent =
    currentPath !== undefined && EXPLORE_MORE_LINKS.some((item) => isCurrent(currentPath, item.href));
  return (
    <>
      <a className="anchored-skip" href="#main">
        Skip to content
      </a>
      <header className="anchored-header">
        {/* ---- upper row: NOT sticky, desktop only (inbox 035) ------------- */}
        <div className="anchored-header__topbar">
          <nav className="anchored-header__topnav" aria-label="Pages">
            {SITE_TOP_LINKS.map((link) => {
              const current = currentPath !== undefined && isCurrent(currentPath, link.href);
              return (
                <a key={link.href} href={link.href} aria-current={current ? "page" : undefined}>
                  {link.label}
                </a>
              );
            })}
          </nav>
          <div className="anchored-header__top-actions">
            {/* Login replaced the main bar's "Sign in" (inbox 035): one portal
                door, now in the utility row so the main bar stays pages only. */}
            <a className="anchored-header__login" href="/login">
              Login
            </a>
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
          </div>
        </div>

        {/* ---- main row: sticky, the pages + the two baskets --------------- */}
        <div className="anchored-header__bar">
          <a className="anchored-header__brand" href="/">
            <BrandMark wordmark={brand.wordmark} markImage={brand.markImage} />
            <span className="anchored-header__wordmark">{brand.wordmark}</span>
          </a>
          <nav className="anchored-header__nav" aria-label="Sections">
            {/* The links scroll inside their own track so the chips can never
                paint under the brand on a narrow desktop. */}
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
          </nav>
          <div className="anchored-header__actions">
            {/* TWO BASKETS, TWO LABELLED ACTIONS (office, 2026-09-29; labels
                from inbox 035): priced items live in the cart (the cart page
                and its checkout), items the office quotes by hand live in the
                quote basket. Both stay visible when empty; both wear the
                sky/outline treatment — gold is rationed to the office's phone
                number. The accessible name always contains the visible label
                (WCAG 2.5.3), so it reads "Your Cart, 2 items". */}
            <a
              className="anchored-header__cart"
              href="/cart"
              aria-label={
                hasCartLines ? `Your Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}` : "Your Cart"
              }
            >
              Your Cart
              {hasCartLines ? (
                <span className="anchored-header__cart-count" aria-hidden="true">
                  {cartCount}
                </span>
              ) : null}
            </a>
            <a
              className="anchored-header__quote"
              href="/quote"
              aria-label={
                hasQuoteLines
                  ? `Your Quote, ${quoteCount} line${quoteCount === 1 ? "" : "s"}`
                  : "Your Quote"
              }
            >
              Your Quote
              {hasQuoteLines ? (
                <span className="anchored-header__quote-count" aria-hidden="true">
                  {quoteCount}
                </span>
              ) : null}
            </a>
            {/* One atomic status line for both baskets as they change while the
                visitor is on the page (WCAG 2.4.6 contextual updates): the
                visible badges are aria-hidden, this is what a screen reader
                hears. */}
            <span className="visually-hidden" role="status">
              {[
                hasCartLines ? `${cartCount} item${cartCount === 1 ? "" : "s"} in the cart` : "",
                hasQuoteLines
                  ? `${quoteCount} line${quoteCount === 1 ? "" : "s"} in your quote`
                  : "",
              ]
                .filter(Boolean)
                .join("; ")}
            </span>
          </div>
        </div>
        <HeaderBehavior />
      </header>
    </>
  );
}
