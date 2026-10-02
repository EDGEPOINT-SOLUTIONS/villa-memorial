import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { NewInquiryForm } from "./new-inquiry-form";

export const metadata = { title: "Log an inquiry — Admin Portal" };

/**
 * The dedicated inquiry form (`/staff/inquiries/new`) — the Forms area's entry for
 * a call, a walk-in or a message. It is the SAME form the board's quick capture
 * renders (`../inquiry-capture.tsx`), writing the one durable route, so the office
 * cannot capture an enquiry two different ways. Recording returns to the board.
 */
export default async function NewInquiryPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:write"])) {
    return (
      <>
        <PageHeader eyebrow="Messages & inquiries" title="Log an inquiry" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:write"]} />
        </PageSection>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Forms · Messages & inquiries"
        title="Log an inquiry"
        lead="A call, a walk-in or a message — recorded once and shown on the board."
        actions={
          <Link href="/staff/inquiries" className="btn btn--secondary btn--sm">
            All inquiries
          </Link>
        }
      />
      <PageSection>
        <Alert tone="info" title="What happens next">
          The enquiry joins the office register. When it is done, open it on the board and
          choose <strong>Send to case</strong> to carry the person and the request into a
          case without retyping them.
        </Alert>
      </PageSection>
      <PageSection>
        <NewInquiryForm />
      </PageSection>
    </>
  );
}
