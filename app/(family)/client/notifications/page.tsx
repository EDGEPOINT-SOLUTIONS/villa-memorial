import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { PlannedAnswer } from "@/components/family/family-ui";

export const metadata = { title: "What we tell you about — Villa Memorial" };

/**
 * Notifications — the approved redesign (docs/08-delivery/family-portal-design).
 * The notification service is not switched on, so nothing is listed: the page
 * says plainly that nothing was sent, and describes what will reach the family.
 * No placeholder notices dressed up as real messages.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");

  return (
    <PlannedAnswer
      kicker="What we tell you about"
      headline="Nothing has been sent to your family yet. This page is not switched on."
      sub="When it is, every message we send — a schedule change, a paper ready, a payment reminder — will be listed here, and you will choose which kinds reach you."
      plannedTitle="What we will tell you about"
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
          detail: "Birthday, anniversary and All Souls’ — you can switch any of them off",
        },
      ]}
      note="The notification service is not switched on yet, so nothing on this page was really sent. We never send marketing or promotions to a family in an active arrangement — that is a promise, not a setting."
    />
  );
}
