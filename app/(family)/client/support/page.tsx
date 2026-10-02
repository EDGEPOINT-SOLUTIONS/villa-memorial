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
} from "@/components/family/family-ui";
import { DashPanel } from "@/components/family/dash-ui";

export const metadata = { title: "Help — Villa Funeraria" };

/**
 * Help — the family's “Support/Ticket” screen (PRD screen-inventory), on the
 * dashboard's dense grammar (2026-09-30). This page is real today: the client's
 * own numbers and places, with the biggest button in the portal on the one
 * action that always works.
 */
export default async function ClientSupportPage() {
  await requirePortalSessionOrRedirect("family");

  return (
    <div className="dash">
      <Answer
        kicker="Help"
        headline="Call us. Someone is here every day from 7 in the morning to 9 at night."
        sub="Any question — answered every day."
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

      <div className="dash-grid">
        <DashPanel role="place" className="dash-span-6" label="Numbers" title="Other numbers">
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
        </DashPanel>

        <DashPanel role="neutral" className="dash-span-6" label="Places" title="Where to find us">
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
          <QuietLink href="/map" label="Open the park map" />
        </DashPanel>

        <DashPanel
          role="neutral"
          className="dash-span-12"
          label="Problem"
          title="Something we did wrong?"
        >
          <p className="dash-state">Call and ask for the manager.</p>
          <QuietLink
            href={FAMILY_HELP.phoneHref}
            label="Call the office"
            icon={<Phone size={20} aria-hidden="true" />}
          />
        </DashPanel>
      </div>
    </div>
  );
}
