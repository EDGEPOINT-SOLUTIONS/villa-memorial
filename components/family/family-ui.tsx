/**
 * Family-portal blocks — the approved 2026-09-16 redesign
 * (docs/08-delivery/family-portal-design).
 *
 * ONE IDEA PER BLOCK, ONE PRIMARY ACTION PER SCREEN. The grammar:
 *   Answer   — the situation sentence + the one action (+ the human line)
 *   Chain    — five plain words with the current step named
 *   Row/Rows — one decision per row (papers, ways to pay, offices, people)
 *   Money    — a figure that carries its meaning
 *   Note     — one calm sentence for the honest “not switched on yet” states
 *
 * Server-renderable and data-in/data-out; the pages pass the values they
 * actually hold and never invent a figure.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Check, Clock, Phone } from "lucide-react";
import { FAMILY_HELP } from "@/lib/family/contact";

/* ------------------------------------------------------------- the answer --- */

export function Answer({
  kicker,
  headline,
  sub,
  actions,
  help = false,
}: {
  /** Small calm line above the headline, e.g. “Today” or a page name. */
  kicker: string;
  headline: string;
  /** One short supporting line — what the headline means. */
  sub: ReactNode;
  /** One primary action; a quiet second action at most. */
  actions: ReactNode;
  /** The human path under the buttons; only the Help page turns it on. */
  help?: boolean;
}) {
  return (
    <section className="fv-answer" aria-labelledby="fv-answer-h">
      <p className="fv-answer__kicker">{kicker}</p>
      <h1 className="fv-answer__h" id="fv-answer-h">
        {headline}
      </h1>
      <p className="fv-answer__sub">{sub}</p>
      <div className="fv-answer__actions">{actions}</div>
      {help ? <HelpLine /> : null}
    </section>
  );
}

/* ------------------------------------------------------------ the human ---- */

export function HelpLine({ lead = "Need help? Call" }: { lead?: string }) {
  return (
    <div className="fv-help">
      <Phone size={20} aria-hidden="true" />
      <span>
        {lead}{" "}
        <a href={FAMILY_HELP.phoneHref}>{FAMILY_HELP.phone}</a> — someone answers{" "}
        {FAMILY_HELP.hours.replace("daily", "every day")}.
      </span>
    </div>
  );
}

/* ------------------------------------------------------------- the chain ---- */

/** The five family moments, in order. `current` is 1-based. */
export const FAMILY_CHAIN_STEPS = [
  "Arrangement",
  "Viewing",
  "Funeral",
  "Burial",
  "Papers",
] as const;

