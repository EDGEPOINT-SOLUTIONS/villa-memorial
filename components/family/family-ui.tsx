/**
 * Family-portal blocks — the family's own features on the shared portal kit
 * (components/portal/portal-ui.tsx, the same `ag-*` grammar the agent portal
 * renders; captain's one-house-style call, 2026-09-17).
 *
 * ONE IDEA PER BLOCK, ONE PRIMARY ACTION PER SCREEN. The grammar:
 *   Answer   — the situation sentence + the one action (+ the human line)
 *   Chain    — five plain words with the current step named
 *   Row/Rows — one decision per row (papers, ways to pay, offices, people)
 *   Money    — a figure that carries its meaning
 *   Note     — one calm sentence for the honest “not switched on yet” states
 *
 * Server-renderable and data-in/data-out; the pages pass the values they
 * actually hold and never invent a figure. The family's plain words, honest
 * states and bigger reading scale are features and stay exactly as they read;
 * only the presentation is the shared house style now.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Check, Clock, Phone } from "lucide-react";
import { FAMILY_HELP } from "@/lib/family/contact";
import {
  PortalActionBand,
  PortalCard,
  PortalHero,
  PortalNote,
  PortalProgress,
  PortalRow,
  PortalRows,
  PortalSection,
} from "@/components/portal/portal-ui";

/* ------------------------------------------------------------- the answer --- */

export function Answer({
  kicker,
  headline,
  sub,
  actions,
  chips,
  help = false,
}: {
  /** Small calm line above the headline, e.g. “Today” or a page name. */
  kicker: ReactNode;
  headline: ReactNode;
  /** One short supporting line — what the headline means. */
  sub: ReactNode;
  /** One primary action; a quiet second action at most. */
  actions: ReactNode;
  /** Optional facts that carry their meaning (a plan name, a next date). */
  chips?: ReactNode;
  /** The human path under the buttons; only the Help page turns it on. */
  help?: boolean;
}) {
  return (
    <PortalHero eyebrow={kicker} title={headline} lead={sub} chips={chips}>
      <PortalActionBand>{actions}</PortalActionBand>
      {help ? <HelpLine /> : null}
    </PortalHero>
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
  more,
  children,
  id,
}: {
  /** Omitted only for a trailing bare block (e.g. the sign-out action). */
  title?: string;
  sub?: ReactNode;
  more?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  if (!title) {
    return (
      <section className="ag-sec" id={id}>
        {sub ? <p className="ag-sub">{sub}</p> : null}
        {children}
      </section>
    );
  }
  return (
    <PortalSection title={title} sub={sub} more={more} id={id}>
      {children}
    </PortalSection>
  );
}

/* ------------------------------------------------------------- plain rows --- */

export function Rows({ children }: { children: ReactNode }) {
  return <PortalRows>{children}</PortalRows>;
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
  title: ReactNode;
  meta?: ReactNode;
  /** One plain word, e.g. “Ready” — never a colour code. */
  state?: ReactNode;
  /** Waiting-on-you states use the warm chip and a clock glyph, not a red alarm. */
  wait?: boolean;
  action?: ReactNode;
}) {
  return (
    <PortalRow
      icon={
        wait && !icon ? (
          <Clock size={20} aria-hidden="true" />
        ) : (
          icon
        )
      }
      title={title}
      meta={meta}
      state={state}
      wait={wait}
      action={action}
    />
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
    <Link className="btn btn--primary ag-btn-xl" href={href}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}

export function CallAction({ label, phoneHref = FAMILY_HELP.phoneHref }: { label: string; phoneHref?: string }) {
  return (
    <a className="btn btn--primary ag-btn-xl" href={phoneHref}>
      <Phone size={20} aria-hidden="true" />
      <span>{label}</span>
    </a>
  );
}

/** The quiet alternative in an action band — a real link, never a fake button. */
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
    <Link className="btn btn--ghost" href={href}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}

/** The quiet button used inside a row — visible, never the headline. */
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
    <Link className="btn btn--secondary" href={href}>
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
    <div className="ag-money ag-money--hero">
      <p className="ag-money__value">{figure}</p>
      <p className="ag-money__note">{meaning}</p>
      {actions ? <div className="ag-action__buttons fv-money__actions">{actions}</div> : null}
    </div>
  );
}

/**
 * The paid share — a bar that supports the sentence, never replaces it.
 * Rendered as the house card so it sits beside the rest of the page.
 */
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
  const progress =
    typeof percent === "number" ? (
      <PortalProgress
        left={
          <>
            <strong>{paid} paid</strong>
          </>
        }
        right={`${total} in all · ${words}`}
        percent={percent}
        ariaLabel={`${paid} of ${total} paid — ${words}`}
      />
    ) : (
      <div className="ag-target__legend">
        <span>
          <strong>{paid} paid</strong>
        </span>
        <span>
          {total} in all · {words}
        </span>
      </div>
    );
  return (
    <PortalCard title="Paid so far">
      {progress}
    </PortalCard>
  );
}

/* ------------------------------------------------------- the honest note ---- */

/**
 * The calm honesty block. Every page whose data does not exist yet ends with
 * one of these instead of an alert box: plain words, what is missing, and the
 * phone number when calling is the way forward.
 */
export function Note({ children }: { children: ReactNode }) {
  return <PortalNote>{children}</PortalNote>;
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
