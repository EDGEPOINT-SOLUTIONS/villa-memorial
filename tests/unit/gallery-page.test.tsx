import { describe, expect, it, vi } from "vitest";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  listLandingContent,
  saveLandingContent,
  type LandingContent,
} from "@/lib/api-client/landing";
import {
  GALLERY_GROUPS,
  GALLERY_HERO,
  GALLERY_MASTERPLAN,
  GALLERY_PROVENANCE_NOTE,
  GALLERY_TOUR_LINE,
  type GalleryPhoto,
} from "@/lib/gallery";
import { CHAPEL_SAMPLE_NOTE, SERVICE_SAMPLE_NOTE } from "@/lib/media";
import { textOf } from "@/tests/helpers/prose";

/**
 * The public gallery & virtual-tour entry (/gallery, F-03) renders the REAL
 * page component. These tests exist because the page's whole value is honesty
 * and weight:
 *
 *  · every photograph is the client's own material served from the generated
 *    WebP derivatives (scripts/build-gallery-images.mjs) — never a hotlink and
 *    never a multi-megabyte original;
 *  · every sheet sample keeps the exact "illustration purposes only" label the
 *    services surfaces publish, and the masterplan is captioned as a drawing;
 *  · the walk-through is the EXISTING /map, linked once — the gallery never
 *    embeds or rebuilds the map or the 3D park;
 *  · the visit step prints the staff-editable 24/7 number, so an edit to the
 *    landing contact content reaches this page on the next request.
 *
 * The copy budget is enforced separately by tests/unit/reading-budget.test.tsx.
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

/** Every photograph the page can render, in one flat list. */
const PHOTOS: readonly GalleryPhoto[] = [
  GALLERY_HERO,
  GALLERY_MASTERPLAN,
  ...GALLERY_GROUPS.flatMap((group) => group.photos),
];

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
  return out;
}

describe("the gallery shows the client's own photographs", () => {
  it("publishes only generated derivatives from public/media", () => {
    expect(PHOTOS.length).toBeGreaterThanOrEqual(6);
    for (const photo of PHOTOS) {
      // Two derivative homes: the park shots the gallery script generates, and
      // the client's own 2026 photographs (public/media/client/, written by
      // scripts/build-client-photos.mjs). Both are committed WebP derivatives —
      // an original JPEG may never be the file a page serves.
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
  });

  it("never ships a multi-megabyte image — every derivative is small enough for a phone", () => {
    // The landing pass was criticised for 12 MB of imagery; the gallery's whole
    // file set must stay well under what one phone can pull in a second.
    for (const photo of PHOTOS) {
      for (const candidate of candidatesOf(photo)) {
        const file = path.join(REPO_ROOT, "public", candidate.file.replace(/^\//, ""));
        const bytes = statSync(file).size;
        expect(bytes, `${candidate.file} is ${(bytes / 1024 / 1024).toFixed(2)} MB`).toBeLessThan(
          250 * 1024,
        );
      }
    }
  });

  it("reserves every image's space and lazy-loads everything below the hero", async () => {
    const html = await renderGallery();
    const tags = html.match(/<img[^>]*>/g) ?? [];
    expect(tags.length).toBe(PHOTOS.length);

    for (const tag of tags) {
      // Explicit dimensions + a fixed aspect ratio (the gal-figure boxes) mean
      // no cumulative layout shift while the photographs arrive.
      expect(tag, tag).toMatch(/width="\d+"/);
      expect(tag, tag).toMatch(/height="\d+"/);
      expect(tag, tag).toMatch(/decoding="(sync|async)"/);
    }

    const heroTag = tags.find((tag) => tag.includes(GALLERY_HERO.src)) ?? "";
    expect(heroTag).toContain('loading="eager"');
    // React emits the attribute as `fetchPriority` (React 19); HTML attribute
    // names are case-insensitive, so match either spelling.
    expect(heroTag.toLowerCase()).toContain('fetchpriority="high"');
    const lazyCount = tags.filter((tag) => tag.includes('loading="lazy"')).length;
    expect(lazyCount).toBe(PHOTOS.length - 1);
  });
});

describe("the gallery labels client sample imagery exactly as the services page does", () => {
  it("keeps the illustration-purposes-only label on every sample", async () => {
    const html = await renderGallery();
    const chapelSamples = PHOTOS.filter((photo) => photo.note === CHAPEL_SAMPLE_NOTE);
    const serviceSamples = PHOTOS.filter((photo) => photo.note === SERVICE_SAMPLE_NOTE);
    // Every card the record marks as a sample carries one of the two labels.
    const samples = PHOTOS.filter((photo) => photo.note?.includes("Illustration purposes only"));

    expect(chapelSamples.length).toBeGreaterThan(0);
    expect(serviceSamples.length).toBeGreaterThan(0);
    for (const photo of samples) {
      expect(html).toContain(photo.note as string);
    }
    // The label appears once per sample and nowhere else.
    const labels = (html.match(/Illustration purposes only/g) ?? []).length;
    expect(labels).toBe(samples.length);
    // It is the same vocabulary the client sheet prints and /services publishes.
    expect(CHAPEL_SAMPLE_NOTE).toContain("Illustration purposes only");
    expect(SERVICE_SAMPLE_NOTE).toContain("Illustration purposes only");
  });

  it("captions the masterplan as a drawing, not a photograph", async () => {
    const html = await renderGallery();
    expect(html).toContain(GALLERY_MASTERPLAN.caption);
    expect(html).toContain(GALLERY_MASTERPLAN.note as string);
    expect(GALLERY_MASTERPLAN.caption.toLowerCase()).toContain("masterplan");
    expect(GALLERY_MASTERPLAN.caption.toLowerCase()).not.toContain("photograph");
  });

  it("prints the one provenance line so no reader has to guess where a photo came from", async () => {
    const html = await renderGallery();
    expect(textOf(html)).toContain(GALLERY_PROVENANCE_NOTE);
  });
});

describe("the gallery is one clean entry to the walk-through", () => {
  it("links the existing /map exactly once and says which view is which", async () => {
    const html = await renderGallery();
    const mapLinks = html.match(/href="\/map"/g) ?? [];
    expect(mapLinks).toHaveLength(1);
    expect(html).toContain(GALLERY_TOUR_LINE);
    // The 3D park and its map are NOT rebuilt here: no canvas, no viewport.
    expect(html).not.toContain("canvas");
  });

  it("renders exactly one h1 and the page's opening answer", async () => {
    const html = await renderGallery();
    expect((html.match(/<h1[\s>]/g) ?? []).length).toBe(1);
    expect(html).toContain('class="public-hero__lead"');
  });
});

describe("the visit step reads the staff-editable contact content", () => {
  it("an edited 24/7 number reaches the page's call action", async () => {
    const content = await listLandingContent();
    const edited = JSON.parse(JSON.stringify(content)) as LandingContent;
    edited.contact.phoneDisplay = "0917 000 4242";
    edited.contact.phoneHref = "tel:+639170004242";
    await saveLandingContent(edited);

    const html = await renderGallery();
    expect(html).toContain("0917 000 4242");
    expect(html).toContain('href="tel:+639170004242"');
    // The replaced number is gone — the page reads the document, it does not merge.
    expect(html).not.toContain(content.contact.phoneDisplay);

    // Restore the recorded seed so this file leaves the store as it found it.
    await saveLandingContent(content);
  });

  it("the restored seed's number is what ships", async () => {
    const content = await listLandingContent();
    const html = await renderGallery();
    expect(html).toContain(content.contact.phoneDisplay);
    expect(html).toContain(`href="${content.contact.phoneHref}"`);
  });
});
