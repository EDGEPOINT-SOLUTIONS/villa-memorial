// ============================================================================
// AgentSalesPage — Agent Portal → Sales & Commissions.
// Renders inside the shared PortalFrame chrome with the agent sidebar. Data
// from src/lib/portalData.ts (AGENT_SALES); demo only, no backend.
// ============================================================================

import { useState } from "react";
import { PortalFrame } from "../components/PortalFrame";
import { AGENT_NAV } from "../lib/portalNav";
import { AGENT_SALES } from "../lib/portalData";
import { useToast } from "../components/toast";

function moneyToNumber(value: string): number {
  return Number(value.replace(/[₱,]/g, "")) || 0;
}

function formatPeso(value: number): string {
  return "₱" + value.toLocaleString("en-US");
}

function saleStatus(index: number): "Paid" | "Accrued" {
  return index % 2 === 0 ? "Paid" : "Accrued";
}

const CHIP_BASE = "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold";

const TH_CLS =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant";

const TD_CLS = "px-4 py-3 text-on-surface";

export function AgentSalesPage() {
  const { toast } = useToast();
  const [view, setView] = useState<"This Month" | "This Quarter">("This Month");

  const salesTotal = AGENT_SALES.reduce((sum, s) => sum + moneyToNumber(s.amount), 0);
  const commissionTotal = AGENT_SALES.reduce((sum, s) => sum + moneyToNumber(s.commission), 0);

  function switchView(next: "This Month" | "This Quarter") {
    setView(next);
    toast(
      next === "This Month"
        ? "Showing this month's closed sales."
        : "Demo: quarter view shows the same recorded sales.",
      "success",
    );
  }

  return (
    <PortalFrame items={AGENT_NAV} brandLabel="Agent Portal" topNote="Sales agent · Maria Fernandez" logoutTo="/agent/login">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-label-md font-label-md uppercase tracking-wider text-primary mb-2">
            Agent portal
          </p>
          <h1 className="font-serif text-headline-md text-on-surface leading-tight">
            Sales & Commissions
          </h1>
          <p className="mt-2 text-on-surface-variant text-body-md font-body-md">
            This month's closed sales and earned commission.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest p-1 shadow-ambient">
          {(["This Month", "This Quarter"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => switchView(option)}
              className={`rounded-full px-4 py-2 text-label-md font-label-md transition-colors cursor-pointer ${
                view === option
                  ? "bg-secondary-container text-on-secondary-container"
                  : "text-on-surface-variant hover:bg-surface-variant"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="mt-8 grid grid-cols-1 gap-gutter sm:grid-cols-2">
        <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-ambient">
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Sales this month
          </p>
          <p className="mt-2 font-serif text-headline-md text-primary">{formatPeso(salesTotal)}</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            {AGENT_SALES.length} closed {AGENT_SALES.length === 1 ? "sale" : "sales"} · {view === "This Month" ? "Oct 2024" : "Q4 2024"}
          </p>
        </div>
        <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-ambient">
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Commission earned
          </p>
          <p className="mt-2 font-serif text-headline-md text-secondary">{formatPeso(commissionTotal)}</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Paid &amp; accrued · {view === "This Month" ? "Oct 2024" : "Q4 2024"}
          </p>
        </div>
      </div>

      {/* Sales table */}
      <div className="mt-8 overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-ambient">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/60 bg-surface-container-low">
                <th className={TH_CLS}>Ref</th>
                <th className={TH_CLS}>Date</th>
                <th className={TH_CLS}>Client</th>
                <th className={TH_CLS}>Item</th>
                <th className={`${TH_CLS} text-right`}>Amount</th>
                <th className={`${TH_CLS} text-right`}>Commission</th>
                <th className={TH_CLS}>Status</th>
              </tr>
            </thead>
            <tbody>
              {AGENT_SALES.map((sale, index) => {
                const status = saleStatus(index);
                return (
                  <tr
                    key={sale.id}
                    className="border-b border-outline-variant/30 transition-colors hover:bg-surface-container-low"
                  >
                    <td className={`${TD_CLS} font-medium`}>{sale.id}</td>
                    <td className={TD_CLS}>{sale.date}</td>
                    <td className={`${TD_CLS} font-medium`}>{sale.client}</td>
                    <td className={TD_CLS}>{sale.item}</td>
                    <td className={`${TD_CLS} text-right font-medium`}>{sale.amount}</td>
                    <td className={`${TD_CLS} text-right`}>{sale.commission}</td>
                    <td className={TD_CLS}>
                      <span
                        className={
                          status === "Paid"
                            ? `${CHIP_BASE} bg-emerald-100 text-emerald-700`
                            : `${CHIP_BASE} bg-secondary-fixed text-secondary`
                        }
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note card */}
      <div className="mt-8 flex items-start gap-3 rounded-xl bg-surface-container-low p-5 text-body-md font-body-md text-on-surface-variant">
        <span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-primary">
          info
        </span>
        <p>
          Commission is released after the client's first installment is received.
        </p>
      </div>
    </PortalFrame>
  );
}
