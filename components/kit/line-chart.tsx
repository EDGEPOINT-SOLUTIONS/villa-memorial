"use client";

/**
 * LineChart / Sparkline — the kit's one data-ink device.
 *
 * WHY A NEW DEVICE. The product shipped no chart at all (plan §3.4): every
 * signed-in surface could only print a row or a card, so "is it going up?" had
 * no answer. This is the one new form the agent workbench adds, and it is
 * deliberately narrow: one series per line, a mandatory zero baseline, neutral
 * gridlines, and the same animation everywhere so a page of charts reads as one
 * thing rather than a gallery.
 *
 * THE DRAW (plan §7.4, the captain's D2):
 *   · the line draws first (1100 ms), the area fades to 10 % (900 ms, 250 ms
 *     delay), the dots pop in (320 ms, staggered ≤200 ms apart);
 *   · it happens ONCE, on first entering the viewport (IntersectionObserver), so
 *     a chart below the fold does not animate off-screen;
 *   · `prefers-reduced-motion: reduce` removes the draw entirely — the line is
 *     simply present and the area sits at 10 %;
 *   · never an idle loop, a count-up, a pie or a 3D anything.
 *
 * HONESTY. The component draws what it is given. Fewer than two points is not a
 * line — it renders the real last figure (or a named empty state) and the record
 * it needs, never a trend through invented points. A zero baseline is not
 * optional; `niceTicks` enforces it.
 *
 * SERVER/CLIENT BOUNDARY. Props are serializable only — no function passes a
 * Server Component boundary (the `/price-list` lesson in the root AGENTS.md).
 * Formatting travels through the `kind` enum, resolved by chart-model.ts.
 */
import { useEffect, useId, useRef, useState } from "react";
import {
  buildLineGeometry,
  formatChartFigure,
  formatChartValue,
  niceTicks,
  tickCeiling,
  xLabelIndices,
  type ChartKind,
  type ChartPoint,
  type ChartTone,
} from "@/components/kit/chart-model";

const WIDTH = 720;
const DEFAULT_HEIGHT = 240;

/** Draw only when the chart has actually entered the viewport, once. */
function useDrawn<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setDrawn(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setDrawn(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, drawn };
}

export type LineChartProps = {
  title: string;
  points: readonly ChartPoint[];
  kind?: ChartKind;
  tone?: ChartTone;
  /** What the y axis counts, in the reader's words. */
  unitLabel?: string;
  /** One line naming the source, and any short-history caveat. */
  footnote?: string;
  /** The record this chart waits on, named in the empty state. */
  needLabel: string;
  /** A caller's own one-line empty message, used instead of "Needs {needLabel}." */
  emptyNote?: string;
  height?: number;
  dataTestId?: string;
};

export function LineChart({
  title,
  points,
  kind = "count",
  tone = "sky",
  unitLabel,
  footnote,
  needLabel,
  emptyNote,
  height = DEFAULT_HEIGHT,
  dataTestId,
}: LineChartProps) {
  const { ref, drawn } = useDrawn<HTMLElement>();
  const titleId = useId();
  const geometry = buildLineGeometry(points, { width: WIDTH, height, pad: { top: 14, right: 14, bottom: 28, left: 52 } });
  const ticks = niceTicks(Math.max(0, ...points.map((p) => p.value)));
  const ceiling = tickCeiling(ticks);
  const xLabels = xLabelIndices(points.length);

  if (!geometry) {
    const latest = points.length === 1 ? points[0] : null;
    return (
      <figure className="chart chart--empty" aria-labelledby={titleId} data-tone={tone} data-testid={dataTestId}>
        <figcaption className="chart__cap">
          <span className="chart__title" id={titleId}>
            {title}
          </span>
          {unitLabel ? <span className="chart__unit">{unitLabel}</span> : null}
        </figcaption>
        <div className="chart__empty">
          <p className="chart__empty-figure">{latest ? formatChartFigure(kind, latest.value) : "—"}</p>
          <p className="chart__empty-note">
            {emptyNote ??
              (latest
                ? `Needs ${needLabel} for a line.`
                : `Needs ${needLabel}.`)}
          </p>
        </div>
        {footnote ? <p className="chart__foot">{footnote}</p> : null}
      </figure>
    );
  }

  const yFor = (value: number) => geometry.baseline - (value / ceiling) * (geometry.baseline - 14);

  return (
    <figure
      className="chart"
      ref={ref}
      data-drawn={drawn ? "true" : "false"}
      data-tone={tone}
      aria-labelledby={titleId}
      data-testid={dataTestId}
    >
      <figcaption className="chart__cap">
        <span className="chart__title" id={titleId}>
          {title}
        </span>
        {unitLabel ? <span className="chart__unit">{unitLabel}</span> : null}
      </figcaption>
      <svg
        className="chart__svg"
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label={`${title}. ${points.map((p) => `${p.label}: ${formatChartFigure(kind, p.value)}`).join("; ")}.`}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className="chart__grid"
              x1={52}
              x2={WIDTH - 14}
              y1={yFor(tick)}
              y2={yFor(tick)}
              vectorEffect="non-scaling-stroke"
            />
            <text className="chart__axis-label" x={46} y={yFor(tick) + 3} textAnchor="end">
              {formatChartValue(kind, tick)}
            </text>
          </g>
        ))}
        <path className="chart__area" d={geometry.areaPath} />
        <path className="chart__line" d={geometry.linePath} pathLength={1} vectorEffect="non-scaling-stroke" />
        {geometry.points.map((point, index) => (
          <circle
            key={`${point.label}-${index}`}
            className="chart__dot"
            cx={point.x}
            cy={point.y}
            r={3.5}
            style={{ animationDelay: `${200 + index * DOT_STAGGER_MS}ms` }}
            vectorEffect="non-scaling-stroke"
            aria-hidden="true"
          />
        ))}
        {xLabels.map((index) => (
          <text
            key={`x-${index}`}
            className="chart__xlabel"
            x={geometry.points[index].x}
            y={height - 8}
            textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
          >
            {points[index].label}
          </text>
        ))}
      </svg>
      {footnote ? <p className="chart__foot">{footnote}</p> : null}
    </figure>
  );
}

/** The stagger between dots, capped so a six-point line still finishes ≤1.3 s. */
const DOT_STAGGER_MS = 140;

/** A bare inline line — same ink, no axes. For a figure's own trend. */
export function Sparkline({
  points,
  tone = "sky",
  label,
  height = 44,
}: {
  points: readonly ChartPoint[];
  tone?: ChartTone;
  label: string;
  height?: number;
}) {
  const geometry = buildLineGeometry(points, {
    width: 240,
    height,
    pad: { top: 6, right: 4, bottom: 6, left: 4 },
  });
  if (!geometry) {
    return <span className="spark spark--empty" aria-hidden="true" />;
  }
  return (
    <span className="spark" data-tone={tone} role="img" aria-label={label}>
      <svg viewBox={`0 0 240 ${height}`} preserveAspectRatio="none" aria-hidden="true">
        <path className="spark__area" d={geometry.areaPath} />
        <path className="spark__line" d={geometry.linePath} pathLength={1} vectorEffect="non-scaling-stroke" />
      </svg>
    </span>
  );
}
