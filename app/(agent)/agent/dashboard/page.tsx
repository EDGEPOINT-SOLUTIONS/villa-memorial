import Link from "next/link";
import {
  getAgentCommission,
  getAgentToday,
  listAgentApplications,
  listAgentAppointments,
  listAgentClients,
  listAgentLotAvailability,
  listAgentMaterials,
  listAgentProspects,
  type Application,
  type Appointment,
  type Client,
  type LotAvailability,
  type Material,
  type Prospect,
} from "@/lib/api-client/agent";
import { listLots, type Lot } from "@/lib/api-client/property";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import {
  agentAttention,
  clientsDueCheckIn,
  pipelineBuiltSeries,
  pipelineStageFlow,
  stopsToday,
  WORKBENCH_HELP,
} from "@/lib/agent/agent-dashboard";
import {
  interestLabel,
  manilaTime,
  needsYou,
  orderWorkItems,
  workState,
} from "@/lib/agent/agent-view";
import { pipelineValueCents } from "@/lib/agent/acquisition";
import { money, StageChip } from "@/components/agent/agent-ui";
import { OfflineQueueVital } from "@/components/agent/offline-queue";
import { StageFlow, TimeSpine, Vital, WorkbenchPanel } from "@/components/agent/workbench";
import { BarRow, LineChart, Sparkline } from "@/components/kit";
import type { LotCategory } from "@/lib/pricing-model";
import { php } from "@/lib/villa-pricing";

export const metadata = { title: "Today — Villa Funeraria agent portal" };

/** Manila date line for the header eyebrow. */
function manilaDayLabel(now: Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
}

/** "three" / "two" — a headline count in words, as the family portal writes it. */
function countWord(n: number): string {
  const words = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  return words[n] ?? String(n);
}

/** A safe read: one panel's record failing must never blank the workbench. */
async function safe<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch {
    return fallback;
  }
}

/** The 2026 sheet price for an availability row, read from the office's store. */
function sheetPrice(
  categories: ReadonlyArray<LotCategory>,
  category: string,
  product: string,
): { selling: number; monthly: number } | null {
  const row = categories
    .find((c) => c.title === category)
    ?.rows.find((r) => r.product === product);
  return row ? { selling: row.regular.selling, monthly: row.regular.monthly } : null;
}

/**
 * Today — the agent workbench (captain's accepted plan, 2026-10-01).
 *
 * ONE SCREEN, EVERY ANSWER. The agent's questions are plural and numeric — who
 * needs me, what is my day worth, what is stuck, what do I earn — so this page is
 * a workbench, not a hero. It leads with one figure (the pipeline value the agent
 * actually watches), the vitals as an inline ribbon divided by hairlines, the
 * pipeline as a stage-flow, and one analytics band. Six panels carry the day's
 * work. Every figure is a real read or a labelled example; every panel whose
 * service is not wired says which record it waits on rather than faking a value.
 */
