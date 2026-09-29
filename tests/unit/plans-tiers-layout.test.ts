/**
 * The five plan tiers are ONE comparison row on desktop, ALL ONE HEIGHT
 * (rebuilt 2026-09-30 by `villa-plans-redesign-plan`; the captain approved the
 * Revision 4 board).
 *
 * Vitest runs in node, so nothing here can measure real layout. What this gate
 * can do is pin the DECLARATIONS that make the row work — the wrap ladder
 * (2 → 3 → 4 → 5 across), the single-stack card, the one-height rule (the grid
 * stretches and the action is bottom-aligned), the whole 3:2 photograph plate,
 * and the premium gold spine.
 */
import { describe, expect, it } from "vitest";
import { parseCss, readStyle } from "../helpers/css-rules";

const RULES = parseCss(readStyle("styles/components.css"));
const ruleFor = (selector: string, media?: string) =>
  RULES.find((r) => r.selector === selector && (media ? r.media === media : r.depth === 0));
const columnsFor = (media: string) =>
  ruleFor(".plan-tiers", media)?.body.match(/grid-template-columns:\s*([^;]+);/)?.[1].trim();

describe("the five plan tiers are one row of equal height on desktop", () => {
  it("stacks by default, then becomes a phone snap rail below 40rem", () => {
    const base = ruleFor(".plan-tiers");
    expect(base?.body).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(base?.body).toMatch(/gap:\s*var\(--space-4\)/);
    expect(base?.body).toMatch(/align-items:\s*stretch/);
    // The approved board's phone behaviour: ONE horizontal snap rail of
    // equal-height columns (each ~76% wide), not five stacked full cards.
    const phone = ruleFor(".plan-tiers", "@media (max-width: 40rem)");
    expect(phone?.body).toMatch(/display:\s*flex/);
    expect(phone?.body).toMatch(/overflow-x:\s*auto/);
    expect(phone?.body).toMatch(/scroll-snap-type:\s*x mandatory/);
    const phoneCard = ruleFor(".plan-tier", "@media (max-width: 40rem)");
    expect(phoneCard?.body).toMatch(/flex:\s*0 0 76%/);
    expect(phoneCard?.body).toMatch(/min-width:\s*76%/);
    expect(phoneCard?.body).toMatch(/scroll-snap-align:\s*start/);
  });

  it("wraps deliberately: 2 → 3 → 4 → 5 across", () => {
    expect(columnsFor("@media (min-width: 40rem)")).toBe("repeat(2, minmax(0, 1fr))");
    expect(columnsFor("@media (min-width: 60rem)")).toBe("repeat(3, minmax(0, 1fr))");
    expect(columnsFor("@media (min-width: 72rem)")).toBe("repeat(4, minmax(0, 1fr))");
    expect(columnsFor("@media (min-width: 86rem)")).toBe("repeat(5, minmax(0, 1fr))");
  });

  it("keeps every card one vertical stack at the full row height", () => {
    const card = ruleFor(".plan-tier");
    expect(card?.body).toMatch(/display:\s*flex/);
    expect(card?.body).toMatch(/flex-direction:\s*column/);
    expect(card?.body).toMatch(/height:\s*100%/);
    // The retired two-column template must not come back on any card rule.
    expect(
      RULES.some((r) => r.selector === ".plan-tier" && /grid-template-columns/.test(r.body)),
    ).toBe(false);
  });

  it("bottom-aligns the action so the five actions share a baseline", () => {
    expect(ruleFor(".plan-tier__act")?.body).toMatch(/margin-top:\s*auto/);
  });

  it("keeps the coffin photograph a WHOLE 3:2 plate (never a crop)", () => {
    expect(ruleFor(".plan-tier__media")?.body).toMatch(/aspect-ratio:\s*3\s*\/\s*2/);
    expect(ruleFor(".plan-tier__media img")?.body).toMatch(/object-fit:\s*contain/);
  });

  it("keeps the rate at body+1 with the premium gold spine", () => {
    expect(ruleFor(".plan-tier__price")?.body).toMatch(/font-size:\s*var\(--text-lg\)/);
    expect(ruleFor(".plan-tier::before")?.body).toMatch(/background:\s*var\(--gold-500\)/);
  });
});
