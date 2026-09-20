import { PageHeader, PageSection } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { PropertyExplorer } from "@/components/property-explorer";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { canEditPlots } from "@/lib/park-3d/capability";
import { listLots, type LotStatus } from "@/lib/api-client/property";

export const metadata = { title: "Property map — Admin Portal" };

const VALID_STATUSES: LotStatus[] = [
  "available",
  "reserved",
  "sold",
  "occupied",
  "for_transfer",
  "on_hold",
  "maintenance_hold",
];

export default async function PropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["property:read"])) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Property map" />
        <PageSection>
          <ForbiddenState requiredScopes={["property:read"]} />
        </PageSection>
      </>
    );
  }
  const canReserve = hasAnyScope(session.scopes, ["property:write"]);
  // Plot authoring lives HERE (the administrative property map), gated on the
  // same `property:write` scope the shared capability module names. The public
  // /map is view-only for everyone — an admin plots from this screen.
  const canPlot = canEditPlots(session.scopes);

  let lots;
  try {
    lots = await listLots();
  } catch {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Property map" />
        <PageSection>
          <ErrorState message="Unable to load property records." />
        </PageSection>
      </>
    );
  }

  const { q, status } = await searchParams;
  const initialStatus = VALID_STATUSES.includes(status as LotStatus)
    ? (status as LotStatus)
    : undefined;

  const statusCounts = lots.reduce(
    (acc, l) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  if (lots.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Property map" />
        <PageSection>
          <EmptyState
            title="No lots found"
            hint="Property records will appear here once the property service is connected."
          />
        </PageSection>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Property map"
        actions={
          <span className="text-sm text-muted">
            {lots.length} lots across {new Set(lots.map((l) => l.section)).size} sections
          </span>
        }
      />

      <PageSection>
        <div className="kpi-grid" style={{ marginBottom: "var(--space-5)" }}>
          {["available", "reserved", "sold", "occupied"]
            .filter((key) => (statusCounts[key] ?? 0) > 0)
            .map((key) => (
              <span key={key} className="card kpi-card">
                <span className="kpi-card__body">
                  <span className="kpi-card__label">{key.replace(/_/g, " ")}</span>
                  <span className="kpi-card__value">{statusCounts[key]}</span>
                  <span className="kpi-card__sub">lots in this state</span>
                </span>
              </span>
            ))}
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Total lots</span>
              <span className="kpi-card__value">{lots.length}</span>
              <span className="kpi-card__sub">across {new Set(lots.map((l) => l.section)).size} sections</span>
            </span>
          </span>
        </div>

        <PropertyExplorer
          lots={lots}
          canReserve={canReserve}
          canPlot={canPlot}
          initialQuery={(q ?? "").trim()}
          initialStatus={initialStatus}
        />
      </PageSection>
    </>
  );
}
