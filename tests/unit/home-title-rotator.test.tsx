import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeTitleRotator } from "@/components/public/home-title-rotator";
import type { HomeTitleSet } from "@/lib/api-client/landing";

/**
 * The gateway's rotating title sets — the markup half (captain, 2026-10-02).
 *
 * `tests/unit/home-title-rotation.test.ts` proves the TIMING under fake timers;
 * this proves the band the server (and a no-JavaScript reader) actually gets:
 * ONE heading, the first set on screen, the rest stacked but hidden from
 * assistive tech, and no assertive live region. The client effect starts the
 * cross-fade after hydration.
 */

const SETS: HomeTitleSet[] = [
  { id: "title-1", headline: "We're here for you", promise: "any hour, any day." },
  { id: "title-2", headline: "We come to you", promise: "and stay until the burial is done." },
  { id: "title-3", headline: "The first park in Basilan", promise: "family-run, in Isabela City." },
];

const CSS = readFileSync(path.join(process.cwd(), "styles/components.css"), "utf8");

describe("the gateway title band", () => {
  it("renders the first set active and hides the rest from assistive tech", () => {
    const html = renderToStaticMarkup(
      createElement(HomeTitleRotator, { sets: SETS, intervalSeconds: 5 }),
    );
    // Exactly one h1 — the band's `aria-labelledby` target stays a heading.
    expect(html.match(/<h1/g)?.length).toBe(1);
    expect(html).toContain('id="home-gateway-title"');
    // The first set is the one the server paints (and a reduced-motion reader
    // keeps); it is the active grid cell.
    expect(html).toContain("home-title-set is-active");
    expect(html).toContain("here for you");
    expect(html).toContain("any hour, any day.");
    // The other sets are in the DOM for the cross-fade, hidden from the
    // heading's accessible name.
    const hidden = html.match(/aria-hidden="true"/g)?.length ?? 0;
    expect(hidden).toBe(SETS.length - 1);
  });

  it("does not announce the changing text in a live region", () => {
    const html = renderToStaticMarkup(
      createElement(HomeTitleRotator, { sets: SETS, intervalSeconds: 5 }),
    );
    expect(html).not.toContain("aria-live");
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain('role="alert"');
  });

  it("renders nothing for an empty set list (a broken hand-edited document)", () => {
    const html = renderToStaticMarkup(
      createElement(HomeTitleRotator, { sets: [], intervalSeconds: 5 }),
    );
    expect(html).toBe("");
  });

  it("stacks the sets in one grid cell with a cross-fade transition", () => {
    // The markup references these classes; fail if a stylesheet drop removes
    // their one definition (the "referenced, never defined" bug).
    expect(CSS).toMatch(/\.home-gateway__title--rotator\s*\{[^}]*display:\s*grid/);
    expect(CSS).toMatch(/\.home-title-set\s*\{[^}]*grid-area:\s*1\s*\/\s*1/);
    expect(CSS).toMatch(/\.home-title-set\s*\{[^}]*transition:\s*opacity/);
    expect(CSS).toMatch(/\.home-title-set\.is-active\s*\{[^}]*opacity:\s*1/);
  });
});
