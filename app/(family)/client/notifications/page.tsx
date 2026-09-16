import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FAMILY_HELP } from "@/lib/family/contact";
import { FAMILY_NOTICES } from "@/lib/demo-notices";
import { FamilyHelpCard, FamilySection } from "@/components/family/family-ui";

export const metadata = { title: "Notifications — Villa Memorial" };

/**
 * Notifications — approved design page 13.
 *
 * The bell's demo notices (lib/demo-notices.ts) are shown here as what they are:
 * placeholders from the portal build, clearly labelled. The preference controls
 * and the real engine are designed and not switched on.
 */
export default async function ClientNotificationsPage() {
  await requirePortalSessionOrRedirect("family");

  return (
    <div className="fp-page">
      <header className="page-header">
        <div>
          <p className="page-header__eyebrow">Our family &amp; privacy</p>
          <h1>Notifications</h1>
          <p className="fp-lead">What we have told you, and how you would like to hear from us.</p>
        </div>
      </header>

      <section className="page-section">
        <div className="alert alert--info" role="status">
          <div>
            <strong>These notices are a placeholder from the portal build.</strong>
            <br />
            The notification service is not switched on yet, so nothing below was actually sent to
            your family. When it is, a real notice will always say what happened, when, and where to
            go — and you will choose which kinds reach you.
          </div>
        </div>
      </section>

      <FamilySection
        title="Latest"
        sub="One line each: what it is about, and where to go."
      >
        <Card>
          {FAMILY_NOTICES.map((notice) => (
            <div className="fp-row" key={notice.id}>
              <div className="fp-row__body">
                <p className="fp-row__title">{notice.title}</p>
                <p className="fp-row__meta">
                  {notice.channel} · {notice.time} ago
                </p>
                <p className="fp-row__sub">{notice.detail}</p>
              </div>
              <div className="fp-row__right">
                {notice.unread ? <Badge tone="accent">New</Badge> : <Badge tone="neutral">Read</Badge>}
              </div>
            </div>
          ))}
        </Card>
      </FamilySection>

      <FamilySection
        title="How you would like to hear from us"
        sub="Your choices will live here — nothing is pre-ticked and nothing is required."
      >
        <div className="fp-split">
          <Card header={<h3 className="fp-h3">What we send</h3>}>
            <ul className="fp-bullets">
              <li>Schedule changes and reminders (a service time moves, or the evening before)</li>
              <li>Papers and receipts (a document is ready, or something is needed from you)</li>
              <li>Payment reminders — three days before a payment, and never during a wake</li>
              <li>Memorial activity — only if you ask for it</li>
              <li>Remembrance dates — birthday, anniversary, All Souls&rsquo;</li>
            </ul>
          </Card>
          <Card header={<h3 className="fp-h3">How they reach you</h3>}>
            <ul className="fp-bullets">
              <li>Text message, to the number your family gave us</li>
              <li>Email, to your sign-in address</li>
              <li>In the portal only — no messages outside this site</li>
              <li>Quiet hours: nothing between 9:00 PM and 7:00 AM, except an emergency from our staff</li>
            </ul>
            <p className="fp-note mt-4">
              We never send marketing or promotions to a family in an active arrangement. That is a
              promise, not a setting.
            </p>
            <Link className="btn btn--secondary btn--sm mt-4" href="/client/privacy">
              Read our privacy promise
            </Link>
          </Card>
        </div>
      </FamilySection>

      <FamilySection title="While you wait, a person can help">
        <FamilyHelpCard
          phone={FAMILY_HELP.phone}
          phoneHref={FAMILY_HELP.phoneHref}
          hours={FAMILY_HELP.hours}
          office={FAMILY_HELP.office}
        />
      </FamilySection>
    </div>
  );
}
