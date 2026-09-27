import sharp from "sharp";
import fs from "node:fs";

/**
 * Publish a WebP derivative of the client masterplan AT THE SAME PIXEL SIZE.
 *
 * WHY SAME SIZE IS THE WHOLE POINT. `lib/park-3d/masterplan.ts` records the plan
 * as 1254 x 1254 and the plot coordinates are authored in that pixel space
 * (`MASTERPLAN_PX`, `pxToWorld`, `pxPathToWorld`). Resizing the image would move
 * every plot. Re-encoding it without touching a single pixel cannot.
 *
 * Both consumers are therefore safe:
 *   · the 2D Leaflet canvas computes its bounds from `naturalWidth`/`naturalHeight`,
 *     so identical dimensions produce identical bounds;
 *   · the 3D scene and the editor thumbnail read the same pixel grid.
 *
 * The client's original `Park map.png` stays on disk and stays the source of
 * truth — AGENTS.md says do not swap it. This only ADDS a published derivative,
 * the same pattern as scripts/build-gallery-images.mjs.
 */

const SRC = "public/media/Park map.png";
const OUT = "public/media/park-map-1254.webp";

const before = fs.statSync(SRC).size;
const srcMeta = await sharp(SRC).metadata();

await sharp(SRC).webp({ quality: 82, effort: 6 }).toFile(OUT);

const after = fs.statSync(OUT).size;
const outMeta = await sharp(OUT).metadata();

console.log(`source : ${srcMeta.width} x ${srcMeta.height}  ${(before / 1024).toFixed(0)} KB`);
console.log(`derived: ${outMeta.width} x ${outMeta.height}  ${(after / 1024).toFixed(0)} KB`);
console.log(
  `identical pixels: ${srcMeta.width === outMeta.width && srcMeta.height === outMeta.height}`
);
console.log(`saving: ${(((before - after) / before) * 100).toFixed(0)}%  (${((before - after) / 1024).toFixed(0)} KB)`);
