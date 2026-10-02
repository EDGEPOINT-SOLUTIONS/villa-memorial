import { CalendarCheck, MapPin, Phone } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { familyPeople, getFamilyHousehold } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { countWord, familyTodayKey } from "@/lib/family/family-view";
import { personIdFrom } from "@/lib/family/family-household";
import { PersonSwitcher } from "@/components/family/family-person-switcher";
import { FamilyEmptyState } from "@/components/family/family-empty";
import {
  FamilyVisitCalendar,
  type CalendarPerson,
} from "@/components/family/family-visit-calendar";
import {
  Answer,
  CallAction,
  QuietAction,
  QuietLink,
  Row,
  Rows,
  Steps,
  WhatThisShows,
} from "@/components/family/family-ui";
import { DashPanel } from "@/components/family/dash-ui";
import { PortalChip } from "@/components/portal/portal-ui";

export const metadata = { title: "Ask for a visit — Villa Funeraria" };

/**
 * Ask for a visit — the family's “My Appointments” screen (PRD screen-inventory;
 * facilities-scheduling.md » Appointment & scheduling engine), rebuilt as a
 * CALENDAR (captain, 2026-09-30): the month at a glance, every recorded time
 * marked on its own day, and one tap on a day to see what that day is for.
 *
 * THE HOUSEHOLD (captain, 2026-09-30): the account looks after more than one
 * loved one. The page's own switcher (the one every family page carries) chooses
 * whose month is shown — “Everyone” reads the whole household, a person reads
 * their days alone — and the calendar's day detail always names the loved one an
 * event belongs to. The record itself is unchanged: the office's own times from
 * the family workspace fixture.
 *
 * NOTHING IS BOOKED. There is no family-facing scheduling read/write contract,
 * so the page invents no availability: a visit is asked for from the day, the
 * office confirms it by phone, and a time is only real once a person confirms
 * it. No chapel is named (the park's chapel list is still a PLACEHOLDER in staff
 * scheduling).
 */
export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePortalSessionOrRedirect("family");
  const requested = personIdFrom(await searchParams);
  const household = await getFamilyHousehold();
  const people = household.people;
  if (people.length === 0) {
    return (
      <FamilyEmptyState
        kicker="Ask for a visit"
        headline="Nobody is on your account yet."
        sub="Add the person you look after, then ask for a visit — we come to you."
      />
    );
  }

  // The household shape that just landed: a multi-person account opens on
  // “Everyone” (the whole month), and `?person=<id>` narrows to one loved one.
  // A one-person household renders exactly as it always did, with no switcher.
  const multi = people.length > 1;
  const selected = multi ? people.find((person) => person.id === requested) : people[0];
  const everyone = multi && !selected;
  const scope = everyone ? people : selected ? [selected] : people;

  const appointments = scope.flatMap((person) =>
    person.appointments.map((appointment) => ({
      ...appointment,
      person_id: person.id,
      person_name: person.name,
    })),
  );
  const confirmed = appointments.filter((appointment) => appointment.state === "confirmed").length;
  const waiting = appointments.filter((appointment) => appointment.state === "waiting").length;
  const nothingArranged = confirmed === 0 && waiting === 0;

  const calendarPeople: CalendarPerson[] = people.map((person) => ({
    id: person.id,
    name: person.name,
    life_dates: person.life_dates,
    lot_number: person.lot?.lot_number ?? "—",
    lot_section: person.lot?.section ?? "—",
    lot_plan: person.lot?.plan_name ?? "—",
    park: person.lot?.park ?? FAMILY_HELP.park,
  }));

  return (
    <div className="dash">
      {multi ? (
        <PersonSwitcher
          people={familyPeople(household)}
          selectedId={selected?.id}
          basePath="/client/appointments"
          everyoneCurrent={everyone}
          everyoneHref="/client/appointments"
        />
      ) : null}

      <Answer
        kicker="Ask for a visit"
        headline="We can come to you. Call and we will set a day."
        sub="A time is real only when our office confirms it."
        chips={
          <>
            {confirmed > 0 ? (
              <PortalChip>
                {confirmed === 1 ? "One confirmed" : `${countWord(confirmed)} confirmed`}
              </PortalChip>
            ) : null}
            {waiting > 0 ? (
              <PortalChip>
                {waiting === 1
                  ? "One waiting for the office"
                  : `${countWord(waiting)} waiting for the office`}
              </PortalChip>
            ) : null}
            {nothingArranged ? <PortalChip>Nothing arranged yet</PortalChip> : null}
          </>
        }
        actions={
          <>
            <CallAction label={`Call ${FAMILY_HELP.phone}`} />
            <QuietLink
              href="#calendar"
              label="See your times"
              icon={<CalendarCheck size={20} aria-hidden="true" />}
            />
          </>
        }
      />

      <div className="dash-grid">
        <DashPanel
          id="calendar"
          role="place"
          className="dash-span-12"
          label="Visits"
          title="What is arranged"
          count={
            confirmed + waiting > 0
              ? `${countWord(confirmed + waiting)} arranged`
              : undefined
          }
        >
          <FamilyVisitCalendar
            people={calendarPeople}
            appointments={appointments}
            todayKey={familyTodayKey()}
            scopePersonId={selected?.id}
          />
        </DashPanel>
      </div>

      <WhatThisShows
        extra={
          <>
            <Steps
              steps={[
                {
                  title: "Call us",
                  detail: `Any day, ${FAMILY_HELP.hours} — tell us what you need.`,
                },
                {
                  title: "We agree the day with you",
                  detail: "We find a day and time that suits you.",
                },
                {
                  title: "We write it down and confirm it",
                  detail: "It appears here as confirmed.",
                },
              ]}
            />
            <Rows>
              <Row
                icon={<Phone size={22} aria-hidden="true" />}
                title="The office line"
                meta={`${FAMILY_HELP.phone} · ${FAMILY_HELP.hours}`}
                action={<QuietAction href={FAMILY_HELP.phoneHref} label="Call to set a day" />}
              />
              <Row
                icon={<MapPin size={22} aria-hidden="true" />}
                title="Where we can meet"
                meta="Your home, the office in Sunrise, or the park at Begang."
                action={<QuietLink href="/map" label="Open the park map" />}
              />
            </Rows>
          </>
        }
      >
        The scheduling service isn’t connected yet, so nothing here books or moves a time. Call{" "}
        {FAMILY_HELP.phone}.
      </WhatThisShows>
    </div>
  );
}
