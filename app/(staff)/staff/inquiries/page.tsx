import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { ForbiddenState } from "@/components/ui/states";
import { StatCard } from "@/components/kit";
import { InquiryBoard } from "./inquiry-board";
import { listInquiries } from "@/lib/api-client/crm";
import { listCases } from "@/lib/api-client/operations";

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
          eyebrow="Messages & inquiries"
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
  // The enquiry's case, when one was opened from it: the case carries the same
  // `inquiry_reference`, so this is the one link both screens read.
  let linkedCases: Record<string, string> = {};
  try {
    linkedCases = Object.fromEntries(
      (await listCases())
        .filter((kase) => Boolean(kase.inquiry_reference))
        .map((kase) => [kase.inquiry_reference as string, kase.id]),
    );
  } catch {
    // A case store that cannot be read leaves the column saying "—", never a guess.
  }
  const sentToCase = inquiries.filter((i) => linkedCases[i.reference]).length;
  const byStatus = (st: string) => inquiries.filter((i) => i.status === st).length;
  const newCount = byStatus("new");
  const converted = byStatus("converted");

  return (
    <>
      <PageHeader
        eyebrow="Messages & inquiries"
        title="Inquiries"
        lead="Every enquiry the storefront and the office recorded."
      />

      <div className="kpi-grid" style={{ marginBottom: "var(--space-5)" }}>
        <StatCard label="Inquiries" value={inquiries.length} sub="total received" />
        <StatCard label="New" value={newCount} sub="awaiting first contact" />
        <StatCard label="Converted" value={converted} sub="became customers" />
        <StatCard label="Sent to case" value={sentToCase} sub="carried into a case" />
      </div>

      <PageSection>
        <InquiryBoard
          initialInquiries={inquiries}
          statusTone={STATUS_TONE}
          canCapture={hasAnyScope(session.scopes, ["cases:write"])}
          linkedCases={linkedCases}
        />
      </PageSection>
    </>
  );
}
