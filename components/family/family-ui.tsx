/**
 * Family-portal presentational components — the approved design's blocks
 * (docs/08-delivery/family-portal-design), rendered with the app's tokens and
 * classes plus the `fp-*` family block in styles/components.css.
 *
 * These are deliberately server-renderable and data-in/data-out: every page
 * passes the values it actually has, and where a block's data does not exist yet
 * the page passes the honest placeholder from `FamilyPlannedPage` instead.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  HeartHandshake,
  ListChecks,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { FamilyDocTone, FamilyNeed } from "@/lib/family/family-view";

/* ------------------------------------------------------------------ hero --- */

export function FamilyHero({
  eyebrow,
  title,
  dates,
  lead,
  chips,
  aside,
}: {
  eyebrow: string;
  title: string;
  dates?: string;
  lead: string;
  chips?: string[];
  aside?: ReactNode;
}) {
  return (
    <section className="fp-hero">
      <div className="fp-hero__grid">
        <div>
          <p className="fp-hero__eyebrow">{eyebrow}</p>
          <h1 className="fp-hero__title">{title}</h1>
          {dates ? <p className="fp-hero__dates">{dates}</p> : null}
          <p className="fp-hero__lead">{lead}</p>
          {chips && chips.length > 0 ? (
            <div className="fp-hero__chips">
              {chips.map((chip) => (
                <span className="fp-chip" key={chip}>
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {aside ? <div className="fp-hero__next fp-desktop-only">{aside}</div> : null}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- needs ---- */

const NEED_ICON: Record<FamilyNeed["kind"], ReactNode> = {
  action: <ListChecks size={20} />,
  due: <CreditCard size={20} />,
  next: <Clock size={20} />,
  ready: <CheckCircle2 size={20} />,
  memory: <HeartHandshake size={20} />,
};

export function FamilyNeedCard({ need }: { need: FamilyNeed }) {
  return (
    <article className={`fp-need fp-need--${need.kind}`}>
      <span className="fp-need__icon" aria-hidden="true">
        {NEED_ICON[need.kind]}
      </span>
      <div className="fp-need__body">
        <p className="fp-need__kind">{need.band}</p>
        <p className="fp-need__title">{need.title}</p>
        <p className="fp-need__detail">{need.detail}</p>
      </div>
      <div className="fp-need__action">
        <Link className="btn btn--primary btn--sm" href={need.action.href}>
          {need.action.label}
        </Link>
        {need.quiet ? (
          <Link className="btn btn--ghost btn--sm" href={need.quiet.href}>
            {need.quiet.label}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function FamilyNeeds({ needs }: { needs: FamilyNeed[] }) {
  if (needs.length === 0) {
    return (
      <div className="empty-state fp-needs-empty">
        <p className="empty-state__title">Nothing needs you today</p>
        <p className="empty-state__hint">
          We will only put something here when it truly needs you. Everything else about your
          family&rsquo;s arrangement is in the menu on the left.
        </p>
      </div>
    );
  }
  return (
    <div className="fp-needs">
      {needs.map((need) => (
        <FamilyNeedCard key={need.id} need={need} />
      ))}
    </div>
  );
}

/* -------------------------------------------------------- quick actions ---- */

export function FamilyQuickActions({
  items,
}: {
  items: Array<{ label: string; note: string; href: string; icon?: ReactNode }>;
}) {
  return (
    <div className="fp-quicks">
      {items.map((item) => (
        <Link className="fp-quick" href={item.href} key={item.label}>
          {item.icon}
          <span>{item.label}</span>
          <em>{item.note}</em>
        </Link>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- money ----- */

export function FamilyMoney({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "due" | "ok";
}) {
  return (
    <div className={`fp-money${tone ? ` fp-money--${tone}` : ""}`}>
      <p className="fp-money__label">{label}</p>
      <p className="fp-money__value">{value}</p>
      {note ? <p className="fp-money__note">{note}</p> : null}
    </div>
  );
}

export function FamilyProgress({ percent, note }: { percent: number; note: string }) {
  return (
    <div className="fp-progress-wrap">
      <div
        className="fp-progress"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Share of this plan already paid"
      >
        <span className="fp-progress__fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="fp-note mt-2">{note}</p>
    </div>
  );
}

/* ------------------------------------------------------------ documents ---- */

export function FamilyDocRow({
  title,
  meta,
  status,
  tone = "neutral",
  href,
  actionLabel = "Open",
}: {
  title: string;
  meta: string;
  status: string;
  tone?: FamilyDocTone;
  href?: string;
  actionLabel?: string;
}) {
  return (
    <div className="fp-doc">
      <span className="fp-doc__icon" aria-hidden="true">
        <FileText size={18} />
      </span>
      <div className="fp-doc__body">
        <p className="fp-doc__title">{title}</p>
        <p className="fp-doc__meta">{meta}</p>
      </div>
      <Badge tone={tone === "danger" ? "danger" : tone}>{status}</Badge>
      {href ? (
        <Link className="btn btn--ghost btn--sm" href={href}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------ structure ---- */

export function FamilySection({
  title,
  sub,
  children,
  desktopOnly = false,
  id,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
  desktopOnly?: boolean;
  id?: string;
}) {
  return (
    <section className={`page-section${desktopOnly ? " fp-desktop-only" : ""}`} id={id}>
      <h2 className="fp-h2">{title}</h2>
      {sub ? <p className="fp-sub">{sub}</p> : null}
      {children}
    </section>
  );
}

export function FamilySteps({
  steps,
}: {
  steps: Array<{ state: "done" | "now" | "todo"; label: string; note?: string }>;
}) {
  return (
    <ol className="fp-steps">
      {steps.map((step, index) => (
        <li className={`fp-step fp-step--${step.state}`} key={`${step.label}-${index}`}>
          <span className="fp-step__dot" aria-hidden="true">
            {step.state === "done" ? "✓" : ""}
          </span>
          <span className="fp-step__label">{step.label}</span>
          {step.note ? <span className="fp-step__note">{step.note}</span> : null}
        </li>
      ))}
    </ol>
  );
}

export function FamilyKv({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="fp-kvs">
      {rows.map(([key, value]) => (
        <div className="row row--space fp-kv" key={key}>
          <span className="text-sm text-muted">{key}</span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------- planned pages ----- */

/**
 * The honest "not wired yet" page, designed rather than bare: the page keeps the
 * approved chrome, states what will live here (the design's own blocks), says
 * exactly what is missing, and gives the family a way to reach a person.
 *
 * This replaces the old `FamilyComingSoon` empty state; the wording below is the
 * behaviour the design requires — never fake a service that does not exist.
 */
export function FamilyPlannedPage({
  eyebrow,
  title,
  lead,
  blocks,
  missing,
  help,
  preview,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  blocks: Array<{ heading: string; detail: string }>;
  missing: string;
  help: ReactNode;
  /** Optional honest preview of a model that already exists (e.g. case stages). */
  preview?: ReactNode;
}) {
  return (
    <div className="fp-page">
      <header className="page-header">
        <div>
          <p className="page-header__eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="fp-lead">{lead}</p>
        </div>
      </header>

      <section className="page-section">
        <div className="alert alert--info" role="status">
          <div>
            <strong>This page is designed but not wired yet.</strong>
            <br />
            {missing}
          </div>
        </div>
      </section>

      <FamilySection
        title="What will be on this page"
        sub="Taken from the approved family-portal design — the blocks appear in this order."
      >
        <div className="fp-quicks">
          {blocks.map((block) => (
            <div className="fp-quick fp-quick--static" key={block.heading}>
              <span>{block.heading}</span>
              <em>{block.detail}</em>
            </div>
          ))}
        </div>
      </FamilySection>

      {preview}

      <FamilySection title="While you wait, a person can help">{help}</FamilySection>
    </div>
  );
}

/** The coordinator card shared by the planned pages and Support. */
export function FamilyHelpCard({
  phone,
  phoneHref,
  hours,
  office,
}: {
  phone: string;
  phoneHref: string;
  hours: string;
  office: string;
}) {
  return (
    <Card>
      <div className="fp-split">
        <div>
          <p className="fp-h3">Talk to your coordinator</p>
          <p className="fp-note">
            Villa Memorial looks after your family from the office in Isabela City. Call or text
            any time — someone answers {hours}.
          </p>
          <div className="row row--wrap mt-4">
            <a className="btn btn--primary" href={phoneHref}>
              Call {phone}
            </a>
            <Link className="btn btn--secondary" href="/client/support">
              Send a message
            </Link>
          </div>
        </div>
        <div>
          <p className="fp-h3">Where we are</p>
          <p className="fp-note">{office}</p>
          <p className="fp-note">Funeraria Villa · Aguada, Isabela City</p>
          <p className="fp-note">Sanctuario de Mercedes y Gloria · Begang, Isabela City</p>
        </div>
      </div>
    </Card>
  );
}
