import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CLIENT_PHOTO_CARD_WIDTHS,
  CLIENT_PHOTO_WIDE_WIDTHS,
  CLIENT_PHOTOS,
  HELD_CLIENT_PHOTOS,
  clientPhoto,
  clientPhotoCard,
  clientPhotoNote,
  clientPhotoWide,
  type ClientPhotoId,
} from "@/lib/client-photos";
import { casketModelPhotoId, casketSamplePhoto } from "@/lib/media";
import { CASKET_MODELS, COFFIN_TIER_NOTE } from "@/lib/villa-pricing";

/**
 * The client's own 2026 photographs (imported 2026-09-19).
 *
 * The imagery pass's whole risk is honesty: a photograph silently published as
 * a model it is not, an original JPEG served where a derivative belongs, or a
 * crop upscaled past its own pixels. This file pins all three:
 *
 *  · provenance — every record's original is committed and its md5 is the one
 *    the record names (a swapped or re-encoded source fails here);
 *  · weight — every published derivative exists, is WebP, and is no wider than
 *    the crop it came from (scripts/build-client-photos.mjs never upscales);
 *  · honesty — the held photographs have no derivatives, the samples carry the
 *    illustration label and no alt text claims one of the sheet's model names.
 */

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const CLIENT_DIR = path.join(ROOT, "public", "media", "client");
// The originals are archived OUTSIDE public/: seven show identifiable mourners
// and must never be served, even by URL (see lib/client-photos.ts).
const ORIGINALS = path.join(ROOT, "media-sources", "client-photos");

const PUBLISHED = Object.values(CLIENT_PHOTOS) as ReadonlyArray<
  (typeof CLIENT_PHOTOS)[ClientPhotoId]
>;

const CARD_RATIO = 4 / 3;
const WIDE_RATIO = 3 / 2;

/** The real pixel size of a WebP file, parsed from its container header. */
function webpSize(file: string): { width: number; height: number } {
  const bytes = readFileSync(file);
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
    const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
    return { width, height };
  }
  if (chunk === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  // Lossy: the 14-bit dimensions sit after the 3-byte frame tag + start code.
  return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
}

function candidateFiles(variant: { src: string; srcSet: string }): string[] {
  const fromSet = variant.srcSet
    .split(",")
    .map((entry) => entry.trim().split(/\s+/)[0])
    .filter(Boolean);
  return [...new Set([variant.src, ...fromSet])];
}

describe("the client's photographs are committed with their provenance", () => {
  it("keeps every original byte-for-byte, md5-pinned", () => {
    for (const photo of PUBLISHED) {
      const file = path.join(ORIGINALS, `${photo.id}.jpg`);
      expect(existsSync(file), `${photo.id} original`).toBe(true);
      const md5 = createHash("md5").update(readFileSync(file)).digest("hex");
      expect(md5, `${photo.id} (${photo.file})`).toBe(photo.md5);
    }
  });

  it("names what each photograph depicts, never a price-sheet model", () => {
    const sheetNames =
      /White Rose|Angelica|Magnolia|Noble|Royal|Monarch|Majesty|Emperor|Imperial|Lumina/;
    for (const photo of PUBLISHED) {
      expect(photo.what.length, `${photo.id} description`).toBeGreaterThan(40);
      expect(photo.alt.length, `${photo.id} alt`).toBeGreaterThan(20);
      expect(sheetNames.test(photo.alt), `${photo.id} alt names a model`).toBe(false);
      expect(sheetNames.test(photo.label), `${photo.id} label names a model`).toBe(false);
    }
  });
});

