import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The home ships a stylesheet — the regression this pins.
 *
 * The rebuilt home (`components/public/home-page.tsx`, 2026-09-27) shipped its
 * markup with NO CSS: `git log -S "home-fork" -- styles/components.css` is empty,
 * so `/` rendered as raw, unstyled HTML for the life of the rebuild. Nothing
 * caught it — `public-page-budget` only checks that the sections RENDER, not that
 * they are styled. This is the class check the home was missing, the same shape as
 * `admin-portal-sweep.test.ts` for the staff portal: every `home-*` class used in
 * the component must have a rule (or be a styled BEM root) in the stylesheets.
 */

const ROOT = process.cwd();
const SOURCE = readFileSync(path.join(ROOT, "components/public/home-page.tsx"), "utf8");
const CSS = ["styles/components.css", "styles/base.css", "styles/utilities.css"]
  .map((file) => readFileSync(path.join(ROOT, file), "utf8"))
  .join("\n");

/** Every `home…` class token a `className=` literal or template names. */
function homeTokens(source: string): string[] {
  const found = new Set<string>();
  for (const match of source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    for (const token of (match[1] ?? match[2] ?? "").split(/\s+/)) {
      if (/^home(-|$)/.test(token)) found.add(token);
    }
  }
  return [...found];
}

describe("the home ships its stylesheet", () => {
  const defined = new Set([...CSS.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]));
  const namespaces = new Set<string>();
  for (const m of CSS.matchAll(/\.([A-Za-z_][\w-]*?)__/g)) namespaces.add(m[1]);
  for (const m of CSS.matchAll(/\.([A-Za-z_][\w-]*?)--/g)) namespaces.add(m[1]);

  it("uses a real set of home classes (the check cannot pass vacuously)", () => {
    expect(homeTokens(SOURCE).length).toBeGreaterThan(20);
  });

  it("every home class has a rule, or is a styled BEM root", () => {
    const offenders = homeTokens(SOURCE)
      .filter((token) => !defined.has(token) && !namespaces.has(token))
      .sort();
    expect(offenders, `no stylesheet rule for:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("covers every section the page blueprint pins", () => {
    for (const section of [
      "home-hero",
      "home-qualify",
      "home-fork",
      "home-park",
      "home-feel",
    ]) {
      expect(defined.has(section), section).toBe(true);
    }
  });
});
