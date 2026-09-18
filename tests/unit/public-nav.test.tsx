import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PLAN_AHEAD_LINKS, SiteHeaderBar } from "@/components/landing/site-header";
import { PhoneActionBar } from "@/components/landing/phone-action-bar";
import { listLandingContent } from "@/lib/api-client/landing";

/**
 * The approved public-navigation contract (captain, 2026-09-17 — Lavish review
 * "Public navigation", reference under docs/08-delivery/public-nav-design):
 * the two-layer bar, the short page labels with the client's full names in the
 * grouped "Plan ahead" menu, the cart icon + count, and the permanent phone
 * action bar. Executed through react-dom/server like the rest of the repo's UI
 * tests; the interactive behaviour (scroll compression, disclosure, dialog) is
 * client-only and pinned structurally here.
 */
async function chrome() {
  return listLandingContent();
}

describe("the two-layer public bar", () => {
  it("renders the utility row with the client's real location and 24/7 number", async () => {
    const { logo, contact } = await chrome();
    const html = renderToStaticMarkup(createElement(SiteHeaderBar, { brand: logo, contact }));
    expect(html).toContain(contact.location);
    expect(html).toContain("every hour, every day");
    expect(html).toContain(`href="${contact.phoneHref}"`);
    expect(html).toContain(contact.phoneDisplay);
    expect(html).toContain(contact.phoneLabel);
    // The F-01 door to the Immediate Assistance screen (captain, 2026-09-18)
    // rides the same utility row, quieter than the call button.
    expect(html).toContain('class="anchored-header__assist"');
    expect(html).toContain('href="/immediate-assistance"');
    expect(html).toContain("Immediate assistance");
  });

  it("carries the short labels, marks only the current page and keeps full names in Plan ahead", async () => {
    const { logo, contact } = await chrome();
    const html = renderToStaticMarkup(
      createElement(SiteHeaderBar, { brand: logo, contact, currentPath: "/plans", cartCount: 2 }),
    );
    for (const [href, label] of [
      ["/", "Home"],
      ["/services", "Services"],
      ["/plans", "Plans"],
      ["/lots", "Lots"],
      ["/map", "Park"],
      ["/facilities", "Facilities"],
      ["/gallery", "Gallery"],
      ["/memorials", "Memorials"],
      ["/contact", "Contact"],
    ] as const) {
      const aria = href === "/plans" ? ' aria-current="page"' : "";
      expect(html).toContain(`href="${href}"${aria}>${label}</a>`);
    }
    // Active state stays on the current page only (one aria-current in the bar).
    expect(html).toContain('href="/plans" aria-current="page">Plans</a>');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    // The grouped menu: disclosure trigger, hidden menu, full names verbatim.
    expect(html).toContain('aria-haspopup="true"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('role="menu"');
    for (const item of PLAN_AHEAD_LINKS) {
      expect(html).toContain(item.title);
    }
  });

  it("renders the cart as an icon with its count, never a text link", async () => {
    const { logo, contact } = await chrome();
    const html = renderToStaticMarkup(
      createElement(SiteHeaderBar, { brand: logo, contact, cartCount: 3 }),
    );
    expect(html).toContain('class="anchored-header__cart"');
    expect(html).toContain('aria-label="Cart, 3 items"');
    expect(html).toContain('class="anchored-header__cart-count"');
    expect(html).not.toContain(">Cart</a>");
  });

  it("places the skip link before the header and targets the main content", async () => {
    const { logo, contact } = await chrome();
    const html = renderToStaticMarkup(createElement(SiteHeaderBar, { brand: logo, contact }));
    const skip = html.indexOf('class="anchored-skip"');
    const header = html.indexOf("<header");
    expect(skip).toBeGreaterThanOrEqual(0);
    expect(skip).toBeLessThan(header);
    expect(html).toContain('href="#main"');
  });
});

describe("the phone action bar", () => {
  it("renders Call 24/7, Get help and Plan ahead as its three big targets, dialog closed", async () => {
    const { contact } = await chrome();
    const html = renderToStaticMarkup(createElement(PhoneActionBar, { contact }));
    expect(html).toContain('class="anchored-phonebar"');
    expect(html).toContain(`href="${contact.phoneHref}"`);
    expect(html).toContain("Call 24/7");
    expect(html).toContain("Get help");
    // F-01: the bottom bar is the phone's one-tap door to the assistance page.
    expect(html).toContain('anchored-phonebar__btn--help" href="/immediate-assistance"');
    expect(html).toContain("Plan ahead");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
    // The sheet is not in the DOM until the target is used.
    expect(html).not.toContain('role="dialog"');
  });
});
