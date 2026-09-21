import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CartProvider } from "@/lib/cart/cart-context";
import {
  listLandingContent,
  saveLandingContent,
  type LandingContent,
} from "@/lib/api-client/landing";
import { SiteHeaderBar } from "@/components/landing/site-header";
import { LandingFooter } from "@/components/landing/landing-view";
import { POINTS_OF_INTEREST } from "@/lib/park-3d/masterplan";
import { CHAPEL_NOTES, CHAPEL_RATES, php } from "@/lib/villa-pricing";
import {
  CHAPEL_HALL_PEDESTALS_IMAGE,
  CHAPEL_SAMPLE_NOTE,
  PARK_PLACE_PHOTOS,
  VILLA_PARK_AERIAL,
  WAKESETUP_ALCOVE_IMAGE,
  libraryThumb,
} from "@/lib/media";

/**
 * The Facilities page (screen inventory P25) — the park's rooms and grounds.
 *
 * What these tests exist to protect:
 *  · the rooms are SHOWN (the client's own photograph, what each suits, the
 *    per-day rate) rather than described;
 *  · every figure is READ — the page's per-day rates must be the same numbers
 *    /services publishes, so the two can never drift (the defect this suite
 *    exists to catch is a typed amount);
 *  · the honest states stay honest: the park's real chapel names and capacity
 *    are an open client question, so the page must say so and must invent no
 *    room name and no capacity figure;
 *  · the sample photography keeps the client sheet's own illustration label;
 *  · the 24/7 number is the staff-editable content, never typed here;
 *  · the map and 3D walk-through are linked, not duplicated.
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
  return renderToStaticMarkup(await FacilitiesPage());
}

async function renderServices(): Promise<string> {
  return renderToStaticMarkup(createElement(CartProvider, null, await ServicesPage()));
}

/** The per-day amounts a page prints, in document order. */
function perDayAmounts(html: string, block: RegExp): string[] {
  return [...html.matchAll(block)].map((m) => (/₱[\d,]+/.exec(m[1]) ?? [""])[0]);
}

