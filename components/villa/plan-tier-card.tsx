import { libraryThumb, libraryThumbSet } from "@/lib/media";
import type { PlanTierContent } from "@/lib/plan-content";
import { php2 } from "@/lib/villa-pricing";

/**
 * One premium plan-tier card (captain, 2026-09-21: "make the 5 tier in one
 * column… the dropdown inclusion is displayed already in the card, not a
 * dropdown, it's the best practice", then on the follow-up "the five tier plan
 * make it 5 plan per row").
 *
 * The card is the client's pricing-page anatomy: tier name · a "Starting from"
 * subtitle · the LIVE monthly rate · a one-line description · one action · then
 * the inclusion checklist printed under "Key features:" — never a disclosure.
 * `.plan-tiers` lays the five out as one comparison row on desktop (five across
 * from 86rem), so the card is a single vertical stack.
 *
 *  - The amount is passed in (read by the page through `planRateOf`), never
 *    authored here: this component prints a figure, it does not compute one.
 *  - The optional `tier.image` leads the card when present; when absent the card
 *    stays premium and text-only — no placeholder hole.
 *  - The action is the existing enquiry path (a prefilled `/contact` request),
 *    never a claim of online availability.
 */
export function PlanTierCard({
  tier,
  monthly,
  requestHref,
}: {
  tier: PlanTierContent;
  monthly: number;
  requestHref: string;
}) {
  const image = tier.image;
  return (
    <article className={`plan-tier${image ? " plan-tier--media" : ""}`}>
      {image ? (
        <figure className="plan-tier__media">
          {/* eslint-disable-next-line @next/next/no-img-element -- staff/library photograph */}
          <img
            src={libraryThumb(image.src, 640)}
            srcSet={libraryThumbSet(image.src)}
            sizes="(max-width: 56rem) 92vw, 20rem"
            alt={image.alt}
            loading="lazy"
          />
          {image.sample || image.caption ? (
            <figcaption className="plan-tier__caption">
              {image.sample ? <span className="casket-sample__mini">Sample photograph</span> : null}
              {image.caption ? <span>{image.caption}</span> : null}
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      <div className="plan-tier__intro">
        <h3 className="plan-tier__name">{tier.heading}</h3>
        <p className="plan-tier__subtitle">Starting from</p>
        <p className="plan-tier__price">
          {php2(monthly)}
          <span className="plan-tier__unit">per month · regular rate</span>
        </p>
        {tier.summary ? <p className="plan-tier__summary">{tier.summary}</p> : null}
        <div className="plan-tier__actions">
          <a className="btn btn--accent" href={requestHref} aria-label={`Ask about this plan — ${tier.heading}`}>
            Ask about this plan
          </a>
        </div>
      </div>

      <div className="plan-tier__features">
        <p className="plan-tier__features-title">Key features:</p>
        <ul className="plan-tier__list">
          {tier.items.map((item) => (
            <li key={item.id}>
              <span className="plan-tier__mark" aria-hidden="true">
                {item.checked ? "✓" : "○"}
              </span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
