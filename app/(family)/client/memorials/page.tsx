import {
  BookOpen,
  CalendarHeart,
  Globe,
  Hourglass,
  Image as ImageIcon,
  Link2,
  MessageCircle,
  Users,
} from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilyLotRecord, getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { monogram } from "@/lib/family/family-view";
import {
  Answer,
  CallAction,
  RecordCard,
  RecordFacts,
  Row,
  Rows,
  Section,
  WhatThisShows,
} from "@/components/family/family-ui";
import { PortalChip, PortalKv } from "@/components/portal/portal-ui";

export const metadata = { title: "Remembering — Villa Memorial" };

/**
 * Remembering — the family's “My Memorials” screen (PRD screen-inventory),
 * compressed to the family reading budget (2026-09-21): one-sentence hero, the
 * record we hold, and the choices the family will make behind the ONE shared
 * `WhatThisShows` disclosure.
 *
 * THE STATE IS THE FACT: no digital-memorial service exists, so nothing about
 * the loved one is published anywhere and no message can be posted. The name,
 * the dates and the place come from the office's own record; the visibility
 * choices stay “not decided yet” because no default exists or may be invented.
 * No photograph is ever shown or proposed.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");
  const [snapshot, lot] = await Promise.all([getFamilySnapshot(), getFamilyLotRecord()]);
  const { loved_one, plan_summary } = snapshot;
  const firstName = loved_one.name.split(/\s+/)[0] || "Your loved one";
  const initials = monogram(loved_one.name);

  return (
    <>
      <Answer
        kicker="Remembering"
        headline={`Nothing about ${firstName} is published anywhere.`}
        sub="Your family decides what appears, when the page opens."
        chips={
          <>
            <PortalChip>{loved_one.life_dates}</PortalChip>
            <PortalChip>Your family decides first</PortalChip>
          </>
        }
        actions={<CallAction label={`Call ${FAMILY_HELP.phone}`} />}
      />

      <Section title="In loving memory" sub="The record our office holds.">
        <RecordCard
          kicker="In loving memory"
          title={loved_one.name}
          subtitle={loved_one.life_dates}
          monogram={initials}
        >
          <p className="fv-record__sub">
            A photograph is never required, and nothing is posted without your family.
          </p>
          <RecordFacts>
            <PortalKv label="Their place" value={`Lot ${lot.lot_number} · ${lot.park}`} />
            <PortalKv label="The plan" value={plan_summary.plan_name} />
          </RecordFacts>
        </RecordCard>
      </Section>

      <WhatThisShows
        extra={
          <>
            <Rows>
              <Row
                icon={<Users size={22} aria-hidden="true" />}
                title="Only your family"
                meta="The people on this account, and nobody else."
                state="Not decided yet"
              />
              <Row
                icon={<Link2 size={22} aria-hidden="true" />}
                title="Relatives with a private link"
                meta="A link, never a search result."
                state="Not decided yet"
              />
              <Row
                icon={<Globe size={22} aria-hidden="true" />}
                title="Anyone who looks for them"
                meta="Off unless you say so."
                state="Not decided yet"
              />
            </Rows>
            <Rows>
              <Row
                icon={<BookOpen size={22} aria-hidden="true" />}
                title="Their story"
                meta="The words you use when you talk about them."
              />
              <Row
                icon={<ImageIcon size={22} aria-hidden="true" />}
                title="Photographs"
                meta="As many as you like, and you can take any down again."
              />
              <Row
                icon={<MessageCircle size={22} aria-hidden="true" />}
                title="Messages from family and friends"
                meta="They wait for your family to approve them."
              />
              <Row
                icon={<CalendarHeart size={22} aria-hidden="true" />}
                title="The dates you want to remember"
                meta="Each one can be switched off at any time."
              />
              <Row
                icon={<Hourglass size={22} aria-hidden="true" />}
                title="The years to come"
                meta="The page stays as long as your family keeps it."
              />
            </Rows>
          </>
        }
      >
        The memorial page isn’t open yet, so nothing can be posted. Call {FAMILY_HELP.phone} and we’ll
        write down what you’d like.
      </WhatThisShows>
    </>
  );
}
