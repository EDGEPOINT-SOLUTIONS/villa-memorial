import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { getLot } from "@/lib/api-client/property";
import { getPurchaseApplicationForLot } from "@/lib/api-client/purchase-applications";
import {
  PurchaseApplicationForm,
} from "@/components/purchase-application-form";
import {
  applicationToValues,
  centsToPesoInput,
} from "@/lib/contracts/purchase-application-values";

export const metadata = { title: "Purchase application — Staff Portal" };

/**
 * Track B capture route (FORMS_PLAN gap 2): Villa's lot Purchase Application for one lot.
 *
 * Saving records the application and, on an AVAILABLE lot, reserves it for the buyer
 * (property:write). The agreement generator on the lot detail page then prints the
 * buyer's and financing's real values. The application-record shape is NOT frozen by any
 * service contract yet — fixture mode demos it in-process; live persistence answers 503
 * honestly (see lib/api-client/purchase-applications.ts).
 */
export default async function PurchaseApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["property:write"])) {
    return (
      <>
        <PageHeader eyebrow="Operations · Purchase application" title="Purchase application" />
        <PageSection>
          <ForbiddenState requiredScopes={["property:write"]} />
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
        <PageHeader eyebrow="Operations · Purchase application" title="Purchase application" />
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
    // Live mode has no purchase-application API yet — the form below explains why saving
    // is unavailable there while still letting the counter rehearse the capture.
    application = "unavailable";
  }

  const initial =
    application !== null && application !== "unavailable"
      ? applicationToValues(application)
      : applicationToValues(null, {
          basic_price_cents: centsToPesoInput(lot.price_cents),
        });

  return (
    <>
      <PageHeader
        eyebrow="Operations · Lot · Purchase application"
        title={`Purchase application — ${lot.lot_number}`}
        actions={
          <Link href={`/staff/property/${encodeURIComponent(lot.id)}`} className="btn btn--secondary btn--sm">
            Back to lot
          </Link>
        }
      />

      <PageSection>
        <Card header={<h3>Villa Purchase Application and Agreement</h3>}>
          {application === "unavailable" ? (
            <Alert tone="warning" title="Live purchase applications are not wired yet">
              No purchase-application contract is frozen, so in live mode there is nowhere
              to store this form (waits on dev — FORMS_PLAN gap 2). Run the app in fixture
              mode to record and demo applications in-process.
            </Alert>
          ) : null}
          <PurchaseApplicationForm
            initial={initial}
            lotId={lot.id}
            lotNumber={lot.lot_number}
            lotHeldFor={lot.owner_name}
            lotStatus={lot.status}
            submitLabel={application && application !== "unavailable" ? "Update purchase application" : "Record purchase application"}
            pendingLabel="Saving…"
            intro={
              application && application !== "unavailable"
                ? "This lot already has an application on file — update it here and the agreement generator on the lot page re-prints from the saved values."
                : "Captures the buyer's application exactly as the paper asks. Saving records it and, if the lot is still available, reserves it in the buyer's name. Price figures are written as the counter types them — nothing here computes or validates them (that is dev/finance domain)."
            }
          />
        </Card>
      </PageSection>
    </>
  );
}
