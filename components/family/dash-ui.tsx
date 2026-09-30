import Link from "next/link";
import type { ReactNode } from "react";
import { StatusChip, type StatusTone } from "@/components/kit/status-chip";
import type { AttentionItem } from "@/lib/family/family-dashboard";
/**
 * The dashboard's shells — small, typed, domain-free.
 *
 * The command centre is a 12-column grid of panels, each carrying its MEANING
 * role (plan §8.3): a 2px rule, one uppercase role label in an `-ink` token, and
 * a low-alpha wash confined to the head strip — the body stays white so figures
 * and cells keep maximum contrast. Colour never carries meaning alone: every
 * panel role is also a word.
 *
 * These are presentation only. They render what they are given and invent
 * nothing; the page's own derivations (`lib/family/family-dashboard.ts`) decide
 * the values.
 */
export type DashRole = "needs" | "money" | "arrangement" | "settled" | "place" | "neutral";

export function DashPanel({
  role = "neutral",
  label,
  title,
  count,
  more,
  id,
  className,
  children,
}: {
  role?: DashRole;
  /** The uppercase meaning word (e.g. “Money”, “Settled”). */
  label: string;
  title: string;
  /** A real count shown beside the title (never a decorative badge). */
  count?: string;
  /** One “Open →” link for the panel. */
  more?: { href: string; label: string };
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`dash-panel dash-panel--${role}${className ? ` ${className}` : ""}`}
      id={id}
      aria-label={title}
    >
      <header className="dash-panel__head">
        <p className="dash-panel__label">{label}</p>
        <div className="dash-panel__title-row">
          <h2 className="dash-panel__title">{title}</h2>
          {count ? <span className="dash-panel__count">{count}</span> : null}
          {more ? (
            <Link className="dash-panel__more" href={more.href}>
              {more.label}
            </Link>
          ) : null}
        </div>
      </header>
      <div className="dash-panel__body">{children}</div>
    </section>
  );
}

/** The KPI strip — a real count or figure per tile, each tile a link. */
export function DashKpi({
  label,
  value,
  sub,
  href,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  href: string;
  tone?: StatusTone;
}) {
  return (
    <Link className="card kpi-card dash-kpi" href={href} data-tone={tone ?? "neutral"}>
      <span className="kpi-card__body">
        <span className="kpi-card__label">{label}</span>
        <span className="kpi-card__value">{value}</span>
        {sub ? <span className="kpi-card__sub">{sub}</span> : null}
      </span>
    </Link>
  );
}

/** The attention strip — up to four rows, or one honest all-clear bar. */
export function AttentionStrip({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="dash-clear">
        <span className="dash-clear__dot" aria-hidden="true" />
        <p>All clear — nothing needs you today.</p>
      </div>
    );
  }
  return (
    <section className="dash-alerts" aria-label="What needs you now">
      {items.map((item) => (
        <article key={item.key} className="dash-alert" data-tone={item.tone}>
          <span className="dash-alert__dot" aria-hidden="true" />
          <div className="dash-alert__body">
            <p className="dash-alert__label">{item.label}</p>
            {item.meta ? <p className="dash-alert__meta">{item.meta}</p> : null}
          </div>
          <StatusChip tone={item.tone}>{item.state}</StatusChip>
          <Link className="btn btn--secondary btn--sm" href={item.href}>
            {item.actionLabel}
          </Link>
        </article>
      ))}
    </section>
  );
}

/** A stacked label → value list (one reading column, tabular figures). */
export function DashFacts({
  facts,
  columns = 1,
}: {
  facts: Array<{ label: string; value: ReactNode; tone?: "due" | "ok" }>;
  columns?: 1 | 2;
}) {
  return (
    <dl className="dash-facts" data-columns={columns}>
      {facts.map((fact) => (
        <div className="dash-fact" key={fact.label} data-tone={fact.tone ?? "neutral"}>
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
