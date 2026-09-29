import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EXPLORE_MORE_LINKS, SITE_NAV_LINKS, SiteHeaderBar } from "@/components/landing/site-header";
import { PhoneActionBar } from "@/components/landing/phone-action-bar";
import { listLandingContent } from "@/lib/api-client/landing";

/**
 * The approved public-navigation contract (captain, 2026-09-17 — Lavish review
 * "Public navigation", reference under docs/08-delivery/public-nav-design;
 * updated by the captain's 2026-09-21 direction: the utility row was removed
 * and the bar keeps the five top-level destinations plus the grouped "Explore
 * more" menu — Builder · Facilities · Gallery · Memorials · Price list): the
 * single-row bar, the cart icon + count, and the permanent phone action bar.
 * Executed through react-dom/server like the rest of the repo's UI tests; the
 * interactive behaviour (scroll compression, disclosure, dialog) is client-only
 * and pinned structurally here.
 */
async function chrome() {
  return listLandingContent();
}

describe("the public bar", () => {
  it("no longer carries a utility row — the 24/7 number lives elsewhere", async () => {
    const { logo } = await chrome();
    const html = renderToStaticMarkup(createElement(SiteHeaderBar, { brand: logo }));
    // The captain's 2026-09-21 cleanup: location, hours, Immediate assistance
    // and the call button are gone from the bar; the footer, /contact and
    // /immediate-assistance carry the number, and the phone action bar keeps
    // its own call target.
    expect(html).not.toContain("anchored-header__utility");
    expect(html).not.toContain("anchored-header__assist");
    expect(html).not.toContain("anchored-header__call");
    expect(html).not.toContain("every hour, every day");
  });

  it("carries the five top-level pages, marks only the current page and groups the rest under Explore more", async () => {
    const { logo } = await chrome();
    const html = renderToStaticMarkup(
      createElement(SiteHeaderBar, { brand: logo, currentPath: "/plans", quoteCount: 2 }),
    );
    // The captain's 2026-09-21 top-level bar, plus Blog (office, 2026-09-29):
    // six items, Home first, the full page names, Blog before Contact. Lots is
    // gone (it lives inside Villa Memorial Park).
    expect(SITE_NAV_LINKS.map((link) => [link.href, link.label])).toEqual([
      ["/", "Home"],
      ["/services", "Funeraria Memorial Services"],
      ["/plans", "Villa Memorial Plan"],
      ["/map", "Villa Memorial Park"],
      ["/blog", "Blog"],
      ["/contact", "Contact"],
    ]);
    for (const [href, label] of [
      ["/", "Home"],
      ["/services", "Funeraria Memorial Services"],
      ["/plans", "Villa Memorial Plan"],
      ["/map", "Villa Memorial Park"],
      ["/blog", "Blog"],
      ["/contact", "Contact"],
    ] as const) {
      const aria = href === "/plans" ? ' aria-current="page"' : "";
      expect(html).toContain(`href="${href}"${aria}>${label}</a>`);
    }
    // Active state stays on the current page only (one aria-current in the bar).
    expect(html).toContain('href="/plans" aria-current="page">Villa Memorial Plan</a>');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    // The removed standalone links leave the top-level bar entirely: the bar's
    // chips before the dropdown are only the six destinations, and the
    // secondary pages live inside the Explore more menu.
    const nav = html.slice(html.indexOf('class="anchored-header__nav"'), html.indexOf("</nav>"));
    const topLevel = nav.slice(0, nav.indexOf("anchored-header__explore"));
    expect(topLevel).not.toContain('href="/lots"');
    expect(topLevel).not.toContain('href="/builder"');
    expect(topLevel).not.toContain('href="/facilities"');
    expect(topLevel).not.toContain('href="/gallery"');
    expect(topLevel).not.toContain('href="/memorials"');
    expect(topLevel).not.toContain('href="/price-list"');
    // The grouped Explore more menu: disclosure trigger, hidden menu, exact
    // items. Blog LEFT it for the top-level row (office, 2026-09-29).
    expect(EXPLORE_MORE_LINKS.map((item) => [item.href, item.title])).toEqual([
      ["/builder", "Builder"],
      ["/facilities", "Facilities"],
      ["/gallery", "Gallery"],
      ["/memorials", "Memorials"],
      ["/price-list", "Price list"],
    ]);
    expect(html).toContain("Explore more");
    expect(html).not.toContain("Plan ahead");
    expect(html).toContain('aria-haspopup="true"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('role="menu"');
    for (const item of EXPLORE_MORE_LINKS) {
      expect(html).toContain(item.title);
      expect(html).toContain(item.note);
    }
  });

  it("renders a LABELLED quote action with its count, never a trolley icon", async () => {
    // The office's direction (2026-09-29): the trolley glyph was the one thing
    // on the page that still said "shop". The action now says what it is, stays
    // visible when the basket is empty, and wears sky/outline — never gold,
    // which is rationed to the office's phone number.
    const { logo, contact } = await chrome();
    const html = renderToStaticMarkup(
      createElement(SiteHeaderBar, { brand: logo, quoteCount: 3 }),
    );
    expect(html).toContain('class="anchored-header__quote"');
    expect(html).toContain('aria-label="Your quote, 3 lines"');
    expect(html).toContain(">Your quote<");
    expect(html).toContain('class="anchored-header__quote-count"');
    expect(html).toContain("3 lines in your quote");
    expect(html).not.toContain("shopping-cart");
    // Visible with no count too, so the page is findable before anything is added.
    const empty = renderToStaticMarkup(createElement(SiteHeaderBar, { brand: logo }));
    expect(empty).toContain('href="/quote"');
    expect(empty).toContain(">Your quote<");
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
    // F-01: the bottom bar is the phone's one-tap door to the assistance page.
    expect(html).toContain('anchored-phonebar__btn--help" href="/immediate-assistance"');
    // Blog is a top-level target on the bar itself (office, 2026-09-29), not
    // only inside the Explore more sheet.
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
