/**
 * Park map plot labels — overview density (type-voice decision, 2026-09-18).
 *
 * The product raised every label to the 12px ladder floor; at the whole-park
 * overview that made the legend-type line (repeated on every plot, and already
 * named by the legend below the map) bury the lot codes. The rule lives in
 * lib/park-maps.ts so the canvas and this test share it: the type line is
 * hidden at the overview and one step out, and returns when the visitor zooms
 * in. The lot code and owner always stay.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { labelsTightAt } from "@/lib/park-maps";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

describe("labelsTightAt", () => {
  it("is tight at the overview and one zoom step out", () => {
    expect(labelsTightAt(3, 3)).toBe(true); // whole-park overview
    expect(labelsTightAt(2, 3)).toBe(true); // one step out
    expect(labelsTightAt(4, 3)).toBe(true); // one step in — still no room
  });

  it("shows the full label once the visitor zooms past the overview", () => {
    expect(labelsTightAt(5, 3)).toBe(false);
    expect(labelsTightAt(8, 3)).toBe(false);
  });

  it("keeps working at fractional zoom levels", () => {
    expect(labelsTightAt(3.5, 3)).toBe(true);
    expect(labelsTightAt(4.5, 3)).toBe(false);
  });
});

describe("the canvas + stylesheet wiring", () => {
  const canvas = read("components/parks-canvas.tsx");
  const css = read("styles/components.css");

  it("lets the canvas set the tight state and refresh it on zoom", () => {
    expect(canvas).toContain('data-label-density');
    expect(canvas).toContain('map.on("zoomend", updateLabelDensity)');
    expect(canvas).toContain("labelsTightAt(map.getZoom(), overview)");
  });

  it("hides only the type line in the tight state (code + owner stay)", () => {
    expect(css).toMatch(
      /\.geo-map\[data-label-density="tight"\] \.plot-label__type \{[\s\S]*?display: none;/,
    );
    expect(css).not.toMatch(/data-label-density="tight"\] \.plot-label__(code|owner)/);
  });
});
