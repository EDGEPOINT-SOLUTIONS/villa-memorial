import Link from "next/link";
import { ErrorState } from "@/components/ui/states";
import { PublicParkMap } from "@/components/public-park-map";
import { listLots, propertyLiveModeEnabled } from "@/lib/api-client/property";
import { optionalSession } from "@/lib/auth/guard";
import { canEditPlots } from "@/lib/park-3d/capability";

export const metadata = { title: "Villa Memorial Park — Villa Memorial" };

// Fixture mode is static-friendly, but once a live public lots path lands the page must
// re-read per request (env/cookies) — never let it serve stale prerendered HTML.
export const dynamic = "force-dynamic";

/**
 * Public park map (Module D, client-facing surface).
 *
 * Shares the SAME map component + data as the staff property explorer, so what a
 * client sees and what staff see is the same picture — derived positions, same status
 * palette, same lot records.
 *
 * Data note (honest, not hidden): in fixture mode (no PROPERTY_BASE_URL) lots come
 * from recorded fixtures and this page demos standalone. In LIVE mode the property
 * API is scope-gated behind the edge gateway (property:read), which a signed-out
 * visitor does not hold — a public read path for lots is a dev-authored gateway/
 * contract decision (blocked-on-dev, not invented here). Until then the live page
 * renders a graceful error instead of pretending.
 *
 * Capability note: the page stays public, but plotting is ADMIN ONLY (spec §3).
 * The viewer's session is read here from the httpOnly cookies; holding
 * `property:write` is what turns the plotting tools on, in Map mode and in 3D
 * alike. A customer simply gets the same map and lots without them.
 */
export default async function PublicMapPage({
  searchParams,
}: {
  searchParams: Promise<{ park?: string; plot?: string }>;
}) {
  const sp = await searchParams;
  const initialPark = sp.park && ["villa","loyola","golden"].includes(sp.park) ? sp.park : undefined;
  const initialPlot = sp.plot?.trim() || undefined;
  const session = await optionalSession();
  const canPlot = canEditPlots(session?.scopes);

  let lots;
  try {
    lots = await listLots();
  } catch {
    return (
      <div className="stack-4">
        <div className="page-header">
          <div>
            <p className="page-header__eyebrow">Sanctuario Memorial Park</p>
            <h1>Villa Memorial Park</h1>
          </div>
        </div>
        <ErrorState
          message={
            propertyLiveModeEnabled()
              ? "The live park map is not available to signed-out visitors yet."
              : "The park map could not be loaded. Please try again shortly."
          }
        />
        {propertyLiveModeEnabled() ? (
          <p className="text-sm text-muted">
            Public lot listings need a public read route at the gateway — a platform
            decision, not something this screen can fix.{" "}
            <Link href="/plans">Browse plans &amp; services</Link> in the meantime.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="stack-4">
      <section className="hero-premium">
        <div className="hero-premium__grid">
          <div>
            <p className="eyebrow-label">Interactive park map</p>
            <h1 className="hero-premium__title">Villa Memorial Park</h1>
            <p className="hero-premium__lead">
              Walk the grounds of every Villa-affiliated park — zoom, pan and click any
              plot to see its type, status and asking price where published.
            </p>
            <p className="text-sm text-muted" style={{ margin: "var(--space-2) 0 0" }}>
              {lots.length} lots · 3 parks · deep-link any plot, e.g.{" "}
              <Link href="/map?park=villa&plot=A-001">/map?park=villa&amp;plot=A-001</Link>
            </p>
            <nav className="hero-chips" aria-label="Jump to a park">
              {[
                { id: "villa", name: "Villa Memorial" },
                { id: "loyola", name: "Loyola Gardens" },
                { id: "golden", name: "Golden Haven" },
              ].map((p) => (
                <Link key={p.id} href={`/map?park=${p.id}`}>
                  {p.name}
                </Link>
              ))}
              <Link href="/lots">Browse all plots</Link>
            </nav>
          </div>
        </div>
      </section>
      <div className="map-shell">
        <PublicParkMap lots={lots} initialPark={initialPark} initialPlot={initialPlot} enable3d canPlot={canPlot} />
      </div>
    </div>
  );
}
