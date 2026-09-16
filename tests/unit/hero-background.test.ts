import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  HERO_BACKGROUND_FIRST_PICK_TRANSPARENCY,
  HERO_BACKGROUND_PALETTE,
  HERO_BACKGROUND_TRANSPARENT,
  heroBackgroundLayer,
  heroBackgroundPick,
  isValidCssColor,
  readHeroTransparency,
} from "@/lib/landing/hero-background";

/**
 * Hero background theming (captain's brief, 2026-09-17): the staff editor's
 * colour changer must publish only valid CSS colours and a 0–100 transparency,
 * and the public hero must render the shipped look untouched for documents
 * that never used the fields. These tests pin the pure helpers the model and
 * the view share (the model round-trip lives in
 * tests/fixture-contract/landing.test.ts).
 */

describe("isValidCssColor accepts exactly the CSS colour literals staff may publish", () => {
  const valid = [
    "#fff",
    "#FFF",
    "#ffffff",
    "#c4e6f8",
    "#0d2c42cc",
    "rgb(63 151 209)",
    "rgb(63, 151, 209)",
    "rgba(63, 151, 209, 0.4)",
    "hsl(210 50% 60%)",
    "hsl(210deg 50% 60%)",
    "hwb(210 20% 30%)",
    "skyblue",
    "REBECCAPURPLE",
    " transparent ",
  ];
  for (const value of valid) {
    it(`accepts ${JSON.stringify(value)}`, () => {
      expect(isValidCssColor(value)).toBe(true);
    });
  }

  const invalid = [
    "",
    "   ",
    "#12",
    "#12345",
    "123456",
    "3f97d1",
    "not-a-colour",
    "url(https://evil.test/x.png)",
    "var(--sky-500)",
    "red; background: url(x)",
    "color-mix(in srgb, red, blue)",
    "rgb(1, 2",
    "rgb(face 1 1)",
    "hsl(210 50% 60% / 0.5) url(x)",
  ];
  for (const value of invalid) {
    it(`rejects ${JSON.stringify(value)}`, () => {
      expect(isValidCssColor(value)).toBe(false);
    });
  }
});

describe("readHeroTransparency", () => {
  it("keeps 0 and 100, the legal bounds", () => {
    expect(readHeroTransparency(0)).toBe(0);
    expect(readHeroTransparency(HERO_BACKGROUND_TRANSPARENT)).toBe(100);
  });

  it("defaults a missing field (legacy document) to fully transparent", () => {
    expect(readHeroTransparency(undefined)).toBe(100);
    expect(readHeroTransparency(null)).toBe(100);
    expect(readHeroTransparency("40")).toBe(100);
  });

  it("clamps out-of-range and non-finite values instead of crashing the page", () => {
    expect(readHeroTransparency(-5)).toBe(0);
    expect(readHeroTransparency(250)).toBe(100);
    expect(readHeroTransparency(Number.NaN)).toBe(100);
    expect(readHeroTransparency(Number.POSITIVE_INFINITY)).toBe(100);
    expect(readHeroTransparency(55.6)).toBe(56);
  });
});

describe("heroBackgroundLayer", () => {
  it("renders no layer at all for legacy / untouched documents", () => {
    expect(heroBackgroundLayer({ background: null, backgroundTransparency: 100 })).toBeNull();
    expect(heroBackgroundLayer({ background: null, backgroundTransparency: 0 })).toBeNull();
    expect(heroBackgroundLayer({ background: "#3f97d1", backgroundTransparency: 100 })).toBeNull();
  });

  it("moves smoothly from fully opaque (0%) to fully transparent (100%)", () => {
    expect(heroBackgroundLayer({ background: "#3f97d1", backgroundTransparency: 0 })).toEqual({
      background: "#3f97d1",
      opacity: 1,
    });
    expect(heroBackgroundLayer({ background: "#3f97d1", backgroundTransparency: 40 })).toEqual({
      background: "#3f97d1",
      opacity: 0.6,
    });
    expect(heroBackgroundLayer({ background: "#3f97d1", backgroundTransparency: 99 })).toEqual({
      background: "#3f97d1",
      opacity: 0.01,
    });
  });

  it("never trusts an invalid colour from content — no layer, nothing rendered", () => {
    expect(
      heroBackgroundLayer({ background: "url(https://evil.test/x.png)", backgroundTransparency: 0 }),
    ).toBeNull();
    expect(heroBackgroundLayer({ background: "  ", backgroundTransparency: 0 })).toBeNull();
  });

  it("trims the stored colour", () => {
    expect(heroBackgroundLayer({ background: " #3f97d1 ", backgroundTransparency: 25 })).toEqual({
      background: "#3f97d1",
      opacity: 0.75,
    });
  });
});

describe("heroBackgroundPick starts staff at a visible layer", () => {
  it("picking a colour when the document had none starts below full transparency", () => {
    expect(
      heroBackgroundPick({ background: null, backgroundTransparency: 100 }, "#c4e6f8"),
    ).toEqual({ background: "#c4e6f8", backgroundTransparency: HERO_BACKGROUND_FIRST_PICK_TRANSPARENCY });
  });

  it("keeps the staff's slider on every later pick", () => {
    expect(
      heroBackgroundPick({ background: "#c4e6f8", backgroundTransparency: 15 }, "#22699a"),
    ).toEqual({ background: "#22699a", backgroundTransparency: 15 });
    // A transparency the staff moved BEFORE picking a colour is respected too.
    expect(
      heroBackgroundPick({ background: null, backgroundTransparency: 20 }, "#22699a"),
    ).toEqual({ background: "#22699a", backgroundTransparency: 20 });
  });
});

describe("the editor palette mirrors styles/tokens.css", () => {
  it("every swatch is a valid colour with a unique token, name and value", () => {
    const values = HERO_BACKGROUND_PALETTE.map((entry) => entry.value);
    expect(new Set(values).size).toBe(values.length);
    expect(new Set(HERO_BACKGROUND_PALETTE.map((entry) => entry.token)).size).toBe(values.length);
    for (const entry of HERO_BACKGROUND_PALETTE) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(isValidCssColor(entry.value)).toBe(true);
      expect(entry.value).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("pins each swatch value to the hex declared by its token in tokens.css", () => {
    const css = readFileSync(new URL("../../styles/tokens.css", import.meta.url), "utf8");
    for (const entry of HERO_BACKGROUND_PALETTE) {
      const match = new RegExp(`^\\s*${entry.token}:\\s*(#[0-9a-fA-F]{6})\\s*;`, "m").exec(css);
      expect(match, `${entry.token} must exist in styles/tokens.css`).not.toBeNull();
      expect(match?.[1].toLowerCase()).toBe(entry.value.toLowerCase());
    }
  });
});
