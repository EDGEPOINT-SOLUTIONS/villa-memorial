// ============================================================================
// CooAgentDashboardPage — COO agent portal dashboard.
// Content is a faithful port of the COO mockup:
//   ui-ux-demo/stitch_villa_memorial_digital_platform/agent_portal_dashboard/code.html
// (verbatim copy/figures, exact tokens, chart + demo actions). Chrome (sidebar,
// top bar, drawer, log out) is provided by the shared PortalFrame.
// ============================================================================

import { useState } from "react";
import { useToast } from "../components/toast";
import { PortalFrame } from "../components/PortalFrame";
import { AGENT_NAV } from "../lib/portalNav";

// .ambient-shadow from the mockup's <style> block (not a Tailwind utility)
const ambientShadow = {
  boxShadow:
    "0 10px 30px -10px rgba(51, 51, 51, 0.05), 0 4px 10px -5px rgba(51, 51, 51, 0.03)",
};

const QUARTER_BARS: Record<string, number[]> = {
  "This Quarter": [40, 60, 30, 80, 90],
  "Last Quarter": [55, 45, 75, 60, 85],
};

const APPLICATIONS = [
  {
    initial: "S",
    name: "Sarah Jenkins",
    desc: "Traditional Burial Plan • Submitted Oct 12",
    avatarCls: "bg-primary-fixed text-primary",
    badgeCls: "bg-secondary-fixed text-[#574500]",
    status: "Processing",
  },
  {
    initial: "M",
    name: "Michael Torres",
    desc: "Cremation Memorial • Submitted Oct 10",
    avatarCls: "bg-primary-fixed text-primary",
    badgeCls: "bg-[#e6f4ea] text-[#137333]",
    status: "Approved",
  },
  {
    initial: "E",
    name: "Eleanor Vance",
    desc: "Pre-need Package • Draft",
    avatarCls: "bg-surface-variant text-on-surface-variant",
    badgeCls: "bg-surface-variant text-on-surface-variant",
    status: "Pending Info",
  },
];

