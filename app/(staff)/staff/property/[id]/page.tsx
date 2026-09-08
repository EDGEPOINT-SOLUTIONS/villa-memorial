import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { getLot } from "@/lib/api-client/property";
import { ReserveLotForm } from "./reserve-lot";
import { GenerateAgreementForm } from "./generate-agreement";
import { canGeneratePurchaseAgreement } from "@/lib/contracts/purchase-agreement";
import { formatMinorUnits } from "@/lib/money";

export const metadata = { title: "Lot detail — Staff Portal" };

const STATUS_TONE: Record<string, "success" | "warning" | "info" | "neutral" | "danger"> = {
  available: "success",
  reserved: "warning",
  sold: "info",
  occupied: "neutral",
  on_hold: "danger",
  maintenance_hold: "danger",
  for_transfer: "warning",
};

const TYPE_LABEL: Record<string, string> = {
  individual: "Individual",
  family: "Family",
  estate: "Estate",
};

export default async function LotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["property:read"])) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Lot not found" />
        <PageSection>
          <ForbiddenState requiredScopes={["property:read"]} />
        </PageSection>
      </>
    );
  }

  const canReserve = hasAnyScope(session.scopes, ["property:write"]);
  const canGenerateDocuments = hasAnyScope(session.scopes, ["documents:write"]);
  const { id } = await params;

  let lot;
  try {
    lot = await getLot(id);
  } catch {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Lot not found" />
        <PageSection>
          <ErrorState message="We couldn't find that lot record." />
        </PageSection>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations · Lot"
        title={lot.lot_number}
        actions={
          <Link href="/staff/property" className="btn btn--secondary btn--sm">
            Back to grid
          </Link>
        }
      />

      <PageSection>
        <Card header={<h3>Lot details</h3>}>
          <div className="table-wrapper">
            <table className="table">
              <tbody>
                <tr>
                  <th scope="row">Lot number</th>
                  <td><strong>{lot.lot_number}</strong></td>
                </tr>
                <tr>
                  <th scope="row">Section</th>
                  <td>{lot.section}</td>
                </tr>
                <tr>
                  <th scope="row">Block</th>
                  <td>{lot.block}</td>
                </tr>
                <tr>
                  <th scope="row">Type</th>
                  <td>{TYPE_LABEL[lot.type] ?? lot.type}</td>
                </tr>
                <tr>
                  <th scope="row">Status</th>
                  <td>
                    <Badge tone={STATUS_TONE[lot.status] ?? "neutral"}>
                      {lot.status.replace(/_/g, " ")}
                    </Badge>
                  </td>
                </tr>
                <tr>
                  <th scope="row">Area</th>
                  <td>{lot.area_sqm} sqm</td>
                </tr>
                <tr>
                  <th scope="row">Price</th>
                  <td>{formatMinorUnits(lot.price_cents, lot.currency)}</td>
                </tr>
                <tr>
                  <th scope="row">Owner</th>
                  <td>{lot.owner_name ?? "Unassigned"}</td>
                </tr>
                {lot.reserved_at ? (
                  <tr>
                    <th scope="row">Reserved</th>
                    <td>{new Date(lot.reserved_at).toLocaleDateString()}</td>
                  </tr>
                ) : null}
                {lot.sold_at ? (
                  <tr>
                    <th scope="row">Sold</th>
                    <td>{new Date(lot.sold_at).toLocaleDateString()}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </PageSection>

      {canGeneratePurchaseAgreement(lot) ? (
        <PageSection>
          <Card header={<h3>Purchase agreement</h3>}>
            {canGenerateDocuments ? (
              <GenerateAgreementForm
                lotId={lot.id}
                lotNumber={lot.lot_number}
                buyerName={lot.owner_name ?? ""}
              />
            ) : (
              <p className="text-sm text-muted">
                Generating the purchase agreement needs <code>documents:write</code>.
              </p>
            )}
          </Card>
        </PageSection>
      ) : null}

      {lot.status === "available" ? (
        <PageSection>
          <Card header={<h3>Quick actions</h3>}>
            {canReserve ? (
              <ReserveLotForm lotId={lot.id} lotNumber={lot.lot_number} />
            ) : (
              <p className="text-sm text-muted">
                This lot is available for reservation. Reserving requires the{" "}
                <code>property:write</code> scope — your role has read-only access to
                property records.
              </p>
            )}
          </Card>
        </PageSection>
      ) : null}
    </>
  );
}
