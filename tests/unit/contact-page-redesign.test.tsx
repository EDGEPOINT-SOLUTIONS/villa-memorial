import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuoteBasketProvider } from "@/lib/quote-basket/quote-basket-context";
import { CartProvider } from "@/lib/cart/cart-context";
import { parseCss, readStyle } from "../helpers/css-rules";

/**
 * The /contact redesign — the captain's Lavish plan (2026-09-30; approved on
 * the board: "implement this").
 *
 * The page's own rules, pinned here so a later edit cannot quietly undo them:
 *  · the opening is the services gateway — one h1 at the page-title step, with
 *    the 24/7 Call as the FIRST action (a person is one tap away on the first
 *    screen), and the captain's gold treatment on that call;
 *  · every band head is the home's `.home-band-head`, whose title is TeX Gyre
 *    Bonum 35.2px weight 500 — never bold (captain, 2026-09-30, inbox 003);
 *  · each published line is the band's FIGURE with one real Call action;
 *  · the visit band carries the gate photograph (whole, 16:9, sized) and a real
 *    Copy-address button;
 *  · the redundant "Back to home" band is gone.
 */

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/contact",
}));

const { default: ContactPage } = await import("@/app/(public)/contact/page");
const { listLandingContent } = await import("@/lib/api-client/landing");

function withBaskets(node: React.ReactNode) {
  return createElement(CartProvider, null, createElement(QuoteBasketProvider, null, node));
}

async function renderPage() {
  const { contact } = await listLandingContent();
  const html = renderToStaticMarkup(
    withBaskets(await ContactPage({ searchParams: Promise.resolve({}) })),
  );
  return { html, contact };
}

const RULES = parseCss(readStyle("styles/components.css"));

describe("the /contact reach line", () => {
  it("opens on the services gateway with one h1 and the call as the first action", async () => {
    const { html, contact } = await renderPage();
    expect((html.match(/<h1\b/g) ?? []).length).toBe(1);
    expect(html).toContain('class="public-hero__title"');
    // The call is the hero's first anchor, so it is the first thing a keyboard
    // or a thumb reaches.
    const actions = html.slice(html.indexOf('class="public-hero__actions"'));
    const firstAnchor = actions.slice(0, actions.indexOf("</a>"));
    expect(firstAnchor).toContain(`href="${contact.phoneHref}"`);
    expect(firstAnchor).toContain(`Call ${contact.phoneDisplay}`);
    // …and the message anchor is the support action.
    expect(actions).toContain('href="#contact-message"');
  });

  it("paints the opening call in the captain's gold, with dark ink", async () => {
    const rule = RULES.find(
      (r) => r.selector === ".contact-page .public-hero--interior .public-hero__actions .btn--primary",
    );
    expect(rule, "the gold call rule is missing").toBeDefined();
    expect(rule!.body).toMatch(/background\s*:\s*var\(--gold-400\)/);
    expect(rule!.body).toMatch(/color\s*:\s*var\(--ink-900\)/);
  });

  it("uses the home band-head grammar for every section title", async () => {
    const { html } = await renderPage();
    const heads = html.match(/class="home-band-head__title"/g) ?? [];
    expect(heads.length).toBeGreaterThanOrEqual(3);
    // The captain's type rule: display serif, --text-3xl (35.2px), weight 500.
    const title = RULES.find((r) => r.selector === ".home-band-head__title");
    expect(title?.body).toMatch(/font-family\s*:\s*var\(--font-display\)/);
    expect(title?.body).toMatch(/font-size\s*:\s*var\(--text-3xl\)/);
    expect(title?.body).toMatch(/font-weight\s*:\s*500/);
  });

  it("renders each published line as a figure with one real Call action", async () => {
    const { html, contact } = await renderPage();
    expect(html).toContain('class="contact-line__number"');
    expect(html).toContain(contact.phoneLabel);
    expect(html).toContain("Second line");
    expect(html).toContain(`Call ${contact.phoneDisplay}`);
    expect(html).toContain(`Call ${contact.secondPhoneDisplay}`);
    // Two Call actions in the ledger, both real tel: anchors.
    expect((html.match(/class="btn btn--accent home-call contact-line__action"/g) ?? []).length).toBe(1);
    expect((html.match(/class="btn btn--secondary contact-line__action"/g) ?? []).length).toBe(1);
  });

  it("puts the client's gate photograph, sized, in the visit band", async () => {
    const { html } = await renderPage();
    expect(html).toContain("data-location-block");
    expect(html).toContain('class="public-image public-image--interior-hero"');
    expect(html).toContain('src="/media/gallery/park-gate-1024.webp"');
    expect(html).toMatch(/width="\d+"/);
    expect(html).toMatch(/height="\d+"/);
    expect(html).toMatch(/sizes="/);
  });

  it("offers a real Copy-address button per recorded place", async () => {
    const { html } = await renderPage();
    expect((html.match(/Copy address/g) ?? []).length).toBeGreaterThanOrEqual(1);
    expect(html).toContain('type="button"');
  });

  it("drops the redundant Back-to-home band", async () => {
    const { html } = await renderPage();
    expect(html).not.toContain("story-back");
  });
});