export function CooAgentDashboardPage() {
  const { toast } = useToast();
  const [quarter, setQuarter] = useState<"This Quarter" | "Last Quarter">("This Quarter");

  const bars = QUARTER_BARS[quarter];

  return (
    <PortalFrame
      items={AGENT_NAV}
      brandLabel="Agent Portal"
      topNote="Sales agent · Maria Fernandez"
      logoutTo="/agent/login"
    >
      <div className="space-y-gutter py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-primary mb-2">
              Agent Dashboard
            </h1>
            <p className="text-body-lg font-body-lg text-on-surface-variant">
              Welcome back. Here is your overview for this month.
            </p>
          </div>
          <button
            type="button"
            onClick={() => toast("Register New Prospect — form opens here (demo)", "success")}
            className="flex items-center justify-center gap-2 bg-secondary text-on-secondary px-6 py-3 rounded-lg hover:bg-secondary-fixed-dim transition-colors min-h-[48px] shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              person_add
            </span>
            <span className="text-label-md font-label-md uppercase">Register New Prospect</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-surface-container-lowest p-6 rounded-lg border border-surface-variant hover:border-primary-fixed transition-colors" style={ambientShadow}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-on-surface-variant text-label-md font-label-md uppercase">
                Total Clients
              </span>
              <span className="material-symbols-outlined text-primary">person</span>
            </div>
            <div className="text-headline-md font-headline-md text-on-surface">142</div>
            <div className="text-sm text-primary mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                trending_up
              </span>{" "}
              +3 this week
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-lg border border-surface-variant hover:border-primary-fixed transition-colors" style={ambientShadow}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-on-surface-variant text-label-md font-label-md uppercase">
                Pending Apps
              </span>
              <span className="material-symbols-outlined text-secondary">pending_actions</span>
            </div>
            <div className="text-headline-md font-headline-md text-on-surface">12</div>
            <div className="text-sm text-on-surface-variant mt-2">Requires attention</div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-lg border border-surface-variant hover:border-primary-fixed transition-colors" style={ambientShadow}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-on-surface-variant text-label-md font-label-md uppercase">
                Active Plans
              </span>
              <span className="material-symbols-outlined text-primary">assignment_turned_in</span>
            </div>
            <div className="text-headline-md font-headline-md text-on-surface">98</div>
            <div className="text-sm text-on-surface-variant mt-2">Fully funded</div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-lg border border-surface-variant hover:border-primary-fixed transition-colors" style={ambientShadow}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-on-surface-variant text-label-md font-label-md uppercase">
                Monthly Sales
              </span>
              <span className="material-symbols-outlined text-primary">point_of_sale</span>
            </div>
            <div className="text-headline-md font-headline-md text-on-surface">$24.5k</div>
            <div className="text-sm text-primary mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                trending_up
              </span>{" "}
              +15% vs last mo
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-lg border border-surface-variant hover:border-primary-fixed transition-colors" style={ambientShadow}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-on-surface-variant text-label-md font-label-md uppercase">
                Commissions
              </span>
              <span className="material-symbols-outlined text-secondary">account_balance_wallet</span>
            </div>
            <div className="text-headline-md font-headline-md text-on-surface">$3,250</div>
            <div className="text-sm text-on-surface-variant mt-2">Accrued this period</div>
          </div>
        </div>

        {/* Bento Layout for Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          {/* Recent Applications (2 columns on large screens) */}
          <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-6" style={ambientShadow}>
            <div className="flex justify-between items-center mb-6 border-b border-surface-variant pb-4">
              <h2 className="text-headline-sm font-headline-sm text-on-surface">
                Recent Applications
              </h2>
              <button
                type="button"
                onClick={() => toast("Viewing all applications (demo)")}
                className="text-primary hover:text-primary-container text-label-md font-label-md flex items-center gap-1 cursor-pointer"
              >
                View All{" "}
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  arrow_forward
                </span>
              </button>
            </div>

            <div className="space-y-4">
              {APPLICATIONS.map((app) => (
                <div
                  key={app.name}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-surface-container-low transition-colors border border-transparent hover:border-surface-variant group"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-headline-sm ${app.avatarCls}`}
                    >
                      {app.initial}
                    </div>
                    <div>
                      <div className="font-bold text-on-surface">{app.name}</div>
                      <div className="text-sm text-on-surface-variant">{app.desc}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${app.badgeCls}`}
                    >
                      {app.status}
                    </span>
                    <button
                      type="button"
                      aria-label={`More options for ${app.name}`}
                      onClick={() => toast(`More options for ${app.name} (demo)`)}
                      className="text-outline hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column Stack */}
          <div className="flex flex-col gap-gutter">
            {/* Performance Chart Placeholder */}
            <div className="bg-surface-container-lowest rounded-xl p-6 flex-1 flex flex-col" style={ambientShadow}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-headline-sm font-headline-sm text-on-surface">Performance</h2>
                <select
                  aria-label="Performance period"
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value as "This Quarter" | "Last Quarter")}
                  className="text-sm bg-transparent border-none text-on-surface-variant outline-none cursor-pointer"
                >
                  <option>This Quarter</option>
                  <option>Last Quarter</option>
                </select>
              </div>
              <div className="flex-1 bg-surface-container-low rounded-lg relative overflow-hidden min-h-[200px] flex items-end justify-between p-4 pb-0">
                {bars.map((height, i) => {
                  const isLast = i === bars.length - 1;
                  return (
                    <div
                      key={`${quarter}-${i}`}
                      title={`${quarter} · bar ${i + 1} (${height}%)`}
                      onClick={() =>
                        toast(`Performance: ${quarter} point ${i + 1} selected (demo)`)
                      }
                      className={`w-1/6 rounded-t-sm transition-colors ${
                        isLast
                          ? "bg-primary shadow-[0_0_15px_rgba(0,101,141,0.3)]"
                          : "bg-primary-fixed hover:bg-primary cursor-pointer"
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Marketing Materials Quick Access */}
            <div className="bg-primary text-on-primary rounded-xl p-6 relative overflow-hidden">
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <h2 className="text-headline-sm font-headline-sm mb-2 relative z-10">
                Marketing Resources
              </h2>
              <p className="text-sm opacity-90 mb-6 relative z-10">
                Access the latest brochures and presentation decks for clients.
              </p>
              <div className="space-y-3 relative z-10">
                <button
                  type="button"
                  onClick={() => toast("Downloading 2024 Brochure (demo)")}
                  className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 px-4 py-3 rounded-lg transition-colors border border-white/20 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      picture_as_pdf
                    </span>{" "}
                    2024 Brochure
                  </span>
                  <span className="material-symbols-outlined">download</span>
                </button>
                <button
                  type="button"
                  onClick={() => toast("Downloading Presentation Deck (demo)")}
                  className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 px-4 py-3 rounded-lg transition-colors border border-white/20 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      slideshow
                    </span>{" "}
                    Presentation Deck
                  </span>
                  <span className="material-symbols-outlined">download</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalFrame>
  );
}
