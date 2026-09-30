import { describe, expect, it, vi } from "vitest";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GALLERY_GROUPS,
  GALLERY_PHOTO_COUNT,
  GALLERY_PHOTOS,
  GALLERY_PROVENANCE_NOTE,
  GALLERY_SAMPLE_NOTE,
  type GalleryPhoto,
} from "@/lib/gallery";
import { textOf } from "@/tests/helpers/prose";

/**
 * The public gallery & virtual-tour entry (/gallery, F-03) renders the REAL
 * page component. These tests exist because the page's whole value is honesty
 * and weight:
 *
 *  · every photograph is the client's own material served from the generated
 *    WebP derivatives — never a hotlink and never a multi-megabyte original;
 *  · the wall draws each picture WHOLE — the client's own 4:3 catalogue crop in
 *    a 4:3 frame, never re-cropped — and every plate opens the viewer;
 *  · every sheet sample keeps its label: the short `Sample` chip on the plate
 *    and the full "illustration purposes only" sentence once per band;
 *  · the walk-through is the EXISTING /map, linked once;
 *  · the page never prints a second closing call — the shell's NextSteps owns it.
 */

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

const { default: GalleryPage } = await import("@/app/(public)/gallery/page");

/** Every photograph the page can render, in one flat list, plus the drawing. */
const CONTENT_PHOTOS: readonly GalleryPhoto[] = GALLERY_PHOTOS;

const REPO_ROOT = path.resolve(__dirname, "..", "..");

async function renderGallery(): Promise<string> {
  return renderToStaticMarkup(await GalleryPage());
}

/** Every src/srcset candidate of a photo, with its declared pixel width. */
function candidatesOf(photo: GalleryPhoto): Array<{ file: string; width: number }> {
  const out: Array<{ file: string; width: number }> = [];
  for (const entry of (photo.srcSet ?? "").split(",").filter(Boolean)) {
    const [file, descriptor] = entry.trim().split(/\s+/);
    out.push({ file, width: Number(descriptor.replace("w", "")) });
  }
  if (out.length === 0) out.push({ file: photo.src, width: photo.width });
  // The viewer also requests the 3:2 feature crop.
  out.push({ file: photo.viewerSrc, width: photo.viewerWidth });
  return out;
}

