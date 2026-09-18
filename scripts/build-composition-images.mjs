#!/usr/bin/env node
/**
 * build-composition-images.mjs — derive the composition pass's band photographs
 * from the CLIENT's own uploaded assets in public/media/.
 *
 * Why a script. The client's lot tiles (public/media/lot-*.png, 1254×1254) are
 * MARKETING TILES, not photographs: each one carries the group's logo lock-up in
 * a corner and the family name set large across the bottom, over a photograph of
 * the actual place. The composition pass needs the PHOTOGRAPH — a band that shows
 * a place must show the place, not a republished advertisement — so each tile is
 * cropped past its logo and above its title band, exactly as
 * scripts/build-gallery-images.mjs already crops the title band out of the
 * client's promo composite (park-pavilion). Nothing is re-coloured, redrawn or
 * invented: every rectangle below is a rectangle of the client's own tile.
 *
 *   node scripts/build-composition-images.mjs
 *
 * The crops are documented per tile because each tile lays its type out
 * differently — this is why there is no shared rectangle:
 *  · lot-primary        logo top-left (≈30–300 × 30–210), "PRIMARY LOT" from
 *                       y≈980 → photograph is x 300–, y 150–970;
 *  · lot-premium        logo AND copy top-left (≈50–470 × 30–560), feature strip
 *                       from y≈1040 → photograph is x 470–, y 60–1040;
 *  · lot-garden-niches  logo top-left, "GARDEN NICHES" from y≈1000 → same frame
 *                       as lot-primary;
 *  · lot-mausoleum      logo top-left, "Mausoleum" from y≈1000 → same frame.
 *
 * Published derivatives are committed alongside the originals — run this only
 * when a source tile changes. The originals stay in public/media (they are still
 * the map legend's swatches); the band never loads them.
 */
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const MEDIA = path.join(process.cwd(), "public", "media");
const OUT = path.join(MEDIA, "composition");
const THUMBS = path.join(OUT, "thumbs");

/**
 * [output name, source tile, photograph rectangle in the tile's own pixels]
 *
 * The two tiles whose type sits in the left column (premium) get their own
 * rectangle; the other three share one because the client laid them out alike.
 */
const LOGO_TOP_LEFT_TILE = { left: 300, top: 150, width: 954, height: 820 };
const LOGO_TOP_LEFT_TILE_PREMIUM = { left: 470, top: 60, width: 784, height: 760 };

const JOBS = [
  { name: "prime-lot", src: "lot-primary.png", crop: LOGO_TOP_LEFT_TILE },
  { name: "premium-lot", src: "lot-premium.png", crop: LOGO_TOP_LEFT_TILE_PREMIUM },
  { name: "garden-niches", src: "lot-garden-niches.png", crop: LOGO_TOP_LEFT_TILE },
  { name: "mausoleum", src: "lot-mausoleum.png", crop: LOGO_TOP_LEFT_TILE },
];

/** The band's 1×/2× widths — a card renders at ≤ 360 CSS px, the lead at ≤ 720. */
const WIDTHS = [480, 720];

/**
 * Thumbnails. The landing page's rails and its About figure render their
 * pictures at 3.2–24rem, but the media library a staff editor picks from holds
 * print-sized uploads: the four lot tiles are 2.2–2.6 MB PNGs and the plan
 * artwork is 1.9 MB, so a rail of six thumbnails asked a phone for ~12 MB to
 * paint ~300 px of image. Each library asset gets the two widths a thumbnail
 * actually needs, in WebP.
 *
 * Where a tile's photograph was already extracted above, the thumbnail IS that
 * photograph (one asset, one picture, everywhere — a rail swatch must not be the
 * only place the marketing type reappears). Everything else is a plain resize.
 *
 * The output name is `mediaSlug(source)` — the SAME rule lib/media.ts
 * (`libraryThumb`) applies to build the URL at render time. Change one and the
 * `tests/unit/composition-pass.test.tsx` weight check fails on a missing file.
 */
const THUMB_WIDTHS = [320, 640];
const THUMB_SOURCES = [
  { src: "lot-primary.png", crop: LOGO_TOP_LEFT_TILE },
  { src: "lot-premium.png", crop: LOGO_TOP_LEFT_TILE_PREMIUM },
  { src: "lot-garden-niches.png", crop: LOGO_TOP_LEFT_TILE },
  { src: "lot-mausoleum.png", crop: LOGO_TOP_LEFT_TILE },
  { src: "plan-packages.png" },
  { src: "viewing-care.jpg" },
  { src: "death_at_home.jpg" },
  { src: "death_at_hospital.jpg" },
  { src: "gold-casket.jpg" },
  { src: "bronze-casket.jpg" },
  { src: "silver-casket.jpg" },
  { src: "transport.jpg" },
  { src: "at_need_services.jpg" },
  { src: "hero-1.jpg" },
  { src: "the very first memorial park in basilan.jpg" },
];

/** `/media/<file>` → the thumbnail basename. MUST match lib/media.ts. */
export function mediaSlug(src) {
  const file = src.split("/").pop() ?? src;
  return file
    .replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function fileSize(file) {
  const info = await stat(file);
  return info.size;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await mkdir(THUMBS, { recursive: true });
  let totalIn = 0;
  let totalOut = 0;
  const rows = [];

  for (const job of JOBS) {
    const source = path.join(MEDIA, job.src);
    const sourceBytes = await fileSize(source);
    totalIn += sourceBytes;

    for (const width of WIDTHS) {
      const info = await sharp(source)
        .extract(job.crop)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 80, effort: 5 })
        .toFile(path.join(OUT, `${job.name}-${width}.webp`));
      totalOut += info.size;
      rows.push(
        `  ${`${job.name}-${width}.webp`.padEnd(26)} ${`${info.width}×${info.height}`.padEnd(11)} ${(info.size / 1024).toFixed(1)} KB`,
      );
    }
    rows.push(`    ← ${job.src} (${(sourceBytes / 1024).toFixed(1)} KB source tile)`);
  }

  rows.push("");
  let thumbIn = 0;
  let thumbOut = 0;
  for (const job of THUMB_SOURCES) {
    const source = path.join(MEDIA, job.src);
    const sourceBytes = await fileSize(source);
    thumbIn += sourceBytes;
    const slug = mediaSlug(job.src);
    for (const width of THUMB_WIDTHS) {
      const pipeline = sharp(source);
      if (job.crop) pipeline.extract(job.crop);
      const info = await pipeline
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 78, effort: 5 })
        .toFile(path.join(THUMBS, `${slug}-${width}.webp`));
      thumbOut += info.size;
      rows.push(
        `  ${`thumbs/${slug}-${width}.webp`.padEnd(40)} ${`${info.width}×${info.height}`.padEnd(11)} ${(info.size / 1024).toFixed(1)} KB`,
      );
    }
  }

  console.log(`Wrote ${JOBS.length * WIDTHS.length} band files to public/media/composition/`);
  console.log(
    `Wrote ${THUMB_SOURCES.length * THUMB_WIDTHS.length} thumbnail files to public/media/composition/thumbs/`,
  );
  for (const row of rows) console.log(row);
  console.log(
    `\nBand sources: ${(totalIn / 1024 / 1024).toFixed(2)} MB → ${(totalOut / 1024).toFixed(1)} KB`,
  );
  console.log(
    `Thumbnail sources: ${(thumbIn / 1024 / 1024).toFixed(2)} MB → ${(thumbOut / 1024).toFixed(1)} KB`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
