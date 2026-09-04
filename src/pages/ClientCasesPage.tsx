// ============================================================================
// ClientCasesPage — Client (family) portal → My Funeral Cases.
// Lists the family's funeral arrangements and their progress. Demo only.
// ============================================================================

import { PortalFrame } from "../components/PortalFrame";
import { CLIENT_NAV } from "../lib/portalNav";
import { CLIENT_CASES, type ClientCase } from "../lib/portalData";
import { useToast } from "../components/toast";

const CHIP: Record<ClientCase["status"], string> = {
  "In progress": "bg-sky-100 text-sky-800",
  Scheduled: "bg-amber-100 text-amber-800",
  Completed: "bg-gray-100 text-gray-600",
};

const CHIP_DOT: Record<ClientCase["status"], string> = {
  "In progress": "bg-sky-500",
  Scheduled: "bg-amber-500",
  Completed: "bg-gray-400",
};

export function ClientCasesPage() {
  const { toast } = useToast();

  return (
    <PortalFrame
      items={CLIENT_NAV}
      brandLabel="Client Portal"
      topNote="Villa Memorial · Family account"
      logoutTo="/client/login"
    >
      {/* Page header */}
      <p className="text-label-md font-label-md uppercase tracking-[0.14em] text-primary">
        Family portal
      </p>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-on-surface md:text-4xl">
        My Funeral Cases
      </h1>
      <p className="mt-2 max-w-2xl text-on-surface-variant">
        Follow the progress of your funeral arrangements, from first call to service day.
      </p>

      {/* Active case highlight */}
      <section className="mt-6 flex flex-col gap-4">
        {CLIENT_CASES.map((kase) => (
          <article
            key={kase.id}
            className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-ambient"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h2 className="font-serif text-xl font-semibold text-on-surface">{kase.title}</h2>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${CHIP[kase.status]}`}>
                    <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${CHIP_DOT[kase.status]}`} />
                    {kase.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-on-surface-variant">{kase.date}</p>
                <p className="mt-3 rounded-lg bg-surface-container-low px-4 py-3 text-sm text-on-surface">
                  Next: {kase.nextStep}
                </p>
              </div>
              <button
                type="button"
                className="text-label-md font-label-md text-primary transition-colors hover:text-primary-container cursor-pointer"
                onClick={() => toast(`Opening case ${kase.id} (demo).`, "default")}
              >
                View case details
              </button>
            </div>
          </article>
        ))}
      </section>

      {/* Help strip */}
      <section className="mt-6 rounded-xl border border-outline-variant/40 bg-surface-container-low p-6">
        <h3 className="font-serif text-lg font-semibold text-on-surface">Need immediate help with an arrangement?</h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          Our team is available 24/7. Call, message, or open a support ticket.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-full bg-secondary px-6 py-3 text-label-md font-label-md text-on-secondary transition-opacity hover:opacity-90 cursor-pointer"
            onClick={() => toast("Support is available 24/7 (demo).", "default")}
          >
            Contact support
          </button>
        </div>
      </section>
    </PortalFrame>
  );
}
