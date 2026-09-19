/**
 * Walk a page the way an eye does: cut a full-page screenshot into readable
 * slices so every band can be reviewed without re-scrolling the browser.
 *
 * Usage: node scripts/slice-shots.mjs <full-page-image> <out-dir> [sliceHeight]
 * Writes <basename>-slice-01.jpg, -02, ... at the source width.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [image, outDir, sliceArg] = process.argv.slice(2);
if (!image || !outDir) {
  console.error("usage: node scripts/slice-shots.mjs <image> <out-dir> [sliceHeight]");
  process.exit(1);
}
const sliceHeight = Number(sliceArg) > 0 ? Number(sliceArg) : 1400;

mkdirSync(outDir, { recursive: true });
const meta = await sharp(image).metadata();
const base = path.basename(image).replace(/\.[^.]+$/, "");
let n = 0;
for (let top = 0; top < meta.height; top += sliceHeight) {
  n += 1;
  const height = Math.min(sliceHeight, meta.height - top);
  const name = `${base}-slice-${String(n).padStart(2, "0")}.jpg`;
  await sharp(image)
    .extract({ left: 0, top, width: meta.width, height })
    .jpeg({ quality: 82 })
    .toFile(path.join(outDir, name));
}
console.log(`${n} slices → ${outDir}`);
