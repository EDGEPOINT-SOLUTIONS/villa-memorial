"use client";

import { usePathname } from "next/navigation";
import { QuoteBasketProvider, useQuoteBasket } from "@/lib/quote-basket/quote-basket-context";
import { CartProvider, useCart } from "@/lib/cart/cart-context";
import type { LandingContent } from "@/lib/api-client/landing";
import { SiteHeaderBar } from "@/components/landing/site-header";
import { NextSteps } from "@/components/landing/next-steps";
import { MobileQuickMenu } from "@/components/landing/mobile-quick-menu";
import { PhoneActionBar } from "@/components/landing/phone-action-bar";
import { LandingFooter } from "@/components/landing/landing-view";

/**
 * Public store chrome — shared shell for every public surface EXCEPT the
 * premium home (the home renders LandingView directly with the identical
 * header/footer so both stay in sync — see AGENTS.md "anchored catalogue").
 *
 * The header here is the SAME SiteHeaderBar + LandingFooter the home uses,
 * fed from the same landing content document (logo wordmark + uploaded mark).
 * Interior pages add two client-only niceties the framework-free
 * home can't: an active-link highlight (aria-current via usePathname) and the
 * live cart + quote counts. Everything else — brand row, page links, grouped
 * Explore more, the two labelled basket actions, the phone bottom action bar —
 * is identical on every public page, so the navigation never changes while
 * navigating between pages.
 *
 * Pass flush for full-bleed heroes: the page supplies its own containers.
 */
function PublicChromeHeader({ content }: { content: LandingContent }) {
  const pathname = usePathname();
  const cart = useCart();
  const quote = useQuoteBasket();
  const countOf = (lines: ReadonlyArray<{ quantity: number }>) =>
    lines.reduce((total, line) => total + line.quantity, 0);
  return (
    <SiteHeaderBar
      brand={content.logo}
      currentPath={pathname}
      cartCount={cart.ready && cart.lines.length > 0 ? countOf(cart.lines) : undefined}
      quoteCount={quote.ready && quote.lines.length > 0 ? countOf(quote.lines) : undefined}
    />
  );
}

/**
 * The closing action band on interior pages (F-17). Every public page gets it:
 * the former /immediate-assistance exception went with that page (office,
 * inbox 040).
 */
function PublicNextSteps({ content }: { content: LandingContent }) {
  return <NextSteps contact={content.contact} />;
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
      <QuoteBasketProvider>
        <div className="public-shell has-phonebar">
        <PublicChromeHeader content={content} />
        <main
          id="main"
          className={flush ? "public-main public-main--flush" : "container public-main"}
        >
          {children}
        </main>
        {/* The one closing action layer (F-17) — every public page ends with the
            same three options, immediately above the footer. */}
        <PublicNextSteps content={content} />
        <MobileQuickMenu content={content} />
        <PhoneActionBar contact={content.contact} />
        <LandingFooter content={content} />
        </div>
      </QuoteBasketProvider>
    </CartProvider>
  );
}
