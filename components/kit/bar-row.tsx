"use client";

/**
 * BarRow — the labelled row chart, for a single real snapshot.
 *
 * WHY IT IS NOT A PIE. The conversion funnel (6 contacted → 3 presentations →
 * 2 sold) is one month's real snapshot with no time axis. A donut would hide the
 * step-down; a bar row shows it plainly and each bar is also a number. Bars are
 * drawn once, on first view, with the same restrained motion as the line chart.
 *
 * HONESTY. A row with no recorded value prints the caller's missing wording and
 * draws no bar — it never renders a zero-width bar that reads as "none". The
 * share is relative to the largest row, which is stated beside each row.
 */
import { useEffect, useRef, useState } from "react";
import { barShare, formatChartFigure, type ChartKind, type ChartTone } from "@/components/kit/chart-model";

export type BarRowItem = {
  label: string;
  value: number;
  /** An optional plain-word note under the label (e.g. “of those contacted”). */
  note?: string;
};

export function BarRow({
  title,
  items,
  kind = "count",
  tone = "sky",
  footnote,
  needLabel,
  dataTestId,
}: {
  title: string;
  items: readonly BarRowItem[];
  kind?: ChartKind;
  tone?: ChartTone;
  footnote?: string;
  /** The record this chart waits on, named when there is nothing to draw. */
  needLabel: string;
  dataTestId?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
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

  const recorded = items.filter((item) => Number.isFinite(item.value));
  if (recorded.length === 0) {
    return (
      <div className="bars bars--empty" data-testid={dataTestId}>
        <p className="bars__title">{title}</p>
        <p className="chart__empty-note">Nothing recorded here yet — this chart needs {needLabel}.</p>
        {footnote ? <p className="chart__foot">{footnote}</p> : null}
      </div>
    );
  }
  const max = Math.max(...recorded.map((item) => item.value));

  return (
    <div className="bars" ref={ref} data-drawn={drawn ? "true" : "false"} data-tone={tone} data-testid={dataTestId}>
      <p className="bars__title">{title}</p>
      <ul className="bars__list">
        {recorded.map((item) => {
          const share = barShare(item.value, max);
          return (
            <li className="bar-row" key={item.label}>
              <div className="bar-row__head">
                <span className="bar-row__label">{item.label}</span>
                <span className="bar-row__value">{formatChartFigure(kind, item.value)}</span>
              </div>
              <div
                className="bar-row__track"
                role="img"
                aria-label={`${item.label}: ${formatChartFigure(kind, item.value)}`}
              >
                <span className="bar-row__fill" style={{ width: `${drawn ? share : 0}%` }} />
              </div>
              {item.note ? <p className="bar-row__note">{item.note}</p> : null}
            </li>
          );
        })}
      </ul>
      {footnote ? <p className="chart__foot">{footnote}</p> : null}
    </div>
  );
}
