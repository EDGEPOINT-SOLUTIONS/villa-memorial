import { CalendarCheck, MapPin, Phone } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilyLotRecord, getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import {
  Answer,
  PrimaryAction,
  QuietLink,
  RecordCard,
  RecordFacts,
  Row,
  Rows,
  Section,
  WhatThisShows,
} from "@/components/family/family-ui";
import { PortalChip, PortalKv } from "@/components/portal/portal-ui";

export const metadata = { title: "Your lot — Villa Memorial" };

/**
 * Your lot — the family's “My Lots” screen (PRD screen-inventory), compressed
 * to the family reading budget (2026-09-21): one-sentence hero, the record card,
 * the map, and the ownership detail the office holds behind the ONE shared
 * `WhatThisShows` disclosure. The money section is gone — it duplicated
 * Payments, and a single link replaces it.
 *
 * Real today: the place the family's plan names, the name the record is held in
 * and the park the family can walk. A family-facing lot/ownership projection
 * does not exist yet, so what the office holds but this page cannot show is
 * listed as exactly that — never a guessed owner, co-owner, interment or figure.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");
  const [snapshot, lot] = await Promise.all([getFamilySnapshot(), getFamilyLotRecord()]);
  const { plan_summary } = snapshot;

  return (
    <>
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

      <Section title="Your family’s place" sub="The record we hold for this lot.">
        <RecordCard
          kicker="The lot record"
          title={`Lot ${lot.lot_number}`}
          subtitle={`${lot.park} · Section ${lot.section}`}
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
        <p>
          <QuietLink href="/client/payments" label="See the money for this lot" />
        </p>
      </Section>

      <Section title="Finding your way" sub="The park and the map.">
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
      </Section>

      <WhatThisShows
        extra={
          <>
            <p className="small muted">{lot.record_note}</p>
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
    </>
  );
}