describe("the gallery shows the client's own photographs", () => {
  it("publishes the complete client set: the 14 client photographs plus the park's own photograph", () => {
    // 6 coffins + 2 carriage + 2 hall + 4 set-ups + the pavilion.
    // (The entrance-gate photograph is not on the page — captain, inbox 010.)
    expect(GALLERY_PHOTO_COUNT).toBe(15);
    expect(GALLERY_GROUPS.map((group) => group.id)).toEqual(["park", "care", "chapels"]);
    expect(CONTENT_PHOTOS.filter((photo) => photo.sample).length).toBe(10);
  });

  it("publishes only generated derivatives from public/media", () => {
    expect(CONTENT_PHOTOS.length).toBeGreaterThanOrEqual(6);
    for (const photo of CONTENT_PHOTOS) {
      expect(
        photo.src.startsWith("/media/gallery/") || photo.src.startsWith("/media/client/"),
        photo.src,
      ).toBe(true);
      expect(photo.src.endsWith(".webp"), photo.src).toBe(true);
      for (const candidate of candidatesOf(photo)) {
        const file = path.join(REPO_ROOT, "public", candidate.file.replace(/^\//, ""));
        expect(existsSync(file), `${candidate.file} is published but missing`).toBe(true);
      }
    }
    for (const file of ["/media/gallery/masterplan-480.webp", "/media/gallery/masterplan-960.webp"]) {
      expect(existsSync(path.join(REPO_ROOT, "public", file.replace(/^\//, "")))).toBe(true);
    }
  });

  it("never ships a multi-megabyte image — every derivative is small enough for a phone", () => {
    for (const photo of CONTENT_PHOTOS) {
      for (const candidate of candidatesOf(photo)) {
        const file = path.join(REPO_ROOT, "public", candidate.file.replace(/^\//, ""));
        const bytes = statSync(file).size;
        expect(bytes, `${candidate.file} is ${(bytes / 1024 / 1024).toFixed(2)} MB`).toBeLessThan(
          250 * 1024,
        );
      }
    }
  });

  it("reserves every image's space and lazy-loads the wall", async () => {
    const html = await renderGallery();
    const tags = html.match(/<img[^>]*>/g) ?? [];
    // The plates alone: the masterplan band left the page (captain, 2026-09-30).
    expect(tags.length).toBe(GALLERY_PHOTO_COUNT);

    for (const tag of tags) {
      expect(tag, tag).toMatch(/width="\d+"/);
      expect(tag, tag).toMatch(/height="\d+"/);
      expect(tag, tag).toMatch(/decoding="(sync|async)"/);
      // A srcSet must carry a sizes hint (the D5 defect).
      if (tag.includes("srcset=")) expect(tag, tag).toMatch(/sizes="/);
    }
  });
});

describe("the wall draws each picture whole and opens it", () => {
  it("every plate is a button with an accessible name, and no picture is re-cropped", async () => {
    const html = await renderGallery();
    const plates = html.match(/class="gal-plate__open"/g) ?? [];
    expect(plates).toHaveLength(GALLERY_PHOTO_COUNT);
    const names = [...html.matchAll(/aria-label="Open photograph (\d+) of (\d+) — /g)];
    expect(names).toHaveLength(GALLERY_PHOTO_COUNT);
    expect(names[0]?.[2]).toBe(String(GALLERY_PHOTO_COUNT));
    // The 4:3 plate frame: the gallery's whole-image role, not a 3:2 crop.
    expect(html).toContain("public-image--gallery-plate");
    expect(html).not.toContain("public-image--gallery-tile");
  });

  it("renders the set index, the three bands and the wall anchor", async () => {
    const html = await renderGallery();
    expect(html).toContain('class="gal-nav"');
    expect(html).toContain('id="wall"');
    expect(html).toContain('id="park"');
    expect(html).toContain('id="care"');
    expect(html).toContain('id="chapels"');
  });
});

describe("the gallery wall is pictures and nothing else", () => {
  it("carries no sample chip, no caption and no note", async () => {
    // The captain's ask (2026-09-30): images and section titles only. Every
    // picture keeps its own description in the ALT for screen readers.
    const html = await renderGallery();
    expect(html).not.toContain("gal-plate__chip");
    expect(html).not.toContain("gal-plate__caption");
    expect(html).not.toContain("Illustration purposes only");
    expect(html).not.toContain("Every photograph here is the park&rsquo;s own");
  });

  it("still describes every picture for a screen reader", async () => {
    const html = await renderGallery();
    const alts = [...html.matchAll(/<img[^>]*alt="([^"]*)"/g)].map((m) => m[1]);
    expect(alts.length).toBe(CONTENT_PHOTOS.length);
    for (const alt of alts) expect(alt.trim().length).toBeGreaterThan(10);
  });
});

describe("the gallery is photographs only", () => {
  it("carries no walk-through band and rebuilds no map", async () => {
    // The virtual-tour band left the page (captain, 2026-09-30): the park page
    // owns the map and the 3D walk-through.
    const html = await renderGallery();
    expect(html).not.toContain("gal-walk");
    expect(html).not.toContain("canvas");
  });

  it("renders exactly one h1 and the page's opening answer", async () => {
    const html = await renderGallery();
    expect((html.match(/<h1[\s>]/g) ?? []).length).toBe(1);
    expect(html).toContain('class="public-hero__lead"');
  });

  it("prints no second closing call from the page itself", async () => {
    const html = await renderGallery();
    // The call lives in the shared shell NextSteps band, never on the page.
    expect(html).not.toMatch(/href="tel:/);
  });
});
