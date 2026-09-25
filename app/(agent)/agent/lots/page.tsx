import Link from "next/link";
import { AgentHero, AgentSection, Chip } from "@/components/agent/agent-ui";
import { AgentParkMap } from "@/components/agent/agent-park-map";
import { listAgentLotAvailability } from "@/lib/api-client/agent";
import { listLots, type Lot } from "@/lib/api-client/property";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { LOT_GARDEN_NICHES, LOT_MAUSOLEUM, LOT_PREMIUM, LOT_PRIMARY } from "@/lib/media";
import type { LotCategory } from "@/lib/pricing-model";
import { php } from "@/lib/villa-pricing";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { ErrorState, ForbiddenState } from "@/components/ui/states";

export const metadata = { title: "Lot availability — Villa Memorial agent portal" };

/** Photo per availability key — the same map the park editor uses (lib/media.ts). */
const PHOTO: Record<string, string> = {
  prime: LOT_PRIMARY,
  premium: LOT_PREMIUM,
  niches: LOT_GARDEN_NICHES,
  mausoleum: LOT_MAUSOLEUM,
  condo: LOT_MAUSOLEUM,
};

function sheetPrice(categories: ReadonlyArray<LotCategory>, category: string, product: string): { selling: number; monthly: number } | null {
  const row = categories.find((c) => c.title === category)?.rows.find(
    (r) => r.product === product,
  );
  return row ? { selling: row.regular.selling, monthly: row.regular.monthly } : null;
}

/**
 * Lot availability (approved design page 10), on the office's OWN park map.
 *
 * The map is not a second picture of the park: it is `components/park-maps-view.tsx`,
 * the same shared component the staff property screen renders, fed the same lot
 * listing (`listLots()`), so agent and office always see the same plots with the
 * same statuses. What differs is only what the agent may DO — select and read the
 * shared plot profile, ask the office to hold an available lot (still disabled
 * pending the captain/client decision) — with map editing gated by the session's
 * scopes exactly as on the staff screen.
 *
 * Availability counts here are the office's record, read-stamped, and prices are
 * the client's own 2026 sheet, read from the editable pricing store
 * (lib/api-client/pricing.ts) — never typed by an agent.
 */
export default async function AgentLotsPage() {
  const session = await requirePortalSessionOrRedirect("agent");

  if (!hasAnyScope(session.scopes, ["property:read"])) {
    return (
      <div className="ag-page">
        <AgentSection title="Lot availability">
          <ForbiddenState requiredScopes={["property:read"]} />
        </AgentSection>
      </div>
    );
  }

  const availability = await listAgentLotAvailability();
  const canEdit = hasAnyScope(session.scopes, ["property:write"]);
  const pricing = await loadPricingDocument();

  let lots: Lot[] = [];
  let lotsError: string | null = null;
  try {
    lots = await listLots();
  } catch {
    lotsError = "The office's lot records could not be read just now.";
  }

  const now = new Date();
  const readAt = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(now);

  const totalAvailable = availability.reduce((sum, a) => sum + a.available, 0);

  return (
    <div className="ag-page">
      <AgentHero
        eyebrow="Lot availability · Sanctuario de Mercedes y Gloria"
        title={`${totalAvailable} lots are ready to show today.`}
        lead="The office's own park map and the client's 2026 price sheet — the same figures the office quotes. Availability is the office's record, so this page stamps when it was last read."
        chips={
          <>
            <Chip>Read from the office at {readAt}</Chip>
            <Chip>{availability.length} types available</Chip>
            <Chip>Prices: the 2026 sheet</Chip>
          </>
        }
      />

      <AgentSection
        title="What to show at the park"
        sub="The same park map the office works from — pick a plot to read its record. Confirm the live list with the office before you promise a lot."
      >
        {lotsError ? (
          <ErrorState message={lotsError} />
        ) : (
          <div className="ag-lots">
            <AgentParkMap lots={lots} canEdit={canEdit} />

            <div className="ag-list">
              {availability.map((a) => {
                const price = sheetPrice(pricing.lotCategories, a.category, a.product);
                return (
                  <article className="ag-lot" key={a.key}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="ag-lot__photo" src={PHOTO[a.key] ?? LOT_PRIMARY} alt={`${a.product} at the park`} />
                    <div>
                      <p className="ag-lot__name">{a.product}</p>
                      <p className="ag-lot__meta">
                        {a.area_sqm} sqm · {a.available} available · {a.section}
                      </p>
                    </div>
                    <div className="ag-lot__price">
                      {price ? (
                        <>
                          <strong>{php(price.selling)}</strong>
                          {php(price.monthly)} / month, 6 yrs
                        </>
                      ) : (
                        <strong>Office confirms</strong>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        <div className="ag-actions">
          <Link className="btn btn--primary" href="/agent/marketing">
            Share the park map &amp; prices
          </Link>
          <button className="btn btn--secondary" type="button" disabled title="Lot holds await the captain's decision and the property contract">
            Ask the office to hold a lot
          </button>
          <Link className="btn btn--ghost" href="/map?park=villa">
            Directions to the park
          </Link>
        </div>

        <div className="ag-card">
          <div className="ag-card__body">
            <p className="ag-note">
              <strong>Two honest limits.</strong> (1) Whether an agent can hold a lot is an open captain /
              client question — this design offers “ask the office to hold”, and the office confirms. (2)
              Prices are the client&apos;s own 2026 sheet, read from the same editable price list the office
              keeps (/staff/pricing), and the map is the office&apos;s shared park map — nothing here is
              typed by an agent, and the office confirms the final figure on the contract.
            </p>
          </div>
        </div>
      </AgentSection>
    </div>
  );
}
