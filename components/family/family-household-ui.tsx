import { CalendarClock, FileText } from "lucide-react";
import type { FamilyPerson } from "@/lib/api-client/family";
import { nextFamilyObligation, nextFamilyVisit } from "@/lib/family/family-household";
import {
  familyAppointmentState,
  familyInstantDateLabel,
  familyInstantTimeLabel,
  familyInstantWeekday,
} from "@/lib/family/family-view";
import { QuietAction, Row, Rows } from "@/components/family/family-ui";
import { PortalCard, PortalFigure, PortalFigures } from "@/components/portal/portal-ui";

function firstNameOf(person: FamilyPerson): string {
  return person.name.split(/\s+/)[0] || person.name;
}

/**
 * One loved one's summary on the household dashboard — their OWN plan and their
 * OWN next visit, never a share of a combined total.
 *
 * The figures come straight from the records the per-person pages read: what is
 * still open on the plan (or “paid in full”), and the next time the family is
 * arranging. The tone (`due` / `ok`) is the colour guidance that already ships
 * on the single-person dashboard; the sentence carries the meaning.
 */
export function PersonSummaryCard({ person, now }: { person: FamilyPerson; now?: Date }) {
  const obligation = nextFamilyObligation(person, now);
  const visit = nextFamilyVisit(person.appointments, now);
  const paid = !obligation;
  const first = firstNameOf(person);
  const papers = person.recent_documents.length;
  const lotNumber = person.lot?.lot_number;

  return (
    <PortalCard
      title={person.name}
      sub={`${person.life_dates}${lotNumber ? ` · Lot ${lotNumber}` : ""}`}
    >
      <PortalFigures>
        <PortalFigure
          hero
          label={paid ? "Plan" : "Still to pay"}
          value={paid ? "Paid in full" : obligation?.amount ?? person.balance.remaining}
          note={
            paid
              ? `${person.life_dates} · nothing owed`
              : `next date ${person.plan_summary.next_due}`
          }
          tone={paid ? "ok" : "due"}
        />
        <PortalFigure
          label="Papers"
          value={papers === 1 ? "One" : String(papers)}
          note="At home"
        />
      </PortalFigures>
      <Rows>
        <Row
          icon={<CalendarClock size={22} aria-hidden="true" />}
          title="Next visit"
          meta={
            visit
              ? `${familyInstantWeekday(visit.starts_at)}, ${familyInstantDateLabel(visit.starts_at)} · ${familyInstantTimeLabel(visit.starts_at)} · ${visit.title}`
              : "Nothing set."
          }
          state={visit ? familyAppointmentState(visit.state) : "None set"}
        />
      </Rows>
      <div className="fv-person__actions">
        <QuietAction href={`/client/plans?person=${encodeURIComponent(person.id)}`} label={`${first}’s plan`} />
        <QuietAction href={`/client/payments?person=${encodeURIComponent(person.id)}`} label={`${first}’s payments`} />
        <QuietAction
          href={`/client/documents?person=${encodeURIComponent(person.id)}`}
          label={`${first}’s papers`}
        />
      </div>
      <p className="fv-person__hint">
        <FileText size={16} aria-hidden="true" />
        <span>
          {first}’s records are kept separate — nothing here adds two people’s money together.
        </span>
      </p>
    </PortalCard>
  );
}
