import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { ForbiddenState } from "@/components/ui/states";
import { InquiryBoard } from "./inquiry-board";
import { listInquiries } from "@/lib/api-client/crm";

export const metadata = { title: "Inquiries — Admin Portal" };

const STATUS_TONE: Record<string, "info" | "warning" | "success" | "neutral"> = {
  new: "info",
  contacted: "warning",
  qualified: "warning",
  converted: "success",
  closed: "neutral",
};

export default async function InquiriesPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader
          eyebrow="Relationships"
          title="Inquiries"
          actions={
            <Link href="/staff/inquiries/new" className="btn btn--primary btn--sm">
              + New inquiry
            </Link>
          }
        />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:read"]} />
        </PageSection>
      </>
    );
  }

  const inquiries = await listInquiries();
  const byStatus = (st: string) => inquiries.filter((i) => i.status === st).length;
  const bySource = (src: string) => inquiries.filter((i) => i.source === src).length;
  const newCount = byStatus("new");
  const converted = byStatus("converted");
  const website = bySource("website");

  return (
    <>
      <PageHeader eyebrow="Relationships" title="Inquiries" />

      <div className="kpi-grid" style={{ marginBottom: "var(--space-5)" }}>
        <span className="card kpi-card"><span className="kpi-card__body"><span className="kpi-card__label">Inquiries</span><span className="kpi-card__value">{inquiries.length}</span><span className="kpi-card__sub">total received</span></span></span>
        <span className="card kpi-card"><span className="kpi-card__body"><span className="kpi-card__label">New</span><span className="kpi-card__value">{newCount}</span><span className="kpi-card__sub">awaiting first contact</span></span></span>
        <span className="card kpi-card"><span className="kpi-card__body"><span className="kpi-card__label">Converted</span><span className="kpi-card__value">{converted}</span><span className="kpi-card__sub">became customers</span></span></span>
        <span className="card kpi-card"><span className="kpi-card__body"><span className="kpi-card__label">From website</span><span className="kpi-card__value">{website}</span><span className="kpi-card__sub">public site leads</span></span></span>
      </div>

      <PageSection>
        <InquiryBoard
          initialInquiries={inquiries}
          statusTone={STATUS_TONE}
          canCapture={hasAnyScope(session.scopes, ["cases:write"])}
        />
      </PageSection>
    </>
  );
}
