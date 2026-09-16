import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { PlannedAnswer } from "@/components/family/family-ui";

export const metadata = { title: "Requests — Villa Memorial" };

/**
 * Requests — the approved redesign (docs/08-delivery/family-portal-design).
 * Request tracking needs the service desk, which does not exist yet. This is
 * the honest designed state; nothing typed here would reach anyone, and the
 * page says so instead of showing a form that cannot be answered.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");

  return (
    <PlannedAnswer
      kicker="Requests"
      headline="Ask us for anything. Call and we will write it down and tell you who has it."
      sub="A repair, a paper, a change, a visit — anything. The request list is not connected to this page yet, so a phone call is the one way that reaches a person today."
      plannedTitle="What will be here"
      planned={[
        {
          label: "Open requests",
          detail: "What you asked for, who has it, and whether it is waiting on us or on you",
        },
        {
          label: "What you can ask for",
          detail: "Maintenance, papers, transfer, interment, the memorial, a visit",
        },
        {
          label: "A new request",
          detail: "Tell us in your own words, with a photo if it helps",
        },
        {
          label: "Closed requests",
          detail: "Everything already handled, so nothing is asked twice",
        },
      ]}
      note="Request tracking is not switched on yet. Until it is, call us and we will write your request into our own log and read it back to you."
    />
  );
}
