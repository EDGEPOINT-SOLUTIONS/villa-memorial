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
import {
  PortalChip,
  PortalFigure,
  PortalHero,
  PortalSection,
} from "@/components/portal/portal-ui";

/* ---------------------------------------------------------------------------
 * THE SHARED PRIMITIVES LIVE IN components/portal/portal-ui.tsx, NOT HERE.
 *
 * `Chip`, `AgentHero`, `AgentSection` and `MoneyCard` used to be written out a
 * second time in this file. Their markup was character-for-character the same as
 * `PortalChip`, `PortalHero`, `PortalSection` and `PortalFigure` — both portals
 * render one house style, and the only thing separating the two copies was the
 * prop types (`string` here, `ReactNode` there).
 *
 * Two implementations of one house style is how a house style drifts: the day
 * someone fixes a heading's margin in one file, the other portal keeps the old
 * one, and nothing fails. They now delegate, so there is one DOM to change and
 * one place to look.
 *
 * The names are kept so no call site changes, and the narrower `string` types the
 * agent pages were written against are widened to `ReactNode` — which every
 * existing caller already satisfies.
 *
 * What stays here is what is genuinely the agent's own: StageChip (stage words
 * from lib/agent/agent-view.ts), WorkItemRow (the kind label, the icon map, the
 * multi-item meta line and the snooze that waits on the CRM write contract),
 * TaskRow, AgendaCard, WeekRow and `money`. Those are agent vocabulary and
 * belongs to the agent feature folder.
 * ------------------------------------------------------------------------- */

/** @deprecated Use `PortalChip` — kept as an alias so agent call sites read unchanged. */
export function Chip({ children }: { children: ReactNode }) {
  return <PortalChip>{children}</PortalChip>;
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
    <PortalHero eyebrow={eyebrow} title={title} lead={lead} chips={chips}>
      {children}
    </PortalHero>
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
    <PortalSection title={title} sub={sub} more={more}>
      {children}
    </PortalSection>
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
  return (
    <PortalFigure label={label} value={value} note={note} hero={hero} tone={tone} pill={pill} />
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
    <dl className="ag-kv">
      <dt>{appointment.time_label}</dt>
      <dd>
        {weekTimePrefix(appointment.time_note)}
        {appointment.title}
        {appointment.status === "waiting" ? " — awaiting office confirmation" : ""}
      </dd>
    </dl>
  );
}

export function money(cents: number | null, currency = "PHP"): string {
  return cents === null ? "₱—" : formatMinorUnits(cents, currency);
}
