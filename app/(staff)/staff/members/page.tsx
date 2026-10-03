import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState, ErrorState } from "@/components/ui/states";
import { EngagementRegister } from "@/components/staff/engagement-register";
import { listEngagementViews } from "@/lib/api-client/lifecycle";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { ApiError } from "@/lib/api-client/api-error";

export const metadata = { title: "Members — Admin Portal" };

/**
 * Members — the plan-membership register and nothing else (captain, 2026-10-03).
 *
 * One row per member: the plan and term, what they applied for, the amount, what
 * is paid, what is outstanding, and the next due date. Opening a row is the
 * member's accounting — every recorded payment, the amortization schedule and the
 * modular notices (`/staff/lifecycle/[id]`). The figures are read from the one
 * lifecycle store the Prospects conversion feeds, so no number is restated.
 *
 * Gating is the inquiries area's own (`cases:read`), the same provisional reuse as
 * Prospects. No membership/COC contract is frozen, so the register is fixture-mode
 * and says so through the store it reads.
 */
export default async function MembersPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Messages & inquiries" title="Members" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:read"]} />
        </PageSection>
      </>
    );
  }

  let views: Awaited<ReturnType<typeof listEngagementViews>>;
  try {
    views = await listEngagementViews(new Date());
  } catch (err) {
    return (
      <>
        <PageHeader eyebrow="Messages & inquiries" title="Members" />
        <PageSection>
          <ErrorState
            message={err instanceof ApiError ? err.message : "The member register is unavailable right now."}
          />
        </PageSection>
      </>
    );
  }

  return (
    <div className="stack-4">
      <PageHeader
        eyebrow="Messages & inquiries"
        title="Members"
        lead="Every plan membership, its balance and its next due date."
        actions={
          <Link href="/staff/lifecycle/new?kind=plan" className="btn btn--primary btn--sm">
            Record a plan
          </Link>
        }
      />
      <PageSection>
        <EngagementRegister kind="plan" views={views} />
      </PageSection>
    </div>
  );
}
