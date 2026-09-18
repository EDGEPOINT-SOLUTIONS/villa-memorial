import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ApiError } from "@/lib/api-client/api-error";
import {
  findPublishedMemorial,
  loadPublishedMemorials,
  memorialsFromFile,
  memorialsLiveModeEnabled,
  publishedMemorials,
} from "@/lib/api-client/memorials";
import {
  MEMORIAL_NEVER_SHOWN,
  MEMORIAL_PROMISES,
  MEMORIAL_SEARCHABLE,
  MEMORIAL_SEARCH_FIELD_MAX,
  MEMORIAL_VISIBILITY,
  YEAR_FORMAT_ERROR,
  YEAR_ORDER_ERROR,
  familyVisibilityLabel,
  hasMemorialSearch,
  matchMemorials,
  memorialFirstLine,
  memorialRestingLine,
  parseMemorialSearch,
  type PublishedMemorial,
} from "@/lib/memorials";
import { TEST_MEMORIAL } from "@/tests/helpers/memorial-record";

/**
 * The digital memorial's rules (F-04) — the most sensitive surface in the
 * product. These tests pin the properties the pages promise:
 *
 *  · NOTHING IS PUBLISHED BY DEFAULT and the search is never a directory: an
 *    empty query lists nobody, and a non-published record can never become a
 *    public shape.
 *  · The three visibility choices stay the same three the FAMILY PORTAL names
 *    (this file reads that page and fails on drift).
 *  · The living are never shown — the never-shown list carries that rule, and
 *    the fixture ships no person at all.
 */
const ROOT = fileURLToPath(new URL("../..", import.meta.url));

function words(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

describe("the three visibility choices", () => {
  it("has exactly the three choices, in the family portal's order", () => {
    expect(MEMORIAL_VISIBILITY.map((choice) => choice.id)).toEqual([
      "private",
      "family",
      "published",
    ]);
    for (const choice of MEMORIAL_VISIBILITY) {
      expect(choice.visitorLabel.length).toBeGreaterThan(0);
      expect(choice.meaning.length).toBeGreaterThan(0);
      expect(words(choice.meaning)).toBeLessThanOrEqual(30);
    }
  });

  it("keeps every visitor word the public pages print", () => {
    expect(MEMORIAL_VISIBILITY.map((choice) => choice.visitorLabel)).toEqual([
      "Kept private",
      "Family only",
      "Published",
    ]);
  });

  it("matches the family portal's own words — drift fails here", () => {
    // The family screen is the authority for the family-facing labels; if it is
    // reworded, this test names the choice that drifted.
    const familyPage = readFileSync(
      path.join(ROOT, "app", "(family)", "client", "memorials", "page.tsx"),
      "utf8",
    );
    for (const choice of MEMORIAL_VISIBILITY) {
      expect(
        familyPage,
        `the family portal no longer names “${choice.familyLabel}” for ${choice.id}`,
      ).toContain(choice.familyLabel);
    }
    expect(familyVisibilityLabel("private")).toBe("Only your family");
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
    expect(never).toContain("kept private");
    expect(never).toContain("has not published");
    expect(MEMORIAL_PROMISES.join(" ")).toContain("Nothing is published by default.");
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
});

describe("the reader only ever serves a published record", () => {
  const publishedRaw = {
    id: "record-1",
    name: "Example Memorial Record",
    visibility: "published",
    life_dates: { from: 1948, to: 2026, display: "1948 – 2026" },
    remembrance: ["One test line."],
    photo: null,
    resting_place: { park: "Park", section: "A", lot: "A-01" },
    published_on: "2026-09-18",
  };

  const withVisibility = (visibility: unknown): PublishedMemorial[] =>
    memorialsFromFile({ memorials: [{ ...publishedRaw, visibility }] });

  it("serves a published record and builds its shape field by field", () => {
    const [memorial] = withVisibility("published");
    expect(memorial.name).toBe("Example Memorial Record");
    expect(memorial.life_dates.display).toBe("1948 – 2026");
    expect(memorialFirstLine(memorial)).toBe("One test line.");
    expect(memorialRestingLine(memorial)).toBe("Park · Section A · Lot A-01");
  });

  it("drops every visibility that is not published, and anything unknown", () => {
    expect(withVisibility("private")).toEqual([]);
    expect(withVisibility("family")).toEqual([]);
    expect(withVisibility(null)).toEqual([]);
    expect(withVisibility(undefined)).toEqual([]);
    expect(withVisibility("visibility-not-in-the-vocabulary")).toEqual([]);
  });

  it("fails loudly on a malformed PUBLISHED record instead of half-rendering", () => {
    expect(() =>
      memorialsFromFile({ memorials: [{ ...publishedRaw, name: "" }] }),
    ).toThrowError(ApiError);
    expect(() =>
      memorialsFromFile({ memorials: [{ ...publishedRaw, life_dates: { display: "" } }] }),
    ).toThrowError(ApiError);
    expect(() => memorialsFromFile({ memorials: "not-an-array" })).toThrowError(ApiError);
  });

  it("serves the recorded fixture state: no published memorial at all", () => {
    expect(publishedMemorials()).toEqual([]);
    expect(findPublishedMemorial("anything")).toBeNull();
    expect(findPublishedMemorial("%E0%A4%A")).toBeNull();
  });

  it("has no live branch to claim while the service does not exist", async () => {
    expect(memorialsLiveModeEnabled()).toBe(false);
    await expect(loadPublishedMemorials()).resolves.toEqual([]);
  });
});
