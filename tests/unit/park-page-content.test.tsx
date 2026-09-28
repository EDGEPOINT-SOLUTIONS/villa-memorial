import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PublicMapPage from "@/app/(public)/map/page";
import { getPageDocument, savePageDocument } from "@/lib/api-client/content-pages";

/**
 * The park page's content catalogue wiring (Phase 1):
 *
 *   · the hero comes from the "Villa Memorial Park" page document, so a save in
 *     Pages & content is what the next visitor reads;
 *   · the lots listing is a TAB of the page (and the /lots route still exists);
 *   · the page's content blocks render under the tabs;
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
      lead: "Walk the grounds.",
      image: null,
      background: null,
      backgroundTransparency: 100,
    },
    tabs: [
      { id: "tab-view", label: "Park view", href: "/map", note: null },
      { id: "tab-lots", label: "Lots", href: "/map?tab=lots", note: null },
    ],
    blocks: [],
    entries: [],
  };
}

describe("the park page", () => {
  it("opens on the tabs and the map, with the page named by a hidden h1", async () => {
    const html = renderToStaticMarkup(await page());
    // The opening hero band was removed (2026-09-28): the map leads.
    expect(html).not.toContain("Interactive park map");
    expect(html).not.toContain("deep-link any plot");
    expect(html).not.toContain("Browse all plots");
    // The route keeps exactly one h1 — visually hidden — so it is still named.
    expect(html).toContain('class="visually-hidden">Villa Memorial Park</h1>');
    expect(html.match(/<h1/g) ?? []).toHaveLength(1);
    expect(html).toContain("Park view");
    expect(html).toContain("Lots");
    expect(html).toContain("map-shell");
  });

  it("shows the Lots listing inside the Lots tab", async () => {
    const html = renderToStaticMarkup(await page({ tab: "lots" }));
    expect(html).toContain("Refine lots by");
    expect(html).not.toContain("map-shell");
  });

  it("no longer renders the saved hero — the band was removed", async () => {
    await savePageDocument("park", {
      ...parkSeed(),
      hero: { ...(parkSeed().hero as Record<string, unknown>), headline: "The park, revised" },
    });
    const html = renderToStaticMarkup(await page());
    expect(html).not.toContain("The park, revised");
  });

  it("renders the page document's content blocks under the tabs", async () => {
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
