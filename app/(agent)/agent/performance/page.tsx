import Link from "next/link";
import {
  getAgentCommission,
  listAgentProspects,
  type Commission,
  type Prospect,
} from "@/lib/api-client/agent";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import {
  ANALYTICS_PERIODS,
  analyticsPeriodLabel,
  isAnalyticsPeriod,
  pipelineBuiltSeriesWithin,
  WORKBENCH_HELP,
  type AnalyticsPeriod,
} from "@/lib/agent/agent-dashboard";
import { needsYou, prospectValueTotal } from "@/lib/agent/agent-view";
import { money } from "@/components/agent/agent-ui";
import { WorkbenchPanel } from "@/components/agent/workbench";
import { BarRow, LineChart, StatusChip } from "@/components/kit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Performance — Villa Funeraria agent portal" };

/** A safe read: one record failing must never blank the page. */
async function safe<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch {
    return fallback;
  }
}

type MeasureStatus = "real" | "snapshot" | "missing" | "blocked";

const MEASURES: Array<{
  measure: string;
  period: string;
  source: string;
  status: MeasureStatus;
  statusLabel: string;
  needs: string;
}> = [
  {
    measure: "Pipeline value entering",
    period: "cumulative by first contact",
    source: "each lead's recorded first-contact date",
    status: "real",
    statusLabel: "Real — from the record",
    needs: "Dated pipeline snapshots to show its value on a given day.",
  },
  {
    measure: "Value closed",
    period: "monthly · 6–12 points",
    source: "orders and lots",
    status: "missing",
    statusLabel: "No agent attribution",
    needs: "Agent attribution on orders, or a sale record per agent.",
  },
  {
    measure: "Conversations",
    period: "weekly",
    source: "contact log",
    status: "missing",
    statusLabel: "Too sparse",
    needs: "A real contact log — only 2 of 7 leads carry recorded activity.",
  },
  {
    measure: "Conversion funnel",
    period: "this month · one snapshot",
    source: "the commission engine's conversion",
    status: "snapshot",
    statusLabel: "One snapshot (example)",
    needs: "A dated monthly series to make this a trend.",
  },
  {
    measure: "Collections",
    period: "monthly",
    source: "payments received",
    status: "missing",
    statusLabel: "Office-wide only",
    needs: "An agent-scoped projection of the payments ledger.",
  },
  {
    measure: "Commission earned",
    period: "monthly",
    source: "the commission statement",
    status: "blocked",
    statusLabel: "Rates not set",
    needs: "The client's commission rules and rates (open client question).",
  },
];

const STATUS_TONE: Record<MeasureStatus, "success" | "warning" | "danger" | "neutral"> = {
  real: "success",
  snapshot: "warning",
  missing: "neutral",
  blocked: "danger",
};

/**
 * Performance — the full analytics page (captain's accepted plan, 2026-10-01,
 * §7 and §9).
 *
 * THE HONEST FINDING, ON THE PAGE. The office keeps no per-agent time series:
 * orders carry no agent, the pipeline records only the current stage, commission
 * is unconfigured. So this page draws the ONE real series the record supports
 * (value entering the pipeline, cumulative by first-contact date), renders the
 * one real snapshot (conversion), and shows every other chart as a NAMED EMPTY
 * state that says which record it waits on. It never draws a line through
 * invented points.
 *
 * The period control is real: it narrows the recorded first-contact dates to
 * the month, quarter or year. An empty window is an honest zero, not a broken
 * chart.
 */
