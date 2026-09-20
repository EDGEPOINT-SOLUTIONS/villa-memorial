import Link from "next/link";
import type { ReactNode } from "react";

/**
 * StatCard — one figure from the recorded data, with its label and its basis.
 *
 * This is the admin surface's KPI tile (`.kpi-grid` > `.kpi-card`): a label, the
 * figure that answers at a glance, and one supporting line that says what the
 * figure counts or where it came from. It is NOT the photographic product card
 * (`ProductCard`) — a stat tile has no photograph, and the two grammars must not
 * be merged.
 *
 * Honesty rule: the `sub` line carries the basis. A figure with no recorded
 * source names the absence there (e.g. "2 items carry no recorded cost") instead
 * of letting a plausible number stand alone. With `href` the whole tile links to
 * the filtered view the figure points at (out-of-stock → `?state=out`).
 */
export function StatCard({
  label,
  value,
  sub,
  href,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  href?: string;
}) {
  const body = (
    <span className="kpi-card__body">
      <span className="kpi-card__label">{label}</span>
      <span className="kpi-card__value">{value}</span>
      {sub ? <span className="kpi-card__sub">{sub}</span> : null}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="card kpi-card">
        {body}
      </Link>
    );
  }
  return <span className="card kpi-card">{body}</span>;
}
