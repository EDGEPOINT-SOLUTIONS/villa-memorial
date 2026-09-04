// Generic UI primitives — no domain vocabulary (ⓡ). Labels and content are
// always passed in as props/children.

import { Fragment } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";

export function Button({
  variant = "primary",
  size,
  block,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "lg";
  block?: boolean;
}) {
  const cls = [
    "btn",
    `btn--${variant}`,
    size ? `btn--${size}` : "",
    block ? "btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

export type BadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent"
  | "available"
  | "reserved"
  | "sold"
  | "occupied"
  | "maintenance"
  | "transferred";

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function Card({
  title,
  actions,
  footer,
  memorial,
  children,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  memorial?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`card${memorial ? " card--memorial" : ""}`}>
      {title || actions ? (
        <div className="card__header">
          <div className="card__title">{title}</div>
          {actions ? <div>{actions}</div> : null}
        </div>
      ) : null}
      <div className="card__body">{children}</div>
      {footer ? <div className="card__footer">{footer}</div> : null}
    </div>
  );
}

export function KpiTile({
  label,
  value,
  delta,
  down,
  onClick,
}: {
  label: string;
  value: string;
  delta?: string;
  down?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="kpi" onClick={onClick} role={onClick ? "button" : undefined}>
      <div className="kpi__label">{label}</div>
      <div className="kpi__value">{value}</div>
      {delta ? (
        <div className={`kpi__delta${down ? " kpi__delta--down" : ""}`}>{delta}</div>
      ) : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <p className="page-header__eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}

export function PageSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="page-section">
      {title ? <h2 className="section-title">{title}</h2> : null}
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error ? <span className="field__hint">{hint}</span> : null}
      {error ? <span className="field__error">{error}</span> : null}
    </div>
  );
}

export function Input({
  error,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return <input className="input" aria-invalid={error || undefined} {...rest} />;
}

export function Select({
  error,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select className="select" aria-invalid={error || undefined} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({
  error,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return <textarea className="textarea" aria-invalid={error || undefined} {...rest} />;
}

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "danger" | "success" | "warning";
  children: ReactNode;
}) {
  return (
    <div className={`alert alert--${tone}`} role="alert">
      <span>{children}</span>
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      {hint ? <p className="empty-state__hint">{hint}</p> : null}
      {action}
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: number;
  onChange: (i: number) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t, i) => (
        <button
          key={t}
          role="tab"
          aria-selected={active === i}
          className={`tab${active === i ? " tab--active" : ""}`}
          onClick={() => onChange(i)}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export function KeyValue({ items }: { items: [string, ReactNode][] }) {
  return (
    <div className="kv">
      {items.map(([k, v]) => (
        <Fragment key={k}>
          <div className="kv__k">{k}</div>
          <div className="kv__v">{v}</div>
        </Fragment>
      ))}
    </div>
  );
}
