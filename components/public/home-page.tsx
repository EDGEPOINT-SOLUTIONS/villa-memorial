import Link from "next/link";
import { ArrowRight, Clock, MapPin, Phone, ShieldCheck } from "lucide-react";
import { ContactForm } from "@/components/public-forms/contact-form";
import { HomeCostBuilder } from "@/components/public/home-cost-builder";
import { HomePlotExplorer } from "@/components/public/home-plot-explorer";
import { directionsUrl } from "@/lib/location-map";
import {
  COFFINS,
  PLAN_TIERS,
  php,
} from "@/lib/villa-pricing";
import { planRateOf, type LotCategory } from "@/lib/pricing-model";
import {
  PLAN_LOT_CARD_PHOTOS,
  PARK_MAP_DERIVATIVE,
  compositionThumbSet,
  libraryThumb,
  libraryThumbSet,
} from "@/lib/media";
import {
  homeBuilderModel,
  homeLotInventory,
  lotRowFor,
  recordedPlotCount,
  type HomeLotRow,
} from "@/lib/home-model";
import type { BuilderCatalog } from "@/lib/service-builder";
import type { Lot } from "@/lib/api-client/property";
import type { Cta, LandingContent } from "@/lib/api-client/landing";
import type { PlanPricing } from "@/lib/pricing-model";

/**
 * HomePage — the public home, rebuilt to the APPROVED home-rebuild plan
 * (2026-09-29): the captain's `villa-home-restructure` artifact, seven sections
 * in order —
 *
 *   1 · the gateway      centred headline and call, three real trust facts
 *   2 · the hero photo   the client's photograph, alone and whole, named from
 *                        the office's own park address
 *   3 · the first park   the pavilion photograph (the band's dominant figure)
 *                        + the arrangement builder + the two chapels
 *   4 · Villa Memorial Park   the four lot types beside the park map, every
 *                        recorded plot pinned at its own coordinates
 *   5 · Villa Memorial Plan   the five rising tiers, live monthly + senior
 *   6 · Funeraria Memorial Services   five equal photographic tiles, a quote
 *                        under each and one centred quote for all five — NO
 *                        amount (the client's minute 5)
 *   7 · Contact          the enquiry form and the embedded Google map
 *
 * DESIGN RULES THAT ARE BINDING (the plan's own):
 *   · no photograph is ever cropped — a fixed plate uses `object-fit: contain`;
 *     a plain band takes the picture's own ratio, whole;
 *   · equal members of a group are exactly the same size;
 *   · section titles are centred, with their action under them;
 *   · gold carries dark ink, never white.
 *
 * EVERY FIGURE IS A READ: plan monthlies from the pricing store, casket and
 * service figures from the live catalogue + 2026 sheets, lot areas and totals
 * from the pricing store, plot pins from the plot records' own outlines. The
 * services band prints no amount; the contact form keeps the Data Privacy Act
 * consent line. The home is edited section by section at /staff/landing/home.
 *
 * THE GATEWAY BAND (office, 2026-09-29; restructured in inbox 032):
 *   · NO ARCH and NO CLOUDS anywhere on the home — the band is plain white
 *     with no decoration but its own ladder of type;
 *   · the band is a FUNNEL BY SIZE, NOT WEIGHT: eyebrow (smallest) → the
 *     headline (the band's LARGEST type, a light weight of the display face)
 *     → the lead (smaller than the headline) → the actions → the icon row;
 *   · the icon row keeps each fact's medium icon and short label only — its
 *     three detail lines were removed (the labels still read the store).
 */

/* ---------------------------- photograph helpers ---------------------------- */

type Photo = {
  src: string;
  srcSet?: string;
  width: number;
  height: number;
};

/**
 * Intrinsic hints for the whole (uncropped) photographs. The values are the
 * shipped derivatives' real sizes; an asset outside this map (a staff URL, a
 * device upload) gets a 3:2 hint, which is the shape of every photo the plan
 * uses. The frame never imposes a ratio — it takes the picture's own.
 */
const PHOTO_HINTS: Readonly<Record<string, { width: number; height: number }>> = {
  "hero-1-960.webp": { width: 960, height: 541 },
  "the-very-first-memorial-park-in-basilan-960.webp": { width: 940, height: 788 },
  "at-need-services-960.webp": { width: 547, height: 365 },
  "transport-960.webp": { width: 678, height: 452 },
};

