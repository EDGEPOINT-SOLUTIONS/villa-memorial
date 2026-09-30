import { describe, expect, it } from "vitest";
import {
  catalogueEntryDefaults,
  isItemEntrySku,
  itemEntryGroup,
  itemEntryKind,
  itemEntryRoute,
  itemEntryTarget,
  itemEntryView,
  mergeItemEntry,
} from "@/lib/catalogue-content";
import type { CatalogueEntry } from "@/lib/content-catalog";

/**
 * The item-content model (content-catalogue Phase 4): which catalogue items carry
 * an editable page entry, how the entry's identity is derived from the live
 * catalogue record, and what the public detail page reads from it.
 */

const LUMINA = {
  id: 123,
  sku: "CSK-LUMINA",
  name: "Lumina casket",
  description: "The entry model of the Lumina collection.",
  image: null,
};

describe("which catalogue items carry a content entry", () => {
  it("covers the 24 casket models and the three packages", () => {
    expect(itemEntryKind("CSK-LUMINA")).toBe("casket");
    expect(itemEntryKind("CSK-WHITE-ROSE-FULL")).toBe("casket");
    expect(itemEntryKind("PKG-BASIC")).toBe("package");
    expect(isItemEntrySku("PKG-PREMIUM")).toBe(true);
  });

  it("leaves service lines and add-ons to their own screens", () => {
    expect(itemEntryKind("SRV-INTERMENT")).toBeNull();
    expect(itemEntryKind("SRV-EMBALM-3D")).toBeNull();
    expect(itemEntryKind("CHP-COMMON-DAY")).toBeNull();
    expect(isItemEntrySku("NOT-A-SKU")).toBe(false);
  });

  it("routes a casket to /products and a package to /plans", () => {
    expect(itemEntryRoute("CSK-LUMINA")).toBe("/products/CSK-LUMINA");
    expect(itemEntryRoute("PKG-BASIC")).toBe("/plans/packages");
  });
});

describe("catalogueEntryDefaults", () => {
  it("derives the identity from the record, never a second copy", () => {
    const entry = catalogueEntryDefaults(LUMINA);
    expect(entry.title).toBe(LUMINA.name);
    expect(entry.sku).toBe(LUMINA.sku);
    expect(entry.key).toBe(LUMINA.sku);
    expect(entry.kind).toBe("product");
    expect(entry.summary).toBe(LUMINA.description);
    // A casket's group is the collection the sheet files it in.
    expect(itemEntryGroup("CSK-LUMINA")).toBe("Lumina");
    // The price is a reference, never an amount.
    expect(entry.price).toEqual({ kind: "sku", sku: "CSK-LUMINA" });
    expect(entry.blocks).toEqual([]);
  });

  it("names the plan for a package entry", () => {
    const entry = catalogueEntryDefaults({
      id: 101,
      sku: "PKG-BASIC",
      name: "Basic Package",
      description: null,
      image: null,
    });
    expect(entry.group).toBe("Villa Memorial Plan");
  });
});

describe("mergeItemEntry", () => {
  it("keeps the catalogue identity even when a stored entry disagrees", () => {
    const defaults = catalogueEntryDefaults(LUMINA);
    const stored: CatalogueEntry = {
      ...defaults,
      title: "A name typed in the content editor",
      group: "A made-up group",
      summary: "A long description the office wrote.",
      blocks: [],
    };
    const merged = mergeItemEntry(defaults, stored);
    expect(merged.title).toBe("Lumina casket");
    expect(merged.group).toBe("Lumina");
    expect(merged.summary).toBe("A long description the office wrote.");
  });
});

describe("itemEntryTarget", () => {
  it("locks the identity to the catalogue record", () => {
    const target = itemEntryTarget(LUMINA);
    expect(target.key).toBe("CSK-LUMINA");
    expect(target.route).toBe("/products/CSK-LUMINA");
    expect(target.kindLabel).toBe("Casket entry");
    expect(target.identityLocked).toBe(true);
    expect(target.identityHref).toBe("/staff/catalog/123/edit");
  });
});

describe("itemEntryView", () => {
  it("prefers the authored description, then the catalogue description", () => {
    const entry = catalogueEntryDefaults(LUMINA);
    expect(itemEntryView(null, LUMINA).summary).toBe(LUMINA.description);
    expect(itemEntryView({ ...entry, summary: "" }, LUMINA).summary).toBe(LUMINA.description);
    expect(itemEntryView({ ...entry, summary: "Authored lead." }, LUMINA).summary).toBe("Authored lead.");
  });
});
