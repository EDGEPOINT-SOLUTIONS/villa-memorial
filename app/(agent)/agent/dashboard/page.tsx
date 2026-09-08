import { PageHeader, PageSection } from "@/components/ui/page";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FamilyComingSoon } from "@/components/family-coming-soon";

export const metadata = { title: "Agent dashboard — In Memoriam" };

/** Agent workspace landing — villa grammar: ghost KPI strip previewing the
 * dashboard that arrives with the agent/commission contract, honest labels. */
export default async function AgentDashboardPage() {
  const session = await requirePortalSessionOrRedirect("agent");

  const ghost: Array<{ label: string; sub: string }> = [
    { label: "Active clients", sub: "your book of business" },
    { label: "Prospects", sub: "leads you are working" },
    { label: "Applications", sub: "plans under review" },
    { label: "Commissions", sub: "earned this period" },
  ];

  return (
    <>
      <PageHeader eyebrow="Agent portal" title="Dashboard" />

      <div className="kpi-grid">
        {ghost.map((g) => (
          <span key={g.label} className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">{g.label}</span>
              <span className="kpi-card__value kpi-card__value--muted">—</span>
              <span className="kpi-card__sub">{g.sub}</span>
            </span>
          </span>
        ))}
      </div>

      <PageSection>
        <p className="text-sm text-muted">
          Signed in as {session.email}. Your sales workspace is being prepared — figures
          above will light up when the agent workspace connects.
        </p>
        <div style={{ marginTop: "var(--space-4)" }}>
          <FamilyComingSoon
            area="Agent workspace"
            whatUnblocks="sales KPIs, client lists, prospects, applications and commissions arrive with the agent/commission contract (dev-authored)"
          />
        </div>
      </PageSection>
    </>
  );
}
