import { Bell, ChevronRight, Lock, Mail, Phone, User, Users } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import {
  Answer,
  PrimaryAction,
  QuietLink,
  Row,
  Rows,
  Section,
} from "@/components/family/family-ui";
import { PortalCard } from "@/components/portal/portal-ui";
import { FamilyReadingPreferences } from "@/components/family/family-reading-preferences";

export const metadata = { title: "Your details — Villa Memorial" };

/**
 * Your details — the family's profile screen, on the shared portal kit. Real
 * today: the account details the snapshot holds and the device-local reading
 * preferences — the one control that works right now and serves the older
 * reader. Signing out lives in the sidebar (the same place as the agent
 * portal's).
 */
export default async function ClientProfilePage() {
  const session = await requirePortalSessionOrRedirect("family");
  const snapshot = await getFamilySnapshot();
  const { family } = snapshot;
  const email = session.email ?? family.email;

  return (
    <>
      <Answer
        kicker="Your details"
        headline="Your details are correct. You can make the writing bigger if you like."
        sub={`${family.display_name} · ${email} · ${family.primary_contact}. If anything changes, call us and we will update it for you.`}
        actions={
          <>
            <PrimaryAction href="#reading" label="Make the writing bigger" />
            <QuietLink
              href={FAMILY_HELP.phoneHref}
              label="Call to change something"
              icon={<Phone size={20} aria-hidden="true" />}
            />
          </>
        }
      />

      <Section
        id="reading"
        title="Make it easier to read"
        sub="These three settings work on this device, right away."
      >
        <PortalCard>
          <FamilyReadingPreferences />
        </PortalCard>
      </Section>

      <Section title="Your details" sub="Exactly as our office has them.">
        <Rows>
          <Row icon={<User size={22} aria-hidden="true" />} title="Name" meta={family.display_name} />
          <Row
            icon={<Mail size={22} aria-hidden="true" />}
            title="Email — this is also how you sign in"
            meta={email}
          />
          <Row
            icon={<Phone size={22} aria-hidden="true" />}
            title="Phone"
            meta={family.primary_contact}
          />
        </Rows>
        <p className="ag-note">
          To change any of these, call <a href={FAMILY_HELP.phoneHref}>{FAMILY_HELP.phone}</a> or
          tell us at the office — it takes a minute.
        </p>
      </Section>

      <Section title="Your family and your privacy">
        <Rows>
          <Row
            icon={<Users size={22} aria-hidden="true" />}
            title="Your family"
            meta="Who in your family can see this arrangement"
            action={
              <QuietLink
                href="/client/family"
                label="Open"
                icon={<ChevronRight size={20} aria-hidden="true" />}
              />
            }
          />
          <Row
            icon={<Bell size={22} aria-hidden="true" />}
            title="What we tell you about"
            meta="Change what we send, and when"
            action={
              <QuietLink
                href="/client/notifications"
                label="Open"
                icon={<ChevronRight size={20} aria-hidden="true" />}
              />
            }
          />
          <Row
            icon={<Lock size={22} aria-hidden="true" />}
            title="Privacy Center"
            meta="What we hold, and who on our staff has looked at it"
            action={
              <QuietLink
                href="/client/privacy"
                label="Open"
                icon={<ChevronRight size={20} aria-hidden="true" />}
              />
            }
          />
        </Rows>
      </Section>
    </>
  );
}
