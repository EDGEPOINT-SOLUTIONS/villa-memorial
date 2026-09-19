#!/usr/bin/env node
/**
 * build-client-photos.mjs — bring the client's own 2026 photographs (the 21
 * files supplied in "VILLA MEMORIAL PROJECT 2026") into the product, processed
 * for the web, and keep the originals beside them.
 *
 * Why a script. These are 1920×1080–1536×2048 camera files of the client's real
 * coffins, carriage, chapel hall and wake set-ups. Publishing them raw would
 * ship 80–380 KB JPEGs at print sizes to a 390 px phone, and publishing a single
 * size means either a blurry hero or a wasted rail. Every photograph is
 * therefore rendered at the widths a page actually renders it, in WebP, with a
 * HAND-CHOSEN crop per role — a rectangular crop is a design decision and is
 * declared here, per photograph, not guessed at render time.
 *
 *   node scripts/build-client-photos.mjs
 *
 * Source. The originals live outside the repo (the client's shared folder).
 * Pass `--source <dir>` or set CLIENT_PHOTOS_SOURCE; the default is the path the
 * first import read. Each file's md5 is pinned below, so a re-run against a
 * changed source fails loudly instead of silently republishing different
 * photographs under the same names.
 *
 * Where the originals live. `media-sources/client-photos/` — OUTSIDE `public/`
 * on purpose: seven of the twenty-one show identifiable mourners at a real wake
 * (one a named memorial screen), and the product's rule is that nothing about a
 * family is published without consent. A byte-for-byte archive under `public/`
 * would be fetchable by URL even with no page linking it; here the record and
 * the originals stay in the repo and the server never serves one.
 *
 * Naming rule (captain's brief): the published filename says what the photograph
 * DEPICTS, not what the client's folder called it. "Serenity full gass 2.jpg"
 * becomes `casket-white-gold-closed`; the source name is kept in the record
 * (lib/client-photos.ts) and in the README beside the originals.
 *
 * Output
 *   public/media/client/<id>-card-<w>.webp    4:3  — catalogue rows and cards
 *   public/media/client/<id>-wide-<w>.webp    3:2  — leads, heroes, features
 *   media-sources/client-photos/<id>.jpg            — the client's file, byte-for-byte
 *
 * No upscaling: a width larger than the crop's own pixels is skipped.
 */
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "media", "client");
const ORIGINALS = path.join(ROOT, "media-sources", "client-photos");

const DEFAULT_SOURCE = "/home/edgepoint/Edgepoint_05/VILLA MEMORIAL PROJECT 2026";
const sourceArg = process.argv.indexOf("--source");
const SOURCE =
  sourceArg > -1 ? process.argv[sourceArg + 1] : process.env.CLIENT_PHOTOS_SOURCE ?? DEFAULT_SOURCE;

/**
 * The hand-chosen frame per photograph.
 *
 * `focus` is the point the crop keeps (0–1 of the source), `zoom` scales the
 * largest crop of that ratio in (1 = the widest frame the ratio allows). The
 * values were chosen from the photographs themselves:
 *
 *  · subjects sit centre or centre-left in the client's frames, so the crop
 *    keeps the coffin whole and drops a person or a backdrop at the edge;
 *  · `zoom` > 1 is used only where an un-cropped frame would pull a bystander,
 *    a leg or a printed sign into the picture (Heaven's Gate, wake set-ups).
 *
 * `publish: false` photographs are imported (originals preserved, provenance
 * recorded) but no web derivative is written: they show identifiable mourners
 * and, in one, a named memorial screen. See the README beside the originals.
 */