export default async function AgentPerformancePage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string }>;
}) {
  const session = await requirePortalSessionOrRedirect("agent");
  const params = (await searchParams) ?? {};
  const period: AnalyticsPeriod = isAnalyticsPeriod(params.period) ? params.period : "year";

  const [prospects, commission] = await Promise.all([
    safe(listAgentProspects, [] as Prospect[]),
    safe<Commission | null>(getAgentCommission, null),
  ]);

  const now = new Date();
  const series = pipelineBuiltSeriesWithin(prospects, period, now);
  const pipelineTotal = prospectValueTotal(prospects);
  const needs = needsYou(prospects);
  const conversion = commission?.conversion ?? null;

  return (
    <div className="workbench wb-performance">
      <header className="wb-head">
        <div className="wb-head__text">
          <p className="wb-head__eyebrow">Performance · {analyticsPeriodLabel(period)}</p>
          <h1 className="wb-head__title">Where the month is going.</h1>
          <p className="wb-head__lead">
            {money(pipelineTotal)} possible across {prospects.length}{" "}
            {prospects.length === 1 ? "person" : "people"} · {needs.length} need you ·{" "}
            {conversion ? `${conversion.sales} sold this month (example)` : "conversion not recorded"}
          </p>
        </div>
        <div className="wb-head__actions">
          <Link className="btn btn--secondary" href="/agent/dashboard">
            Back to Today
          </Link>
        </div>
      </header>

      <section className="wb-panel" aria-label="Period">
        <div className="wb-panel__body">
          <div className="wb-chips" role="group" aria-label="Period">
            {ANALYTICS_PERIODS.map((key) => (
              <Link
                key={key}
                className="ag-filter"
                data-on={key === period ? "yes" : "no"}
                aria-current={key === period ? "true" : undefined}
                href={`/agent/performance?period=${key}`}
              >
                {analyticsPeriodLabel(key)}
              </Link>
            ))}
          </div>
          <p className="wb-note">
            The period narrows the recorded first-contact dates. It does not invent history that
            is not there.
          </p>
        </div>
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
            needLabel={`a lead first contacted in ${analyticsPeriodLabel(period).toLowerCase()}`}
            footnote="Cumulative from each lead's recorded first-contact date. The office keeps no dated pipeline snapshots, so this shows what entered your pipeline — not its value on a given day."
            height={280}
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
            footnote="Orders and lots carry no agent attribution yet, so a closed-value trend cannot be drawn honestly."
            height={170}
            dataTestId="chart-value-closed"
          />
          <LineChart
            title="Conversations"
            points={[]}
            kind="count"
            tone="sky"
            unitLabel="calls + visits + shares"
            needLabel="a real contact log"
            footnote="Only two of seven leads carry recorded activity, so a weekly line would be a guess. The record needs a real contact log first."
            height={170}
            dataTestId="chart-conversations"
          />
        </div>
      </section>

      <div className="wb-grid">
        {conversion ? (
          <section className="wb-panel wb-span-6" aria-label="Conversion this month">
            <div className="wb-panel__body">
              <BarRow
                title="This month's conversion"
                items={[
                  { label: "Contacted", value: conversion.contacted },
                  {
                    label: "Presentations",
                    value: conversion.presentations,
                    note: "of those contacted",
                  },
                  { label: "Sold", value: conversion.sales, note: "of those presentations" },
                ]}
                kind="count"
                tone="gold"
                needLabel="a dated conversion series"
                footnote={
                  conversion.example
                    ? "One recorded snapshot — example figures. A dated monthly series will make this a trend."
                    : "One recorded snapshot. A dated monthly series will make this a trend."
                }
                dataTestId="chart-conversion"
              />
            </div>
          </section>
        ) : (
          <WorkbenchPanel role="money" className="wb-span-6" label="Conversion" title="This month's conversion">
            <p className="wb-empty">The commission record could not be read just now.</p>
          </WorkbenchPanel>
        )}

        <WorkbenchPanel
          role="money"
          className="wb-span-6"
          label="Definitions"
          title="What each measure is"
          more={{ href: "/agent/sales", label: "Open the statement →" }}
        >
          <div className="table-wrapper" tabIndex={0} role="region" aria-label="Measure definitions">
            <table className="table wb-table">
              <thead>
                <tr>
                  <th scope="col">Measure</th>
                  <th scope="col">Source</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {MEASURES.map((row) => (
                  <tr key={row.measure}>
                    <th scope="row">
                      {row.measure}
                      <span className="wb-table__sub">
                        {row.period} · {row.needs}
                      </span>
                    </th>
                    <td className="wb-table__wrap" data-label="Source">
                      {row.source}
                    </td>
                    <td data-label="Status">
                      <StatusChip tone={STATUS_TONE[row.status]}>{row.statusLabel}</StatusChip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </WorkbenchPanel>
      </div>

      <p className="wb-foot">
        Signed in as {session.email}. Nothing is written from this page, and a chart draws only the
        points the office&apos;s record holds. Ask the office at {WORKBENCH_HELP.phone}.
      </p>
    </div>
  );
}
