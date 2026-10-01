import Link from "next/link";
import { AgentHero, AgentSection, AgendaCard, Chip, TaskRow } from "@/components/agent/agent-ui";
import { AgentCalendar } from "@/components/agent/agent-calendar";
import { listAgentAppointments, listAgentProspects } from "@/lib/api-client/agent";
import { recordedTodayKey } from "@/lib/agent/agent-calendar";
import { manilaTodayKey } from "@/lib/agent/agent-view";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FAMILY_HELP } from "@/lib/family/contact";

export const metadata = { title: "Appointments & tasks — Villa Funeraria agent portal" };

/**
 * Appointments & tasks (approved design page 07). The agent's day on one page:
 * the drive order, what to bring, whether the office has confirmed, and the
 * small promises made by text.
 *
 * THE CALENDAR (captain, 2026-10-02): “I want the appointment and tasks also has
 * a calendar where you can see what is your activity for that day are.” The
 * month now sits under the day, following the family visit calendar's shipped
 * grammar — a Monday-first grid, state-coloured marks with a named legend, and
 * the selected day's detail beside the grid on a wide screen and under it on a
 * phone. The Today drive order and the small promises stay exactly where they
 * were; the week's appointments are the calendar's own marks and day details.
 *
 * Nothing is invented and nothing is booked: appointment creation and check-off
 * wait on the scheduling/crm contracts, so the disabled controls keep their
 * names and the page says what waits rather than pretending.
 */
export default async function AgentAppointmentsPage() {
  await requirePortalSessionOrRedirect("agent");
  const [{ appointments, tasks }, prospects] = await Promise.all([
    listAgentAppointments(),
    listAgentProspects(),
  ]);

  // “Who it is with” is the office's own contact name for an appointment's
  // `contact_id`; an appointment the record does not attach to a person says so
  // by showing only its title.
  const contactNames = Object.fromEntries(prospects.map((prospect) => [prospect.id, prospect.name]));

  // The demo workspace is a frozen scenario: its own “today” is the day the
  // drive order belongs to, and the calendar opens on it. If the record carries
  // no today at all, the real Manila day stands in.
  const todayKey = recordedTodayKey(appointments, manilaTodayKey());

  const today = appointments.filter((a) => a.day === "today");
  const waiting = today.filter((a) => a.status === "waiting").length;
  const openTasks = tasks.filter((t) => !t.done).length;

  return (
    <div className="ag-page">
      <AgentHero
        eyebrow="Appointments & tasks"
        title={`${today.length} stops today, and ${openTasks} small promise${openTasks === 1 ? "" : "s"}.`}
        lead={
          waiting > 0
            ? `The day is ordered as a drive plan; ${waiting} stop${waiting === 1 ? "" : "s"} still wait for the office to confirm.`
            : "The day is ordered as a drive plan, with what to bring so nobody drives back for a paper."
        }
        chips={
          <>
            <Chip>{today.length - waiting} confirmed</Chip>
            {waiting > 0 ? <Chip>{waiting} waiting for the office</Chip> : null}
            <Chip>{openTasks} tasks</Chip>
          </>
        }
      />

      <AgentSection
        title="Today"
        sub="Every stop with what to bring — so nobody drives back for a paper."
        more={
          <button className="btn btn--secondary btn--sm" type="button" disabled title="Waits on the scheduling contract">
            Add a task
          </button>
        }
      >
        {today.length === 0 ? (
          <div className="ag-state">
            <span className="ag-state__icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v16H4zM4 10h16M9 3v3M15 3v3" /></svg>
            </span>
            <p className="ag-state__title">Nothing scheduled today</p>
            <p className="ag-state__body">Here are three people in your pipeline who would welcome a call.</p>
            <Link className="btn btn--primary" href="/agent/prospects">
              See who to call
            </Link>
          </div>
        ) : (
          <div className="ag-agenda">
            {today.map((a) => (
              <AgendaCard key={a.id} appointment={a} />
            ))}
          </div>
        )}
      </AgentSection>

      <AgentSection
        title="Small promises"
        sub="Things you said you would do. One tap to finish, and the list gets shorter."
      >
        <div className="ag-list ag-list--tight">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </div>
      </AgentSection>

      <AgentSection
        title="The calendar"
        sub="Every recorded appointment and dated task, day by day — pick a day to see what it holds."
      >
        <AgentCalendar
          appointments={appointments}
          tasks={tasks}
          contactNames={contactNames}
          todayKey={todayKey}
        />
        <div className="ag-actions">
          <Link className="btn btn--primary" href="/agent/lots">
            Book a lot viewing
          </Link>
          <a className="btn btn--secondary" href={FAMILY_HELP.phoneHref}>
            Ask the office for a slot
          </a>
        </div>
        <p className="ag-note">
          The seven appointment reasons come straight from the PRD: sales consultation · lot viewing ·
          chapel tour · funeral arrangement · contract signing · payment appointment · memorial
          consultation (facilities-scheduling.md:35). Self-booking and reminders wait on the scheduling
          contract; today the office confirms every slot.
        </p>
      </AgentSection>
    </div>
  );
}
