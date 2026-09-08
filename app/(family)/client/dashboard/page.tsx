import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState } from "@/components/ui/states";

export const metadata = { title: "Family dashboard — In Memoriam" };

export default async function ClientDashboardPage() {
  await requirePortalSessionOrRedirect("family");

  let snapshot;
  try {
    snapshot = await getFamilySnapshot();
  } catch {
    return (
      <>
        <PageHeader eyebrow="Family portal" title="Dashboard" />
        <PageSection>
          <ErrorState message="Your family summary is unavailable right now." />
        </PageSection>
      </>
    );
  }

  const { loved_one, plan_summary, balance, recent_documents } = snapshot;

  return (
    <>
      <div className="paper-hero">
        <div className="paper-hero__grid">
          <div>
            <p className="paper-hero__eyebrow">Family portal · Dashboard</p>
            <h1 className="paper-hero__title">Welcome home</h1>
            <p className="paper-hero__lead">
              Your arrangement for {loved_one.name} is looked after here — the plan,
              the balance and every document issued, together in one place.
            </p>
            <div className="paper-hero__chips">
              <span className="paper-hero__chip">{plan_summary.plan_name}</span>
              <span className="paper-hero__chip">{plan_summary.term}</span>
              <span className="paper-hero__chip">
                {recent_documents.length > 0
                  ? `${recent_documents.length} document${recent_documents.length === 1 ? "" : "s"} issued`
                  : "No documents issued yet"}
              </span>
            </div>
          </div>
          <div className="paper-hero__price">
            <p className="paper-hero__price-label">Balance</p>
            <p className="paper-hero__price-value">{balance.total}</p>
            <p className="paper-hero__price-status">
              {balance.paid === balance.total
                ? "Fully paid — thank you."
                : `next due ${plan_summary.next_due}`}
            </p>
          </div>
        </div>
      </div>

      <PageSection>
        <div className="memorial-card">
          <p className="text-sm text-muted" style={{ margin: 0 }}>
            In loving memory
          </p>
          <h1 className="memorial-card__name">{loved_one.name}</h1>
          <div className="memorial-card__dates">{loved_one.life_dates}</div>
          <hr className="ornament-rule" />
          <p className="text-sm text-muted" style={{ maxWidth: "36rem", margin: "0 auto" }}>
            We are here with your family through every step. Below is your arrangement,
            your family&rsquo;s plans, and your documents — all in one place.
          </p>
        </div>
      </PageSection>

      <div className="family-grid">
        <Card header={<h3>Your arrangement</h3>}>
          <div className="stack-3">
            <div className="row row--space">
              <span className="text-sm text-muted">Plan</span>
              <strong>{plan_summary.plan_name}</strong>
            </div>
            <div className="arrangement-steps">
              <div className="arrangement-step">
                <Badge tone="success">Done</Badge>
                <span>Plan chosen</span>
              </div>
              <div className="arrangement-step">
                <Badge tone={balance.paid !== "₱0" ? "success" : "warning"}>{" "}{balance.paid !== "₱0" ? "In progress" : "Upcoming"}</Badge>
                <span>Payments in progress</span>
              </div>
              <div className="arrangement-step">
                <Badge tone={recent_documents.length > 0 ? "success" : "neutral"}>{recent_documents.length > 0 ? "Done" : "Upcoming"}</Badge>
                <span>Documents issued</span>
              </div>
            </div>
            <p className="text-sm text-muted">
              {plan_summary.term} · next due {plan_summary.next_due}
            </p>
          </div>
        </Card>

        <Card header={<h3>Balance</h3>}>
          <div className="stack-3">
            <div className="row row--space">
              <span className="text-sm text-muted">Total</span>
              <span>{balance.total}</span>
            </div>
            <div className="row row--space">
              <span className="text-sm text-muted">Paid</span>
              <span>{balance.paid}</span>
            </div>
            <div className="row row--space">
              <span className="text-sm text-muted">Remaining</span>
              <strong>{balance.remaining}</strong>
            </div>
          </div>
        </Card>
      </div>

      <PageSection>
        <Card header={<h3>My documents</h3>}>
          {recent_documents.length === 0 ? (
            <p className="text-sm text-muted">No documents yet.</p>
          ) : (
            <div className="stack-3">
              {recent_documents.map((d) => (
                <div key={d.title} className="row row--space">
                  <span>{d.title}</span>
                  <Badge tone="info">{d.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </PageSection>
    </>
  );
}
