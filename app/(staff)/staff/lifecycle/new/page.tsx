import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState } from "@/components/ui/states";
import { EngagementForm } from "@/components/staff/engagement-form";
import {
  ENGAGEMENT_KINDS,
  ENGAGEMENT_KIND_LABEL,
  isEngagementKind,
  type EngagementKind,
} from "@/lib/lifecycle";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";

export const metadata = { title: "Record an outcome — Admin Portal" };

/**
 * Record an outcome — the one create page behind all four registers.
 *
 * The kind is chosen here (a plan · a service · a lot · a product) and the form
 * shows only that kind's fields; the validation and persistence are the pure
 * `lib/lifecycle.ts` intake and the durable store. A sold prospect's id can be
 * carried in from the pipeline so the outcome links to the person it came from.
 */
export default async function NewOutcomePage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; prospect?: string; name?: string }>;
}) {
  const session = await requireSessionOrRedirect();
  const params = await searchParams;
  const kind: EngagementKind = isEngagementKind(params.kind) ? params.kind : "plan";

  if (!hasAnyScope(session.scopes, ["cases:write"])) {
    return (
      <>
        <PageHeader eyebrow="Clients & records" title="Record an outcome" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:write"]} />
        </PageSection>
      </>
    );
  }

  return (
    <div className="stack-4">
      <PageHeader
        eyebrow="Clients & records"
        title={`Record a ${ENGAGEMENT_KIND_LABEL[kind].toLowerCase()}`}
        lead="One record, one register — the figures it derives lead the page it opens."
      />

      <PageSection>
        <div className="row row--wrap">
          {ENGAGEMENT_KINDS.map((value) => (
            <Link
              key={value}
              href={`/staff/lifecycle/new?kind=${value}`}
              className={`btn btn--sm ${value === kind ? "btn--primary" : "btn--ghost"}`}
            >
              {ENGAGEMENT_KIND_LABEL[value]}
            </Link>
          ))}
        </div>
      </PageSection>

      <PageSection>
        <EngagementForm
          kind={kind}
          defaultName={params.name ?? ""}
          prospectId={params.prospect ?? null}
        />
      </PageSection>
    </div>
  );
}
