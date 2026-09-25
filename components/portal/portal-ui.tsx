/**
 * The shared portal kit — the one house style both signed-in portals render.
 *
 * The agent portal (components/agent/agent-ui.tsx) and the family portal
 * (components/family/family-ui.tsx) are different products for different
 * people, but they are one product to the eye: the same `ag-*` block in
 * styles/components.css styles both, and these components are the DOM that
 * block expects. The kit is deliberately domain-free (no agent vocabulary, no
 * family vocabulary): feature folders pass resolved values and the family's
 * own plain words, and the kit only decides rhythm, hierarchy and treatment.
 *
 * Rule of the house: one dominant hero with the day/page eyebrow, one action
 * band, sections with a heading, flat cards on neutral hairlines (white, no
 * gradient, no drop shadow — the calm sweep, 2026-09-25), figures that carry
 * their meaning, rows with one action each, and the calm note for a service
 * that is not switched on. Never invent a figure or a fact here.
 */
import type { ReactNode } from "react";

export function PortalPage({ children }: { children: ReactNode }) {
  return <div className="ag-page">{children}</div>;
}

/** The dominant hero: eyebrow, one headline, one lead, optional chips, action band. */
export function PortalHero({
  eyebrow,
  title,
  lead,
  chips,
  children,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  lead: ReactNode;
  chips?: ReactNode;
  /** The action band and any other hero content. */
  children?: ReactNode;
}) {
  return (
    <section className="ag-hero">
      <p className="ag-day">{eyebrow}</p>
      <h1 className="ag-hero__title">{title}</h1>
      <p className="ag-hero__lead">{lead}</p>
      {chips ? <div className="ag-hero__chips">{chips}</div> : null}
      {children}
    </section>
  );
}

export function PortalChip({ children }: { children: ReactNode }) {
  return <span className="ag-chip">{children}</span>;
}

/** One action band: the screen's primary action and at most one quiet alternative. */
export function PortalActionBand({
  title,
  detail,
  children,
}: {
  title?: ReactNode;
  detail?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="ag-action">
      {title ? (
        <div className="ag-action__body">
          <p className="ag-action__title">{title}</p>
          {detail ? <p className="ag-action__detail">{detail}</p> : null}
        </div>
      ) : null}
      <div className="ag-action__buttons">{children}</div>
    </div>
  );
}

export function PortalSection({
  title,
  sub,
  more,
  id,
  children,
}: {
  title: ReactNode;
  sub?: ReactNode;
  /** A quiet “see all” link on the right of the heading row. */
  more?: ReactNode;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section className="ag-sec" id={id}>
      <div className="ag-sec__head">
        <div>
          <h2 className="ag-h2">{title}</h2>
          {sub ? <p className="ag-sub">{sub}</p> : null}
        </div>
        {more}
      </div>
      {children}
    </section>
  );
}

/** A raised card: optional header, then the body. */
export function PortalCard({
  title,
  sub,
  id,
  children,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section className="ag-card" id={id}>
      {title ? (
        <div className="ag-card__head">
          <div>
            <h2 className="ag-card__title">{title}</h2>
            {sub ? <p className="ag-card__sub">{sub}</p> : null}
          </div>
        </div>
      ) : null}
      <div className="ag-card__body">{children}</div>
    </section>
  );
}

/** Figures that carry their meaning — the money/stat strip. */
export function PortalFigures({ children }: { children: ReactNode }) {
  return <div className="ag-money-grid">{children}</div>;
}

export function PortalFigure({
  label,
  value,
  note,
  hero = false,
  tone,
  pill,
}: {
  label: ReactNode;
  value: ReactNode;
  note: ReactNode;
  /** The one figure the screen leads with. */
  hero?: boolean;
  tone?: "due" | "ok";
  /** A word that says what the figure is (e.g. “example”). */
  pill?: ReactNode;
}) {
  const cls = ["ag-money", hero ? "ag-money--hero" : "", tone ? `ag-money--${tone}` : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls}>
      <p className="ag-money__label">{label}</p>
      <p className="ag-money__value">{value}</p>
      <p className="ag-money__note">
        {note} {pill ? <span className="ag-pill">{pill}</span> : null}
      </p>
    </div>
  );
}

/** Rows: one decision each — icon, title, one line, one state word, one action. */
export function PortalRows({ children }: { children: ReactNode }) {
  return <div className="ag-list">{children}</div>;
}

export function PortalRow({
  icon,
  title,
  meta,
  state,
  wait = false,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  /** One plain word, e.g. “Ready”. Never a colour code on its own. */
  state?: ReactNode;
  /** Waiting-on-you states get the warm chip, never a red alarm. */
  wait?: boolean;
  action?: ReactNode;
}) {
  return (
    <article className="ag-work">
      {icon ? (
        <span className="ag-work__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <div className="ag-work__body">
        <p className="ag-work__title">{title}</p>
        {meta ? <p className="ag-work__detail">{meta}</p> : null}
        {state ? (
          <p className="ag-work__meta">
            <span className={wait ? "ag-stage ag-stage--warm" : "ag-stage"}>{state}</span>
          </p>
        ) : null}
      </div>
      {action ? <div className="ag-work__action">{action}</div> : null}
    </article>
  );
}

/** A labelled figure row (details, facts). */
export function PortalKv({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <dl className="ag-kv">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </dl>
  );
}

/** The quiet progress bar — a share, always also said in words by the caller. */
export function PortalProgress({
  left,
  right,
  percent,
  ariaLabel,
}: {
  left: ReactNode;
  right: ReactNode;
  percent: number;
  ariaLabel: string;
}) {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="ag-target">
      <div className="ag-target__legend">
        <span>{left}</span>
        <span>{right}</span>
      </div>
      <div
        className="ag-target__bar"
        role="img"
        aria-label={ariaLabel}
      >
        <div className="ag-target__fill" style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}

/**
 * The calm honesty block. A page whose service is not switched on ends with
 * one of these: plain words, what is missing, and the office number when
 * calling is the way forward. Never an alert box.
 *
 * The wrapper is a `<div>`, not a `<p>`: every call site passes its prose as a
 * paragraph (and some pass lists), and a `<p>` inside the note's own `<p>` is
 * invalid HTML — the browser splits the tags and hydration regenerates the tree
 * (`<p> cannot be a descendant of <p>`). `.ag-note` is a class selector, so the
 * block renders exactly as before.
 */
export function PortalNote({ children }: { children: ReactNode }) {
  return (
    <section className="ag-card">
      <div className="ag-card__body">
        <div className="ag-note">{children}</div>
      </div>
    </section>
  );
}
