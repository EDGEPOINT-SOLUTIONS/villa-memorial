import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PublicMapPage from "@/app/(public)/map/page";
import { getPageDocument, savePageDocument } from "@/lib/api-client/content-pages";

/**
 * The park page's content catalogue wiring (Phase 1; opening rebuilt 2026-09-30):
 *
 *   · the page opens on the home's gateway grammar — a visible h1, one short
 *     lead and the two view actions **Map** / **Lots** (they replace the old
 *     pill tabs);
 *   · the hero words come from the "Villa Memorial Park" page document, so a save
 *     in Pages & content is what the next visitor reads;
 *   · the lots listing is a TAB of the page (and the /lots route still exists);
 *   · the page's content blocks render under the map;
 *   · the public page stays view-only (the existing public-map-view-only suite
 *     pins the map component; this pins the page's own output too).
 */

function page(searchParams: Record<string, string> = {}) {
  return PublicMapPage({ searchParams: Promise.resolve(searchParams) });
}

function parkSeed(): Record<string, unknown> {
  return {
    key: "park",
    title: "Villa Memorial Park",
    hero: {
      eyebrow: "Interactive park map",
      headline: "Villa Memorial Park",
      lead: "Every recorded plot, its status, and where it sits.",
      image: null,
      background: null,
      backgroundTransparency: 100,
    },
    tabs: [
      { id: "tab-view", label: "Map", href: "/map", note: null },
      { id: "tab-lots", label: "Lots", href: "/map?tab=lots", note: null },
    ],
    blocks: [],
    entries: [],
  };
}

describe("the park page", () => {
  it("opens on the gateway with the Map / Lots actions and a visible h1", async () => {
    const html = renderToStaticMarkup(await page());
    expect(html).toContain('data-public-hero="interior"');
    // The route keeps exactly one h1 — now visible, naming the page.
    expect(html.match(/<h1/g) ?? []).toHaveLength(1);
    expect(html).not.toContain('class="visually-hidden">Villa Memorial Park</h1>');
    expect(html).toContain("Villa Memorial Park");
    // The two view actions replace the old standalone pill tabs.
    expect(html).toContain('href="/map"');
    expect(html).toContain('href="/map?tab=lots"');
    expect(html).toContain(">Map</a>");
    expect(html).toContain(">Lots</a>");
    expect(html).not.toContain("park-tabs");
    // The map band head and the framed canvas lead the page.
    expect(html).toContain("home-band-head");
    expect(html).toContain("map-shell");
  });

  it("prints the recorded-plot counts, never a placeholder count", async () => {
    const html = renderToStaticMarkup(await page());
    // The count row is retired (captain, 2026-09-30); the page must still never
    // show a placeholder count anywhere.
    expect(html).not.toContain("16 recorded plots");
    expect(html).not.toContain("4 lot types");
    expect(html).not.toContain("10 available");
    // The generated placeholder inventory is gone from the page entirely.
    expect(html).not.toContain("placeholder");
  });

  it("shows the Lots listing inside the Lots tab", async () => {
    const html = renderToStaticMarkup(await page({ tab: "lots" }));
    expect(html).toContain("Refine lots by");
    expect(html).not.toContain("map-shell");
  });

  it("renders the saved hero words in the gateway", async () => {
    await savePageDocument("park", {
      ...parkSeed(),
      hero: { ...(parkSeed().hero as Record<string, unknown>), headline: "The park, revised" },
    });
    const html = renderToStaticMarkup(await page());
    expect(html).toContain("The park, revised");
  });

  it("renders the page document's content blocks under the map", async () => {
    await savePageDocument("park", {
      ...parkSeed(),
      blocks: [
        { id: "b1", type: "paragraph", heading: "Visiting the park", body: ["The gates open every day."] },
      ],
    });
    const html = renderToStaticMarkup(await page());
    expect(html).toContain("Visiting the park");
    expect(html).toContain("The gates open every day.");
  });

  it("keeps the park document readable after the save", async () => {
    const park = await getPageDocument("park");
    expect(park?.key).toBe("park");
  });
});
