import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import catalogFile from "@/lib/fixtures/commerce/catalog-items.json";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { catalogueItemPhoto, UNPHOTOGRAPHED_ITEM_NOTE } from "@/lib/catalogue-imagery";
import { COFFIN_SKUS } from "@/lib/catalogue-skus";
import { CASKET_MODEL_PHOTOS, casketModelPhotoId } from "@/lib/media";

/**
 * The catalogue's imagery contract (2026-09-19 imagery pass).
 *
 * The captain measured the old storefront and found the whole 42-item
 * catalogue rendering THREE images, the 24 casket models sharing five stock
 * photographs, and product thumbs at 88×66. `lib/catalogue-imagery.ts` is the
 * one rule home for "which photograph does this SKU show"; this suite pins what
 * that rule promises:
 *
 *   · every recorded catalogue item resolves to a published file (a missing
 *     file is a 404 image on a live page, not a design choice);
 *   · a photograph stands in for a model only when the card says so — the sample
 *     flag and its caption travel together, never one without the other;
 *   · a casket's photograph is the SAME photograph lib/media.ts's 24-row table
 *     chooses, so /products, /plans and /packages cannot drift;
 *   · a picture two items share is always a labelled sample — two products may
 *     never present one photograph as each one's own.
 */

const PUBLIC_DIR = path.join(process.cwd(), "public");
const fileOf = (src: string): string => path.join(PUBLIC_DIR, src.replace(/^\//, ""));
const srcSetFiles = (srcSet?: string): string[] =>
  srcSet
    ? srcSet
        .split(",")
        .map((part) => part.trim().split(/\s+/)[0])
        .filter(Boolean)
    : [];

describe("catalogue imagery — every item photographed, every sample labelled", () => {
  it("resolves all 42 recorded items to a published local file", async () => {
    const items = await listCatalogItems();
    expect(items.length).toBe(catalogFile.items.length);

    const unphotographed: string[] = [];
    for (const item of items) {
      const photo = catalogueItemPhoto(item.sku);
      if (!photo) {
        unphotographed.push(item.sku);
        continue;
      }
      expect(existsSync(fileOf(photo.src)), `${item.sku} src ${photo.src}`).toBe(true);
      for (const src of srcSetFiles(photo.srcSet)) {
        expect(existsSync(fileOf(src)), `${item.sku} srcSet ${src}`).toBe(true);
      }
    }
    // Today the client's material covers every recorded item; a new catalogue
    // line without a photograph is a deliberate act — add it here with its
    // "ask the office" note rather than letting the page render a wrong picture.
    expect(unphotographed, `no photograph for: ${unphotographed.join(", ")}`).toEqual([]);
  });

  it("pairs every sample flag with its caption (and never a flag without one)", async () => {
    for (const item of await listCatalogItems()) {
      const photo = catalogueItemPhoto(item.sku);
      if (!photo) continue;
      if (photo.sample) {
        expect(photo.caption, `${item.sku} is a sample with no caption`).toBeTruthy();
      }
      if (photo.caption) {
        expect(photo.sample, `${item.sku} carries a caption but no sample flag`).toBeTruthy();
      }
    }
  });

  it("follows lib/media.ts's 24-row model table for every casket SKU", () => {
    for (const { sku, model } of COFFIN_SKUS) {
      const photo = catalogueItemPhoto(sku);
      expect(photo, sku).toBeTruthy();
      expect(photo?.id, sku).toBe(casketModelPhotoId({ collection: "", model }));
    }
  });

  it("labels every photograph two items share as a sample", async () => {
    const bySrc = new Map<string, string[]>();
    for (const item of await listCatalogItems()) {
      const photo = catalogueItemPhoto(item.sku);
      if (!photo) continue;
      bySrc.set(photo.src, [...(bySrc.get(photo.src) ?? []), item.sku]);
    }
    const shared = [...bySrc.entries()].filter(([, skus]) => skus.length > 1);
    expect(shared.length, "the catalogue falls back to a handful of pictures").toBeGreaterThan(0);
    for (const [src, skus] of shared) {
      for (const sku of skus) {
        const photo = catalogueItemPhoto(sku);
        expect(photo?.sample, `${sku} shares ${src} without a sample flag`).toBeTruthy();
        expect(photo?.caption, `${sku} shares ${src} without a caption`).toBeTruthy();
      }
    }
  });

  it("spreads the 24 models over the client's photographs without hiding the sharing", () => {
    const spread = new Map<string, string[]>();
    for (const { model } of COFFIN_SKUS) {
      const id = casketModelPhotoId({ collection: "", model });
      spread.set(id, [...(spread.get(id) ?? []), model]);
    }
    const covered = [...spread.values()].reduce((n, models) => n + models.length, 0);
    expect(covered).toBe(COFFIN_SKUS.length);
    // One photograph never becomes "the catalogue": every picture stands for a
    // minority of the models, and each model's row names a real client photo.
    expect(spread.size).toBeGreaterThan(1);
    for (const [id, models] of spread) {
      expect(models.length, `${id} covers ${models.length} models`).toBeLessThanOrEqual(8);
      for (const model of models) expect(CASKET_MODEL_PHOTOS[model], model).toBe(id);
    }
  });

  it("keeps the honest fallback sentence pages print when nothing is photographed", () => {
    expect(UNPHOTOGRAPHED_ITEM_NOTE).toContain("no photograph");
    expect(UNPHOTOGRAPHED_ITEM_NOTE).toContain("Ask the office");
  });
});
