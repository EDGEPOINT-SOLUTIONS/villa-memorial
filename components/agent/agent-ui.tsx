/**
 * Presentational pieces for the agent portal — the approved design's blocks
 * (docs/08-delivery/agent-portal-design), generic and data-shaped.
 *
 * Zero business logic: priority, stages and labels come from lib/agent/agent-view.ts;
 * pages pass already-resolved data. Actions are links where a real route or a
 * tel:/sms: target exists, and an honest disabled control where the action waits
 * on a backend contract.
 */
import type { ReactNode } from "react";
import type { AgentTask, Appointment, WorkItem } from "@/lib/api-client/agent";
import { appointmentStateLabel, manilaTime, stageMeta, workKindLabel } from "@/lib/agent/agent-view";
import { formatMinorUnits } from "@/lib/money";

export function Chip({ children }: { children: ReactNode }) {
  return <span className="ag-chip">{children}</span>;
}

export function AgentHero({
  eyebrow,
  title,
  lead,
  chips,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  chips?: ReactNode;
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

export function AgentSection({
  title,
  sub,
  more,
  children,
}: {
  title: string;
  sub?: string;
  more?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="ag-sec">
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

export function StageChip({ stage, label }: { stage: string; label?: string }) {
  const meta = stageMeta(stage);
  const cls = meta.tone ? ` ag-stage--${meta.tone}` : "";
  return <span className={`ag-stage${cls}`}>{label ?? meta.label}</span>;
}

export function MoneyCard({
  label,
  value,
  note,
  hero = false,
  tone,
  pill,
}: {
  label: string;
  value: string;
  note: ReactNode;
  hero?: boolean;
  tone?: "due" | "ok";
  pill?: string;
}) {
  const cls = [
    "ag-money",
    hero ? "ag-money--hero" : "",
    tone ? `ag-money--${tone}` : "",
  ]
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

const WORK_ICON: Record<WorkItem["kind"], ReactNode> = {
  follow_up: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3z" /></svg>
  ),
  send: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3 1-5a8 8 0 0 1 9-13 8 8 0 0 1 8 7z" /></svg>
  ),
  document: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4" /></svg>
  ),
  call: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3z" /></svg>
  ),
  first_call: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19 8v6M22 11h-6" /></svg>
  ),
};

export function WorkItemRow({
  item,
  type,
  actionHref,
  secondaryHref,
}: {
  item: WorkItem;
  type: "overdue" | "today" | "waiting" | "future" | "done";
  actionHref: string;
  secondaryHref?: string;
}) {
  const cls = type === "future" ? "ag-work" : `ag-work ag-work--${type}`;
  return (
    <article className={cls}>
      <span className="ag-work__icon">{WORK_ICON[item.kind]}</span>
      <div className="ag-work__body">
        <p className="ag-work__kind">{workKindLabel(item, new Date())}</p>
        <p className="ag-work__title">{item.title}</p>
        <p className="ag-work__detail">{item.detail}</p>
        <p className="ag-work__meta">
          {item.meta.map((m, i) => (
            <span key={m}>
              {i > 0 ? <span aria-hidden="true"> · </span> : null}
              {m}
            </span>
          ))}
        </p>
      </div>
      <div className="ag-work__action">
        <a className="btn btn--primary" href={actionHref}>
          {item.primary_action}
        </a>
        {item.secondary_action && secondaryHref ? (
          <a className="btn btn--secondary" href={secondaryHref}>
            {item.secondary_action}
          </a>
        ) : item.secondary_action ? (
          <button className="btn btn--secondary" type="button" disabled title="Waits on the CRM write contract">
            {item.secondary_action}
          </button>
        ) : null}
        {item.snooze ? (
          <button className="btn btn--ghost btn--sm" type="button" disabled title="Waits on the CRM write contract">
            {item.snooze}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function TaskRow({ task }: { task: AgentTask }) {
  return (
    <div className={`ag-task${task.done ? " ag-task--done" : ""}`}>
      <span className="ag-task__check" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5 9 18 20 6" /></svg>
      </span>
      <div>
        <p className="ag-task__title">{task.title}</p>
        <p className="ag-task__meta">{task.meta}</p>
      </div>
      <button
        className="btn btn--secondary btn--sm"
        type="button"
        disabled
        title="Waits on the CRM write contract"
      >
        {task.done ? "Done" : "Mark done"}
      </button>
    </div>
  );
}

export function AgendaCard({ appointment }: { appointment: Appointment }) {
  const confirmed = appointment.status === "confirmed";
  return (
    <article className="ag-appt">
      <div className="ag-appt__time">
        {manilaTime(appointment.starts_at)}
        <small>{appointment.time_note}</small>
      </div>
      <div>
        <p className="ag-appt__title">{appointment.title}</p>
        <p className="ag-appt__where">{appointment.where}</p>
        <p style={{ margin: "var(--space-2) 0 0", display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center", fontSize: "var(--text-xs)" }}>
          <span className={`badge ${confirmed ? "badge--success" : "badge--warning"}`}>
            {appointmentStateLabel(appointment)}
          </span>
          {appointment.bring.length > 0 ? (
            <span className="badge badge--info">Bring: {appointment.bring.join(", ")}</span>
          ) : null}
        </p>
      </div>
      <div className="ag-appt__actions">
        <a className="btn btn--primary" href="/agent/appointments">
          Open the day
        </a>
        <a className="btn btn--secondary btn--sm" href="tel:09176178489">
          Call the office
        </a>
      </div>
    </article>
  );
}

/** Week rows carry the office's time only when the note is a clock, never a day-only note. */
function weekTimePrefix(note: string): string {
  return /^\d{1,2}(:\d{2})?\s?(AM|PM)/i.test(note) ? `${note} · ` : "";
}

export function WeekRow({ appointment }: { appointment: Appointment }) {
  return (
    <div className="ag-kv">
      <dt>{appointment.time_label}</dt>
      <dd>
        {weekTimePrefix(appointment.time_note)}
        {appointment.title}
        {appointment.status === "waiting" ? " — awaiting office confirmation" : ""}
      </dd>
    </div>
  );
}

export function money(cents: number | null, currency = "PHP"): string {
  return cents === null ? "₱—" : formatMinorUnits(cents, currency);
}
