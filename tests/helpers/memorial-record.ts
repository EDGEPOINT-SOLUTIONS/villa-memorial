import type { PublishedMemorial } from "@/lib/memorials";

/**
 * A TEST-ONLY published-memorial shape.
 *
 * The app ships NO published record while the digital-memorial service does not
 * exist (`lib/fixtures/memorials/memorials.json` is deliberately empty, and
 * nothing may be fabricated on a public page). This object exists so the real
 * `MemorialProfile` and the real detail route can be proven to render a
 * family-published record correctly; it is never imported by app code, and its
 * name is unmistakably a test record, not a person.
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
