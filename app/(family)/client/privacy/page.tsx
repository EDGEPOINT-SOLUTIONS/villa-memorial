import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FAMILY_HELP } from "@/lib/family/contact";
import { PlannedAnswer } from "@/components/family/family-ui";

export const metadata = { title: "Privacy Center — Villa Funeraria" };

/**
 * Privacy Center — on the dashboard's dense grammar (2026-09-30). The promise
 * leads in one line; the controls that will exist sit behind the ONE shared gap
 * disclosure. Consent controls and the access log need services that do not
 * exist yet, and the page says so plainly.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");

  return (
    <div className="dash">
      <PlannedAnswer
        kicker="Privacy Center"
        headline="Nothing about your family is shared unless you say so."
        sub="The promises are below; the controls aren’t switched on yet."
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
        note={`Consent controls and the access log aren’t connected yet. Call ${FAMILY_HELP.phone} for anything about your records.`}
      />
    </div>
  );
}
