import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState, NotWiredState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";

export const metadata = { title: "Users & roles — Staff Portal" };

/** Users & roles (villa /admin/users). Auth is live; user provisioning API is
 * dev-authored — the invite door exists and is reachable from here. */
export default async function UsersPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["identity:users:manage"])) {
    return (
      <>
        <PageHeader eyebrow="Administration" title="Users & roles" />
        <PageSection>
          <ForbiddenState requiredScopes={["identity:users:manage"]} />
        </PageSection>
      </>
    );
  }
  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Users & roles"
        actions={
          <Link href="/staff/users/new" className="btn btn--primary btn--sm">
            + Invite user
          </Link>
        }
      />
      <PageSection>
        <NotWiredState
          area="Users & roles"
          reason="identity-access runs authentication today; the user-provisioning API (create/assign roles) is dev-authored. The invite entry point opens the honest not-wired door until then."
        />
      </PageSection>
    </>
  );
}
