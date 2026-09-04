// ============================================================================
// AgentApplicationsPage — Agent Portal → Applications.
// Plan applications submitted by prospects, for review and approval.
// Uses the shared PortalFrame chrome and the coherent agent demo dataset.
// ============================================================================

import { useState } from "react";
import { PortalFrame } from "../components/PortalFrame";
import { AGENT_NAV } from "../lib/portalNav";
import { AGENT_APPLICATIONS, type AgentApplication } from "../lib/portalData";
import { useToast } from "../components/toast";

type StatusStyle = {
  chip: string;
  dot: string;
};

const STATUS_STYLE: Record<AgentApplication["status"], StatusStyle> = {
  Processing: {
    chip: "bg-secondary-container/60 text-on-secondary-container",
    dot: "bg-secondary-container",
  },
  Approved: {
    chip: "bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-500",
  },
  "Pending Info": {
    chip: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
  },
  Draft: {
    chip: "bg-surface-container-high text-on-surface-variant",
    dot: "bg-on-surface-variant/40",
  },
};

const CHIP_CLS =
  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-label-md font-label-md";

export function AgentApplicationsPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");

  const pendingAttention = AGENT_APPLICATIONS.filter(
    (a) => a.status === "Processing" || a.status === "Pending Info",
  ).length;
  const approved = AGENT_APPLICATIONS.filter((a) => a.status === "Approved").length;
  const drafts = AGENT_APPLICATIONS.filter((a) => a.status === "Draft").length;

  const q = query.trim().toLowerCase();
  const rows = q
    ? AGENT_APPLICATIONS.filter(
        (a) => a.id.toLowerCase().includes(q) || a.name.toLowerCase().includes(q),
      )
    : AGENT_APPLICATIONS;

  return (
    <PortalFrame
      items={AGENT_NAV}
      brandLabel="Agent Portal"
      topNote="Sales agent · Maria Fernandez"
      logoutTo="/agent/login"
    >
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <p className="text-label-md font-label-md uppercase tracking-wider text-primary mb-1">
            Agent portal
          </p>
          <h1 className="font-serif text-3xl font-semibold text-on-surface">
            Plan Applications
          </h1>
          <p className="mt-2 max-w-2xl text-on-surface-variant">
            Applications submitted by prospects for review and approval.
          </p>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-3">
          <span className={`${CHIP_CLS} bg-secondary-container/40 text-on-secondary-container`}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              schedule
            </span>
            Pending attention · {pendingAttention}
          </span>
          <span className={`${CHIP_CLS} bg-emerald-50 text-emerald-800`}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              check_circle
            </span>
            Approved · {approved}
          </span>
          <span className={`${CHIP_CLS} bg-surface-container-high text-on-surface-variant`}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              edit_note
            </span>
            Draft · {drafts}
          </span>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search application or applicant…"
            aria-label="Search applications"
            className="w-full rounded-full border border-outline-variant bg-surface-container-lowest py-2.5 pl-4 pr-10 text-body-md text-on-surface shadow-sm outline-none transition-colors placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <span
            aria-hidden="true"
            className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            style={{ fontSize: 20 }}
          >
            search
          </span>
        </div>

        {/* Applications table */}
        <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-ambient">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="bg-surface-container-low text-label-md font-label-md uppercase tracking-wider text-on-surface-variant">
                  <th className="px-5 py-3 font-semibold">Application</th>
                  <th className="px-5 py-3 font-semibold">Applicant</th>
                  <th className="px-5 py-3 font-semibold">Plan</th>
                  <th className="px-5 py-3 font-semibold">Submitted</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const tone = STATUS_STYLE[a.status];
                  return (
                    <tr
                      key={a.id}
                      className="border-t border-outline-variant/40 transition-colors hover:bg-surface-container-low/60"
                    >
                      <td className="px-5 py-4 text-body-md font-semibold text-primary">{a.id}</td>
                      <td className="px-5 py-4 text-body-md text-on-surface">{a.name}</td>
                      <td className="px-5 py-4 text-body-md text-on-surface-variant">{a.plan}</td>
                      <td className="px-5 py-4 text-body-md text-on-surface-variant">{a.submitted}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${tone.chip}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                          {a.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            toast(`${a.id} · ${a.name} opened (demo)`, "success")
                          }
                          className="cursor-pointer rounded-lg border border-primary px-4 py-2 text-label-md font-label-md text-primary transition-colors hover:bg-primary-fixed"
                        >
                          Open application
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {rows.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 40 }}>
                search_off
              </span>
              <p className="text-body-md font-semibold text-on-surface">No applications found</p>
              <p className="max-w-sm text-body-md text-on-surface-variant">
                No applications match “{query}”. Try a different name or application reference.
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-1 cursor-pointer rounded-lg border border-outline-variant px-4 py-2 text-label-md font-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      </div>
    </PortalFrame>
  );
}
