/**
 * The client's own 2026 photographs — the record the imagery is built on.
 *
 * 21 files were supplied in the client's "VILLA MEMORIAL PROJECT 2026" folder
 * (1920×1080 to 1536×2048, 0.07–0.38 MB each). They are NOT product renders and
 * they are NOT named after the price sheets: the folder calls them Tribute,
 * Serenity, Everlasting, Divine Rest and Heaven's Gate, while the 2026 sheets
 * sell White Rose, Angelica, Magnolia, Noble, Royal, Monarch, Majesty, Emperor,
 * Imperial and Lumina. NOBODY has reconciled the two lists, and guessing would
 * be exactly the dishonesty this product has avoided all along — so this module
 * does two things and nothing else:
 *
 *  1. it is the DESCRIPTION RECORD: `what` is what the photograph actually
 *     shows (casket or carriage or hall; glass or closed lid; the finish; what
 *     is in the background), read from the files themselves, not from their
 *     names;
 *  2. it is the PRESENTATION RULE: which surfaces may publish which photograph,
 *     and what each one must say about itself.
 *
 * Where a photograph genuinely depicts the thing named, it is published as the
 * client's photograph (`client-photo`). Where it is a judgement — a coffin
 * photographed for a different model, a set-up that is one example of an
 * arrangement the office builds to order — it carries the sheet's own sample
 * wording (`illustration-only`) and the mapping that chose it is written down in
 * `lib/media.ts` (`CASket_MODEL_PHOTOS`) so a reviewer can check the rule instead
 * of trusting the picture.
 *
 * Files: `scripts/build-client-photos.mjs` writes the derivatives under
 * `public/media/client/` and keeps the client's originals (byte-for-byte,
 * md5-pinned) in `media-sources/client-photos/` — deliberately OUTSIDE `public/`,
 * because seven of the twenty-one show identifiable mourners and the server must
 * never serve one. `tests/unit/client-photos.test.ts` pins every published file,
 * its dimensions and its honesty class.
 *
 * OPEN CLIENT QUESTION (opened with this import, 2026-09-19): which of these
 * photographs — if any — is the real White Rose / Angelica / Magnolia / Noble /
 * Royal / Monarch / Majesty / Emperor / Imperial / Lumina model? Until the client
 * answers, no page may name one of them as a named model.
 */

/** What a photograph depicts, as the record uses the word. */
export type ClientPhotoSubject =
  | "casket"
  | "hearse"
  | "chapel-hall"
  | "wake-setup";

/** The prose a photograph is published with. */
export type PhotoHonesty = "client-photo" | "illustration-only";

export type ClientPhoto = {
  /** Published slug — what the picture shows, never the client's folder name. */
  id: string;
  /** The client's own file name (provenance). */
  file: string;
  /** md5 of the source file, pinned by the build script. */
  md5: string;
  subject: ClientPhotoSubject;
  /** The record: what the photograph actually shows, read from the picture. */
  what: string;
  /** `client-photo` where the picture is the thing itself; otherwise the sheet's sample discipline. */
  honesty: PhotoHonesty;
  /** Alt text a screen reader gets — descriptive, never a model claim. */
  alt: string;
  /** A few words for a caption or a row label. */
  label: string;
  /** The published 4:3 crop, in the client's own pixels (before the build's resize). */
  cardWidth: number;
  /** The published 3:2 crop, in the client's own pixels (before the build's resize). */
  wideWidth: number;
};

/**
 * The 14 published photographs. `what` is deliberately concrete: it is the
 * evidence a reviewer checks a mapping against.
 */
