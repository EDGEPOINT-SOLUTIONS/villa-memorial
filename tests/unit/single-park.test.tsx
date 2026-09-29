import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PublicMapPage from "@/app/(public)/map/page";
import MapPage from "@/app/(public)/map/page";
import { DEMO_TENANTS } from "@/lib/demo-tenants";
import { parksList } from "@/lib/park-maps";

/**
 * ONE PARK (captain, 2026-09-21): "remove this Loyola Gardens / Golden Haven in
 * our parkmap it should only be Villa Memorial Park".
 *
 * The park store, the map surfaces and the lots listing carry Villa Memorial
 * Park alone. These tests pin that at the two layers a stale demo record would
 * reappear through:
 *
 *   1. the store/list a surface reads (`parksList`, `DEMO_TENANTS`) — exactly
 *      one park, id `villa`;
 *   2. the rendered public pages — no other-park band, chip or switcher, and a
 *      `?park=loyola` deep link degrades to the Villa map instead of breaking.
 *
 * The lot-lifecycle fixture's exhumation `destination` ("Loyola Gardens") is
 * deliberately NOT covered: it is an external receiving place a family names,
 * not one of this product's parks — see its provenance and
 * tests/fixture-contract/lot-lifecycle.test.ts.
 */
describe("the product carries Villa Memorial Park alone", () => {
  it("seeds one park, and it is villa", () => {
    const parks = parksList();
    expect(parks.map((park) => park.id)).toEqual(["villa"]);
    expect(parks[0]?.name).toBe("Villa Memorial");
  });

  it("keeps one demo tenant — the switcher has nothing to switch", () => {
    expect(DEMO_TENANTS.map((tenant) => tenant.id)).toEqual(["villa"]);
    expect(DEMO_TENANTS[0]?.name).toBe("Villa Memorial");
  });

  it("renders no other-park chip or switcher on /map, and degrades an old deep link", async () => {
    const html = renderToStaticMarkup(
      await PublicMapPage({ searchParams: Promise.resolve({ park: "loyola", plot: "LG-01" }) }),
    );
    expect(html).toContain("Villa Memorial Park");
    expect(html).toContain("map-shell");
    // The switcher only appears for a multi-park store.
    expect(html).not.toContain("Choose park map");
    expect(html).not.toContain("Loyola Gardens");
    expect(html).not.toContain("Golden Haven");
  });

  it("renders one band, named Villa Memorial, on /lots", async () => {
    const html = renderToStaticMarkup(
      await MapPage({ searchParams: Promise.resolve({ tab: "lots" }) }),
    );
    expect(html.match(/class="cat-band"/g) ?? []).toHaveLength(1);
    expect(html).toContain('aria-label="Villa Memorial"');
    // The one-option Park refine group is gone with the other parks.
    expect(html).not.toContain('refine-group__label">Park<');
    expect(html).not.toContain("Loyola Gardens");
    expect(html).not.toContain("Golden Haven");
  });
});
