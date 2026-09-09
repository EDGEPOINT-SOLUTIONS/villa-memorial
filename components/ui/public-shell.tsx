"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CartProvider, useCart } from "@/lib/cart/cart-context";

/** Active-link helper: same structure/order on every breakpoint; current page
 * always indicated (aria-current + brass treatment). */
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const current =
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link href={href} aria-current={current ? "page" : undefined}>
      {children}
    </Link>
  );
}

function Header() {
  const { lines, ready } = useCart();
  const count = ready ? lines.reduce((s, l) => s + l.quantity, 0) : null;

  return (
    <header className="public-header">
      <div className="container public-header__bar">
        <Link href="/" className="public-header__brand">
          Villa Memorial
        </Link>
        <nav className="public-nav" aria-label="Store">
          <NavLink href="/services">Services</NavLink>
          <NavLink href="/plans">Plans</NavLink>
          <NavLink href="/lots">Lots</NavLink>
          <NavLink href="/map">Park map</NavLink>
          <NavLink href="/cart">Cart{count !== null ? ` (${count})` : ""}</NavLink>
        </nav>
        <nav className="public-nav" aria-label="Portal sign-in">
          <NavLink href="/client/login">Family sign-in</NavLink>
          <NavLink href="/agent/login">Agent sign-in</NavLink>
          <NavLink href="/login">Staff sign-in</NavLink>
        </nav>
      </div>
    </header>
  );
}

/**
 * Public store layout — shared chrome for every public surface (landing included,
 * so one header/footer everywhere instead of divergent per-page variants).
 * Pass flush for full-bleed heroes (landing): the page supplies its own containers.
 */
export function PublicShell({
  children,
  flush = false,
}: {
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <CartProvider>
      <div className="public-shell">
        <Header />
        <main className={flush ? "public-main public-main--flush" : "container public-main"}>
          {children}
        </main>
        <footer className="public-footer">
          <div className="container public-footer__bar">
            <span className="public-header__brand">Villa Memorial</span>
            <nav className="public-nav" aria-label="Information">
              <NavLink href="/services">Services</NavLink>
              <NavLink href="/plans">Plans</NavLink>
              <NavLink href="/lots">Lots</NavLink>
              <NavLink href="/faq">FAQ</NavLink>
              <NavLink href="/contact">Contact</NavLink>
            </nav>
            <span className="public-footer__note">
              Memorial &amp; funeral services platform
            </span>
          </div>
        </footer>
      </div>
    </CartProvider>
  );
}
