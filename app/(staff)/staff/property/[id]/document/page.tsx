import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader, PageSection } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { getLot } from "@/lib/api-client/property";
import { getPurchaseApplicationForLot } from "@/lib/api-client/purchase-applications";
import { PurchaseApplicationDocument } from "@/components/purchase-application-document";

export const metadata = { title: "Purchase document — Staff Portal" };

/**
 * The recorded purchase application as its paper document — the counterpart to the
 * capture screen at /apply. Rendered from the stored record through the same paper
 * builder the .docx/.pdf exports use; in fixture mode this is the "generated
 * agreement / paper document view" (the documents service cannot be called live-less —
 * it answers honestly when wired).
 */
export default async function PurchaseDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["property:read"])) {
    return (
      <>
        <PageHeader eyebrow="Operations · Purchase document" title="Purchase document" />
        <PageSection>
          <ForbiddenState requiredScopes={["property:read"]} />
        </PageSection>
      </>
    );
  }

  const { id } = await params;

  let lot;
  try {
    lot = await getLot(id);
  } catch {
    return (
      <>
        <PageHeader eyebrow="Operations · Purchase document" title="Purchase document" />
        <PageSection>
          <ErrorState message="We couldn't find that lot record." />
        </PageSection>
      </>
    );
  }

  let application: Awaited<ReturnType<typeof getPurchaseApplicationForLot>> | "unavailable" =
    null;
  try {
    application = await getPurchaseApplicationForLot(id);
  } catch {
    application = "unavailable";
  }

  return (
    <>
      <div className="stack">
        <div>
          <Link
            href={`/staff/property/${encodeURIComponent(lot.id)}`}
            className="btn btn--ghost btn--sm"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Back to lot {lot.lot_number}
          </Link>
        </div>

        {application === "unavailable" ? (
          <PageSection>
            <ErrorState message="Purchase applications are unavailable in live mode — no contract is frozen yet (waits on dev). Run the app in fixture mode to see the paper document." />
          </PageSection>
        ) : application === null ? (
          <PageSection>
            <EmptyState
              title="No purchase application on file"
              hint="Capture the application for this lot first — the paper document prints the buyer's real values once it is recorded."
            />
            <div style={{ marginTop: "var(--space-4)" }}>
              <Link
                href={`/staff/property/${encodeURIComponent(lot.id)}/apply`}
                className="btn btn--primary"
              >
                Take the purchase application
              </Link>
            </div>
          </PageSection>
        ) : (
          <PurchaseApplicationDocument
            application={application}
            lot={lot}
            editHref={`/staff/property/${encodeURIComponent(lot.id)}/apply`}
          />
        )}
      </div>
    </>
  );
}
