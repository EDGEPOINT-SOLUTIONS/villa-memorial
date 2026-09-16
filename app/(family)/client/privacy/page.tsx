import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { PlannedAnswer } from "@/components/family/family-ui";

export const metadata = { title: "Privacy Center — Villa Memorial" };

/**
 * Privacy Center — the approved redesign (docs/08-delivery/family-portal-design).
 * Consent controls and the access log need services that do not exist yet; the
 * promises below are what we hold ourselves to, and the page says plainly that
 * the buttons are not switched on.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");

  return (
    <PlannedAnswer
      kicker="Privacy Center"
      headline="Nothing about your family is shared unless you say so."
      sub="What we hold, who on our staff looked at it, and the choices that change it — the promises are below, and the controls are not switched on yet."
      plannedTitle="What will be here"
      planned={[
        {
          label: "Our promise to your family",
          detail: "What we use your records for, and what we will never do",
        },
        {
          label: "What other people can see",
          detail: "Per paper: family only, link only, public without a name, or staff only",
        },
        {
          label: "Who looked at your records",
          detail: "Your own log of every staff look-up",
        },
        {
          label: "Your choices",
          detail: "Reminders, memorial activity and park news — off unless you turn them on",
        },
        {
          label: "Your rights under the Data Privacy Act",
          detail: "See and copy, correct, object, close and erase",
        },
        {
          label: "What we keep, and for how long",
          detail: "With the reason — including what the law does not let us erase",
        },
      ]}
      note="Consent controls and the access log are not switched on yet. Until they are, call us for anything about your family’s records — a copy, a correction, or a question about who has seen them."
    />
  );
}
