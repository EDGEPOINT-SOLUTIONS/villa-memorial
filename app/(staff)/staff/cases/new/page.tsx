import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { OpenCaseForm } from "./open-case";

export const metadata = { title: "Open a case — Staff Portal" };

export default async function NewCasePage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:write"])) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Open a case" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:write"]} />
        </PageSection>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations · Case"
        title="Open a case"
        actions={
          <Link href="/staff/cases" className="btn btn--secondary btn--sm">
            Back to cases
          </Link>
        }
      />
      <PageSection>
        <Card header={<h3>Intake</h3>}>
          <p className="text-sm text-muted">
            Everything here is optional — take what the family can give you today and
            complete the rest later. The case opens at the <strong>inquiry</strong> stage
            with its tasks seeded, and the service contract can be generated as soon as it
            exists. An order can be linked afterwards.
          </p>
          <OpenCaseForm />
        </Card>
      </PageSection>
    </>
  );
}
