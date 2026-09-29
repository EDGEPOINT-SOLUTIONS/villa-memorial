import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The home ships its stylesheet — the regression this pins.
 *
 * The home is the ONE public surface with its own design language and its own
 * scoped stylesheet (`styles/home.css`, rebuilt 2026-09-29 to the captain's
 * reference page). Its classes all carry the `vf-` (Villa Funeraria) prefix and
 * are scoped under `.vf-home`, so nothing on the home can reach another page.
 *
 * The reproduction this guards: the previous home (`components/public/home-page.tsx`,
 * 2026-09-27) shipped its markup with NO CSS — `git log -S "home-fork" --
 * styles/components.css` is empty — so `/` rendered as raw, unstyled HTML.
 * Nothing caught it. This is the class check that was missing: every `vf-` class
 * a home component names must have a rule in `styles/home.css`.
 */

const ROOT = process.cwd();
const SOURCES = [
  "components/public/home-page.tsx",
  "components/public/home-plot-map.tsx",
].map((file) => readFileSync(path.join(ROOT, file), "utf8"));
const CSS = readFileSync(path.join(ROOT, "styles/home.css"), "utf8");

/** Every `vf-…` identifier a home component names (dynamic BEM suffixes included). */
function vfTokens(source: string): string[] {
  const found = new Set<string>();
  for (const match of source.matchAll(/(?<!data-)\bvf-[a-z0-9-]+/g)) {
    const token = match[0].replace(/-+$/, "");
    if (token.length > 3) found.add(token);
  }
  return [...found];
}

describe("the home ships its stylesheet", () => {
  const defined = new Set([...CSS.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]));
  const namespaces = new Set<string>();
  for (const m of CSS.matchAll(/\.([A-Za-z_][\w-]*?)__/g)) namespaces.add(m[1]);
  for (const m of CSS.matchAll(/\.([A-Za-z_][\w-]*?)--/g)) namespaces.add(m[1]);
  const tokens = [...new Set(SOURCES.flatMap(vfTokens))];

  it("uses a real set of vf- classes (the check cannot pass vacuously)", () => {
    expect(tokens.length).toBeGreaterThan(20);
  });

  it("every vf- class has a rule, or is a styled BEM root", () => {
    const offenders = tokens
      .filter((token) => !defined.has(token) && !namespaces.has(token))
      .sort();
    expect(offenders, `no stylesheet rule for:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("covers every band the home blueprint pins", () => {
    for (const band of [
      "vf-hero",
      "vf-trust",
      "vf-two",
      "vf-steps",
      "vf-services",
      "vf-caskets",
      "vf-plans",
      "vf-park",
      "vf-feel",
      "vf-cta",
      "vf-footer",
    ]) {
      expect(defined.has(band), band).toBe(true);
    }
  });
});
