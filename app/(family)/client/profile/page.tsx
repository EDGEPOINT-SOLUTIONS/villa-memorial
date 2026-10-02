import { Bell, ChevronRight, Lock, Mail, Phone, User, Users } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilyHousehold } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import {
  Answer,
  PrimaryAction,
  QuietLink,
  Row,
  Rows,
} from "@/components/family/family-ui";
import { DashPanel } from "@/components/family/dash-ui";
import { FamilyReadingPreferences } from "@/components/family/family-reading-preferences";

export const metadata = { title: "Your details — Villa Funeraria" };

/**
 * Your details — the family's profile screen, on the dashboard's dense grammar
 * (2026-09-30). Real today: the account details the snapshot holds and the
 * device-local reading preferences — the one control that works right now and
 * serves the older reader. Signing out lives in the sidebar (the same place as
 * the agent portal's).
 */
export default async function ClientProfilePage() {
  const session = await requirePortalSessionOrRedirect("family");
  // The account details exist even when nobody is on the account yet, so this
  // page reads the household (which always carries `family`) rather than a
  // loved one's snapshot.
  const household = await getFamilyHousehold();
  const { family } = household;
  const email = session.email ?? family.email;

  return (
    <div className="dash">
      <Answer
        kicker="Your details"
        headline="Your details are correct. You can make the writing bigger if you like."
        sub={`${family.display_name} · ${email} · ${family.primary_contact}`}
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

      <div className="dash-grid">
        <DashPanel
          id="reading"
          role="place"
          className="dash-span-12"
          label="Reading"
          title="Make it easier to read"
        >
          <FamilyReadingPreferences />
        </DashPanel>

        <DashPanel role="place" className="dash-span-7" label="Your details" title="Your details">
          <Rows>
            <Row icon={<User size={22} aria-hidden="true" />} title="Name" meta={family.display_name} />
            <Row
              icon={<Mail size={22} aria-hidden="true" />}
              title="Email (your sign-in)"
              meta={email}
            />
            <Row
              icon={<Phone size={22} aria-hidden="true" />}
              title="Phone"
              meta={family.primary_contact}
            />
          </Rows>
        </DashPanel>

        <DashPanel
          role="neutral"
          className="dash-span-5"
          label="Your family"
          title="Your family and your privacy"
        >
          <Rows>
            <Row
              icon={<Users size={22} aria-hidden="true" />}
              title="Your family"
              meta="Who can see this arrangement"
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
              meta="What we send, and when"
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
              meta="What we hold, and who looked"
              action={
                <QuietLink
                  href="/client/privacy"
                  label="Open"
                  icon={<ChevronRight size={20} aria-hidden="true" />}
                />
              }
            />
          </Rows>
        </DashPanel>
      </div>
    </div>
  );
}
