import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/states";
import { getLot } from "@/lib/api-client/property";
import { formatMinorUnits } from "@/lib/money";
import { SAMPLE_PARK_IMAGE, VILLA_SECTION_PHOTOS } from "@/lib/media";
import { LOT_TONE, lotStatusLabel } from "@/lib/lot-labels";

export const metadata = { title: "Lot details — Villa Memorial" };

const TYPE_LABEL: Record<string, string> = {
  individual: "Individual lot",
  family: "Family lot",
  estate: "Estate lot",
};

/** Public lot detail — real data from the frozen Lot contract. Reservation is
 * handled by the memorial park office (online reservation is staff-scoped / M1). */
export default async function PublicLotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let lot;
  try {
    lot = await getLot(id);
  } catch {
    return (
      <div className="stack-4">
        <h1>Lot not found</h1>
        <ErrorState message="We couldn't find that lot. It may have been removed from public listings." />
        <Link href="/lots" className="btn btn--secondary btn--sm">
          Back to lots
        </Link>
      </div>
    );
  }

  return (
    <div className="stack-4">
      <div className="page-header">
        <div>
          <p className="page-header__eyebrow">Memorial lots</p>
          <h1>{lot.lot_number}</h1>
        </div>
        <div className="page-header__actions">
          <Link href="/lots" className="btn btn--secondary btn--sm">
            Back to lots
          </Link>
        </div>
      </div>

      <div className="landing__grid landing__grid--pair" >
        <div className="media-block product-layout__media">
          {/* eslint-disable-next-line @next/next/no-img-element -- legend-attached lot photos */}
          <img
            src={VILLA_SECTION_PHOTOS[lot.section] ?? SAMPLE_PARK_IMAGE}
            alt={VILLA_SECTION_PHOTOS[lot.section] ? `${lot.lot_number} · section ${lot.section}` : "Memorial park grounds"}
          />
        </div>

        <div className="detail-sticky">
<Card header={<h3>Lot details</h3>}>
          <div className="stack-3">
            <div>
              <Badge tone={LOT_TONE[lot.status] ?? "neutral"}>
                {lotStatusLabel(lot.status)}
              </Badge>
            </div>
            <div className="row row--space">
              <span className="text-sm text-muted">Section</span>
              <span>{lot.section}</span>
            </div>
            <div className="row row--space">
              <span className="text-sm text-muted">Block</span>
              <span>{lot.block}</span>
            </div>
            <div className="row row--space">
              <span className="text-sm text-muted">Type</span>
              <span>{TYPE_LABEL[lot.type] ?? lot.type}</span>
            </div>
            <div className="row row--space">
              <span className="text-sm text-muted">Area</span>
              <span>{lot.area_sqm} sqm</span>
            </div>
            <div className="row row--space">
              <span className="text-sm text-muted">Price</span>
              <strong>{formatMinorUnits(lot.price_cents, lot.currency)}</strong>
            </div>
          </div>
        </Card></div>

      </div>

      {lot.status === "available" ? (
        <p className="text-sm text-muted">
          This lot is available. Reservations are handled by the memorial park office —
          online reservation and checkout are not available yet.
        </p>
      ) : (
        <p className="text-sm text-muted">
          This lot is {lotStatusLabel(lot.status).toLowerCase()}. Please contact the
          memorial park office for more information.
        </p>
      )}
    </div>
  );
}
