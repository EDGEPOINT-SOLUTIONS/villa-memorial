import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ApiError } from "@/lib/api-client/api-error";
import {
  getItemEntry,
  listItemEntries,
  saveItemEntry,
} from "@/lib/api-client/content-entries";
import { CONTENT_SPECS_COLUMNS_MAX } from "@/lib/content-catalog";

/**
 * The item-entry store (content-catalogue Phase 4 + the PDP fields pass): the
 * casket/package entries derive their identity from the live catalogue, keep the
 * authored half (summary · rich description · gallery · specs · blocks), refuse a
 * price binding the catalogue cannot resolve, and persist to the durable journal.
 *
 * Each test points CONTENT_ENTRIES_STORE_PATH at its own throwaway file, so one
 * test's save can never leak into the next (the store is durable now).
 */

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-content-entries-"));
  process.env.CONTENT_ENTRIES_STORE_PATH = path.join(dir, "entries.json");
});

const storePath = () => process.env.CONTENT_ENTRIES_STORE_PATH as string;

afterEach(async () => {
  delete process.env.CONTENT_ENTRIES_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

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

  it("derives the identity from the catalogue and starts without authored content", async () => {
    const entry = await getItemEntry("CSK-LUMINA");
    expect(entry?.sku).toBe("CSK-LUMINA");
    expect(entry?.title).toBe("Lumina casket");
    expect(entry?.blocks).toEqual([]);
    expect(entry?.description).toBeNull();
    expect(entry?.gallery).toEqual([]);
    expect(entry?.specs).toBeNull();
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

  it("saves the rich description, gallery and specs, and serves them next read", async () => {
    const seed = await getItemEntry("CSK-LUMINA");
    await saveItemEntry(
      "CSK-LUMINA",
      {
        ...seed,
        description: {
          nodes: [
            { type: "heading", level: 2, text: "About the Lumina" },
            { type: "paragraph", spans: [{ text: "A quiet, solid " }, { text: "hardwood", marks: ["bold"] }] },
            { type: "bulletList", items: [[{ text: "Half lid" }], [{ text: "Full lid" }]] },
          ],
        },
        gallery: [
          { id: "g1", src: "/media/client/lumina-card-440.webp", alt: "The Lumina coffin", caption: null, sample: false },
          { id: "g2", src: "/media/client/rose-wide-960.webp", alt: "A sample arrangement", caption: "Illustrative sample.", sample: true },
        ],
        specs: { columns: ["Material", "Finish"], rows: [["Metal", "White and gold"]] },
      },
      "editor@vm.demo",
    );

    const saved = await getItemEntry("CSK-LUMINA");
    expect(saved?.description?.nodes).toHaveLength(3);
    expect(saved?.gallery.map((image) => image.id)).toEqual(["g1", "g2"]);
    expect(saved?.specs?.rows).toEqual([["Metal", "White and gold"]]);
  });

  it("refuses a 16th spec column and a sample gallery photo with no caption", async () => {
    const seed = await getItemEntry("CSK-LUMINA");
    const columns = Array.from({ length: CONTENT_SPECS_COLUMNS_MAX + 1 }, (_, i) => `Header ${i + 1}`);
    await expect(
      saveItemEntry("CSK-LUMINA", { ...seed, specs: { columns, rows: [] } }, "editor@vm.demo"),
    ).rejects.toBeInstanceOf(ApiError);
    await expect(
      saveItemEntry(
        "CSK-LUMINA",
        {
          ...seed,
          gallery: [{ id: "s", src: "/media/client/lumina-card-440.webp", alt: "A sample", caption: null, sample: true }],
        },
        "editor@vm.demo",
      ),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("persists the saved entry to the durable journal", async () => {
    const seed = await getItemEntry("CSK-WHITE-ROSE-FULL");
    await saveItemEntry(
      "CSK-WHITE-ROSE-FULL",
      { ...seed, specs: { columns: ["Length"], rows: [["2.10 m"]] } },
      "editor@vm.demo",
    );
    const journal = await readFile(storePath(), "utf8");
    expect(journal).toContain("entry_saved");
    expect(journal).toContain("2.10 m");
    expect(journal).toContain("CSK-WHITE-ROSE-FULL");
  });

  it("fails honestly (500) when the journal on disk is corrupt", async () => {
    await writeFile(storePath(), "{ not json", "utf8");
    await expect(getItemEntry("CSK-LUMINA")).rejects.toBeInstanceOf(ApiError);
  });
});
