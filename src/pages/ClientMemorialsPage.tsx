// ============================================================================
// ClientMemorialsPage — Client (family) portal → My Memorials.
// Shows the digital memorial page for the family's deceased loved ones and a
// short tribute. Demo only — share/visit actions fire toasts.
// ============================================================================

import { PortalFrame } from "../components/PortalFrame";
import { CLIENT_NAV } from "../lib/portalNav";
import { CLIENT_MEMORIALS, type ClientMemorial } from "../lib/portalData";
import { useToast } from "../components/toast";

const CHIP: Record<ClientMemorial["status"], string> = {
  Published: "bg-emerald-100 text-emerald-800",
  Draft: "bg-amber-100 text-amber-800",
};

export function ClientMemorialsPage() {
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
        My Memorials
      </h1>
      <p className="mt-2 max-w-2xl text-on-surface-variant">
        Digital tribute pages that keep your loved one's story and memories alive.
      </p>

      {/* Memorial list */}
      <section className="mt-6 flex flex-col gap-4">
        {CLIENT_MEMORIALS.map((mem) => (
          <article
            key={mem.id}
            className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-ambient"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Serif initial medallion */}
                <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-sky-400 font-serif text-2xl font-semibold text-white shadow-sm">
                  {mem.name.charAt(0)}
                </span>
                <div>
                  <h2 className="font-serif text-2xl font-semibold text-on-surface">{mem.name}</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">{mem.years}</p>
                  <p className="text-sm text-on-surface-variant">{mem.location}</p>
                </div>
              </div>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${CHIP[mem.status]}`}>
                {mem.status}
              </span>
            </div>

            {/* Stats + actions */}
            <div className="mt-6 grid grid-cols-1 gap-4 border-t border-outline-variant/40 pt-5 sm:grid-cols-3">
              <div>
                <p className="text-label-md font-label-md uppercase tracking-wider text-on-surface-variant">Visitors</p>
                <p className="mt-1 font-serif text-xl font-semibold text-on-surface">{mem.visitors}</p>
              </div>
              <div>
                <p className="text-label-md font-label-md uppercase tracking-wider text-on-surface-variant">Last updated</p>
                <p className="mt-1 font-serif text-xl font-semibold text-on-surface">{mem.updated}</p>
              </div>
              <div className="flex flex-wrap items-end justify-start gap-3 sm:justify-end">
                <button
                  type="button"
                  className="rounded-full border-2 border-primary px-5 py-2.5 text-label-md font-label-md text-primary transition-colors hover:bg-primary-fixed cursor-pointer"
                  onClick={() => toast("Opening the digital memorial page (demo).", "default")}
                >
                  View page
                </button>
                <button
                  type="button"
                  className="rounded-full bg-secondary px-5 py-2.5 text-label-md font-label-md text-on-secondary transition-opacity hover:opacity-90 cursor-pointer"
                  onClick={() => toast("Share link copied (demo).", "success")}
                >
                  Share
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* Help strip */}
      <section className="mt-6 rounded-xl border border-outline-variant/40 bg-surface-container-low p-6">
        <h3 className="font-serif text-lg font-semibold text-on-surface">Remembering someone new?</h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          We can help you set up a digital memorial or a "Find My Loved One" tribute.
        </p>
        <button
          type="button"
          className="mt-4 rounded-full bg-secondary px-6 py-3 text-label-md font-label-md text-on-secondary transition-opacity hover:opacity-90 cursor-pointer"
          onClick={() => toast("Request filed — our care team will reach out.", "success")}
        >
          Request a memorial page
        </button>
      </section>
    </PortalFrame>
  );
}
