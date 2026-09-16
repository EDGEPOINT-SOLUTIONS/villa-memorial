#!/usr/bin/env node
/**
 * crop-client-sheet-tiles.mjs — derive the published chapel / coffin sample
 * photographs from the CLIENT's own "TYPES OF COFFIN.jpg" sheet.
 *
 * Why a script: the client supplies photography inside one 1545×2000 designed
 * sheet (public/media/doc-types-of-coffin.jpg is the same sheet rasterised), and
 * the site needs the individual tiles at photo quality. This crops them with the
 * already-installed `sharp` (a Next.js dependency — there is no ImageMagick or
 * PIL on the build machine) and writes them to public/media/.
 *
 *   node scripts/crop-client-sheet-tiles.mjs [--source <path to the sheet>]
 *
 * The rects below are the tile positions on that sheet, inset a few pixels so
 * the sheet's own pastel background and the tiles' rounded corners never leak
 * into the published photo. Every crop is honest imagery: the sheet prints
 * "(Illustration purposes only)", so the site labels all of them as illustrative
 * samples — never as a photograph of a named chapel or of a specific model.
 *
 * Source default: the client library copied to the project data dir. That path
 * is outside the repo on purpose (client material is not vendored); pass
 * `--source` when it moves.
 */
import { mkdir, access } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_SOURCE =
  "/home/gab/firstmate/data/villa-memorial-media-originals/VILLA MEMORIAL PROJECT 2026/VILLA MEMORIAL PROJECT 2026/CLIENT DOCS VILLA MEMORIA/TYPES OF COFFIN.jpg";

const OUT_DIR = path.join(process.cwd(), "public", "media");

/** [left, top, width, height] on the client's sheet. */
const TILES = [
  // --- "OUR SAMPLE SERVICES" photographs (the wake/chapel set-ups) -----------
  {
    file: "chapel-common.jpg",
    label: "Sample wake set-up in a shared hall (common-chapel illustration)",
    rect: [525, 1270, 340, 200],
  },
  {
    file: "chapel-private.jpg",
    label: "Sample decorated viewing room (private-chapel illustration)",
    rect: [80, 1397, 365, 203],
  },
  {
    file: "service-carriage.jpg",
    label: "Sample funeral carriage (interment / delivery illustration)",
    rect: [1125, 1245, 350, 140],
  },
  // --- The five coffin photographs (the sheet's own tier samples) -----------
  {
    file: "coffin-bronze-1.jpg",
    label: "Bronze 1 — half-glass lid sample",
    rect: [130, 173, 330, 234],
  },
  {
    file: "coffin-bronze-2.jpg",
    label: "Bronze 2 — full-glass lid sample",
    rect: [1083, 232, 337, 223],
  },
  {
    file: "coffin-silver-1.jpg",
    label: "Silver 1 — half-glass lid sample",
    rect: [133, 557, 302, 198],
  },
  {
    file: "coffin-silver-2.jpg",
    label: "Silver 2 — full-glass lid sample",
    rect: [1100, 700, 320, 227],
  },
  {
    file: "coffin-gold.jpg",
    label: "Gold — special-metal sample with convertible cover",
    rect: [133, 878, 337, 209],
  },
];

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  const source = argValue("--source") ?? process.env.VILLA_SHEET_SOURCE ?? DEFAULT_SOURCE;

  let sharp;
  try {
    ({ default: sharp } = await import("sharp"));
  } catch {
    console.error(
      "sharp is not installed. It ships as a Next.js dependency — run `npm install` first.",
    );
    process.exit(1);
  }

  try {
    await access(source);
  } catch {
    console.error(`Client sheet not found: ${source}\nPass --source <path to "TYPES OF COFFIN.jpg">.`);
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  const meta = await sharp(source).metadata();
  for (const tile of TILES) {
    const [left, top, width, height] = tile.rect;
    if (left + width > (meta.width ?? 0) || top + height > (meta.height ?? 0)) {
      console.error(`Tile ${tile.file} falls outside the sheet (${meta.width}×${meta.height}) — check the rect.`);
      process.exit(1);
    }
    const out = path.join(OUT_DIR, tile.file);
    const info = await sharp(source)
      .extract({ left, top, width, height })
      .jpeg({ quality: 86, chromaSubsampling: "4:4:4" })
      .toFile(out);
    console.log(`${tile.file.padEnd(26)} ${info.width}×${info.height}  ${tile.label}`);
  }
  console.log(`\n${TILES.length} tiles written to public/media/.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
