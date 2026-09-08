// Agent Portal → Clients. Renders the agent's managed client list inside the
// shared PortalFrame (sidebar/top bar/drawer), searchable, with demo actions.
// Demo data only — no backend.

import { useState } from "react";
import { PortalFrame } from "../components/PortalFrame";
import { AGENT_NAV } from "../lib/portalNav";
import { AGENT_CLIENTS } from "../lib/portalData";
import { useToast } from "../components/toast";

function StatusChip({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-[#e6f4ea] text-[#137333]">
      Active
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-surface-container-high text-on-surface-variant">
      Inactive
    </span>
  );
}

export function AgentClientsPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");

  const total = AGENT_CLIENTS.length;
  const active = AGENT_CLIENTS.filter((c) => c.active).length;
  const multiPlan = AGENT_CLIENTS.filter((c) => c.plans >= 2).length;

  const filtered = AGENT_CLIENTS.filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <PortalFrame
      items={AGENT_NAV}
      brandLabel="Agent Portal"
      topNote="Sales agent · Maria Fernandez"
      logoutTo="/agent/login"
    >
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-label-md font-label-md uppercase tracking-wider text-primary mb-1">
            Agent portal
          </p>
          <h1 className="font-serif text-3xl font-semibold text-on-surface">My Clients</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Families and individuals I manage at Villa Memorial.
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast("New client form opens here in the demo.", "success")}
          className="self-start sm:self-auto inline-flex items-center gap-2 bg-secondary text-on-secondary rounded-full px-5 py-2.5 text-label-md font-label-md hover:opacity-90 transition-opacity cursor-pointer"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            person_add
          </span>
          Add client
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-ambient">
          <p className="text-2xl font-semibold text-primary">{total}</p>
          <p className="text-sm text-on-surface-variant mt-1">Total clients</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-ambient">
          <p className="text-2xl font-semibold text-primary">{active}</p>
          <p className="text-sm text-on-surface-variant mt-1">Active accounts</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-ambient">
          <p className="text-2xl font-semibold text-primary">{multiPlan}</p>
          <p className="text-sm text-on-surface-variant mt-1">Accounts with 2+ plans</p>
        </div>
      </div>

      {/* Client table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-ambient overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-outline-variant/40">
          <h2 className="text-headline-sm font-headline-sm text-on-surface">Clients</h2>
          <div className="relative">
            <span
              aria-hidden="true"
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              style={{ fontSize: 18 }}
            >
              search
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name..."
              aria-label="Search clients by name"
              className="bg-surface-container-low border border-outline-variant rounded-full pl-9 pr-4 py-2 text-body-md focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-on-surface-variant">
            No clients match "{query}". Try a different name.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/40 text-xs uppercase tracking-wider text-on-surface-variant">
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Account type</th>
                  <th className="px-5 py-3 font-semibold">Active plans</th>
                  <th className="px-5 py-3 font-semibold">Since</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-outline-variant/20 last:border-b-0 hover:bg-surface-container-low transition-colors"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-on-surface">{c.name}</p>
                      <p className="text-xs text-on-surface-variant">{c.id}</p>
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant">{c.account}</td>
                    <td className="px-5 py-3 text-on-surface-variant">{c.plans}</td>
                    <td className="px-5 py-3 text-on-surface-variant">{c.since}</td>
                    <td className="px-5 py-3">
                      <StatusChip active={c.active} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toast(`Opening profile for ${c.name} (demo).`, "success")}
                        className="text-label-md font-label-md text-primary hover:underline cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalFrame>
  );
}
