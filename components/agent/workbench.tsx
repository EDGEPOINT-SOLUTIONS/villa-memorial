/**
 * The agent workbench's shells — small, typed, domain-free enough to sit beside
 * the shared portal kit while carrying the agent's own layout grammar.
 *
 * WHY IT EXISTS. The dashboard is a 12-column grid of small panels (plan §6.4),
 * each with a meaning role, a real count and its honest state. The agent feature
 * folder owns the vocabulary; this file owns the boxes so a second agent screen
 * inherits the same rhythm instead of re-deriving a panel. It renders what it is
 * given and invents nothing.
 *
 * MATERIAL. The role is carried by an uppercase label in an `-ink` token and a
 * low-alpha wash on the panel's head strip — the body stays paper so a figure
 * keeps maximum contrast. A box inside a panel is content, not a second plane:
 * it loses its shadow. (Same model as the family command centre, scoped to the
 * agent frame in the `agent workbench` block of styles/components.css.)
 */
import Link from "next/link";
import type { ReactNode } from "react";
import type { Appointment } from "@/lib/api-client/agent";
import { manilaTime } from "@/lib/agent/agent-view";
import type { StageFlowSegment } from "@/lib/agent/agent-dashboard";

export type WorkbenchRole = "needs" | "money" | "place" | "neutral" | "tools";

export function WorkbenchPanel({
  role = "neutral",
  label,
  title,
  count,
  more,
  id,
  className,
  children,
}: {
  role?: WorkbenchRole;
  /** The uppercase meaning word (e.g. “Money”). */
  label: string;
  title: string;
  /** A real count shown beside the title — never a decorative badge. */
  count?: string;
  more?: { href: string; label: string };
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`wb-panel wb-panel--${role}${className ? ` ${className}` : ""}`}
      id={id}
      aria-label={title}
    >
      <header className="wb-panel__head">
        <p className="wb-panel__label">{label}</p>
        <div className="wb-panel__title-row">
          <h2 className="wb-panel__title">{title}</h2>
          {count ? <span className="wb-panel__count">{count}</span> : null}
          {more ? (
            <Link className="wb-panel__more" href={more.href}>
              {more.label}
            </Link>
          ) : null}
        </div>
      </header>
      <div className="wb-panel__body">{children}</div>
    </section>
  );
}

/** One entry of the inline vitals ribbon — a figure, its basis, a real link. */
export function Vital({
  label,
  value,
  basis,
  href,
  tone = "neutral",
  blank = false,
}: {
  label: string;
  value: ReactNode;
  basis?: ReactNode;
  href: string;
  tone?: "neutral" | "due" | "ok" | "example";
  /** Neutral grey for a figure the record cannot yet give (never an alarm). */
  blank?: boolean;
}) {
  return (
    <Link className="wb-vital" href={href} data-tone={tone} data-blank={blank ? "yes" : "no"}>
      <span className="wb-vital__label">{label}</span>
      <span className="wb-vital__value">{value}</span>
      {basis ? <span className="wb-vital__basis">{basis}</span> : null}
    </Link>
  );
}

/** The pipeline as a flow: the seven PRD stages, real counts, empty gaps dashed. */
export function StageFlow({ segments }: { segments: readonly StageFlowSegment[] }) {
  return (
    <ol className="stage-flow" aria-label="Your pipeline, stage by stage">
      {segments.map((segment) => (
        <li
          key={segment.stage}
          className="stage-flow__seg"
          data-empty={segment.empty ? "yes" : "no"}
          aria-label={`${segment.label}: ${segment.count} ${segment.count === 1 ? "person" : "people"}`}
        >
          <span className="stage-flow__count">{segment.count}</span>
          <span className="stage-flow__label">{segment.label}</span>
        </li>
      ))}
    </ol>
  );
}

/** Today as a time spine: time, what, where, what to bring, confirmation. */
export function TimeSpine({ stops }: { stops: readonly Appointment[] }) {
  return (
    <ol className="wb-spine">
      {stops.map((stop) => (
        <li className="wb-spine__stop" key={stop.id}>
          <span className="wb-spine__time">{manilaTime(stop.starts_at)}</span>
          <div className="wb-spine__body">
            <p className="wb-spine__title">{stop.title}</p>
            <p className="wb-spine__where">{stop.where}</p>
            {stop.bring.length > 0 ? (
              <p className="wb-spine__bring">Bring: {stop.bring.join(", ")}</p>
            ) : null}
          </div>
          <span
            className="wb-spine__state"
            data-confirmed={stop.status === "confirmed" ? "yes" : "no"}
          >
            {stop.status === "confirmed" ? "Confirmed" : "Awaiting the office"}
          </span>
        </li>
      ))}
    </ol>
  );
}
