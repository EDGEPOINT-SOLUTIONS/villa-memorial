/**
 * Chart model — the pure geometry and formatting behind the kit charts.
 *
 * WHY IT IS SEPARATE FROM THE COMPONENT. The drawing rules the captain's plan
 * fixed (money axes start at ZERO, ≤4 gridlines, ≤6 x labels, the first and last
 * always shown, 6–12 points, tabular figures) are assertions about numbers, not
 * about React. Keeping them here lets `tests/unit/agent-charts.test.tsx` pin them
 * without a browser, and lets the `"use client"` component stay a thin drawing
 * shell. Domain words never enter this file — it is the generic kit.
 *
 * HONESTY. Nothing here invents a value: an empty series has no geometry, a
 * one-point series has a figure and no line, and `niceTicks` only ever rounds
 * an axis UP to a readable number (a zero baseline is mandatory and never moves).
 */

export type ChartPoint = { label: string; value: number };

/** How a value is written on an axis / beside a dot. */
export type ChartKind = "peso_cents" | "count";

/** The two data-ink roles: activity/pipeline (sky) and money (gold). */
export type ChartTone = "sky" | "gold";

/** Compact a large number for an axis label — never a value, only its label. */
export function compactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const n = value / 1_000_000;
    return `${Number.isInteger(n) ? n : n.toFixed(1)}M`;
  }
  if (abs >= 1_000) return `${Math.round(value / 1_000)}k`;
  return `${Math.round(value)}`;
}

/** One axis/tick label in the series' own unit. */
export function formatChartValue(kind: ChartKind, value: number): string {
  if (kind === "peso_cents") return `₱${compactNumber(value / 100)}`;
  return `${Math.round(value)}`;
}

/** The same figure, written in full — used for the empty/one-point state. */
export function formatChartFigure(kind: ChartKind, value: number): string {
  if (kind === "peso_cents") {
    return `₱${new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 }).format(value / 100)}`;
  }
  return new Intl.NumberFormat("en-PH").format(value);
}

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  const n = raw / power;
  const mult = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return mult * power;
}

/**
 * The horizontal gridlines, from a mandatory ZERO baseline. At most `maxTicks`
 * values (default 4) and never more than the caller asked for. A flat or empty
 * series still gets a real 0 baseline and a readable top, never a divide-by-zero.
 */
export function niceTicks(maxValue: number, maxTicks = 4): number[] {
  const safe = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 1;
  const step = niceStep(safe / Math.max(1, maxTicks - 1));
  const ticks: number[] = [];
  for (let value = 0; value <= safe + step / 2 && ticks.length < maxTicks; value += step) {
    ticks.push(value);
  }
  // The last gridline must reach or exceed the highest real value.
  if (ticks[ticks.length - 1] < safe) {
    ticks[ticks.length - 1] = Math.ceil(safe / step) * step;
  }
  return ticks;
}

/** The top of the drawing area — the highest gridline. */
export function tickCeiling(ticks: readonly number[]): number {
  return ticks.length > 0 ? ticks[ticks.length - 1] : 1;
}

/**
 * The indices that get an x label: at most `maxLabels` (default 6), always the
 * first and the last, evenly spaced in between. A 3-point series shows all three.
 */
export function xLabelIndices(count: number, maxLabels = 6): number[] {
  if (count <= 0) return [];
  if (count <= maxLabels) return Array.from({ length: count }, (_, i) => i);
  const indices = new Set<number>([0, count - 1]);
  const inner = maxLabels - 2;
  for (let i = 1; i <= inner; i += 1) {
    indices.add(Math.round((i * (count - 1)) / (inner + 1)));
  }
  return [...indices].sort((a, b) => a - b);
}

export type PlotBox = {
  /** The series' x/y in the SVG's own units. */
  points: Array<{ x: number; y: number; label: string; value: number }>;
  /** The area path under the line. */
  areaPath: string;
  linePath: string;
  /** The y for the zero baseline. */
  baseline: number;
};

/**
 * Project a series into a drawing box. `width`/`height` are the SVG viewBox
 * units; `pad` is the gutter reserved for axis labels. Returns `null` when
 * there is no line to draw (fewer than two points).
 */
export function buildLineGeometry(
  series: readonly ChartPoint[],
  options: { width: number; height: number; pad?: { top: number; right: number; bottom: number; left: number } },
): PlotBox | null {
  if (series.length < 2) return null;
  const pad = options.pad ?? { top: 12, right: 12, bottom: 26, left: 48 };
  const plotW = options.width - pad.left - pad.right;
  const plotH = options.height - pad.top - pad.bottom;
  const ticks = niceTicks(Math.max(...series.map((p) => p.value)));
  const ceiling = tickCeiling(ticks);
  const x = (i: number) => pad.left + (i / (series.length - 1)) * plotW;
  const y = (v: number) => pad.top + plotH - (v / ceiling) * plotH;
  const points = series.map((p, i) => ({ x: x(i), y: y(p.value), label: p.label, value: p.value }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const baseline = y(0);
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(2)} ${baseline.toFixed(2)} L${points[0].x.toFixed(2)} ${baseline.toFixed(2)} Z`;
  return { points, areaPath, linePath, baseline };
}

/** The share of a bar relative to the largest in a funnel/bar set (0–100). */
export function barShare(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

/** The step-down between two funnel rows, as whole percent — null when undefined. */
export function stepDownPercent(previous: number, current: number): number | null {
  if (previous <= 0) return null;
  return Math.round((current / previous) * 100);
}
