import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { ForbiddenState } from "@/components/ui/states";
import { StatCard } from "@/components/kit";
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
      <PageHeader
        eyebrow="Relationships"
        title="Inquiries"
        lead="Every enquiry the storefront and the office recorded."
      />

      <div className="kpi-grid" style={{ marginBottom: "var(--space-5)" }}>
        <StatCard label="Inquiries" value={inquiries.length} sub="total received" />
        <StatCard label="New" value={newCount} sub="awaiting first contact" />
        <StatCard label="Converted" value={converted} sub="became customers" />
        <StatCard label="From website" value={website} sub="public site leads" />
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