export default async function AgentTodayPage() {
  const session = await requirePortalSessionOrRedirect("agent");

  const [today, prospects, schedule, applications, clients, commission, materials, availability, lots] =
    await Promise.all([
      safe<Awaited<ReturnType<typeof getAgentToday>> | null>(getAgentToday, null),
      safe(listAgentProspects, [] as Prospect[]),
      safe(listAgentAppointments, { appointments: [] as Appointment[], tasks: [] }),
      safe(listAgentApplications, [] as Application[]),
      safe(listAgentClients, [] as Client[]),
      safe<Awaited<ReturnType<typeof getAgentCommission>> | null>(getAgentCommission, null),
      safe(listAgentMaterials, [] as Material[]),
      safe(listAgentLotAvailability, [] as LotAvailability[]),
      safe(listLots, [] as Lot[]),
    ]);

  const now = new Date();
  const workItems = today?.work_items ?? [];
  const items = orderWorkItems(workItems, now);
  const alerts = agentAttention(workItems, applications, schedule.appointments, clients, now);
  const stops = stopsToday(schedule.appointments);
  const dueCheckIn = clientsDueCheckIn(clients);
  const flow = pipelineStageFlow(prospects);
  const series = pipelineBuiltSeries(prospects);
  const pipelineTotal = pipelineValueCents(prospects);
  const needs = needsYou(prospects);
  const overdueCount = items.filter((i) => workState(i, now) === "overdue").length;
  const todayCount = items.filter((i) => workState(i, now) === "today").length;
  const waitingApps = applications.filter((a) => a.stage === "waiting_you").length;
  const lotsAvailable = lots.filter((l) => l.status === "available").length;
  const firstStop = stops[0];
  const first = items.find((i) => workState(i, now) !== "done") ?? null;
  const firstPhone = first ? prospects.find((p) => p.id === first.contact_id)?.phone : undefined;
  const startHere = alerts[0] ?? null;

  const pricing = await safe<Awaited<ReturnType<typeof loadPricingDocument>> | null>(loadPricingDocument, null);

  const headline =
    alerts.length === 0
      ? "Nothing needs you today."
      : `${countWord(alerts.length)} ${alerts.length === 1 ? "thing needs" : "things need"} you today.`;

  const lead = [
    `${overdueCount} overdue · ${todayCount} due today`,
    stops.length > 0 ? `${stops.length} stops` : "no stops",
    `${money(pipelineTotal)} pipeline`,
    commission?.configured ? "commission set" : "commission not set",
  ].join(" · ");

  const conversion = commission?.conversion;

  return (
    <div className="workbench">
      {/* ── the compact header (a band, not a hero) ─────────────────────── */}
      <header className="wb-head">
        <div className="wb-head__text">
          <p className="wb-head__eyebrow">
            {manilaDayLabel(now)} · {session.displayName}
          </p>
          <h1 className="wb-head__title">{headline}</h1>
          <p className="wb-head__lead">{lead}</p>
          {startHere ? (
            <p className="wb-head__start">
              <span className="wb-head__start-label">Start here</span>
              <Link href={startHere.href}>{startHere.label}</Link>
            </p>
          ) : (
            <p className="wb-head__start">
              <span className="wb-head__start-label">Start here</span>
              <Link href="/agent/prospects">See who to call next</Link>
            </p>
          )}
        </div>
        <div className="wb-head__actions">
          <a
            className="btn btn--primary"
            href={firstPhone ? `tel:${firstPhone.replace(/\s/g, "")}` : "/agent/prospects"}
          >
            Call the first person
          </a>
          <Link className="btn btn--secondary" href="/agent/new">
            New lead
          </Link>
        </div>
      </header>

      {/* ── the attention strip ──────────────────────────────────────────── */}
      {alerts.length === 0 ? (
        <div className="wb-clear">
          <span className="wb-clear__dot" aria-hidden="true" />
          <p>All clear — nothing needs you today. Your list is clear.</p>
        </div>
      ) : (
        <section className="wb-alerts" aria-label="What needs you now">
          {alerts.map((alert) => (
            <article className="wb-alert" data-tone={alert.tone} key={alert.key}>
              <span className="wb-alert__dot" aria-hidden="true" />
              <div className="wb-alert__body">
                <p className="wb-alert__label">{alert.label}</p>
              </div>
              <span className="wb-alert__state">{alert.state}</span>
              <Link className="btn btn--secondary btn--sm" href={alert.href}>
                {alert.actionLabel}
              </Link>
            </article>
          ))}
        </section>
      )}

      {/* ── the brief: ONE hero figure + an inline vitals ribbon ─────────── */}
      <section className="wb-brief" aria-label="Your numbers at a glance">
        <Link className="wb-brief__lead" href="/agent/prospects">
          <p className="wb-brief__label">Your pipeline</p>
          <p className="wb-brief__figure">{money(pipelineTotal)}</p>
          <p className="wb-brief__basis">
            {prospects.length} {prospects.length === 1 ? "person" : "people"} ·{" "}
            <span className="wb-pill">example</span>
          </p>
          <Sparkline
            points={series}
            tone="sky"
            label={`Pipeline value entering, ${series.length} recorded dates`}
          />
        </Link>
        <div className="wb-brief__ribbon">
          <Vital
            label="Sold this month"
            value={`${today?.numbers.sales_count ?? 0}`}
            basis="example"
            href="/agent/sales"
            tone="example"
          />
          <Vital
            label="Needs you"
            value={`${needs.length}`}
            basis={`${overdueCount} overdue`}
            href="/agent/prospects?filter=needs"
            tone={needs.length > 0 ? "due" : "neutral"}
          />
          <Vital
            label="Stops today"
            value={`${stops.length}`}
            basis={firstStop ? `first ${manilaTime(firstStop.starts_at)}` : "nothing booked"}
            href="/agent/appointments"
          />
          <Vital
            label="Applications"
            value={`${applications.length}`}
            basis={`${waitingApps} on you`}
            href="/agent/applications"
            tone={waitingApps > 0 ? "due" : "neutral"}
          />
          <Vital
            label="Lots to show"
            value={`${lotsAvailable}`}
            basis={`of ${lots.length}`}
            href="/agent/lots"
          />
          <Vital
            label="Commission"
            value={money(commission?.pending_approval_cents ?? null)}
            basis="not set"
            href="/agent/sales"
            blank
          />
          <Vital
            label="Target"
            value="—"
            basis="not set"
            href="/agent/sales"
            blank
          />
          <Vital
            label="Clients due"
            value={`${dueCheckIn.length}`}
            basis={`of ${clients.length}`}
            href="/agent/clients?filter=visits"
          />
          <OfflineQueueVital />
        </div>
      </section>

      {/* ── the pipeline as a flow ───────────────────────────────────────── */}
      <section className="wb-flow" aria-label="Your pipeline, stage by stage">
        <div className="wb-flow__head">
          <h2 className="wb-flow__title">Your pipeline, stage by stage</h2>
          <Link className="wb-flow__more" href="/agent/prospects">
            Open the pipeline →
          </Link>
        </div>
        <StageFlow segments={flow} />
      </section>

      {/* ── the analytics band: ONE lead chart, two supporting views ──────── */}
      <section className="wb-analytics" aria-label="Your numbers over time">
        <div className="wb-analytics__lead">
          <LineChart
            title="Pipeline value entering"
            points={series}
            kind="peso_cents"
            tone="sky"
            unitLabel="₱ · cumulative contract value"
            needLabel="dated pipeline snapshots"
            footnote="Cumulative from each lead's first-contact date."
            dataTestId="chart-pipeline-built"
          />
        </div>
        <div className="wb-analytics__side">
          <LineChart
            title="Value closed"
            points={[]}
            kind="peso_cents"
            tone="gold"
            unitLabel="₱ · per month"
            needLabel="agent-attributed sale records"
            height={150}
            dataTestId="chart-value-closed"
          />
          {conversion ? (
            <BarRow
              title="This month's conversion"
              items={[
                { label: "Contacted", value: conversion.contacted },
                { label: "Presentations", value: conversion.presentations, note: "of those contacted" },
                { label: "Sold", value: conversion.sales, note: "of those presentations" },
              ]}
              kind="count"
              tone="gold"
              needLabel="a dated conversion series"
              footnote={
                conversion.example
                  ? "One example snapshot."
                  : "One recorded snapshot."
              }
              dataTestId="chart-conversion"
            />
          ) : null}
        </div>
      </section>

      {/* ── the panel grid ───────────────────────────────────────────────── */}
      <div className="wb-grid">
        <WorkbenchPanel
          role="needs"
          className="wb-span-7"
          label="Needs you"
          title="Who to call next"
          count={`${prospects.length}`}
          more={{ href: "/agent/prospects", label: `Show all ${prospects.length} →` }}
        >
          {prospects.length === 0 ? (
            <p className="wb-empty">Nobody is waiting. Capture a lead while you are with them.</p>
          ) : (
            <div className="table-wrapper" tabIndex={0} role="region" aria-label="Who to call next">
              <table className="table wb-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Stage</th>
                    <th scope="col">Next action</th>
                    <th scope="col" className="table__numeric">
                      Value
                    </th>
                    <th scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...needs, ...prospects.filter((p) => !needs.includes(p))]
                    .slice(0, 4)
                    .map((p) => (
                      <tr key={p.id}>
                        <th scope="row">
                          <Link href={`/agent/prospects/${p.id}`}>{p.name}</Link>
                          <span className="wb-table__sub">
                            {interestLabel(p.interest)} · {p.best_time.toLowerCase()}
                          </span>
                        </th>
                        <td data-label="Stage">
                          <StageChip stage={p.stage} />
                        </td>
                        <td className="wb-table__wrap" data-label="Next">{p.next_action}</td>
                        <td className="table__numeric" data-label="Value">{money(p.possible_value_cents)}</td>
                        <td className="wb-table__actions" data-label="Actions">
                          <a className="btn btn--primary btn--sm" href={`tel:${p.phone.replace(/\s/g, "")}`}>
                            Call
                          </a>
                          <a className="btn btn--secondary btn--sm" href={`sms:${p.phone.replace(/\s/g, "")}`}>
                            Text
                          </a>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </WorkbenchPanel>

        <WorkbenchPanel
          role="place"
          className="wb-span-5"
          label="Your day"
          title="Your stops"
          count={stops.length > 0 ? `${stops.length}` : undefined}
          more={{ href: "/agent/appointments", label: "Open the day →" }}
        >
          {stops.length === 0 ? (
            <p className="wb-empty">
              Nothing booked.{" "}
              <Link href="/agent/prospects">See who to call</Link>.
            </p>
          ) : (
            <TimeSpine stops={stops} />
          )}
        </WorkbenchPanel>

        <WorkbenchPanel
          role="needs"
          className="wb-span-12"
          label="In flight"
          title="Applications"
          count={`${applications.length}`}
          more={{ href: "/agent/applications", label: "Open all →" }}
        >
          {applications.length === 0 ? (
            <p className="wb-empty">No applications in flight.</p>
          ) : (
            <div className="table-wrapper" tabIndex={0} role="region" aria-label="Applications in flight">
              <table className="table wb-table">
                <thead>
                  <tr>
                    <th scope="col">Family</th>
                    <th scope="col">Product</th>
                    <th scope="col">Waits on</th>
                    <th scope="col">Promised by</th>
                    <th scope="col">Stage</th>
                    <th scope="col">
                      <span className="visually-hidden">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((a) => (
                    <tr key={a.id}>
                      <th scope="row">
                        <Link href={`/agent/clients/${a.client_id}`}>{a.client_name}</Link>
                        <span className="wb-table__sub">{a.owner}</span>
                      </th>
                      <td className="wb-table__wrap" data-label="Product">{a.product}</td>
                      <td className="wb-table__wrap" data-label="Waits on">{a.waits_on}</td>
                      <td data-label="Promised by">{a.promised_by ?? "—"}</td>
                      <td data-label="Stage">
                        <StageChip stage={a.stage === "approved" ? "reserved" : "contacted"} label={a.stage_label} />
                      </td>
                      <td className="wb-table__actions" data-label="Action">
                        <button
                          className="btn btn--secondary btn--sm"
                          type="button"
                          disabled
                          title="Document upload waits on the documents object store"
                        >
                          {a.action}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </WorkbenchPanel>

        <WorkbenchPanel
          role="money"
          className="wb-span-6"
          label="Money"
          title="Your commission"
          more={{ href: "/agent/sales", label: "Open the statement →" }}
        >
          <dl className="wb-money">
            <div>
              <dt>Pending approval</dt>
              <dd>{money(commission?.pending_approval_cents ?? null)}</dd>
            </div>
            <div>
              <dt>Approved</dt>
              <dd>{money(commission?.approved_cents ?? null)}</dd>
            </div>
            <div>
              <dt>Paid this year</dt>
              <dd>{money(commission?.paid_this_year_cents ?? null)}</dd>
            </div>
          </dl>
          <p className="wb-note">Rates are not set yet.</p>
        </WorkbenchPanel>

        <WorkbenchPanel
          role="money"
          className="wb-span-6"
          label="Price"
          title="Lots & the 2026 sheet"
          count={`${lotsAvailable} available`}
          more={{ href: "/agent/lots", label: "Park map & prices →" }}
        >
          {availability.length === 0 ? (
            <p className="wb-empty">The office&apos;s price sheet could not be read just now.</p>
          ) : (
            <div className="table-wrapper" tabIndex={0} role="region" aria-label="Lot prices">
              <table className="table wb-table">
                <thead>
                  <tr>
                    <th scope="col">Type</th>
                    <th scope="col" className="table__numeric">
                      From
                    </th>
                    <th scope="col" className="table__numeric">
                      Monthly
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {availability.map((a) => {
                    const price = pricing ? sheetPrice(pricing.lotCategories, a.category, a.product) : null;
                    return (
                      <tr key={a.key}>
                        <th scope="row">
                          {a.product}
                          <span className="wb-table__sub">
                            {a.area_sqm} sqm · {a.section}
                          </span>
                        </th>
                        <td className="table__numeric" data-label="From">{price ? php(price.selling) : "Office confirms"}</td>
                        <td className="table__numeric" data-label="Monthly">{price ? `${php(price.monthly)}/mo` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="wb-note">
            The office&apos;s 2026 sheet; a per-plot price is confirmed on the map.
          </p>
        </WorkbenchPanel>

        <WorkbenchPanel role="place" className="wb-span-4" label="Papers" title="Papers you can hand over">
          {clients.some((c) => c.papers.length > 0) ? (
            <ul className="wb-papers">
              {clients
                .filter((c) => c.papers.length > 0)
                .slice(0, 3)
                .map((c) => (
                  <li key={c.id}>
                    <Link href={`/agent/clients/${c.id}`}>{c.name}</Link>
                    <span>{c.papers.join(" · ")}</span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="wb-empty">The office can prepare one when a family asks.</p>
          )}
          <Link className="btn btn--secondary btn--sm wb-panel__open" href="/agent/clients">
            Open client records
          </Link>
        </WorkbenchPanel>

        <WorkbenchPanel role="neutral" className="wb-span-4" label="Shared" title="What you've shared">
          {materials.length === 0 ? (
            <p className="wb-empty">No material is published yet.</p>
          ) : (
            <ul className="wb-shared">
              {materials.slice(0, 3).map((m) => (
                <li key={m.id}>
                  <Link href={m.href}>{m.title}</Link>
                  <span>
                    {m.example ? "Example: " : ""}shared {m.shares} · opened {m.opens}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="wb-note">Open tracking is not connected.</p>
        </WorkbenchPanel>

        <WorkbenchPanel role="tools" className="wb-span-4" label="Tools" title="Quick tools">
          <div className="wb-tools">
            <Link className="wb-tool" href="/agent/new">
              <span className="wb-tool__label">New lead</span>
              <span className="wb-tool__hint">Even with no signal</span>
            </Link>
            <Link className="wb-tool" href="/agent/quote">
              <span className="wb-tool__label">Price a plan</span>
              <span className="wb-tool__hint">The 2026 sheet</span>
            </Link>
            <Link className="wb-tool" href="/agent/performance">
              <span className="wb-tool__label">Performance</span>
              <span className="wb-tool__hint">Your analytics</span>
            </Link>
            <a className="wb-tool" href={WORKBENCH_HELP.phoneHref}>
              <span className="wb-tool__label">Call the office</span>
              <span className="wb-tool__hint">{WORKBENCH_HELP.phone}</span>
            </a>
          </div>
        </WorkbenchPanel>
      </div>

      <p className="wb-foot">
        Read-only demo record. Commission stays “—” until rates are set.
      </p>
    </div>
  );
}
