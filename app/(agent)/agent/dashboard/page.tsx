import { PageSection } from "@/components/ui/page";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FamilyComingSoon } from "@/components/family-coming-soon";

export const metadata = { title: "Agent dashboard — Villa Memorial" };

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
      <div className="paper-hero">
        <div className="paper-hero__grid">
          <div>
            <p className="paper-hero__eyebrow">Agent portal · Dashboard</p>
            <h1 className="paper-hero__title">Your sales workspace</h1>
            <p className="paper-hero__lead">
              Your book of business at a glance — clients, prospects, applications and
              commissions. The figures below light up when the agent workspace connects
              (waits on the agent/commission contract, dev-authored).
            </p>
            <div className="paper-hero__chips">
              <span className="paper-hero__chip">Signed in · {session.email}</span>
              {ghost.map((g) => (
                <span key={g.label} className="paper-hero__chip">
                  {g.label}
                </span>
              ))}
            </div>
          </div>
          <div className="paper-hero__price">
            <p className="paper-hero__price-label">Commissions</p>
            <p className="paper-hero__price-value">—</p>
            <p className="paper-hero__price-status">
              Earned this period — arrives with the agent/commission contract.
            </p>
          </div>
        </div>
      </div>

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
