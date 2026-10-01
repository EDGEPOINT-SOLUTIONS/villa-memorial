import { describe, expect, it } from "vitest";
import {
  buildPublishedMemorial,
  findPublishedMemorial,
  loadPublishedMemorials,
  memorialPhotoHref,
  memorialsLiveModeEnabled,
} from "@/lib/api-client/memorials";
import { readMemorialConsents } from "@/lib/api-client/memorial-store";
import {
  MEMORIAL_CONSENT_DEFAULT,
  MEMORIAL_FIELD_CHOICES,
  MEMORIAL_NEVER_SHOWN,
  MEMORIAL_PROMISES,
  MEMORIAL_PUBLIC_CHOICES,
  MEMORIAL_SEARCH_FIELD_MAX,
  MEMORIAL_SEARCHABLE,
  YEAR_FORMAT_ERROR,
  YEAR_ORDER_ERROR,
  hasMemorialSearch,
  matchMemorials,
  memorialLifeDatesDisplay,
  parseLifeDatesYears,
  parseMemorialSearch,
  type PublishedMemorial,
} from "@/lib/memorials";
import { TEST_MEMORIAL } from "@/tests/helpers/memorial-record";

/**
 * The digital memorial's rules (F-04) — the most sensitive surface in the
 * product. These tests pin the properties the pages promise:
 *
 *  · NOTHING IS PUBLISHED BY DEFAULT: one switch per loved one, off; every field
 *    off; an empty query lists nobody; a hidden year is unsearchable.
 *  · The family chooses each field: the name is always shown when the switch is
 *    on; the photograph, the birth year, the death year and the lot each appear
 *    only when chosen.
 *  · The living are never shown — the never-shown list carries that rule.
 */

