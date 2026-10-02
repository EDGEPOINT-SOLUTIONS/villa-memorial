import { describe, expect, it, vi} from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  barShare,
  buildLineGeometry,
  compactNumber,
  formatChartFigure,
  formatChartValue,
  niceTicks,
  stepDownPercent,
  tickCeiling,
  xLabelIndices,
} from "@/components/kit/chart-model";
import { BarRow, LineChart, Sparkline } from "@/components/kit";
import { parseCss, readStyle, selectors } from "../helpers/css-rules";
import { pipelineBuiltSeries } from "@/lib/agent/agent-dashboard";
import workspace from "@/lib/fixtures/agent/workspace.json";
import type { Prospect } from "@/lib/api-client/agent";

/**
 * The chart kit's contract (captain's accepted plan, 2026-10-01, §7 and §12).
 *
 * THE RULES THIS FILE PINS, declaration-level on purpose (vitest runs in node):
 *   · a money/count axis keeps a mandatory ZERO baseline and at most 4 gridlines;
 *   · at most 6 x labels, the first and last always shown;
 *   · a line needs at least two points — fewer is the real figure plus a named state;
 *   · the draw happens once, from the shipped `--motion-slow` easing, and
 *     `prefers-reduced-motion: reduce` removes the animation entirely;
 *   · the one real agent series stays in the 2–12 point range.
 *
 * The component half renders the real kit; the CSS half reads the shipped
 * declarations, because "the animation is removed" is a fact about the stylesheet
 * and cannot be measured in server markup.
 */

const PROSPECTS = (workspace as unknown as { prospects: Prospect[] }).prospects;

describe("the axis and label rules (plan §7.5)", () => {
  it("keeps a mandatory zero baseline and at most four gridlines", () => {
    for (const max of [0, 1, 999, 12_800_00, 54_304_000]) {
      const ticks = niceTicks(max);
      expect(ticks[0], `baseline for max ${max}`).toBe(0);
      expect(ticks.length, `gridline count for max ${max}`).toBeLessThanOrEqual(4);
      expect(ticks[ticks.length - 1], `ceiling reaches max ${max}`).toBeGreaterThanOrEqual(
        Math.max(max, 1),
      );
    }
  });

  it("never divides by zero on an empty or flat series", () => {
    const empty = niceTicks(0);
    expect(empty[0]).toBe(0);
    expect(empty[empty.length - 1]).toBeGreaterThanOrEqual(1);
    expect(empty.length).toBeLessThanOrEqual(4);
    expect(niceTicks(-5)[0]).toBe(0);
    expect(tickCeiling([])).toBe(1);
  });

  it("shows at most six x labels, first and last always present", () => {
    for (const count of [0, 1, 3, 6, 7, 12, 24]) {
      const indices = xLabelIndices(count);
      expect(indices.length, `labels for ${count} points`).toBeLessThanOrEqual(6);
      if (count > 0) {
        expect(indices[0]).toBe(0);
        expect(indices[indices.length - 1]).toBe(count - 1);
      }
      for (const index of indices) {
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(count);
      }
    }
  });

  it("draws no line from fewer than two points", () => {
    const box = { width: 720, height: 240 };
    expect(buildLineGeometry([], box)).toBeNull();
    expect(buildLineGeometry([{ label: "Sep 2", value: 100 }], box)).toBeNull();
    const line = buildLineGeometry(
      [
        { label: "Sep 2", value: 100 },
        { label: "Sep 8", value: 300 },
      ],
      box,
    );
    expect(line, "two points draw").not.toBeNull();
    // The area path closes on the zero baseline.
    expect(line!.areaPath.endsWith("Z")).toBe(true);
    expect(line!.points).toHaveLength(2);
  });

  it("writes values in the series' own unit", () => {
    expect(compactNumber(543_040)).toBe("543k");
    expect(compactNumber(1_200_000)).toBe("1.2M");
    expect(formatChartValue("peso_cents", 54_304_000)).toBe("₱543k");
    expect(formatChartFigure("peso_cents", 54_304_000)).toBe("₱543,040");
    expect(formatChartValue("count", 6)).toBe("6");
  });

  it("computes a bar share and a step-down without dividing by zero", () => {
    expect(barShare(3, 6)).toBe(50);
    expect(barShare(6, 0)).toBe(0);
    expect(stepDownPercent(6, 3)).toBe(50);
    expect(stepDownPercent(0, 3)).toBeNull();
  });
});

