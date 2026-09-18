import { CalendarCheck, MapPin, Phone } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { listFamilyAppointments } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { countWord } from "@/lib/family/family-view";
import {
  Answer,
  AppointmentCard,
  CallAction,
  Note,
  QuietAction,
  QuietLink,
  Row,
  Rows,
  Section,
  Steps,
} from "@/components/family/family-ui";
import { PortalChip } from "@/components/portal/portal-ui";

export const metadata = { title: "Ask for a visit — Villa Memorial" };

/**
 * Ask for a visit — the family's “My Appointments” screen (PRD screen-inventory;
 * facilities-scheduling.md » Appointment & scheduling engine), on the shared
 * portal kit.
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
        headline="We can come to you, or you can come to us. Call and we will set a time."
        sub="This is the office’s own record of the times your family has with us. A time is only real when a person from our office has confirmed it, and each card says plainly whether that has happened. To set a new one, call us: we will agree a day and write it down."
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
            <QuietLink href="#times" label="See your times" icon={<CalendarCheck size={20} aria-hidden="true" />} />
          </>
        }
      />

      <Section
        id="times"
        title="What is arranged"
        sub="A time is real only once our office confirms it. Every confirmed time is here, with where to be."
      >
        {arranged.length > 0 ? (
          <div className="ag-agenda">
            {arranged.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        ) : (
          <p className="ag-sub">
            Nothing is confirmed at the moment. Call us and we will agree a day and write it down.
          </p>
        )}
      </Section>

      {waiting.length > 0 ? (
        <Section
          title="Waiting for the office"
          sub="These are not agreed yet, so please do not travel for them. One call settles the day."
        >
          <div className="ag-agenda">
            {waiting.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        </Section>
      ) : null}

      {past.length > 0 ? (
        <Section
          title="What you asked about before"
          sub="The times behind you, and what was discussed — so you keep the thread."
        >
          <div className="ag-agenda">
            {past.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        </Section>
      ) : null}

      <Section
        id="how"
        title="How a time gets set"
        sub="Three steps, and only the first one is yours."
      >
        <Steps
          steps={[
            {
              title: "Call us",
              detail: `Any day, ${FAMILY_HELP.hours} — tell us what you would like to talk about and where you would like to meet.`,
            },
            {
              title: "We agree the day with you",
              detail: "We look at who is free, check the park or the office, and propose a time that suits your family.",
            },
            {
              title: "We write it down and confirm it",
              detail: "It appears on this page as confirmed, and we call you if anything at all has to change.",
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
            meta={`Your home, the office in Sunrise, or the park at Begang — whichever is easiest for you.`}
          />
        </Rows>
        <p>
          <QuietLink href="/map" label="Open the park map" />
        </p>
      </Section>

      <Note>
        <p>
          <strong>About this page.</strong> These times come from our office’s own record, and the
          scheduling service is not connected to this page yet — so nothing here books, moves or
          cancels by itself. A time is only real when a person has confirmed it: call{" "}
          {FAMILY_HELP.phone} and we will agree it, write it down and read it back to you.
        </p>
      </Note>
    </>
  );
}
