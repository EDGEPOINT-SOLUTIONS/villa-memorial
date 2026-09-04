// ============================================================================
// ClientPlansPage — Client (family) Portal → My Memorial Plans.
// Rendered inside the shared PortalFrame so it feels like the same portal app.
// ============================================================================

import { Link } from "react-router-dom";
import { PortalFrame } from "../components/PortalFrame";
import { useToast } from "../components/toast";
import { CLIENT_NAV } from "../lib/portalNav";
import { CLIENT_CONTRACT, CLIENT_PLANS, type ClientPlan } from "../lib/portalData";

const CHIP: Record<ClientPlan["status"], string> = {
  Active: "bg-emerald-100 text-emerald-800",
  Mature: "bg-amber-100 text-amber-800",
  Completed: "bg-gray-100 text-gray-600",
};

const CHIP_DOT: Record<ClientPlan["status"], string> = {
  Active: "bg-emerald-500",
  Mature: "bg-amber-500",
  Completed: "bg-gray-400",
};

export function ClientPlansPage() {
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
      <h1 className="mt-2 font-serif text-3xl font-semibold text-on-surface">
        My Memorial Plans
      </h1>
      <p className="mt-2 max-w-2xl text-on-surface-variant">
        Your pre-need plans and payment progress at Villa Memorial.
      </p>

      {/* Highlight contract card */}
      <section className="mt-6 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-ambient">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-label-md font-label-md uppercase tracking-[0.14em] text-primary">
              Current contract
            </p>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-on-surface">
              {CLIENT_CONTRACT.title}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">{CLIENT_CONTRACT.property}</p>
          </div>
          <p className="font-serif text-2xl font-semibold text-on-surface">{CLIENT_CONTRACT.total}</p>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-on-surface">Contract payment progress</span>
            <span className="font-semibold text-primary">{CLIENT_CONTRACT.progress}%</span>
          </div>
          <div
            className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface-container-high"
            role="progressbar"
            aria-valuenow={CLIENT_CONTRACT.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Contract payment progress"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${CLIENT_CONTRACT.progress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-on-surface-variant">
            <span className="font-semibold text-on-surface">{CLIENT_CONTRACT.paid} paid</span> of{" "}
            {CLIENT_CONTRACT.total}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-full bg-secondary px-6 py-3 text-label-md font-label-md text-on-secondary transition-opacity hover:opacity-90 cursor-pointer"
            onClick={() => toast("Make a payment — payments demo page is coming soon.", "default")}
          >
            Make a payment
          </button>
          <button
            type="button"
            className="rounded-full border-2 border-primary px-6 py-3 text-label-md font-label-md text-primary transition-colors hover:bg-primary-fixed cursor-pointer"
            onClick={() => toast("Official receipts (demo).", "default")}
          >
            View receipts
          </button>
        </div>
      </section>

      {/* Plans list */}
      <section className="mt-6 flex flex-col gap-4">
        {CLIENT_PLANS.map((plan) => (
          <article
            key={plan.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-ambient"
          >
            <div className="min-w-0">
              <h3 className="font-serif text-lg font-semibold text-on-surface">{plan.name}</h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                Holder: {plan.holder} · Purchased {plan.purchased}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-serif text-lg font-semibold text-on-surface">{plan.value}</span>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${CHIP[plan.status]}`}
              >
                <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${CHIP_DOT[plan.status]}`} />
                {plan.status}
              </span>
              <button
                type="button"
                className="text-label-md font-label-md text-primary transition-colors hover:text-primary-container cursor-pointer"
                onClick={() => toast(`Viewing details for ${plan.name} (demo).`, "default")}
              >
                View details
              </button>
            </div>
          </article>
        ))}
      </section>

      {/* Explore public site */}
      <section className="mt-6 rounded-xl border border-outline-variant/40 bg-surface-container-low p-6">
        <h3 className="font-serif text-lg font-semibold text-on-surface">Looking for something new?</h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          Need a new plan or lot? Explore the public site's Plans &amp; Lots pages.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/site/plans"
            className="rounded-full bg-secondary px-6 py-3 text-label-md font-label-md text-on-secondary transition-opacity hover:opacity-90 hover:no-underline!"
          >
            Browse Memorial Plans
          </Link>
          <Link
            to="/site/lots"
            className="rounded-full border-2 border-primary px-6 py-3 text-label-md font-label-md text-primary transition-colors hover:bg-primary-fixed hover:no-underline!"
          >
            View Memorial Lots
          </Link>
        </div>
      </section>
    </PortalFrame>
  );
}
