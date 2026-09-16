import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { PlannedAnswer } from "@/components/family/family-ui";

export const metadata = { title: "Family and access — Villa Memorial" };

/**
 * Family and access — the approved redesign (docs/08-delivery/family-portal-design).
 * Family membership needs the identity service to carry family roles; today one
 * account signs in. This is the honest designed state.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");

  return (
    <PlannedAnswer
      kicker="Family and access"
      headline="Today, one account signs in. A family circle with its own roles is on its way."
      sub="When it arrives, you will choose who in your family sees the arrangement, the payments and the memorial — each person with their own sign-in and their own level of access."
      plannedTitle="What will be here"
      planned={[
        {
          label: "The people on this account",
          detail: "Each person’s role in plain words",
        },
        {
          label: "What each person can see",
          detail: "The arrangement, the payments, the papers and the memorial",
        },
        {
          label: "Family living abroad",
          detail: "Joining from overseas, local times, and the live link",
        },
        {
          label: "Decisions and consent",
          detail: "Changing who decides, and what your family has agreed to share",
        },
      ]}
      note="Family membership is not switched on yet. Until it is, one account signs in — call us if someone else in your family needs their own access, and we will arrange it with you."
    />
  );
}
