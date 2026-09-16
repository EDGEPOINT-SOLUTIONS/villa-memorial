import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FAMILY_HELP } from "@/lib/family/contact";
import { FamilyHelpCard, FamilySection } from "@/components/family/family-ui";

export const metadata = { title: "Support & tickets — Villa Memorial" };

/**
 * Support & tickets — approved design page 11, and the phone tab's "Help".
 *
 * This page is deliberately useful TODAY: the three ways a family reaches a
 * person are real (the client's own hotlines and addresses). Ticket creation and
 * tracking are designed and not switched on, and the page says so.
 */
export default async function ClientSupportPage() {
  await requirePortalSessionOrRedirect("family");

  return (
    <div className="fp-page">
      <header className="page-header">
        <div>
          <p className="page-header__eyebrow">Getting help</p>
          <h1>Support &amp; tickets</h1>
          <p className="fp-lead">Someone from Villa Memorial is always reachable — day or night.</p>
        </div>
      </header>

      <FamilySection
        title="Talk to us now"
        sub="The three ways a family actually reaches us, in the order you need them."
      >
        <div className="fp-grid-3">
          <Card header={<h3 className="fp-h3">Your coordinator</h3>}>
            <p className="fp-note">
              Arrangements, schedules and anything about the service. Answered {FAMILY_HELP.hours}.
            </p>
            <a className="btn btn--primary btn--block mt-4" href={FAMILY_HELP.phoneHref}>
              Call {FAMILY_HELP.phone}
            </a>
            <a className="btn btn--secondary btn--block mt-2" href={FAMILY_HELP.secondPhoneHref}>
              Or {FAMILY_HELP.secondPhone}
            </a>
          </Card>
          <Card header={<h3 className="fp-h3">Plan questions</h3>}>
            <p className="fp-note">
              Villa Agency handles the Villa Memorial Plan — transfers, beneficiaries and claims.
            </p>
            <a className="btn btn--secondary btn--block mt-4" href={FAMILY_HELP.agencyPhoneHref}>
              Call {FAMILY_HELP.agencyPhone}
            </a>
            <p className="fp-note mt-2">Funeraria Villa · Aguada, Isabela City</p>
          </Card>
          <Card header={<h3 className="fp-h3">Visit the office</h3>}>
            <p className="fp-note">{FAMILY_HELP.office}</p>
            <p className="fp-note">
              The park office is open at {FAMILY_HELP.park}.
            </p>
            <Link className="btn btn--secondary btn--block mt-4" href="/map">
              Open the park map
            </Link>
          </Card>
        </div>
      </FamilySection>

      <FamilySection
        title="Send us a ticket"
        sub="A written request you can follow — designed, not switched on yet."
      >
        <div className="fp-split">
          <Card header={<h3 className="fp-h3">What will be on it</h3>}>
            <ul className="fp-bullets">
              <li>What it is about — the arrangement, a payment, a paper, the memorial, privacy</li>
              <li>How urgent it is, in your words: normal, or urgent during a service</li>
              <li>Your message, written however it comes out — a person reads it, not a machine</li>
              <li>A reference number, and the name of whoever is handling it</li>
              <li>Every reply in one thread, so you never have to explain it twice</li>
            </ul>
            <div className="alert alert--info mt-4" role="status">
              <div>
                <strong>Nothing you type here would reach us yet.</strong>
                <br />
                Ticket tracking needs the service desk, so this page does not offer a form that
                cannot be answered. Call {FAMILY_HELP.phone} and we will write it down for you.
              </div>
            </div>
          </Card>
          <Card header={<h3 className="fp-h3">Your tickets</h3>}>
            <p className="empty-state__title">No tickets yet — and none can be created here yet</p>
            <p className="empty-state__hint">
              When the service desk is on, every request you make will be listed here with its
              status, who has it, and whether it is waiting on us or on you. Until then, a phone
              call is the fastest way, and we write it in our own log.
            </p>
            <div className="row row--wrap mt-4">
              <a className="btn btn--primary btn--sm" href={FAMILY_HELP.phoneHref}>
                Call {FAMILY_HELP.phone}
              </a>
              <Link className="btn btn--secondary btn--sm" href="/client/requests">
                See what requests will cover
              </Link>
            </div>
          </Card>
        </div>
      </FamilySection>

      <FamilySection
        title="The questions we hear most"
        sub="Short answers to the things families ask us on the phone."
      >
        <div className="fp-grid-3">
          <Card header={<h3 className="fp-h3">How do I reach someone at night?</h3>}>
            <p className="fp-note">
              Call {FAMILY_HELP.phone}. During a wake or a service the duty line is answered around
              the clock.
            </p>
          </Card>
          <Card header={<h3 className="fp-h3">Where are you?</h3>}>
            <p className="fp-note">
              Office: {FAMILY_HELP.office}. Funeraria Villa is in Aguada, and the park is at{" "}
              {FAMILY_HELP.park}.
            </p>
          </Card>
          <Card header={<h3 className="fp-h3">How do I pay?</h3>}>
            <p className="fp-note">
              Cash at the office, bank transfer, or GCash/Maya on the number the office confirms.
              Every payment gets an official receipt.
            </p>
            <Link className="btn btn--ghost btn--sm mt-2" href="/client/payments">
              Payments
            </Link>
          </Card>
          <Card header={<h3 className="fp-h3">How do I get a copy of a paper?</h3>}>
            <p className="fp-note">
              Call us, or tell us at the office. Certified copies for a bank, SSS or an insurer are
              usually ready the same day.
            </p>
            <Link className="btn btn--ghost btn--sm mt-2" href="/client/documents">
              Documents
            </Link>
          </Card>
          <Card header={<h3 className="fp-h3">Who do I talk to about the plan?</h3>}>
            <p className="fp-note">
              Villa Agency on {FAMILY_HELP.agencyPhone} — they handle the plan, its certificate and
              claims.
            </p>
          </Card>
          <Card header={<h3 className="fp-h3">Something went wrong</h3>}>
            <p className="fp-note">
              Tell us. Call {FAMILY_HELP.phone} and ask to speak to a manager — we would rather hear
              it from you directly.
            </p>
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
