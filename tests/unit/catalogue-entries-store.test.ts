import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api-client/api-error";
import {
  getItemEntry,
  listItemEntries,
  saveItemEntry,
} from "@/lib/api-client/content-entries";

/**
 * The item-entry store (content-catalogue Phase 4): the casket/package entries
 * derive their identity from the live catalogue, keep only the authored half, and
 * refuse a price binding the catalogue cannot resolve.
 */

describe("the item-entry store", () => {
  it("serves an entry for every casket and package, in catalogue order", async () => {
    const entries = await listItemEntries();
    const keys = entries.map((entry) => entry.key);
    expect(keys).toContain("CSK-LUMINA");
    expect(keys).toContain("CSK-IMPERIAL-FLEXI");
    expect(keys).toContain("PKG-BASIC");
    expect(entries.every((entry) => entry.kind === "product")).toBe(true);
    // Service lines are not item entries.
    expect(keys).not.toContain("SRV-INTERMENT");
  });

  it("derives the identity from the catalogue and starts without authored blocks", async () => {
    const entry = await getItemEntry("CSK-LUMINA");
    expect(entry?.sku).toBe("CSK-LUMINA");
    expect(entry?.title).toBe("Lumina casket");
    expect(entry?.blocks).toEqual([]);
    expect(entry?.updated_at).toBeNull();
  });

  it("returns null for a SKU that is not a casket or package", async () => {
    expect(await getItemEntry("SRV-INTERMENT")).toBeNull();
    expect(await getItemEntry("NOT-A-SKU")).toBeNull();
  });

  it("saves an authored long description and blocks, and serves them next read", async () => {
    const seed = await getItemEntry("CSK-WHITE-ROSE-FULL");
    await saveItemEntry(
      "CSK-WHITE-ROSE-FULL",
      {
        ...seed,
        summary: "A long description the office wrote for the White Rose Full.",
        blocks: [
          {
            id: "dims",
            type: "table",
            heading: "Dimensions",
            caption: null,
            columns: ["Measurement", "Size"],
            rows: [["Length", "2.10 m"], ["Width", "0.75 m"]],
          },
        ],
      },
      "editor@vm.demo",
    );

    const saved = await getItemEntry("CSK-WHITE-ROSE-FULL");
    expect(saved?.summary).toContain("A long description the office wrote");
    expect(saved?.blocks).toHaveLength(1);
    expect(saved?.updated_by).toBe("editor@vm.demo");
    expect(saved?.updated_at).not.toBeNull();
    // The record's name still owns the title.
    expect(saved?.title).toBe("White Rose Full casket");
  });

  it("never lets the body rename a product or move a price", async () => {
    const seed = await getItemEntry("CSK-LUMINA");
    const saved = await saveItemEntry(
      "CSK-LUMINA",
      {
        ...seed,
        title: "A different casket",
        group: "A made-up group",
        price: { kind: "quoteOnly" },
      },
      "editor@vm.demo",
    );
    expect(saved.title).toBe("Lumina casket");
    expect(saved.group).toBe("Lumina");
    expect(saved.price).toEqual({ kind: "sku", sku: "CSK-LUMINA" });
  });

  it("refuses a price block naming a SKU the catalogue does not carry", async () => {
    const seed = await getItemEntry("CSK-LUMINA");
    await expect(
      saveItemEntry(
        "CSK-LUMINA",
        {
          ...seed,
          blocks: [
            {
              id: "bad",
              type: "priceTable",
              heading: "Prices",
              binding: { kind: "sku", sku: "GONE-1" },
              note: null,
            },
          ],
        },
        "editor@vm.demo",
      ),
    ).rejects.toBeInstanceOf(ApiError);
    // The refused save wrote nothing.
    expect((await getItemEntry("CSK-LUMINA"))?.blocks).toEqual([]);
  });

  it("refuses a SKU that is not a casket or package", async () => {
    await expect(saveItemEntry("SRV-INTERMENT", {})).rejects.toBeInstanceOf(ApiError);
  });
});