const PHOTOS = [
  // ---- coffins -----------------------------------------------------------
  {
    id: "casket-white-gold-glass-lid",
    file: "Serenity full glcass.jpg",
    md5: "4a215541de64e47ca4d70a4fbbae12c4",
    card: { focus: [0.44, 0.56], zoom: 1 },
    wide: { focus: [0.44, 0.56], zoom: 1 },
  },
  {
    id: "casket-white-gold-closed",
    file: "Serenity full gass 2.jpg",
    md5: "8886926a952b5263ae1f7f5593dea753",
    card: { focus: [0.5, 0.58], zoom: 1 },
    wide: { focus: [0.5, 0.58], zoom: 1 },
  },
  {
    id: "casket-white-gold-wreath-lid",
    file: "Divine Rest.jpg",
    md5: "8d88c55875674698bb7ad67bfa889fb2",
    // The showroom's banner sits at the top-right of the source; the frame keeps
    // the casket and the wreath lid and drops the banner.
    card: { focus: [0.56, 0.5], zoom: 1.26 },
    wide: { focus: [0.6, 0.5], zoom: 1.15 },
  },
  {
    id: "casket-wood-white-gold-bible-lid",
    file: "Heaven_s Gate.jpg",
    md5: "c017cf528f221648e856effb662eb7be",
    // The source has a park banner above the lid and a bystander holding it at
    // the right; both crops are DETAILS of the raised lid's interior (the bible
    // embroidery between candelabra), which excludes both.
    card: { focus: [0.391, 0.451], zoom: 1.6 },
    wide: { focus: [0.415, 0.436], zoom: 1.6875 },
  },
  {
    id: "casket-white-open-lid",
    file: "Everlasting.jpg",
    md5: "28a34b3c358a519942d2e24c4ef4511d",
    card: { focus: [0.53, 0.56], zoom: 1.16 },
    wide: { focus: [0.53, 0.56], zoom: 1.08 },
  },
  {
    id: "casket-white-closed",
    file: "Everlasting 2.jpg",
    md5: "b30f3ada56c8fd0ce8a51e8b69ca2be1",
    card: { focus: [0.4, 0.6], zoom: 1.35 },
    wide: { focus: [0.42, 0.52], zoom: 1.22 },
  },
  // ---- the carriage (karwahe) -------------------------------------------
  {
    id: "hearse-carriage-gold-side",
    file: "Karwahe.jpg",
    md5: "2011d4981fa2e83207ca1d9f4b99962a",
    card: { focus: [0.5, 0.55], zoom: 1 },
    wide: { focus: [0.5, 0.55], zoom: 1 },
  },
  {
    id: "hearse-carriage-gold-rear",
    file: "karwahe (2).jpg",
    md5: "46aeb174aac4f5e7a17e9e7069f924ae",
    card: { focus: [0.5, 0.6], zoom: 1.06 },
    wide: { focus: [0.5, 0.57], zoom: 1.02 },
  },
  // ---- chapels and halls -------------------------------------------------
  {
    id: "chapel-hall-candle-pedestals",
    file: "urn set up.jpg",
    md5: "1dde52a061f8c05b45990051e46cb923",
    card: { focus: [0.5, 0.62], zoom: 1.05 },
    wide: { focus: [0.5, 0.6], zoom: 1 },
  },
  {
    id: "chapel-hall-flags",
    file: "creamation urn set up.jpg",
    md5: "9639a146c8240b20afeb689a09bae5c9",
    card: { focus: [0.5, 0.62], zoom: 1.08 },
    wide: { focus: [0.5, 0.6], zoom: 1 },
  },
  // ---- wake set-ups (the service as the office really builds it) ---------
  {
    id: "wake-setup-lamp-alcove",
    file: "our services (4).jpg",
    md5: "ceb07e819a35aaea57493641383ae883",
    card: { focus: [0.5, 0.52], zoom: 1.02 },
    wide: { focus: [0.5, 0.5], zoom: 1 },
  },
  {
    id: "wake-setup-casket-draped",
    file: "our services (2).jpg",
    md5: "ec733a747c4e8a5ae7c9d58d4fa61d54",
    card: { focus: [0.5, 0.62], zoom: 1.16 },
    wide: { focus: [0.5, 0.62], zoom: 1 },
  },
  {
    id: "wake-setup-flower-bank",
    file: "our services (5).jpg",
    md5: "d53e5eaf46afc6b8bfcce5f7f1bd28d5",
    card: { focus: [0.5, 0.58], zoom: 1.1 },
    wide: { focus: [0.5, 0.58], zoom: 1 },
  },
  {
    id: "wake-setup-dressing",
    file: "our services.jpg",
    md5: "cb9327ce7342899242d34b5d04e68e11",
    card: { focus: [0.55, 0.5], zoom: 1.2 },
    wide: { focus: [0.55, 0.5], zoom: 1 },
  },
  // ---- held: identifiable mourners (imported, not published) -------------
  { id: "wake-home-memorial-video", file: "Tribute.jpg", md5: "9f24d224479a169f67e4cc11723d7603", publish: false },
  { id: "wake-lantern-gathering", file: "Tribute (2).jpg", md5: "81664ac9ac70349cfebb467712636465", publish: false },
  { id: "wake-eulogy-speaker", file: "Tribute (3).jpg", md5: "78e764ca2d7a7a8506664beaf4475d31", publish: false },
  { id: "wake-evening-crowd", file: "Tribute (4).jpg", md5: "3bd376d257526cbdb949053a3fc4f57b", publish: false },
  { id: "wake-memorial-screen", file: "Tribute (5).jpg", md5: "6716e55783f0c224d0b45dcbe40a3dac", publish: false },
  { id: "wake-night-visitation-a", file: "Tribute (6).jpg", md5: "87645a443c0361032b59dc5ff0a483c6", publish: false },
  { id: "wake-night-visitation-b", file: "Tribute (7).jpg", md5: "674e9d574f786d8010fe872d271101f9", publish: false },
];

