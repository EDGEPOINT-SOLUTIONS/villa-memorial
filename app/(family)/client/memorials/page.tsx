import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilyHousehold } from "@/lib/api-client/family";
import { readMemorialConsents } from "@/lib/api-client/memorial-store";
import { FAMILY_HELP } from "@/lib/family/contact";
import { monogram } from "@/lib/family/family-view";
import { familyImageUrl, readFamilyImage } from "@/lib/family-image-store";
import { MEMORIAL_CONSENT_DEFAULT } from "@/lib/memorials";
import { Answer, CallAction, WhatThisShows } from "@/components/family/family-ui";
import { FamilyEmptyState } from "@/components/family/family-empty";
import { MemorialVisibilityControl } from "@/components/family/memorial-visibility";
import { PortalChip } from "@/components/portal/portal-ui";

export const metadata = { title: "Remembering — Villa Funeraria" };

/**
 * Remembering — the family's “My Memorials” screen (PRD screen-inventory).
 *
 * ONE SWITCH PER LOVED ONE (captain, 2026-09-30). Each person on the account
 * gets their own switch, labelled with their name, and beside it the choices for
 * what their memorial may show: the name (always, when the switch is on), the
 * photograph, the birth year, the death year and the lot number — each the
 * family's own choice, each off by default.
 *
 * NOTHING IS PUBLISHED UNTIL A SWITCH IS ON. The state is the fact: the page
 * reads the consent store the public memorial surface reads, so a switch turned
 * on here makes the memorial appear to a search, and a switch turned off removes
 * it again.
 *
 * The office's full service (stories, messages, moderation) is still being
 * built, so the one honest gap line at the foot of the page keeps the office
 * number as the way to ask for what is genuinely missing.
 */
export default async function Page() {
  const session = await requirePortalSessionOrRedirect("family");
  const household = await getFamilyHousehold();
  if (household.people.length === 0) {
    return (
      <FamilyEmptyState
        kicker="Remembering"
        headline="Nobody is on your account yet."
        sub="Add the person you look after, then choose whether their memorial is shown."
      />
    );
  }
  const consents = await readMemorialConsents();
  const consentByPerson = new Map(consents.map((record) => [record.person_id, record]));
  const people = await Promise.all(
    household.people.map(async (person) => {
      const record = consentByPerson.get(person.id);
      let portraitSrc: string | null = null;
      try {
        const stored = await readFamilyImage(session.userId, "portrait", person.id);
        if (stored) {
          portraitSrc = familyImageUrl("portrait", stored.updated_at, person.id);
        }
      } catch {
        portraitSrc = null;
      }
      return {
        person,
        portraitSrc,
        consent: record
          ? {
              visible: record.visible,
              show_photo: record.show_photo,
              show_birth: record.show_birth,
              show_death: record.show_death,
              show_lot: record.show_lot,
            }
          : { ...MEMORIAL_CONSENT_DEFAULT },
      };
    }),
  );

  const anyoneVisible = people.some((entry) => entry.consent.visible);

  return (
    <div className="dash">
      <Answer
        kicker="Remembering"
        headline="You decide who is remembered."
        sub="Turn a memorial on, and choose what it shows."
        chips={
          <>
            <PortalChip>{people.length === 1 ? "1 loved one" : `${people.length} loved ones`}</PortalChip>
            <PortalChip>{anyoneVisible ? "Some are shown" : "Nothing published"}</PortalChip>
          </>
        }
        actions={<CallAction label={`Call ${FAMILY_HELP.phone}`} />}
      />

      <div className="mem-vis-list">
        {people.map((entry) => (
          <MemorialVisibilityControl
            key={entry.person.id}
            personId={entry.person.id}
            name={entry.person.name}
            lifeDates={entry.person.life_dates}
            initials={monogram(entry.person.name)}
            portraitSrc={entry.portraitSrc}
            initial={entry.consent}
          />
        ))}
      </div>

      <WhatThisShows>
        The office’s memorial service is still being built — stories and messages are not open yet. Call{" "}
        {FAMILY_HELP.phone} and we’ll write down what you’d like.
      </WhatThisShows>
    </div>
  );
}
