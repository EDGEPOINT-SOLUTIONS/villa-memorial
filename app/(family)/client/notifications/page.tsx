import { CalendarClock } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { countWord } from "@/lib/family/family-view";
import { personIdFrom } from "@/lib/family/family-household";
import { PersonSwitcherForSnapshot } from "@/components/family/family-person-switcher";
import {
  longDueDate,
  paymentAmountLabel,
  paymentDueCountdown,
  paymentDueNotices,
} from "@/lib/payment-schedule";
import {
  Answer,
  CallAction,
  PlannedAnswer,
  QuietAction,
  Row,
  Rows,
  WhatThisShows,
} from "@/components/family/family-ui";
import { DashPanel } from "@/components/family/dash-ui";

export const metadata = { title: "What we tell you about — Villa Funeraria" };

/**
 * Notifications — the in-system surface for what the office tells the family, on
 * the dashboard's dense grammar (2026-09-30).
 *
 * The client's minute (2026-09-21, item 1) asks that payment reminders be visible
 * inside the system. They are: the plan's own instalments are run through the
 * pure two-days-before rule (`lib/payment-schedule.ts`) and the reminders render
 * here with the client, the payment reference, what is owed and the due date. The
 * selection is derived from data and today's date, so the demo needs no timer.
 *
 * Everything else the office may one day send — email · SMS · Messenger · push —
 * waits on the platform's notification service (P4), and the ONE shared
 * disclosure names that seam. Nothing is dressed up as a sent message.
 */
export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePortalSessionOrRedirect("family");
  const requested = personIdFrom(await searchParams);
  const snapshot = await getFamilySnapshot(requested);
  const schedule = snapshot.payment_schedule;
  const notices = schedule
    ? paymentDueNotices(schedule, { client: snapshot.family.display_name, now: new Date() })
    : [];

  const switcher = (
    <PersonSwitcherForSnapshot snapshot={snapshot} basePath="/client/notifications" />
  );

  if (notices.length === 0) {
    return (
      <div className="dash">
        {switcher}
        <PlannedAnswer
          kicker="What we tell you about"
          headline="Nothing has been sent to your family yet."
          sub="When it is, every message will be listed here."
          planned={[
            {
              label: "Schedule changes and reminders",
              detail: "A service time moves, or the evening before",
            },
            {
              label: "Papers and receipts",
              detail: "A document is ready, or something is needed from you",
            },
            {
              label: "Payment reminders",
              detail: "Two days before a payment — and never during a wake",
            },
            {
              label: "Memorial activity",
              detail: "Only if you ask for it",
            },
            {
              label: "Remembrance dates",
              detail: "Birthday, anniversary and All Souls’ — you can switch any off",
            },
          ]}
          note={`The service isn’t switched on, so nothing was really sent. We never send marketing to a family in an arrangement. Call ${FAMILY_HELP.phone} with any question.`}
        />
      </div>
    );
  }

  return (
    <div className="dash">
      {switcher}
      <Answer
        kicker="What we tell you about"
        headline={
          notices.length === 1
            ? "One payment reminder."
            : `${countWord(notices.length)} payment reminders.`
        }
        sub="Nothing else has been sent."
        actions={<CallAction label={`Call ${FAMILY_HELP.phone}`} />}
      />

      <div className="dash-grid">
        <DashPanel
          role="money"
          className="dash-span-12"
          label="Reminders"
          title="Payment reminders"
          count={countWord(notices.length)}
        >
          <Rows>
            {notices.map((notice) => (
              <Row
                key={notice.id}
                icon={<CalendarClock size={22} aria-hidden="true" />}
                title={`${paymentAmountLabel(notice.amount_cents)} ${paymentDueCountdown(notice.days_until_due)}`}
                meta={`${notice.client} · ${notice.reference} · due ${longDueDate(notice.due_on)}`}
                state={notice.kind === "overdue" ? "Overdue" : "Due soon"}
                wait
                action={<QuietAction href="/client/payments" label="See how to pay" />}
              />
            ))}
          </Rows>
        </DashPanel>
      </div>

      <WhatThisShows
        planned={[
          {
            label: "Schedule changes and reminders",
            detail: "A service time moves, or the evening before",
          },
          {
            label: "Papers and receipts",
            detail: "A document is ready, or something is needed from you",
          },
          {
            label: "Memorial activity",
            detail: "Only if you ask for it",
          },
          {
            label: "Remembrance dates",
            detail: "Birthday, anniversary and All Souls’ — you can switch any off",
          },
        ]}
      >
        Only reminders inside this portal work today. Email and SMS wait on the notification
        service. Call {FAMILY_HELP.phone} with any question.
      </WhatThisShows>
    </div>
  );
}
