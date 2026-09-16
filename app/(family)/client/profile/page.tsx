import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { FamilyKv, FamilySection } from "@/components/family/family-ui";
import { FamilyReadingPreferences } from "@/components/family/family-reading-preferences";

export const metadata = { title: "My profile — Villa Memorial" };

/**
 * My profile — approved design page 15.
 * Real today: the account details the snapshot holds, and the device-local
 * reading preferences (a real, working control).
 * Not yet real: editing contact details (that write needs the family records
 * service), languages and the signed-in devices list.
 */
export default async function ClientProfilePage() {
  const session = await requirePortalSessionOrRedirect("family");
  const snapshot = await getFamilySnapshot();
  const { family } = snapshot;

  return (
    <div className="fp-page">
      <header className="page-header">
        <div>
          <p className="page-header__eyebrow">Our family &amp; privacy</p>
          <h1>My profile</h1>
          <p className="fp-lead">Your details, your reading choices, and your sign-in.</p>
        </div>
      </header>

      <FamilySection
        title="About you"
        sub="These are the details we hold for your family's account."
      >
        <div className="fp-split">
          <Card header={<h3 className="fp-h3">Your details</h3>}>
            <FamilyKv
              rows={[
                ["Name", family.display_name],
                ["Email (also your sign-in)", session.email ?? family.email],
                ["Primary contact", family.primary_contact],
              ]}
            />
            <div className="alert alert--info mt-4" role="status">
              <div>
                <strong>Editing is not switched on yet.</strong>
                <br />
                Changing your own contact details needs the family records service. Until then, call{" "}
                {FAMILY_HELP.phone} or tell us at the office and we will update it for you — it takes
                a minute and you will see it here straight away.
              </div>
            </div>
          </Card>

          <Card header={<h3 className="fp-h3">Language</h3>}>
            <FamilyKv
              rows={[
                ["Language", "English"],
                ["Filipino", "Being translated — tell us if you want it first"],
                ["Chavacano", "Being translated — tell us if you want it first"],
              ]}
            />
            <p className="fp-note mt-4">
              We are adding Filipino and Chavacano. Tell us which language your family reads at home
              and we will tell you the moment it is ready.
            </p>
            <a className="btn btn--secondary btn--sm mt-4" href={FAMILY_HELP.phoneHref}>
              Tell us on {FAMILY_HELP.phone}
            </a>
          </Card>
        </div>
      </FamilySection>

      <FamilySection
        title="Language and reading"
        sub="Make the portal easier to read on this device."
      >
        <Card>
          <FamilyReadingPreferences />
        </Card>
      </FamilySection>

      <FamilySection
        title="Your sign-in and your family"
        sub="Who can see your family's arrangement, and how to get in."
      >
        <div className="fp-grid-3">
          <Card header={<h3 className="fp-h3">Sign-in</h3>}>
            <p className="fp-note">
              You sign in with your email address. If you forget your password, we can email you a
              link, or you can call us and we will help you in.
            </p>
            <Link className="btn btn--secondary btn--sm mt-4" href="/client/login">
              Sign-in options
            </Link>
          </Card>
          <Card header={<h3 className="fp-h3">Family &amp; access</h3>}>
            <p className="fp-note">
              Inviting another family member — with their own role and their own access — is part of
              the approved design and is not switched on yet.
            </p>
            <Link className="btn btn--secondary btn--sm mt-4" href="/client/family">
              See what is planned
            </Link>
          </Card>
          <Card header={<h3 className="fp-h3">Privacy Center</h3>}>
            <p className="fp-note">
              What we hold, who on our staff looked at your family&rsquo;s records, and your data
              rights under the Data Privacy Act.
            </p>
            <Link className="btn btn--secondary btn--sm mt-4" href="/client/privacy">
              Open the Privacy Center
            </Link>
          </Card>
        </div>
      </FamilySection>
    </div>
  );
}
