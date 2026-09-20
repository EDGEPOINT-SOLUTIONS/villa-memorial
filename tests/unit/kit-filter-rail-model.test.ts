import { describe, expect, it } from "vitest";
import {
  clampRange,
  isDimmed,
  isSelected,
  resultSummary,
  selectedInGroup,
  totalSelected,
} from "@/components/kit/filter-rail-model";

/**
 * The pure decisions of the FilterRail: selection, counts, zero-dim and the price
 * clamp. Keeping these out of the component is what lets the component test stay
 * about markup and the filter behaviour stay unit-testable without a DOM.
 */

describe("selection", () => {
  const selected = { park: ["north", "south"], type: ["family"] };

  it("reports whether one value is on", () => {
    expect(isSelected(selected, "park", "north")).toBe(true);
    expect(isSelected(selected, "park", "east")).toBe(false);
    expect(isSelected(selected, "missing", "x")).toBe(false);
  });

  it("counts one group and the whole rail", () => {
    expect(selectedInGroup(selected, "park")).toBe(2);
    expect(selectedInGroup(selected, "missing")).toBe(0);
    expect(totalSelected(selected)).toBe(3);
  });
});

describe("a zero count is dimmed, never hidden", () => {
  it("dims only a non-positive count", () => {
    expect(isDimmed(0)).toBe(true);
    expect(isDimmed(-1)).toBe(true);
    expect(isDimmed(1)).toBe(false);
  });
});

describe("the price range is clamped to the data", () => {
  const bounds = { min: 100, max: 900 };

  it("keeps a value inside the bounds", () => {
    expect(clampRange({ min: 50, max: 1000 }, bounds)).toEqual({ min: 100, max: 900 });
  });

  it("never lets min cross max", () => {
    expect(clampRange({ min: 800, max: 200 }, bounds)).toEqual({ min: 800, max: 800 });
  });
});

describe("the result wording", () => {
  it("is singular for one and plural otherwise", () => {
    expect(resultSummary(1)).toBe("1 result");
    expect(resultSummary(0)).toBe("0 results");
    expect(resultSummary(12)).toBe("12 results");
  });
});