export const CLIENT_PHOTOS = {
  "casket-white-gold-glass-lid": {
    id: "casket-white-gold-glass-lid",
    file: "Serenity full glcass.jpg",
    md5: "4a215541de64e47ca4d70a4fbbae12c4",
    subject: "casket",
    what:
      "A white metal casket with ornate gold handles and corner ornaments, photographed from the foot end in a chapel. The full-glass lid is raised on its stay and shows a white quilted interior with embroidered doves and a gold fringe. A crucifix and candlesticks stand behind it.",
    honesty: "illustration-only",
    alt:
      "A white casket with gold handles and a raised full-glass lid showing a white quilted interior with dove embroidery, in a chapel",
    label: "White and gold · full-glass lid raised",
    cardWidth: 1440,
    wideWidth: 1620,
  },
  "casket-white-gold-closed": {
    id: "casket-white-gold-closed",
    file: "Serenity full gass 2.jpg",
    md5: "8886926a952b5263ae1f7f5593dea753",
    subject: "casket",
    what:
      "The same white casket with ornate gold hardware, photographed with the full-glass lid closed; the glass panel reflects the chapel's crucifix and candlesticks. The body carries a moulded panel and gold handles along both sides.",
    honesty: "illustration-only",
    alt:
      "A white casket with ornate gold handles and a closed full-glass lid, photographed in a chapel with crucifixes behind",
    label: "White and gold · full-glass lid closed",
    cardWidth: 1440,
    wideWidth: 1620,
  },
  "casket-white-gold-wreath-lid": {
    id: "casket-white-gold-wreath-lid",
    file: "Divine Rest.jpg",
    md5: "8d88c55875674698bb7ad67bfa889fb2",
    subject: "casket",
    what:
      "A white casket with gold trim, its full-glass lid raised over a white-lined interior that carries a laurel wreath emblem on the head panel. A second, tan-and-gold casket stands behind it.",
    honesty: "illustration-only",
    alt:
      "A white casket with gold trim and a raised full-glass lid, its white interior carrying a laurel wreath emblem",
    label: "White and gold · full-glass lid, wreath interior",
    cardWidth: 1143,
    wideWidth: 1409,
  },
  "casket-wood-white-gold-bible-lid": {
    id: "casket-wood-white-gold-bible-lid",
    file: "Heaven_s Gate.jpg",
    md5: "c017cf528f221648e856effb662eb7be",
    subject: "casket",
    what:
      "A casket with a polished wood-tone shell, white side panels and gold handles and corner pieces. The published frame is the raised full-glass lid's own interior: white curtained panels embroidered with an open bible between candelabra, above the gold side handles.",
    honesty: "illustration-only",
    alt:
      "The raised full-glass lid of a wood-and-white casket, its white interior embroidered with an open bible between candelabra, above a gold side handle",
    label: "Wood and white · full-glass lid, bible interior",
    cardWidth: 900,
    wideWidth: 960,
  },
  "casket-white-open-lid": {
    id: "casket-white-open-lid",
    file: "Everlasting.jpg",
    md5: "28a34b3c358a519942d2e24c4ef4511d",
    subject: "casket",
    what:
      "A plain white casket with silver-toned ornaments, its lid raised, on a bier in a chapel hall with a tiled floor. Two more white caskets stand in the background, and the hall's candle stands and trolleys are visible behind.",
    honesty: "illustration-only",
    alt:
      "A plain white casket with silver ornaments and its lid raised on a bier, in a chapel hall with other caskets behind",
    label: "Plain white · lid raised",
    cardWidth: 2048,
    wideWidth: 2048,
  },
  "casket-white-closed": {
    id: "casket-white-closed",
    file: "Everlasting 2.jpg",
    md5: "b30f3ada56c8fd0ce8a51e8b69ca2be1",
    subject: "casket",
    what:
      "A plain white casket with a moulded lid and silver handle ornaments, photographed closed on its bier from the head end. A pink funeral tarp and a stand fan are visible behind it.",
    honesty: "illustration-only",
    alt: "A plain white casket with silver ornaments, photographed closed on its bier",
    label: "Plain white · closed lid",
    cardWidth: 1463,
    wideWidth: 1536,
  },
  "hearse-carriage-gold-side": {
    id: "hearse-carriage-gold-side",
    file: "Karwahe.jpg",
    md5: "2011d4981fa2e83207ca1d9f4b99962a",
    subject: "hearse",
    what:
      "The office's karwahe — a funeral carriage with a gold-leafed, glass-windowed casket compartment and a black canopy — banked with white chrysanthemums and greenery, standing on a village street in daylight.",
    honesty: "client-photo",
    alt:
      "The funeral carriage (karwahe) with its gold-leafed glass casket compartment, black canopy and white flower decorations, on a street",
    label: "The funeral carriage (karwahe)",
    cardWidth: 1536,
    wideWidth: 1536,
  },
  "hearse-carriage-gold-rear": {
    id: "hearse-carriage-gold-rear",
    file: "karwahe (2).jpg",
    md5: "46aeb174aac4f5e7a17e9e7069f924ae",
    subject: "hearse",
    what:
      "The same carriage from behind: the gold-leafed panel, its glass windows and the driver's seat under the black canopy, with a white chrysanthemum arrangement in the foreground and bunting over the street.",
    honesty: "client-photo",
    alt:
      "The funeral carriage from behind — gold-leafed panel, glass windows, driver's seat under the black canopy, white flowers in front",
    label: "The funeral carriage, from behind",
    cardWidth: 1371,
    wideWidth: 1536,
  },
  "chapel-hall-candle-pedestals": {
    id: "chapel-hall-candle-pedestals",
    file: "urn set up.jpg",
    md5: "1dde52a061f8c05b45990051e46cb923",
    subject: "chapel-hall",
    what:
      "A chapel hall: a white-clothed side table with two arrangements, five tall metal candle pedestals standing on a green carpet runner, and the hall's panelled platform with flags behind. No urn or casket is in the photograph.",
    honesty: "client-photo",
    alt:
      "A chapel hall with a white-draped table, tall candle pedestals on a green carpet runner and a panelled platform behind",
    label: "The chapel hall and its pedestals",
    cardWidth: 1950,
    wideWidth: 2048,
  },
  "chapel-hall-flags": {
    id: "chapel-hall-flags",
    file: "creamation urn set up.jpg",
    md5: "9639a146c8240b20afeb689a09bae5c9",
    subject: "chapel-hall",
    what:
      "The same hall from the front of the platform: the candle pedestals lit among the green carpet, the white table to the left, the hall's television screens on the walls. Again no urn is visible.",
    honesty: "client-photo",
    alt:
      "The chapel hall lit from the front, with candle pedestals on a green carpet, a draped white table and wall screens",
    label: "The chapel hall, from the platform",
    cardWidth: 1896,
    wideWidth: 2048,
  },
  "wake-setup-lamp-alcove": {
    id: "wake-setup-lamp-alcove",
    file: "our services (4).jpg",
    md5: "ceb07e819a35aaea57493641383ae883",
    subject: "wake-setup",
    what:
      "A decorated viewing alcove built by the office: purple and white drapes, hanging white and lilac sprays, lit lamp stands with floral tops and a lit figure on the central stand, over a green patterned carpet. Nobody is in the photograph.",
    honesty: "illustration-only",
    alt:
      "A decorated viewing alcove with purple and white drapes, hanging flowers and lit lamp stands over a green carpet",
    label: "A prepared viewing alcove",
    cardWidth: 1506,
    wideWidth: 1536,
  },
  "wake-setup-casket-draped": {
    id: "wake-setup-casket-draped",
    file: "our services (2).jpg",
    md5: "ec733a747c4e8a5ae7c9d58d4fa61d54",
    subject: "wake-setup",
    what:
      "A white casket with gold handles resting in a purple-draped alcove under garlands of white flowers, with a lit figure on its stand behind. Two people stand with their backs turned, dressing the set-up.",
    honesty: "illustration-only",
    alt:
      "A white casket with gold handles in a purple-draped alcove under white flower garlands, with two people arranging the set-up",
    label: "A casket in a draped viewing room",
    cardWidth: 1324,
    wideWidth: 1536,
  },
  "wake-setup-flower-bank": {
    id: "wake-setup-flower-bank",
    file: "our services (5).jpg",
    md5: "d53e5eaf46afc6b8bfcce5f7f1bd28d5",
    subject: "wake-setup",
    what:
      "A finished wake set-up: a white casket banked in white chrysanthemums and lilies under green foliage and purple-and-white drapes, with a framed portrait and a cross on the casket and a floral wreath at the side.",
    honesty: "illustration-only",
    alt:
      "A finished wake set-up — a white casket banked in white flowers under green foliage and purple drapes, with a framed portrait",
    label: "A finished wake set-up in flowers",
    cardWidth: 1396,
    wideWidth: 1536,
  },
  "wake-setup-dressing": {
    id: "wake-setup-dressing",
    file: "our services.jpg",
    md5: "cb9327ce7342899242d34b5d04e68e11",
    subject: "wake-setup",
    what:
      "The office's staff, seen from behind, hanging white flower sprays and arranging purple drapes over a white cloth backdrop — the set-up being built, before a family arrives.",
    honesty: "illustration-only",
    alt:
      "Two staff members seen from behind, hanging white flower sprays and arranging purple drapes over a white backdrop",
    label: "The set-up being built",
    cardWidth: 900,
    wideWidth: 1080,
  },
} as const satisfies Readonly<Record<string, ClientPhoto>>;

