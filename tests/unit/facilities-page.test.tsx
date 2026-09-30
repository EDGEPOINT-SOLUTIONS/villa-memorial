import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuoteBasketProvider } from "@/lib/quote-basket/quote-basket-context";
import { CartProvider } from "@/lib/cart/cart-context";
import {
  listLandingContent,
  saveLandingContent,
  type LandingContent,
} from "@/lib/api-client/landing";
import { getChapelSchedule } from "@/lib/api-client/chapel-reservations";
import { SiteHeaderBar } from "@/components/landing/site-header";
import { LandingFooter } from "@/components/landing/landing-view";
import { POINTS_OF_INTEREST } from "@/lib/park-3d/masterplan";
import { CHAPEL_RATES, php } from "@/lib/villa-pricing";
import { CHAPEL_CLASS_LABEL } from "@/lib/chapel-booking";
import { CHAPEL_SAMPLE_NOTE } from "@/lib/media";

/** The public shell provides BOTH baskets; render inside both the way the app does. */
function withBaskets(node: React.ReactNode) {
  return createElement(
    CartProvider,
    null,
    createElement(QuoteBasketProvider, null, node),
  );
}

/**
 * The Facilities page (screen inventory P25) — the park's rooms and grounds.
 *
 * These tests protect the APPROVED redesign (2026-09-30) and the honesty rules
 * the old page carried:
 *  · the rooms are SHOWN as a comparison — the client's own photograph, the
 *    room's own record (name · capacity), what each is shared with, and the
 *    client's one-line copy — so a family can decide between them;
 *  · every figure is READ, never typed: the names and capacities are the park's
 *    OWN schedule record (`getChapelSchedule()`), the same record /services and
 *    the home publish; the room copy is the shared page-document copy; the stay
 *    span is the 2026 sheet's own rows;
 *  · the honesty rule survives the decision to publish capacity: the band says,
 *    in ONE plain line, that the names and capacity come from the schedule
 *    record — it never dresses a placeholder seed as confirmed client fact;
 *  · no amount is ever published (`₱` absent): every room is Request-for-Quote;
 *  · the sample photography keeps the client sheet's own illustration label;
 *  · the grounds are the client masterplan's own areas, with the client's own
 *    photographs, and the map + 3D view are linked, not duplicated;
 *  · the 24/7 number is the staff-editable content, never typed here.
 */

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

const { default: FacilitiesPage } = await import("@/app/(public)/facilities/page");
const { default: ServicesPage } = await import("@/app/(public)/services/page");

async function renderFacilities(): Promise<string> {
  return renderToStaticMarkup(withBaskets(await FacilitiesPage()));
}

async function renderServices(): Promise<string> {
  return renderToStaticMarkup(withBaskets(await ServicesPage()));
}

