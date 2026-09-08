import { ForbiddenState, NotWiredState } from "@/components/ui/states";
import { PageHeader, PageSection } from "@/components/ui/page";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";

/**
 * Shared pattern for portal sections whose working screens arrive with their
 * module delivery: verify scope server-side → graceful denial or honest
 * "not wired yet" empty state (never a broken page).
 */
export async function gatedSectionPage(
  title: string,
  eyebrow: string,
  requiredScopes: string[],
  reason?: string,
) {
  const session = await requireSessionOrRedirect();
  const allowed = hasAnyScope(session.scopes, requiredScopes);

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} />
      <PageSection>
        {allowed ? (
          <NotWiredState area={title} reason={reason} />
        ) : (
          <ForbiddenState requiredScopes={requiredScopes} />
        )}
      </PageSection>
    </>
  );
}
