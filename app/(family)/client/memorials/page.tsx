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
  Note,
  QuietLink,
  RecordCard,
  RecordFacts,
  Row,
  Rows,
  Section,
} from "@/components/family/family-ui";
import { PortalChip, PortalKv } from "@/components/portal/portal-ui";

export const metadata = { title: "Remembering — Villa Memorial" };

/**
 * Remembering — the family's “My Memorials” screen (PRD screen-inventory;
 * 06-cultural-digital-memorial/digital-memorial.md » Villa eMemorial page), on
 * the shared portal kit.
 *
 * THE STATE IS THE FACT: no digital-memorial service exists, so nothing about
 * the loved one is published anywhere and no message can be posted. What the
 * page shows is the record the office actually holds (their name, life dates and
 * the place the plan names), then the decisions the family will make when the
 * service opens — all marked “not decided yet”, because no visibility default
 * exists or may be invented. No tribute, photo or date we do not hold appears
 * here.
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
        sub={`The page your family keeps — the story, the photos and the messages friends write — is designed and not switched on yet. Here is the record we hold for ${firstName}, and what your family will decide when it opens.`}
        chips={
          <>
            <PortalChip>Not published anywhere</PortalChip>
            <PortalChip>{loved_one.life_dates}</PortalChip>
            <PortalChip>Your family decides first</PortalChip>
          </>
        }
        actions={
          <>
            <CallAction label={`Call ${FAMILY_HELP.phone}`} />
            <QuietLink
              href="#choices"
              label="What your family will decide"
              icon={<MessageCircle size={20} aria-hidden="true" />}
            />
          </>
        }
      />

      <Section
        title="In loving memory"
        sub="The record our office holds. A photograph is never required, and never posted without your family."
      >
        <RecordCard
          kicker="In loving memory"
          title={loved_one.name}
          subtitle={loved_one.life_dates}
          monogram={initials}
        >
          <p className="fv-record__sub">
            {initials
              ? `A photo is not required — “${initials}” stays here until your family is ready to choose one.`
              : "A photograph is never required, and nothing is posted without your family."}
          </p>
          <RecordFacts>
            <PortalKv
              label="Their place"
              value={`Lot ${lot.lot_number} · ${lot.park}`}
            />
            <PortalKv label="The plan" value={plan_summary.plan_name} />
          </RecordFacts>
        </RecordCard>
      </Section>

      <Section
        id="choices"
        title="Who will be able to see it"
        sub="Nothing is decided yet, and we will not decide for you. When the page opens, your family chooses this — and can change it whenever you like."
      >
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
            meta="For family who are not on the account — they get a link, never a search result."
            state="Not decided yet"
          />
          <Row
            icon={<Globe size={22} aria-hidden="true" />}
            title="Anyone who looks for them"
            meta="The page would appear in a public search. This one is yours to allow, and off unless you say so."
            state="Not decided yet"
          />
        </Rows>
      </Section>

      <Section
        title="What your family will be able to add"
        sub="Everything here waits for your yes. Nothing is added, and nothing is published, until someone in your family says so."
      >
        <Rows>
          <Row
            icon={<BookOpen size={22} aria-hidden="true" />}
            title="Their story"
            meta="The words you use when you talk about them — written whenever you are ready, not before."
          />
          <Row
            icon={<ImageIcon size={22} aria-hidden="true" />}
            title="Photographs"
            meta="As many as you like, and you can take any of them down again."
          />
          <Row
            icon={<MessageCircle size={22} aria-hidden="true" />}
            title="Messages from family and friends"
            meta="Tributes arrive and wait for your family to approve — nothing shows until you approve it."
          />
          <Row
            icon={<CalendarHeart size={22} aria-hidden="true" />}
            title="The dates you want to remember"
            meta="Their birthday, the anniversary, All Souls’ — each one can be switched off at any time."
          />
          <Row
            icon={<Hourglass size={22} aria-hidden="true" />}
            title="The years to come"
            meta="The page stays for as long as your family keeps it, and you can close it whenever you choose."
          />
        </Rows>
      </Section>

      <Note>
        <p>
          <strong>About this page.</strong> The memorial service is not switched on yet, so nothing
          about {firstName} appears anywhere — not here, not in a search, and no message can be
          posted by anyone. The name, the dates and the place come from our office’s own record.
          When the page opens we will ask your family first, and until then call {FAMILY_HELP.phone}{" "}
          — {FAMILY_HELP.hours} — and we will write down anything you would like on it.
        </p>
      </Note>
    </>
  );
}
