import { Archive, CalendarCheck, MapPin, Phone } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilyLotRecord, getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { paidPercent, percentWords } from "@/lib/family/family-view";
import {
  Answer,
  Note,
  PrimaryAction,
  QuietLink,
  RecordCard,
  RecordFacts,
  Row,
  Rows,
  Section,
} from "@/components/family/family-ui";
import { PortalChip, PortalFigure, PortalFigures, PortalKv } from "@/components/portal/portal-ui";

export const metadata = { title: "Your lot — Villa Memorial" };

/**
 * Your lot — the family's “My Lots” screen (PRD screen-inventory;
 * memorial-property-gis.md » Lot record + sales/ownership), on the shared portal
 * kit.
 *
 * Real today: the place the family's plan names, the name the record is held in,
 * the money already recorded on the plan and the park the family can walk. A
 * family-facing lot/ownership projection does not exist yet, so what the office
 * holds but this page cannot show is listed as exactly that — never a guessed
 * owner, co-owner, interment or figure. The park map is real and carries the
 * primary action (lib/fixtures/family/workspace.json carries the provenance).
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");
  const [snapshot, lot] = await Promise.all([getFamilySnapshot(), getFamilyLotRecord()]);

  const { balance, balance_cents, plan_summary } = snapshot;
  const hasBalance = (balance_cents?.remaining ?? 0) > 0;
  const percent =
    balance_cents && balance_cents.total > 0
      ? paidPercent(balance_cents.total, balance_cents.paid)
      : null;

  return (
    <>
      <Answer
        kicker="Your lot"
        headline={`Your lot records are kept by our office. Lot ${lot.lot_number} is your family’s place, and the map is real.`}
        sub="The ownership papers, who else may decide for the lot and what is recorded on it are held by the property office. This page shows what we can put beside you today — the place, the money already on your plan, and the map so you can find your way."
        chips={
          <>
            <PortalChip>{lot.plan_name}</PortalChip>
            <PortalChip>{plan_summary.status}</PortalChip>
            {hasBalance ? <PortalChip>{balance.remaining} still to pay</PortalChip> : null}
          </>
        }
        actions={
          <>
            <PrimaryAction href="/map" label="Open the park map" />
            <QuietLink
              href={FAMILY_HELP.phoneHref}
              label="Call us about your lot"
              icon={<Phone size={20} aria-hidden="true" />}
            />
          </>
        }
      />

      <Section
        title="Your family’s place"
        sub="The record we hold for this lot, in the office’s own words."
      >
        <RecordCard
          kicker="The lot record"
          title={`Lot ${lot.lot_number}`}
          subtitle={lot.record_note}
        >
          <RecordFacts>
            <PortalKv label="The park" value={lot.park} />
            <PortalKv
              label="Section · lot"
              value={`Section ${lot.section} · Lot ${lot.lot_number}`}
            />
            <PortalKv label="The plan" value={lot.plan_name} />
            <PortalKv label="Held in the name of" value={`${lot.owner_name} — ${lot.owner_note}`} />
            <PortalKv label="Kept by" value={lot.kept_by} />
          </RecordFacts>
        </RecordCard>
      </Section>

      <Section
        title="What the office keeps for you"
        sub="These belong to your lot’s own record. They are not on this page yet, and no guess belongs in their place."
      >
        <Rows>
          {lot.with_office.map((record) => (
            <Row key={record} icon={<Archive size={22} aria-hidden="true" />} title={record} />
          ))}
        </Rows>
        <p>
          <QuietLink
            href={FAMILY_HELP.phoneHref}
            label="Call and we will read them to you"
            icon={<Phone size={20} aria-hidden="true" />}
          />
        </p>
      </Section>

      <Section
        title="Money for this lot"
        sub="Every amount here is the one already recorded on your family’s plan — nothing has been added to it."
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
            note={
              percent === null
                ? `of ${balance.total}`
                : `${percentWords(percent)} of ${balance.total}`
            }
          />
        </PortalFigures>
        <p>
          <QuietLink href="/client/payments" label="See how to pay" />
        </p>
      </Section>

      <Section
        title="Finding your way"
        sub="The park and the office — and the map, which is open to you any time."
      >
        <Rows>
          <Row
            icon={<MapPin size={22} aria-hidden="true" />}
            title="The park"
            meta={FAMILY_HELP.park}
            action={<QuietLink href="/map" label="Open the park map" />}
          />
          <Row
            icon={<MapPin size={22} aria-hidden="true" />}
            title="The office"
            meta={FAMILY_HELP.office}
            action={<QuietLink href={FAMILY_HELP.phoneHref} label="Call us" />}
          />
          <Row
            icon={<CalendarCheck size={22} aria-hidden="true" />}
            title="Walk the lot with us"
            meta="We can meet you at the park and walk there together — call and we will agree a day."
            action={<QuietLink href="/client/appointments" label="Ask for a visit" />}
          />
        </Rows>
      </Section>

      <Note>
        <p>
          <strong>About this page.</strong> The place, the plan and the name on the record come from
          our office’s own notes of your family’s plan, and the money is the same balance shown on
          your plan — nothing here is estimated. A family-facing lot and ownership record is not
          switched on yet, so the ownership papers, the co-owners, the right of interment and the
          history of the lot stay with the property office. Call {FAMILY_HELP.phone} —{" "}
          {FAMILY_HELP.hours} — and we will find anything about your lot for you.
        </p>
      </Note>
    </>
  );
}
