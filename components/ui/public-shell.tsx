"use client";

import { usePathname } from "next/navigation";
import { CartProvider, useCart } from "@/lib/cart/cart-context";
import type { LandingContent } from "@/lib/api-client/landing";
import { SiteHeaderBar } from "@/components/landing/site-header";
import { MobileQuickMenu } from "@/components/landing/mobile-quick-menu";
import { LandingFooter } from "@/components/landing/landing-view";

/**
 * Public store chrome — shared shell for every public surface EXCEPT the
 * premium home (the home renders LandingView directly with the identical
 * header/footer so both stay in sync — see AGENTS.md "anchored catalogue").
 *
 * The header here is the SAME SiteHeaderBar + LandingFooter the home uses,
 * fed from the same landing content document (logo wordmark + uploaded mark,
 * 24/7 line). Interior pages add two client-only niceties the framework-free
 * home can't: an active-link highlight (aria-current via usePathname) and the
 * live cart count. Everything else — brand row, nav items incl. Home, phone
 * chip, Sign in, responsive mobile quick-menu — is pixel-identical, so the
 * navigation never changes while navigating between pages.
 *
 * Pass flush for full-bleed heroes: the page supplies its own containers.
 */
function PublicChromeHeader({ content }: { content: LandingContent }) {
  const pathname = usePathname();
  const { lines, ready } = useCart();
  const count = ready ? lines.reduce((s, l) => s + l.quantity, 0) : 0;
  return (
    <SiteHeaderBar
      brand={content.logo}
      contact={content.contact}
      currentPath={pathname}
      cartCount={count > 0 ? count : undefined}
    />
  );
}

export function PublicShell({
  children,
  content,
  flush = false,
}: {
  children: React.ReactNode;
  /** Landing content document — supplies the header brand + 24/7 line, the
   * quick-menu rails, and the footer (same doc the home renders from). */
  content: LandingContent;
  flush?: boolean;
}) {
  return (
    <CartProvider>
      <div className="public-shell">
        <PublicChromeHeader content={content} />
        <main className={flush ? "public-main public-main--flush" : "container public-main"}>
          {children}
        </main>
        <MobileQuickMenu content={content} />
        <LandingFooter content={content} />
      </div>
    </CartProvider>
  );
}
