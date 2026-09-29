import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  EXPLORE_MORE_LINKS,
  SITE_NAV_LINKS,
  SITE_TOP_LINKS,
  SiteHeaderBar,
} from "@/components/landing/site-header";
import { PhoneActionBar } from "@/components/landing/phone-action-bar";
import { listLandingContent } from "@/lib/api-client/landing";

/**
 * The approved public-navigation contract (captain, 2026-09-17 — Lavish review
 * "Public navigation", reference under docs/08-delivery/public-nav-design;
 * updated by the captain's 2026-09-21 direction and by the office's two-row
 * header, inbox 035):
 *
 *   upper row (desktop only, NOT sticky)  Contact · Blog · Memorials · Login ·
 *                                         the grouped Explore more menu
 *                                         (Builder · Facilities · Gallery ·
 *                                         Price list)
 *   main row  (sticky)                    brand · Home · Funeraria Memorial
 *                                         Services · Villa Memorial Plan ·
 *                                         Villa Memorial Park · the two
 *                                         labelled basket actions
 *
 * ONE <header>, two rows, one sticky layer. Executed through react-dom/server
 * like the rest of the repo's UI tests; the interactive behaviour (scroll
 * compression, disclosure, dialog) is client-only and pinned structurally here.
 */
async function chrome() {
  return listLandingContent();
}