export function Chain({ current }: { current?: number }) {
  return (
    <ol className="fv-chain">
      {FAMILY_CHAIN_STEPS.map((label, index) => {
        const step = index + 1;
        const done = typeof current === "number" && step < current;
        const now = typeof current === "number" && step === current;
        const cls = now ? "fv-chain__now" : done ? "fv-chain__done" : "";
        return (
          <li key={label} className={cls || undefined}>
            {done ? <Check size={18} aria-hidden="true" /> : null}
            <span>
              {step} {label}
            </span>
            {now ? <small>· you are here</small> : null}
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------------------------------------------------- sections ---- */

export function Section({
  title,
  sub,
  children,
  id,
}: {
  /** Omitted only for a trailing bare block (e.g. the sign-out action). */
  title?: string;
  sub?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section className="fv-sec" id={id}>
      {title ? <h2 className="fv-sec__h">{title}</h2> : null}
      {sub ? <p className="fv-sec__sub">{sub}</p> : null}
      {children}
    </section>
  );
}

/* ------------------------------------------------------------- plain rows --- */

export function Rows({ children }: { children: ReactNode }) {
  return <ul className="fv-rows">{children}</ul>;
}

export function Row({
  icon,
  title,
  meta,
  state,
  wait = false,
  action,
}: {
  icon?: ReactNode;
  title: string;
  meta?: string;
  /** One plain word, e.g. “Ready” — never a colour code. */
  state?: string;
  /** Waiting-on-you states use a clock glyph, not a different hue alone. */
  wait?: boolean;
  action?: ReactNode;
}) {
  return (
    <li className="fv-row">
      {icon ? (
        <span className="fv-row__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="fv-row__body">
        <span className="fv-row__title">{title}</span>
        {meta ? <span className="fv-row__meta">{meta}</span> : null}
      </span>
      {state ? (
        <span className={wait ? "fv-row__state fv-row__state--wait" : "fv-row__state"}>
          {wait ? <Clock size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
          {state}
        </span>
      ) : null}
      {action ? <span className="fv-row__action">{action}</span> : null}
    </li>
  );
}

/* --------------------------------------------------------------- actions ---- */

export function PrimaryAction({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon?: ReactNode;
}) {
  return (
    <Link className="fv-btn" href={href}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}

export function CallAction({ label, phoneHref = FAMILY_HELP.phoneHref }: { label: string; phoneHref?: string }) {
  return (
    <a className="fv-btn" href={phoneHref}>
      <Phone size={20} aria-hidden="true" />
      <span>{label}</span>
    </a>
  );
}

export function QuietLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon?: ReactNode;
}) {
  return (
    <Link className="fv-quietlink" href={href}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}

/** The quiet button used inside a money block — visible, never the headline. */
export function QuietAction({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon?: ReactNode;
}) {
  return (
    <Link className="fv-btn fv-btn--quiet" href={href}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}

/* ------------------------------------------------------------- the when ----- */

export type WhenItem = {
  /** “Saturday, 19 September · 10:00 AM” */
  day: string;
  /** “Ernesto's funeral” */
  what: string;
  /** “Sanctuario de Mercedes y Gloria” */
  where: string;
};

/** Day · what · where — the plain schedule list, three lines per moment. */
export function WhenList({ items }: { items: WhenItem[] }) {
  return (
    <ol className="fv-when">
      {items.map((item) => (
        <li key={`${item.day}|${item.what}`}>
          <span className="fv-when__day">{item.day}</span>
          <span className="fv-when__what">{item.what}</span>
          <span className="fv-when__where">{item.where}</span>
        </li>
      ))}
    </ol>
  );
}

/* ---------------------------------------------------------------- money ----- */

export function Money({
  figure,
  meaning,
  actions,
}: {
  /** A number that carries its meaning: “₱22,000 still to pay”. */
  figure: string;
  meaning: string;
  actions?: ReactNode;
}) {
  return (
    <div className="fv-money">
      <p className="fv-money__fig">{figure}</p>
      <p className="fv-money__mean">{meaning}</p>
      {actions ? <div className="fv-money__actions">{actions}</div> : null}
    </div>
  );
}

export function PaidSoFar({
  paid,
  total,
  words,
  percent,
}: {
  paid: string;
  total: string;
  /** e.g. “just under half”. */
  words: string;
  /** 0–100 from integer minor units; omitted when the fixture has none. */
  percent?: number;
}) {
  return (
    <div className="fv-paid">
      <strong>{paid} paid</strong>
      {typeof percent === "number" ? (
        <span
          className="fv-paid__bar"
          role="img"
          aria-label={`${paid} of ${total} paid — ${words}`}
        >
          <span className="fv-paid__fill" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
        </span>
      ) : null}
      <span>
        {total} in all{percent === undefined ? "" : ` · ${words}`}
      </span>
    </div>
  );
}

/* ------------------------------------------------------- the honest note ---- */

/**
 * The calm honesty block. Every page whose data does not exist yet ends with
 * one of these instead of an alert box: plain words, what is missing, and the
 * phone number when calling is the way forward.
 */
export function Note({ children }: { children: ReactNode }) {
  return <section className="fv-note">{children}</section>;
}

/** The full honest answer for a page whose service is not switched on yet. */
export function PlannedAnswer({
  kicker,
  headline,
  sub,
  plannedTitle,
  sectionSub,
  planned,
  note,
  action,
}: {
  kicker: string;
  headline: string;
  sub: string;
  plannedTitle: string;
  /** One line above the rows; defaults to the honest “what will live here”. */
  sectionSub?: string;
  planned: Array<{ label: string; detail: string }>;
  note: string;
  /** Overrides the default “Call {phone}” primary action. */
  action?: ReactNode;
}) {
  return (
    <>
      <Answer
        kicker={kicker}
        headline={headline}
        sub={sub}
        actions={action ?? <CallAction label={`Call ${FAMILY_HELP.phone}`} />}
      />
      <Section
        title={plannedTitle}
        sub={
          sectionSub ??
          "This is what will live here. Until then, call us and we will tell you exactly where things stand."
        }
      >
        <Rows>
          {planned.map((item) => (
            <Row key={item.label} title={item.label} meta={item.detail} />
          ))}
        </Rows>
      </Section>
      <Note>
        <p>
          <strong>About this page.</strong> {note}
        </p>
      </Note>
    </>
  );
}