describe("every published derivative is a real file, at real pixels", () => {
  it("writes the recorded widths, WebP, and nothing wider than the crop", () => {
    for (const photo of PUBLISHED) {
      const card = clientPhotoCard(photo.id);
      const wide = clientPhotoWide(photo.id);
      for (const variant of [card, wide]) {
        for (const file of candidateFiles(variant)) {
          const abs = path.join(ROOT, "public", file.replace(/^\//, ""));
          expect(existsSync(abs), `${file} is published but missing`).toBe(true);
          expect(file.endsWith(".webp"), file).toBe(true);
          const { width, height } = webpSize(abs);
          // The crop's own pixels are the ceiling: no derivative is upscaled.
          expect(width, `${file} wider than its crop`).toBeLessThanOrEqual(
            variant === card ? photo.cardWidth : photo.wideWidth,
          );
          const ratio = width / height;
          const expected = variant === card ? CARD_RATIO : WIDE_RATIO;
          expect(Math.abs(ratio - expected), `${file} ratio ${ratio.toFixed(3)}`).toBeLessThan(
            0.02,
          );
        }
        // The widest published candidate is the one `src` names.
        expect(candidateFiles(variant)).toContain(variant.src);
      }
    }
  });

  it("publishes both catalog roles at 1× and 2× where the crop allows", () => {
    for (const photo of PUBLISHED) {
      const card = clientPhotoCard(photo.id);
      const widthsOf = (variant: { src: string; srcSet: string }) =>
        candidateFiles(variant)
          .map((f) => Number(/-(\d+)\.webp$/.exec(f)?.[1]))
          .sort((a, b) => a - b);
      expect(widthsOf(card), `${photo.id} card widths`).toEqual(
        CLIENT_PHOTO_CARD_WIDTHS.filter((w) => w <= photo.cardWidth),
      );
      expect(widthsOf(clientPhotoWide(photo.id)), `${photo.id} wide widths`).toEqual(
        CLIENT_PHOTO_WIDE_WIDTHS.filter((w) => w <= photo.wideWidth),
      );
    }
  });

  it("keeps each published file inside a band weight budget", () => {
    for (const photo of PUBLISHED) {
      for (const variant of [clientPhotoCard(photo.id), clientPhotoWide(photo.id)]) {
        for (const file of candidateFiles(variant)) {
          const kb = statSync(path.join(ROOT, "public", file.replace(/^\//, ""))).size / 1024;
          expect(kb, `${file} is ${kb.toFixed(0)} KB`).toBeLessThan(200);
        }
      }
    }
  });
});

describe("the held photographs are not published anywhere", () => {
  it("has no derivative and a recorded reason", () => {
    const heldIds = new Set(HELD_CLIENT_PHOTOS.map((p) => p.id));
    expect(heldIds.size).toBeGreaterThan(0);
    for (const held of HELD_CLIENT_PHOTOS) {
      expect(held.why.length, `${held.id} reason`).toBeGreaterThan(10);
      expect(existsSync(path.join(ORIGINALS, `${held.id}.jpg`)), `${held.id} original`).toBe(true);
      expect(
        existsSync(path.join(CLIENT_DIR, `${held.id}-card-440.webp`)),
        `${held.id} derivative`,
      ).toBe(false);
      // Not in the published record at all.
      expect(Object.keys(CLIENT_PHOTOS)).not.toContain(held.id);
    }
    // Every client-supplied file is accounted for exactly once.
    expect(PUBLISHED.length + HELD_CLIENT_PHOTOS.length).toBe(21);
  });
});

describe("the catalogue mapping follows the documented rule", () => {
  /** The photographs whose lid is closed, and those whose lid is raised. */
  const CLOSED_LID: ReadonlyArray<ClientPhotoId> = ["casket-white-gold-closed", "casket-white-closed"];

  it("gives every one of the 24 models a published photograph", () => {
    const publishedIds = new Set(Object.keys(CLIENT_PHOTOS));
    for (const model of CASKET_MODELS) {
      const id = casketModelPhotoId(model);
      expect(publishedIds.has(id), `${model.model} → ${id}`).toBe(true);
      expect(CLOSED_LID.includes(id) || !HELD_CLIENT_PHOTOS.some((h) => h.id === id)).toBe(true);
    }
  });

  it("matches the lid to the cover the model's own name states", () => {
    for (const model of CASKET_MODELS) {
      const id = casketModelPhotoId(model);
      if (model.model.endsWith("Half")) {
        expect(CLOSED_LID, `${model.model} must show a closed lid`).toContain(id);
      } else if (model.model === "Lumina") {
        // The sheet's own name for the entry model states no cover
        // (COFFIN_COVER_UNSTATED), so no lid rule applies to it.
        expect(id).toBe("casket-white-closed");
      } else {
        expect(CLOSED_LID, `${model.model} must show a raised lid`).not.toContain(id);
      }
    }
  });

  it("publishes the sample labels and the sheet's substitution note with the photo", () => {
    const sample = casketSamplePhoto({ collection: "The Crown Collection", model: "Noble Full" });
    expect(sample.src).toContain("/media/client/");
    expect(sample.note).toContain("Illustration purposes only");
    expect(sample.note).toContain("not this model");
    // The photo's own description rides along, so a view can print what it is.
    expect(sample.what).toBe(clientPhoto(sample.id).what);
    expect(COFFIN_TIER_NOTE).toContain("Illustration purposes only");
  });

  it("labels the illustration-only records and leaves the client's own photographs unlabelled", () => {
    for (const photo of PUBLISHED) {
      const note = clientPhotoNote(photo.id);
      if (photo.honesty === "illustration-only") {
        expect(note, `${photo.id} needs the sample label`).toContain("Illustration purposes only");
      } else {
        expect(note, `${photo.id} is the client's own photograph`).toBeUndefined();
      }
    }
  });
});
