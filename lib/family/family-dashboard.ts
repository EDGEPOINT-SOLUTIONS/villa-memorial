/**
 * The dashboard's derivations — pure, so the command centre's structure is
 * testable without a browser.
 *
 * WHAT THIS MODULE IS. The captain's 2026-09-30 brief asks for a real dashboard:
 * every recorded fact visible at a glance, each row carrying its own honest
 * state, and no figure invented. This module turns the family snapshot, the
 * office's workspace records and the plan's own instalments into the rows the
 * page renders — labels, counts and display strings only. It parses no display
 * money (repo rule), derives no due date (that is `lib/payment-schedule.ts`) and
 * asserts no ownership fact the family-facing projection does not carry.
 *
 * The state vocabulary is the plan's one closed set (§6.4), in the family's own
 * words, and every state is neutral unless a real need makes it urgent.
 */
import type {
  FamilyAppointment,
  FamilyRequest,
  FamilySnapshot,
} from "@/lib/api-client/family";
import { familyDocumentView } from "@/lib/family/family-view";
import {
  longDueDate,
  nextPaymentDue,
  paymentAmountLabel,
  paymentDueCountdown,
  paymentDueStateLabel,
  paymentDues,
  type PaymentDueState,
  type PaymentSchedule,
} from "@/lib/payment-schedule";
import { FAMILY_HELP } from "@/lib/family/contact";

/** One thing that needs the family now, most urgent first. */
export type AttentionItem = {
  key: string;
  label: string;
  meta?: string;
  /** One of the plan's closed state words. */
  state: string;
  tone: "danger" | "warning" | "info" | "neutral";
  href: string;
  actionLabel: string;
};

/**
 * The attention strip — the ONLY things that “need you now”. An overdue
 * instalment leads, then a due-soon one, then a request waiting on the family,
 * then a visit the office has not confirmed. Capped at four: a dashboard is read
 * at a glance, not scrolled.
 */
export function familyAttention(
  snapshot: FamilySnapshot,
  requests: readonly FamilyRequest[],
  appointments: readonly FamilyAppointment[],
  now: Date,
): AttentionItem[] {
  const items: AttentionItem[] = [];

  const schedule = snapshot.payment_schedule;
  if (schedule) {
    const dues = paymentDues(schedule, now);
    const overdue = dues.filter((due) => due.state === "overdue");
    const dueSoon = dues.filter((due) => due.state === "due_soon");
    for (const due of overdue) {
      items.push({
        key: `overdue-${due.seq}`,
        label: `${paymentAmountLabel(due.due_cents)} overdue`,
        meta: `${due.reference} · due ${longDueDate(due.due_on)}`,
        state: paymentDueStateLabel(due.state),
        tone: "danger",
        href: "/client/payments",
        actionLabel: "See how to pay",
      });
    }
    for (const due of dueSoon) {
      items.push({
        key: `due-${due.seq}`,
        label: `${paymentAmountLabel(due.due_cents)} ${paymentDueCountdown(due.days_until_due)}`,
        meta: `${due.reference} · due ${longDueDate(due.due_on)}`,
        state: paymentDueStateLabel(due.state),
        tone: "warning",
        href: "/client/payments",
        actionLabel: "See how to pay",
      });
    }
  }

  for (const request of requests) {
    if (request.state !== "waiting_on_you") continue;
    items.push({
      key: `request-${request.id}`,
      label: request.title,
      meta: request.detail,
      state: "Waiting on you",
      tone: "warning",
      href: "/client/requests",
      actionLabel: "See your requests",
    });
  }

  for (const appointment of appointments) {
    if (appointment.state !== "waiting") continue;
    items.push({
      key: `visit-${appointment.id}`,
      label: appointment.title,
      meta: `${appointment.day_label} · ${appointment.time_label}`,
      state: "Waiting",
      tone: "info",
      href: "/client/appointments",
      actionLabel: "See your visits",
    });
  }

  for (const doc of snapshot.recent_documents) {
    const view = familyDocumentView(doc.title, doc.status);
    if (view.tone !== "warning" && view.tone !== "danger") continue;
    items.push({
      key: `paper-${doc.title}`,
      label: doc.title,
      meta: view.note,
      state: view.status,
      tone: "warning",
      href: "/client/documents",
      actionLabel: "See your papers",
    });
  }

  return items.slice(0, 4);
}

/** One instalment row for the money table (≤6 shown). */
export type InstalmentRow = {
  key: string;
  reference: string;
  seq: number;
  of: number;
  dueLabel: string;
  amount: string;
  state: string;
  stateKey: PaymentDueState;
  paid: boolean;
};

/** The plan's instalments, oldest first, with the derived state in family words. */
export function familyInstalmentRows(schedule: PaymentSchedule | undefined, now: Date): InstalmentRow[] {
  if (!schedule) return [];
  return paymentDues(schedule, now).map((due) => ({
    key: `${due.reference}-${due.seq}`,
    reference: due.reference,
    seq: due.seq,
    of: schedule.installments.length,
    dueLabel: longDueDate(due.due_on),
    amount: paymentAmountLabel(due.amount_cents),
    state: paymentDueStateLabel(due.state),
    stateKey: due.state,
    paid: due.state === "paid",
  }));
}

/** The one date the dashboard leads a money panel with. */
export function familyNextDueLabel(schedule: PaymentSchedule | undefined): string | null {
  if (!schedule) return null;
  const next = nextPaymentDue(schedule);
  return next ? longDueDate(next.due_on) : null;
}

/** Office contact, in one place for the dashboard's Help panel. */
export const DASH_HELP = FAMILY_HELP;
