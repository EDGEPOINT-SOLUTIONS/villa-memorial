import Link from "next/link";
import { ArrowLeft, Landmark, MapPin, Ruler } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { getLot } from "@/lib/api-client/property";
import { getPurchaseApplicationForLot } from "@/lib/api-client/purchase-applications";
import { formatMinorUnits } from "@/lib/money";
import {
  PurchaseApplicationForm,
} from "@/components/purchase-application-form";
import {
  applicationToValues,
  centsToPesoInput,
} from "@/lib/contracts/purchase-application-values";

export const metadata = { title: "Purchase application — Admin Portal" };

const STATUS_TONE: Record<string, "success" | "warning" | "info" | "neutral" | "danger"> = {
  available: "success",
  reserved: "warning",
  sold: "info",
  occupied: "neutral",
  on_hold: "danger",
  maintenance_hold: "danger",
  for_transfer: "warning",
};

/**
 * Track B capture route (FORMS_PLAN gap 2) — Villa's lot Purchase Application for one lot,
 * redesigned as the flagship document experience: the paper folio flow (buyer →
 * beneficiaries → lot & financing → consent & signatures) with a live paper-document
 * preview and real Word/PDF export of the same content.
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
    // Live mode has no purchase-application API yet — the alert below explains why saving
    // is unavailable there while still letting the counter rehearse the capture.
    application = "unavailable";
  }

  const initial =
    application !== null && application !== "unavailable"
      ? applicationToValues(application)
      : applicationToValues(null, {
          basic_price_cents: centsToPesoInput(lot.price_cents),
        });
  const updating = application !== null && application !== "unavailable";
  const statusLabel = lot.status.replace(/_/g, " ");

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

        <div className="paper-hero">
          <div className="paper-hero__grid">
            <div>
              <p className="paper-hero__eyebrow">
                Villa Memorial Park · {updating ? "Update" : "New"} application
              </p>
              <h1 className="paper-hero__title">
                {updating
                  ? `Purchase application — lot ${lot.lot_number}`
                  : "The Purchase Application & Agreement"}
              </h1>
              <p className="paper-hero__lead">
                {updating
                  ? "Update the buyer's application on file — the paper document and the exports below re-print from these values."
                  : "Capture the buyer's application exactly as the paper asks. Every written figure stays as the counter types it; nothing here computes or validates money (finance rules are the dev's)."}
              </p>
              <div className="paper-hero__chips">
                <span className="paper-hero__chip">
                  <MapPin size={13} aria-hidden="true" /> Lot {lot.lot_number}
                </span>
                {lot.section ? (
                  <span className="paper-hero__chip">
                    <Landmark size={13} aria-hidden="true" /> {lot.section}
                  </span>
                ) : null}
                {lot.block ? (
                  <span className="paper-hero__chip">{lot.block}</span>
                ) : null}
                <span className="paper-hero__chip">
                  <Ruler size={13} aria-hidden="true" /> {lot.area_sqm} sqm
                </span>
                <Badge tone={STATUS_TONE[lot.status] ?? "neutral"}>{statusLabel}</Badge>
                {lot.owner_name && lot.status !== "available" ? (
                  <span className="paper-hero__chip">for {lot.owner_name}</span>
                ) : null}
              </div>
            </div>
            <div className="paper-hero__price">
              <p className="paper-hero__price-label">Listed basic price</p>
              <p className="paper-hero__price-value">
                {formatMinorUnits(lot.price_cents, lot.currency)}
              </p>
              <p className="paper-hero__price-status">
                Starting figure for the price rows — correct it if the counter&rsquo;s
                written figure differs.
              </p>
            </div>
          </div>
        </div>

        {application === "unavailable" ? (
          <Alert tone="warning" title="Live purchase applications are not wired yet">
            No purchase-application contract is frozen, so in live mode there is nowhere
            to store this form (waits on dev — FORMS_PLAN gap 2). Run the app in fixture
            mode to record and demo applications in-process. The paper preview and the
            Word / PDF exports work from the form either way — they render what you type,
            before anything is saved.
          </Alert>
        ) : null}

        <PurchaseApplicationForm
          initial={initial}
          lotId={lot.id}
          lotNumber={lot.lot_number}
          lotHeldFor={lot.owner_name}
          lotStatus={lot.status}
          lot={lot}
          submitLabel={
            updating ? "Update purchase application" : "Record purchase application"
          }
          pendingLabel="Saving…"
          intro={
            updating
              ? "This lot already has an application on file — update it here and the agreement generator on the lot page re-prints from the saved values."
              : lot.status === "available"
                ? "Saving this application records it and reserves the lot in the buyer's name. Price figures are written as the counter types them — nothing here computes or validates them (that is dev/finance domain)."
                : undefined
          }
        />
      </div>
    </>
  );
}
