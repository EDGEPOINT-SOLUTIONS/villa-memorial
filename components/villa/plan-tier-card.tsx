import { Banknote, FileText, Layers, Repeat } from "lucide-react";
import type { PlanTierContent } from "@/lib/plan-content";
import { php } from "@/lib/villa-pricing";

/**
 * One plan tier as a comparison COLUMN (`villa-plans-redesign-plan`, captain
 * 2026-09-30).
 *
 * The card is the client's pricing-page anatomy, reduced to what differs between
 * tiers: the coffin photograph, the tier name, its one-line coffin description,
 * the LIVE regular monthly figure with its annual equivalent, the coffin lid and
 * the cash-assistance amount, then the ONE gold enquiry action. The inclusion
 * checklist is NOT repeated here — the five tiers share it, so the page prints
 * it once (Band 4); repeating it was the old page's defect (D1).
 *
 * All five columns are one height: the grid stretches them and the action is
 * bottom-aligned, so a longer lid or description never makes a card taller than
 * its siblings. Every amount is passed in by the page (read from the pricing
 * store through `planRateOf`); this component authors none.
 */
export type PlanTierPhoto = {
  src: string;
  srcSet?: string;
  width: number;
  height: number;
  alt: string;
};

export type PlanTierColumn = {
  content: PlanTierContent;
  monthly: number;
  annual: number;
  photo: PlanTierPhoto | null;
  lid: string;
  cash: number | null;
  requestHref: string;
};

export function PlanTierCard({
  column,
  index,
}: {
  column: PlanTierColumn;
  index: number;
}) {
  const { content, monthly, annual, photo, lid, cash, requestHref } = column;
  return (
    <article className="plan-tier" data-plan-col={index}>
      {photo ? (
        <figure className="plan-tier__media">
          {/* eslint-disable-next-line @next/next/no-img-element -- client/library photograph */}
          <img
            src={photo.src}
            srcSet={photo.srcSet}
            sizes="(max-width: 40rem) 92vw, (max-width: 60rem) 45vw, (max-width: 72rem) 30vw, (max-width: 86rem) 22vw, 16rem"
            width={photo.width}
            height={photo.height}
            alt={photo.alt}
            loading="lazy"
            decoding="async"
          />
        </figure>
      ) : null}

      <div className="plan-tier__body">
        <h3 className="plan-tier__name">{content.heading}</h3>
        {content.summary ? <p className="plan-tier__desc">{content.summary}</p> : null}

        <p className="plan-tier__price">
          {php(monthly)}
          <span className="plan-tier__unit">/ month</span>
        </p>
        <div className="plan-tier__annual">
          <Repeat size={14} aria-hidden="true" />
          <span>{php(annual)} a year</span>
        </div>

        <div className="plan-tier__facts">
          {lid ? (
            <div className="plan-tier__fact">
              <Layers size={14} aria-hidden="true" />
              <span>
                <b>Lid:</b> {lid}
              </span>
            </div>
          ) : null}
          {cash !== null ? (
            <div className="plan-tier__fact">
              <Banknote size={14} aria-hidden="true" />
              <span>
                <b>Cash assistance:</b> {php(cash)}
              </span>
            </div>
          ) : null}
        </div>

        <div className="plan-tier__act">
          <a
            className="btn btn--accent"
            href={requestHref}
            aria-label={`Ask about this plan — ${content.heading}`}
          >
            <FileText size={16} aria-hidden="true" />
            Ask about this plan
          </a>
        </div>
      </div>
    </article>
  );
}