export type ClientPhotoId = keyof typeof CLIENT_PHOTOS;

/**
 * Imported but NOT published: the seven "Tribute" files are photographs of a
 * real wake — identifiable mourners' faces, and one screen naming the person
 * whose memorial it was. The product's own rule for memorial material is that
 * nothing about a family is published without consent (lib/memorials.ts), so
 * these stay out of every page and no web derivative is written; the originals
 * and their provenance remain in media-sources/client-photos/ (outside public/).
 *
 * The captain can publish any of them by moving the entry up into
 * CLIENT_PHOTOS and re-running scripts/build-client-photos.mjs.
 */
export const HELD_CLIENT_PHOTOS: ReadonlyArray<{
  id: string;
  file: string;
  why: string;
}> = [
  { id: "wake-home-memorial-video", file: "Tribute.jpg", why: "identifiable mourners and a named memorial poster" },
  { id: "wake-lantern-gathering", file: "Tribute (2).jpg", why: "identifiable mourners" },
  { id: "wake-eulogy-speaker", file: "Tribute (3).jpg", why: "identifiable mourners" },
  { id: "wake-evening-crowd", file: "Tribute (4).jpg", why: "identifiable mourners" },
  { id: "wake-memorial-screen", file: "Tribute (5).jpg", why: "a named memorial screen and identifiable mourners" },
  { id: "wake-night-visitation-a", file: "Tribute (6).jpg", why: "identifiable mourners" },
  { id: "wake-night-visitation-b", file: "Tribute (7).jpg", why: "identifiable mourners" },
];

