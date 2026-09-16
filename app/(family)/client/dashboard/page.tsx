import { CreditCard, FileText, MessageCircle, Phone } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { familyDocumentView } from "@/lib/family/family-view";
import {
  Answer,
  Chain,
  Money,
  Note,
  PrimaryAction,
  QuietAction,
  QuietLink,
  Row,
  Rows,
  Section,
} from "@/components/family/family-ui";

export const metadata = { title: "Home — Villa Memorial" };

/** “Wednesday, 16 September” — the day the reader is looking at this page. */
function today(): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

/**
 * Family Home — the approved redesign (docs/08-delivery/family-portal-design,
 * page 02): ONE dominant answer, one primary action, then the quiet detail.
 *
 * Real today: the loved one's name, the plan, the balance and the papers the
 * snapshot records. The funeral schedule, the case progress and the memorial
 * are not wired — each says so in one calm line instead of inventing detail.
 */
export default async function ClientDashboardPage() {
  await requirePortalSessionOrRedirect("family");

  let snapshot;
  try {
    snapshot = await getFamilySnapshot();
  } catch {
    return (
      <>
        <Answer
          kicker="Home"
          headline="We cannot open your family’s summary just now."
          sub="Nothing is wrong with your account or your plan — this page could not read the record. Try again in a moment, or call us and we will read it to you."
          actions={
            <QuietLink
              href={FAMILY_HELP.phoneHref}
              label={`Call ${FAMILY_HELP.phone}`}
              icon={<Phone size={20} aria-hidden="true" />}
            />
          }
        />
        <Note>
          <p>
            <strong>What to do.</strong> Call {FAMILY_HELP.phone} — {FAMILY_HELP.hours}. You can
            also pull the page down to try again.
          </p>
        </Note>
      </>
    );
  }

  const { loved_one, plan_summary, balance, balance_cents, recent_documents } = snapshot;
  const documents = recent_documents.map((doc) => familyDocumentView(doc.title, doc.status));
  const firstName = loved_one.name.split(/\s+/)[0] || "your family";
  const hasBalance = (balance_cents?.remaining ?? 0) > 0;

  return (
    <>
      <Answer
        kicker={today()}
        headline={
          hasBalance
            ? `${balance.remaining} is still to pay on ${firstName}’s plan.`
            : "Nothing needs you today."
        }
        sub={
          hasBalance
            ? `That is what is left of ${balance.total}. The office’s next date for your family is ${plan_summary.next_due}. Nothing else needs you today.`
            : `${firstName}’s plan is fully paid and every paper is with your family. We will only put something here when it truly needs you.`
        }
        actions={
          hasBalance ? (
            <>
              <PrimaryAction href="/client/payments" label="See how to pay" />
              <QuietLink
                href={FAMILY_HELP.phoneHref}
                label="Call us about it"
                icon={<Phone size={20} aria-hidden="true" />}
              />
            </>
          ) : (
            <>
              <PrimaryAction href="/client/documents" label="See your papers" />
              <QuietLink
                href={FAMILY_HELP.phoneHref}
                label="Call us any time"
                icon={<Phone size={20} aria-hidden="true" />}
              />
            </>
          )
        }
      />

      <Section title="Where we are" sub="Five steps, start to finish. Nothing to work out.">
        <Chain />
        <p className="fv-sec__sub mt-4">
          We will mark where your family is as soon as the arrangement records are connected here.
          Until then, call us and we will tell you exactly where things stand.
        </p>
      </Section>

      <Section
        title="What happens next"
        sub="The chapel times, the funeral and the burial — kept by our office."
      >
        <p className="fv-sec__sub">
          They are not shown here yet. Call us and we will tell you exactly what is arranged for
          your family, and this page will show it by itself once the records are switched on.
        </p>
        <QuietLink
          href={FAMILY_HELP.phoneHref}
          label={`Call ${FAMILY_HELP.phone}`}
          icon={<Phone size={20} aria-hidden="true" />}
        />
      </Section>

      <Section
        title="Money and papers"
        sub="What is left to pay, and the papers your family already holds."
      >
        <Money
          figure={hasBalance ? `${balance.remaining} still to pay` : "Fully paid"}
          meaning={
            hasBalance
              ? `That is what is left of ${balance.total} for your family’s plan, ${plan_summary.plan_name}. The office’s next date is ${plan_summary.next_due}.`
              : `${balance.paid} of ${balance.total} paid. Thank you — nothing is due.`
          }
          actions={
            hasBalance ? (
              <>
                <QuietAction
                  href="/client/payments"
                  label="How to pay"
                  icon={<CreditCard size={20} aria-hidden="true" />}
                />
                <QuietLink
                  href={FAMILY_HELP.phoneHref}
                  label="Talk to us first — nothing bad happens"
                  icon={<MessageCircle size={20} aria-hidden="true" />}
                />
              </>
            ) : (
              <QuietAction
                href="/client/payments"
                label="See your payments"
                icon={<CreditCard size={20} aria-hidden="true" />}
              />
            )
          }
        />

        <Rows>
          {documents.map((doc) => (
            <Row
              key={doc.title}
              icon={<FileText size={22} aria-hidden="true" />}
              title={doc.title}
              meta={doc.note}
              state={doc.status}
              wait={doc.tone === "warning" || doc.tone === "danger"}
              action={<QuietAction href={FAMILY_HELP.phoneHref} label="Ask for a copy" />}
            />
          ))}
        </Rows>
        <p className="mt-4">
          <QuietLink href="/client/documents" label="See all your papers" />
        </p>
      </Section>

      <Note>
        <p>
          <strong>About this page.</strong> Your plan, your balance and your papers come from our
          office’s own records. The funeral times and the memorial are being connected — until
          then, call us for anything at all.
        </p>
      </Note>
    </>
  );
}
