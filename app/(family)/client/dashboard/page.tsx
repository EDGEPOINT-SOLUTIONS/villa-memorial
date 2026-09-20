import { CreditCard, FileText, Phone, Sparkles } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { countWord, familyDocumentView, paidPercent, percentWords } from "@/lib/family/family-view";
import { isOwnedPaper } from "@/lib/family/family-documents";
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
  WhatThisShows,
} from "@/components/family/family-ui";
import { PortalChip, PortalFigure, PortalFigures } from "@/components/portal/portal-ui";

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
 * compressed to the family reading budget (2026-09-21): ONE sentence answers
 * the page, the essentials are rows, and everything the records cannot show yet
 * sits behind the ONE shared `WhatThisShows` disclosure.
 *
 * Real today: the loved one's name, the plan, the balance and the papers the
 * snapshot records. The funeral schedule, the case progress and the memorial
 * are not wired — the disclosure says so in one line instead of inventing
 * detail.
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
          sub="Nothing is wrong with your plan. Try again, or call us."
          actions={
            <QuietLink
              href={FAMILY_HELP.phoneHref}
              label={`Call ${FAMILY_HELP.phone}`}
              icon={<Phone size={20} aria-hidden="true" />}
            />
          }
        />
        <Note>
          <p>Call {FAMILY_HELP.phone} — {FAMILY_HELP.hours} — and we will read it to you.</p>
        </Note>
      </>
    );
  }

  const { loved_one, plan_summary, balance, balance_cents, recent_documents } = snapshot;
  // The family's own papers (contract, receipts) keep the “Yours” treatment wherever
  // they surface; everything else keeps the request path (lib/family/family-documents).
  const documents = recent_documents.map((record) => ({
    record,
    owned: isOwnedPaper(record),
    view: familyDocumentView(record.title, record.status),
  }));
  const waiting = documents.filter(
    ({ view }) => view.tone === "warning" || view.tone === "danger",
  );
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
        sub={hasBalance ? `The next date is ${plan_summary.next_due}.` : `${firstName}’s plan is fully paid.`}
        chips={
          <>
            <PortalChip>{plan_summary.plan_name}</PortalChip>
            <PortalChip>{hasBalance ? `Next date: ${plan_summary.next_due}` : "Paid in full"}</PortalChip>
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

      <Section title="What needs you now" sub="One thing per row.">
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
          {waiting.map(({ view: doc, owned }) => (
            <Row
              key={doc.title}
              icon={<FileText size={22} aria-hidden="true" />}
              title={doc.title}
              meta={doc.note}
              state={doc.status}
              wait
              action={
                owned ? (
                  <QuietAction href="/client/documents" label="See it in your papers" />
                ) : (
                  <QuietAction href={FAMILY_HELP.phoneHref} label="Ask about it" />
                )
              }
            />
          ))}
          {!hasBalance && waiting.length === 0 ? (
            <Row
              icon={<Sparkles size={22} aria-hidden="true" />}
              title="Nothing needs you today"
              meta="Your plan is paid and your papers are in order."
              state="All clear"
            />
          ) : null}
        </Rows>
      </Section>

      <Section
        id="money"
        title="Money and papers"
        sub="Your plan and the papers your family holds."
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
      </Section>

      <WhatThisShows extra={<div style={{ marginTop: "var(--space-4)" }}><Chain /></div>}>
        The funeral times and the memorial aren’t connected yet. Call {FAMILY_HELP.phone} and we’ll tell
        you.
      </WhatThisShows>
    </>
  );
}