describe("the public header", () => {
  it("is ONE header with no resurrected utility strip", async () => {
    const { logo } = await chrome();
    const html = renderToStaticMarkup(createElement(SiteHeaderBar, { brand: logo }));
    // The captain's 2026-09-21 cleanup still holds: location, hours and a call
    // button are not in the header; the footer and /contact carry the number,
    // and the phone action bar keeps its own call target.
    expect(html).not.toContain("anchored-header__utility");
    expect(html).not.toContain("anchored-header__assist");
    expect(html).not.toContain("anchored-header__call");
    expect(html).not.toContain("every hour, every day");
    // ONE <header> element, not two.
    expect(html.match(/<header /g)).toHaveLength(1);
  });

  it("puts Contact · Blog · Memorials and Login in the upper row", async () => {
    const { logo } = await chrome();
    const html = renderToStaticMarkup(
      createElement(SiteHeaderBar, { brand: logo, currentPath: "/plans" }),
    );
    expect(SITE_TOP_LINKS.map((link) => [link.href, link.label])).toEqual([
      ["/contact", "Contact"],
      ["/blog", "Blog"],
      ["/memorials", "Memorials"],
    ]);
    const topbar = html.slice(
      html.indexOf('class="anchored-header__topbar"'),
      html.indexOf('class="anchored-header__bar"'),
    );
    expect(topbar).toContain('href="/contact">Contact</a>');
    expect(topbar).toContain('href="/blog">Blog</a>');
    expect(topbar).toContain('href="/memorials">Memorials</a>');
    // Login took the main bar's "Sign in" and now lives up here.
    expect(topbar).toContain('class="anchored-header__login" href="/login">Login</a>');
    expect(html).not.toContain("Sign in");
    // The disclosure moved up with it, and the menu is the four remaining
    // secondary pages — Memorials left for the upper row.
    expect(topbar).toContain("Explore more");
    expect(topbar).toContain('role="menu"');
    expect(EXPLORE_MORE_LINKS.map((item) => [item.href, item.title])).toEqual([
      ["/builder", "Builder"],
      ["/facilities", "Facilities"],
      ["/gallery", "Gallery"],
      ["/price-list", "Price list"],
    ]);
    expect(html).not.toContain(">Memorials</strong>");
    expect(html).not.toContain("Plan ahead");
    for (const item of EXPLORE_MORE_LINKS) {
      expect(html).toContain(item.title);
      expect(html).toContain(item.note);
    }
    expect(html).toContain('aria-haspopup="true"');
    expect(html).toContain('aria-expanded="false"');
  });

  it("keeps the four ground-floor pages in the main bar, only the current one marked", async () => {
    const { logo } = await chrome();
    const html = renderToStaticMarkup(
      createElement(SiteHeaderBar, { brand: logo, currentPath: "/plans" }),
    );
    expect(SITE_NAV_LINKS.map((link) => [link.href, link.label])).toEqual([
      ["/", "Home"],
      ["/services", "Funeraria Memorial Services"],
      ["/plans", "Villa Memorial Plan"],
      ["/map", "Villa Memorial Park"],
    ]);
    const bar = html.slice(
      html.indexOf('class="anchored-header__bar"'),
      html.indexOf("</header>"),
    );
    for (const [href, label] of [
      ["/", "Home"],
      ["/services", "Funeraria Memorial Services"],
      ["/plans", "Villa Memorial Plan"],
      ["/map", "Villa Memorial Park"],
    ] as const) {
      const aria = href === "/plans" ? ' aria-current="page"' : "";
      expect(bar).toContain(`href="${href}"${aria}>${label}</a>`);
    }
    // Blog and Contact moved up: the main bar must not carry them again.
    expect(bar).not.toContain('href="/blog"');
    expect(bar).not.toContain('href="/contact"');
    expect(bar).not.toContain('href="/lots"');
    // Exactly one current page in the whole header.
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("marks the upper row's own destination, and leaves the trigger unmarked for it", async () => {
    const { logo } = await chrome();
    const html = renderToStaticMarkup(
      createElement(SiteHeaderBar, { brand: logo, currentPath: "/memorials" }),
    );
    expect(html).toContain('href="/memorials" aria-current="page">Memorials</a>');
    // The Explore trigger's current marking follows its OWN menu: Memorials is
    // no longer in it, so the trigger carries no aria-current here.
    expect(html).not.toMatch(/explore-trigger[^>]*aria-current/);
  });

  it("marks the Explore trigger while one of ITS pages is open", async () => {
    const { logo } = await chrome();
    const html = renderToStaticMarkup(
      createElement(SiteHeaderBar, { brand: logo, currentPath: "/facilities" }),
    );
    expect(html).toMatch(/explore-trigger[^>]*aria-current="true"/);
    expect(html).toContain('href="/facilities" aria-current="page"');
  });

  it("renders both basket actions labelled, sky/outline, never a trolley", async () => {
    // The office's direction (2026-09-29 + inbox 035): the trolley glyph was
    // the one thing on the page that still said "shop". Both actions say what
    // they are, stay visible when empty, and wear sky/outline — never gold,
    // which is rationed to the office's phone number.
    const { logo, contact } = await chrome();
    const html = renderToStaticMarkup(
      createElement(SiteHeaderBar, { brand: logo, cartCount: 2, quoteCount: 3 }),
    );
    expect(html).toContain('class="anchored-header__cart"');
    expect(html).toContain('aria-label="Your Cart, 2 items"');
    expect(html).toContain(">Your Cart<");
    expect(html).toContain('class="anchored-header__cart-count"');
    expect(html).toContain('class="anchored-header__quote"');
    expect(html).toContain('aria-label="Your Quote, 3 lines"');
    expect(html).toContain(">Your Quote<");
    expect(html).toContain('class="anchored-header__quote-count"');
    expect(html).toContain("2 items in the cart");
    expect(html).toContain("3 lines in your quote");
    expect(html).not.toContain("shopping-cart");
    // Visible with no counts too, so the pages are findable before anything is
    // added; the counts only appear with lines.
    const empty = renderToStaticMarkup(createElement(SiteHeaderBar, { brand: logo }));
    expect(empty).toContain('href="/cart"');
    expect(empty).toContain('href="/quote"');
    expect(empty).toContain(">Your Cart<");
    expect(empty).toContain(">Your Quote<");
    expect(empty).not.toContain('class="anchored-header__cart-count"');
    expect(empty).not.toContain('class="anchored-header__quote-count"');
    // The one gold control in the header stays the office's phone line.
    expect(contact.phoneHref.length).toBeGreaterThan(0);
  });

  it("places the skip link before the header and targets the main content", async () => {
    const { logo } = await chrome();
    const html = renderToStaticMarkup(createElement(SiteHeaderBar, { brand: logo }));
    const skip = html.indexOf('class="anchored-skip"');
    const header = html.indexOf("<header");
    expect(skip).toBeGreaterThanOrEqual(0);
    expect(skip).toBeLessThan(header);
    expect(html).toContain('href="#main"');
  });
});

describe("the phone action bar", () => {
  it("renders Call 24/7, Get help and Explore more as its three big targets, dialog closed", async () => {
    const { contact } = await chrome();
    const html = renderToStaticMarkup(createElement(PhoneActionBar, { contact }));
    expect(html).toContain('class="anchored-phonebar"');
    expect(html).toContain(`href="${contact.phoneHref}"`);
    expect(html).toContain("Call 24/7");
    expect(html).toContain("Get help");
    // The bottom bar's help door now opens the human contact form: its old
    // /immediate-assistance target was removed (office, inbox 040).
    expect(html).toContain('anchored-phonebar__btn--help" href="/contact"');
    // Blog is a top-level target on the bar itself (office, 2026-09-29), not
    // only inside the Explore more sheet — and with the header's upper row
    // hidden on a phone it is one of the reachability paths for it (inbox 035).
    expect(html).toContain('anchored-phonebar__btn--blog" href="/blog"');
    expect(html).toContain(">Blog</a>");
    expect(html).toContain("Explore more");
    expect(html).not.toContain("Plan ahead");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
    // The sheet is not in the DOM until the target is used.
    expect(html).not.toContain('role="dialog"');
  });
});