function photo(src: string, thumbWidth: 320 | 640 | 960 = 960): Photo {
  const resolved = libraryThumb(src, thumbWidth);
  const srcSet = libraryThumbSet(src) ?? compositionThumbSet(src);
  const file = resolved.split("/").pop() ?? "";
  const hint = PHOTO_HINTS[file] ?? { width: 960, height: 640 };
  return { src: resolved, srcSet, width: hint.width, height: hint.height };
}

/** The lot tile's photograph: the staff pick, or the derived client photo. */
function lotTilePhoto(image: string | null, product: string): Photo | null {
  const src = image ?? PLAN_LOT_CARD_PHOTOS[product] ?? null;
  if (!src) return null;
  return photo(src);
}

/* ---------------------------------- view ---------------------------------- */

export function HomePage({
  content,
  pricing,
  lotCategories,
  builder,
  lots,
  mapSrc,
  chapelResources,
}: {
  content: LandingContent;
  pricing: PlanPricing;
  lotCategories: ReadonlyArray<LotCategory>;
  builder: BuilderCatalog;
  lots: ReadonlyArray<Lot>;
  /** The embedded-map URL, built server-side (the API key never reaches client JS). */
  mapSrc: string;
  /** The chapel resources from the schedule store — their caps are figures. */
  chapelResources: ReadonlyArray<{ id: string; name: string; capacity: number }>;
}) {
  const { contact, home } = content;
  const gateway = home.gateway;
  const park = home.park;
  const builderModel = homeBuilderModel(park.builder, builder);
  const groups = homeLotInventory(lots, home.lots.items);
  const rows: Record<string, HomeLotRow | null> = Object.fromEntries(
    home.lots.items.map((tile) => [tile.id, lotRowFor(lotCategories, tile)]),
  );
  const figures: Record<string, { tileId: string; src: string | null; srcSet?: string }> =
    Object.fromEntries(
      home.lots.items.map((tile) => {
        const photoInfo = lotTilePhoto(tile.image, tile.product);
        return [tile.id, { tileId: tile.id, src: photoInfo?.src ?? null, srcSet: photoInfo?.srcSet }];
      }),
    );
  const tierRows = PLAN_TIERS.map((tier) => {
    const coffin = COFFINS.find((entry) => entry.tier === tier.name);
    return {
      ...tier,
      monthly: planRateOf(pricing, tier.id, "monthly", false),
      seniorMonthly: planRateOf(pricing, tier.id, "monthly", true),
      description: coffin?.description ?? "",
      lid: coffin?.lid ?? "",
    };
  });
  const heroPhoto = home.photo.image ? photo(home.photo.image) : null;
  const parkPhoto = park.image ? photo(park.image) : null;
  const parkMapSrc = PARK_MAP_DERIVATIVE;
  const plotCount = recordedPlotCount(groups);
  // Section 2's title is READ from the office's own recorded address (its place
  // name), never a new typed string — the same name the gate sign carries.
  const parkName =
    contact.parkAddress.split(",")[0]?.trim() || contact.location || "Villa Memorial Park";

  const directions: Cta = {
    label: home.contact.directionsLabel,
    href: directionsUrl("google", contact.parkAddress),
  };

  return (
    <div className="home">
      {/* ================================================================
          1 · THE GATEWAY — centred words and the call.
          ================================================================ */}
      <section className="home-gateway" aria-labelledby="home-gateway-title">
        <div className="home-gateway__inner">
          {gateway.place ? <p className="home-gateway__place">{gateway.place}</p> : null}
          <h1 id="home-gateway-title" className="home-gateway__title">
            {gateway.headline}{" "}
            <span className="home-gateway__promise">{gateway.promise}</span>
          </h1>
          <p className="home-gateway__lead">{gateway.lead}</p>
          <div className="home-gateway__actions">
            <a className="btn btn--accent home-call" href={contact.phoneHref}>
              <Phone size={18} aria-hidden="true" />
              {contact.phoneDisplay}
            </a>
            {/* The office's explicit override (inbox 041): this ONE band action
                wears the call's gold as an outline, so the pair reads as a
                deliberate set. The variant lives in the stylesheet and is not
                for other bands; the call keeps the solid fill. */}
            <Link className="btn btn--secondary btn--gold-outline" href={gateway.secondary.href}>
              {gateway.secondary.label}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <ul className="home-gateway__trust">
            {gateway.facts.map((fact, index) => {
              const Icon = [Clock, MapPin, ShieldCheck][index % 3];
              return (
                <li key={fact.id} className="home-trust__item">
                  <Icon size={18} aria-hidden="true" />
                  {/* Labels only (inbox 032): the facts' detail lines were
                      removed; the wording still reads from the store. */}
                  <b>{fact.label}</b>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ================================================================
          2 · THE HERO PHOTOGRAPH — alone and whole.
          ================================================================ */}
      <section className="home-photo" aria-labelledby="home-photo-title">
        <div className="home-band-head">
          <p className="home-band-head__kicker">{home.photo.kicker}</p>
          <h2 id="home-photo-title" className="home-band-head__title">
            {parkName}
          </h2>
        </div>
        {heroPhoto ? (
          <figure className="home-photo__figure">
            {/* No ratio, no crop: the frame takes the picture's own shape. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroPhoto.src}
              srcSet={heroPhoto.srcSet}
              sizes={heroPhoto.srcSet ? "(max-width: 75rem) 100vw, 74rem" : undefined}
              width={heroPhoto.width}
              height={heroPhoto.height}
              alt={home.photo.alt}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </figure>
        ) : (
          <div className="home-engraved home-engraved--band" role="img" aria-label={home.photo.alt}>
            {home.photo.alt}
          </div>
        )}
      </section>

      {/* ================================================================
          3 · THE FIRST PARK — the photograph + the arrangement builder,
              with the two chapels under the photograph.
          ================================================================ */}
      <section className="home-park" aria-label="The first memorial park in Basilan">
        <div className="home-park__grid">
          <div className="home-park__media">
            {parkPhoto ? (
              <figure className="home-park__figure">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={parkPhoto.src}
                  srcSet={parkPhoto.srcSet}
                  sizes={parkPhoto.srcSet ? "(max-width: 52rem) 92vw, 44rem" : undefined}
                  width={parkPhoto.width}
                  height={parkPhoto.height}
                  alt={park.imageAlt}
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            ) : (
              <div className="home-engraved home-engraved--park" role="img" aria-label={park.imageAlt}>
                {park.imageAlt}
              </div>
            )}

            {park.chapelsHeading ? (
              <h3 className="home-park__chapels-title">{park.chapelsHeading}</h3>
            ) : null}
            <div className="home-chapels">
              {park.chapels.map((chapel) => {
                const chapelPhoto = chapel.image ? photo(chapel.image) : null;
                const resource = chapelResources.find((entry) => entry.id === chapel.resourceId);
                return (
                  <article key={chapel.id} className="home-chapel">
                    {chapelPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={chapelPhoto.src}
                        srcSet={chapelPhoto.srcSet}
                        sizes={chapelPhoto.srcSet ? "(max-width: 34rem) 92vw, 17rem" : undefined}
                        width={chapelPhoto.width}
                        height={chapelPhoto.height}
                        alt={`${chapel.name} — ${chapel.kind}`}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="home-engraved home-engraved--chapel" aria-hidden="true">
                        {chapel.name}
                      </span>
                    )}
                    <div className="home-chapel__body">
                      <p className="home-chapel__name">{chapel.name}</p>
                      <p className="home-chapel__kind">{chapel.kind}</p>
                      <p className="home-chapel__what">
                        {chapel.what}
                        {resource ? ` Room fits about ${resource.capacity} people.` : ""}
                      </p>
                      <p className="home-chapel__cap">{chapel.caption}</p>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="home-park__chapels-action">
              <Link className="btn btn--secondary" href={park.chapelsAction.href}>
                {park.chapelsAction.label}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="home-park__builder">
            <HomeCostBuilder
              model={builderModel}
              title={park.builder.title}
              note={park.builder.note}
              secondary={park.builder.secondary}
              contact={contact}
            />
          </div>
        </div>
      </section>

      {/* ================================================================
          4 · VILLA MEMORIAL PARK — four lot types, the pinned map, details.
          ================================================================ */}
      <HomePlotExplorer
        kicker={home.lots.kicker}
        heading={home.lots.heading}
        action={home.lots.action}
        quote={home.lots.quote}
        groups={groups}
        rows={rows}
        mapSrc={parkMapSrc}
        mapAlt={`The Villa Memorial Park map, with all ${plotCount} recorded plots`}
        figures={figures}
      />

      {/* ================================================================
          5 · VILLA MEMORIAL PLAN — five rising tiers, live prices.
          ================================================================ */}
      <section className="home-plans" aria-labelledby="home-plans-title">
        <div className="home-band-head">
          <p className="home-band-head__kicker">{home.plans.kicker}</p>
          <h2 id="home-plans-title" className="home-band-head__title">
            {home.plans.heading}
          </h2>
          <Link className="btn btn--secondary home-band-head__cta" href={home.plans.action.href}>
            {home.plans.action.label}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="home-niches">
          {tierRows.map((tier, index) => (
            <div key={tier.id} className="home-niche-col">
              <div
                className={`home-niche${index === tierRows.length - 1 ? " home-niche--gold" : ""}`}
              >
                <b className="home-niche__name">{tier.name}</b>
                <span className="home-niche__price">{php(tier.monthly)}</span>
                <span className="home-niche__unit">/ month</span>
              </div>
              <details className="home-niche-more">
                <summary>What&rsquo;s different</summary>
                {tier.description ? <p>{tier.description}</p> : null}
                {tier.lid ? (
                  <p className="home-niche-more__lid">
                    <b>Lid:</b> {tier.lid}
                  </p>
                ) : null}
                <p className="home-niche-more__senior">
                  Senior citizen: <b>{php(tier.seniorMonthly)} / month</b>
                </p>
              </details>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================
          6 · FUNERARIA MEMORIAL SERVICES — five equal tiles, no amounts.
          ================================================================ */}
      <section className="home-services" aria-labelledby="home-services-title">
        <div className="home-band-head">
          <p className="home-band-head__kicker">{home.services.kicker}</p>
          <h2 id="home-services-title" className="home-band-head__title">
            {home.services.heading}
          </h2>
          <Link className="btn btn--secondary home-band-head__cta" href={home.services.action.href}>
            {home.services.action.label}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <ul className="home-plates">
          {home.services.items.map((tile) => {
            const tilePhoto = tile.image ? photo(tile.image) : null;
            return (
              <li key={tile.id} className="home-service">
                <span className="home-plate">
                  {tilePhoto ? (
                    // The photograph is whole inside its equal 3:2 plate.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={tilePhoto.src}
                      srcSet={tilePhoto.srcSet}
                      sizes={tilePhoto.srcSet ? "(max-width: 58rem) 46vw, 13rem" : undefined}
                      width={tilePhoto.width}
                      height={tilePhoto.height}
                      alt={tile.imageAlt}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="home-engraved" aria-hidden="true">
                      {tile.label}
                    </span>
                  )}
                </span>
                <p className="home-service__name">{tile.label}</p>
                <Link className="home-service__cta" href={tile.quote.href}>
                  {tile.quote.label}
                  <span className="visually-hidden"> for {tile.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="home-services__all">
          <Link className="btn btn--accent" href={home.services.allQuote.href}>
            {home.services.allQuote.label}
          </Link>
        </div>
      </section>

      {/* ================================================================
          7 · CONTACT — the enquiry form and the embedded park map.
          ================================================================ */}
      <section className="home-contact" aria-labelledby="home-contact-title">
        <div className="home-band-head">
          <p className="home-band-head__kicker">{home.contact.kicker}</p>
          <h2 id="home-contact-title" className="home-band-head__title">
            {home.contact.heading}
          </h2>
          <p className="home-band-head__lead">{home.contact.lead}</p>
        </div>
        <div className="home-contact__grid">
          <div className="home-contact__form">
            <ContactForm />
          </div>
          <div className="home-contact__place">
            <h3 className="home-contact__map-title">{home.contact.mapTitle}</h3>
            <iframe
              className="home-contact__map"
              title={`Google map showing ${contact.parkAddress}`}
              src={mapSrc}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <p className="home-contact__addr">{contact.parkAddress}</p>
            {contact.officeAddress ? (
              <p className="home-contact__office">The office: {contact.officeAddress}</p>
            ) : null}
            <p className="home-contact__note">{home.contact.mapNote}</p>
            <a className="btn btn--secondary" href={directions.href}>
              {directions.label}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