/** Card (catalogue row / small tile) widths — 1× and 2×. */
const CARD_WIDTHS = [440, 880];
/** Feature (lead figure, hero, gallery card) widths — 1× and 1.75×. */
const WIDE_WIDTHS = [960, 1600];
const CARD_RATIO = 4 / 3;
const WIDE_RATIO = 3 / 2;

/**
 * The largest rectangle of `ratio` inside `width`×`height`, centred on `focus`
 * and scaled by `zoom`, clamped to the source. Returns integer pixels.
 */
function cropFor(width, height, ratio, focus, zoom) {
  let cropWidth = Math.min(width, Math.round(height * ratio));
  let cropHeight = Math.round(cropWidth / ratio);
  if (cropHeight > height) {
    cropHeight = height;
    cropWidth = Math.round(cropHeight * ratio);
  }
  cropWidth = Math.max(1, Math.round(cropWidth / zoom));
  cropHeight = Math.max(1, Math.round(cropHeight / zoom));
  let left = Math.round(focus[0] * width - cropWidth / 2);
  let top = Math.round(focus[1] * height - cropHeight / 2);
  left = Math.min(Math.max(0, left), width - cropWidth);
  top = Math.min(Math.max(0, top), height - cropHeight);
  return { left, top, width: cropWidth, height: cropHeight };
}

