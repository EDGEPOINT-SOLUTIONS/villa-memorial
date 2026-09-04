// Agent Portal → Marketing Materials.
// Renders the agent's downloadable brochure/deck resources inside the shared
// PortalFrame chrome (AGENT_NAV sidebar). Content from AGENT_MARKETING demo
// data; downloads fire a demo toast (no backend).

import { useToast } from "../components/toast";
import { PortalFrame } from "../components/PortalFrame";
import { AGENT_NAV } from "../lib/portalNav";
import { AGENT_MARKETING } from "../lib/portalData";

function FileIcon({ kind }: { kind: string }) {
  return (
    <span
      aria-hidden="true"
      className="material-symbols-outlined text-primary"
      style={{ fontSize: 28, fontVariationSettings: '"FILL" 1' }}
    >
      {kind === "PDF" ? "picture_as_pdf" : "slideshow"}
    </span>
  );
}

export function AgentMarketingPage() {
  const { toast } = useToast();

  return (
    <PortalFrame
      items={AGENT_NAV}
      brandLabel="Agent Portal"
      topNote="Sales agent · Maria Fernandez"
      logoutTo="/agent/login"
    >
      <div className="space-y-6">
        <header>
          <p className="text-label-md font-label-md uppercase tracking-widest text-on-surface-variant">
            Agent portal
          </p>
          <h1 className="mt-2 font-serif text-[clamp(1.75rem,3vw,2.25rem)] font-semibold text-on-surface">
            Marketing Resources
          </h1>
          <p className="mt-2 max-w-2xl text-body-md font-body-md text-on-surface-variant">
            Access the latest brochures and presentation decks for clients.
          </p>
        </header>

        {/* Banner card (primary background with decorative blurred circle) */}
        <div className="relative overflow-hidden rounded-xl bg-primary p-6 text-on-primary shadow-ambient">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-16 right-24 h-32 w-32 rounded-full bg-white/5 blur-2xl"
          />
          <p className="relative text-body-md font-body-md font-semibold">
            Need custom materials?
          </p>
          <p className="relative mt-1 text-body-md font-body-md text-on-primary/90">
            Ask your administrator for the branded template pack.
          </p>
        </div>

        {/* Resource cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {AGENT_MARKETING.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-4 rounded-xl bg-surface-container-lowest p-6 shadow-ambient"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-fixed">
                <FileIcon kind={m.file} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-label-md font-label-md text-on-surface">
                  {m.title}
                </p>
                <p className="mt-0.5 text-body-md font-body-md text-on-surface-variant">
                  {m.desc}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wider text-on-surface-variant/70">
                  {m.file}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toast("Download started (demo)", "success")}
                className="flex flex-shrink-0 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-label-md font-label-md text-on-primary transition-opacity hover:opacity-90"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  download
                </span>
                Download
              </button>
            </div>
          ))}
        </div>
      </div>
    </PortalFrame>
  );
}
