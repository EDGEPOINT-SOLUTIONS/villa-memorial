// ============================================================================
// ClientPropertyPage — Family portal → "My Memorial Property".
// Lists the lots the family holds at Sanctuario Memorial Park, with quick
// actions into the public park map. Renders inside the shared PortalFrame.
// ============================================================================

import { Link } from "react-router-dom";
import { PortalFrame } from "../components/PortalFrame";
import { CLIENT_NAV } from "../lib/portalNav";
import { CLIENT_PROPERTIES, type ClientProperty } from "../lib/portalData";
import { useToast } from "../components/toast";

const STATUS_STYLE: Record<ClientProperty["status"], string> = {
  Owned: "bg-emerald-100 text-emerald-800",
  Reserved: "bg-amber-100 text-amber-800",
};

const CHIP = "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold";

const OUTLINE_BTN =
  "inline-flex items-center justify-center gap-2 border border-primary text-primary hover:bg-primary-fixed rounded-lg px-4 py-2 text-label-md font-label-md transition-colors hover:no-underline!";

export function ClientPropertyPage() {
  const { toast } = useToast();
  const notice = (message: string) => toast(message);

  return (
    <PortalFrame
      items={CLIENT_NAV}
      brandLabel="Client Portal"
      topNote="Villa Memorial · Family account"
      logoutTo="/client/login"
    >
      <div className="space-y-6">
        {/* Page header */}
        <div className="mb-6">
          <p className="text-label-md font-label-md uppercase tracking-[0.14em] text-secondary">
            Family portal
          </p>
          <h1 className="mt-2 font-serif text-3xl md:text-4xl text-on-surface">
            My Memorial Property
          </h1>
          <p className="mt-2 max-w-2xl text-on-surface-variant">
            Lots your family holds at Sanctuario Memorial Park.
          </p>
        </div>

        {/* Property cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CLIENT_PROPERTIES.map((p) => (
            <div
              key={p.id}
              className="rounded-xl bg-surface-container-lowest p-6 shadow-ambient border border-outline-variant/40 flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-fixed text-primary">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 22 }}
                      aria-hidden="true"
                    >
                      park
                    </span>
                  </div>
                  <div>
                    <div className="font-serif text-xl text-on-surface">{p.label}</div>
                    <p className="text-sm text-on-surface-variant">{p.detail}</p>
                  </div>
                </div>
                <span className={`${CHIP} ${STATUS_STYLE[p.status]}`}>{p.status}</span>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <Link to="/site/map" className={OUTLINE_BTN}>
                  View on map
                </Link>
                <button
                  type="button"
                  onClick={() => notice(`${p.label} — history coming soon in the demo.`)}
                  className={`${OUTLINE_BTN} cursor-pointer`}
                >
                  Lot history
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* CTA card */}
        <div className="rounded-xl bg-surface-container-low p-6 border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-body-md text-on-surface-variant">
            Interested in more lots? Explore availability in the Memorial Park map.
          </p>
          <Link
            to="/site/map"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-6 py-3 text-label-md font-label-md text-on-secondary hover:opacity-90 transition-opacity hover:no-underline! whitespace-nowrap"
          >
            Explore the park map
          </Link>
        </div>
      </div>
    </PortalFrame>
  );
}