async function main() {
  await mkdir(ORIGINALS, { recursive: true });
  const missing = [];
  const rows = [];
  /** Every derivative basename this run writes — the cleanup below keeps no others. */
  const written = new Set();
  let published = 0;

  for (const photo of PHOTOS) {
    const source = path.join(SOURCE, photo.file);
    let bytes;
    try {
      bytes = await readFile(source);
    } catch {
      missing.push(photo.file);
      continue;
    }
    const md5 = createHash("md5").update(bytes).digest("hex");
    if (md5 !== photo.md5) {
      throw new Error(
        `${photo.file}: md5 ${md5} does not match the recorded ${photo.md5}. ` +
          "The client's file changed — review the difference and update the record deliberately.",
      );
    }
    const original = path.join(ORIGINALS, `${photo.id}.jpg`);
    await copyFile(source, original);

    if (photo.publish === false) {
      rows.push({ id: photo.id, published: false, width: 0 });
      continue;
    }

    const meta = await sharp(bytes).metadata();
    const { width, height } = meta;
    const card = cropFor(width, height, CARD_RATIO, photo.card.focus, photo.card.zoom);
    const wide = cropFor(width, height, WIDE_RATIO, photo.wide.focus, photo.wide.zoom);

    const outputs = [];
    const widthsFor = (cropWidth, role) => {
      const widths = role === "card" ? CARD_WIDTHS : WIDE_WIDTHS;
      const fitting = widths.filter((w) => w <= cropWidth);
      // A crop smaller than every published width cannot be served without
      // upscaling (the record's `clientPhotoCard`/`wide` fall back to the crop's
      // own width, which would name a file nobody wrote) — fail the build
      // instead, naming the crop to redraw.
      if (fitting.length === 0) {
        throw new Error(
          `${photo.id}: the ${role} crop is ${cropWidth}px, smaller than every published ${role} ` +
            `width (${widths.join(", ")}) — widen the crop or add a smaller width deliberately.`,
        );
      }
      return fitting;
    };
    for (const w of widthsFor(card.width, "card")) {
      const out = path.join(OUT, `${photo.id}-card-${w}.webp`);
      await sharp(bytes).extract(card).resize({ width: w }).webp({ quality: 76 }).toFile(out);
      outputs.push(out);
      written.add(path.basename(out));
    }
    for (const w of widthsFor(wide.width, "wide")) {
      const out = path.join(OUT, `${photo.id}-wide-${w}.webp`);
      await sharp(bytes).extract(wide).resize({ width: w }).webp({ quality: 76 }).toFile(out);
      outputs.push(out);
      written.add(path.basename(out));
    }
    const sizes = await Promise.all(outputs.map(async (o) => (await stat(o)).size));
    rows.push({
      id: photo.id,
      published: true,
      width: `${width}x${height}`,
      card: `${card.width}x${card.height}`,
      wide: `${wide.width}x${wide.height}`,
      bytes: sizes.reduce((a, b) => a + b, 0),
      outputs: outputs.length,
    });
    published += 1;
  }

  if (missing.length) {
    throw new Error(
      `Missing ${missing.length} client file(s) in ${SOURCE}:\n  ${missing.join("\n  ")}`,
    );
  }

  // A crop change must not leave the old derivative behind: a stale file would
  // stay on disk (and could be served by a cached page) with no record naming
  // it. `written` is exactly what this run produced.
  const stale = (await readdir(OUT)).filter(
    (file) => file.endsWith(".webp") && !written.has(file),
  );
  for (const file of stale) {
    await rm(path.join(OUT, file));
    console.log(`removed stale derivative ${file}`);
  }

  console.log(`source: ${SOURCE}`);
  console.log(
    `photographs: ${PHOTOS.length} · published: ${published} · held: ${PHOTOS.length - published}`,
  );
  console.table(rows);
  const total = rows.reduce((a, r) => a + (r.bytes ?? 0), 0);
  console.log(`published web bytes: ${(total / 1024 / 1024).toFixed(2)} MB`);

  await writeFile(
    path.join(ORIGINALS, "README.md"),
    originalReadme(rows, total),
    "utf8",
  );
  console.log("wrote media-sources/client-photos/README.md");
}

function originalReadme(rows, total) {
  const published = rows.filter((r) => r.published);
  const held = rows.filter((r) => !r.published);
  return `# The client's 2026 photographs — originals and provenance

Imported from the client's own folder ("VILLA MEMORIAL PROJECT 2026") by
\`scripts/build-client-photos.mjs\`. Every file here is the client's original,
byte-for-byte; the published derivatives live in \`public/media/client/\` and are
what the site actually serves. Re-run the script (with \`--source <dir>\`) to
rebuild them; each source file's md5 is pinned in the script, so a changed source
fails loudly.

This folder sits OUTSIDE \`public/\` on purpose. Seven of these photographs show
identifiable mourners at a real wake (one a named memorial screen), and a file
under \`public/\` is fetchable by URL even when no page links it; here they are
archived with their provenance and the server never serves one.

The full record of what each photograph shows — the description the mapping is
built on — is \`lib/client-photos.ts\`; the surfaces that use it are pinned by
\`tests/unit/client-photos.test.ts\`.

## Published (${published.length})

${published.map((r) => `- \`${r.id}.jpg\` — ${r.outputs} web derivatives, ${(r.bytes / 1024).toFixed(0)} KB total`).join("\n")}

## Imported but NOT published (${held.length})

These show identifiable mourners at a real wake (and one shows a named memorial
screen). They are preserved here with their provenance, but no page may publish
them and no derivative is written: the product's own rule for memorial material
is that nothing about a family is published without consent
(lib/memorials.ts). The captain can reverse this by adding them to the record
with \`publish: true\` once the client confirms consent.

${held.map((r) => `- \`${r.id}.jpg\``).join("\n")}

## Payload

Published derivatives total ${(total / 1024 / 1024).toFixed(2)} MB across every
width; a page loads only the two or three it renders (see the PR's image
inventory).
`;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
