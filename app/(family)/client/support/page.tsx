import { Building2, MapPin, MessageCircle, Phone, Store } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FAMILY_HELP } from "@/lib/family/contact";
import {
  Answer,
  CallAction,
  QuietAction,
  QuietLink,
  Row,
  Rows,
  Section,
} from "@/components/family/family-ui";

export const metadata = { title: "Help — Villa Memorial" };

/**
 * Help — the family's “Support/Ticket” screen (PRD screen-inventory), on the
 * shared portal kit. This page is real today: the client's own numbers and
 * places, with the biggest button in the portal on the one action that always
 * works.
 */
export default async function ClientSupportPage() {
  await requirePortalSessionOrRedirect("family");

  return (
    <>
      <Answer
        kicker="Help"
        headline="Call us. Someone is here every day from 7 in the morning to 9 at night."
        sub="Arrangements, payments, papers, or just a question — the office line is answered every day. If nobody picks up, leave your name and number and we will call you back."
        actions={
          <>
            <CallAction label={`Call ${FAMILY_HELP.phone}`} />
            <QuietLink
              href="/client/appointments"
              label="Ask us to come to you"
              icon={<MessageCircle size={20} aria-hidden="true" />}
            />
          </>
        }
        help
      />

      <Section title="Other numbers">
        <Rows>
          <Row
            icon={<Phone size={22} aria-hidden="true" />}
            title="Funerals — second line"
            meta={`${FAMILY_HELP.secondPhone} · when the first line is busy`}
            action={<QuietAction href={FAMILY_HELP.secondPhoneHref} label="Call" />}
          />
          <Row
            icon={<Building2 size={22} aria-hidden="true" />}
            title="Villa Agency — plan questions"
            meta={`${FAMILY_HELP.agencyPhone} · beneficiaries, transfers, claims`}
            action={<QuietAction href={FAMILY_HELP.agencyPhoneHref} label="Call" />}
          />
        </Rows>
      </Section>

      <Section title="Where to find us">
        <Rows>
          <Row
            icon={<Store size={22} aria-hidden="true" />}
            title="The office"
            meta={FAMILY_HELP.office}
          />
          <Row
            icon={<MapPin size={22} aria-hidden="true" />}
            title="Funeraria Villa"
            meta="Aguada, Isabela City · where the viewing is"
          />
          <Row
            icon={<MapPin size={22} aria-hidden="true" />}
            title="The park"
            meta={FAMILY_HELP.park}
          />
        </Rows>
        <p>
          <QuietLink href="/map" label="Open the park map" />
        </p>
      </Section>

      <Section
        title="Something we did wrong?"
        sub="Tell us. Call and ask for the manager — we would rather hear it from you than not at all."
      >
        <QuietLink
          href={FAMILY_HELP.phoneHref}
          label="Call the office"
          icon={<Phone size={20} aria-hidden="true" />}
        />
      </Section>
    </>
  );
}
