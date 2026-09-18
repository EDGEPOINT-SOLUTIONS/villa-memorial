import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { getLot } from "@/lib/api-client/property";
import { getLotRecordSummaries, type LotRecordSummaries } from "@/lib/api-client/lot-lifecycle";
import { getPurchaseApplicationForLot } from "@/lib/api-client/purchase-applications";
import { buyerFullName, purchaseApplicationMoneyRows } from "@/lib/contracts/purchase-application";
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
  const canCaptureApplication = canReserve;
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

  // The four lot-record screens (captain checklist F-11) hang off this lot. Their
  // one-line states come from the office's recorded file; a read failure leaves the
  // entry rows out with an honest note rather than breaking the lot page itself.
  let recordSummaries: LotRecordSummaries | null = null;
  try {
    recordSummaries = await getLotRecordSummaries(lot);
  } catch {
    recordSummaries = null;
  }

  // The purchase application (if any) names the buyer in full and carries the sale's
  // written figures; the agreement generator reads it server-side. Live mode has no
  // purchase-application API yet, so an unavailable read is a real state, not a bug.
  let application: Awaited<ReturnType<typeof getPurchaseApplicationForLot>> | "unavailable" =
    null;
  try {
    application = await getPurchaseApplicationForLot(id);
  } catch {
    application = "unavailable";
  }
  const applicationRecord =
    application !== null && application !== "unavailable" ? application : null;
  const hasApplication = applicationRecord !== null;
  const buyerName = applicationRecord ? buyerFullName(applicationRecord) : lot.owner_name;

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
        <Card header={<h2>Lot details</h2>}>
          <div className="table-wrapper" tabIndex={0}>
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

      <PageSection>
        <Card header={<h2>Lot records</h2>}>
          {recordSummaries ? (
            <>
              <div className="table-wrapper" tabIndex={0}>
                <table className="table">
                  <caption className="visually-hidden">
                    The lot&rsquo;s paperwork records
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Record</th>
                      <th scope="col">As the office&rsquo;s file stands</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        ["ownership", "Ownership", "Who the papers stand in"],
                        ["transfers", "Transfers", "A change of hands in progress"],
                        ["interments", "Interments", "Who is laid to rest here"],
                        ["exhumations", "Exhumations", "Moving a remains, step by step"],
                      ] as const
                    ).map(([key, label, hint]) => {
                      const summary = recordSummaries[key];
                      return (
                        <tr key={key}>
                          <td>
                            <strong>
                              <Link
                                href={`/staff/property/${encodeURIComponent(lot.id)}/${key}`}
                              >
                                {label}
                              </Link>
                            </strong>
                            <div className="text-sm text-muted">{hint}</div>
                          </td>
                          <td className="lot-rec-entry__state">
                            <strong>{summary.lead}</strong>
                            <span>{summary.detail}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted mt-4 mb-0">
                Ownership, transfers, interments and exhumations come from the office&rsquo;s
                recorded file — lot-events-v1 defers those workflows, so each screen says what
                waits on the service.
              </p>
            </>
          ) : (
            <ErrorState message="The lot's paperwork records could not be read." />
          )}
        </Card>
      </PageSection>

      <PageSection>
        <Card header={<h2>Purchase application</h2>}>
          {application === "unavailable" ? (
            <p className="text-sm text-muted">
              Purchase applications are unavailable in live mode — no contract is frozen
              yet (waits on dev). Run the app in fixture mode to see the capture flow.
            </p>
          ) : applicationRecord ? (
            <div className="stack">
              <div className="table-wrapper" tabIndex={0}>
                <table className="table">
                  <tbody>
                    <tr>
                      <th scope="row">Buyer</th>
                      <td><strong>{buyerFullName(applicationRecord)}</strong></td>
                    </tr>
                    <tr>
                      <th scope="row">Applied on</th>
                      <td>{applicationRecord.application_date}</td>
                    </tr>
                    <tr>
                      <th scope="row">Contact / email</th>
                      <td>
                        {[applicationRecord.contact_number, applicationRecord.email].filter(Boolean).join(" · ") ||
                          "—"}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Beneficiaries</th>
                      <td>
                        {applicationRecord.beneficiaries.length > 0
                          ? applicationRecord.beneficiaries
                              .map(
                                (b) =>
                                  `${b.name}${b.relationship ? ` (${b.relationship})` : ""}${b.age !== null ? `, age ${b.age}` : ""}`,
                              )
                              .join("; ")
                          : "—"}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Classification</th>
                      <td>{applicationRecord.classification ?? "—"}</td>
                    </tr>
                    {purchaseApplicationMoneyRows(
                      applicationRecord,
                      lot.price_cents,
                      lot.currency,
                    ).map((row) => (
                      <tr key={row.label}>
                        <th scope="row">{row.label}</th>
                        <td>{row.value}</td>
                      </tr>
                    ))}
                    <tr>
                      <th scope="row">Mode / term</th>
                      <td>
                        {[applicationRecord.mode_of_payment, applicationRecord.amortization_unit ? `${applicationRecord.amortization_value} ${applicationRecord.amortization_unit}` : ""]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">DPA consent</th>
                      <td>
                        {applicationRecord.dpa_consent ? "Consented" : "Not recorded"}
                        {applicationRecord.dpa_consented_at ? ` on ${applicationRecord.dpa_consented_at.slice(0, 10)}` : ""}
                      </td>
                    </tr>
                    {applicationRecord.sales_agent_name ? (
                      <tr>
                        <th scope="row">Sales agent</th>
                        <td>{applicationRecord.sales_agent_name}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {canCaptureApplication ? (
                <div className="row row--wrap">
                  <Link
                    href={`/staff/property/${encodeURIComponent(lot.id)}/apply`}
                    className="btn btn--secondary btn--sm"
                  >
                    Review / edit purchase application
                  </Link>
                  <Link
                    href={`/staff/property/${encodeURIComponent(lot.id)}/document`}
                    className="btn btn--primary btn--sm"
                  >
                    Open paper document
                  </Link>
                </div>
              ) : (
                <div>
                  <Link
                    href={`/staff/property/${encodeURIComponent(lot.id)}/document`}
                    className="btn btn--primary btn--sm"
                  >
                    Open paper document
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="stack">
              <p className="text-sm text-muted">
                No purchase application has been captured for this lot yet. The paper form
                — buyer demographics, beneficiaries, classification, the price rows and the
                financing terms — is what makes the agreement below print real values
                instead of blanks.
              </p>
              {canCaptureApplication ? (
                <div>
                  <Link
                    href={`/staff/property/${encodeURIComponent(lot.id)}/apply`}
                    className="btn btn--secondary btn--sm"
                  >
                    {lot.status === "available"
                      ? "Take purchase application"
                      : "Record purchase application"}
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  Capturing a purchase application needs <code>property:write</code>.
                </p>
              )}
            </div>
          )}
        </Card>
      </PageSection>

      {canGeneratePurchaseAgreement(lot, applicationRecord) ? (
        <PageSection>
          <Card header={<h2>Purchase agreement</h2>}>
            {canGenerateDocuments ? (
              <GenerateAgreementForm
                lotId={lot.id}
                lotNumber={lot.lot_number}
                buyerName={buyerName ?? ""}
                hasApplication={hasApplication}
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
          {canReserve ? (
            <ReserveLotForm lotId={lot.id} lotNumber={lot.lot_number} />
          ) : (
            <p className="text-sm text-muted">
              This lot is available for reservation. Reserving requires the{" "}
              <code>property:write</code> scope — your role has read-only access to
              property records.
            </p>
          )}
        </PageSection>
      ) : null}
    </>
  );
}