describe("/facilities shows the rooms a family is choosing between", () => {
  it("renders one card per chapel class with the client's sample photograph", async () => {
    const html = await renderFacilities();

    expect((html.match(/class="story-room"/g) ?? []).length).toBe(2);
    expect(html).toContain("Common chapel");
    expect(html).toContain("Private chapel");
    // 2026-09-19: the two classes show the client's OWN 2026 photographs — the
    // chapel hall for the common class, a decorated viewing room for the private
    // one. Both keep the sheet's illustration label (the office confirms the
    // room), and both alts name whose photograph it is.
    expect(html).toContain(CHAPEL_HALL_PEDESTALS_IMAGE);
    expect(html).toContain(WAKESETUP_ALCOVE_IMAGE);
    expect((html.match(new RegExp(escapeRe(CHAPEL_SAMPLE_NOTE), "g")) ?? []).length).toBe(2);
    expect((html.match(/alt="(The chapel hall in the client|A decorated private viewing room in the client)/g) ?? []).length).toBe(2);
  });

  it("publishes the sheet's per-day rate for each room, with its unit", async () => {
    const html = await renderFacilities();

    expect(html).toContain(php(CHAPEL_RATES[0].common.ratePerDay));
    expect(html).toContain(php(CHAPEL_RATES[0].private.ratePerDay));
    expect((html.match(/class="story-room__unit">per day</g) ?? []).length).toBe(2);
  });

  it("reads the same figures /services publishes — the two pages cannot drift", async () => {
    const [facilities, services] = await Promise.all([renderFacilities(), renderServices()]);

    const onFacilities = perDayAmounts(facilities, /class="story-room__rate">([\s\S]*?)<\/p>/g);
    const onServices = perDayAmounts(services, /class="story-chapel__rate">([\s\S]*?)<\/p>/g);

    expect(onFacilities).toHaveLength(2);
    expect(onFacilities).toEqual(onServices);
    // …and /services links here for the rooms, so the pair stays one story.
    expect(services).toContain('href="/facilities#rooms"');
  });

  it("gives every room the one next step: ask the office", async () => {
    const { contact } = await listLandingContent();
    const html = await renderFacilities();

    expect((html.match(/class="btn btn--primary story-room__action"/g) ?? []).length).toBe(2);
    // Two identical-visible call buttons would be ambiguous to a screen reader:
    // the visually hidden span names the room first.
    expect(html).toContain("Ask about the Common chapel:");
    expect(html).toContain("Ask about the Private chapel:");
    expect((html.match(new RegExp(escapeRe(`Call ${contact.phoneDisplay}`), "g")) ?? []).length)
      .toBeGreaterThanOrEqual(2);
  });

  it("keeps the sheet's own conditions as facts, not prose", async () => {
    const html = await renderFacilities();

    for (const note of [
      CHAPEL_NOTES.scope,
      CHAPEL_NOTES.miscFee,
      CHAPEL_NOTES.privateChapelOnly,
    ]) {
      expect(html).toContain(`class="story-area">${note}</li>`);
    }
  });
});

describe("/facilities is honest about what the client has not answered", () => {
  it("says the real room list is unconfirmed, in one line", async () => {
    const html = await renderFacilities();

    expect(html).toContain('class="fac-placeholder"');
    expect(html).toContain("Room names and capacity are still unconfirmed");
    expect(html).toContain("the client has not sent the park\u2019s real chapel list");
  });

  it("invents no room name, no capacity and no chapel count", async () => {
    const html = await renderFacilities();

    // The placeholder resource names /services sells ("Chapel A"/"Chapel B")
    // and the old page's invented capacities (120/60 people) must not appear.
    expect(html).not.toContain("Chapel A");
    expect(html).not.toContain("Chapel B");
    expect(html).not.toMatch(/\d+\s*people/i);
    expect(html).not.toMatch(/fits about/i);
    // No chapel COUNT either, before or after the word: the client has not
    // confirmed how many chapels the park has.
    expect(html).not.toMatch(/\b(two|three|four|2|3|4)\s+chapels\b/i);
    expect(html).not.toMatch(/\bchapels\b[^<]{0,24}\b(one|two|three|1|2|3)\b/i);
  });
});

describe("/facilities shows the grounds without re-drawing the map", () => {
  it("names the areas in the client masterplan's own words", async () => {
    const html = await renderFacilities();

    const areas = POINTS_OF_INTEREST.filter((p) => p.id !== "future-development");
    expect(areas.length).toBeGreaterThanOrEqual(4);
    for (const area of areas) {
      expect(html, area.label).toContain(`<li class="story-area">${area.label}</li>`);
    }
  });

  it("uses the client's park imagery and links to the map, the 3D view and the lots", async () => {
    const html = await renderFacilities();

    // Both park photographs are served from their sized derivatives, not the
    // print-sized uploads (the pavilion composite is 185 KB for a 34rem figure).
    expect(html).toContain(libraryThumb(VILLA_PARK_AERIAL, 640));
    expect(html).not.toContain(`src="${VILLA_PARK_AERIAL}"`);
    // The two ground types show the client's own photograph of the place — as
    // PHOTOGRAPH-ONLY derivatives of the client's lot tiles, not the tiles
    // themselves (composition pass, 2026-09-18: a tile carries the group logo and
    // the family name set large, so publishing it inside a captioned figure
    // printed a second title in baked-in marketing type). Same source asset,
    // documented crop: scripts/build-composition-images.mjs.
    expect(html).toContain(PARK_PLACE_PHOTOS.niches);
    expect(html).toContain(PARK_PLACE_PHOTOS.mausoleum);
    expect(html).not.toContain("/media/lot-garden-niches.png");
    expect(html).not.toContain("/media/lot-mausoleum.png");
    // The photograph is served at the layout's own 1×/2× widths.
    expect(html).toContain(PARK_PLACE_PHOTOS.niches.replace("-720", "-480"));
    expect(html).toContain("480w");
    expect(html).toContain("The pavilion and the grounds");
    // The map + 3D park stay on /map; the page links out instead of embedding
    // a second masterplan or plot list.
    expect(html).toContain('href="/map"');
    expect(html).toContain("Open the park map");
    expect(html).toContain("3D");
    expect(html).toContain('href="/lots"');
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
    // Hero, both room cards and the closing band.
    expect(telLinks.length).toBeGreaterThanOrEqual(4);
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
  it("is linked from the public bar and the footer", async () => {
    const { logo, contact } = await listLandingContent();
    const chrome = [
      renderToStaticMarkup(createElement(SiteHeaderBar, { brand: logo, contact, currentPath: "/facilities" })),
      renderToStaticMarkup(createElement(LandingFooter, { content: await listLandingContent() })),
    ];
    for (const html of chrome) {
      expect(html).toContain('href="/facilities"');
    }
    // Facilities now lives in the grouped "Explore more" menu, so it is still
    // linked from the public bar (the footer keeps its own entry); the
    // top-level chips no longer carry it.
    const nav = chrome[0].slice(
      chrome[0].indexOf('class="anchored-header__nav"'),
      chrome[0].indexOf("</nav>"),
    );
    const topLevel = nav.slice(0, nav.indexOf("anchored-header__explore"));
    expect(topLevel).not.toContain('href="/facilities"');
    expect(chrome[0]).toContain('class="anchored-header__explore-menu"');
    expect(chrome[0]).toContain('href="/facilities" aria-current="page"><strong>Facilities</strong>');
    // The trigger is marked current while a grouped page is open.
    expect(chrome[0]).toContain('data-anchored-explore-trigger="true" aria-current="true"');
  });

  it("renders one h1 and keeps every visual decision in tokens", async () => {
    const html = await renderFacilities();

    expect(html.match(/<h1\b/g) ?? []).toHaveLength(1);
    // No inline styles on this page: colour, size and space come from the
    // token-driven classes in styles/components.css.
    expect(html).not.toContain('style="');
    expect(html).toContain('class="public-hero__eyebrow"');
    expect(html).toContain('class="story-room"');
  });
});

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
