import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState, ErrorState } from "@/components/ui/states";
import { EngagementRegister } from "@/components/staff/engagement-register";
import { AwaitingSales } from "@/components/staff/awaiting-sales";
import { listEngagementViews, soldProspectsAwaiting } from "@/lib/api-client/lifecycle";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { ApiError } from "@/lib/api-client/api-error";

export const metadata = { title: "Garden lots — Admin Portal" };

/**
 * Garden lots — the lots register, its own page (captain, 2026-10-03).
 *
 * A lot is a product, but it is paid over a term; the office asked for whichever
 * reads cleaner, so the lots live HERE on their own register (amount · term ·
 * paid · outstanding · next due) rather than mixed into the one-time product
 * list. Opening a row is the lot's accounting: the amortization schedule, the
 * payments and the notices. The Products page states this split and links here.
 */
export default async function LotsPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Orders & commerce" title="Garden lots" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:read"]} />
        </PageSection>
      </>
    );
  }

  let views: Awaited<ReturnType<typeof listEngagementViews>>;
  let awaiting: Awaited<ReturnType<typeof soldProspectsAwaiting>>;
  try {
    [views, awaiting] = await Promise.all([
      listEngagementViews(new Date()),
      soldProspectsAwaiting("lot"),
    ]);
  } catch (err) {
    return (
      <>
        <PageHeader eyebrow="Orders & commerce" title="Garden lots" />
        <PageSection>
          <ErrorState
            message={err instanceof ApiError ? err.message : "The lots register is unavailable right now."}
          />
        </PageSection>
      </>
    );
  }

  return (
    <div className="stack-4">
      <PageHeader
        eyebrow="Orders & commerce"
        title="Garden lots"
        lead="Every lot sold, its monthly term and its amortization."
        actions={
          <Link href="/staff/lifecycle/new?kind=lot" className="btn btn--primary btn--sm">
            Record a lot
          </Link>
        }
      />
      <PageSection>
        <AwaitingSales kind="lot" prospects={awaiting} />
      </PageSection>
      <PageSection>
        <EngagementRegister kind="lot" views={views} />
      </PageSection>
    </div>
  );
}
