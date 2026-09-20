/**
 * The five plan tiers are ONE comparison row on desktop (captain 2026-09-21:
 * "the five tier plan make it 5 plan per row").
 *
 * Vitest runs in node, so nothing here can measure real layout. What this gate
 * can do is pin the DECLARATIONS that make the row work — the wrap ladder
 * (2 → 3 → 4 → 5 across), the single-stack card, the stepped-down display type
 * and the bottom-aligned feature blocks — so the next edit that drops one fails
 * here instead of in front of the captain.
 */
import { describe, expect, it } from "vitest";
import { parseCss, readStyle } from "../helpers/css-rules";

const RULES = parseCss(readStyle("styles/components.css"));
const ruleFor = (selector: string, media?: string) =>
  RULES.find((r) => r.selector === selector && (media ? r.media === media : r.depth === 0));
const columnsFor = (media: string) =>
  ruleFor(".plan-tiers", media)?.body.match(/grid-template-columns:\s*([^;]+);/)?.[1].trim();

describe("the five plan tiers are one row on desktop", () => {
  it("stacks the cards as a single column on phones", () => {
    const base = ruleFor(".plan-tiers");
    expect(base?.body).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(base?.body).toMatch(/gap:\s*var\(--space-4\)/);
  });

  it("wraps deliberately: 2 → 3 → 4 → 5 across", () => {
    expect(columnsFor("@media (min-width: 40rem)")).toBe("repeat(2, minmax(0, 1fr))");
    expect(columnsFor("@media (min-width: 60rem)")).toBe("repeat(3, minmax(0, 1fr))");
    expect(columnsFor("@media (min-width: 72rem)")).toBe("repeat(4, minmax(0, 1fr))");
    expect(columnsFor("@media (min-width: 86rem)")).toBe("repeat(5, minmax(0, 1fr))");
  });

  it("keeps every card one vertical stack (never the old two-column split)", () => {
    const card = ruleFor(".plan-tier");
    expect(card?.body).toMatch(/display:\s*flex/);
    expect(card?.body).toMatch(/flex-direction:\s*column/);
    // The retired ≥56rem template must not come back on any card rule.
    expect(
      RULES.some((r) => r.selector === ".plan-tier" && /grid-template-columns/.test(r.body)),
    ).toBe(false);
    // ...nor the two-column feature list.
    expect(ruleFor(".plan-tier__list")?.body).not.toMatch(/repeat\(auto-fit/);
  });

  it("steps the name and the rate down one ladder rung on the five-row", () => {
    const fiveRow = (selector: string, property: string) => {
      const body = RULES.find(
        (r) => r.selector === selector && r.media === "@media (min-width: 86rem)",
      )?.body;
      return body?.match(new RegExp(`${property}:\\s*([^;]+);`))?.[1].trim();
    };
    expect(fiveRow(".plan-tier__name", "font-size")).toBe("var(--text-xl)");
    expect(fiveRow(".plan-tier__price", "font-size")).toBe("var(--text-2xl)");
  });

  it("bottom-aligns the feature blocks so the 'Key features:' headers line up", () => {
    expect(ruleFor(".plan-tier__features")?.body).toMatch(/margin-top:\s*auto/);
  });

  it("keeps the optional photograph a 16:9 leading band", () => {
    expect(ruleFor(".plan-tier__media")?.body).toMatch(/aspect-ratio:\s*16\s*\/\s*9/);
  });
});
