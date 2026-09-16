/**
 * SiteHeaderBar — the ONE public navigation bar (anchored grammar, blue/gold
 * folio). Rendered by BOTH the premium home (LandingView, framework-free under
 * the repo's node tests) and every other public page (PublicShell). One
 * component + one class set is what keeps the bar identical when a visitor
 * navigates between pages: same logo + business name row, same nav items
 * (Home first), same 24/7 phone chip and Sign in door.
 *
 * Framework-free on purpose (plain <a>, no next/link, no router): the bar is
 * also rendered by react-dom/server in unit tests and must never require a
 * Next router context. Active-page indication is purely additive — pass
 * currentPath from a client surface (PublicShell) and the matching link gets
 * aria-current; the home passes nothing and renders the same bar unhighlighted.
 */
/* eslint-disable @next/next/no-html-link-for-pages -- shared framework-free public bar (see landing-view.tsx rationale) */
import type { ContactInfo, LogoConfig } from "@/lib/api-client/landing";
import { BrandMark } from "@/components/landing/brand-mark";

/** Same order on every page — Home first, so visitors always know the way back. */
export const SITE_NAV_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Home", href: "/" },
  { label: "Funeraria Memorial Services", href: "/services" },
  { label: "Villa Memorial Plan", href: "/plans" },
  { label: "Lots", href: "/lots" },
  { label: "Villa Memorial Park", href: "/map" },
  { label: "Cart", href: "/cart" },
  { label: "Contact", href: "/contact" },
];

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
  /** Live cart line count (client surfaces only); shown as a small superscript. */
  cartCount?: number;
}) {
  return (
    <header className="anchored-header">
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
                {link.href === "/cart" && cartCount && cartCount > 0 ? (
                  <sup className="anchored-header__cart-count" aria-label={`${cartCount} items in cart`}>
                    {cartCount}
                  </sup>
                ) : null}
              </a>
            );
          })}
        </nav>
        <div className="anchored-header__actions">
          <a className="anchored-header__phone" href={contact.phoneHref}>
            <span className="anchored-header__phone-label">{contact.phoneLabel}</span>
            <span className="anchored-header__phone-number">{contact.phoneDisplay}</span>
          </a>
          <a className="anchored-header__signin" href="/login">
            Sign in
          </a>
        </div>
      </div>
    </header>
  );
}
