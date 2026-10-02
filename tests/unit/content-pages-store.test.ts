import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api-client/api-error";
import {
  getPageDocument,
  listPageDocuments,
  savePageDocument,
  seedPageDocuments,
} from "@/lib/api-client/content-pages";
import { PAGE_DOCUMENTS } from "@/lib/content-catalog";

/**
 * The content-pages store (Phase 0+1): the five documents, the seed-then-save
 * seam, the home composition from the landing document, and the server veto on
 * price bindings that do not resolve.
 */

function parked() {
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
      { id: "tab-view", label: "Map", href: "/map", note: null },
      { id: "tab-lots", label: "Lots", href: "/map?tab=lots", note: null },
    ],
    blocks: [],
    entries: [],
  };
}

describe("the page-document store", () => {
  it("serves every document in the approved order", async () => {
    const documents = await listPageDocuments();
    expect(documents.map((doc) => doc.key)).toEqual(PAGE_DOCUMENTS.map((def) => def.key));
    expect(documents.map((doc) => doc.title)).toEqual([
      "Home",
      "Villa Memorial Park",
      "Funeraria Memorial Services",
      "Villa Memorial Plan",
      "Coffins & caskets",
      "Blog",
      "Contact",
      "Memorials",
      "Builder",
      "Facilities",
      "Gallery",
      "Price list",
      "Login",
    ]);
  });

  it("composes Home from the landing document, never a second copy", async () => {
    const home = await getPageDocument("home");
    expect(home?.key).toBe("home");
    expect(home?.hero.headline.length).toBeGreaterThan(0);
  });

  it("reads the recorded park seed with its two tabs", async () => {
    const park = await getPageDocument("park");
    expect(park?.hero.headline).toBe("Villa Memorial Park");
    expect(park?.tabs.map((tab) => tab.label)).toEqual(["Map", "Lots"]);
  });

  it("saves an edit and serves it to the next read", async () => {
    await savePageDocument("park", { ...parked(), hero: { ...parked().hero, headline: "The park, revised" } }, "user-1");
    const park = await getPageDocument("park");
    expect(park?.hero.headline).toBe("The park, revised");
    expect(park?.updated_at).not.toBeNull();
    expect(park?.updated_by).toBe("user-1");
  });

  it("rejects a price block that names a SKU the catalogue does not carry", async () => {
    await expect(
      savePageDocument(
        "park",
        {
          ...parked(),
          blocks: [{ id: "b1", type: "priceTable", heading: "Prices", binding: { kind: "sku", sku: "NOT-A-SKU" }, note: null }],
        },
        "user-1",
      ),
    ).rejects.toBeInstanceOf(ApiError);
    // The refused save wrote nothing.
    const park = await getPageDocument("park");
    expect(park?.blocks).toHaveLength(0);
  });

  it("never stores the home document through this seam", async () => {
    await expect(savePageDocument("home", { ...parked(), key: "home" })).rejects.toBeInstanceOf(ApiError);
  });

  it("keeps the seed untouched by saves", async () => {
    const before = seedPageDocuments().find((doc) => doc.key === "park")?.hero.headline;
    await savePageDocument("park", { ...parked(), hero: { ...parked().hero, headline: "Edited" } });
    const after = seedPageDocuments().find((doc) => doc.key === "park")?.hero.headline;
    expect(before).toBe(after);
  });

  it("returns null for a key that is none of the five pages", async () => {
    expect(await getPageDocument("store")).toBeNull();
  });
});
