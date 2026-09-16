import { CreditCard, FileText, MessageCircle, Phone, Sparkles } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { countWord, familyDocumentView, paidPercent, percentWords } from "@/lib/family/family-view";
import {
  Answer,
  Chain,
  Note,
  PrimaryAction,
  QuietAction,
  QuietLink,
  Row,
  Rows,
  Section,
} from "@/components/family/family-ui";
import { PortalCard, PortalChip, PortalFigure, PortalFigures } from "@/components/portal/portal-ui";

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
 * Home — the customer dashboard (PRD screen-inventory “Customer Dashboard”),
 * on the shared portal kit (docs/08-delivery/agent-portal-design is the house
 * style; the family's own facts, words and honest states are unchanged).
 *
 * ONE dominant answer, one primary action, then the quiet detail: what needs
 * you now, where we are, money and papers. Real today: the loved one's name,
 * the plan, the balance and the papers the snapshot records. The funeral
 * schedule, the case progress and the memorial are not wired — each says so in
 * one calm line instead of inventing detail.
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
  const waiting = documents.filter((doc) => doc.tone === "warning" || doc.tone === "danger");
  const firstName = loved_one.name.split(/\s+/)[0] || "your family";
  const hasBalance = (balance_cents?.remaining ?? 0) > 0;
  const percent =
    balance_cents && balance_cents.total > 0
      ? paidPercent(balance_cents.total, balance_cents.paid)
      : null;

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
        chips={
          <>
            <PortalChip>{plan_summary.plan_name}</PortalChip>
            <PortalChip>Next date: {plan_summary.next_due}</PortalChip>
            <PortalChip>
              {documents.length === 1 ? "One paper" : `${countWord(documents.length)} papers`} with
              your family
            </PortalChip>
          </>
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

      <Section
        title="What needs you now"
        sub="One thing per row. Anything that is not here is ours to carry, not yours."
        more={
          <a className="ag-sec__more" href="#money">
            Money and papers ↓
          </a>
        }
      >
        <Rows>
          {hasBalance ? (
            <Row
              icon={<CreditCard size={22} aria-hidden="true" />}
              title={`${balance.remaining} still to pay`}
              meta={`The next date in your agreement is ${plan_summary.next_due}.`}
              state="To pay"
              wait
              action={<QuietAction href="/client/payments" label="See how to pay" />}
            />
          ) : null}
          {waiting.map((doc) => (
            <Row
              key={doc.title}
              icon={<FileText size={22} aria-hidden="true" />}
              title={doc.title}
              meta={doc.note}
              state={doc.status}
              wait
              action={<QuietAction href={FAMILY_HELP.phoneHref} label="Ask about it" />}
            />
          ))}
          {!hasBalance && waiting.length === 0 ? (
            <Row
              icon={<Sparkles size={22} aria-hidden="true" />}
              title="Nothing needs you today"
              meta="Your plan is paid and your papers are in order. We will put something here the moment it truly needs you."
              state="All clear"
            />
          ) : null}
        </Rows>
      </Section>

      <Section title="Where we are" sub="Five steps, start to finish. Nothing to work out.">
        <PortalCard>
          <Chain />
          <p className="ag-note">
            We will mark where your family is as soon as the arrangement records are connected
            here. Until then, call us and we will tell you exactly where things stand.
          </p>
        </PortalCard>
      </Section>

      <Section
        id="money"
        title="Money and papers"
        sub="What is left to pay, and the papers your family already holds."
        more={<a className="ag-sec__more" href="/client/documents">See all your papers →</a>}
      >
        <PortalFigures>
          <PortalFigure
            label="Still to pay"
            value={hasBalance ? balance.remaining : "Paid in full"}
            note={
              hasBalance
                ? `of ${balance.total} · next date ${plan_summary.next_due}`
                : `${balance.paid} of ${balance.total} paid — thank you.`
            }
            hero
            tone={hasBalance ? "due" : "ok"}
          />
          <PortalFigure
            label="Paid so far"
            value={balance.paid}
            note={percent === null ? `of ${balance.total}` : `${percentWords(percent)} of ${balance.total}`}
          />
          <PortalFigure
            label="Papers"
            value={documents.length === 1 ? "One" : countWord(documents.length)}
            note="With your family today"
          />
        </PortalFigures>

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
      </Section>

      <Section
        title="What happens next"
        sub="The chapel times, the funeral and the burial — kept by our office."
      >
        <PortalCard>
          <p className="ag-note">
            They are not shown here yet. Call us and we will tell you exactly what is arranged for
            your family, and this page will show it by itself once the records are switched on.
          </p>
          <p>
            <QuietLink
              href={FAMILY_HELP.phoneHref}
              label={`Call ${FAMILY_HELP.phone}`}
              icon={<MessageCircle size={20} aria-hidden="true" />}
            />
          </p>
        </PortalCard>
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
