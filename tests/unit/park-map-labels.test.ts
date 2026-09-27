/**
 * Park map plot labels — overview density (captain's home review, 2026-09-21).
 *
 * The captain called the home preview's plot names "text that are so not good in
 * the eye". The placeholder inventory puts ~140 plots on the Villa masterplan,
 * and the home draws them a few pixels apart, so a code on every plot smeared
 * into an unreadable wall. A label is now painted only once its OWN plot is wide
 * enough to carry one (rule in lib/park-maps.ts `labelDensityFor`) — so the
 * canvas, the CSS and this test share one rule.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LABEL_FULL_PLOT_PX, LABEL_MIN_PLOT_PX, labelDensityFor } from "@/lib/park-maps";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");

describe("labelDensityFor", () => {
  it("paints nothing for a plot too small to carry a label", () => {
    expect(labelDensityFor(0)).toBe("off");
    expect(labelDensityFor(LABEL_MIN_PLOT_PX - 1)).toBe("off");
    expect(labelDensityFor(Number.NaN)).toBe("off");
  });

  it("shows the code alone once the plot has room for it", () => {
    expect(labelDensityFor(LABEL_MIN_PLOT_PX)).toBe("code");
    expect(labelDensityFor(LABEL_FULL_PLOT_PX - 1)).toBe("code");
  });

  it("shows the full label (type line + owner) once the plot is wide enough", () => {
    expect(labelDensityFor(LABEL_FULL_PLOT_PX)).toBe("full");
    expect(labelDensityFor(400)).toBe("full");
  });

  it("keeps the thresholds in a useful order", () => {
    expect(LABEL_MIN_PLOT_PX).toBeGreaterThan(0);
    expect(LABEL_FULL_PLOT_PX).toBeGreaterThan(LABEL_MIN_PLOT_PX);
  });
});

describe("the canvas + stylesheet wiring", () => {
  const canvas = read("components/parks-canvas.tsx");
  const css = read("styles/components.css");

  it("computes a per-plot density and refreshes it on zoom and after a redraw", () => {
    expect(canvas).toContain("labelDensityFor(set.widthUnits * pxPerUnit)");
    expect(canvas).toContain('map.on("zoomend", applyLabelDensity)');
    expect(canvas).toContain("plotWidthUnits(area)");
    expect(canvas).toContain("applyLabelDensity();\n  }, [areas, selectedCode, parkId, mode, legendById, applyLabelDensity]);");
  });

  it("hides the whole label when off, and trims it to the code in code mode", () => {
    expect(css).toMatch(
      /\.plot-label-marker\[data-label-density="off"\] \{[\s\S]*?display: none !important;/,
    );
    expect(css).toMatch(
      /\.plot-label-marker\[data-label-density="code"\] \.plot-label__type,[\s\S]*?\{[\s\S]*?display: none;/,
    );
  });
});
