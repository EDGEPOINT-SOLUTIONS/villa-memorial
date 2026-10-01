import { CalendarCheck, MapPin, Phone } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { listFamilyAppointments } from "@/lib/api-client/family";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { countWord } from "@/lib/family/family-view";
import { personIdFrom } from "@/lib/family/family-household";
import { PersonSwitcherForSnapshot } from "@/components/family/family-person-switcher";
import {
  Answer,
  AppointmentCard,
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
 * facilities-scheduling.md » Appointment & scheduling engine), on the dashboard's
 * dense grammar (2026-09-30).
 *
 * Real today: the office's own record of the family's times — what is confirmed,
 * what still waits for a person to confirm it, and what has happened. Scheduling
 * has no family-facing write contract, so nothing here books or moves a time: the
 * phone call is the path, and the page says so. No chapel is named (the park's
 * chapel list is still a PLACEHOLDER in staff scheduling) and no time is ever
 * presented as agreed when a human has not confirmed it.
 */
export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePortalSessionOrRedirect("family");
  const requested = personIdFrom(await searchParams);
  const [snapshot, appointments] = await Promise.all([
    getFamilySnapshot(requested),
    listFamilyAppointments(requested),
  ]);

  const arranged = appointments.filter((appointment) => appointment.state === "confirmed");
  const waiting = appointments.filter((appointment) => appointment.state === "waiting");
  const past = appointments
    .filter((appointment) => appointment.state === "past")
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  const nothingArranged = arranged.length === 0 && waiting.length === 0;

  return (
    <div className="dash">
      <PersonSwitcherForSnapshot snapshot={snapshot} basePath="/client/appointments" />
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

      <div className="dash-grid">
        <DashPanel
          id="times"
          role="place"
          className="dash-span-12"
          label="Visits"
          title="What is arranged"
          count={arranged.length > 0 ? countWord(arranged.length) : undefined}
        >
          {arranged.length > 0 ? (
            <div className="ag-agenda">
              {arranged.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))}
            </div>
          ) : (
            <p className="dash-empty">
              Nothing is confirmed at the moment. Call us and we will agree a day.
            </p>
          )}
        </DashPanel>

        {waiting.length > 0 ? (
          <DashPanel
            role="needs"
            className="dash-span-12"
            label="Waiting"
            title="Waiting for the office"
            count={countWord(waiting.length)}
          >
            <p className="dash-note">Not agreed yet — please do not travel for these.</p>
            <div className="ag-agenda">
              {waiting.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))}
            </div>
          </DashPanel>
        ) : null}

        {past.length > 0 ? (
          <DashPanel
            role="neutral"
            className="dash-span-12"
            label="Past"
            title="What you asked about before"
          >
            <div className="ag-agenda">
              {past.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))}
            </div>
          </DashPanel>
        ) : null}
      </div>

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
    </div>
  );
}
