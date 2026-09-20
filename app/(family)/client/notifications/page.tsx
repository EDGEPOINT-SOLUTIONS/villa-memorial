import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FAMILY_HELP } from "@/lib/family/contact";
import { PlannedAnswer } from "@/components/family/family-ui";

export const metadata = { title: "What we tell you about — Villa Memorial" };

/**
 * Notifications — compressed to the family reading budget (2026-09-21). The
 * honest state leads in one line; what will reach the family sits behind the
 * ONE shared `WhatThisShows` disclosure. The notification service is not
 * switched on, so nothing is listed — no placeholder notices dressed up as real
 * messages.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");

  return (
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
          detail: "Three days before a payment — and never during a wake",
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
  );
}
