#!/usr/bin/env node
/**
 * build-gallery-images.mjs — derive the public gallery's web-sized WebP photos
 * from the CLIENT's own uploaded assets in public/media/.
 *
 * Why a script: the uploaded originals are print/promo-sized (the park photo is
 * 151 KB at 1626×916, the masterplan is a 2.3 MB PNG, the pavilion photo is a
 * 185 KB promo composite), and the earlier landing pass was criticised for
 * shipping multi-megabyte originals. The gallery therefore ships its own
 * derivatives: modern format (WebP), the widths the layout actually asks for
 * (1×/2×), and fixed 3:2 card crops that match the layout box exactly — so the
 * browser never downloads pixels the CSS would hide, and nothing shifts while
 * the images load.
 *
 * The published derivatives are committed alongside the originals — run this
 * only when a source photo changes:
 *
 *   node scripts/build-gallery-images.mjs
 *
 * Every crop below is documented provenance, not decoration:
 *  · park-pavilion keeps ONLY the photograph inside the client's promo
 *    composite (its title and contact bands are stripped), so the gallery never
 *    republishes baked-in marketing text;
 *  · wake-viewing and the two chapel samples are centre-cropped to the
 *    gallery's 3:2 card;
 *  · the carriage keeps its whole self (see SHEET_CARRIAGE_CARD) — the 350×140
 *    tile on its own crops to the building behind it, not the carriage;
 *  · the chapel samples are published at their native size — never upscaled —
 *    because the client sheet tiles are small by design.
 *
 * The client's sheet prints "(Illustration purposes only)" on its sample
 * photographs; the page keeps labelling every sample that way (lib/media.ts
 * CHAPEL_SAMPLE_NOTE / SERVICE_SAMPLE_NOTE). This script only resizes.
 */
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const MEDIA = path.join(process.cwd(), "public", "media");
const OUT = path.join(MEDIA, "gallery");

/** The client's promo composite (940×788): only the photograph region survives. */
const PAVILION_PHOTO = { left: 0, top: 130, width: 940, height: 545 };
/** The uploaded viewing portrait (1400×1867), centre-cropped to 3:2. */
const VIEWING_CARD = { left: 0, top: 467, width: 1400, height: 933 };
/** The sheet's sample tiles, centre-cropped to 3:2 at native width. */
const COMMON_CARD = { left: 20, top: 0, width: 300, height: 200 };
const PRIVATE_CARD = { left: 30, top: 0, width: 305, height: 203 };
/**
 * The carriage photograph ON THE SHEET (1545×2000), inset past the tile's
 * rounded corners. The 350×140 `service-carriage.jpg` tile is only the photo's
 * TOP STRIP — its centre is the building behind the carriage — so cropping that
 * tile to a card hides the carriage and makes the caption a claim the picture
 * cannot support. This rect keeps the whole carriage (body, glass window, wheel
 * and motorcycle front); it is the largest honest crop on the committed raster.
 */
const SHEET_CARRIAGE_CARD = { left: 1100, top: 1232, width: 419, height: 279 };

/**
 * [output name, source, crop, widths…] — `null` crop publishes the source as-is;
 * widths are the layout's 1×/2× sizes, the largest one never above the source.
 */
const JOBS = [
  // The park's entrance gate (the site's hero/OG photo, 1626×916).
  { name: "park-gate", src: "hero-1.jpg", widths: [640, 1024, 1626] },
  // The pavilion + grounds, from the client's promo composite.
  {
    name: "park-pavilion",
    src: "the very first memorial park in basilan.jpg",
    crop: PAVILION_PHOTO,
    widths: [640, 940],
  },
  // The uploaded viewing/wake set-up, cropped to the card ratio.
  { name: "wake-viewing", src: "viewing-care.jpg", crop: VIEWING_CARD, widths: [420, 840] },
  // The sheet's sample photographs (native width only — no upscaling).
  { name: "chapel-common", src: "chapel-common.jpg", crop: COMMON_CARD, widths: [300] },
  { name: "chapel-private", src: "chapel-private.jpg", crop: PRIVATE_CARD, widths: [305] },
  {
    name: "service-carriage",
    src: "doc-types-of-coffin.jpg",
    crop: SHEET_CARRIAGE_CARD,
    widths: [419],
  },
  // The park masterplan (the drawing both park-map modes are built from).
  { name: "masterplan", src: "Park map.png", widths: [480, 960], quality: 84 },
];

async function fileSize(file) {
  const info = await stat(file);
  return info.size;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  let totalIn = 0;
  let totalOut = 0;
  let fileCount = 0;
  const rows = [];

  for (const job of JOBS) {
    const source = path.join(MEDIA, job.src);
    const sourceBytes = await fileSize(source);
    totalIn += sourceBytes;

    for (const width of job.widths) {
      const pipeline = sharp(source);
      if (job.crop) pipeline.extract(job.crop);
      pipeline.resize({ width, withoutEnlargement: true });
      pipeline.webp({ quality: job.quality ?? 80, effort: 5 });
      const outFile = path.join(OUT, `${job.name}-${width}.webp`);
      const info = await pipeline.toFile(outFile);
      totalOut += info.size;
      fileCount += 1;
      rows.push(
        `  ${`${job.name}-${width}.webp`.padEnd(26)} ${`${info.width}×${info.height}`.padEnd(11)} ${(info.size / 1024).toFixed(1)} KB`,
      );
    }
    rows.push(`    ← ${job.src} (${(sourceBytes / 1024).toFixed(1)} KB source)`);
  }

  console.log(`Wrote ${fileCount} files to public/media/gallery/`);
  for (const row of rows) console.log(row);
  console.log(
    `\nSources: ${(totalIn / 1024 / 1024).toFixed(2)} MB → published derivatives: ` +
      `${(totalOut / 1024 / 1024).toFixed(2)} MB`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
