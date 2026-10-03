import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState, ErrorState } from "@/components/ui/states";
import { EngagementRegister } from "@/components/staff/engagement-register";
import { AwaitingSales } from "@/components/staff/awaiting-sales";
import { listEngagementViews, soldProspectsAwaiting } from "@/lib/api-client/lifecycle";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { ApiError } from "@/lib/api-client/api-error";

export const metadata = { title: "Products bought — Admin Portal" };

/**
 * Products bought — the product register (captain, 2026-10-03).
 *
 * What was bought, when, and for how much, with what is paid and still owed. A
 * garden lot is also a product, but it is paid monthly over a term, so it records
 * on its OWN register (`/staff/lots`) rather than beside these one-time sales —
 * the split the captain asked us to decide and state. Opening a row is the
 * buyer's record: payments and, where a balance remains, the notices.
 */
export default async function ProductsPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Orders & commerce" title="Products bought" />
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
      soldProspectsAwaiting("product"),
    ]);
  } catch (err) {
    return (
      <>
        <PageHeader eyebrow="Orders & commerce" title="Products bought" />
        <PageSection>
          <ErrorState
            message={err instanceof ApiError ? err.message : "The product register is unavailable right now."}
          />
        </PageSection>
      </>
    );
  }

  return (
    <div className="stack-4">
      <PageHeader
        eyebrow="Orders & commerce"
        title="Products bought"
        lead="Every product sold, when, and what is paid. Garden lots are monthly-paid and record on their own register."
        actions={
          <div className="row row--wrap">
            <Link href="/staff/lots" className="btn btn--ghost btn--sm">
              Garden lots
            </Link>
            <Link href="/staff/lifecycle/new?kind=product" className="btn btn--primary btn--sm">
              Record a product
            </Link>
          </div>
        }
      />
      <PageSection>
        <AwaitingSales kind="product" prospects={awaiting} />
      </PageSection>
      <PageSection>
        <EngagementRegister kind="product" views={views} />
      </PageSection>
    </div>
  );
}