describe("the drawn chart", () => {
  const points = [
    { label: "Sep 2", value: 9_120_00 },
    { label: "Sep 8", value: 14_664_00 },
    { label: "Sep 10", value: 30_764_00 },
    { label: "Sep 14", value: 43_564_00 },
    { label: "Sep 15", value: 54_304_00 },
  ];

  it("renders the line, the area, the gridlines and one dot per point", () => {
    const html = renderToStaticMarkup(
      createElement(LineChart, {
        title: "Pipeline value entering",
        points,
        kind: "peso_cents",
        needLabel: "dated pipeline snapshots",
      }),
    );
    expect(html).toContain('class="chart"');
    expect(html).toContain('data-drawn="false"');
    expect(html).toContain("chart__line");
    expect(html).toContain("pathLength");
    expect(html).toContain("chart__area");
    expect(html.split("chart__dot").length - 1).toBe(points.length);
    // Five points → at most four gridlines, and the zero baseline is labelled ₱0.
    expect(html.split("chart__grid").length - 1).toBeLessThanOrEqual(5);
    expect(html).toContain("₱0");
    expect(html).toContain('role="img"');
  });

  it("names the record it needs instead of drawing through an empty series", () => {
    const html = renderToStaticMarkup(
      createElement(LineChart, {
        title: "Value closed",
        points: [],
        kind: "peso_cents",
        needLabel: "agent-attributed sale records",
      }),
    );
    expect(html).toContain("chart--empty");
    expect(html).toContain("Needs agent-attributed sale records.");
    expect(html).toContain("agent-attributed sale records");
    expect(html).not.toContain("chart__line");
  });

  it("shows the one real figure and no line for a single point", () => {
    const html = renderToStaticMarkup(
      createElement(LineChart, {
        title: "Value closed",
        points: [{ label: "Sep", value: 8_600_000 }],
        kind: "peso_cents",
        needLabel: "a full month of sale records",
      }),
    );
    expect(html).toContain("₱86,000");
    expect(html).toContain("Needs a full month of sale records for a line.");
    expect(html).not.toContain("chart__line");
  });

  it("renders the funnel as labelled rows, never an axis", () => {
    const html = renderToStaticMarkup(
      createElement(BarRow, {
        title: "This month's conversion",
        items: [
          { label: "Contacted", value: 6 },
          { label: "Presentations", value: 3 },
          { label: "Sold", value: 2 },
        ],
        needLabel: "a dated conversion series",
      }),
    );
    expect(html).toContain("bars__list");
    expect(html.split("bar-row__fill").length - 1).toBe(3);
    expect(html).toContain(">Contacted<");
    expect(html).toContain(">6<");
  });

  it("renders an empty funnel row as a named state", () => {
    const html = renderToStaticMarkup(
      createElement(BarRow, {
        title: "This month's conversion",
        items: [],
        needLabel: "a dated conversion series",
      }),
    );
    expect(html).toContain("bars--empty");
    expect(html).toContain("a dated conversion series");
    expect(html).not.toContain("bar-row__fill");
  });

  it("hides the sparkline when there is no line to draw", () => {
    const html = renderToStaticMarkup(
      createElement(Sparkline, { points: [{ label: "Sep", value: 1 }], label: "trend" }),
    );
    expect(html).toContain("spark--empty");
    expect(html).not.toContain("spark__line");
  });
});

describe("the animation, quoted from the stylesheet (plan §7.4)", () => {
  const css = readStyle("styles/components.css");
  const rules = parseCss(css);
  const findRule = (selector: string, media?: RegExp) =>
    rules.find(
      (r) =>
        selectors(r).includes(selector) &&
        (media ? r.media !== null && media.test(r.media) : r.depth === 0),
    );

  it("draws the line first (1100 ms), the area at 900 ms/250 ms delay, the dot at 320 ms", () => {
    const line = findRule('.chart[data-drawn="true"] .chart__line');
    expect(line, "the line-draw rule exists").toBeDefined();
    expect(line!.body).toContain("1100ms");
    expect(line!.body).toContain("cubic-bezier(0.22, 1, 0.36, 1)");

    const area = findRule('.chart[data-drawn="true"] .chart__area');
    expect(area!.body).toContain("900ms");
    expect(area!.body).toContain("250ms");

    const dot = findRule('.chart[data-drawn="true"] .chart__dot');
    expect(dot!.body).toContain("320ms");
  });

  it("holds the chart hidden until it is drawn, then once", () => {
    const hidden = findRule('.chart[data-drawn="false"] .chart__line');
    expect(hidden!.body).toContain("stroke-dashoffset: 1");
  });

  it("removes the draw entirely under prefers-reduced-motion", () => {
    const media = /prefers-reduced-motion/;
    for (const selector of [
      '.chart[data-drawn="true"] .chart__line',
      '.chart[data-drawn="true"] .chart__area',
      '.chart[data-drawn="true"] .chart__dot',
    ]) {
      const rule = findRule(selector, media);
      expect(rule, `${selector} under reduced motion`).toBeDefined();
      expect(rule!.body, selector).toContain("animation: none");
    }
    // A chart that never enters the viewport still shows its line and area.
    const stillLine = findRule('.chart[data-drawn="false"] .chart__line', media);
    expect(stillLine!.body).toContain("stroke-dashoffset: 0");
    const stillArea = findRule('.chart[data-drawn="false"] .chart__area', media);
    expect(stillArea!.body).toContain("opacity: 0.1");
    // The funnel bar's width transition is removed too.
    const fill = findRule(".bar-row__fill", media);
    expect(fill!.body).toContain("transition: none");
  });

  it("never adds an idle loop or a count-up", () => {
    expect(css).not.toMatch(/animation:[^;]*chart-[^;]*infinite/);
    expect(css).not.toMatch(/@keyframes chart-[^{]+\{[^}]*infinite/);
  });
});

describe("the one real series stays in the chart's point range", () => {
  it("renders 2–12 points for the recorded pipeline", () => {
    const series = pipelineBuiltSeries(PROSPECTS);
    expect(series.length).toBeGreaterThanOrEqual(2);
    expect(series.length).toBeLessThanOrEqual(12);
    // Every point is a real recorded value, never a zero fill.
    for (const point of series) {
      expect(point.value).toBeGreaterThan(0);
    }
  });
});

// Test-only demo seed: the product fixtures start clean (captain, 2026-10-02).
// This suite exercises the recorded records through a test-only copy, so the
// pages keep their content-bearing contract tests without restoring demo data.
vi.mock("@/lib/fixtures/agent/workspace.json", async () => ({
  default: (await import("../fixtures/agent-workspace-demo.json")).default,
}));
vi.mock("@/lib/fixtures/family/snapshot.json", async () => ({
  default: (await import("../fixtures/family-snapshot-demo.json")).default,
}));
vi.mock("@/lib/fixtures/family/workspace.json", async () => ({
  default: (await import("../fixtures/family-workspace-demo.json")).default,
}));
vi.mock("@/lib/fixtures/family/case.json", async () => ({
  default: (await import("../fixtures/family-case-demo.json")).default,
}));
