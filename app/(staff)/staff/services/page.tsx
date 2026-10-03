import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState, ErrorState } from "@/components/ui/states";
import { EngagementRegister } from "@/components/staff/engagement-register";
import { AwaitingSales } from "@/components/staff/awaiting-sales";
import { listEngagementViews, soldProspectsAwaiting } from "@/lib/api-client/lifecycle";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { ApiError } from "@/lib/api-client/api-error";

export const metadata = { title: "Services — Admin Portal" };

/**
 * Services — the register of every service a client has availed.
 *
 * Each row carries the client, the service and its price basis, the day it is
 * booked, and the amount and what is paid. A service's calendar slot is the SAME
 * record the office calendar renders (the row links to the day), and a calendar
 * entry opens the client's service record — one fact, one source.
 *
 * Gating is the inquiries area's own (`cases:read`); no scheduling/burial contract
 * is frozen for a service register, so this is fixture/local data and says so.
 */
export default async function ServicesPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Messages & inquiries" title="Services" />
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
      soldProspectsAwaiting("service"),
    ]);
  } catch (err) {
    return (
      <>
        <PageHeader eyebrow="Messages & inquiries" title="Services" />
        <PageSection>
          <ErrorState
            message={err instanceof ApiError ? err.message : "The service register is unavailable right now."}
          />
        </PageSection>
      </>
    );
  }

  return (
    <div className="stack-4">
      <PageHeader
        eyebrow="Messages & inquiries"
        title="Services"
        lead="Every service availed, its day and resource, and its balance."
        actions={
          <Link href="/staff/lifecycle/new?kind=service" className="btn btn--primary btn--sm">
            Record a service
          </Link>
        }
      />
      <PageSection>
        <AwaitingSales kind="service" prospects={awaiting} />
      </PageSection>
      <PageSection>
        <EngagementRegister kind="service" views={views} />
      </PageSection>
    </div>
  );
}