/** The published candidate widths — the same list scripts/build-client-photos.mjs writes. */
export const CLIENT_PHOTO_CARD_WIDTHS = [440, 880] as const;
export const CLIENT_PHOTO_WIDE_WIDTHS = [960, 1600] as const;

/** One published size of a photograph. */
export type ClientPhotoVariant = {
  src: string;
  srcSet: string;
  /** The image's own pixel size at its widest published width. */
  width: number;
  height: number;
};

/** The photograph's record, from its id. */
export function clientPhoto(id: ClientPhotoId): ClientPhoto {
  return CLIENT_PHOTOS[id];
}

function variants(
  id: ClientPhotoId,
  role: "card" | "wide",
  widths: readonly number[],
  cropWidth: number,
  ratio: number,
): ClientPhotoVariant {
  const available = widths.filter((w) => w <= cropWidth);
  const list = available.length > 0 ? available : [cropWidth];
  const widest = list[list.length - 1];
  return {
    src: `/media/client/${id}-${role}-${widest}.webp`,
    srcSet: list.map((w) => `/media/client/${id}-${role}-${w}.webp ${w}w`).join(", "),
    width: widest,
    height: Math.round(widest / ratio),
  };
}

/** The 4:3 catalogue crop: rows, cards and small tiles. */
export function clientPhotoCard(id: ClientPhotoId): ClientPhotoVariant {
  const photo = CLIENT_PHOTOS[id];
  return variants(id, "card", CLIENT_PHOTO_CARD_WIDTHS, photo.cardWidth, 4 / 3);
}

/** The 3:2 feature crop: leads, heroes and detail figures. */
export function clientPhotoWide(id: ClientPhotoId): ClientPhotoVariant {
  const photo = CLIENT_PHOTOS[id];
  return variants(id, "wide", CLIENT_PHOTO_WIDE_WIDTHS, photo.wideWidth, 3 / 2);
}

/** A vetted photograph carries the client's own word; a sample carries the sheet's. */
export function clientPhotoNote(id: ClientPhotoId): string | undefined {
  return CLIENT_PHOTOS[id].honesty === "illustration-only"
    ? "Illustration purposes only — a sample from the client's own photographs."
    : undefined;
}
