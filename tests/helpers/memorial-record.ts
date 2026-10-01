import type { PublishedMemorial } from "@/lib/memorials";

/**
 * TEST-ONLY published-memorial shapes.
 *
 * The app ships NO published record until a family switches one on
 * (`lib/fixtures/memorials/memorials.json` seeds every consent OFF). These
 * objects exist so the real `MemorialProfile` and the real detail route can be
 * proven to render a family-published record correctly; they are never imported
 * by app code, and the names are unmistakably test records, not people.
 */
export const TEST_MEMORIAL: PublishedMemorial = {
  id: "test-memorial-record",
  name: "Example Memorial Record",
  life_dates: { from: 1948, to: 2026, display: "1948 – 2026" },
  remembrance: [
    "A test line kept short for the page gauge.",
    "The family's second line stands here — still no real person.",
  ],
  photo: null,
  resting_place: { park: "Sanctuario de Mercedes y Gloria", section: "A", lot: "A-01" },
  published_on: "2026-09-18",
};

/** The same record with a family photograph attached — proves the img branch. */
export const TEST_MEMORIAL_WITH_PHOTO: PublishedMemorial = {
  ...TEST_MEMORIAL,
  photo: { src: "/media/hero-1.jpg", alt: "A family-supplied test image" },
};

/** A name-only memorial — no dates, no photograph, no resting place. */
export const TEST_MEMORIAL_NAME_ONLY: PublishedMemorial = {
  id: "test-name-only-record",
  name: "Example Name Only",
  life_dates: { from: null, to: null, display: "" },
  remembrance: [],
  photo: null,
  resting_place: null,
  published_on: "2026-09-30",
};
