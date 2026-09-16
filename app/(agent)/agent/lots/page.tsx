import Link from "next/link";
import { AgentHero, AgentSection, Chip } from "@/components/agent/agent-ui";
import { listAgentLotAvailability } from "@/lib/api-client/agent";
import { LOT_GARDEN_NICHES, LOT_MAUSOLEUM, LOT_PREMIUM, LOT_PRIMARY } from "@/lib/media";
import { LOT_PRICE_CATEGORIES, php } from "@/lib/villa-pricing";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import parksFile from "@/lib/fixtures/property/parks.json";

export const metadata = { title: "Lot availability — Villa Memorial agent portal" };

type SeedPlot = {
  id: string;
  code: string;
  lot_id: string | null;
  status: string;
  typeId?: string;
  outline?: number[][];
};
type SeedPark = { id: string; name: string; image: string; plots: SeedPlot[] };

const VILLA = (parksFile as { parks: SeedPark[] }).parks.find((p) => p.id === "villa");

/** Photo per availability key — the same map the park editor uses (lib/media.ts). */
const PHOTO: Record<string, string> = {
  prime: LOT_PRIMARY,
  premium: LOT_PREMIUM,
  niches: LOT_GARDEN_NICHES,
  mausoleum: LOT_MAUSOLEUM,
  condo: LOT_MAUSOLEUM,
};

function centroid(outline: number[][] | undefined): { x: number; y: number } | null {
  if (!outline || outline.length === 0) return null;
  const xs = outline.map((p) => p[0]);
  const ys = outline.map((p) => p[1]);
  return {
    x: xs.reduce((a, b) => a + b, 0) / xs.length,
    y: ys.reduce((a, b) => a + b, 0) / ys.length,
  };
}

function sheetPrice(category: string, product: string): { selling: number; monthly: number } | null {
  const row = LOT_PRICE_CATEGORIES.find((c) => c.title === category)?.rows.find(
    (r) => r.product === product,
  );
  return row ? { selling: row.regular.selling, monthly: row.regular.monthly } : null;
}

/**
 * Lot availability (approved design page 10): the client's masterplan with the
 * office's plots pinned, and the client's own 2026 sheet prices. Availability is
 * the office's record, read-stamped — never a promise the page cannot keep.
 */
export default async function AgentLotsPage() {
  await requirePortalSessionOrRedirect("agent");
  const availability = await listAgentLotAvailability();
  const now = new Date();
  const readAt = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(now);

  const pins = (VILLA?.plots ?? [])
    .filter((p) => p.lot_id && p.outline)
    .map((p) => ({ ...p, at: centroid(p.outline) }))
    .filter((p) => p.at)
    .slice(0, 8);

  const totalAvailable = availability.reduce((sum, a) => sum + a.available, 0);

  return (
    <div className="ag-page">
      <AgentHero
        eyebrow="Lot availability · Sanctuario de Mercedes y Gloria"
        title={`${totalAvailable} lots are ready to show today.`}
        lead="The park's own masterplan and the client's 2026 price sheet — the same figures the office quotes. Availability is the office's record, so this page stamps when it was last read."
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
        sub="Available lots on the masterplan, with the sheet price for every type. Confirm the live list with the office before you promise a lot."
      >
        <div className="ag-lots">
          <div className="ag-map">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={VILLA?.image ?? "/media/Park%20map.png"}
              alt="The park masterplan with available lots pinned"
            />
            {pins.map((p) =>
              p.at ? (
                <span
                  key={p.id}
                  className={`ag-map__pin${
                    p.status === "reserved"
                      ? " ag-map__pin--reserved"
                      : p.status === "sold" || p.status === "occupied"
                        ? " ag-map__pin--sold"
                        : ""
                  }`}
                  style={{ left: `${p.at.x}%`, top: `${p.at.y}%` }}
                >
                  {p.code}
                </span>
              ) : null,
            )}
            <div className="ag-map__caption">
              Available · <strong>sky</strong> &nbsp; Reserved · <strong>amber</strong> &nbsp; Sold or occupied
              · grey. Plot numbers are the office&apos;s demo records — confirm the live list before you
              promise a lot.
            </div>
          </div>

          <div className="ag-list">
            {availability.map((a) => {
              const price = sheetPrice(a.category, a.product);
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

        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
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
            <p className="ag-note" style={{ margin: 0 }}>
              <strong>Two honest limits.</strong> (1) Whether an agent can hold a lot is an open captain /
              client question — this design offers “ask the office to hold”, and the office confirms. (2)
              Prices are the client&apos;s own 2026 sheet (lib/villa-pricing.ts, LOT_PRICE_CATEGORIES); nothing
              here is typed by an agent, and the office confirms the final figure on the contract.
            </p>
          </div>
        </div>
      </AgentSection>
    </div>
  );
}