describe("/facilities compares the two rooms a family is choosing between", () => {
  it("renders one column per chapel class, headed by the client's own photograph", async () => {
    const html = await renderFacilities();

    // Two comparison columns, one per class the park sells.
    expect((html.match(/class="fac-room"/g) ?? []).length).toBe(2);
    expect(html).toContain(CHAPEL_CLASS_LABEL.common);
    expect(html).toContain(CHAPEL_CLASS_LABEL.private);
    // The client's OWN 2026 photographs: the chapel hall for the common class,
    // a decorated viewing room for the private one.
    expect(html).toContain("/media/client/chapel-hall-candle-pedestals-wide-1600.webp");
    expect(html).toContain("/media/client/wake-setup-lamp-alcove-wide-960.webp");
    expect((html.match(/alt="(The chapel hall in the client|A decorated private viewing room in the client)/g) ?? []).length).toBe(2);
  });

  it("publishes the park's OWN schedule record — the same names and capacity /services shows", async () => {
    const schedule = await getChapelSchedule();
    const html = await renderFacilities();

    expect(schedule.chapels.length).toBeGreaterThan(0);
    for (const chapel of schedule.chapels) {
      expect(html, chapel.name).toContain(chapel.name);
      expect(html, `${chapel.name} capacity`).toContain(`${chapel.capacity} people`);
    }
    // The facts a family weighs are side by side: capacity, stay and who shares.
    expect(html).toContain("Fits about");
    expect(html).toContain("Who shares it");
    expect(html).toContain("Other families");
    expect(html).toContain("Your family only");
  });

  it("states the record's provenance in ONE plain line, and never dresses it as confirmed", async () => {
    const html = await renderFacilities();
    expect(html).toContain("Room names and capacity come from the park");
    expect(html).not.toContain("still unconfirmed");
  });

  it("publishes no per-day rate — each room requests a quote instead", async () => {
    const html = await renderFacilities();

    expect(html).not.toContain(php(CHAPEL_RATES[0].common.ratePerDay));
    expect(html).not.toContain(php(CHAPEL_RATES[0].private.ratePerDay));
    expect(html).not.toMatch(/₱/);
  });

  it("keeps /services and /facilities consistent: neither publishes a service rate", async () => {
    const [facilities, services] = await Promise.all([renderFacilities(), renderServices()]);

    expect(facilities).not.toMatch(/₱/);
    expect(services).not.toMatch(/₱/);
    // …and /services still links here for the rooms, so the pair stays one story.
    expect(services).toContain('href="/facilities#rooms"');
  });

  it("gives every room the same next step: ask the office for dates and a quote", async () => {
    const { contact } = await listLandingContent();
    const html = await renderFacilities();

    // One booking-step action and one call per room (captain D5-A): the button
    // opens the real booking dialog and its accessible name names the room, so
    // two identical-visible actions stay unambiguous.
    expect((html.match(/>Ask for dates</g) ?? []).length).toBe(2);
    expect((html.match(/aria-label="Ask for dates: /g) ?? []).length).toBe(2);
    expect(html).not.toContain('aria-label="Add to Quote: Chapel use');
    expect(html).not.toContain('href="/quote?');
    expect((html.match(new RegExp(escapeRe(`Call ${contact.phoneDisplay}`), "g")) ?? []).length)
      .toBeGreaterThanOrEqual(2);
  });

  it("keeps the sheet's illustration discipline in ONE shared foot", async () => {
    const html = await renderFacilities();
    // The sample note is printed ONCE for the band, not once per card.
    expect((html.match(new RegExp(escapeRe(CHAPEL_SAMPLE_NOTE), "g")) ?? []).length).toBe(1);
    expect(html).toContain("the office confirms availability and the price");
  });
});

describe("/facilities shows the grounds as the client's own places", () => {
  it("names the areas in the client masterplan's own words, as a keyboard tablist", async () => {
    const html = await renderFacilities();

    const areas = POINTS_OF_INTEREST.filter((p) => p.id !== "future-development");
    expect(areas.length).toBeGreaterThanOrEqual(4);
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tabpanel"');
    for (const area of areas) {
      expect(html, area.label).toContain(`>${area.label}</button>`);
    }
  });

  it("uses the client's own place photographs and links to the map, the 3D view and the lots", async () => {
    const html = await renderFacilities();

    // The atlas stage shows the client's own photograph of the selected place,
    // served from its sized derivative, never a marketing tile.
    expect(html).toContain("/media/gallery/park-gate-1024.webp");
    expect(html).toContain("/media/gallery/park-gate-640.webp 640w");
    expect(html).not.toContain("/media/lot-garden-niches.png");
    expect(html).not.toContain("/media/lot-mausoleum.png");
    // The map + 3D park stay on /map; the page links out instead of embedding
    // a second masterplan or plot list.
    expect(html).toContain('href="/map"');
    expect(html).toContain("Open the park map");
    expect(html).toContain("3D");
    expect(html).toContain('href="/map?tab=lots"');
    expect(html).toContain("Browse lots");
    expect(html).not.toContain("Park map.png");
  });
});

describe("/facilities reads the staff-editable 24/7 line", () => {
  it("takes the display text and href from the landing content document", async () => {
    const { contact } = await listLandingContent();
    const html = await renderFacilities();

    const telLinks = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].filter(
      (m) => m[1].startsWith("tel:"),
    );
    // The gateway and the two rooms (the page closing band is gone; the shell
    // owns the final call).
    expect(telLinks.length).toBeGreaterThanOrEqual(3);
    for (const [, href] of telLinks) {
      expect(href).toBe(contact.phoneHref);
    }
    for (const [, , inner] of telLinks) {
      expect(inner.replace(/&#x27;|&#39;/g, "'")).toContain(contact.phoneDisplay);
    }
  });

  it("a staff edit to the number reaches the page, and the recorded seed returns", async () => {
    const seed = await listLandingContent();
    const edited: LandingContent = JSON.parse(JSON.stringify(seed));
    edited.contact.phoneDisplay = "0999 333 4444";
    edited.contact.phoneHref = "tel:+639993334444";
    await saveLandingContent(edited);

    const html = await renderFacilities();
    expect(html).toContain("0999 333 4444");
    expect(html).toContain('href="tel:+639993334444"');
    expect(html).not.toContain(seed.contact.phoneDisplay);

    await saveLandingContent(seed);
    expect(await renderFacilities()).not.toContain("0999 333 4444");
  });
});

describe("/facilities is reachable from the public chrome and stays one page", () => {
  it("stays reachable from the public bar's Explore more menu", async () => {
    const { logo } = await listLandingContent();
    const header = renderToStaticMarkup(
      createElement(SiteHeaderBar, { brand: logo, currentPath: "/facilities" }),
    );
    // Facilities left the footer's pruned columns (office, inbox 049) and the
    // top-level chips; the grouped "Explore more" menu is its door in the
    // public chrome, and every removed route stays live.
    const footer = renderToStaticMarkup(
      createElement(LandingFooter, { content: await listLandingContent() }),
    );
    expect(footer).not.toContain('href="/facilities"');
    expect(header).toContain('class="anchored-header__explore-menu"');
    expect(header).toContain('href="/facilities" aria-current="page"><strong>Facilities</strong>');
    // The top-level main-bar chips do not carry it (search the MAIN nav, whose
    // closing tag must be looked up after its start — the utility row's nav
    // comes first in the document).
    const navStart = header.indexOf('class="anchored-header__nav"');
    const topLevel = header.slice(navStart, header.indexOf("</nav>", navStart));
    expect(topLevel).not.toContain('href="/facilities"');
    // The trigger is marked current while a grouped page is open.
    expect(header).toContain('data-anchored-explore-trigger="true" aria-current="true"');
  });

  it("renders one h1 and keeps every visual decision in tokens", async () => {
    const html = await renderFacilities();

    expect(html.match(/<h1\b/g) ?? []).toHaveLength(1);
    // No inline styles on this page: colour, size and space come from the
    // token-driven classes in styles/components.css.
    expect(html).not.toContain('style="');
    expect(html).toContain('class="public-hero__eyebrow"');
    expect(html).toContain('class="fac-room"');
    // The band heads wear the home's grammar (35.2px w500, never bold).
    expect(html).toContain('class="home-band-head__title"');
  });
});

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
