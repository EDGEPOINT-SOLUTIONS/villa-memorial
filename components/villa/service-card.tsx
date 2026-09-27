import type { ReactNode } from "react";
import { ServiceIcons, IconChapel } from "@/components/villa/service-icons";

/**
 * ServiceCard — one at-need service, as a picture-first box.
 *
 * WHY NOT THE KIT'S `ProductCard`. That card is the storefront's, and it requires
 * a `price` and an `href` to a detail route. A funeral-service line has NEITHER:
 * the captain's 2026-09-21 minutes (item 5) made every service surface
 * Request-for-Quote, so there is no figure to print, and the only action a line
 * takes is a prefilled enquiry — there is no per-service page to link to.
 * Passing a price to satisfy a prop would be the exact defect the page exists to
 * avoid.
 *
 * WHAT IT DOES SHARE is the grammar: the markup below is the `.shop-card` shape
 * (figure → eyebrow → title → meta → action) that /products, /plans and /lots
 * render, so a service card and a coffin card read as the same product. No new
 * card CSS exists for this page — only a `.sv-card` icon disc, which is a graphic
 * accent the storefront cards do not need.
 *
 * HONESTY. The photograph comes from `lib/catalogue-imagery.ts`, the ONE map of
 * item → client material, and it arrives already carrying its own `sample` flag
 * and caption where the picture stands in for the thing named. This component
 * prints that caption verbatim and never invents one; a line with no photograph
 * renders the icon frame rather than borrowing a picture.
 */
export function ServiceCard({
  name,
  line,
  photo,
  action,
}: {
  /** The service exactly as the storefront names it. */
  name: string;
  /** The client's own one-line description of the service. */
  line: string;
  /** The client's photograph for this service, or null when there is none. */
  photo: { src: string; alt: string; sample?: boolean; caption?: ReactNode } | null;
  /** The one action: the prefilled Request-a-quote link. */
  action: ReactNode;
}) {
  const IconShape = ServiceIcons[name] ?? IconChapel;

  return (
    <li className="shop-card sv-card">
      {photo ? (
        <figure className="shop-card__figure">
          {/* Not a link: a service line has no detail route to open. */}
          <span className="shop-card__media sv-card__media">
            {/* eslint-disable-next-line @next/next/no-img-element -- the client's own photograph */}
            <img src={photo.src} alt={photo.alt} width={960} height={640} loading="lazy" decoding="async" />
          </span>
          {photo.caption ? <figcaption className="shop-card__caption">{photo.caption}</figcaption> : null}
        </figure>
      ) : (
        /* The honest placeholder: the service's own icon on the quiet wash the
           shared image frame uses, not a stand-in photograph. */
        <span className="sv-card__media sv-card__media--icon" aria-hidden="true">
          <IconShape />
        </span>
      )}

      <div className="shop-card__body">
        <p className="shop-card__eyebrow sv-card__eyebrow">
          <span className="sv-card__icon" aria-hidden="true">
            <IconShape />
          </span>
          At-need service
        </p>
        <h3 className="shop-card__title">{name}</h3>
        <p className="shop-card__meta sv-card__line">{line}</p>
        <div className="sv-card__action">{action}</div>
      </div>
    </li>
  );
}
