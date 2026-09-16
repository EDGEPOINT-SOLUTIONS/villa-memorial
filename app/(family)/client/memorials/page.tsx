import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { PlannedAnswer } from "@/components/family/family-ui";

export const metadata = { title: "Remembering — Villa Memorial" };

/**
 * Remembering — the approved redesign (docs/08-delivery/family-portal-design,
 * page 06). The memorial service does not exist yet, so this is the honest
 * designed state: the strongest true fact (nothing is published), what will
 * live here, and one calm note. No invented tributes.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");
  const snapshot = await getFamilySnapshot().catch(() => null);
  const firstName = snapshot?.loved_one.name.split(/\s+/)[0] || "Your loved one";

  return (
    <PlannedAnswer
      kicker="Remembering"
      headline={`Nothing about ${firstName} is published anywhere.`}
      sub={`The memorial page your family keeps — the story, the photos and the messages friends write — is designed and not switched on yet. When it is, nothing shows until someone in your family says yes.`}
      plannedTitle="What will be here"
      planned={[
        {
          label: "A page kept by your family",
          detail: "Their story and photos, added whenever you are ready",
        },
        {
          label: "Messages waiting for your yes",
          detail: "Tributes from family and friends — nothing shows until you approve it",
        },
        {
          label: "Who can see it",
          detail: "Only your family, a private link, or anyone — you choose",
        },
        {
          label: "Dates we can remind you about",
          detail: "Their birthday, the anniversary and All Souls’ — you can switch any of them off",
        },
        {
          label: "Years from now",
          detail: "The page stays for as long as your family keeps it",
        },
      ]}
      note={`The memorial service is not switched on yet. Until it is, nothing about ${firstName} appears anywhere, and no message can be posted.`}
    />
  );
}
