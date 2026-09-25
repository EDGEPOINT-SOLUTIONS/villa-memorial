import Link from "next/link";
import { AgentHero, AgentSection, AgendaCard, Chip, MoneyCard, WorkItemRow, money } from "@/components/agent/agent-ui";
import { getAgentToday, listAgentAppointments, listAgentProspects } from "@/lib/api-client/agent";
import { nextActionItem, orderWorkItems, workState, manilaTime } from "@/lib/agent/agent-view";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";

export const metadata = { title: "Today — Villa Memorial agent portal" };

/** Quick-action icon per fixture key (lucide paths, inline — no icon font). */
function quickIcon(key: string) {
  const paths: Record<string, string> = {
    new_lead: "M12 5v14M5 12h14",
    lots: "M12 2 7 8h3v4H6l-2 5h6v3h4v-3h6l-2-5h-4V8h3z",
    materials: "M4 6h16v12H4zM4 10h16M9 14h6",
    phone: "M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3z",
  };
  return paths[key] ?? paths.new_lead;
}

function manilaDayLabel(now: Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
}

/**
 * Today — the agent's work list (approved design page 02). The first screen
 * answers two questions: what needs me now, and what do I do next. Figures
 * carry their meaning; commission stays a placeholder until the engine exists.
 */
export default async function AgentTodayPage() {
  const session = await requirePortalSessionOrRedirect("agent");
  const [today, prospects, schedule] = await Promise.all([
    getAgentToday(),
    listAgentProspects(),
    listAgentAppointments(),
  ]);
  const now = new Date();
  const items = orderWorkItems(today.work_items, now);
  const next = nextActionItem(today.work_items, now);
  const appointments = schedule.appointments;
  const stops = appointments.filter((a) => a.day === "today");
  const firstStop = [...stops].sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];

  // Chips are counted from the loaded record, never a fixture string: a hard-coded
  // count drifts the moment the office's data does.
  const chips = [
    `${items.filter((i) => workState(i, now) === "overdue").length} overdue · ${
      items.filter((i) => workState(i, now) === "today").length
    } today`,
    firstStop
      ? `${stops.length} stop${stops.length === 1 ? "" : "s"} · first at ${manilaTime(firstStop.starts_at)}`
      : "No stops today",
    `${prospects.length} people in your pipeline`,
  ];

  const phoneOf = new Map(prospects.map((p) => [p.id, p.phone]));
  const pctTarget = 0;

  function actionHref(contactId: string, kind: string): string {
    const phone = phoneOf.get(contactId);
    if (kind === "send") return "/agent/marketing";
    if (kind === "document" || kind === "first_call") return `/agent/prospects/${contactId}`;
    return phone ? `tel:${phone.replace(/\s/g, "")}` : `/agent/prospects/${contactId}`;
  }

  const nextItem = next;
  const nextPhone = nextItem ? phoneOf.get(nextItem.contact_id) : undefined;

  return (
    <div className="ag-page">
      <AgentHero
        eyebrow={manilaDayLabel(now)}
        title={today.greeting}
        lead={today.lead}
        chips={chips.map((c) => (
          <Chip key={c}>{c}</Chip>
        ))}
      >
        {nextItem ? (
          <div className="ag-action">
            <div className="ag-action__body">
              <p className="ag-action__title">{today.next_action.title}</p>
              <p className="ag-action__detail">{today.next_action.detail}</p>
            </div>
            <div className="ag-action__buttons">
              <a className="btn btn--primary ag-btn-xl" href={nextPhone ? `tel:${nextPhone.replace(/\s/g, "")}` : "/agent/prospects"}>
                {today.next_action.primary_label}
              </a>
              <a
                className="btn btn--secondary ag-btn-xl"
                href={nextPhone ? `sms:${nextPhone.replace(/\s/g, "")}` : "/agent/prospects"}
              >
                {today.next_action.secondary_label}
              </a>
              <Link className="btn btn--ghost" href={`/agent/prospects/${nextItem.contact_id}`}>
                {today.next_action.quiet_label}
              </Link>
            </div>
          </div>
        ) : null}
      </AgentHero>

      <AgentSection
        title="What needs you now"
        sub="Most important first. Once you finish one, it leaves this list — we never nag you with it again."
        more={<Link className="ag-sec__more" href="/agent/prospects">See all {prospects.length} prospects →</Link>}
      >
        {items.length === 0 ? (
          <div className="ag-state">
            <span className="ag-state__icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5 9 18 20 6" /></svg>
            </span>
            <p className="ag-state__title">Nothing needs you right now</p>
            <p className="ag-state__body">Your list is clear. The day’s stops and your numbers are below.</p>
          </div>
        ) : (
          <div className="ag-worklist">
            {items.map((item) => (
              <WorkItemRow
                key={item.id}
                item={item}
                type={workState(item, now)}
                actionHref={actionHref(item.contact_id, item.kind)}
                secondaryHref={`/agent/prospects/${item.contact_id}`}
              />
            ))}
          </div>
        )}
      </AgentSection>

      <AgentSection
        title="Today's stops"
        sub="The order to drive them in, with what to bring so nobody drives back for a paper."
        more={<Link className="ag-sec__more" href="/agent/appointments">Full week →</Link>}
      >
        {stops.length === 0 ? (
          <div className="ag-state">
            <span className="ag-state__icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v16H4zM4 10h16M9 3v3M15 3v3" /></svg>
            </span>
            <p className="ag-state__title">No stops today</p>
            <p className="ag-state__body">Nothing is booked in. Your pipeline is a good place to look.</p>
            <Link className="btn btn--primary" href="/agent/prospects">
              See who to call
            </Link>
          </div>
        ) : (
          <div className="ag-agenda">
            {stops.map((a) => (
              <AgendaCard key={a.id} appointment={a} />
            ))}
          </div>
        )}
      </AgentSection>

      <AgentSection
        title="Your numbers"
        sub="Four figures, each with what it means. The commission figures follow the office's rules — the Sales & commissions page carries the full shape."
        more={<Link className="ag-sec__more" href="/agent/sales">Sales &amp; commissions →</Link>}
      >
        <div className="ag-money-grid">
          <MoneyCard
            label="Sold this month"
            value={`${today.numbers.sales_count} sales`}
            note={`${money(today.numbers.sales_total_cents)} total`}
            hero
            pill="example"
          />
          <MoneyCard
            label="Commission pending approval"
            value="₱—"
            note="Rates are not configured yet."
            pill="to be configured"
          />
          <MoneyCard
            label="Your pipeline"
            value={money(today.numbers.pipeline_total_cents)}
            note="What these people are considering together."
            pill="example"
          />
        </div>
        <div className="ag-card">
          <div className="ag-card__body">
            <div className="ag-target">
              <div className="ag-target__legend">
                <span>
                  <strong>Monthly target</strong> — set with the office
                </span>
                <span>0 of —</span>
              </div>
              <div className="ag-target__bar">
                <div className="ag-target__fill" style={{ width: `${pctTarget}%` }} />
              </div>
              <p className="ag-note">
                The bar fills against the target the office sets for you, once the commission engine is
                configured. Nothing here guesses a number (PRD finance-billing.md:16–21).
              </p>
            </div>
          </div>
        </div>
      </AgentSection>

      <AgentSection title="One tap away">
        <div className="ag-quickgrid">
          {today.quick_actions.map((a) => (
            <a className="ag-quick" href={a.href} key={a.key}>
              <span className="ag-quick__icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={quickIcon(a.key)} />
                </svg>
              </span>
              <span className="ag-quick__label">{a.label}</span>
              <span className="ag-quick__hint">{a.hint}</span>
            </a>
          ))}
        </div>
        <p className="ag-note">
          Example figures in this workspace come from the demo office record — the real numbers arrive
          with the agent-workspace contract; commission stays “—” until the client configures rates
          (open question, 07-client-villa/open-questions.md:26). Signed in as {session.email}.
        </p>
      </AgentSection>
    </div>
  );
}
