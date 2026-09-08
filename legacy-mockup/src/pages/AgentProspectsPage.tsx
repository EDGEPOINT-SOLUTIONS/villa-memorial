// ============================================================================
// AgentProspectsPage — Agent Portal → Prospects & Leads.
// Renders inside the shared PortalFrame (COO agent portal chrome).
// Filters the demo prospects table by status; KPI summary on top.
// ============================================================================

import { useState } from "react";
import { PortalFrame } from "../components/PortalFrame";
import { AGENT_NAV } from "../lib/portalNav";
import { AGENT_PROSPECTS, type AgentProspect } from "../lib/portalData";
import { useToast } from "../components/toast";

type StatusFilter = "All" | AgentProspect["status"];

const FILTERS: StatusFilter[] = ["All", "New", "Contacted", "Consultation", "Arranged"];

// Chip tones (per COO palette): New = sky blue, Contacted = soft gold,
// Consultation = gray, Arranged = soft emerald.
const CHIP: Record<AgentProspect["status"], string> = {
  New: "bg-primary-fixed text-on-primary-fixed",
  Contacted: "bg-secondary-fixed text-on-secondary-fixed",
  Consultation: "bg-surface-container-high text-on-surface-variant",
  Arranged: "bg-emerald-100 text-emerald-800",
};

export function AgentProspectsPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<StatusFilter>("All");

  const rows = AGENT_PROSPECTS.filter((p) => filter === "All" || p.status === filter);

  const newThisWeek = AGENT_PROSPECTS.filter((p) => p.status === "New").length;
  const consultations = AGENT_PROSPECTS.filter((p) => p.status === "Consultation").length;

  function openProspect(p: AgentProspect) {
    toast(`${p.name} (${p.id}) — opening the prospect record here (demo).`);
  }

  return (
    <PortalFrame items={AGENT_NAV} brandLabel="Agent Portal" topNote="Sales agent · Maria Fernandez" logoutTo="/agent/login">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label-md font-label-md uppercase tracking-[0.12em] text-primary">Agent portal</p>
          <h1 className="mt-2 font-headline-md text-headline-md md:text-headline-lg text-on-background">
            My Prospects &amp; Leads
          </h1>
          <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
            New inquiries following up on plans, lots, and packages.
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast("New prospect form opens here (demo).", "success")}
          className="self-start rounded-full bg-secondary px-6 py-3 text-label-md font-label-md text-on-secondary transition-opacity hover:opacity-90 cursor-pointer sm:self-auto"
        >
          + New prospect
        </button>
      </div>

      {/* KPI row */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Active leads", value: String(AGENT_PROSPECTS.length) },
          { label: "New this week", value: String(newThisWeek) },
          { label: "Consultations scheduled", value: String(consultations) },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-ambient"
          >
            <p className="font-headline-md text-headline-md text-primary">{k.value}</p>
            <p className="mt-1 text-label-md font-label-md text-on-surface-variant">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Status filter pills */}
      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={active}
              className={`rounded-full px-4 py-2 text-label-md font-label-md transition-colors cursor-pointer ${
                active
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-ambient">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-outline-variant/40 text-label-md font-label-md uppercase tracking-wider text-on-surface-variant">
                <th className="px-6 py-4">Prospect</th>
                <th className="px-6 py-4">Interest</th>
                <th className="px-6 py-4">Channel</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <p className="text-body-md text-on-surface-variant">
                      No prospects match <span className="font-semibold text-on-background">{filter}</span>.
                    </p>
                    <p className="mt-1 text-sm text-on-surface-variant/70">
                      Try another filter or add a new prospect.
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr key={p.id} className="border-b border-outline-variant/30 transition-colors last:border-0 hover:bg-surface-container-low/60">
                    <td className="px-6 py-4">
                      <p className="font-medium text-on-background">{p.name}</p>
                      <p className="text-xs text-on-surface-variant/70">{p.id}</p>
                    </td>
                    <td className="px-6 py-4 text-body-md text-on-surface-variant">{p.interest}</td>
                    <td className="px-6 py-4 text-body-md text-on-surface-variant">{p.channel}</td>
                    <td className="px-6 py-4 text-body-md text-on-surface-variant">{p.date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${CHIP[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openProspect(p)}
                        className="text-label-md font-label-md text-primary transition-colors hover:underline cursor-pointer"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PortalFrame>
  );
}
