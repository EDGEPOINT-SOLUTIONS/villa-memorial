import { CalendarCheck, MapPin, Phone } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { listFamilyAppointments } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { countWord } from "@/lib/family/family-view";
import {
  Answer,
  AppointmentCard,
  CallAction,
  QuietAction,
  QuietLink,
  Row,
  Rows,
  Section,
  Steps,
  WhatThisShows,
} from "@/components/family/family-ui";
import { PortalChip } from "@/components/portal/portal-ui";

export const metadata = { title: "Ask for a visit — Villa Funeraria" };

/**
 * Ask for a visit — the family's “My Appointments” screen (PRD screen-inventory;
 * facilities-scheduling.md » Appointment & scheduling engine), compressed to the
 * family reading budget (2026-09-21): one-sentence hero, the family's own times,
 * and “how a time gets set” behind the ONE shared `WhatThisShows` disclosure.
 *
 * Real today: the office's own record of the family's times — what is confirmed,
 * what still waits for a person to confirm it, and what has happened. Scheduling
 * has no family-facing write contract, so nothing here books or moves a time: the
 * phone call is the path, and the page says so. No chapel is named (the park's
 * chapel list is still a PLACEHOLDER in staff scheduling) and no time is ever
 * presented as agreed when a human has not confirmed it.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");
  const appointments = await listFamilyAppointments();

  const arranged = appointments.filter((appointment) => appointment.state === "confirmed");
  const waiting = appointments.filter((appointment) => appointment.state === "waiting");
  const past = appointments
    .filter((appointment) => appointment.state === "past")
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  const nothingArranged = arranged.length === 0 && waiting.length === 0;

  return (
    <>
      <Answer
        kicker="Ask for a visit"
        headline="We can come to you. Call and we will set a day."
        sub="A time is real only when our office confirms it."
        chips={
          <>
            {arranged.length > 0 ? (
              <PortalChip>
                {arranged.length === 1 ? "One confirmed" : `${countWord(arranged.length)} confirmed`}
              </PortalChip>
            ) : null}
            {waiting.length > 0 ? (
              <PortalChip>
                {waiting.length === 1
                  ? "One waiting for the office"
                  : `${countWord(waiting.length)} waiting for the office`}
              </PortalChip>
            ) : null}
            {nothingArranged ? <PortalChip>Nothing arranged yet</PortalChip> : null}
          </>
        }
        actions={
          <>
            <CallAction label={`Call ${FAMILY_HELP.phone}`} />
            <QuietLink
              href="#times"
              label="See your times"
              icon={<CalendarCheck size={20} aria-hidden="true" />}
            />
          </>
        }
      />

      <Section id="times" title="What is arranged" sub="A confirmed time, with where to be.">
        {arranged.length > 0 ? (
          <div className="ag-agenda">
            {arranged.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        ) : (
          <p className="ag-sub">
            Nothing is confirmed at the moment. Call us and we will agree a day.
          </p>
        )}
      </Section>

      {waiting.length > 0 ? (
        <Section
          title="Waiting for the office"
          sub="Not agreed yet — please do not travel for these."
        >
          <div className="ag-agenda">
            {waiting.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        </Section>
      ) : null}

      {past.length > 0 ? (
        <Section title="What you asked about before" sub="The times behind you.">
          <div className="ag-agenda">
            {past.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        </Section>
      ) : null}

      <WhatThisShows
        extra={
          <>
            <Steps
              steps={[
                {
                  title: "Call us",
                  detail: `Any day, ${FAMILY_HELP.hours} — tell us what you would like to talk about.`,
                },
                {
                  title: "We agree the day with you",
                  detail: "We check who is free and propose a time that suits your family.",
                },
                {
                  title: "We write it down and confirm it",
                  detail: "It appears here as confirmed, and we call if anything changes.",
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
    </>
  );
}
