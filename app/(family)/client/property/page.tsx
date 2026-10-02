import { CalendarCheck, MapPin, Phone } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilyLotRecord, getFamilySnapshot } from "@/lib/api-client/family";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { FAMILY_HELP } from "@/lib/family/contact";
import { lotAmortization } from "@/lib/family/family-amortization";
import { personIdFrom } from "@/lib/family/family-household";
import { PersonSwitcherForSnapshot } from "@/components/family/family-person-switcher";
import { LotAmortizationPanel } from "@/components/family/family-amortization";
import { FamilyEmptyState } from "@/components/family/family-empty";
import {
  Answer,
  CallAction,
  PrimaryAction,
  QuietLink,
  Row,
  Rows,
  WhatThisShows,
} from "@/components/family/family-ui";
import { DashFacts, DashPanel } from "@/components/family/dash-ui";
import { PortalChip } from "@/components/portal/portal-ui";

export const metadata = { title: "Your lot — Villa Funeraria" };

/**
 * Your lot — the family's “My Lots” screen (PRD screen-inventory), on the
 * dashboard's dense grammar (2026-09-30): the lot record as facts in a panel,
 * the map action beside it, and the ownership detail the office holds behind the
 * ONE shared disclosure.
 *
 * Real today: the place the family's plan names, the name the record is held in
 * and the park the family can walk. A family-facing lot/ownership projection does
 * not exist yet, so what the office holds but this page cannot show is listed as
 * exactly that — never a guessed owner, co-owner, interment or figure.
 */
export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePortalSessionOrRedirect("family");
  const requested = personIdFrom(await searchParams);
  const [snapshot, lot, pricing] = await Promise.all([
    getFamilySnapshot(requested),
    getFamilyLotRecord(requested),
    loadPricingDocument(),
  ]);
  if (!snapshot) {
    return (
      <FamilyEmptyState
        kicker="Your lot"
        headline="Nobody is on your account yet."
        sub="Add the person you look after and their lot will appear here."
      />
    );
  }
  if (!lot) {
    return (
      <div className="dash">
        <PersonSwitcherForSnapshot snapshot={snapshot} basePath="/client/property" />
        <Answer
          kicker="Your lot"
          headline="No lot is recorded for this person yet."
          sub="If you hold a lot with us, call and we will connect it to this account."
          actions={<CallAction label={`Call ${FAMILY_HELP.phone}`} />}
        />
      </div>
    );
  }
  const { plan_summary } = snapshot;
  const amortization = lotAmortization(lot, pricing.lotCategories);

  return (
    <div className="dash">
      <PersonSwitcherForSnapshot snapshot={snapshot} basePath="/client/property" />
      <Answer
        kicker="Your lot"
        headline={`Lot ${lot.lot_number} is your family’s place at the park.`}
        sub="The map is real, and open to you any time."
        chips={
          <>
            <PortalChip>{lot.plan_name}</PortalChip>
            <PortalChip>{plan_summary.status}</PortalChip>
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

      <div className="dash-grid">
        <DashPanel
          role="place"
          className="dash-span-7"
          label="The record"
          title="Your family’s place"
        >
          <DashFacts
            columns={2}
            facts={[
              { label: "The park", value: lot.park },
              { label: "Section · lot", value: `Section ${lot.section} · Lot ${lot.lot_number}` },
              { label: "The plan", value: lot.plan_name },
              { label: "Held in the name of", value: `${lot.owner_name} — ${lot.owner_note}` },
              { label: "Kept by", value: lot.kept_by },
            ]}
          />
          <QuietLink href="/client/payments" label="See the money for this lot" />
        </DashPanel>

        <DashPanel role="neutral" className="dash-span-5" label="Finding your way" title="The park and the map">
          <Rows>
            <Row
              icon={<MapPin size={22} aria-hidden="true" />}
              title="The park"
              meta={FAMILY_HELP.park}
              action={<QuietLink href="/map" label="Open the park map" />}
            />
            <Row
              icon={<CalendarCheck size={22} aria-hidden="true" />}
              title="Walk the lot with us"
              meta="Call and we will agree a day."
              action={<QuietLink href="/client/appointments" label="Ask for a visit" />}
            />
          </Rows>
        </DashPanel>

        <LotAmortizationPanel amortization={amortization} className="dash-span-12" />
      </div>

      <WhatThisShows
        extra={
          <>
            <p className="dash-note">{lot.record_note}</p>
            <Rows>
              {lot.with_office.map((record) => (
                <Row key={record} title={record} />
              ))}
            </Rows>
          </>
        }
      >
        The ownership papers and the lot’s history stay with our property office. Call{" "}
        {FAMILY_HELP.phone} and we’ll read them to you.
      </WhatThisShows>
    </div>
  );
}