function words(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

describe("the family's field choices", () => {
  it("offers exactly the four optional fields, each with a short meaning", () => {
    expect(MEMORIAL_FIELD_CHOICES.map((choice) => choice.key)).toEqual([
      "photo",
      "birth",
      "death",
      "lot",
    ]);
    for (const choice of MEMORIAL_FIELD_CHOICES) {
      expect(choice.label.length).toBeGreaterThan(0);
      expect(choice.meaning.length).toBeGreaterThan(0);
      expect(words(choice.meaning)).toBeLessThanOrEqual(20);
    }
  });

  it("names the image and the lot honestly, in the family's own words", () => {
    const byKey = Object.fromEntries(MEMORIAL_FIELD_CHOICES.map((c) => [c.key, c.meaning]));
    expect(byKey.photo).toContain("attached");
    expect(byKey.lot).toContain("private");
  });

  it("describes the same choices in a visitor's terms", () => {
    expect(MEMORIAL_PUBLIC_CHOICES.map((choice) => choice.id)).toEqual([
      "visible",
      "name",
      "photo",
      "dates",
      "lot",
    ]);
    for (const choice of MEMORIAL_PUBLIC_CHOICES) {
      expect(words(choice.meaning)).toBeLessThanOrEqual(30);
    }
  });

  it("defaults every field OFF", () => {
    expect(MEMORIAL_CONSENT_DEFAULT).toEqual({
      visible: false,
      show_photo: false,
      show_birth: false,
      show_death: false,
      show_lot: false,
    });
  });
});

describe("the life-date helpers", () => {
  it("prints only the years the family chose", () => {
    expect(memorialLifeDatesDisplay(1948, 2026)).toBe("1948 – 2026");
    expect(memorialLifeDatesDisplay(1948, null)).toBe("Born 1948");
    expect(memorialLifeDatesDisplay(null, 2026)).toBe("Died 2026");
    expect(memorialLifeDatesDisplay(null, null)).toBe("");
  });

  it("reads the office record's own display into two years", () => {
    expect(parseLifeDatesYears("1948 – 2026")).toEqual({ from: 1948, to: 2026 });
    expect(parseLifeDatesYears("1948-2026")).toEqual({ from: 1948, to: 2026 });
    expect(parseLifeDatesYears("1948")).toEqual({ from: 1948, to: null });
    expect(parseLifeDatesYears("")).toEqual({ from: null, to: null });
  });
});

describe("buildPublishedMemorial — the switch is the gate", () => {
  const base = {
    id: "person-1",
    name: "Example Person",
    lifeDatesDisplay: "1948 – 2026",
    restingPlace: { park: "Park", section: "A", lot: "A-01", plot: "A-001" },
    photo: { src: "/api/memorials/person-1/photo", alt: "Example Person" },
    publishedOn: "2026-09-30",
  };

  it("returns null whenever the switch is off, whatever the fields say", () => {
    expect(
      buildPublishedMemorial({ ...base, consent: { ...MEMORIAL_CONSENT_DEFAULT } }),
    ).toBeNull();
    expect(
      buildPublishedMemorial({
        ...base,
        consent: { ...MEMORIAL_CONSENT_DEFAULT, show_photo: true, show_birth: true },
      }),
    ).toBeNull();
  });

  it("makes a name-only memorial complete — no dates, no photo, no place", () => {
    const memorial = buildPublishedMemorial({
      ...base,
      consent: { ...MEMORIAL_CONSENT_DEFAULT, visible: true },
    });
    expect(memorial).toMatchObject({
      id: "person-1",
      name: "Example Person",
      life_dates: { from: null, to: null, display: "" },
      photo: null,
      resting_place: null,
      remembrance: [],
    });
  });

  it("shows each year only when the family chose it", () => {
    const born = buildPublishedMemorial({
      ...base,
      consent: { ...MEMORIAL_CONSENT_DEFAULT, visible: true, show_birth: true },
    });
    expect(born?.life_dates.display).toBe("Born 1948");

    const died = buildPublishedMemorial({
      ...base,
      consent: { ...MEMORIAL_CONSENT_DEFAULT, visible: true, show_death: true },
    });
    expect(died?.life_dates.display).toBe("Died 2026");

    const both = buildPublishedMemorial({
      ...base,
      consent: { ...MEMORIAL_CONSENT_DEFAULT, visible: true, show_birth: true, show_death: true },
    });
    expect(both?.life_dates.display).toBe("1948 – 2026");
  });

  it("shows the photograph and the resting place only when chosen", () => {
    const plain = buildPublishedMemorial({
      ...base,
      consent: { ...MEMORIAL_CONSENT_DEFAULT, visible: true },
    });
    expect(plain?.photo).toBeNull();
    expect(plain?.resting_place).toBeNull();

    const rich = buildPublishedMemorial({
      ...base,
      consent: { ...MEMORIAL_CONSENT_DEFAULT, visible: true, show_photo: true, show_lot: true },
    });
    expect(rich?.photo).toEqual(base.photo);
    expect(rich?.resting_place).toEqual({ park: "Park", section: "A", lot: "A-01", plot: "A-001" });
  });

  it("drops an un-chosen resting place even when the record carries one", () => {
    const memorial = buildPublishedMemorial({
      ...base,
      consent: { ...MEMORIAL_CONSENT_DEFAULT, visible: true, show_lot: false },
    });
    expect(memorial?.resting_place).toBeNull();
  });
});

describe("the search query", () => {
  it("trims and clamps untrusted input", () => {
    const long = "a".repeat(MEMORIAL_SEARCH_FIELD_MAX + 50);
    const { query, error } = parseMemorialSearch({ name: `  ${long}  `, born: " 1948 " });
    expect(error).toBeNull();
    expect(query.name).toHaveLength(MEMORIAL_SEARCH_FIELD_MAX);
    expect(query.born).toBe("1948");
  });

  it("takes the first value when a param repeats", () => {
    const { query } = parseMemorialSearch({ name: ["first", "second"] });
    expect(query.name).toBe("first");
  });

  it("refuses a year that is not four digits, with plain language", () => {
    expect(parseMemorialSearch({ born: "48" }).error).toBe(YEAR_FORMAT_ERROR);
    expect(parseMemorialSearch({ died: "twenty" }).error).toBe(YEAR_FORMAT_ERROR);
    expect(parseMemorialSearch({ born: "1948", died: "2026" }).error).toBeNull();
  });

  it("refuses a birth year after the death year", () => {
    expect(parseMemorialSearch({ born: "2026", died: "1948" }).error).toBe(YEAR_ORDER_ERROR);
  });

  it("knows when the visitor did not ask for anyone", () => {
    expect(hasMemorialSearch(parseMemorialSearch({}).query)).toBe(false);
    expect(hasMemorialSearch(parseMemorialSearch({ name: " " }).query)).toBe(false);
    expect(hasMemorialSearch(parseMemorialSearch({ died: "2026" }).query)).toBe(true);
  });
});

describe("matchMemorials is a search, never a directory", () => {
  it("lists nobody for an empty query", () => {
    expect(matchMemorials([TEST_MEMORIAL], parseMemorialSearch({}).query)).toEqual([]);
    expect(matchMemorials([TEST_MEMORIAL], parseMemorialSearch({ name: "  " }).query)).toEqual([]);
  });

  it("matches name words in any order, ignoring case and accents", () => {
    const memorial = { ...TEST_MEMORIAL, name: "María Dela Cruz" };
    const query = (name: string) => parseMemorialSearch({ name }).query;
    expect(matchMemorials([memorial], query("dela maria"))).toHaveLength(1);
    expect(matchMemorials([memorial], query("MARÍA"))).toHaveLength(1);
    expect(matchMemorials([memorial], query("maria cruz"))).toHaveLength(1);
    expect(matchMemorials([memorial], query("santos"))).toHaveLength(0);
  });

  it("matches the years on the record only", () => {
    const query = (born: string, died = "") => parseMemorialSearch({ born, died }).query;
    expect(matchMemorials([TEST_MEMORIAL], query("1948"))).toHaveLength(1);
    expect(matchMemorials([TEST_MEMORIAL], query("1948", "2026"))).toHaveLength(1);
    expect(matchMemorials([TEST_MEMORIAL], query("1949"))).toHaveLength(0);
    expect(matchMemorials([TEST_MEMORIAL], query("1948", "2025"))).toHaveLength(0);
  });

  it("cannot match a year the family hid", () => {
    const hidden = buildPublishedMemorial({
      id: "hidden",
      name: "Example Hidden",
      lifeDatesDisplay: "1948 – 2026",
      consent: { ...MEMORIAL_CONSENT_DEFAULT, visible: true, show_death: true },
      restingPlace: null,
      photo: null,
      publishedOn: null,
    }) as PublishedMemorial;
    expect(hidden.life_dates.from).toBeNull();
    expect(matchMemorials([hidden], parseMemorialSearch({ born: "1948" }).query)).toHaveLength(0);
    expect(matchMemorials([hidden], parseMemorialSearch({ died: "2026" }).query)).toHaveLength(1);
  });
});

describe("what the search reads and what it never shows", () => {
  it("keeps the searchable list short and free of people", () => {
    expect(MEMORIAL_SEARCHABLE.length).toBeGreaterThan(0);
    for (const item of MEMORIAL_SEARCHABLE) {
      expect(words(item)).toBeLessThanOrEqual(30);
    }
  });

  it("states the living are never shown, and the promises without a default", () => {
    const never = MEMORIAL_NEVER_SHOWN.join(" ");
    expect(never).toContain("Living relatives");
    expect(never).toContain("not switched on");
    expect(MEMORIAL_PROMISES.join(" ")).toContain("Nothing is published by default.");
  });
});

describe("the fixture store publishes nobody by default", () => {
  it("seeds no consent at all", async () => {
    expect(await readMemorialConsents()).toEqual([]);
    expect(await loadPublishedMemorials()).toEqual([]);
    expect(await findPublishedMemorial("anything")).toBeNull();
    expect(await findPublishedMemorial("%E0%A4%A")).toBeNull();
  });

  it("has no live branch to claim while the service does not exist", () => {
    expect(memorialsLiveModeEnabled()).toBe(false);
  });

  it("builds the public portrait URL for a chosen photograph", () => {
    expect(memorialPhotoHref("person-1", "2026-09-30T00:00:00.000Z")).toBe(
      "/api/memorials/person-1/photo?v=2026-09-30T00%3A00%3A00.000Z",
    );
  });
});
