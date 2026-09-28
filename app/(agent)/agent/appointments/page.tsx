import Link from "next/link";
import { AgentHero, AgentSection, AgendaCard, Chip, TaskRow, WeekRow } from "@/components/agent/agent-ui";
import { listAgentAppointments } from "@/lib/api-client/agent";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FAMILY_HELP } from "@/lib/family/contact";

export const metadata = { title: "Appointments & tasks — Villa Funeraria agent portal" };

/**
 * Appointments & tasks (approved design page 07). The agent's day on one page:
 * the drive order, what to bring, whether the office has confirmed, and the
 * small promises made by text. Appointment creation and check-off wait on the
 * scheduling/crm contracts — the page says so rather than pretending.
 */
export default async function AgentAppointmentsPage() {
  await requirePortalSessionOrRedirect("agent");
  const { appointments, tasks } = await listAgentAppointments();

  const today = appointments.filter((a) => a.day === "today");
  const week = appointments.filter((a) => a.day === "week");
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

      <AgentSection title="The rest of the week" sub="Enough to plan the driving, not so much that today gets lost.">
        <div className="ag-card">
          <div className="ag-card__body">
            {week.map((a) => (
              <WeekRow key={a.id} appointment={a} />
            ))}
          </div>
        </div>
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
